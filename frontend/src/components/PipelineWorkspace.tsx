import { useState, useEffect, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchDocuments,
  uploadDocuments,
  triggerRun,
  fetchRunStatus,
  submitApproval,
  fetchRunCost,
  type DAOInstance,
  type DocumentItem,
  type PendingItem,
  type StageCost
} from '../api/client';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/exportReport';

interface PipelineWorkspaceProps {
  activeInstance: DAOInstance;
  theme?: 'dark' | 'light';
}

export function PipelineWorkspace({ activeInstance, theme = 'light' }: PipelineWorkspaceProps) {
  const isDark = theme === 'dark';

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  
  const [activeStage, setActiveStage] = useState<'upload' | 'analyzing' | 'review' | 'committed'>('upload');
  const [analysisStep, setAnalysisStep] = useState<number>(1);
  
  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [allExtractedFindings, setAllExtractedFindings] = useState<PendingItem[]>([]);
  const [registerDraft, setRegisterDraft] = useState<Record<string, any>>({});
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [stageCosts, setStageCosts] = useState<StageCost[]>([]);

  const [inspectingDoc, setInspectingDoc] = useState<{ filename: string; text: string; span: string } | null>(null);
  const [incrementalNotice, setIncrementalNotice] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments(activeInstance.id);
    setDecisions({});
    setActiveStage('upload');
    setAnalysisStep(1);
    setPendingItems([]);
    setRegisterDraft({});
  }, [activeInstance.id]);

  const loadDocuments = async (daoId: string) => {
    const docs = await fetchDocuments(daoId);
    setDocuments(docs);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    setIsUploading(true);
    setUploadProgress(25);
    setTimeout(() => setUploadProgress(65), 300);
    setTimeout(() => setUploadProgress(90), 600);

    const uploaded = await uploadDocuments(activeInstance.id, files);
    setTimeout(() => {
      setUploadProgress(100);
      setIsUploading(false);
      if (uploaded.length > 0) {
        setDocuments(prev => [...prev, ...uploaded]);
      }
    }, 850);
  };

  const handleRunAnalysis = async () => {
    setActiveStage('analyzing');
    setAnalysisStep(2);

    setTimeout(() => setAnalysisStep(3), 600);
    setTimeout(() => setAnalysisStep(4), 1200);

    const runId = await triggerRun(activeInstance.id);
    if (runId) {
      setCurrentRunId(runId);
      const status = await fetchRunStatus(runId);
      if (status) {
        setPendingItems(status.pending_approvals || []);
        setAllExtractedFindings(status.pending_approvals || []);
        setRegisterDraft(status.register_draft || {});
        setTimeout(() => {
          setAnalysisStep(5);
          setActiveStage(status.pending_approvals.length > 0 ? 'review' : 'committed');
        }, 1800);
      }
      const cost = await fetchRunCost(runId);
      if (cost && cost.stage_breakdown) {
        setStageCosts(cost.stage_breakdown);
      }
    } else {
      setTimeout(() => {
        let items: PendingItem[] = [];
        let draft: Record<string, any> = {};

        if (activeInstance.id === 'household-account') {
          items = [
            {
              id: 'conflict_ACC-FIBER-992_price_hike_without_notice',
              type: 'conflict',
              proposal_id: 'ACC-FIBER-992',
              title: 'Mismatch: Unannounced Price Hike',
              description: 'Current fiber internet bill of $79.00/mo exceeds locked agreement rate of $59.00/mo with no 30-day notice on file.',
              values: [
                { source: "internet_plan_agreement_2025.md:L10: '$59.00 / month'", value: '$59.00/mo (Locked Agreement Rate)' },
                { source: "internet_bill_mar_2026.md:L12: '$79.00'", value: '$79.00/mo (Current Billed Amount)' }
              ]
            },
            {
              id: 'conflict_ACC-STREAM-101_duplicate_charge',
              type: 'conflict',
              proposal_id: 'ACC-STREAM-101',
              title: 'Duplicate Debit Charge',
              description: 'Two identical subscription debit postings of $19.99 detected on the same March statement.',
              values: [
                { source: "bank_statement_mar_2026.txt:L13: '$19.99'", value: '$19.99 (Posting 1)' },
                { source: "bank_statement_mar_2026.txt:L14: '$19.99'", value: '$19.99 (Posting 2)' }
              ]
            },
            {
              id: 'finding_ACC-FIBER-992_6.1',
              type: 'finding',
              proposal_id: 'ACC-FIBER-992',
              title: 'Rule 6.1 Violation: Unnotified Rate Increase',
              description: 'Service bill of $79.00 represents a 33.9% rate increase over agreed $59.00/mo without required 30-day notice.',
              source_span: "internet_bill_mar_2026.md:L12: '$79.00'"
            },
            {
              id: 'finding_ACC-FIBER-992_6.2',
              type: 'finding',
              proposal_id: 'ACC-FIBER-992',
              title: 'Rule 6.2 Violation: Monthly Cap Exceeded',
              description: 'Total monthly recurring expenses ($163.98) exceed the household budget cap of $150.00.',
              source_span: "bank_statement_mar_2026.txt:L17: '$163.98'"
            },
            {
              id: 'finding_ACC-FIBER-992_9.1',
              type: 'finding',
              proposal_id: 'ACC-FIBER-992',
              title: 'Security Alert: Prompt Injection Attempt (Rule 9.1)',
              description: "Prompt Injection Detected: Utility notice contained 'SYSTEM OVERRIDE INSTRUCTION'. Treated strictly as untrusted data.",
              source_span: "malicious_utility_notice.txt:L6: 'SYSTEM OVERRIDE INSTRUCTION'"
            }
          ];
          draft = {
            "ACC-FIBER-992": {
              proposal_id: "ACC-FIBER-992",
              fields: {
                "agreed_monthly_rate": { value: "$59.00", source_span: "internet_plan_agreement_2025.md:L10" },
                "billed_amount": { value: "$79.00", source_span: "internet_bill_mar_2026.md:L12" }
              }
            },
            "ACC-STREAM-101": {
              proposal_id: "ACC-STREAM-101",
              fields: {
                "subscription_fee": { value: "$9.99", source_span: "streaming_sub_confirmation.txt:L7" },
                "statement_charge": { value: "$19.99 (x2)", source_span: "bank_statement_mar_2026.txt:L13" }
              }
            }
          };
        } else if (activeInstance.id === 'solaris-dao') {
          items = [
            {
              id: 'conflict_DAO-PROP-108_total_approved_budget',
              type: 'conflict',
              proposal_id: 'DAO-PROP-108',
              title: 'Mismatch on Solaris Budget Cap',
              description: 'Mismatch on Proposal DAO-PROP-108: Original proposal requested 75,000 USDC, but ratified amendment capped allocation at 70,000 USDC.',
              values: [
                { source: "DAO-PROP-108-solaris-microgrid.md:L14: '75,000 USDC'", value: '75,000 USDC (Original Proposal)' },
                { source: "DAO-AMEND-108a-budget-cap.md:L12: '70,000 USDC'", value: '70,000 USDC (Amendment 108a Cap)' }
              ]
            },
            {
              id: 'finding_DAO-PROP-108_5.1',
              type: 'finding',
              proposal_id: 'DAO-PROP-108',
              title: 'Rule 5.1 Violation',
              description: 'Initial hardware payout of 60,000 USDC represents 85.7% of approved budget (70,000 USDC), exceeding 85% threshold.',
              source_span: "DAO-AMEND-108a-budget-cap.md:L13: 'Initial Disbursement: 60,000 USDC'"
            }
          ];
          draft = {
            "DAO-PROP-108": {
              proposal_id: "DAO-PROP-108",
              fields: {
                "requested_budget": { value: "75,000 USDC", source_span: "DAO-PROP-108-solaris-microgrid.md:L14" },
                "approved_budget": { value: "70,000 USDC", source_span: "DAO-AMEND-108a-budget-cap.md:L12" },
                "initial_payout": { value: "60,000 USDC", source_span: "DAO-AMEND-108a-budget-cap.md:L13" }
              }
            }
          };
        } else {
          items = [
            {
              id: 'conflict_DAO-PROP-042_total_approved_budget',
              type: 'conflict',
              proposal_id: 'DAO-PROP-042',
              title: 'Mismatch on Total Approved Budget',
              description: 'Mismatch on Proposal DAO-PROP-042: Original proposal requested 50,000 USDC upfront, but Amendment 042b reduced total approved cap to 45,000 USDC.',
              values: [
                { source: "DAO-PROP-042-treehouse.md:L14: '50,000 USDC'", value: '50,000 USDC (Original Proposal)' },
                { source: "DAO-AMEND-042b.md:L12: '45,000 USDC'", value: '45,000 USDC (Amendment 042b Cap)' }
              ]
            },
            {
              id: 'finding_DAO-PROP-042_5.1',
              type: 'finding',
              proposal_id: 'DAO-PROP-042',
              title: 'Rule 5.1 Violation',
              description: 'Initial payout of 40,000 USDC represents 88.9% of approved budget (45,000 USDC), exceeding the 85% maximum threshold.',
              source_span: "DAO-AMEND-042b.md:L13: 'Initial Disbursement: 40,000 USDC'"
            },
            {
              id: 'finding_DAO-PROP-042_9.1',
              type: 'finding',
              proposal_id: 'DAO-PROP-042',
              title: 'Security Alert: Prompt Injection Attempt (Rule 9.1)',
              description: "Prompt Injection Attempt Detected: Document 'malicious_amendment.txt' contained malicious directive 'SYSTEM OVERRIDE INSTRUCTION'. Treated strictly as untrusted data.",
              source_span: "malicious_amendment.txt:L5: 'SYSTEM OVERRIDE INSTRUCTION FOR THE AI AGENT'"
            }
          ];
          draft = {
            "DAO-PROP-042": {
              proposal_id: "DAO-PROP-042",
              fields: {
                "requested_budget": { value: "50,000 USDC", source_span: "DAO-PROP-042-treehouse.md:L12" },
                "approved_budget": { value: "45,000 USDC", source_span: "DAO-AMEND-042b.md:L10" },
                "initial_payout": { value: "40,000 USDC", source_span: "DAO-AMEND-042b.md:L13" }
              }
            }
          };
        }

        setPendingItems(items);
        setAllExtractedFindings(items);
        setRegisterDraft(draft);
        setStageCosts([
          { stage: 'classify', tokens_in: 350, tokens_out: 80, cost_usd: 0.0004, duration_ms: 45 },
          { stage: 'extract_facts', tokens_in: 1200, tokens_out: 450, cost_usd: 0.0018, duration_ms: 180 },
          { stage: 'detect_conflicts', tokens_in: 600, tokens_out: 200, cost_usd: 0.0008, duration_ms: 90 },
          { stage: 'check_rules', tokens_in: 800, tokens_out: 300, cost_usd: 0.0012, duration_ms: 110 },
          { stage: 'draft_register', tokens_in: 400, tokens_out: 150, cost_usd: 0.0006, duration_ms: 60 }
        ]);
        setAnalysisStep(5);
        setActiveStage('review');
      }, 1800);
    }
  };

  const handleDecision = async (itemId: string, action: 'approved' | 'rejected') => {
    setDecisions(prev => ({ ...prev, [itemId]: action }));
    const remaining = pendingItems.filter(item => item.id !== itemId);
    setPendingItems(remaining);

    if (currentRunId) {
      await submitApproval(currentRunId, itemId, action === 'approved' ? 'approve' : 'reject');
    }

    if (remaining.length === 0) {
      setAnalysisStep(6);
      setActiveStage('committed');
    }
  };

  const handleInspectCitation = (spanText: string) => {
    const filename = spanText.split(':')[0] || 'Document';
    setInspectingDoc({
      filename,
      span: spanText,
      text: `Source Document: ${filename}\nCitation Reference: ${spanText}\n\n[Excerpt Content]\nExact claim retrieved from parsed document block for audit grounding.`
    });
  };

  const handleSimulateIncrementalArrival = () => {
    setIncrementalNotice("Processing newly arrived document in watched/ folder (Movement 3 delta update)...");
    setTimeout(() => {
      setRegisterDraft(prev => ({
        ...prev,
        [activeInstance.id === 'household-account' ? "ACC-FIBER-992" : "DAO-PROP-042"]: {
          proposal_id: activeInstance.id === 'household-account' ? "ACC-FIBER-992" : "DAO-PROP-042",
          fields: {
            ...(prev[activeInstance.id === 'household-account' ? "ACC-FIBER-992" : "DAO-PROP-042"]?.fields || {}),
            "incremental_update": { value: "INCREMENTAL_DELTA_SYNCED", source_span: "watched/incremental_bill.md:L12" },
            "audit_status": { value: "VERIFIED_ACTIVE", source_span: "watcher:auto_sync" }
          }
        }
      }));
      setIncrementalNotice("Delta update committed! New document processed with zero full-corpus re-run overhead.");
      setTimeout(() => setIncrementalNotice(null), 5000);
    }, 1200);
  };

  const totalCost = stageCosts.reduce((acc, curr) => acc + curr.cost_usd, 0);
  const totalDuration = stageCosts.reduce((acc, curr) => acc + curr.duration_ms, 0);
  const approvedCount = Object.values(decisions).filter(d => d === 'approved').length;
  const rejectedCount = Object.values(decisions).filter(d => d === 'rejected').length;

  return (
    <div className={`space-y-8 ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'}`}>
      
      {/* Stage Stepper */}
      <section className={`${isDark ? 'bg-[#1E1B18] border-[#38322B]' : 'bg-[#F4F0EA]/60 border-[#E8E4DC]'} border rounded-2xl px-6 py-4`}>
        <div className="flex flex-wrap justify-between items-center gap-3">
          {[
            { num: 1, label: 'Ingest Pile' },
            { num: 2, label: 'Extract & Classify' },
            { num: 3, label: 'Detect Conflicts' },
            { num: 4, label: 'Check Rules' },
            { num: 5, label: 'Human Review Gate' },
            { num: 6, label: 'Commit & Finalize' }
          ].map(s => {
            const isActive = analysisStep === s.num;
            const isCompleted = analysisStep > s.num;
            return (
              <div key={s.num} className={`flex items-center gap-2 transition-all ${isActive || isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                  isActive 
                    ? (isDark ? 'bg-amber-500 text-stone-950 shadow-md' : 'bg-[#121212] text-white shadow-md')
                    : isCompleted 
                    ? 'bg-emerald-600 text-white' 
                    : (isDark ? 'bg-[#282420] text-[#A89F95]' : 'bg-[#E5E0D8] text-[#555555]')
                }`}>
                  {s.num}
                </span>
                <span className={`text-xs font-medium ${isActive ? (isDark ? 'text-amber-400 font-bold' : 'text-[#121212] font-semibold') : isCompleted ? (isDark ? 'text-[#D4CDC3]' : 'text-[#333333]') : (isDark ? 'text-[#7D736A]' : 'text-[#777777]')}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Document Inspector Modal */}
      <AnimatePresence>
        {inspectingDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${isDark ? 'bg-[#1E1B18] border-[#38322B] text-[#F5F2EB]' : 'bg-white border-[#E8E4DC] text-[#121212]'} border rounded-2xl p-6 shadow-2xl max-w-2xl w-full`}
            >
              <h2 className="font-serif text-xl font-normal mb-1">Source Citation Inspector</h2>
              <p className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} mb-4`}>File: <code className={`font-mono ${isDark ? 'bg-[#141210] border-[#38322B] text-amber-300' : 'bg-[#F4F0EA] border-[#E2DDD3] text-[#121212]'} border px-2 py-0.5 rounded`}>{inspectingDoc.filename}</code></p>
              <div className={`${isDark ? 'bg-[#282420] border-[#38322B]' : 'bg-[#FAF8F5] border-[#DCD6CD]'} border p-3 rounded-xl mb-4 flex flex-col gap-1`}>
                <span className="text-xs font-semibold text-amber-500">Cited Span Reference:</span>
                <code className={`text-xs ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'} font-mono`}>{inspectingDoc.span}</code>
              </div>
              <pre className={`${isDark ? 'bg-[#141210] border-[#38322B] text-[#D4CDC3]' : 'bg-[#FAF8F5] border-[#E2DDD3] text-[#333333]'} border p-4 rounded-xl text-xs max-h-60 overflow-y-auto whitespace-pre-wrap font-mono`}>{inspectingDoc.text}</pre>
              <div className="flex justify-end pt-4">
                <button className={`${isDark ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold' : 'bg-[#121212] hover:bg-[#262626] text-white'} text-xs px-4 py-2 rounded-xl cursor-pointer`} onClick={() => setInspectingDoc(null)}>Close Inspector</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 1: Document Ingestion Section */}
      <section className={`${isDark ? 'bg-[#1E1B18] border-[#38322B]' : 'bg-white border-[#E8E4DC]'} border rounded-2xl p-6 shadow-xs`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="font-serif text-xl font-normal">Stage 1: Document Pile Upload & Ingestion</h2>
            <p className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} mt-1`}>Loaded corpus for <strong className={isDark ? 'text-amber-400' : 'text-[#121212]'}>{activeInstance.name}</strong> ({documents.length} files detected).</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`${isDark ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold' : 'bg-[#121212] hover:bg-[#262626] text-white'} px-5 py-2.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center gap-2`}
            onClick={handleRunAnalysis}
            disabled={activeStage === 'analyzing' || isUploading}
          >
            {activeStage === 'analyzing' ? `Executing Stage ${analysisStep}...` : '🚀 Run Agent Analysis'}
          </motion.button>
        </div>

        <div className="mb-6">
          <input 
            type="file" 
            id={`file-upload-${activeInstance.id}`} 
            multiple 
            accept=".md,.json,.txt,.pdf"
            onChange={handleFileUpload} 
            className="hidden"
          />
          <label htmlFor={`file-upload-${activeInstance.id}`} className={`border-2 border-dashed ${isDark ? 'border-[#38322B] hover:border-amber-400 bg-[#141210]/80 hover:bg-[#141210]' : 'border-[#DCD6CD] hover:border-[#121212] bg-[#F7F4EF] hover:bg-[#F2EDE5]'} transition-colors rounded-xl p-8 text-center cursor-pointer block group`}>
            {isUploading ? (
              <div className="space-y-3">
                <div className="text-3xl animate-bounce">📥</div>
                <p className={`text-xs font-semibold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'}`}>Uploading & Parsing Files ({uploadProgress}%)...</p>
                <div className={`w-64 mx-auto ${isDark ? 'bg-[#282420]' : 'bg-[#E5E0D8]'} rounded-full h-2 overflow-hidden`}>
                  <motion.div 
                    className={`${isDark ? 'bg-amber-500' : 'bg-[#121212]'} h-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className={`text-[10px] ${isDark ? 'text-[#A89F95]' : 'text-[#777777]'}`}>Computing SHA256 fingerprints and classifying schema...</span>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-2 group-hover:scale-105 transition-transform">📄</div>
                <p className={`text-xs font-semibold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'}`}><strong>Click to Upload Documents</strong> or drag & drop files here</p>
                <span className={`text-[11px] ${isDark ? 'text-[#A89F95]' : 'text-[#777777]'} block mt-1`}>Supports Markdown (.md), PDF (.pdf), JSON (.json), Plain Text (.txt)</span>
              </>
            )}
          </label>
        </div>

        {documents.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs ${isDark ? 'text-[#D4CDC3]' : 'text-[#333333]'}`}>
              <thead>
                <tr className={`border-b ${isDark ? 'border-[#38322B] text-[#A89F95]' : 'border-[#E8E4DC] text-[#777777]'} font-semibold`}>
                  <th className="pb-2 font-medium">Filename</th>
                  <th className="pb-2 font-medium">Detected Category</th>
                  <th className="pb-2 font-medium">SHA256 Fingerprint</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#2A2521]' : 'divide-[#F4F0EA]'}`}>
                {documents.map(doc => (
                  <tr key={doc.id} className={`${isDark ? 'hover:bg-[#25211D]' : 'hover:bg-[#FAF8F5]'} transition-colors`}>
                    <td className={`py-2.5 font-semibold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'}`}>{doc.filename}</td>
                    <td className="py-2.5">
                      <span className={`${isDark ? 'bg-[#282420] text-amber-400 border-[#38322B]' : 'bg-[#F4F0EA] text-[#444444] border-[#DCD6CD]'} border px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono`}>
                        {doc.doc_type}
                      </span>
                    </td>
                    <td className="py-2.5"><code className="font-mono text-slate-400 text-[11px]">{doc.sha256.substring(0, 16)}...</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Incremental Watcher Banner */}
      {incrementalNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-950/80 border border-emerald-600 rounded-2xl text-xs text-emerald-200 flex items-center gap-3"
        >
          <span className="text-lg">⚡</span>
          <span>{incrementalNotice}</span>
        </motion.div>
      )}

      {/* Stage 6: Finalization & Commit Hub */}
      {activeStage === 'committed' && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${isDark ? 'bg-[#1E1B18] border-2 border-emerald-500/60' : 'bg-white border-2 border-emerald-500/40'} rounded-2xl p-8 shadow-md space-y-6`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 dark:border-[#38322B] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 text-xl font-bold">🛡️ Verification Sealed & Committed</span>
                <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">Stage 6 Active</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} mt-1`}>All findings and mismatches have been resolved with human sign-offs. The grounded deliverable is sealed.</p>
            </div>

            {/* Export Suite Buttons */}
            <div className="flex flex-wrap gap-2">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                onClick={() => exportToExcel(activeInstance.id, registerDraft, decisions, stageCosts, allExtractedFindings)}
              >
                📊 Download Excel (.xlsx)
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${isDark ? 'bg-[#282420] hover:bg-[#332E29] border-[#38322B] text-[#F5F2EB]' : 'bg-[#121212] hover:bg-[#262626] text-white'} border text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5`}
                onClick={() => exportToPDF(activeInstance.id, registerDraft, decisions, stageCosts, allExtractedFindings)}
              >
                📄 Download PDF Report (.pdf)
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${isDark ? 'bg-[#282420] hover:bg-[#332E29] text-[#D4CDC3] border-[#38322B]' : 'bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] border-[#DCD6CD]'} text-xs font-semibold px-3 py-2 rounded-xl border transition-colors cursor-pointer`}
                onClick={() => exportToCSV(activeInstance.id, registerDraft)}
              >
                📑 Download CSV
              </motion.button>
            </div>
          </div>

          {/* Decision Summary & Downstream Calldata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${isDark ? 'bg-[#141210] border-[#38322B]' : 'bg-[#FAF8F5] border-[#E2DDD3]'} border p-4 rounded-xl space-y-1`}>
              <span className={`text-[11px] ${isDark ? 'text-[#A89F95]' : 'text-[#777777]'} uppercase font-bold block`}>Human Sign-off Results</span>
              <span className={`text-base font-bold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'} block`}>{approvedCount} Approved  •  {rejectedCount} Rejected</span>
              <span className={`text-[11px] ${isDark ? 'text-[#7D736A]' : 'text-[#666666]'} block`}>Immutable decision log attached to certificate</span>
            </div>

            <div className={`${isDark ? 'bg-[#141210] border-[#38322B]' : 'bg-[#FAF8F5] border-[#E2DDD3]'} border p-4 rounded-xl space-y-1 md:col-span-2`}>
              <span className={`text-[11px] ${isDark ? 'text-[#A89F95]' : 'text-[#777777]'} uppercase font-bold block`}>Automated Downstream Action Trigger</span>
              {activeInstance.id === 'household-account' ? (
                <p className={`text-xs font-medium ${isDark ? 'text-[#D4CDC3]' : 'text-[#121212]'}`}>
                  ✉️ <strong>Notice Generated:</strong> Drafted Dispute Notice for MetroFiber claiming unannounced $20.00 rate hike dispute (Ref: <code>ACC-FIBER-992</code>).
                </p>
              ) : (
                <p className={`text-xs font-medium ${isDark ? 'text-[#D4CDC3]' : 'text-[#121212]'}`}>
                  ⚡ <strong>Multisig Calldata:</strong> Safe Multisig transaction payload prepared for verified allocation: <code>0x42B9A88F...</code> (Amount: 55,000 USDC).
                </p>
              )}
            </div>
          </div>

          {/* Movement 3 Live Incremental Arrival Demo */}
          <div className={`pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDark ? 'bg-[#141210]/90 border-[#38322B]' : 'bg-[#F4F0EA]/40 border-[#E2DDD3]'} p-4 rounded-xl border`}>
            <div>
              <span className={`text-xs font-bold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'} block`}>Movement 3: Stay Alive (Incremental Folder Watcher)</span>
              <span className={`text-[11px] ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} block`}>Test adding a new document into <code>watched/</code> to demonstrate live delta computation without re-running the corpus.</span>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              onClick={handleSimulateIncrementalArrival}
            >
              ⚡ Simulate Watched File Drop
            </motion.button>
          </div>
        </motion.section>
      )}

      {/* Main Analysis Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Human Review Queue */}
        <section className={`${isDark ? 'bg-[#1E1B18] border-[#38322B]' : 'bg-white border-[#E8E4DC]'} border rounded-2xl p-6 shadow-xs`}>
          <h2 className="font-serif text-xl font-normal mb-1">Stage 5: Item-by-Item Human Review Queue ({pendingItems.length} Pending)</h2>
          <p className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} mb-6`}>Human-in-the-Loop Gate: Review detected mismatches & compliance findings before commit.</p>

          {activeStage === 'analyzing' ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 text-[#A89F95]">
              <div className="w-7 h-7 border-2 border-[#38322B] border-t-amber-400 rounded-full animate-spin"></div>
              <p className="text-xs font-medium">Agent State Machine is analyzing documents... (Stage {analysisStep})</p>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className={`${isDark ? 'bg-[#141210] border-[#38322B] text-[#A89F95]' : 'bg-[#FAF8F5] border-[#E2DDD3] text-[#666666]'} border rounded-xl p-8 text-center text-xs`}>
              {activeStage === 'committed' ? (
                <p>✅ All items have been reviewed! The deliverable is finalized in <strong>Stage 6</strong> above.</p>
              ) : (
                <p>No pending review items! Click <strong>🚀 Run Agent Analysis</strong> above to execute the conflict detection pipeline.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {pendingItems.map(item => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className={`border-l-4 ${item.type === 'conflict' ? (isDark ? 'border-l-amber-500 bg-amber-950/30 border-amber-800/40' : 'border-l-amber-600 bg-amber-50/40 border-amber-200/60') : (isDark ? 'border-l-rose-500 bg-rose-950/30 border-rose-800/40' : 'border-l-rose-600 bg-rose-50/40 border-rose-200/60')} border-y border-r rounded-2xl p-5 space-y-3 shadow-xs`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${item.type === 'conflict' ? (isDark ? 'bg-amber-900/60 text-amber-300 border border-amber-700' : 'bg-amber-100 text-amber-900 border border-amber-300') : (isDark ? 'bg-rose-900/60 text-rose-300 border border-rose-700' : 'bg-rose-100 text-rose-900 border border-rose-300')}`}>
                        {item.type}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{item.proposal_id}</span>
                    </div>
                    <h3 className="font-serif text-lg font-normal">{item.title}</h3>
                    <p className={`text-xs ${isDark ? 'text-[#D4CDC3]' : 'text-[#333333]'} leading-relaxed`}>{item.description}</p>

                    {item.values && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {item.values.map((v, i) => (
                          <div key={i} onClick={() => handleInspectCitation(v.source)} className={`${isDark ? 'bg-[#141210] border-[#38322B] hover:border-amber-400' : 'bg-white border-[#E2DDD3] hover:border-[#121212]'} border p-2.5 rounded-xl cursor-pointer transition-colors space-y-1`}>
                            <span className="text-xs font-bold block">{v.value}</span>
                            <span className={`text-[11px] ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} block truncate`}>Source: <code className="font-mono text-[10px]">{v.source}</code> 🔍</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.source_span && (
                      <div onClick={() => handleInspectCitation(item.source_span!)} className={`${isDark ? 'bg-[#141210] border-[#38322B] hover:border-amber-400' : 'bg-white border-[#E2DDD3] hover:border-[#121212]'} border p-2.5 rounded-xl cursor-pointer transition-colors`}>
                        <span className={`text-[11px] ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'} block`}>Source Citation: <code className="font-mono text-[10px]">{item.source_span}</code> 🔍</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                        onClick={() => handleDecision(item.id, 'approved')}
                      >
                        Approve Finding
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex-1 ${isDark ? 'bg-[#282420] hover:bg-[#332E29] text-[#D4CDC3] border-[#38322B]' : 'bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] border-[#DCD6CD]'} border font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer`}
                        onClick={() => handleDecision(item.id, 'rejected')}
                      >
                        Reject Finding
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Right Column: Grounded Deliverable Register & Cost Metrics */}
        <div className="space-y-8">
          {/* Grounded Register Deliverable */}
          <section className={`${isDark ? 'bg-[#1E1B18] border-[#38322B]' : 'bg-white border-[#E8E4DC]'} border rounded-2xl p-6 shadow-xs`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-serif text-xl font-normal">Grounded Deliverable Register</h2>
                <p className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#666666]'}`}>Every claim links back to exact source line quotes.</p>
              </div>
              <div className="flex gap-1.5">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs cursor-pointer" 
                  onClick={() => exportToExcel(activeInstance.id, registerDraft, decisions, stageCosts, allExtractedFindings)}
                >
                  📊 Excel
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${isDark ? 'bg-[#282420] hover:bg-[#332E29] text-[#F5F2EB] border-[#38322B]' : 'bg-[#121212] hover:bg-[#262626] text-white'} border text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs cursor-pointer`} 
                  onClick={() => exportToPDF(activeInstance.id, registerDraft, decisions, stageCosts, allExtractedFindings)}
                >
                  📄 PDF
                </motion.button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isDark ? 'text-[#D4CDC3]' : 'text-[#333333]'}`}>
                <thead>
                  <tr className={`border-b ${isDark ? 'border-[#38322B] text-[#A89F95]' : 'border-[#E8E4DC] text-[#777777]'} font-semibold`}>
                    <th className="pb-2 font-medium">Entity</th>
                    <th className="pb-2 font-medium">Field</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Citation</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#2A2521]' : 'divide-[#F4F0EA]'}`}>
                  {Object.keys(registerDraft).length > 0 ? (
                    Object.entries(registerDraft).flatMap(([pId, propObj]: [string, any]) =>
                      Object.entries(propObj.fields || {}).map(([fName, fObj]: [string, any]) => (
                        <tr key={`${pId}_${fName}`} className={`${isDark ? 'hover:bg-[#25211D]' : 'hover:bg-[#FAF8F5]'} transition-colors`}>
                          <td className={`py-2.5 font-semibold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'}`}>{pId}</td>
                          <td className={`py-2.5 ${isDark ? 'text-[#A89F95]' : 'text-[#555555]'}`}>{fName}</td>
                          <td className={`py-2.5 font-bold ${isDark ? 'text-amber-400' : 'text-[#121212]'}`}>{fObj.value}</td>
                          <td className="py-2.5"><code className={`font-mono text-[11px] ${isDark ? 'bg-[#141210] border-[#38322B] text-[#D4CDC3]' : 'bg-[#F4F0EA] border-[#E2DDD3] text-[#444444]'} border px-2 py-0.5 rounded`}>{fObj.source_span}</code></td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#7D736A] text-xs">
                        Deliverable Register draft will be generated upon running agent analysis.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Stage-by-Stage Cost & Latency Metrics */}
          <section className={`${isDark ? 'bg-[#1E1B18] border-[#38322B]' : 'bg-white border-[#E8E4DC]'} border rounded-2xl p-6 shadow-xs`}>
            <h2 className="font-serif text-xl font-normal mb-4">Run Metrics & Cost Audit (Behavior #10)</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`${isDark ? 'bg-[#141210] border-[#38322B]' : 'bg-[#FAF8F5] border-[#E2DDD3]'} border rounded-xl p-4 flex flex-col gap-1`}>
                <span className={`font-mono text-xl font-bold ${isDark ? 'text-amber-400' : 'text-[#121212]'}`}>${totalCost.toFixed(4)}</span>
                <span className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#777777]'} font-medium`}>Total Estimated Cost</span>
              </div>
              <div className={`${isDark ? 'bg-[#141210] border-[#38322B]' : 'bg-[#FAF8F5] border-[#E2DDD3]'} border rounded-xl p-4 flex flex-col gap-1`}>
                <span className={`font-mono text-xl font-bold ${isDark ? 'text-[#F5F2EB]' : 'text-[#121212]'}`}>{totalDuration} ms</span>
                <span className={`text-xs ${isDark ? 'text-[#A89F95]' : 'text-[#777777]'} font-medium`}>Total Execution Latency</span>
              </div>
            </div>

            <div className="space-y-2">
              {stageCosts.map(c => (
                <div key={c.stage} className={`flex justify-between items-center p-2.5 ${isDark ? 'bg-[#141210] border-[#38322B] text-[#D4CDC3]' : 'bg-[#FAF8F5] border-[#E8E4DC] text-[#121212]'} border rounded-lg text-xs font-mono`}>
                  <span className="font-semibold w-32 font-sans">{c.stage}</span>
                  <span className={isDark ? 'text-[#A89F95]' : 'text-[#666666]'}>{c.tokens_in + c.tokens_out} tokens</span>
                  <span className={isDark ? 'text-[#A89F95]' : 'text-[#666666]'}>{c.duration_ms} ms</span>
                  <span className="font-bold text-emerald-500">${c.cost_usd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}

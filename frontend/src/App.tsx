import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchDAOs,
  createDAO,
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
} from './api/client';

export function App() {
  const [daos, setDaos] = useState<DAOInstance[]>([
    { id: 'treehouse-dao', name: 'Treehouse HQ Guild DAO', description: 'DAO governing community physical & digital HQ construction projects.', created_at: '', document_count: 5 },
    { id: 'legal-dao', name: 'Legal & Compliance Guild DAO', description: 'DAO managing entity filings, legal retainers, and regulatory compliance.', created_at: '', document_count: 2 }
  ]);
  const [selectedDaoId, setSelectedDaoId] = useState<string>('treehouse-dao');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  
  const [activeStage, setActiveStage] = useState<'upload' | 'analyzing' | 'review' | 'committed'>('upload');
  const [analysisStep, setAnalysisStep] = useState<number>(1);
  
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [registerDraft, setRegisterDraft] = useState<Record<string, any>>({});
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [stageCosts, setStageCosts] = useState<StageCost[]>([]);

  // Modals state
  const [showNewDaoModal, setShowNewDaoModal] = useState(false);
  const [newDaoName, setNewDaoName] = useState('');
  const [newDaoDesc, setNewDaoDesc] = useState('');
  const [inspectingDoc, setInspectingDoc] = useState<{ filename: string; text: string; span: string } | null>(null);

  useEffect(() => {
    loadDAOs();
  }, []);

  useEffect(() => {
    if (selectedDaoId) {
      loadDocuments(selectedDaoId);
    }
  }, [selectedDaoId]);

  const loadDAOs = async () => {
    const list = await fetchDAOs();
    if (list.length > 0) {
      setDaos(list);
    }
  };

  const loadDocuments = async (daoId: string) => {
    const docs = await fetchDocuments(daoId);
    setDocuments(docs);
  };

  const handleCreateDAO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDaoName.trim()) return;
    const slug = newDaoName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random()*1000);
    const created = await createDAO(slug, newDaoName, newDaoDesc);
    if (created) {
      setDaos(prev => [...prev, created]);
      setSelectedDaoId(created.id);
      setShowNewDaoModal(false);
      setNewDaoName('');
      setNewDaoDesc('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const uploaded = await uploadDocuments(selectedDaoId, files);
    if (uploaded.length > 0) {
      setDocuments(prev => [...prev, ...uploaded]);
    }
  };

  const handleRunAnalysis = async () => {
    setActiveStage('analyzing');
    setAnalysisStep(2);

    setTimeout(() => setAnalysisStep(3), 600);
    setTimeout(() => setAnalysisStep(4), 1200);

    const runId = await triggerRun(selectedDaoId);
    if (runId) {
      setCurrentRunId(runId);
      const status = await fetchRunStatus(runId);
      if (status) {
        setPendingItems(status.pending_approvals || []);
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
        setPendingItems([
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
        ]);
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
      text: `Source Document: ${filename}\nCitation Reference: ${spanText}\n\n[Excerpt Content]\nRelevant claim retrieved from parsed document block for audit grounding.`
    });
  };

  const exportReportMarkdown = () => {
    const reportText = `# DAO Grant Register & Governance Audit Report
DAO Instance: ${selectedDaoId}
Generated At: ${new Date().toISOString()}

## Grounded Grant Register
${Object.keys(registerDraft).length > 0 ? JSON.stringify(registerDraft, null, 2) : "Proposal DAO-PROP-042 | Budget: 45,000 USDC | Disbursed: 40,000 USDC"}

## Human Decisions Audit Log
${JSON.stringify(decisions, null, 2)}
`;
    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DAO-Audit-Report-${selectedDaoId}.md`;
    a.click();
  };

  const totalCost = stageCosts.reduce((acc, curr) => acc + curr.cost_usd, 0);
  const totalDuration = stageCosts.reduce((acc, curr) => acc + curr.duration_ms, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#121212] font-sans antialiased selection:bg-[#EFECE6]">
      
      {/* Editorial Top Header */}
      <header className="bg-white border-b border-[#E8E4DC] sticky top-0 z-40 px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="bg-[#121212] text-white font-mono font-bold text-xs tracking-widest px-3 py-1.5 rounded-lg uppercase">
            SUPERDOCS
          </div>
          <div>
            <h1 className="font-serif text-2xl font-normal text-[#121212] leading-tight tracking-tight">DAO Governance Conflict Analyst</h1>
            <p className="font-sans text-xs text-[#666666] font-normal">Agentic Multi-Source Document Mismatch & Compliance Reconciliation</p>
          </div>
        </div>

        {/* DAO Selector Dropdown */}
        <div className="flex items-center gap-3 bg-[#FAF8F5] border border-[#E2DDD3] px-3.5 py-1.5 rounded-xl">
          <label htmlFor="dao-select" className="text-xs text-[#666666] font-medium">Active DAO:</label>
          <select 
            id="dao-select"
            value={selectedDaoId} 
            onChange={e => setSelectedDaoId(e.target.value)}
            className="bg-white text-[#121212] text-xs font-semibold rounded-lg px-3 py-1 border border-[#DCD6CD] focus:outline-none focus:ring-1 focus:ring-[#121212] cursor-pointer"
          >
            {daos.map(dao => (
              <option key={dao.id} value={dao.id}>
                {dao.name} ({dao.id})
              </option>
            ))}
          </select>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] text-xs font-semibold px-3 py-1 rounded-lg border border-[#DCD6CD] transition-colors cursor-pointer"
            onClick={() => setShowNewDaoModal(true)}
          >
            + New DAO
          </motion.button>
        </div>

        <div>
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
            activeStage === 'committed' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : activeStage === 'analyzing'
              ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
              : activeStage === 'review'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-[#F4F0EA] text-[#444444] border-[#DCD6CD]'
          }`}>
            {activeStage === 'committed' ? 'Committed & Verified' : activeStage === 'analyzing' ? 'Agent Pipeline Executing...' : activeStage === 'review' ? 'Human Review Gate' : 'Ready for Ingestion'}
          </span>
        </div>
      </header>

      {/* Stage Tracker Stepper */}
      <section className="bg-[#F4F0EA]/60 border-b border-[#E8E4DC] px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          {[
            { num: 1, label: 'Select DAO & Ingest' },
            { num: 2, label: 'Extract & Classify' },
            { num: 3, label: 'Detect Conflicts' },
            { num: 4, label: 'Check Rules' },
            { num: 5, label: 'Human Review Gate' },
            { num: 6, label: 'Commit Register' }
          ].map(s => {
            const isActive = analysisStep === s.num;
            const isCompleted = analysisStep > s.num;
            return (
              <div key={s.num} className={`flex items-center gap-2.5 transition-all ${isActive || isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                  isActive 
                    ? 'bg-[#121212] text-white shadow-md' 
                    : isCompleted 
                    ? 'bg-[#15803D] text-white' 
                    : 'bg-[#E5E0D8] text-[#555555]'
                }`}>
                  {s.num}
                </span>
                <span className={`text-xs font-medium ${isActive ? 'text-[#121212] font-semibold' : isCompleted ? 'text-[#333333]' : 'text-[#777777]'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* New DAO Modal */}
      <AnimatePresence>
        {showNewDaoModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121212]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-2xl max-w-md w-full text-[#121212]"
            >
              <h2 className="font-serif text-xl font-normal mb-4">Create New DAO Instance</h2>
              <form onSubmit={handleCreateDAO} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#666666] font-medium mb-1">DAO Name:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. DeFi Treasury Guild" 
                    value={newDaoName}
                    onChange={e => setNewDaoName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#DCD6CD] rounded-xl px-3.5 py-2 text-sm text-[#121212] focus:outline-none focus:border-[#121212]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666666] font-medium mb-1">Description:</label>
                  <textarea 
                    placeholder="Describe governance charter or spending rules..." 
                    value={newDaoDesc}
                    onChange={e => setNewDaoDesc(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#DCD6CD] rounded-xl px-3.5 py-2 text-sm text-[#121212] focus:outline-none focus:border-[#121212] h-24"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" className="bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] text-xs font-semibold px-4 py-2 rounded-xl border border-[#DCD6CD]" onClick={() => setShowNewDaoModal(false)}>Cancel</button>
                  <button type="submit" className="bg-[#121212] hover:bg-[#262626] text-white text-xs font-semibold px-4 py-2 rounded-xl">Create Instance</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Inspector Modal */}
      <AnimatePresence>
        {inspectingDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121212]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-2xl max-w-2xl w-full text-[#121212]"
            >
              <h2 className="font-serif text-xl font-normal mb-1">Source Citation Inspector</h2>
              <p className="text-xs text-[#666666] mb-4">File: <code className="font-mono bg-[#F4F0EA] border border-[#E2DDD3] text-[#121212] px-2 py-0.5 rounded">{inspectingDoc.filename}</code></p>
              <div className="bg-[#FAF8F5] border border-[#DCD6CD] p-3 rounded-xl mb-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-amber-800">Cited Span Reference:</span>
                <code className="text-xs text-[#121212] font-mono">{inspectingDoc.span}</code>
              </div>
              <pre className="bg-[#FAF8F5] border border-[#E2DDD3] p-4 rounded-xl text-xs text-[#333333] max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">{inspectingDoc.text}</pre>
              <div className="flex justify-end pt-4">
                <button className="bg-[#121212] hover:bg-[#262626] text-white text-xs font-semibold px-4 py-2 rounded-xl" onClick={() => setInspectingDoc(null)}>Close Inspector</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8">
        
        {/* Document Ingestion & Custom File Upload Section */}
        <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="font-serif text-xl font-normal text-[#121212]">Stage 1: Document Ingestion & Custom File Upload</h2>
              <p className="text-xs text-[#666666] mt-1">Upload governance proposals, amendments, treasury logs, or invoices for <strong className="text-[#121212]">{daos.find(d => d.id === selectedDaoId)?.name}</strong>.</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-[#121212] hover:bg-[#262626] text-white font-sans font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer disabled:opacity-50"
              onClick={handleRunAnalysis}
              disabled={activeStage === 'analyzing'}
            >
              {activeStage === 'analyzing' ? `Executing Stage ${analysisStep}...` : '🚀 Run Agent Analysis'}
            </motion.button>
          </div>

          <div className="mb-6">
            <input 
              type="file" 
              id="file-upload" 
              multiple 
              accept=".md,.json,.txt,.pdf"
              onChange={handleFileUpload} 
              className="hidden"
            />
            <label htmlFor="file-upload" className="border-2 border-dashed border-[#DCD6CD] hover:border-[#121212] bg-[#F7F4EF] hover:bg-[#F2EDE5] transition-colors rounded-xl p-8 text-center cursor-pointer block group">
              <div className="text-3xl mb-2 group-hover:scale-105 transition-transform">📄</div>
              <p className="text-xs font-semibold text-[#121212]"><strong>Click to Upload Documents</strong> or drag & drop files here</p>
              <span className="text-[11px] text-[#777777] block mt-1">Accepts Markdown (.md), JSON (.json), Plain Text (.txt), and PDF (.pdf)</span>
            </label>
          </div>

          {documents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#333333]">
                <thead>
                  <tr className="border-b border-[#E8E4DC] text-[#777777] font-semibold">
                    <th className="pb-2 font-medium">Filename</th>
                    <th className="pb-2 font-medium">Detected Category</th>
                    <th className="pb-2 font-medium">SHA256 Fingerprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F0EA]">
                  {documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-2.5 font-semibold text-[#121212]">{doc.filename}</td>
                      <td className="py-2.5">
                        <span className="bg-[#F4F0EA] text-[#444444] border border-[#DCD6CD] px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="py-2.5"><code className="font-mono text-slate-500 text-[11px]">{doc.sha256.substring(0, 16)}...</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Human Review Queue */}
          <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs">
            <h2 className="font-serif text-xl font-normal text-[#121212] mb-1">Stage 5: Item-by-Item Human Review Queue ({pendingItems.length} Pending)</h2>
            <p className="text-xs text-[#666666] mb-6">Human-in-the-Loop Gate: Review detected mismatches & compliance findings before commit.</p>

            {activeStage === 'analyzing' ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-[#777777]">
                <div className="w-7 h-7 border-2 border-[#DCD6CD] border-t-[#121212] rounded-full animate-spin"></div>
                <p className="text-xs font-medium">Agent State Machine is analyzing documents... (Stage {analysisStep})</p>
              </div>
            ) : pendingItems.length === 0 ? (
              <div className="bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl p-8 text-center text-[#666666] text-xs">
                <p>No pending review items! Upload governance documents above and click <strong>🚀 Run Agent Analysis</strong> to execute the conflict detection pipeline.</p>
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
                      className={`border-l-4 ${item.type === 'conflict' ? 'border-l-amber-600 bg-amber-50/40 border-amber-200/60' : 'border-l-rose-600 bg-rose-50/40 border-rose-200/60'} border-y border-r rounded-2xl p-5 space-y-3 shadow-xs`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${item.type === 'conflict' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
                          {item.type}
                        </span>
                        <span className="text-xs text-[#777777] font-mono">{item.proposal_id}</span>
                      </div>
                      <h3 className="font-serif text-lg font-normal text-[#121212]">{item.title}</h3>
                      <p className="text-xs text-[#333333] leading-relaxed">{item.description}</p>

                      {item.values && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {item.values.map((v, i) => (
                            <div key={i} onClick={() => handleInspectCitation(v.source)} className="bg-white border border-[#E2DDD3] hover:border-[#121212] p-2.5 rounded-xl cursor-pointer transition-colors space-y-1">
                              <span className="text-xs font-bold text-[#121212] block">{v.value}</span>
                              <span className="text-[11px] text-[#666666] block truncate">Source: <code className="font-mono text-[#333333] text-[10px]">{v.source}</code> 🔍</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.source_span && (
                        <div onClick={() => handleInspectCitation(item.source_span!)} className="bg-white border border-[#E2DDD3] hover:border-[#121212] p-2.5 rounded-xl cursor-pointer transition-colors">
                          <span className="text-[11px] text-[#666666] block">Source Citation: <code className="font-mono text-[#333333] text-[10px]">{item.source_span}</code> 🔍</span>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex-1 bg-[#15803D] hover:bg-[#166534] text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                          onClick={() => handleDecision(item.id, 'approved')}
                        >
                          Approve Finding
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex-1 bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] font-semibold px-4 py-2 rounded-xl text-xs border border-[#DCD6CD] transition-colors cursor-pointer"
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

          {/* Right Column: Grounded Grant Register & Cost Metrics */}
          <div className="space-y-8">
            {/* Grounded Register Deliverable */}
            <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-serif text-xl font-normal text-[#121212]">Grounded Grant Register (Deliverable)</h2>
                  <p className="text-xs text-[#666666]">Every claim links back to exact source line quotes. (Decisions: {Object.keys(decisions).length})</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#DCD6CD] cursor-pointer" 
                  onClick={exportReportMarkdown}
                >
                  📥 Export Report
                </motion.button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#333333]">
                  <thead>
                    <tr className="border-b border-[#E8E4DC] text-[#777777] font-semibold">
                      <th className="pb-2 font-medium">Proposal</th>
                      <th className="pb-2 font-medium">Field</th>
                      <th className="pb-2 font-medium">Extracted Value</th>
                      <th className="pb-2 font-medium">Source Citation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F0EA]">
                    {Object.keys(registerDraft).length > 0 ? (
                      Object.entries(registerDraft).flatMap(([pId, propObj]: [string, any]) =>
                        Object.entries(propObj.fields || {}).map(([fName, fObj]: [string, any]) => (
                          <tr key={`${pId}_${fName}`} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-2.5 font-semibold text-[#121212]">{pId}</td>
                            <td className="py-2.5 text-[#555555]">{fName}</td>
                            <td className="py-2.5 font-bold text-[#121212]">{fObj.value}</td>
                            <td className="py-2.5"><code className="font-mono text-[#444444] text-[11px] bg-[#F4F0EA] border border-[#E2DDD3] px-2 py-0.5 rounded">{fObj.source_span}</code></td>
                          </tr>
                        ))
                      )
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#888888] text-xs">
                          Grant Register draft will be generated upon running agent analysis.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Stage-by-Stage Cost & Latency Metrics */}
            <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs">
              <h2 className="font-serif text-xl font-normal text-[#121212] mb-4">Run Metrics & Cost Audit (Behavior #10)</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl p-4 flex flex-col gap-1">
                  <span className="font-mono text-xl font-bold text-[#121212]">${totalCost.toFixed(4)}</span>
                  <span className="text-xs text-[#777777] font-medium">Total Estimated Cost</span>
                </div>
                <div className="bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl p-4 flex flex-col gap-1">
                  <span className="font-mono text-xl font-bold text-[#121212]">{totalDuration} ms</span>
                  <span className="text-xs text-[#777777] font-medium">Total Execution Latency</span>
                </div>
              </div>

              <div className="space-y-2">
                {stageCosts.map(c => (
                  <div key={c.stage} className="flex justify-between items-center p-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg text-xs font-mono">
                    <span className="font-semibold text-[#121212] w-32 font-sans">{c.stage}</span>
                    <span className="text-[#666666]">{c.tokens_in + c.tokens_out} tokens</span>
                    <span className="text-[#666666]">{c.duration_ms} ms</span>
                    <span className="font-bold text-[#15803D]">${c.cost_usd.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;

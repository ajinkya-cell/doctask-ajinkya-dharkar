import { motion } from 'framer-motion';
import type { PageRoute } from '../components/Navbar';

interface ExplainerPageProps {
  onNavigate: (page: PageRoute) => void;
}

export function ExplainerPage({ onNavigate }: ExplainerPageProps) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-4 space-y-12 text-[#121212]">
      
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-4 pb-8 border-b border-stone-200">
        <div className="inline-flex items-center gap-2 bg-stone-100 border border-stone-300 px-3.5 py-1 rounded-full text-xs font-mono font-semibold text-stone-800">
          <span>⚡</span> MULTI-SOURCE DOCUMENT RECONCILIATION ENGINE
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight leading-tight">
          The Analyst That Never Sleeps
        </h1>
        <p className="font-sans text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
          An agentic state machine that ingests piles of conflicting documents, extracts facts with exact line citations, evaluates governing rules, surfaces contradictions for human sign-off, and maintains incremental delta updates.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('dao')}
            className="bg-[#1E1B18] border border-[#38322B] text-[#F5F2EB] text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md hover:bg-[#282420] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>🏛️</span> Open DAO Governance Hub (Warm Charcoal & Amber)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('household')}
            className="bg-[#EAE5DC] text-stone-900 border border-stone-300 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#E2DDD3] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>🧾</span> Open Household Bill Auditor (Warm Cream & Linen)
          </motion.button>
        </div>
      </section>

      {/* The Core Problem & Philosophy */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="text-2xl">📚</div>
          <h3 className="font-serif text-lg font-normal text-stone-900">1. Unstructured Piles</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Real organizations don't have clean SQL databases. They have messy Markdown proposals, PDF amendments, JSON bank logs, and chat forum debates with conflicting numbers.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="text-2xl">🔍</div>
          <h3 className="font-serif text-lg font-normal text-stone-900">2. Cross-Doc Contradictions</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Proposal #42 asks for $50k. Amendment #42b ratifies $45k with a 40k payout. The invoice asks for $10k. No single document has the full truth—only cross-document grounding reveals the discrepancy.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="text-2xl">🛡️</div>
          <h3 className="font-serif text-lg font-normal text-stone-900">3. Human-in-the-Loop Gate</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            AI should never disburse money or alter records autonomously. The engine pauses at Stage 5, presenting exact line-level evidence for item-by-item human approval before final commit.
          </p>
        </div>
      </section>

      {/* The Three Movements Breakdown */}
      <section className="bg-white border border-stone-200 rounded-2xl p-8 shadow-xs space-y-6">
        <div className="border-b border-stone-200 pb-4">
          <span className="text-xs font-mono uppercase text-amber-800 font-bold tracking-wider">SuperDocs Challenge Specification</span>
          <h2 className="font-serif text-2xl font-normal text-stone-900 mt-1">The Three Movements & Architecture Pipeline</h2>
        </div>

        <div className="space-y-6">
          {/* Movement 1 */}
          <div className="border-l-4 border-l-stone-800 pl-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-stone-900 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">MOVEMENT 1</span>
              <h4 className="font-serif text-base font-semibold text-stone-900">Understand the Pile (Ingest &rarr; Classify &rarr; Ground &rarr; Matrix)</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Ingests arbitrary file formats (Markdown, PDF, JSON, TXT). Classifies into domain document types. Extracts structured facts where <strong>every fact records an exact line-level citation</strong> (e.g. <code>DAO-PROP-042.md:L14: '50,000 USDC'</code>). Detects multi-document discrepancies automatically.
            </p>
          </div>

          {/* Movement 2 */}
          <div className="border-l-4 border-l-amber-600 pl-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-amber-800 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">MOVEMENT 2</span>
              <h4 className="font-serif text-base font-semibold text-stone-900">Examine Against the Rules (Playbook & Governance Checks)</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Applies rules deterministically against extracted facts:
              <br />• <strong>Rule 5.1:</strong> Initial payout &le; 85% of approved budget (Flags 40k/45k = 88.9% violation).
              <br />• <strong>Rule 5.3:</strong> Disbursed amounts must not exceed approved cap.
              <br />• <strong>Rule 6.1:</strong> Household unannounced rate hikes &gt; 10% without 30-day notice.
              <br />• <strong>Zero-Finding Proof:</strong> Verifies that a clean, compliant corpus produces exactly 0 false positives.
            </p>
          </div>

          {/* Movement 3 */}
          <div className="border-l-4 border-l-emerald-600 pl-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-800 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">MOVEMENT 3</span>
              <h4 className="font-serif text-base font-semibold text-stone-900">Stay Alive (Incremental Folder Watcher & Delta Computation)</h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Monitors a directory for newly dropped files. Computes incremental state updates and surfaces new contradictions (e.g., April $79 bill or final contractor invoice) <strong>without re-running the existing document corpus</strong>, saving 90%+ in token compute.
            </p>
          </div>
        </div>
      </section>

      {/* The 10 Separating Behaviors Matrix */}
      <section className="bg-white border border-stone-200 rounded-2xl p-8 shadow-xs space-y-6">
        <div className="border-b border-stone-200 pb-4">
          <span className="text-xs font-mono uppercase text-emerald-800 font-bold tracking-wider">Evaluation Rubric Compliance</span>
          <h2 className="font-serif text-2xl font-normal text-stone-900 mt-1">The 10 Separating Behaviors</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            { num: 1, title: 'Multi-Format Ingestion', desc: 'Accepts .md, .pdf, .json, .txt without rigid pre-schemas.' },
            { num: 2, title: 'No Hallucinations / Line Spans', desc: 'Every fact links to exact source line quotes with zero fabrication.' },
            { num: 3, title: 'Domain-Agnostic Engine', desc: 'Identical code runs DAO governance, household utility bills, and enterprise contracts.' },
            { num: 4, title: 'Zero False Positives', desc: 'Clean, compliant document sets produce exactly 0 findings.' },
            { num: 5, title: 'Human Review Gate', desc: 'Pauses pipeline for item-by-item sign-off before committing state.' },
            { num: 6, title: 'Multi-Tenant Isolation', desc: 'Separate database partition keys guarantee 0 leakage between instances.' },
            { num: 7, title: 'Live Neon DB & Resume-After-Kill', desc: 'State checkpointing allows resumes after process kill with zero data loss.' },
            { num: 8, title: 'Prompt Injection Defense', desc: 'Malicious directives like SYSTEM OVERRIDE are treated as untrusted data.' },
            { num: 9, title: 'FastMCP Server Protocol', desc: 'Built-in FastMCP server allows Claude Desktop & IDE integration.' },
            { num: 10, title: 'Stage-by-Stage Cost Tracking', desc: 'Tracks tokens, execution latency (ms), and cost ($) across every graph node.' }
          ].map(b => (
            <div key={b.num} className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                  {b.num}
                </span>
                <span className="font-semibold text-stone-900">{b.title}</span>
              </div>
              <p className="text-stone-600 pl-7">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

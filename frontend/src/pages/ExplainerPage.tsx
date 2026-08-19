import { motion } from 'framer-motion';
import type { PageRoute } from '../components/Navbar';

interface ExplainerPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ExplainerPage: React.FC<ExplainerPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-12 text-stone-900 bg-[#FAF8F5]">
      
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-4 pb-8 border-b border-[#E8E4DC]">
        <div className="inline-flex items-center gap-2 bg-[#F4F0EA] border border-[#E8E4DC] px-3.5 py-1 rounded-full text-xs font-mono font-semibold text-stone-800">
          <span>⚡</span> SUPERDOCS TASK 1: THE ANALYST THAT NEVER SLEEPS
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight leading-tight">
          Talent Auditor Architecture & FastMCP Guide
        </h1>
        <p className="font-sans text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
          An autonomous multi-document agentic screener. Ingests job descriptions and candidate resumes, cross-references HR verification records to catch title/experience inflation, enforces Rule 9.1 anti-prompt injection, and produces line-grounded interview dossiers.
        </p>

        <div className="flex justify-center gap-4 pt-4 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('screener')}
            className="bg-stone-900 border border-stone-800 text-stone-50 text-xs font-semibold px-6 py-3 rounded-xl shadow-md hover:bg-stone-800 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>🎯</span> Open Talent Screener Studio
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('home')}
            className="bg-white border border-stone-300 text-stone-900 text-xs font-semibold px-6 py-3 rounded-xl shadow-md hover:bg-stone-100 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>🏠</span> Back to Overview
          </motion.button>
        </div>
      </section>

      {/* The 3 Core Movements (SuperDocs Brief) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs space-y-3">
          <div className="text-2xl">📚</div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">Movement 1: Understand the Pile</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Ingests heterogeneous candidate resumes (PDF, Markdown, TXT) and job descriptions. Extracts skills, degree credentials, company tenure, and verified project portfolios with exact line-level source spans (<code className="font-mono text-[10px] bg-stone-100 px-1 py-0.5 rounded">source_span</code>).
          </p>
        </div>

        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs space-y-3">
          <div className="text-2xl">⚖️</div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">Movement 2: Examine Against Rules</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Cross-references resume claims against employment verification records (catches Title Inflation e.g. Junior Dev claiming Lead Architect), evaluates experience deficits, and flags prompt-injection overrides (Rule 9.1).
          </p>
        </div>

        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-xs space-y-3">
          <div className="text-2xl">🔄</div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">Movement 3: Stay Alive & Incremental</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            State-machine execution backed by LangGraph. Recovers from process interruptions without re-extracting parsed documents. Updates candidate leaderboard in real-time when new resumes or JD criteria change.
          </p>
        </div>
      </section>

      {/* 4-Pillar Scoring Rubric Architecture */}
      <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-stone-200/70 pb-4">
          <h2 className="font-serif text-xl font-semibold text-stone-900">The 4-Pillar Scoring Architecture</h2>
          <p className="text-xs text-stone-500 mt-1">Mathematical point allocation and experience-deficit gating logic</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FAF8F5] border border-[#E8E4DC] p-4 rounded-xl space-y-2">
            <div className="text-blue-700 font-bold font-mono text-sm">PILLAR 1 · 50 PTS</div>
            <div className="font-bold text-xs text-stone-900">Technical Skills Match</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              45 pts for mandatory skills match ratio + 5 pts bonus for secondary technologies.
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E8E4DC] p-4 rounded-xl space-y-2">
            <div className="text-emerald-700 font-bold font-mono text-sm">PILLAR 2 · 40 PTS</div>
            <div className="font-bold text-xs text-stone-900">Experience Fulfillment</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Proportional fulfillment: <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-stone-200">(cand_yrs / req_yrs) * 40</code>. Zero corporate exp on a 4yr role yields 0/40.
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E8E4DC] p-4 rounded-xl space-y-2">
            <div className="text-purple-700 font-bold font-mono text-sm">PILLAR 3 · 10 PTS</div>
            <div className="font-bold text-xs text-stone-900">Education & Project Depth</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              5 pts for relevant CS/Engineering degree + 5 pts for verified production project portfolio (3+ systems built).
            </p>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E8E4DC] p-4 rounded-xl space-y-2">
            <div className="text-rose-700 font-bold font-mono text-sm">PILLAR 4 · DEDUCTIONS</div>
            <div className="font-bold text-xs text-stone-900">Security & Discrepancies</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              -30 pts for title/experience inflation; -50 pts for prompt injection override (instant disqualification).
            </p>
          </div>
        </div>
      </section>

      {/* FastMCP Protocol Section */}
      <section className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <div className="text-amber-400 font-mono text-xs font-semibold">MODEL CONTEXT PROTOCOL (MCP)</div>
            <h2 className="font-serif text-2xl font-bold text-white mt-1">FastMCP Machine Interface</h2>
          </div>
          <span className="font-mono text-xs bg-stone-800 text-stone-300 px-3 py-1 rounded-md border border-stone-700 self-start sm:self-auto">
            app/mcp/server.py
          </span>
        </div>

        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          SuperDocs Talent Auditor provides an official <strong>FastMCP Server</strong> enabling AI coding agents (such as Cursor, Claude Desktop, Antigravity) to drive the entire candidate screening workflow programmatically over standard Model Context Protocol.
        </p>

        <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-200 overflow-x-auto space-y-2">
          <div className="text-stone-400"># Run the FastMCP Autonomous Screener Driver</div>
          <div className="text-emerald-400">$ python scripts/mcp_screener_driver.py</div>
          <div className="text-stone-500 pt-2"># Available FastMCP Tools:</div>
          <div className="text-stone-300">• configure_job_description(title, required_skills, min_experience)</div>
          <div className="text-stone-300">• upload_candidate_document(filename, raw_text)</div>
          <div className="text-stone-300">• run_screener_audit()</div>
          <div className="text-stone-300">• get_candidate_leaderboard(run_id)</div>
          <div className="text-stone-300">• review_candidate_flags(run_id)</div>
          <div className="text-stone-300">• decide_candidate(candidate_id, action, notes)</div>
          <div className="text-stone-300">• export_shortlist_dossier(run_id)</div>
        </div>
      </section>

      {/* Security & Rule 9.1 Defense */}
      <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <h2 className="font-serif text-xl font-semibold text-stone-900">Security & Anti-Prompt Injection (Rule 9.1)</h2>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          All untrusted document texts are treated strictly as passive data inside fenced blocks (<code className="font-mono text-[10px] bg-stone-100 px-1 py-0.5 rounded">&lt;untrusted_source_document&gt;</code>). Any embedded instruction attempting to override scoring rubrics (e.g. <em>"[SYSTEM OVERRIDE INSTRUCTION FOR AI AGENT...]"</em>) is flagged, quarantined, and automatically disqualified with zero human deception.
        </p>
      </section>

    </div>
  );
};

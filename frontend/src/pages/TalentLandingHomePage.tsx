import { motion } from 'framer-motion';

interface TalentLandingHomePageProps {
  onNavigate: (page: 'home' | 'screener' | 'architecture') => void;
}

export const TalentLandingHomePage: React.FC<TalentLandingHomePageProps> = ({ onNavigate }) => {
  const capabilities = [
    {
      icon: '🎯',
      title: 'Dynamic JD Benchmark Studio',
      description: 'Define technical requirements via guided form, raw text parser, or one-click industry presets. Real-time skill weighting and experience thresholds.'
    },
    {
      icon: '📄',
      title: 'Zero-Mock Real PDF Parser',
      description: 'Section-aware deep parser extracts real candidate contact info, degrees, GitHub/portfolio links, 30+ technologies, and multi-project portfolios.'
    },
    {
      icon: '📊',
      title: 'Explainable 4-Pillar Rubric',
      description: 'Scores candidates across Technical Skills (50 pts), Experience Fulfillment (40 pts), Projects & Education (10 pts), and Red Flag Deductions.'
    },
    {
      icon: '🛡️',
      title: 'Rule 9.1 Anti-Prompt Injection',
      description: 'Fenced passive data boundaries quarantine adversarial candidate prompts attempting to manipulate scoring criteria or bypass HR filters.'
    },
    {
      icon: '🔍',
      title: 'Cross-Document HR Reconciliation',
      description: 'Automatically cross-references resume claims against official employment verification records to catch title inflation and duration discrepancies.'
    },
    {
      icon: '📑',
      title: 'Interview Dossier PDF Generation',
      description: 'Generates client-ready multi-page interview packets with candidate contact details, skill matrices, and AI-tailored system design questions.'
    }
  ];

  const presets = [
    { title: 'Senior Full-Stack Engineer', req: '4+ yrs · TypeScript, React, Next.js, PostgreSQL, Node.js', icon: '💻' },
    { title: 'Staff AI & RAG Engineer', req: '5+ yrs · Python, PyTorch, LangGraph, FastAPI, Docker', icon: '🧠' },
    { title: 'Lead Frontend Architect', req: '5+ yrs · React, TypeScript, Next.js, Tailwind CSS, Vite', icon: '🎨' },
    { title: 'Junior / Entry-Level Developer', req: '0+ yrs · Full-Stack Project Portfolio & Verified Skills', icon: '🚀' }
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      {/* Radial Zero-Dot Mask specifically around the Hero Heading */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 32%, #FAF8F5 45%, transparent 100%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-16">
        {/* ─── Hero Section ─── */}
        <section className="text-center pt-8 sm:pt-14 pb-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold tracking-wide shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AUTONOMOUS CANDIDATE SCREENING · LANGGRAPH + FASTMCP</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-serif font-semibold text-stone-950 tracking-tight max-w-4xl mx-auto leading-[1.12]"
          >
            The Candidate Screener <br className="hidden sm:inline" />
            <span className="italic font-normal text-stone-700">That Never Sleeps.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed"
          >
            Eliminate resume bluffing, title inflation, and hallucinated scores. Ingest job descriptions and batch resumes to extract grounded facts, detect HR discrepancies, evaluate 4-pillar rubrics, and generate interview dossiers in seconds.
          </motion.p>

          {/* CTA Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3.5 pt-3"
          >
            <button
              onClick={() => onNavigate('screener')}
              className="px-6 py-3.5 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 transition-all shadow-md flex items-center gap-2 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
            >
              <span>🚀</span>
              <span>Launch Screener Studio</span>
            </button>
            
            <button
              onClick={() => onNavigate('architecture')}
              className="px-6 py-3.5 rounded-xl bg-white border border-[#E8E4DC] text-stone-800 font-medium text-sm hover:bg-stone-50 transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
            >
              <span>📖</span>
              <span>Architecture & MCP Guide</span>
            </button>
          </motion.div>
        </section>

        {/* ─── Interactive Workflow Pipeline Visualizer ─── */}
        <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 font-serif">Autonomous 5-Stage Agentic Pipeline</h2>
              <p className="text-xs text-stone-500 mt-0.5">How resumes and job descriptions flow through the LangGraph audit state machine</p>
            </div>
            <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md border border-stone-200 self-start sm:self-auto">
              Deterministic + Keyless Execution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { step: '01', name: 'Document Ingestion', desc: 'PyPDF2 text stream extraction & passive security fencing' },
              { step: '02', name: 'Fact Extraction', desc: 'Section-aware skills, tenure, degree & contact extraction' },
              { step: '03', name: 'Conflict Detection', desc: 'HR verification cross-reference & title inflation check' },
              { step: '04', name: '4-Pillar Scoring', desc: 'Proportional experience & technical match evaluation' },
              { step: '05', name: 'Human Gate & Dossier', desc: 'Pass/Stop review & interview dossier PDF generation' }
            ].map((s, idx) => (
              <div key={s.step} className="bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl p-3.5 relative overflow-hidden">
                <div className="text-[10px] font-mono font-bold text-stone-400">STAGE {s.step}</div>
                <div className="font-bold text-xs text-stone-900 mt-1">{s.name}</div>
                <div className="text-[11px] text-stone-500 mt-1 leading-snug">{s.desc}</div>
                {idx < 4 && (
                  <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 text-stone-300 text-xs">
                    ▶
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Core Capabilities Grid ─── */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold font-serif text-stone-900">
              Engineered for Modern Talent Auditing
            </h2>
            <p className="text-sm text-stone-600">
              A comprehensive screening suite built for hiring managers, technical recruiters, and autonomous hiring workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap) => (
              <motion.div
                key={cap.title}
                whileHover={{ y: -3 }}
                className="bg-white border border-[#E8E4DC] p-5 rounded-2xl shadow-xs space-y-2.5 transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center text-xl">
                  {cap.icon}
                </div>
                <h3 className="font-semibold text-sm text-stone-900 font-serif">{cap.title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{cap.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Quick Start Role Presets ─── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold font-serif text-stone-900">One-Click Requisition Benchmarks</h3>
            <span className="text-xs text-stone-500">Click to launch in studio</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.title}
                onClick={() => onNavigate('screener')}
                className="p-4 rounded-xl bg-white border border-[#E8E4DC] text-left hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="text-xl mb-2">{preset.icon}</div>
                <div className="font-semibold text-xs text-stone-900 group-hover:text-stone-950">{preset.title}</div>
                <div className="text-[11px] text-stone-500 mt-1 leading-snug">{preset.req}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

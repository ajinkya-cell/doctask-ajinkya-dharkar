import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar, type PageRoute } from './components/Navbar';
import { TalentLandingHomePage } from './pages/TalentLandingHomePage';
import { ResumeScreenerHubPage } from './pages/ResumeScreenerHubPage';
import { ExplainerPage } from './pages/ExplainerPage';

export function App() {
  const [activePage, setActivePage] = useState<PageRoute>('home');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-[#EFECE6] font-sans antialiased">
      
      {/* Floating Rounded Navbar */}
      <Navbar activePage={activePage} onSelectPage={setActivePage} />

      {/* Main Page Route Views */}
      <main className="flex-1 pb-16">
        <AnimatePresence mode="wait">
          {activePage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <TalentLandingHomePage onNavigate={setActivePage} />
            </motion.div>
          )}

          {activePage === 'screener' && (
            <motion.div
              key="screener"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ResumeScreenerHubPage />
            </motion.div>
          )}

          {activePage === 'architecture' && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ExplainerPage onNavigate={setActivePage} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E4DC] py-6 text-center text-xs text-stone-500 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-900 font-bold">SUPERDOCS TALENT AUDITOR</span>
            <span>·</span>
            <span>Autonomous Candidate Screening & Audit System</span>
          </div>
          <div>Zero Bluffing · Line-Level Citations · 4-Pillar Rubric · FastMCP Machine Interface</div>
        </div>
      </footer>

    </div>
  );
}

export default App;

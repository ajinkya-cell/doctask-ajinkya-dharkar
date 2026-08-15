import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar, type PageRoute } from './components/Navbar';
import { ExplainerPage } from './pages/ExplainerPage';
import { DAOHubPage } from './pages/DAOHubPage';
import { HouseholdHubPage } from './pages/HouseholdHubPage';

export function App() {
  const [activePage, setActivePage] = useState<PageRoute>('explainer');

  const isDaoPage = activePage === 'dao';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      isDaoPage 
        ? 'bg-[#141210] text-[#F5F2EB] selection:bg-amber-500/30' 
        : 'bg-[#FAF8F5] text-[#121212] selection:bg-[#EFECE6]'
    } font-sans antialiased`}>
      
      {/* Floating Rounded Navbar */}
      <Navbar activePage={activePage} onSelectPage={setActivePage} />

      {/* Main Page Route Views */}
      <main className="flex-1 pb-16">
        <AnimatePresence mode="wait">
          {activePage === 'explainer' && (
            <motion.div
              key="explainer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ExplainerPage onNavigate={setActivePage} />
            </motion.div>
          )}

          {activePage === 'dao' && (
            <motion.div
              key="dao"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <DAOHubPage />
            </motion.div>
          )}

          {activePage === 'household' && (
            <motion.div
              key="household"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <HouseholdHubPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <footer className={`py-6 border-t ${
        isDaoPage ? 'border-[#2E2823] text-[#8C8178]' : 'border-stone-200 text-stone-500'
      } text-center text-xs font-mono`}>
        SUPERDOCS • Domain-Agnostic Multi-Source Document Reconciliation Engine • LangGraph + Neon PostgreSQL + NVIDIA NIM
      </footer>

    </div>
  );
}

export default App;

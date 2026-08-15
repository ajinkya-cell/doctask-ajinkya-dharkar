import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDAOs, createDAO, type DAOInstance } from '../api/client';
import { PipelineWorkspace } from '../components/PipelineWorkspace';

export function HouseholdHubPage() {
  const [householdList, setHouseholdList] = useState<DAOInstance[]>([
    { id: 'household-account', name: 'Alex Miller Household Account', description: 'Auditing recurring fiber internet bills, streaming subscriptions, and bank statements.', created_at: '', document_count: 6 },
    { id: 'family-utility-hub', name: 'Family Utility & Power Hub', description: 'Tracking monthly electricity caps, water surcharge agreements, and rate hike notices.', created_at: '', document_count: 3 }
  ]);
  const [selectedInstance, setSelectedInstance] = useState<DAOInstance>(householdList[0]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    const list = await fetchDAOs();
    if (list.length > 0) {
      const hhFiltered = list.filter(d => d.id.includes('household') || d.id.includes('family') || d.id.includes('lease'));
      if (hhFiltered.length > 0) {
        setHouseholdList(hhFiltered);
        setSelectedInstance(hhFiltered[0]);
      }
    }
  };

  const handleCreateInstance = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const slug = 'household-' + newName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random()*1000);
    const created = await createDAO(slug, newName, newDesc);
    if (created) {
      setHouseholdList(prev => [...prev, created]);
      setSelectedInstance(created);
      setShowNewModal(false);
      setNewName('');
      setNewDesc('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-4 space-y-8 text-[#121212]">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#E8E4DC] p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-stone-900">Household Bill & Service Auditor Hub</h1>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Reconcile locked plan agreements against actual billed amounts, detect unannounced price hikes (&gt;10% Rule 6.1), duplicate bank charges, and spending cap overruns ($150 Rule 6.2).
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowNewModal(true)}
          className="bg-[#121212] hover:bg-[#262626] text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
        >
          + Create New Household Account
        </motion.button>
      </div>

      {/* Case Directory Grid */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-normal text-stone-900">Household Accounts Directory ({householdList.length} Active)</h3>
          <span className="text-xs text-stone-500">Click any account below to load that auditing workspace:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {householdList.map(item => {
            const isSelected = selectedInstance.id === item.id;
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedInstance(item)}
                className={`border rounded-2xl p-5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-[#121212] shadow-md ring-1 ring-[#121212]/30'
                    : 'bg-white/60 border-[#E8E4DC] hover:border-[#DCD6CD] hover:bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    {item.id}
                  </span>
                  {isSelected && (
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ● Active Account
                    </span>
                  )}
                </div>
                <h4 className="font-serif text-base font-semibold text-stone-900 mb-1">{item.name}</h4>
                <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">{item.description || "Auditing account for recurring home bills."}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Embedded Execution Workspace */}
      <PipelineWorkspace activeInstance={selectedInstance} theme="light" />

      {/* Create Modal */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-2xl max-w-md w-full text-[#121212]"
            >
              <h2 className="font-serif text-xl font-normal mb-4">Create New Household Account</h2>
              <form onSubmit={handleCreateInstance} className="space-y-4">
                <div>
                  <label className="block text-xs text-stone-600 font-medium mb-1">Account Holder / Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Miller Family Utility Account"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#DCD6CD] rounded-xl px-3.5 py-2 text-sm text-[#121212] focus:outline-none focus:border-[#121212]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-600 font-medium mb-1">Budget & Policy Description:</label>
                  <textarea
                    placeholder="Describe monthly recurring spending caps, target utility rates, or dispute rules..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#DCD6CD] rounded-xl px-3.5 py-2 text-sm text-[#121212] focus:outline-none focus:border-[#121212] h-24"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" className="bg-[#F4F0EA] hover:bg-[#EFECE6] text-[#121212] text-xs font-semibold px-4 py-2 rounded-xl border border-[#DCD6CD]" onClick={() => setShowNewModal(false)}>Cancel</button>
                  <button type="submit" className="bg-[#121212] hover:bg-[#262626] text-white text-xs font-bold px-4 py-2 rounded-xl">Create Account</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

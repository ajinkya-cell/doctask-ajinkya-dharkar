import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDAOs, createDAO, type DAOInstance } from '../api/client';
import { PipelineWorkspace } from '../components/PipelineWorkspace';

export function DAOHubPage() {
  const [daoList, setDaoList] = useState<DAOInstance[]>([
    { id: 'treehouse-dao', name: 'Treehouse HQ Guild DAO', description: 'Governance over community physical & digital HQ construction projects.', created_at: '', document_count: 5 },
    { id: 'solaris-dao', name: 'Solaris Community Microgrid DAO', description: 'Governance for solar panel procurement and battery storage allocations.', created_at: '', document_count: 5 },
    { id: 'legal-dao', name: 'Legal & Compliance Guild DAO', description: 'Governance managing legal retainers and regulatory compliance.', created_at: '', document_count: 2 }
  ]);
  const [selectedDao, setSelectedDao] = useState<DAOInstance>(daoList[0]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadDAOs();
  }, []);

  const loadDAOs = async () => {
    const list = await fetchDAOs();
    if (list.length > 0) {
      const daoFiltered = list.filter(d => !d.id.includes('household'));
      if (daoFiltered.length > 0) {
        setDaoList(daoFiltered);
        setSelectedDao(daoFiltered[0]);
      }
    }
  };

  const handleCreateDAO = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random()*1000);
    const created = await createDAO(slug, newName, newDesc);
    if (created) {
      setDaoList(prev => [...prev, created]);
      setSelectedDao(created);
      setShowNewModal(false);
      setNewName('');
      setNewDesc('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-4 space-y-8 text-[#F5F2EB]">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1E1B18] border border-[#38322B] p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#F5F2EB]">DAO Governance Conflict Analyst Hub</h1>
          </div>
          <p className="text-xs text-[#A89F95] mt-1">
            Detect cross-proposal contradictions, milestone escrow overruns, initial payout threshold violations (Rule 5.1), and prompt injection threats.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowNewModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
        >
          + Create New DAO Instance
        </motion.button>
      </div>

      {/* Case Directory Grid */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-normal text-[#EAE4D9]">DAO Cases Directory ({daoList.length} Active)</h3>
          <span className="text-xs text-[#9E9388]">Click any card below to load that instance workspace:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {daoList.map(dao => {
            const isSelected = selectedDao.id === dao.id;
            return (
              <motion.div
                key={dao.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedDao(dao)}
                className={`border rounded-2xl p-5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#25211D] border-amber-500 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-[#1C1917]/70 border-[#38322B] hover:border-[#4D453C] hover:bg-[#201C19]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded">
                    {dao.id}
                  </span>
                  {isSelected && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ● Active
                    </span>
                  )}
                </div>
                <h4 className="font-serif text-base font-semibold text-[#F5F2EB] mb-1">{dao.name}</h4>
                <p className="text-xs text-[#A89F95] line-clamp-2 leading-relaxed">{dao.description || "Governance instance for proposals and treasury tracking."}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Embedded Execution Workspace */}
      <PipelineWorkspace activeInstance={selectedDao} theme="dark" />

      {/* Create Modal */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1E1B18] border border-[#38322B] rounded-2xl p-6 shadow-2xl max-w-md w-full text-[#F5F2EB]"
            >
              <h2 className="font-serif text-xl font-normal mb-4">Create New DAO Instance</h2>
              <form onSubmit={handleCreateDAO} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#A89F95] font-medium mb-1">DAO Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Nexus Protocol Guild DAO"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-[#141210] border border-[#38322B] rounded-xl px-3.5 py-2 text-sm text-[#F5F2EB] focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A89F95] font-medium mb-1">Charter & Scope:</label>
                  <textarea
                    placeholder="Describe voting rules, milestone requirements, or treasury limits..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full bg-[#141210] border border-[#38322B] rounded-xl px-3.5 py-2 text-sm text-[#F5F2EB] focus:outline-none focus:border-amber-400 h-24"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" className="bg-[#282420] hover:bg-[#332E29] text-[#D4CDC3] text-xs font-semibold px-4 py-2 rounded-xl border border-[#38322B]" onClick={() => setShowNewModal(false)}>Cancel</button>
                  <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold px-4 py-2 rounded-xl">Create DAO</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

import { motion } from 'framer-motion';

export type PageRoute = 'explainer' | 'dao' | 'household';

interface NavbarProps {
  activePage: PageRoute;
  onSelectPage: (page: PageRoute) => void;
}

export function Navbar({ activePage, onSelectPage }: NavbarProps) {
  const isDao = activePage === 'dao';

  const navItems: { id: PageRoute; label: string; icon: string }[] = [
    { id: 'explainer', label: 'How It Works', icon: '📖' },
    { id: 'dao', label: 'DAO Governance Hub', icon: '🏛️' },
    { id: 'household', label: 'Household Bill Auditor', icon: '🧾' }
  ];

  return (
    <nav className="sticky top-4 z-50 px-4 mb-6">
      <div className={`max-w-4xl mx-auto ${
        isDao 
          ? 'bg-[#1C1917]/95 border-[#38322B] text-[#F5F2EB]' 
          : 'bg-white/95 border-stone-200/80 text-[#121212]'
      } border backdrop-blur-md rounded-full shadow-md px-4 py-2 flex flex-wrap items-center justify-between gap-2 transition-colors duration-300`}>
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 pl-2 cursor-pointer" onClick={() => onSelectPage('explainer')}>
          <div className={`${
            isDao ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-[#121212] text-white'
          } font-mono text-xs tracking-widest px-2.5 py-1 rounded-md uppercase shadow-xs`}>
            SUPERDOCS
          </div>
          <span className="font-serif text-sm font-semibold tracking-tight hidden sm:inline">
            Conflict Analyst Engine
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex items-center gap-1 ${
          isDao ? 'bg-[#141210] border-[#2E2823]' : 'bg-stone-100 border-stone-200/60'
        } p-1 rounded-full border`}>
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? (isDao ? 'text-[#F5F2EB] font-bold' : 'text-stone-900 font-bold')
                    : (isDao ? 'text-[#A3988E] hover:text-[#F5F2EB]' : 'text-stone-600 hover:text-stone-900')
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className={`absolute inset-0 ${isDao ? 'bg-[#2A2521] shadow-xs' : 'bg-white shadow-xs'} rounded-full`}
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
}

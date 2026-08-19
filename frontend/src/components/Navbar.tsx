import { motion } from 'framer-motion';

export type PageRoute = 'home' | 'screener' | 'architecture';

interface NavbarProps {
  activePage: PageRoute;
  onSelectPage: (page: PageRoute) => void;
}

export function Navbar({ activePage, onSelectPage }: NavbarProps) {
  const navItems: { id: PageRoute; label: string; icon: string }[] = [
    { id: 'home', label: 'Overview', icon: '🏠' },
    { id: 'screener', label: 'Talent Screener Studio', icon: '🎯' },
    { id: 'architecture', label: 'Architecture & MCP', icon: '📖' }
  ];

  return (
    <nav className="sticky top-4 z-50 px-4 mb-6">
      <div className="max-w-5xl mx-auto bg-white/95 border border-[#E8E4DC] text-stone-900 backdrop-blur-md rounded-full shadow-md px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 pl-2 cursor-pointer" onClick={() => onSelectPage('home')}>
          <div className="bg-stone-900 text-stone-50 font-mono text-xs tracking-widest px-2.5 py-1 rounded-md uppercase shadow-xs">
            SUPERDOCS
          </div>
          <span className="font-serif text-sm font-semibold tracking-tight hidden md:inline text-stone-900">
            Talent Auditor
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#E8E4DC] p-1 rounded-full overflow-x-auto">
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? 'text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-white border border-[#E8E4DC] shadow-xs rounded-full"
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

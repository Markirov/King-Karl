import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '@/lib/navigation';
import { useAppStore } from '@/lib/store';
import { VERSION_DISPLAY } from '@/version';

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, setSimuladorPortada, setBarraconesPortada } = useAppStore();

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[149] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 bottom-0 w-[220px] bg-surface-dim
          border-r border-surface-container-highest
          flex flex-col gap-0.5 p-3 overflow-y-auto z-[150]
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <Link
          to="/portada"
          onClick={() => setSidebarOpen(false)}
          className="block px-3 pt-2 pb-4 border-b border-outline-variant mb-2 no-underline group"
        >
          <div className="font-headline text-[16px] font-bold text-primary-container tracking-wider uppercase leading-tight group-hover:opacity-70 transition-opacity">
            King Karl's Kürassiers
          </div>
          <div className="font-mono text-[9px] text-outline tracking-[2px] uppercase mt-1">
            Unidad Mercenaria
          </div>
        </Link>

        {/* Nav sections */}
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="font-headline text-[9px] text-outline tracking-[2px] uppercase px-2 pt-3 pb-1 select-none">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    setSidebarOpen(false);
                    if (item.id === 'simulador')   setSimuladorPortada(true);
                    if (item.id === 'barracones')  setBarraconesPortada(true);
                  }}
                  className={`
                    flex items-center gap-2.5 w-full px-3.5 py-2.5
                    font-headline text-[12px] tracking-wider uppercase
                    border-l-[3px] transition-all duration-200
                    no-underline
                    ${isActive
                      ? 'bg-primary-container/12 border-l-primary-container text-primary-container'
                      : 'border-l-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-primary-container'
                    }
                  `}
                >
                  <span className="text-[16px] w-5 text-center flex-shrink-0">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Footer */}
        <div className="mt-auto pt-4 px-3 border-t border-outline-variant">
          <div className="font-mono text-[8px] text-outline-variant tracking-wider">
            Comision Mercenaria · {VERSION_DISPLAY}
          </div>
        </div>
      </aside>
    </>
  );
}

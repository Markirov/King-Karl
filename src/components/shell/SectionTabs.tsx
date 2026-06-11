import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface SectionTabsProps {
  tabs: { id: string; label: string }[];
}

export const SUBTAB_RIGHT_SLOT_ID = 'subtab-right-slot';

export function SectionTabs({ tabs }: SectionTabsProps) {
  const { activeSubTab, setActiveSubTab } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);

  // Reporta su altura real a una CSS variable para que main ajuste padding-top.
  // Soporta wrap a 2 filas en tablet portrait.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty('--tabs-h', `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--tabs-h');
    };
  }, []);

  return (
    <div
      ref={ref}
      className="
        fixed top-12 left-0 2xl:left-[220px] right-0 min-h-10
        bg-background/[0.98] border-b border-primary-container/10
        flex items-stretch gap-0 flex-wrap pl-2 sm:pl-5 pr-2 sm:pr-3 z-[98]
        backdrop-blur-lg
      "
    >
      {tabs.map((tab) => {
        const isActive = activeSubTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`
              px-2 sm:px-4 font-headline text-[10px] sm:text-[11px] font-bold uppercase tracking-[1.5px] sm:tracking-[2px]
              border-b-2 transition-all duration-200 bg-transparent shrink-0
              ${isActive
                ? 'text-[var(--p,theme(colors.primary-container))] border-b-[var(--p,theme(colors.primary-container))]'
                : 'text-outline border-b-transparent hover:text-primary-container/70 hover:bg-primary-container/5'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
      {/* Right slot: pages can portal extra controls here (search / slots / sync).
          flex-wrap permite que controles internos pasen a la 2ª fila si no caben. */}
      <div id={SUBTAB_RIGHT_SLOT_ID} className="ml-auto flex items-center gap-2 flex-wrap py-1" />
    </div>
  );
}

import { useAppStore } from '@/lib/store';

interface SectionTabsProps {
  tabs: { id: string; label: string }[];
}

export function SectionTabs({ tabs }: SectionTabsProps) {
  const { activeSubTab, setActiveSubTab } = useAppStore();

  return (
    <div
      className="
        fixed top-12 left-0 lg:left-[220px] right-0 h-10
        bg-background/[0.98] border-b border-primary-container/10
        flex items-stretch gap-0 px-5 z-[98]
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
              px-4 font-headline text-[11px] font-bold uppercase tracking-[2px]
              border-b-2 transition-all duration-200 bg-transparent
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
    </div>
  );
}

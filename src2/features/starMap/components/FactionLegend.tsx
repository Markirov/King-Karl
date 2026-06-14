import type { SystemsDatabase } from '@/features/jumpCalculator/types';
import type { TerritoryBlob } from '../hooks/useTerritories';

interface Props {
  territories: TerritoryBlob[];
  db: SystemsDatabase;
  visible: boolean;
  onToggle: () => void;
}

const UNINHABITED = new Set(['U', 'A', 'I', '']);

export function FactionLegend({ territories, db, visible, onToggle }: Props) {
  // Only show inhabited factions, sorted by system count descending
  const entries = territories
    .filter(t => !UNINHABITED.has(t.faction))
    .sort((a, b) => b.systemCount - a.systemCount)
    .slice(0, 25);

  return (
    <div className="absolute top-3 left-3 flex flex-col gap-0 z-20">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="self-start font-mono text-[9px] border border-outline-variant/30 text-outline/60 hover:text-on-surface-variant hover:border-outline-variant/60 px-2 py-0.5 bg-[#0a0d12]/80 transition-colors backdrop-blur-sm"
      >
        {visible ? '◂ LEYENDA' : '▸ LEYENDA'}
      </button>

      {visible && entries.length > 0 && (
        <div className="bg-[#0a0d12]/85 border border-outline-variant/30 backdrop-blur-sm mt-0.5 w-44 max-h-80 overflow-y-auto">
          {entries.map(t => {
            const name = db.factions[t.faction]?.name ?? t.faction;
            return (
              <div key={t.faction} className="flex items-center gap-2 px-2 py-0.5 hover:bg-white/5">
                <span
                  className="w-2 h-2 flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="font-mono text-[8px] text-on-surface-variant/80 flex-1 truncate" title={name}>
                  {name}
                </span>
                <span className="font-mono text-[8px] text-outline/50 flex-shrink-0">
                  {t.systemCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

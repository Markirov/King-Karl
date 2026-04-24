import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { StarMap } from '@/features/starMap/StarMap';
import { SUCS_YEARS } from '@/features/starMap/constants';
import { useStarSystems } from '@/features/jumpCalculator/hooks/useStarSystems';
import type { StarSystem } from '@/features/jumpCalculator/types';

function closestSucsYear(campaignYear: number): number {
  let best: number = SUCS_YEARS[0];
  let bestDist = Infinity;
  for (const y of SUCS_YEARS) {
    const d = Math.abs(y - campaignYear);
    if (d < bestDist) { bestDist = d; best = y; }
  }
  return best;
}

// ── Inline system search ─────────────────────────────────────────────────────
function SystemSearch({
  systems,
  onSelect,
}: {
  systems: StarSystem[];
  onSelect: (s: StarSystem) => void;
}) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return systems
      .filter(s => s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const ai = a.name.toLowerCase().indexOf(q);
        const bi = b.name.toLowerCase().indexOf(q);
        return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }, [systems, query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar sistema…"
        className="font-mono text-[10px] bg-transparent border border-outline-variant/30 text-on-surface-variant placeholder:text-outline/35 px-2.5 py-1 w-52 focus:outline-none focus:border-primary-container/50 transition-colors"
      />
      {open && results.length > 0 && (
        <div className="absolute right-0 top-full mt-0.5 w-64 bg-[#0e1318] border border-outline-variant/30 z-50 max-h-52 overflow-y-auto">
          {results.map(s => (
            <button
              key={s.id}
              onMouseDown={() => { onSelect(s); setQuery(s.name); setOpen(false); }}
              className="w-full text-left font-mono text-[10px] px-3 py-1.5 text-on-surface-variant/80 hover:bg-primary-container/10 hover:text-on-surface transition-colors flex items-baseline gap-2"
            >
              <span className="flex-1">{s.name}</span>
              <span className="text-[8px] text-outline/40 flex-shrink-0">
                {s.x.toFixed(0)}, {s.y.toFixed(0)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function MapaEstelarPage() {
  const { campaign }  = useAppStore();
  const { db }        = useStarSystems();
  const defaultYear   = closestSucsYear(campaign.campaignYear);

  const [focusSystem, setFocusSystem] = useState<StarSystem | null>(null);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-outline-variant/20 flex-shrink-0">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase">
          Mapa Estelar — Esfera Interior
        </h1>

        {db && (
          <SystemSearch
            systems={db.systems}
            onSelect={s => setFocusSystem(s)}
          />
        )}
      </div>

      {/* Dynamic map */}
      <div className="flex-1 min-h-0">
        <StarMap
          defaultYear={defaultYear}
          focusSystem={focusSystem}
        />
      </div>
    </div>
  );
}

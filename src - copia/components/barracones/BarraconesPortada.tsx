import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Pilot } from '@/lib/barracones-types';
import { pilotSlug } from '@/lib/roster';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

const LANCE_FALLBACK = 'Sin lanza';

/** Altura de referencia en metros para scale 1.0 */
const BASE_HEIGHT_M = 1.80;
/** Ancho base del piloto al 100% de escala (Joan = referencia) */
const BASE_PILOT_WIDTH = 80;

interface PlayerDef {
  name:    string;
  display: string;
  color:   string;
  slug:    string;
}

// Colores cíclicos (se asignan por orden roster)
const PLAYER_COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#34d399', '#fb923c', '#a78bfa'] as const;
const PILOT_SCALE: Record<string, number> = {
  zhao: 0.84,
  erik: 0.18,
};
/** Aspect ratio override (height / width). Para PNGs con framing distinto al cuadrado. */
const PILOT_ASPECT: Record<string, number> = {
  erik: 710 / 351,
};
const PILOT_BOTTOM: Record<string, string> = {
  erik: '-10px',
};

function mechChassis(mechName: string): string {
  return mechName.trim().toLowerCase().split(/\s+/)[0];
}

const MECH_WIDTH: Record<string, string> = {
  catapult: '65%',
};

function parseAltura(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  if (isNaN(n)) return 0;
  return n > 10 ? n / 100 : n;
}

function scalePercent(pct: string, factor: number): string {
  const n = parseFloat(pct.replace('%', ''));
  if (isNaN(n)) return pct;
  return `${Math.round(n * factor)}%`;
}

function pilotWidth(pilot: Pilot | null, name: string): string {
  const h = parseAltura(pilot?.altura ?? '');
  const scale = h > 0 ? h / BASE_HEIGHT_M : 1;
  const slug = pilotSlug(name);
  const tune = PILOT_SCALE[slug] ?? 1;
  const width = Math.round(BASE_PILOT_WIDTH * scale * tune);
  const aspect = PILOT_ASPECT[slug] ?? 1;
  const min = 56 / aspect;
  const max = 104 / aspect;
  return `${Math.max(min, Math.min(width, max))}%`;
}

/** Agrupa por lanza preservando orden de aparición y filas dentro de cada grupo */
function groupByLanza<T extends { lanza: string }>(arr: T[]): { name: string; items: T[] }[] {
  const order: string[] = [];
  const groups: Record<string, T[]> = {};
  for (const item of arr) {
    const key = item.lanza?.trim() || LANCE_FALLBACK;
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(item);
  }
  return order.map(name => ({ name, items: groups[name] }));
}

interface Props {
  onSelect:   (name: string) => void;
  pilotSlots: (Pilot | null)[];
}

export function BarraconesPortada({ onSelect, pilotSlots }: Props) {
  const { roster } = useAppStore();

  // Agrupa roster por col V "Lanza" preservando orden sheet
  // Cada item lleva su slot index original para mapear a pilotSlots
  const indexed = roster.map((r, idx) => ({ ...r, _idx: idx }));
  const groups = groupByLanza(indexed);

  const [page, setPage] = useState(0);
  const hasMultipleLances = groups.length > 1;
  const safePage = Math.min(Math.max(0, page), Math.max(0, groups.length - 1));

  const currentGroup = groups[safePage];
  const currentItems = currentGroup?.items ?? [];
  const currentLanceName = currentGroup?.name ?? '—';

  // Build PlayerDef + slot lookup per pilot del grupo actual
  const currentLance: PlayerDef[] = currentItems.map((r, i) => {
    const displayName = (r.nombreDisplay || r.apodo || r.nombre || r.jugador).trim();
    // Color global por posición en roster total (no por lanza) para evitar repetidos
    const globalIdx = r._idx;
    return {
      name:    r.jugador,
      display: displayName.toUpperCase(),
      color:   PLAYER_COLORS[globalIdx % PLAYER_COLORS.length],
      slug:    pilotSlug(r.jugador),
      _i: i,
    } as PlayerDef & { _i: number };
  });
  const currentRoster = currentItems;
  const currentSlots  = currentItems.map(r => pilotSlots[r._idx] ?? null);

  return (
    <div className="flex flex-col items-center" style={{ minHeight: '80vh' }}>
      {/* Header con título lanza + navegación */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={safePage === 0}
          className="flex items-center justify-center w-9 h-9 border border-primary-container/30 text-primary-container hover:bg-primary-container/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          aria-label="Lanza anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center flex-1">
          <div className="font-mono text-[9px] text-outline tracking-[3px] uppercase">
            {hasMultipleLances ? `${safePage + 1} / ${groups.length}` : 'Lanza'}
          </div>
          <div className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mt-0.5">
            Lanza · {currentLanceName}
          </div>
        </div>

        <button
          onClick={() => setPage(p => Math.min(groups.length - 1, p + 1))}
          disabled={safePage >= groups.length - 1}
          className="flex items-center justify-center w-9 h-9 border border-primary-container/30 text-primary-container hover:bg-primary-container/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          aria-label="Siguiente lanza"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid 2x2 de la lanza actual */}
      <div
        className="w-full max-w-4xl grid grid-cols-2 gap-4"
        style={{ height: '72vh' }}
      >
        {currentLance.map((p, i) => {
          const mechName    = currentRoster[i]?.mech ?? '';
          const chassis     = mechName ? mechChassis(mechName) : '';
          const pilotImg    = `${BASE}pilot-${p.slug}.png`;
          const mechImg     = chassis ? `${BASE}mech-${chassis}.png` : null;
          const mechImgW    = scalePercent(MECH_WIDTH[chassis] ?? '36%', 1);
          const hasLayers   = !!mechImg;
          const slug = p.slug;
          const imgWidth  = pilotWidth(currentSlots[i] ?? null, p.slug);
          const pilotBottom = PILOT_BOTTOM[slug] ?? '0px';

          return (
            <button
              key={`${safePage}-${p.name}`}
              onClick={() => onSelect(p.name)}
              className="relative flex flex-col items-end justify-end border-2 transition-all duration-200 group overflow-hidden clip-chamfer"
              style={{
                borderColor: `${p.color}30`,
                background: hasLayers
                  ? '#10141a'
                  : `radial-gradient(ellipse at 50% 80%, ${p.color}08 0%, transparent 70%)`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${p.color}80`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${p.color}30`; }}
            >
              {hasLayers && (
                <img src={`${BASE}hangar-default.png`} alt="" aria-hidden
                  className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                />
              )}

              {mechImg && (
                <img src={mechImg} alt="" aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    width: mechImgW,
                    height: 'auto',
                    maxHeight: '65%',
                    bottom: '90px',
                    left: '70%',
                    transform: 'translateX(-50%)',
                    transformOrigin: 'bottom center',
                  }}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src.endsWith('.png')) {
                      el.src = el.src.replace(/\.png$/, '.jpg');
                    } else {
                      el.style.display = 'none';
                    }
                  }}
                />
              )}

              <img src={pilotImg} alt={p.display}
                className="absolute pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
                style={{
                  width: imgWidth,
                  height: 'auto',
                  maxHeight: '88%',
                  bottom: pilotBottom,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  transformOrigin: 'bottom center',
                }}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.src.endsWith('pilot-generic.png')) {
                    el.src = `${BASE}pilot-generic.png`;
                  } else {
                    el.style.display = 'none';
                  }
                }}
              />

              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, #10141a 8%, ${p.color}15 50%, transparent 100%)` }}
              />

              <div className="relative z-10 w-full px-5 pb-5">
                <span
                  className="font-headline text-5xl font-black uppercase tracking-tighter leading-none block drop-shadow-lg"
                  style={{ color: p.color }}
                >
                  {p.display}
                </span>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 z-10 opacity-40 group-hover:opacity-80 transition-opacity"
                style={{ background: p.color }}
              />
            </button>
          );
        })}
      </div>

      {/* Dots de paginación */}
      {hasMultipleLances && (
        <div className="flex items-center gap-2 mt-4">
          {groups.map((g, i) => (
            <button
              key={g.name}
              onClick={() => setPage(i)}
              title={g.name}
              className={`w-2.5 h-2.5 border transition-all ${
                i === safePage
                  ? 'bg-primary-container border-primary-container'
                  : 'border-outline-variant/40 hover:border-primary-container/60'
              }`}
              aria-label={`Lanza ${g.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

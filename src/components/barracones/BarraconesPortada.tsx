import { useAppStore } from '@/lib/store';
import type { Pilot } from '@/lib/barracones-types';

const BASE = import.meta.env.BASE_URL;

/** Altura de referencia en metros para scale 1.0 */
const BASE_HEIGHT_M = 1.80;
/** Ancho base del piloto al 100% de escala */
const BASE_PILOT_WIDTH = 80;

interface PlayerDef {
  name:    string;
  display: string;
  color:   string;
}

const DEFAULT_PLAYERS = ['Marcos', 'Jaime', 'Joan', 'Alex', 'Zhao', 'Erik'] as const;
const PLAYER_COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#34d399'] as const;
const PILOT_SCALE: Record<string, number> = {
  zhao: 0.84,
  erik: 0.18,
};
const PILOT_BOTTOM: Record<string, string> = {
  erik: '-10px',
};

/** "Grasshopper 5H" → "grasshopper" */
function mechChassis(mechName: string): string {
  return mechName.trim().toLowerCase().split(/\s+/)[0];
}

function imageSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ancho CSS del mech por chassis (ajusta si el PNG tiene mucho espacio transparente).
 * Referencia: grasshopper = 36%
 */
const MECH_WIDTH: Record<string, string> = {
  catapult: '65%', // PNG con más padding transparente → sube el %
};

/** "1,88" | "1.88" | "188" → 1.88 (metros) */
function parseAltura(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  if (isNaN(n)) return 0;
  return n > 10 ? n / 100 : n; // si viene en cm, convierte a metros
}

function scalePercent(pct: string, factor: number): string {
  const n = parseFloat(pct.replace('%', ''));
  if (isNaN(n)) return pct;
  return `${Math.round(n * factor)}%`;
}

/** Devuelve el ancho como string CSS porcentual según la altura del piloto */
function pilotWidth(pilot: Pilot | null, name: string, compact: boolean): string {
  const h = parseAltura(pilot?.altura ?? '');
  const scale = h > 0 ? h / BASE_HEIGHT_M : 1;
  const slug = imageSlug(name);
  const tune = PILOT_SCALE[slug] ?? 1;
  const compactFactor = compact ? 0.72 : 1;
  const width = Math.round(BASE_PILOT_WIDTH * scale * tune * compactFactor);
  const min = compact ? 44 : 56;
  const max = compact ? 80 : 104;
  return `${Math.max(min, Math.min(width, max))}%`;
}

interface Props {
  onSelect:   (name: string) => void;
  pilotSlots: (Pilot | null)[];
}

export function BarraconesPortada({ onSelect, pilotSlots }: Props) {
  const { campaign } = useAppStore();
  const players: PlayerDef[] = DEFAULT_PLAYERS.map((fallback, i) => {
    const name = campaign.pilotNames?.[i]?.trim() || fallback;
    return {
      name,
      display: name.toUpperCase(),
      color: PLAYER_COLORS[i] ?? '#9ca3af',
    };
  });
  const pilotMechs = campaign.pilotMechs ?? [];
  const compactMode = players.length > 4;
  const mechBottom = compactMode ? '56px' : '90px';
  const mechLeft = compactMode ? '66%' : '70%';
  const mechScale = compactMode ? 0.75 : 1;

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="grid grid-cols-2 gap-4 w-full max-w-4xl" style={{ height: '80vh' }}>
        {players.map((p, i) => {
          const mechName    = pilotMechs[i] ?? '';
          const chassis     = mechName ? mechChassis(mechName) : '';
          const pilotImg    = `${BASE}pilot-${imageSlug(p.name)}.png`;
          const mechImg     = chassis ? `${BASE}mech-${chassis}.png` : null;
          const mechImgW    = scalePercent(MECH_WIDTH[chassis] ?? '36%', mechScale);
          const hasLayers   = !!mechImg;
          const slug = imageSlug(p.name);
          const imgWidth  = pilotWidth(pilotSlots[i] ?? null, p.name, compactMode);
          const pilotBottom = PILOT_BOTTOM[slug] ?? '0px';

          return (
            <button
              key={p.name}
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
              {/* Layer 1 — Hangar (background) */}
              {hasLayers && (
                <img src={`${BASE}hangar-default.png`} alt="" aria-hidden
                  className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                />
              )}

              {/* Layer 2 — Mech */}
              {mechImg && (
                <img src={mechImg} alt="" aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    width: mechImgW,
                    height: 'auto',
                    bottom: mechBottom,
                    left: mechLeft,
                    transform: 'translateX(-50%)',
                    transformOrigin: 'bottom center',
                  }}
                />
              )}

              {/* Layer 3 — Pilot (width escalado por altura real del personaje) */}
              <img src={pilotImg} alt={p.display}
                className="absolute pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
                style={{
                  width: imgWidth,
                  height: 'auto',
                  bottom: pilotBottom,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  transformOrigin: 'bottom center',
                }}
              />

              {/* Bottom gradient so name is readable */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, #10141a 8%, ${p.color}15 50%, transparent 100%)` }}
              />

              {/* Name */}
              <div className="relative z-10 w-full px-5 pb-5">
                <span
                  className="font-headline text-5xl font-black uppercase tracking-tighter leading-none block drop-shadow-lg"
                  style={{ color: p.color }}
                >
                  {p.display}
                </span>
              </div>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 z-10 opacity-40 group-hover:opacity-80 transition-opacity"
                style={{ background: p.color }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

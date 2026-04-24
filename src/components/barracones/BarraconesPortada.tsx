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

const PLAYERS: PlayerDef[] = [
  { name: 'Marcos',   display: 'MARCOS',   color: '#4ade80' },
  { name: 'Jaime',    display: 'JAIME',    color: '#60a5fa' },
  { name: 'Joan',     display: 'JOAN',     color: '#fbbf24' },
  { name: 'Alex', display: 'ALEX', color: '#c084fc' },
];

/** "Grasshopper 5H" → "grasshopper" */
function mechChassis(mechName: string): string {
  return mechName.trim().toLowerCase().split(/\s+/)[0];
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

/** Devuelve el ancho como string CSS porcentual según la altura del piloto */
function pilotWidth(pilot: Pilot | null): string {
  const h = parseAltura(pilot?.altura ?? '');
  const scale = h > 0 ? h / BASE_HEIGHT_M : 1;
  return `${Math.round(BASE_PILOT_WIDTH * scale)}%`;
}

interface Props {
  onSelect:   (name: string) => void;
  pilotSlots: (Pilot | null)[];
}

export function BarraconesPortada({ onSelect, pilotSlots }: Props) {
  const { campaign } = useAppStore();
  const pilotMechs = campaign.pilotMechs ?? [];

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="grid grid-cols-2 gap-4 w-full max-w-4xl" style={{ height: '80vh' }}>
        {PLAYERS.map((p, i) => {
          const mechName    = pilotMechs[i] ?? '';
          const chassis     = mechName ? mechChassis(mechName) : '';
          const pilotImg    = `${BASE}pilot-${p.name.toLowerCase()}.png`;
          const mechImg     = chassis ? `${BASE}mech-${chassis}.png` : null;
          const mechImgW    = MECH_WIDTH[chassis] ?? '36%';
          const hasLayers   = !!mechImg;
          const imgWidth  = pilotWidth(pilotSlots[i] ?? null);

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
                    bottom: '90px',
                    left: '70%',
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
                  bottom: '0px',
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

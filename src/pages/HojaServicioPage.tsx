// ══════════════════════════════════════════════════════════════
//  HOJA DE SERVICIO · P3 TWO-TONE
//  Reskin: columna oscura ceremonial + 2 hojas de papel claras
//  Lógica intacta: registerMission + registerXPExpense
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getVeterancy } from '@/lib/barracones-data';
import { useAppStore } from '@/lib/store';
import { registerMissionFull, registerXPExpense, commitLibroEntryAndTreasury } from '@/lib/sheets-service';
import { genId, getCampaignDateISO } from '@/pages/FinanzasPage';
import { sendTelegramNotif, getTelegramToggle } from '@/lib/telegram-service';
import { TelegramToggle } from '@/components/ui/TelegramToggle';
import { isActivo } from '@/lib/roster';

// ── Constants ──────────────────────────────────────────────

const DW = 1280;
const DH = 1100;

const C = {
  gold: '#e8c06a', goldHi: '#f5d985', goldDim: '#b08a3a', goldDeep: '#6b4a1a',
  bronze: '#8a6a35', bronzeLo: '#3d2a10',
  cream: '#d8ccb5', creamDim: '#b8a775',
  paper: '#d8c896', paperHi: '#eadfb8', paperShade: '#a89060',
  ink: '#1a1208', inkSoft: '#3d2a14',
  red: '#a13a2b', redDeep: '#6b1f15',
  green: '#3d6b3a', greenDeep: '#1f4a1c',
  void: '#0a0d12', void2: '#10141a',
  line2: '#3a2a14',
};

const ACCENT_COLORS = ['#a13a2b', '#3a5fa1', '#a18a3a', '#7a3aa1', '#3a7a4a', '#a13a7a', '#7a5a3a', '#3a9aa1'] as const;

const ROMAN_NUMS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

const REROLL_CONFIG: Record<string, { max: number; cost: number }> = {
  Novato:   { max: 1, cost: 100  },
  Regular:  { max: 2, cost: 200  },
  Veterano: { max: 3, cost: 300  },
  Elite:    { max: 4, cost: 1000 },
  As:       { max: 5, cost: 6000 },
};

const LS_KEY = 'kk_hoja_xp_from_hud';

// ── Types ──────────────────────────────────────────────────

interface PlayerRow {
  name:         string;     // handle jugador (ej. "Marcos") — key para registerMission
  nombre:       string;     // nombre del personaje (ej. "Dayffid Guffrudd")
  callsign:     string;     // apodo (ej. "Castigador")
  accent:       string;     // color acento de la fila
  xpTotal:      number;
  xpDisponible: number;
  nivel:        string;
  xpGanado:     number;
  chequeos:     number;
  rerolls:      number;
  loading:      boolean;
}

// ── Helpers ────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('de-DE');

function calcSpent(p: PlayerRow): number {
  const rc = REROLL_CONFIG[p.nivel] ?? REROLL_CONFIG.Novato;
  return p.rerolls * rc.cost;
}

// ── Mission Medallion ──────────────────────────────────────

function MissionMedallion({ ringText }: { ringText: string }) {
  return (
    <div style={{ position: 'relative', width: 280, height: 280, flexShrink: 0 }}>
      {/* Disco oscuro central — la "ventana" donde vive la rosa */}
      <div style={{
        position: 'absolute', top: 50, left: 50, width: 180, height: 180,
        borderRadius: '50%',
        clipPath: 'circle(50%)',
        background: `radial-gradient(circle at 35% 30%, #f0d48a44 0%, transparent 55%), linear-gradient(180deg, #1c1610, ${C.void})`,
        boxShadow: `inset 0 0 30px ${C.void}`,
        zIndex: 1,
      }} />

      {/* Rosa de los vientos */}
      <div style={{
        position: 'absolute', top: 80, left: 80, width: 120, height: 120,
        display: 'grid', placeItems: 'center', zIndex: 2,
      }}>
        <svg viewBox="0 0 100 100" width="120" height="120">
          <g stroke={C.gold} strokeWidth="1.2" fill="none">
            <line x1="50" y1="8" x2="50" y2="92" />
            <line x1="8" y1="50" x2="92" y2="50" />
            <line x1="20" y1="20" x2="80" y2="80" opacity="0.6" />
            <line x1="80" y1="20" x2="20" y2="80" opacity="0.6" />
          </g>
          <g fill={C.goldHi} opacity="0.9">
            <polygon points="50,8 53,42 50,46 47,42" />
            <polygon points="50,92 53,58 50,54 47,58" />
            <polygon points="8,50 42,53 46,50 42,47" />
            <polygon points="92,50 58,53 54,50 58,47" />
          </g>
          <circle cx="50" cy="50" r="32" fill="none" stroke={C.gold} strokeWidth="0.4" opacity="0.6" />
          <circle cx="50" cy="50" r="22" fill="none" stroke={C.gold} strokeWidth="0.4" opacity="0.6" />
          <text x="50" y="20" textAnchor="middle" style={{ font: 'bold 8px "Share Tech Mono", monospace' }} fill={C.goldHi}>N</text>
          <circle cx="50" cy="50" r="3" fill={C.gold} />
        </svg>
      </div>

      {/* Medallón completo: anillo bronce + texto + aro interior */}
      <svg viewBox="0 0 280 280" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id="bronzeRG" cx="40%" cy="35%">
            <stop offset="0%"  stopColor="#f0d48a" />
            <stop offset="40%" stopColor="#b08a3a" />
            <stop offset="100%" stopColor="#4a320e" />
          </radialGradient>
          <path id="ring2t" d="M 140 140 m -98 0 a 98 98 0 1 1 196 0 a 98 98 0 1 1 -196 0" />
        </defs>

        {/* Bordes exteriores */}
        <circle cx="140" cy="140" r="138" fill="none" stroke={C.goldDeep} strokeWidth="1.5" />
        <circle cx="140" cy="140" r="128" fill="none" stroke={C.gold} strokeWidth="0.5" opacity="0.6" />

        {/* Anillo bronce con hueco (r ext 112, r int 90) */}
        <path
          d="M 28 140 a 112 112 0 1 0 224 0 a 112 112 0 1 0 -224 0 Z
             M 50 140 a 90 90 0 1 0 180 0 a 90 90 0 1 0 -180 0 Z"
          fill="url(#bronzeRG)"
          fillRule="evenodd"
        />

        {/* Línea punteada en el borde exterior del anillo */}
        <circle cx="140" cy="140" r="112" fill="none" stroke={C.gold} strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />

        {/* Aro dorado fino en el borde interior del anillo */}
        <circle cx="140" cy="140" r="90" fill="none" stroke={C.gold} strokeWidth="2.5" opacity="0.95" />
        <circle cx="140" cy="140" r="93" fill="none" stroke={C.goldDeep} strokeWidth="0.6" />

        {/* Tick marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <line key={a} x1="140" y1="20" x2="140" y2="32"
                transform={`rotate(${a} 140 140)`} stroke={C.gold} strokeWidth="1.4" />
        ))}

        {/* Texto curvo */}
        <text style={{ font: '11px "Cormorant Garamond", serif', fill: C.gold, letterSpacing: 5, fontStyle: 'italic' }}>
          <textPath href="#ring2t" startOffset="0">{ringText}</textPath>
        </text>
      </svg>
    </div>
  );
}

function VisadoStamp({ size = 110, label = 'VISADO', sub = 'FAFS', tilt = -10, color = C.greenDeep }) {
  return (
    <div style={{ width: size, height: size, transform: `rotate(${tilt}deg)`, pointerEvents: 'none', opacity: 0.85 }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <pattern id={`hatch-3t-${label}`} patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={color} strokeWidth="0.4" opacity="0.4" />
          </pattern>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="2.5" />
        <circle cx="50" cy="50" r="40" fill={`url(#hatch-3t-${label})`} />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="0.8" />
        <text x="50" y="44" textAnchor="middle" style={{ font: 'bold 11px "Share Tech Mono", monospace', letterSpacing: 1 }} fill={color}>{label}</text>
        <text x="50" y="55" textAnchor="middle" style={{ font: '7px "Share Tech Mono", monospace', letterSpacing: 0.5 }} fill={color}>· {sub} ·</text>
        <text x="50" y="68" textAnchor="middle" style={{ font: 'italic 7px "Cormorant Garamond", serif' }} fill={color}>MMMXXVI</text>
      </svg>
    </div>
  );
}

// ── Paper Sheet + Clip ─────────────────────────────────────

function Clip({ x = '50%' }: { x?: string }) {
  return (
    <div style={{
      position: 'absolute', top: -16, left: x, transform: 'translateX(-50%)',
      width: 44, height: 32, zIndex: 3,
    }}>
      <svg viewBox="0 0 44 32" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.5))' }}>
        <defs>
          <linearGradient id={`clipg-${x}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4d4d4" />
            <stop offset="50%" stopColor="#888" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>
        </defs>
        <path d="M 5 8 Q 5 2 10 2 L 34 2 Q 39 2 39 8 L 39 28 Q 39 30 37 30 L 7 30 Q 5 30 5 28 Z"
              fill={`url(#clipg-${x})`} stroke="#2a2a2a" strokeWidth="0.5" />
        <rect x="11" y="10" width="22" height="3" fill="#2a2a2a" opacity="0.55" />
        <rect x="11" y="18" width="22" height="3" fill="#2a2a2a" opacity="0.55" />
      </svg>
    </div>
  );
}

interface PaperSheetProps {
  x: number; y: number; w: number; h?: number;
  tilt?: number; clips?: string[];
  children: React.ReactNode;
}
function PaperSheet({ x, y, w, h, tilt = 0, clips = [], children }: PaperSheetProps) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w,
      ...(h ? { height: h } : {}),
      transform: `rotate(${tilt}deg)`, transformOrigin: 'center top',
      background: C.paper,
      backgroundImage: `
        radial-gradient(circle at 12% 18%, ${C.goldDeep}22 0%, transparent 14%),
        radial-gradient(circle at 88% 82%, ${C.goldDeep}22 0%, transparent 14%),
        radial-gradient(circle at 70% 25%, ${C.goldDeep}1a 0%, transparent 8%),
        linear-gradient(${C.ink}11 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 32px 32px',
      color: C.ink,
      padding: '24px 22px 18px',
      boxShadow: `3px 5px 0 rgba(0,0,0,0.45), 0 14px 28px rgba(0,0,0,0.55), inset 0 0 50px ${C.goldDeep}22`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {clips.map((cx, i) => <Clip key={i} x={cx} />)}
      {children}
    </div>
  );
}

function SheetHeader({ num, title, tail }: { num?: string; title: string; tail?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 4, marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        {num && <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 3, color: C.goldDeep }}>§ {num}</span>}
        <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontStyle: 'italic', color: C.redDeep, fontWeight: 700, letterSpacing: 1 }}>
          {title}
        </span>
      </div>
      {tail && <span style={{ fontFamily: '"Special Elite", monospace', fontSize: 10, color: C.goldDeep, fontStyle: 'italic' }}>{tail}</span>}
    </div>
  );
}

// ── Pilot Row (en hoja izq) ────────────────────────────────

interface PaperPilotRowProps {
  player: PlayerRow;
  index:  number;
  isLast: boolean;
  onUpdate: (idx: number, patch: Partial<PlayerRow>) => void;
}
function PaperPilotRow({ player, index, isLast, onUpdate }: PaperPilotRowProps) {
  const rc = REROLL_CONFIG[player.nivel] ?? REROLL_CONFIG.Novato;
  const spent = calcSpent(player);
  const sessionNet = player.xpGanado + player.chequeos - spent;
  const xpFinal = sessionNet >= 0 ? player.xpTotal + sessionNet : player.xpTotal;
  const accent = player.accent;

  const inputBase: React.CSSProperties = {
    background: C.paperHi + 'cc',
    border: `1px solid ${C.goldDeep}66`,
    color: C.ink,
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: 18, fontStyle: 'italic', fontWeight: 700,
    textAlign: 'right', padding: '0 8px', outline: 'none',
    height: 32, minWidth: 0,
  };

  function handleReroll(target: number) {
    // Toggle off si pulsa el último activo, si no fija al target.
    // Sin gate de presupuesto — registrador decide si pasa o no.
    const next = target === player.rerolls ? target - 1 : target;
    onUpdate(index, { rerolls: Math.max(0, next) });
  }

  return (
    <div style={{
      padding: '16px 0 18px',
      borderBottom: !isLast ? `1px dashed ${C.ink}55` : 'none',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: -22, top: 14, bottom: 14, width: 4,
        background: accent, opacity: 0.85,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 2, color: C.goldDeep }}>
          § {ROMAN_NUMS[index]}
        </span>
        <span style={{
          fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontStyle: 'italic',
          fontWeight: 700, color: C.redDeep, lineHeight: 1,
        }}>
          {player.nombre || player.name}
        </span>
        <span style={{ fontSize: 10, color: C.inkSoft, fontStyle: 'italic', fontFamily: '"Special Elite", monospace' }}>
          «{player.callsign || '—'}» · {player.nivel}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: C.goldDeep }}>
          EXP <span style={{ color: C.ink }}>{fmt(player.xpTotal)}</span>
          <span style={{ margin: '0 5px', color: C.goldDim }}>·</span>
          DISP <span style={{ color: C.greenDeep }}>{fmt(player.xpDisponible)}</span>
        </span>
      </div>

      {/* Inputs grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.6fr 78px 1.3fr 1.1fr',
        gap: 8, alignItems: 'stretch',
      }}>
        {/* XP misión */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', marginBottom: 2 }}>MISIÓN XP</div>
          <input type="number" min={0}
            value={player.xpGanado || ''}
            placeholder="0"
            onFocus={e => e.target.select()}
            onChange={e => onUpdate(index, { xpGanado: Math.max(0, parseInt(e.target.value) || 0) })}
            style={{ ...inputBase, width: '100%', color: C.greenDeep, marginTop: 'auto' }} />
        </div>

        {/* Chequeos ±100 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', marginBottom: 2 }}>CHEQUEOS</div>
          <div style={{ display: 'flex', gap: 2, marginTop: 'auto' }}>
            <button onClick={() => onUpdate(index, { chequeos: player.chequeos - 100 })} style={{
              width: 22, height: 32, padding: 0, border: `1px solid ${C.goldDeep}66`,
              background: C.paperHi + '88', color: C.redDeep, fontFamily: '"Share Tech Mono", monospace',
              fontSize: 14, lineHeight: 1, cursor: 'pointer',
            }}>−</button>
            <input type="number"
              value={player.chequeos || ''}
              placeholder="0"
              onFocus={e => e.target.select()}
              onChange={e => onUpdate(index, { chequeos: parseInt(e.target.value) || 0 })}
              style={{
                ...inputBase, flex: 1, minWidth: 0,
                color: player.chequeos > 0 ? C.greenDeep : player.chequeos < 0 ? C.redDeep : C.ink,
              }} />
            <button onClick={() => onUpdate(index, { chequeos: player.chequeos + 100 })} style={{
              width: 22, height: 32, padding: 0, border: `1px solid ${C.goldDeep}66`,
              background: C.paperHi + '88', color: C.greenDeep, fontFamily: '"Share Tech Mono", monospace',
              fontSize: 14, lineHeight: 1, cursor: 'pointer',
            }}>+</button>
          </div>
        </div>

        {/* Repetir tirada */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: 8, letterSpacing: 2, color: C.goldDeep,
            fontFamily: '"Share Tech Mono", monospace',
            marginBottom: 2, display: 'flex', justifyContent: 'space-between',
          }}>
            <span>REPETIR T.</span>
            <span style={{ color: C.goldDim }}>{rc.cost}/c</span>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 'auto' }}>
            {Array.from({ length: rc.max }).map((_, ri) => {
              const active = ri < player.rerolls;
              return (
                <button key={ri} onClick={() => handleReroll(ri + 1)} style={{
                  flex: 1, height: 32, padding: 0,
                  border: `1.5px solid ${active ? C.redDeep : C.goldDeep + '88'}`,
                  background: active ? `${C.redDeep}33` : C.paperHi + '66',
                  color: active ? C.redDeep : C.goldDeep + 'aa',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  cursor: 'pointer',
                  transform: active ? `rotate(${(ri % 2 ? 1 : -1)}deg)` : 'none',
                }}>R{ri + 1}</button>
              );
            })}
          </div>
        </div>

        {/* Resultado sesión + final */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', marginBottom: 2 }}>
            SESIÓN → FINAL
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", serif', fontSize: 20, fontStyle: 'italic', fontWeight: 700,
              color: sessionNet > 0 ? C.greenDeep : sessionNet < 0 ? C.redDeep : C.ink,
              lineHeight: 1,
            }}>
              {sessionNet > 0 ? '+' : ''}{fmt(sessionNet)}
            </div>
            <div style={{
              fontFamily: '"Special Elite", monospace', fontSize: 11, color: C.inkSoft, marginTop: 2,
            }}>
              → <span style={{ color: C.ink, fontWeight: 700 }}>{fmt(xpFinal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tesorería row helper ───────────────────────────────────

interface TesRowProps {
  label: string; sign: string;
  value: number; onChange: (v: number) => void;
  color: string;
}
function TesRow({ label, sign, value, onChange, color }: TesRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: `1px dotted ${C.ink}55` }}>
      <div style={{
        flex: 1, fontFamily: '"Special Elite", monospace', fontSize: 11, color: C.ink,
        textTransform: 'uppercase', letterSpacing: 0.6,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>
      <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 14, color, width: 12, textAlign: 'center' }}>{sign}</span>
      <input type="number" min={0}
        value={value || ''}
        placeholder="0"
        onFocus={e => e.target.select()}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          width: 100, height: 26,
          background: C.paperHi, border: `1px solid ${C.goldDeep}66`, color,
          fontFamily: '"Cormorant Garamond", serif', fontSize: 16, fontStyle: 'italic', fontWeight: 700,
          textAlign: 'right', padding: '0 4px', outline: 'none',
        }} />
      <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 14, color, width: 12, textAlign: 'center' }}>₡</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export function HojaServicioPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const location = useLocation();

  const { roster, rosterLoading, campaign } = useAppStore();

  // Pilotos PC activos (no PNJ). Configuracion.PC_JUGADORES filtra; si vacía → todos activos.
  const pcSet = new Set((campaign.pcJugadores ?? []).map(s => s.toLowerCase()));
  const activos = roster.filter(r => {
    if (!isActivo(r)) return false;
    if (pcSet.size === 0) return true;        // sin filtro = todos
    return pcSet.has(r.jugador.toLowerCase());
  });

  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const [missionType, setMissionType] = useState('Sortie de combate');
  const [duration]                    = useState('24:00:00');
  const [pago, setPago]               = useState(0);
  const [salvamento, setSalvamento]   = useState(0);
  const [extrasHaber, setExtrasHaber] = useState(0);
  const [reparacion, setReparacion]   = useState(0);
  const [municion, setMunicion]       = useState(0);
  const [blindaje, setBlindaje]       = useState(0);
  const [extrasDebe, setExtrasDebe]   = useState(0);

  const [meta, setMeta] = useState({
    missionId: 'FS-OPS-3026-04',
    fecha:     '14 · IV · MMMXXVI',
    codUnidad: 'KKK · 1ª Lanza',
    oficial:   'Cdor. T. Holst',
  });

  const [status, setStatus]       = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // Scale fit
  useEffect(() => {
    const update = () => {
      if (!wrapRef.current?.parentElement) return;
      const w = wrapRef.current.parentElement.clientWidth;
      const h = window.innerHeight - 80;
      setScale(Math.min(1, w / DW, h / DH));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Construir players desde roster (fuente única) + parche HUD
  useEffect(() => {
    if (rosterLoading) return;
    let hudXP: number[] | null = null;
    let hudGastos: { rerolls: number; chequeos?: number }[] | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { hudXP = JSON.parse(raw); localStorage.removeItem(LS_KEY); }
      const rawG = localStorage.getItem('kk_hoja_gastos_from_hud');
      if (rawG) { hudGastos = JSON.parse(rawG); localStorage.removeItem('kk_hoja_gastos_from_hud'); }
    } catch { /* ignore */ }

    setPlayers(prev => activos.map((r, i) => {
      const hg = hudGastos?.[i];
      const existing = prev.find(p => p.name === r.jugador);
      // Si HUD trajo datos, sobrescribe. Si no, preserva valores en edición.
      const xpGanado = hudXP != null
        ? (hudXP[i] ?? 0)
        : (existing?.xpGanado ?? 0);
      const chequeos = hudGastos != null
        ? (hg?.chequeos ?? 0)
        : (existing?.chequeos ?? 0);
      const rerolls = hudGastos != null
        ? (hg?.rerolls ?? 0)
        : (existing?.rerolls ?? 0);
      return {
        name:         r.jugador,
        nombre:       r.nombre || r.jugador,
        callsign:     r.apodo,
        accent:       ACCENT_COLORS[i % ACCENT_COLORS.length],
        xpTotal:      r.xpTotal,
        xpDisponible: r.xpDisponible,
        nivel:        getVeterancy(r.xpTotal).nombre,
        xpGanado,
        chequeos,
        rerolls,
        loading:      false,
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, rosterLoading, location.key]);

  const upd = useCallback((idx: number, patch: Partial<PlayerRow>) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }, []);

  // Computed
  const totalSquadXp = players.reduce((s, p) => s + (p.xpGanado + p.chequeos - calcSpent(p)), 0);
  const totalHaber   = pago + salvamento + extrasHaber;
  const totalDebe    = reparacion + municion + blindaje + extrasDebe;
  const balance      = totalHaber - totalDebe;
  const totalRerolls = players.reduce((s, p) => s + p.rerolls, 0);
  const ringText     = '· COMISIÓN DE REVISIÓN · INFORME DE OPERACIONES · ANNO MMMXXVI ·';

  // ── Comentario al pie del Libro de Bitácora ──
  // PJ con más XP en la partida + 1 PNJ aleatorio del resto del roster.
  // rerollSeed permite forzar re-roll del PNJ desde el botón Σ.
  const [rerollSeed, setRerollSeed] = useState(0);

  const topXpPlayer = useMemo(() => {
    if (players.length === 0) return null;
    return [...players]
      .map(p => ({ ...p, _xpNet: p.xpGanado + p.chequeos - calcSpent(p) }))
      .sort((a, b) => b._xpNet - a._xpNet)[0];
  }, [players]);

  // PNJ pool: roster activos NO en PC_JUGADORES
  const pnjPool = useMemo(() => {
    if (pcSet.size === 0) return []; // sin filtro PC → no se distingue PNJ
    return roster.filter(r => isActivo(r) && !pcSet.has(r.jugador.toLowerCase()));
  }, [roster, pcSet]);

  const companionPnj = useMemo(() => {
    if (pnjPool.length === 0) return null;
    return pnjPool[Math.floor(Math.random() * pnjPool.length)];
    // rerollSeed en deps fuerza nueva selección
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnjPool, topXpPlayer?.name, rerollSeed]);

  const bitacoraNote = (() => {
    if (!topXpPlayer) return null;
    const a = topXpPlayer.callsign || topXpPlayer.nombre || '—';
    if (!companionPnj) return `"${a} sigue al frente — felicitar"`;
    const b = companionPnj.apodo || companionPnj.nombre || companionPnj.jugador || '—';
    return `"${a} y ${b} siguen al frente — felicitar"`;
  })();

  // Register: envío granular para reflejo milimétrico en Sheets.
  // Apps Script `appendRegistroRow` matchea cada campo contra headers
  // row 1 de "Respuestas de formulario 1". Para nuevas columnas basta
  // añadir el header — el backend las recoge sin tocar código.
  const handleRegister = async () => {
    const xpMap:       Record<string, number> = {};
    const chequeosMap: Record<string, number> = {};
    const rerollsMap:  Record<string, number> = {};
    players.forEach(p => {
      xpMap[p.name]       = p.xpGanado;
      chequeosMap[p.name] = p.chequeos;
      rerollsMap[p.name]  = p.rerolls;
    });

    const hasAnything = players.some(p =>
                          p.xpGanado > 0 || p.chequeos > 0 || p.rerolls > 0 || calcSpent(p) > 0
                        ) || totalHaber > 0 || totalDebe > 0;
    if (!hasAnything) { setStatus('error'); setStatusMsg('Nada que registrar'); return; }

    setStatus('loading');
    setStatusMsg('Registrando misión…');

    try {
      const res = await registerMissionFull({
        missionId:    meta.missionId,
        fecha:        meta.fecha,
        codUnidad:    meta.codUnidad,
        oficial:      meta.oficial,
        missionType,
        duration,
        xpMap, chequeosMap, rerollsMap,
        pago, salvamento, extrasHaber,
        reparacion, municion, blindaje, extrasDebe,
        totalHaber, totalDebe, balance,
        bitacoraNote: bitacoraNote ?? '',
      });
      if (!res.success) throw new Error(res.error ?? 'Error de red');

      for (const p of players) {
        const spent = calcSpent(p);
        if (spent > 0 && p.rerolls > 0) {
          const rc = REROLL_CONFIG[p.nivel] ?? REROLL_CONFIG.Novato;
          for (let r = 0; r < p.rerolls; r++) {
            await registerXPExpense(p.name, rc.cost, `${p.name}: Repetir Tirada (${p.nivel})`);
          }
        }
      }

      // Derivar todas las lineas monetarias a LibroMayor para que
      // CONTRATO_VALOR (formula SUMAR.SI) recalcule el balance.
      const fechaLm = getCampaignDateISO(campaign?.campaignYear, campaign?.campaignMonth);
      const lmLines: { amount: number; tipo: 'ingreso' | 'gasto'; cat: any; concepto: string }[] = [
        { amount: pago,        tipo: 'ingreso', cat: 'contrato_secundario', concepto: `Pago misión ${meta.missionId}` },
        { amount: salvamento,  tipo: 'ingreso', cat: 'venta_mech',          concepto: `Salvamento misión ${meta.missionId}` },
        { amount: extrasHaber, tipo: 'ingreso', cat: 'ingreso_misc',        concepto: `Extras (haber) ${meta.missionId}` },
        { amount: reparacion,  tipo: 'gasto',   cat: 'repuestos',           concepto: `Reparación misión ${meta.missionId}` },
        { amount: municion,    tipo: 'gasto',   cat: 'repuestos',           concepto: `Munición misión ${meta.missionId}` },
        { amount: blindaje,    tipo: 'gasto',   cat: 'repuestos',           concepto: `Blindaje misión ${meta.missionId}` },
        { amount: extrasDebe,  tipo: 'gasto',   cat: 'sueldo_extra',        concepto: `Extras (debe) ${meta.missionId}` },
      ];
      for (const l of lmLines) {
        if (!l.amount || l.amount <= 0) continue;
        await commitLibroEntryAndTreasury({
          id: genId('lm'),
          fecha: fechaLm,
          concepto: l.concepto,
          cantidad: Math.round(l.amount),
          tipo: l.tipo,
          categoria: l.cat,
          nota: `Misión ${meta.missionId} · Hoja de Servicio`,
          jugador: '',
        });
      }

      setStatus('ok');
      setStatusMsg('Misión visada y archivada');

      // Telegram notif (drop silencioso)
      if (getTelegramToggle('mision_cerrada')) {
        // Calcula PJ top XP
        const topPj = [...players].sort((a, b) => b.xpGanado - a.xpGanado)[0];
        sendTelegramNotif('mision_cerrada', {
          fecha: meta.fecha,
          missionType,
          balance,
          pjTopXP: topPj?.name || '',
          xp: topPj?.xpGanado || 0,
        });
      }

      setPlayers(prev => prev.map(p => ({ ...p, xpGanado: 0, chequeos: 0, rerolls: 0 })));
      setPago(0); setSalvamento(0); setExtrasHaber(0);
      setReparacion(0); setMunicion(0); setBlindaje(0); setExtrasDebe(0);
    } catch (e: any) {
      setStatus('error');
      setStatusMsg(`Error: ${e.message || e}`);
    }
  };

  const handleReset = () => {
    setPlayers(prev => prev.map(p => ({ ...p, xpGanado: 0, chequeos: 0, rerolls: 0 })));
    setPago(0); setSalvamento(0); setReparacion(0); setMunicion(0);
    setStatus('idle'); setStatusMsg('');
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      display: 'grid', placeItems: 'center', padding: '20px 0',
      background: `radial-gradient(ellipse at top, #1a1410 0%, ${C.void} 60%), linear-gradient(180deg, ${C.void2} 0%, ${C.void} 100%)`,
    }}>
      <div ref={wrapRef} style={{ width: DW * scale, height: DH * scale, position: 'relative' }}>
        <div style={{
          width: DW, height: DH, transformOrigin: 'top left', transform: `scale(${scale})`,
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(ellipse at top, #1a1410 0%, ${C.void} 60%), linear-gradient(180deg, ${C.void2} 0%, ${C.void} 100%)`,
          fontFamily: '"Special Elite", "Share Tech Mono", monospace', color: C.cream,
        }}>

          {/* Frame heráldico — DETRÁS de columna y medallón */}
          <svg viewBox={`0 0 ${DW} ${DH}`} preserveAspectRatio="none" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 0,
          }}>
            <rect x="20" y="20" width={DW - 40} height={DH - 40} fill="none" stroke={C.goldDeep} strokeWidth="1" />
            <rect x="28" y="28" width={DW - 56} height={DH - 56} fill="none" stroke={C.gold} strokeWidth="0.5" opacity="0.5" />
            {[[40, 40, 0], [DW - 40, 40, 90], [DW - 40, DH - 40, 180], [40, DH - 40, 270]].map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
                <path d="M 0 0 L 30 0 M 0 0 L 0 30 M 0 0 L 22 22" stroke={C.gold} strokeWidth="0.8" fill="none" />
                <circle cx="0" cy="0" r="3" fill={C.gold} />
              </g>
            ))}
            <line x1="476" y1="92" x2="476" y2={DH - 60} stroke={C.goldDeep} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
            <line x1={DW - 476} y1="92" x2={DW - 476} y2={DH - 60} stroke={C.goldDeep} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
          </svg>

          {/* Top motto */}
          <div style={{
            position: 'absolute', top: 40, left: 80, right: 80, height: 28,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            letterSpacing: 6, color: C.goldDim, zIndex: 4,
          }}>
            <span>◆ FAFS</span>
            <span style={{
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontSize: 14, letterSpacing: 4, color: C.gold,
            }}>
              — · Comisión de Revisión y Fianza de Mercenarios · —
            </span>
            <span>◆ Anno Domini MMMXXVI</span>
          </div>

          {/* COLUMNA CENTRAL */}
          <div style={{
            position: 'absolute', top: 92, left: 482, right: 482, bottom: 70,
            zIndex: 3, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12, padding: '12px 8px',
          }}>
            <MissionMedallion ringText={ringText} />

            {/* ID misión */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 5, color: C.goldDim }}>
                EXPEDIENTE Nº · MISSION FILE
              </div>
              <input value={missionType}
                onChange={e => setMissionType(e.target.value)}
                placeholder="[ describir operación ]"
                style={{
                  width: '100%', background: 'transparent',
                  border: 'none', outline: 'none', borderBottom: `1px dotted ${C.gold}66`,
                  fontFamily: '"Cormorant Garamond", serif', fontSize: 30, fontStyle: 'italic',
                  fontWeight: 700, color: C.gold, letterSpacing: 1, textAlign: 'center',
                  textShadow: '0 2px 12px rgba(232,192,106,0.3)',
                  marginTop: 4, paddingBottom: 4,
                }} />
              <div style={{ marginTop: 6, fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 4, color: C.gold }}>
                DURACIÓN · {duration}
              </div>
            </div>

            {/* KPIs */}
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                ['XP ESCUADRÓN', `${totalSquadXp >= 0 ? '+' : ''}${fmt(totalSquadXp)}`, totalSquadXp >= 0],
                ['BALANCE ₡',    `${balance >= 0 ? '+' : '−'}${fmt(Math.abs(balance))}`, balance >= 0],
                ['PILOTOS',      `${players.length} efectivos`, true],
                ['REPETICIONES', `${totalRerolls} solicitadas`, true],
              ] as [string, string, boolean][]).map(([label, val, ok]) => (
                <div key={label} style={{
                  border: `1px solid ${ok ? C.gold : C.redDeep}66`,
                  background: `linear-gradient(180deg, ${ok ? C.gold : C.redDeep}10, transparent)`,
                  padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 8, letterSpacing: 3, color: C.goldDim, fontFamily: '"Share Tech Mono", monospace' }}>{label}</div>
                  <div style={{
                    fontFamily: '"Cormorant Garamond", serif', fontSize: 22,
                    color: ok ? C.gold : C.red, fontWeight: 700, fontStyle: 'italic',
                    textShadow: `0 0 10px ${ok ? C.gold : C.red}33`, marginTop: 2,
                  }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Oficial Pagador */}
            <div style={{
              width: '100%', borderTop: `1px solid ${C.line2}`, borderBottom: `1px solid ${C.line2}`,
              padding: '10px 0', marginTop: 4,
            }}>
              <div style={{
                fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 5,
                color: C.goldDim, marginBottom: 6, textAlign: 'center',
              }}>
                · OFICIAL PAGADOR ·
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', alignItems: 'baseline' }}>
                {(['missionId','fecha','codUnidad'] as const).map(key => (
                  <FragmentRow key={key}
                    label={({ missionId: 'EXPED.', fecha: 'FECHA', codUnidad: 'UNIDAD' } as const)[key]}
                    value={meta[key]}
                    onChange={v => setMeta(prev => ({ ...prev, [key]: v }))} />
                ))}
              </div>
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: C.goldDim, fontFamily: '"Share Tech Mono", monospace' }}>FIRMA</div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 24, color: C.gold, marginTop: 2, fontStyle: 'italic' }}>
                  {meta.oficial}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div style={{ width: '100%', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleRegister} disabled={status === 'loading'} style={{
                width: '100%', height: 70,
                background: status === 'loading' ? `${C.goldDeep}33` : `${C.greenDeep}33`,
                border: `2.5px solid ${status === 'loading' ? C.goldDeep : C.green}`,
                color: status === 'loading' ? C.gold : '#9bd28a',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: 14, letterSpacing: 4, fontWeight: 700,
                cursor: status === 'loading' ? 'wait' : 'pointer', outline: 'none', padding: 0,
                boxShadow: '2px 3px 0 rgba(0,0,0,0.4)',
              }}>
                <div style={{ fontSize: 9, letterSpacing: 3, opacity: 0.7, marginBottom: 2 }}>
                  {status === 'loading' ? '· EN TRÁMITE ·' : '· ACCIÓN OFICIAL ·'}
                </div>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontStyle: 'italic' }}>
                  ▣ {status === 'loading' ? 'Registrando…' : 'Visar y Archivar'}
                </div>
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <TelegramToggle context="mision_cerrada" accent={C.gold} />
                <button onClick={handleReset} style={{
                  background: 'transparent', border: 'none', color: C.goldDim,
                  fontFamily: '"Special Elite", monospace', fontSize: 11, fontStyle: 'italic',
                  cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', outline: 'none',
                }}>↺ desechar borrador</button>
              </div>
              {statusMsg && (
                <div style={{
                  padding: '6px 10px',
                  border: `1px solid ${status === 'ok' ? C.green : status === 'error' ? C.red : C.gold}`,
                  background: `${status === 'ok' ? C.green : status === 'error' ? C.red : C.gold}15`,
                  color: status === 'ok' ? '#9bd28a' : status === 'error' ? '#e88a7a' : C.gold,
                  fontFamily: '"Special Elite", monospace', fontSize: 11, fontStyle: 'italic',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{status === 'ok' ? '✓' : status === 'error' ? '✗' : '◆'}</span>
                  {statusMsg}
                </div>
              )}
            </div>
          </div>

          {/* HOJA IZQUIERDA · BITÁCORA */}
          <PaperSheet x={70} y={92} w={392} tilt={-0.2} clips={['28%', '72%']}>
            <SheetHeader num={players.length > 1 ? `I—${ROMAN_NUMS[players.length - 1]}` : 'I'} title="Libro de Bitácora" tail="por piloto" />
            <div style={{ paddingLeft: 26 }}>
              {players.map((p, i) => (
                <PaperPilotRow key={p.name}
                  player={p} index={i}
                  isLast={i === players.length - 1}
                  onUpdate={upd} />
              ))}
            </div>
            <div style={{
              marginTop: 14, paddingTop: 10, borderTop: `2px solid ${C.ink}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <button
                onClick={() => setRerollSeed(s => s + 1)}
                title="Re-roll del compañero nombrado"
                style={{
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: '"Cormorant Garamond", serif', fontSize: 13, fontStyle: 'italic',
                  color: C.inkSoft, outline: 'none',
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                  textDecorationColor: `${C.redDeep}55`, textUnderlineOffset: 3,
                }}
              >
                Σ Escuadrón ·
              </button>
              <span style={{
                fontFamily: '"Cormorant Garamond", serif', fontSize: 26, fontStyle: 'italic', fontWeight: 700,
                color: totalSquadXp > 0 ? C.greenDeep : totalSquadXp < 0 ? C.redDeep : C.ink,
              }}>
                {totalSquadXp > 0 ? '+' : ''}{fmt(totalSquadXp)}{' '}
                <span style={{ fontSize: 13, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal' }}>XP</span>
              </span>
            </div>
            {bitacoraNote && (
              <div style={{
                marginTop: 8, padding: '6px 8px', borderLeft: `3px solid ${C.redDeep}`,
                background: `${C.paperHi}88`, fontFamily: 'Caveat, cursive', fontSize: 16,
                color: C.redDeep, fontStyle: 'italic',
              }}>
                {bitacoraNote}
              </div>
            )}
          </PaperSheet>

          {/* HOJA DERECHA · TESORERÍA */}
          <PaperSheet x={DW - 462} y={92} w={392} tilt={0.24} clips={['50%']}>
            <SheetHeader num="V" title="Tesorería · Liquidación" tail="C-Bills" />

            <div>
              <div style={{
                fontSize: 9, letterSpacing: 3, color: C.greenDeep,
                fontFamily: '"Share Tech Mono", monospace',
                marginBottom: 4, paddingBottom: 2, borderBottom: `1px solid ${C.greenDeep}55`,
              }}>HABER · ENTRADAS</div>
              <TesRow label="Pago por contrato" sign=""  value={pago}        onChange={setPago}        color={C.ink} />
              <TesRow label="Salvamento"        sign="+" value={salvamento}  onChange={setSalvamento}  color={C.greenDeep} />
              <TesRow label="Extras"            sign="+" value={extrasHaber} onChange={setExtrasHaber} color={C.greenDeep} />

              <div style={{
                fontSize: 9, letterSpacing: 3, color: C.redDeep,
                fontFamily: '"Share Tech Mono", monospace',
                marginTop: 12, marginBottom: 4, paddingBottom: 2, borderBottom: `1px solid ${C.redDeep}55`,
              }}>DEBE · GASTOS</div>
              <TesRow label="Costes de reparación" sign="−" value={reparacion} onChange={setReparacion} color={C.redDeep} />
              <TesRow label="Munición"             sign="−" value={municion}   onChange={setMunicion}   color={C.redDeep} />
              <TesRow label="Blindaje"             sign="−" value={blindaje}   onChange={setBlindaje}   color={C.redDeep} />
              <TesRow label="Extras"               sign="−" value={extrasDebe} onChange={setExtrasDebe} color={C.redDeep} />
            </div>

            <div style={{
              marginTop: 14, padding: '10px 14px',
              border: `2.5px solid ${balance >= 0 ? C.greenDeep : C.redDeep}`,
              background: `${balance >= 0 ? C.greenDeep : C.redDeep}11`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 8, letterSpacing: 3, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace' }}>BALANCE FINAL</div>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 11, fontStyle: 'italic', color: C.ink + 'aa', marginTop: 2 }}>
                  · Saldo de la operación ·
                </div>
              </div>
              <div style={{
                fontFamily: '"Cormorant Garamond", serif', fontSize: 30, fontStyle: 'italic', fontWeight: 700,
                color: balance >= 0 ? C.greenDeep : C.redDeep, lineHeight: 1,
              }}>
                {balance < 0 ? '−' : '+'}{fmt(Math.abs(balance))} <span style={{ fontSize: 16 }}>₡</span>
              </div>
            </div>

            {/* Detalle por piloto */}
            <div style={{ marginTop: 14 }}>
              <SheetHeader num="VI" title="Gasto por piloto" tail="repeticiones" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"Special Elite", monospace', fontSize: 11 }}>
                <tbody>
                  {players.map(p => {
                    const spent = calcSpent(p);
                    const rc = REROLL_CONFIG[p.nivel] ?? REROLL_CONFIG.Novato;
                    return (
                      <tr key={p.name} style={{ borderBottom: `1px dotted ${C.ink}55` }}>
                        <td style={{ padding: '4px 2px', color: C.ink }}>
                          <span style={{
                            display: 'inline-block', width: 6, height: 6,
                            background: p.accent,
                            marginRight: 6, verticalAlign: 'middle',
                          }} />
                          {p.nombre || p.name}
                        </td>
                        <td style={{ padding: '4px 2px', color: C.inkSoft, textAlign: 'right', fontStyle: 'italic' }}>
                          {p.rerolls} × {rc.cost}
                        </td>
                        <td style={{
                          padding: '4px 2px', textAlign: 'right',
                          fontFamily: '"Cormorant Garamond", serif', fontSize: 14, fontStyle: 'italic', fontWeight: 700,
                          color: spent > 0 ? C.redDeep : C.ink + '88',
                        }}>
                          {spent > 0 ? `−${fmt(spent)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: 12, padding: '6px 8px', borderLeft: `3px solid ${C.greenDeep}`,
              background: `${C.paperHi}88`, fontFamily: 'Caveat, cursive', fontSize: 16,
              color: C.greenDeep, fontStyle: 'italic',
            }}>
              "Salvamento por encima de lo estimado — buena cosecha"
            </div>
          </PaperSheet>

          {/* Sello VISADO */}
          {status === 'ok' && (
            <div style={{ position: 'absolute', left: 560, top: 880, zIndex: 6 }}>
              <VisadoStamp size={120} label="VISADO" sub="FAFS" tilt={-12} color={C.green} />
            </div>
          )}

          {/* Bottom motto */}
          <div style={{
            position: 'absolute', bottom: 22, left: 80, right: 80, height: 22,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 4,
            fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
            fontSize: 13, letterSpacing: 2, color: C.goldDim,
          }}>
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal', fontSize: 9, letterSpacing: 4 }}>
              FILE · {meta.missionId}
            </span>
            <span>— King Karl. For Eridani. —</span>
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal', fontSize: 9, letterSpacing: 4 }}>
              ◆ INFORME DE MISIÓN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub: fila label/input para meta del Oficial Pagador ──

function FragmentRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <span style={{ fontSize: 9, letterSpacing: 2, color: C.goldDim, fontFamily: '"Share Tech Mono", monospace' }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} style={{
        background: 'transparent', border: 'none', borderBottom: `1px dotted ${C.gold}55`,
        fontFamily: '"Special Elite", monospace', fontSize: 11, color: C.cream,
        outline: 'none', padding: '2px 0', width: '100%',
      }} />
    </>
  );
}

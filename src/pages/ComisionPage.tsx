// ══════════════════════════════════════════════════════════════
//  COMISIÓN — Landing page · Variant B Refined/Cinematic
//  Ported from Claude Design: Exploración Visual - Comisión.html
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { Pilot } from '@/lib/barracones-types';
import { calcHp } from '@/lib/barracones-data';
import { readLog, loadLogFromSheets, relTime } from '@/lib/barracones-log';
import type { LogEntry } from '@/lib/barracones-log';

const SLOTS_KEY = 'barracones_slots_v1';
const SLOT_COUNT = 6;

// Per-chassis display tweaks (image scale/offset) for known mechs
const MECH_META: Record<string, { weight: number; bv: number; imgScale?: number; imgOffsetX?: number }> = {
  'marauder':    { weight: 75, bv: 1519 },
  'grasshopper': { weight: 70, bv: 1569 },
  'thunderbolt': { weight: 65, bv: 1335 },
  'cataphract':  { weight: 70, bv: 1299, imgScale: 1.05, imgOffsetX: -8 },
  'crusader':    { weight: 65, bv: 1440, imgScale: 1.02, imgOffsetX: -5 },
  'enforcer':    { weight: 50, bv: 1128, imgScale: 1.06, imgOffsetX: -4 },
  'warhammer':   { weight: 70, bv: 1580 },
  'catapult':    { weight: 65, bv: 1399, imgScale: 1.85, imgOffsetX: -23 },
  'griffin':     { weight: 55, bv: 1272 },
  'wolverine':   { weight: 55, bv: 1176 },
  'hunchback':   { weight: 50, bv:  983 },
  'centurion':   { weight: 50, bv: 1135 },
  'orion':       { weight: 75, bv: 1533 },
  'archer':      { weight: 70, bv: 1399 },
  'shadow hawk': { weight: 55, bv: 1195 },
};

function mechKey(mech: string): string {
  const m = (mech ?? '').toLowerCase();
  return Object.keys(MECH_META).find(k => m.includes(k)) ?? '';
}

function mechImage(mech: string, base: string): string {
  const m = (mech ?? '').toLowerCase();
  if (m.includes('marauder'))    return `${base}mech-marauder.png`;
  if (m.includes('grasshopper')) return `${base}mech-grasshopper.png`;
  if (m.includes('thunderbolt')) return `${base}mech-thunderbolt.png`;
  if (m.includes('cataphract'))  return `${base}mech-cataphract.png`;
  if (m.includes('crusader'))    return `${base}mech-crusader.png`;
  if (m.includes('enforcer'))    return `${base}mech-enforcer.png`;
  if (m.includes('catapult'))    return `${base}mech-catapult.png`;
  return `${base}mech-blueprint.png`;
}

function calcDamagePct(pilot: Pilot): number {
  const fue   = pilot.fue || 6;
  const locs  = calcHp(fue);
  const total = locs.reduce((a, l) => a + l.max, 0);
  const dmg   = Object.values(pilot.hpDmg ?? {}).reduce((a: number, d) => a + (Number(d) || 0), 0);
  return total > 0 ? Math.round((dmg / total) * 100) : 0;
}

// ── Paleta ──
const T = {
  void:       '#0a0e14',
  surface:    '#10141a',
  surfaceLow: '#181c22',
  surface3:   '#262a31',
  outlineV:   '#4e453a',
  gold:       '#ffd79b',
  cream:      '#e8d5b8',
  creamHi:    '#fff1d6',
  bone:       '#d1c5b6',
  bloodDark:  '#7a1620',
  bloodLight: '#ffb4ab',
  ice:        '#99cfda',
  outline:    '#9a8f81',
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Sub-components ──────────────────────────────────────────

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
      color: T.gold, letterSpacing: 3, textTransform: 'uppercase',
      marginBottom: 10,
    }}>— {children} —</div>
  );
}

interface AgendaRowProps {
  num: string; label: string; note: string;
  tone?: 'ok' | 'warn' | 'neutral';
}
function AgendaRow({ num, label, note, tone = 'neutral' }: AgendaRowProps) {
  const c = tone === 'ok' ? T.ice : tone === 'warn' ? T.bloodLight : T.gold;
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${T.outlineV}`,
    }}>
      <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 11, color: c, letterSpacing: 1, width: 20 }}>{num}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600, color: T.creamHi, letterSpacing: 0.3 }}>{label}</div>
        <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.outline, letterSpacing: 1, marginTop: 2 }}>{note}</div>
      </div>
      <span style={{ color: c, fontSize: 14 }}>›</span>
    </div>
  );
}

interface MechAssetProps {
  pilot: string; call: string; chassis: string;
  weight: number; bv: number; status: string; damage: number;
  img: string; imgScale?: number; imgOffsetX?: number;
}
function MechAsset({ pilot, call, chassis, weight, bv, status, damage, img, imgScale = 1, imgOffsetX = 0 }: MechAssetProps) {
  const warn = status !== 'READY';
  const statusColor = warn ? T.bloodLight : T.ice;
  const dmgColor = damage > 30 ? T.bloodLight : damage > 0 ? T.cream : T.outline;

  return (
    <article style={{
      position: 'relative',
      background: T.surfaceLow,
      borderLeft: `2px solid ${warn ? T.bloodDark : T.gold}`,
      padding: '12px 14px',
      display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14,
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
      minHeight: 148, overflow: 'hidden',
    }}>
      {/* Mech image panel */}
      <div style={{
        background: T.void,
        borderLeft: `1px solid ${T.outlineV}`,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Scanline backdrop */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.025) 50%)',
          backgroundSize: '100% 3px',
        }} />
        {/* Grid reticle */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            `linear-gradient(${T.outlineV} 1px, transparent 1px),` +
            `linear-gradient(90deg, ${T.outlineV} 1px, transparent 1px)`,
          backgroundSize: '16px 16px', opacity: 0.15,
        }} />
        <img src={img} alt={chassis} style={{
          position: 'relative', zIndex: 2,
          width: `${70 * imgScale}%`, height: `${70 * imgScale}%`,
          objectFit: 'contain',
          transform: `translateX(${imgOffsetX}px)`,
          filter: warn
            ? 'saturate(0.4) brightness(0.85) sepia(0.3) hue-rotate(-20deg)'
            : 'saturate(0.85) contrast(1.05)',
          mixBlendMode: 'luminosity',
        }} />
        {/* Tonnage chip */}
        <div style={{
          position: 'absolute', top: 4, left: 4, zIndex: 3,
          fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
          color: T.gold, letterSpacing: 1,
          background: 'rgba(10,14,20,0.7)', padding: '1px 4px',
        }}>{weight}t</div>
        {/* Damaged chip */}
        {warn && (
          <div style={{
            position: 'absolute', bottom: 4, left: 4, right: 4, zIndex: 3,
            fontFamily: '"Share Tech Mono", monospace', fontSize: 8,
            color: T.bloodLight, letterSpacing: 2, textAlign: 'center',
            background: 'rgba(122,22,32,0.7)', padding: '2px 0',
          }}>⚠ DAÑADO</div>
        )}
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <div style={{
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700,
            color: T.creamHi, letterSpacing: 0.3, lineHeight: 1.1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{chassis}</div>
          <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9.5, color: T.gold, letterSpacing: 1.5, marginTop: 4 }}>
            ‹ {call.toUpperCase()} ›
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.bone, marginTop: 2 }}>{pilot}</div>
        </div>

        {/* Damage bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 3, background: T.void, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${100 - damage}%`,
              background: damage > 30 ? T.bloodDark : damage > 0 ? T.cream : T.gold,
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 5,
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5,
          }}>
            <span style={{ color: statusColor }}>{status}</span>
            <span style={{ color: dmgColor }}>{damage === 0 ? 'INTACT' : `-${damage}%`}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 2,
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            color: T.outline, letterSpacing: 1.5,
          }}>
            <span>BV {bv.toLocaleString('es-ES')}</span>
            <span>PESADO</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Orden del Día ───────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  skill: 'Habilidad',
  attr:  'Atributo',
  quirk: 'Quirk',
  xp:    'XP',
  mech:  'Mech',
};
const TIPO_TONE: Record<string, 'ok' | 'warn' | 'neutral'> = {
  skill: 'ok',
  attr:  'ok',
  quirk: 'neutral',
  xp:    'ok',
  mech:  'warn',
};

function OrdenDelDia() {
  const [log, setLog] = useState<LogEntry[]>([]);
  useEffect(() => {
    setLog(readLog().slice(0, 8));
    loadLogFromSheets().then(remote => {
      if (remote && remote.length > 0) setLog(remote.slice(0, 8));
    }).catch(() => {});
  }, []);

  if (log.length === 0) {
    return (
      <div>
        <SmallLabel>Orden del Día</SmallLabel>
        <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.outline, letterSpacing: 1, padding: '8px 0' }}>
          Sin actividad registrada
        </div>
      </div>
    );
  }

  return (
    <div>
      <SmallLabel>Orden del Día</SmallLabel>
      {log.map((entry, i) => (
        <AgendaRow
          key={i}
          num={String(i + 1).padStart(2, '0')}
          label={`${TIPO_LABEL[entry.tipo] ?? entry.tipo} · ${entry.pilot}`}
          note={`${entry.desc}  ·  ${relTime(entry.ts)}`}
          tone={TIPO_TONE[entry.tipo] ?? 'neutral'}
        />
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export function ComisionPage() {
  const { campaign } = useAppStore();
  const BASE = import.meta.env.BASE_URL;

  const mesNombre = MESES[(campaign.campaignMonth ?? 1) - 1] ?? 'Enero';
  const mesAbrev  = mesNombre.slice(0, 3).toUpperCase();
  const heroLabel = `${mesAbrev} · ${campaign.campaignYear ?? 3026} · DISTRITO KAPTEYN`;

  // Format contratoValor: strip non-digits, format with dot thousands separator, append ₡
  function fmtValor(v: string | undefined): string {
    const raw = String(v ?? '').replace(/[^\d]/g, '');
    if (!raw) return '—';
    return parseInt(raw, 10).toLocaleString('es-ES') + ' ₡';
  }
  const contratoFmt  = fmtValor(campaign.contratoValor);
  const valorUnidadFmt = fmtValor(campaign.valorUnidad);

  // Load pilot slots from localStorage (same key as useBarracones)
  const [slots, setSlots] = useState<(Pilot | null)[]>(Array(SLOT_COUNT).fill(null));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SLOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const next = Array(SLOT_COUNT).fill(null) as (Pilot | null)[];
          parsed.slice(0, SLOT_COUNT).forEach((p, i) => { next[i] = p; });
          setSlots(next);
        }
      }
    } catch { /* silent */ }
  }, []);

  // Build the 6 mech cards from fixed slots (0-5), in Barracones order
  const mechCards = slots.slice(0, SLOT_COUNT).map((p, i) => {
    const mechFromConfig = campaign.pilotMechs?.[i] ?? '';
    const nameFromConfig = campaign.pilotNames?.[i] ?? '';
    if (!p && !mechFromConfig && !nameFromConfig) return null;
    try {
      const dmgPct   = p ? calcDamagePct(p) : 0;
      const status   = dmgPct > 30 ? 'REPARACIÓN' : 'READY';
      const mech     = p?.mech ?? mechFromConfig;
      const nombre   = p?.nombre ?? nameFromConfig;
      const key      = mechKey(mech);
      const meta     = MECH_META[key] ?? { weight: 0, bv: 0 };
      const fallbackCall = nombre ? nombre.toUpperCase().slice(0, 2) : '?';
      const apellido = nombre ? (nombre.split(' ').slice(-1)[0] || nombre) : (p?.callsign ?? '?');
      return {
        pilot:      apellido,
        call:       p?.callsign ?? fallbackCall,
        chassis:    mech || '—',
        weight:     meta.weight,
        bv:         meta.bv,
        status,
        damage:     dmgPct,
        img:        mechImage(mech, BASE),
        imgScale:   meta.imgScale,
        imgOffsetX: meta.imgOffsetX,
      };
    } catch {
      return null;
    }
  });

  const ready   = mechCards.filter(c => c?.status === 'READY').length;
  const total   = mechCards.filter(Boolean).length;
  const inBahia = mechCards.filter(c => c?.status === 'REPARACIÓN').length;
  const lanzaStatus = inBahia > 0
    ? `${total} UNIDADES · ${ready} OPERATIVAS · ${inBahia} EN BAHÍA`
    : `${total} UNIDADES · TODAS OPERATIVAS`;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 380px',
      height: '100%', overflow: 'hidden',
      background: T.void, color: T.cream,
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ════ LEFT COLUMN — hero + activos 2×2 ════ */}
      <div style={{ display: 'grid', gridTemplateRows: '300px 1fr', overflow: 'hidden' }}>

        {/* Hero */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(180deg, ${T.surface} 0%, ${T.void} 100%)`,
          padding: '28px 36px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderBottom: `1px solid ${T.outlineV}`,
        }}>
          {/* Banner art */}
          <div style={{
            position: 'absolute', right: -40, top: -20, bottom: -20,
            width: 340, opacity: 0.72,
            backgroundImage: `url(${BASE}banner-kkk.png)`,
            backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
            filter: 'saturate(0.85) contrast(1.08)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 35%, #000 85%, rgba(0,0,0,0.7) 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 35%, #000 85%, rgba(0,0,0,0.7) 100%)',
          }} />
          {/* Vignette */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(10,14,20,0.85) 0%, rgba(10,14,20,0.5) 55%, transparent 100%)` }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', height: '100%', gap: 24, alignItems: 'stretch' }}>

            {/* Emblem — full height */}
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img
                src={`${BASE}KIngKarlKRifle.png`}
                alt="King Karl's Kürassiers"
                style={{
                  height: 220, width: 'auto',
                  filter: 'brightness(1.15) saturate(1.5) contrast(1.1) drop-shadow(0 0 12px rgba(255,215,155,0.5))',
                  mixBlendMode: 'normal',
                  opacity: 1,
                }}
              />
            </div>

            {/* Text — flex column, top content + bottom stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                  color: T.gold, letterSpacing: 4, textTransform: 'uppercase',
                  paddingLeft: 12, borderLeft: `2px solid ${T.gold}`,
                }}>
                  {heroLabel}
                </div>
                <h1 style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontSize: 44, fontWeight: 800,
                  color: T.creamHi, letterSpacing: -1.2,
                  lineHeight: 0.95, margin: '14px 0 0',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 20px rgba(10,14,20,0.8)',
                }}>
                  Vengad al Noveno.<br /><span style={{ color: T.gold }}>Por Eridani.</span>
                </h1>
                <div style={{
                  marginTop: 14, maxWidth: 480,
                  fontFamily: 'Inter, sans-serif', fontSize: 12.5,
                  color: T.bone, lineHeight: 1.55,
                }}>
                  La Comisión certifica al mando de{' '}
                  <strong style={{ color: T.gold, fontWeight: 600 }}>King Karl's Kürassiers</strong>{' '}
                  para contratos autorizados.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 40 }}>
                {([
                  ['Tesoreria',          contratoFmt],
                  ['Lanza',              campaign.totalMechs || '—'],
                  ['Valor de la Unidad', valorUnidadFmt],
                ] as [string, string][]).map(([k, v], i) => (
                  <div key={i}>
                    <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 2 }}>{k.toUpperCase()}</div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, color: T.creamHi, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activos 2×2 */}
        <div style={{ padding: '18px 32px 24px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SmallLabel>Lanza Prime</SmallLabel>
            <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.outline, letterSpacing: 2 }}>
              {lanzaStatus}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: 14, flex: 1,
          }}>
            {mechCards.map((c, i) => c ? (
              <MechAsset key={i}
                pilot={c.pilot} call={c.call}
                chassis={c.chassis} weight={c.weight} bv={c.bv}
                status={c.status} damage={c.damage}
                img={c.img} imgScale={c.imgScale} imgOffsetX={c.imgOffsetX}
              />
            ) : (
              <div key={i} style={{
                background: T.surfaceLow, borderLeft: `2px solid ${T.outlineV}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                color: T.outline, letterSpacing: 2,
              }}>SLOT VACÍO</div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ RIGHT COLUMN — ops panel ════ */}
      <div style={{
        background: T.surface,
        borderLeft: `1px solid ${T.outlineV}`,
        padding: '22px 26px 24px',
        display: 'flex', flexDirection: 'column', gap: 22,
        overflow: 'hidden',
      }}>

        {/* Orden del Día */}
        <OrdenDelDia />

        {/* Última entrada · Crónicas */}
        <div>
          <SmallLabel>Última Entrada · Crónicas</SmallLabel>
          <blockquote style={{
            margin: 0, padding: '12px 16px',
            borderLeft: `2px solid ${T.bloodDark}`,
            fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.55,
            color: T.bone, fontStyle: 'italic',
          }}>
            "Hemos limpiado los pantanos, esos pobres capelenses no tuvieron ni una sola oportunidad."
            <div style={{ marginTop: 8, fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.gold, letterSpacing: 2, fontStyle: 'normal' }}>
              — Sargento Dayffid · 14/{mesAbrev}/{campaign.campaignYear ?? 3026}
            </div>
          </blockquote>
        </div>

        {/* Parte diario + moral */}
        <div style={{ marginTop: 'auto' }}>
          <SmallLabel>Parte Diario</SmallLabel>
          <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.bone, lineHeight: 1.8, letterSpacing: 0.5 }}>
            {([
              ['04:22', T.ice,       'KING_KARL engages raider · 7-G'],
              ['04:23', T.bloodLight,'VANGUARD gyro critical · falling back'],
              ['04:24', T.cream,     'FALCON confirms raider-03 kill'],
              ['04:28', T.gold,      'MISSION VICTORY · mech salvage x1'],
            ] as [string, string, string][]).map(([time, color, msg], i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: T.outlineV }}>{time}</span>
                <span style={{ color }}>{msg}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 12, padding: '10px 12px', background: T.void,
            borderLeft: `2px solid ${T.gold}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 2 }}>
              MORAL DE LA UNIDAD
            </span>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 800, color: T.ice, letterSpacing: -0.3 }}>
              88<span style={{ fontSize: 11, color: T.outline }}> /100</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

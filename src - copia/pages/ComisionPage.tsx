// ══════════════════════════════════════════════════════════════
//  COMISIÓN — Landing page · Variant B Refined/Cinematic
//  Ported from Claude Design: Exploración Visual - Comisión.html
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewport } from '@/hooks/useViewport';
import { useAppStore } from '@/lib/store';
import type { Pilot } from '@/lib/barracones-types';
import { calcHp } from '@/lib/barracones-data';
import { readLog, loadLogFromSheets, relTime } from '@/lib/barracones-log';
import type { LogEntry } from '@/lib/barracones-log';
import { readCronicas, loadCronicasFromSheets, sortCronicas, type CronicaEntry } from '@/lib/cronicas-store';
import { stripMarkdownLite } from '@/lib/markdown-lite';
import { readPartes, loadPartesFromSheets, type ParteEntry, type ParteTone } from '@/lib/parte-store';
import { loadMovimientos, type MovimientoEntry } from '@/lib/sheets-service';
import { isActivo } from '@/lib/roster';
// IMPORTANTE: Importamos el catálogo global para que lea tonelaje y BV de modelos que no tienen .ssw
import { useMechCatalog, findMechByName } from '@/hooks/useMechCatalog';

const SLOTS_KEY = 'barracones_slots_v1';
const SLOT_COUNT = 6;

// ⚠️ MOCK DEL SIMULADOR ASÍNCRONO DESDE SHEETS
// Reemplaza esto por tu función real que haga el fetch a Sheets
// (por ejemplo: import { loadSnapshotFromSheets } from '@/lib/sheets-service';)
const loadSnapshotFromSheets = async (): Promise<any> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        mechSlots: [
          {
            state: { chassis: 'Shootist', armor: { CTf: 20 }, is: { CT: 10 } },
            session: { armor: { CTf: 2 }, is: { CT: 5 } } 
          },
          {
            state: { chassis: 'Dervish', armor: { CTf: 20 }, is: { CT: 10 } },
            session: { armor: { CTf: 20 }, is: { CT: 10 } } 
          }
        ]
      });
    }, 800);
  });
};

// Per-chassis display tweaks (image scale/offset) for known mechs
const MECH_META: Record<string, { weight: number; bv: number; cost: number; imgScale?: number; imgOffsetX?: number }> = {
  'marauder':    { weight: 75, bv: 1470, cost: 6597500 },
  'grasshopper': { weight: 70, bv: 1417, cost: 5983573 },
  'thunderbolt': { weight: 65, bv: 1335, cost: 5356560 },
  'cataphract':  { weight: 70, bv: 1365, cost: 6231853, imgScale: 1.05, imgOffsetX: -8 },
  'crusader':    { weight: 65, bv: 1355, cost: 5617910, imgScale: 1.02, imgOffsetX: -5 },
  'enforcer':    { weight: 50, bv: 1043, cost: 3524500, imgScale: 1.06, imgOffsetX: -4 },
  'warhammer':   { weight: 70, bv: 1580, cost: 6051383 },
  'catapult':    { weight: 65, bv: 1399, cost: 5751125, imgScale: 1.85, imgOffsetX: -23 },
  'griffin':     { weight: 55, bv: 1272, cost: 4924107 },
  'wolverine':   { weight: 55, bv: 1176, cost: 4810357 },
  'hunchback':   { weight: 50, bv:  983, cost: 3457875 },
  'centurion':   { weight: 50, bv: 1135, cost: 3455500 },
  'orion':       { weight: 75, bv: 1533, cost: 6600250 },
  'archer':      { weight: 70, bv: 1399, cost: 6300973 },
  'shadow hawk': { weight: 55, bv: 1195, cost: 4505557 },
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

interface MechFileStats {
  tons?: number;
  bv?: number;
  cost?: number;
}

function parseMechFileStats(text: string): MechFileStats {
  const tonsS = text.match(/<mech[^>]*\stons="([^"]+)"/i)?.[1] ?? '';
  const bvS = text.match(/<battle_value>([^<]+)<\/battle_value>/i)?.[1] ?? '';
  const costS = text.match(/<cost>([^<]+)<\/cost>/i)?.[1] ?? '';
  const tons = parseInt(tonsS, 10);
  const bv = parseInt(bvS, 10);
  const cost = parseFloat(costS);
  return {
    ...(Number.isFinite(tons) ? { tons } : {}),
    ...(Number.isFinite(bv) ? { bv } : {}),
    ...(Number.isFinite(cost) ? { cost } : {}),
  };
}

function mechWeightCategory(tons: number): string {
  if (tons <= 35) return 'LIGERO';
  if (tons <= 55) return 'MEDIO';
  if (tons <= 75) return 'PESADO';
  return 'ASALTO';
}

function formatCzar(n: number): string {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const hasDecimals = Math.abs(rounded % 1) > 0.001;
  return `${rounded.toLocaleString('es-ES', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })} ₡`;
}

function parseCurrencyValue(raw: string | undefined): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const sep = Math.max(lastComma, lastDot);
  if (sep === -1) {
    const n = Number(cleaned.replace(/[^\d-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  const intRaw = cleaned.slice(0, sep);
  const intPart = intRaw.replace(/[.,]/g, '');
  const decPart = cleaned.slice(sep + 1).replace(/[^\d]/g, '');
  const hasGroupSepBefore = /[.,]/.test(intRaw);
  const decSep = lastComma > lastDot ? ',' : '.';
  if (decPart.length === 1 || decPart.length === 2) {
    const n = Number(`${intPart || '0'}.${decPart}`);
    return Number.isFinite(n) ? n : null;
  }
  if (!hasGroupSepBefore && decPart.length > 2) {
    const normalized = decSep === ','
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(cleaned.replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// HP de Piloto
function calcDamagePct(pilot: Pilot): number {
  const fue   = pilot.fue || 6;
  const locs  = calcHp(fue);
  const total = locs.reduce((a, l) => a + l.max, 0);
  const dmg   = Object.values(pilot.hpDmg ?? {}).reduce((a: number, d) => a + (Number(d) || 0), 0);
  return total > 0 ? Math.round((dmg / total) * 100) : 0;
}

// % de Daño del Mech desde el Simulador
function getMechSimDamage(chassisName: string, snapshot: any): number | null {
  if (!snapshot || !snapshot.mechSlots || !chassisName) return null;
  
  const slot = snapshot.mechSlots.find((s: any) =>
    s?.state?.chassis?.toLowerCase().includes(chassisName.toLowerCase())
  );
  if (!slot || !slot.state || !slot.session) return null;

  const st = slot.state;
  const se = slot.session;
  // Mech destruido -> 100% daño (estado 0%) aunque queden pts en otras locs.
  if (se.destroyed) return 100;
  const armorLocs = ['HD','CTf','CTr','LTf','LTr','RTf','RTr','LA','RA','LL','RL'];
  const armorMax  = armorLocs.reduce((s,k) => s + ((st.armor || {})[k] ?? 0), 0);
  const armorCur  = armorLocs.reduce((s,k) => s + ((se.armor || {})[k] ?? 0), 0);
  const isLocs    = ['HD','CT','LT','RT','LA','RA','LL','RL'];
  const isMax     = isLocs.reduce((s,k) => s + ((st.is || {})[k] ?? 0), 0);
  const isCur     = isLocs.reduce((s,k) => s + ((se.is || {})[k] ?? 0), 0);
  const totalMax  = armorMax + isMax;
  const totalLost = (armorMax - armorCur) + (isMax - isCur);

  return totalMax > 0 ? Math.round((totalLost / totalMax) * 100) : 0;
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
  weight: number; weightClass: string; bv: number; price: number; status: string; damage: number;
  simDamagePct: number | null;
  img: string; imgScale?: number; imgOffsetX?: number;
}
function MechAsset({ pilot, call, chassis, weight, weightClass, bv, price, status, damage, simDamagePct }: MechAssetProps) {
  const warn = status !== 'READY';
  const statusColor = warn ? T.bloodLight : T.ice;
  const infoColor = warn ? T.bloodLight : T.outline;

  return (
    <article style={{
      position: 'relative',
      background: T.surfaceLow,
      borderLeft: `2px solid ${warn ? T.bloodDark : T.gold}`,
      padding: '8px 10px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%)',
      minHeight: 90, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ minWidth: 0 }}>
        {/* Nombre del Piloto */}
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 700,
          color: T.creamHi, letterSpacing: 0.2, lineHeight: 1.1, marginBottom: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{pilot}</div>
        
        {/* Apodo */}
        <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 8.5, color: T.gold, letterSpacing: 1.2 }}>
          ‹ {call.toUpperCase()} ›
        </div>
        
        {/* Modelo/Chassis y Tonelaje */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginTop: 1 }}>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10, color: T.bone,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flex: 1, minWidth: 0,
          }}>{chassis}</div>
          <div style={{
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            color: T.gold, letterSpacing: 1, flexShrink: 0,
          }}>{weight}t</div>
        </div>
      </div>

      {/* Damage bar + stats */}
      <div>
        <div style={{ height: 2, background: T.void, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${100 - damage}%`,
            background: damage > 30 ? T.bloodDark : damage > 0 ? T.cream : T.gold,
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 3,
          fontFamily: '"Share Tech Mono", monospace', fontSize: 8, letterSpacing: 1,
        }}>
          <span style={{ color: statusColor }}>{warn ? '⚠ ' : ''}{status}</span>
          {weight > 0 && <span style={{ color: statusColor }}>{weightClass}</span>}
        </div>

        {/* BV + Estado en misma linea */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 1,
          fontFamily: '"Share Tech Mono", monospace', fontSize: 8, letterSpacing: 1,
        }}>
          <span style={{ color: infoColor }}>BV {bv.toLocaleString('es-ES', { useGrouping: 'always' })}</span>
          {typeof simDamagePct === 'number' && (() => {
            const estadoPct = Math.max(0, 100 - simDamagePct);
            const c = estadoPct >= 90 ? T.gold : estadoPct >= 50 ? T.cream : T.bloodLight;
            return <span style={{ color: c }}>ESTADO {estadoPct}%</span>;
          })()}
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

const ATTR_LABEL: Record<string, string> = {
  FUE: 'Fuerza',
  DES: 'Destreza',
  INT: 'Inteligencia',
  CAR: 'Carisma',
};

const ATTR_FLAVOR: Record<string, ((pilot: string) => string)[]> = {
  FUE: [
    p => `${p} forjó su cuerpo bajo cargas punitivas y robusteció su Fuerza.`,
    p => `${p} dejó la cantina por el gimnasio y multiplicó su Fuerza.`,
    p => `${p} arrastró carga de combate hasta el límite y elevó su Fuerza.`,
  ],
  DES: [
    p => `${p} afinó reflejos en simulador hasta el agotamiento y mejoró su Destreza.`,
    p => `${p} repitió maniobras evasivas hasta dominarlas y aumentó su Destreza.`,
    p => `${p} pulió sus tiempos de respuesta sobre el cockpit y elevó su Destreza.`,
  ],
  INT: [
    p => `${p} se sumergió en doctrina táctica hasta el alba y agudizó su Inteligencia.`,
    p => `${p} diseccionó manuales de combate y reportes de batalla, elevando su Inteligencia.`,
    p => `${p} estudió patrones enemigos en cada salida y refinó su Inteligencia.`,
  ],
  CAR: [
    p => `${p} se ganó la cohorte con mando firme y elevó su Carisma.`,
    p => `${p} arengó a la lanza antes del salto y consolidó su Carisma.`,
    p => `${p} ganó respeto en el comedor de oficiales y reforzó su Carisma.`,
  ],
};

type SkillTheme = 'mando' | 'combate' | 'tecnica' | 'supervivencia';

function normSkillName(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function skillTheme(skillName: string): SkillTheme {
  const s = normSkillName(skillName);

  const mando = new Set([
    'admin. de feudo', 'administracion', 'diplomacia', 'interrogacion', 'liderazgo', 'tacticas',
  ]);
  const combate = new Set([
    'arco', 'disparo aeroespacial', 'disparo artilleria', 'disparo mech',
    'espada', 'pelea', 'pilotaje mech', 'pilotar aeroespacial',
    'pistola', 'rifle',
  ]);
  const tecnica = new Set([
    'astronavegacion', 'astropilotaje', 'informatica', 'ingenieria',
    'mecanica', 'primeros auxilios', 'seguridad', 'tecnica mech',
  ]);
  const supervivencia = new Set([
    'atletismo', 'callejeo', 'conducir', 'equitacion', 'robar', 'supervivencia',
  ]);

  if (mando.has(s)) return 'mando';
  if (combate.has(s)) return 'combate';
  if (tecnica.has(s)) return 'tecnica';
  if (supervivencia.has(s)) return 'supervivencia';

  return 'supervivencia';
}

function themedSkillLine(pilot: string, skill: string): string {
  const theme = skillTheme(skill);
  if (theme === 'mando') {
    return `${pilot} consolidó su temple de mando y reforzó ${skill}.`;
  }
  if (theme === 'combate') {
    return `${pilot} curtió su instinto de batalla y perfeccionó ${skill}.`;
  }
  if (theme === 'tecnica') {
    return `${pilot} afinó su pericia técnica y elevó ${skill}.`;
  }
  return `${pilot} endureció su disciplina de campaña y mejoró ${skill}.`;
}

function prettyLogText(entry: LogEntry): string {
  const pilot = entry.pilot || 'El piloto';
  const desc = entry.desc || '';

  if (entry.tipo === 'attr') {
    const m = desc.match(/^([A-Z]{3})\s+\d+\s*→\s*\d+/i);
    const attrKey = (m?.[1] || '').toUpperCase();
    const pool = ATTR_FLAVOR[attrKey];
    if (pool && pool.length > 0) {
      const idx = Math.abs(entry.ts || 0) % pool.length;
      return pool[idx](pilot);
    }
    const attr = ATTR_LABEL[attrKey] || attrKey || 'atributo';
    return `${pilot} forjó su carácter bajo presión y elevó su ${attr}.`;
  }

  if (entry.tipo === 'skill') {
    const m = desc.match(/^(.+?)\s+niv\s+\d+\s*→\s*\d+/i);
    const skill = (m?.[1] || '').trim() || 'habilidad';
    return themedSkillLine(pilot, skill);
  }

  if (entry.tipo === 'xp') {
    const m = desc.match(/([+-]?\d+)/);
    const xp = m?.[1] || '';
    return xp
      ? `${pilot} sumó experiencia de combate: ${xp} XP en su hoja de servicio.`
      : `${pilot} regresó del frente con nuevas lecciones de combate.`;
  }

  if (entry.tipo === 'mech') {
    const m = desc.match(/→\s*(.+)$/);
    const mech = (m?.[1] || '').trim();
    return mech
      ? `${pilot} recibió asignación al ${mech} y entró en rotación de primera línea.`
      : `${pilot} recibió una nueva asignación de BattleMech para la próxima salida.`;
  }

  if (entry.tipo === 'quirk') {
    return `${pilot} incorporó una nueva táctica tras las últimas escaramuzas.`;
  }

  return `${pilot} dejó constancia de un nuevo avance en su expediente de campaña.`;
}

function logDayKey(ts: number): string {
  const d = new Date(ts || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dedupeKey(entry: LogEntry): string {
  const pilot = (entry.pilot || '?').trim().toLowerCase();
  const day = logDayKey(entry.ts);
  const desc = entry.desc || '';

  if (entry.tipo === 'attr') {
    const m = desc.match(/^([A-Z]{3})\s+\d+\s*→\s*\d+/i);
    const attr = (m?.[1] || 'attr').toUpperCase();
    return `attr|${pilot}|${attr}|${day}`;
  }

  if (entry.tipo === 'skill') {
    const m = desc.match(/^(.+?)\s+niv\s+\d+\s*→\s*\d+/i);
    const skill = (m?.[1] || 'skill').trim().toLowerCase();
    return `skill|${pilot}|${skill}|${day}`;
  }

  if (entry.tipo === 'mech') {
    return `mech|${pilot}|${day}`;
  }

  if (entry.tipo === 'xp') {
    return `xp|${pilot}|${day}`;
  }

  if (entry.tipo === 'quirk') {
    const m = desc.match(/Quirk:\s*([^—-]+)/i);
    const quirk = (m?.[1] || 'quirk').trim().toLowerCase();
    return `quirk|${pilot}|${quirk}|${day}`;
  }

  return `${entry.tipo}|${pilot}|${desc.trim().toLowerCase()}|${day}`;
}

function compactAgenda(entries: LogEntry[], max = 5): LogEntry[] {
  const seen = new Set<string>();
  const sorted = [...entries].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const out: LogEntry[] = [];
  for (const e of sorted) {
    const k = dedupeKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
    if (out.length >= max) break;
  }
  return out;
}

function OrdenDelDia() {
  const [log, setLog] = useState<LogEntry[]>([]);
  useEffect(() => {
    setLog(compactAgenda(readLog(), 5));
    loadLogFromSheets().then(remote => {
      if (remote && remote.length > 0) setLog(compactAgenda(remote, 5));
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
          label={prettyLogText(entry)}
          note={relTime(entry.ts)}
          tone={TIPO_TONE[entry.tipo] ?? 'neutral'}
        />
      ))}
    </div>
  );
}

// ── Última Crónica ──────────────────────────────────────────

const AUTOR_LABEL_CR: Record<string, string> = {
  mando:        'Mando',
  contratista:  'Contratista',
  narrador:     'Cronista',
};

const MESES_ABREV = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function UltimaCronica() {
  const [entry, setEntry] = useState<CronicaEntry | null>(null);

  useEffect(() => {
    const local = sortCronicas(readCronicas())[0] ?? null;
    setEntry(local);
    loadCronicasFromSheets().then(remote => {
      if (remote && remote.length > 0) {
        setEntry(sortCronicas(remote)[0] ?? null);
      }
    }).catch(() => {});
  }, []);

  if (!entry) {
    return (
      <div>
        <SmallLabel>Última Entrada · Crónicas</SmallLabel>
        <div style={{
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
          color: T.outline, letterSpacing: 1, padding: '8px 0',
        }}>
          BITÁCORA SIN ENTRADAS
        </div>
      </div>
    );
  }

  const autorBase = AUTOR_LABEL_CR[entry.autor] ?? 'Autor';
  const autorNombre = entry.autorNombre?.trim() || autorBase;
  const preview = stripMarkdownLite(entry.cuerpo);
  const truncated = preview.length > 180 ? preview.slice(0, 177) + '…' : preview;
  const fechaCorta = `${String(entry.campaignDay).padStart(2, '0')}/${MESES_ABREV[entry.campaignMonth - 1] ?? '—'}/${entry.campaignYear}`;

  return (
    <div>
      <SmallLabel>Última Entrada · Crónicas</SmallLabel>
      <blockquote style={{
        margin: 0, padding: '12px 16px',
        borderLeft: `2px solid ${T.bloodDark}`,
        fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.55,
        color: T.bone, fontStyle: 'italic',
      }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600,
          color: T.creamHi, marginBottom: 6, fontStyle: 'normal',
        }}>{entry.titulo}</div>
        "{truncated}"
        <div style={{ marginTop: 8, fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.gold, letterSpacing: 2, fontStyle: 'normal' }}>
          — {autorNombre} · {fechaCorta}
        </div>
      </blockquote>
    </div>
  );
}

// ── Parte del Día ───────────────────────────────────────────

const PARTE_TONE_COLOR: Record<ParteTone, string> = {
  info:      T.ice,
  victoria:  T.gold,
  warning:   T.bloodLight,
  status:    T.cream,
};

function ParteDiario() {
  const [partes, setPartes] = useState<ParteEntry[]>([]);

  useEffect(() => {
    setPartes(readPartes().slice(0, 6));
    loadPartesFromSheets().then(remote => {
      if (remote && remote.length > 0) setPartes(remote.slice(0, 6));
    }).catch(() => {});
  }, []);

  if (partes.length === 0) {
    return (
      <div style={{
        fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
        color: T.outline, letterSpacing: 1.5, padding: '6px 0',
      }}>SIN ACTIVIDAD REGISTRADA</div>
    );
  }

  return (
    <>
      {partes.map((p, i) => (
        <div key={p.id ?? i} style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: PARTE_TONE_COLOR[p.tone] ?? T.cream }}>{p.text}</span>
        </div>
      ))}
    </>
  );
}

// ── Últimos Movimientos (Dashboard F1) ─────────────────────
function UltimosMovimientos() {
  const [movs, setMovs] = useState<MovimientoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadMovimientos(5);
        if (cancelled) return;
        if (res.success && Array.isArray((res.data as any)?.movimientos)) {
          setMovs((res.data as any).movimientos);
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmtAmount = (m: MovimientoEntry): { txt: string; color: string; sign: '+' | '-' | '' } => {
    const neto = (m.dinero || 0) - (m.gastos || 0);
    if (neto > 0) return { txt: new Intl.NumberFormat('es-ES').format(neto) + ' ₡', color: '#9bd28a', sign: '+' };
    if (neto < 0) return { txt: new Intl.NumberFormat('es-ES').format(Math.abs(neto)) + ' ₡', color: T.bloodLight, sign: '-' };
    return { txt: '0 ₡', color: T.outline, sign: '' };
  };

  const fmtDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso.slice(0, 10);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch { return iso.slice(0, 10); }
  };

  return (
    <div>
      <SmallLabel>Últimos Movimientos</SmallLabel>
      {loading ? (
        <div style={{
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
          color: T.outline, letterSpacing: 1.5, padding: '6px 0',
        }}>CARGANDO…</div>
      ) : movs.length === 0 ? (
        <div style={{
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
          color: T.outline, letterSpacing: 1.5, padding: '6px 0',
        }}>SIN MOVIMIENTOS RECIENTES</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {movs.map((m, i) => {
            const a = fmtAmount(m);
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr auto',
                gap: 8, alignItems: 'baseline',
                padding: '3px 0',
                borderBottom: `1px solid ${T.outlineV}30`,
              }}>
                <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 1 }}>
                  {fmtDate(m.fecha)}
                </span>
                <span style={{
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                  color: T.cream, lineHeight: 1.25,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={m.descripcion}>
                  {m.descripcion || m.tipo || '—'}
                </span>
                <span style={{
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                  color: a.color, fontWeight: 700, letterSpacing: 0.5,
                }}>
                  {a.sign}{a.txt}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export function ComisionPage() {
  const { campaign, roster } = useAppStore();
  const navigate = useNavigate();
  const BASE = import.meta.env.BASE_URL;
  const { isTabletDown, isMobile } = useViewport();

  // NUEVO: Hook del catálogo global
  const { catalog: mechCatalog } = useMechCatalog();

  const mesNombre = MESES[(campaign.campaignMonth ?? 1) - 1] ?? 'Enero';
  const mesAbrev  = mesNombre.slice(0, 3).toUpperCase();
  const heroLabel = `${mesAbrev} · ${campaign.campaignYear ?? 3026} · DISTRITO KAPTEYN`;

  function fmtValor(v: string | undefined): string {
    const n = parseCurrencyValue(v);
    return n === null ? '—' : formatCzar(n);
  }
  const contratoFmt = fmtValor(campaign.contratoValor);
  const valorUnidadFmt = fmtValor(campaign.valorUnidad);

  // Load pilot slots from localStorage
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

  const [mechFileStats, setMechFileStats] = useState<Record<string, MechFileStats>>({});
  
  // Cargar el snapshot del simulador
  const [simSnapshot, setSimSnapshot] = useState<any>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    // Al inicializar, pedimos el JSON asíncronamente (la celda que es la fuente de verdad)
    loadSnapshotFromSheets()
      .then(data => {
        if (!cancelled && data) {
          setSimSnapshot(data);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);
  
  useEffect(() => {
    let cancelled = false;
    const names = Array.from(new Set(roster.map(r => r.mech).filter(Boolean)));
    if (!names.length) return;

    (async () => {
      const loaded: Record<string, MechFileStats> = {};
      for (const mechName of names) {
        const enc = encodeURIComponent(mechName);
        const candidates = [`${BASE}assets/mechs/${enc}.ssw`, `${BASE}assets/mechs/${enc}.mtf`];
        for (const url of candidates) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const text = await res.text();
            loaded[mechName] = parseMechFileStats(text);
            break;
          } catch {
            // ignore fetch errors and try next candidate
          }
        }
      }
      if (!cancelled && Object.keys(loaded).length) {
        setMechFileStats(prev => ({ ...prev, ...loaded }));
      }
    })();

    return () => { cancelled = true; };
  }, [roster, BASE]);

  // Build mech cards from roster
  const mechCards = roster.map((r, i) => {
    const p = slots[i] ?? null;
    if (!p && !r.mech && !r.nombre && !r.apodo) return null;
    try {
      const dmgPct   = p ? calcDamagePct(p) : 0;
      const status   = dmgPct > 30 ? 'REPARACIÓN' : 'READY';
      const mech     = p?.mech || r.mech;
      const nombre   = p?.nombre || r.nombre;
      const key      = mechKey(mech);
      const meta     = MECH_META[key] ?? { weight: 0, bv: 0, cost: 0 };
      const stats    = mech ? mechFileStats[mech] : undefined;
      
      // NUEVO: Buscar en el catálogo global si no hay stats locales del .ssw
      const catMatch = mechCatalog ? findMechByName(mechCatalog.mechs, mech || '') : null;

      // Actualizado para pillar el tonelaje y BV de catMatch también
      const weight   = stats?.tons ?? catMatch?.tons ?? meta.weight;
      const weightClass = mechWeightCategory(weight);
      const bv       = stats?.bv ?? catMatch?.bv2 ?? meta.bv;
      const price    = stats?.cost ?? catMatch?.cost ?? meta.cost;
      
      const apodo       = r.apodo?.trim() || p?.apodo?.trim() || p?.callsign || '?';
      const fullName    = nombre || p?.callsign || '—';
      
      // Prioridad ESTADOMECHS (Configuracion, escrito por simulador slot 5).
      // Match tolerante: substring contra mechs (case-insensitive, longest match).
      let simDamagePct: number | null = null;
      if (campaign.estadoMechs && mech) {
        const target = mech.toLowerCase().trim();
        let best: { k: string; pct: number } | null = null;
        for (const [k, v] of Object.entries(campaign.estadoMechs)) {
          const kl = k.toLowerCase().trim();
          if (target.includes(kl) || kl.includes(target)) {
            if (!best || kl.length > best.k.length) best = { k: kl, pct: Number(v) };
          }
        }
        if (best && Number.isFinite(best.pct)) {
          simDamagePct = Math.max(0, Math.min(100, 100 - best.pct)); // estado% -> daño%
        }
      }
      // Fallback: snapshot del simulador (stub, puede fallar).
      if (simDamagePct === null && simSnapshot) {
        simDamagePct = getMechSimDamage(mech || '', simSnapshot);
      }
      
      return {
        pilot:      fullName,
        call:       apodo,
        chassis:    mech || '—',
        weight,
        weightClass,
        bv,
        price,
        status,
        damage:     dmgPct,
        simDamagePct: simDamagePct,
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

  const bvTotal      = mechCards.reduce((s, c) => s + (c?.bv || 0), 0);
  const personalAct  = roster.filter(isActivo).length;
  const personalTot  = roster.length;
  const bvTotalFmt   = new Intl.NumberFormat('es-ES').format(bvTotal);
  const mechsOpFmt   = `${ready} / ${total}`;
  const personalFmt  = `${personalAct} / ${personalTot}`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isTabletDown ? '1fr' : '1fr 380px',
      minHeight: '100%',
      overflow: isTabletDown ? 'auto' : 'hidden',
      background: T.void, color: T.cream,
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ════ LEFT COLUMN — hero + activos 2×2 ════ */}
      <div style={{
        display: 'grid',
        gridTemplateRows: isTabletDown ? 'auto auto' : '300px 1fr',
        overflow: isTabletDown ? 'visible' : 'hidden',
      }}>

        {/* Hero */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(180deg, ${T.surface} 0%, ${T.void} 100%)`,
          padding: isMobile ? '20px 16px' : isTabletDown ? '24px 24px' : '28px 36px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderBottom: `1px solid ${T.outlineV}`,
          minHeight: isTabletDown ? 'auto' : 300,
        }}>
          {!isTabletDown && (
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
          )}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(10,14,20,0.85) 0%, rgba(10,14,20,0.5) 55%, transparent 100%)` }} />

          <div style={{
            position: 'relative', zIndex: 2,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            height: isTabletDown ? 'auto' : '100%',
            gap: isMobile ? 16 : 24,
            alignItems: isMobile ? 'flex-start' : 'stretch',
          }}>

            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img
                src={`${BASE}KIngKarlKRifle.png`}
                alt="King Karl's Kürassiers"
                style={{
                  height: isMobile ? 140 : isTabletDown ? 180 : 220,
                  width: 'auto',
                  filter: 'brightness(1.15) saturate(1.5) contrast(1.1) drop-shadow(0 0 12px rgba(255,215,155,0.5))',
                  mixBlendMode: 'normal',
                  opacity: 1,
                }}
              />
            </div>

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
                  fontSize: isMobile ? 26 : isTabletDown ? 32 : 44,
                  fontWeight: 800,
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

              <button
                onClick={() => navigate('/finanzas')}
                title="Ir a Finanzas"
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : isTabletDown ? 'repeat(3, minmax(110px, 1fr))' : 'repeat(3, minmax(160px, 1fr))',
                  columnGap: isMobile ? 12 : isTabletDown ? 18 : 24,
                  rowGap: isMobile ? 10 : 12,
                  padding: isMobile ? '12px 14px' : '14px 20px 22px',
                  marginTop: isMobile ? 16 : 0,
                  background: 'rgba(199,151,100,0.05)',
                  border: '1px solid #c79764',
                  borderLeft: '2px solid #c79764',
                  borderRight: '2px solid #c79764',
                  cursor: 'pointer',
                  position: 'relative',
                  textAlign: 'left',
                  fontFamily: 'inherit', color: 'inherit',
                  transition: 'background 0.15s, border-color 0.15s',
                  width: '100%', maxWidth: 720,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(199,151,100,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(199,151,100,0.05)'; }}
              >
                <span style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTop: '2px solid #c79764', borderLeft: '2px solid #c79764' }} />
                <span style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderTop: '2px solid #c79764', borderRight: '2px solid #c79764' }} />
                <span style={{ position: 'absolute', bottom: -1, left: -1, width: 8, height: 8, borderBottom: '2px solid #c79764', borderLeft: '2px solid #c79764' }} />
                <span style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottom: '2px solid #c79764', borderRight: '2px solid #c79764' }} />

                {([
                  ['Tesoreria',          contratoFmt],
                  ['BV Total',           bvTotalFmt],
                  ['Mechs Operativos',   mechsOpFmt],
                  ['Valor de la Unidad', valorUnidadFmt],
                  ['Lanza',              String(campaign.totalMechs || '—')],
                  ['Personal',           personalFmt],
                ] as [string, string][]).map(([k, v], i) => (
                  <div key={i} style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 8.5, color: '#c79764', letterSpacing: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.toUpperCase()}</div>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontSize: isMobile ? 14 : isTabletDown ? 15 : 17,
                      fontWeight: 700, color: T.creamHi, marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }} title={v}>{v}</div>
                  </div>
                ))}

                <div style={{
                  position: 'absolute', bottom: 4, right: 10,
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 8,
                  color: '#c79764', letterSpacing: 2, opacity: 0.7,
                }}>FINANZAS →</div>
              </button>
            </div>
          </div>
        </div>

        {/* Activos 2×2 */}
        <div style={{
          padding: isMobile ? '14px 16px 20px' : isTabletDown ? '16px 24px 20px' : '18px 32px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
          overflow: isTabletDown ? 'visible' : 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SmallLabel>Lanza Prime</SmallLabel>
            <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.outline, letterSpacing: 2 }}>
              {lanzaStatus}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : isTabletDown ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? 8 : 10,
            flex: isTabletDown ? 'none' : 1,
            alignContent: 'start',
          }}>
            {mechCards.map((c, i) => c ? (
              <MechAsset key={i}
                pilot={c.pilot} call={c.call}
                chassis={c.chassis} weight={c.weight} weightClass={c.weightClass} bv={c.bv} price={c.price}
                status={c.status} damage={c.damage} simDamagePct={c.simDamagePct}
                img={c.img} imgScale={c.imgScale} imgOffsetX={c.imgOffsetX}
              />
            ) : (
              <div key={i} style={{
                background: T.surfaceLow, borderLeft: `2px solid ${T.outlineV}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Share Tech Mono", monospace', fontSize: 8.5,
                color: T.outline, letterSpacing: 1.5, minHeight: 90,
              }}>SLOT VACÍO</div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ RIGHT COLUMN — ops panel ════ */}
      <div style={{
        background: T.surface,
        borderLeft: isTabletDown ? 'none' : `1px solid ${T.outlineV}`,
        borderTop:  isTabletDown ? `1px solid ${T.outlineV}` : 'none',
        padding: isMobile ? '18px 16px 20px' : isTabletDown ? '20px 24px 24px' : '22px 26px 24px',
        display: 'flex', flexDirection: 'column', gap: 22,
        overflow: 'hidden',
      }}>

        <OrdenDelDia />
        <UltimaCronica />
        <UltimosMovimientos />

        <div style={{ marginTop: 'auto' }}>
          <SmallLabel>Parte Diario</SmallLabel>
          <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.bone, lineHeight: 1.8, letterSpacing: 0.5 }}>
            <ParteDiario />
          </div>
          {(() => {
            // Estado global = media de estado% por mech (100 - damage%).
            // Lee de ESTADOMECHS si esta, fallback a calculo desde mechCards.
            const estados: number[] = mechCards
              .map(c => (c && typeof c.simDamagePct === 'number') ? Math.max(0, 100 - c.simDamagePct) : null)
              .filter((x): x is number => x !== null);
            const avg = estados.length > 0
              ? Math.round(estados.reduce((a, b) => a + b, 0) / estados.length)
              : null;
            const color = avg === null ? T.outline
              : avg >= 80 ? T.gold
              : avg >= 50 ? T.cream
              : T.bloodLight;
            return (
              <div style={{
                marginTop: 12, padding: '10px 12px', background: T.void,
                borderLeft: `2px solid ${T.gold}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}>
                <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 2 }}>
                  ESTADO DE LA UNIDAD
                </span>
                <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 800, color, letterSpacing: -0.3 }}>
                  {avg ?? '—'}<span style={{ fontSize: 11, color: T.outline }}> /100</span>
                </span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
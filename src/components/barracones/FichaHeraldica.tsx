// ══════════════════════════════════════════════════════════════
//  FICHA HERÁLDICA — P1 Pergamino Encuadernado
//  Implementación React del diseño "Barracones - Ficha D+B.html"
//  Variante P1: Frame heráldico dorado + hoja de pergamino crema.
// ══════════════════════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pilot } from '@/lib/barracones-types';
import { getDossierForOrigin } from '@/data/faction-dossier';
import {
  calcHp, getVeterancy,
  SKILLS_CATALOG, QUIRKS_DATABASE, ARMOR_TABLE,
  attrUpgradeCost, skillUpgradeCost,
  ATTR_LABELS, calcAttrAvg, calcTIR,
} from '@/lib/barracones-data';
import { INFANTRY_WEAPON_TABLE } from '@/lib/barracones-weapons';

const BASE = import.meta.env.BASE_URL;

// ── Tamaño de diseño original (px) ──
const DW = 1440;
const DH = 900;

// ── Paleta ──
const C = {
  gold:    '#e8c06a',
  goldDim: '#b08a3a',
  goldDeep:'#6b4a1a',
  cream:   '#d8ccb5',
  red:     '#a13a2b',
  redDeep: '#6b1f15',
  void:    '#0a0d12',
  void2:   '#10141a',
};

// ── Estilos tabla ──
const TH: React.CSSProperties = {
  padding: '3px 2px', textAlign: 'left',
  fontSize: 9, letterSpacing: 2,
  fontFamily: '"Share Tech Mono", monospace',
  color: '#6b4a1a', textTransform: 'uppercase',
};
const TD: React.CSSProperties = {
  padding: '3px 2px', color: '#1a1208',
  fontFamily: '"Special Elite", monospace', fontSize: 11.5,
};
const CHECK_BOX: React.CSSProperties = {
  display: 'inline-grid', placeItems: 'center',
  width: 14, height: 14,
  border: '1px solid #1a1208',
  fontSize: 10, lineHeight: 1, color: '#1a1208', flexShrink: 0,
};
const CHECK_ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
};

// ─── Sub-componentes ────────────────────────────────────────

function HandField({ label, val, big }: { label: string; val: string | number; big?: boolean }) {
  return (
    <div style={{ borderBottom: '1px dotted #1a120866', paddingBottom: 2 }}>
      <div style={{
        fontSize: 8, letterSpacing: 3, color: '#6b4a1a',
        fontFamily: '"Share Tech Mono", monospace', textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: big ? '"Caveat", "Special Elite", cursive' : '"Special Elite", monospace',
        fontSize: big ? 22 : 13,
        color: big ? C.redDeep : '#1a1208',
        lineHeight: 1.1,
      }}>
        {val || '—'}
      </div>
    </div>
  );
}

function SectionHead({ num, title, tail, center }: {
  num: string; title: string; tail?: string; center?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: center ? 'center' : 'space-between',
      alignItems: 'baseline',
      gap: 8, borderBottom: '1px solid #1a1208', paddingBottom: 2,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: 9, letterSpacing: 3, color: '#6b4a1a',
        }}>§ {num}</span>
        <span style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: 15, fontStyle: 'italic',
          color: C.redDeep, fontWeight: 700, letterSpacing: 1,
        }}>
          {title}
        </span>
      </div>
      {tail && (
        <span style={{
          fontFamily: '"Special Elite", monospace',
          fontSize: 9, color: '#6b4a1a', fontStyle: 'italic',
        }}>{tail}</span>
      )}
    </div>
  );
}

function AttrBox({ k, v, upgrades = 0, onUpgrade }: { k: string; v: number; upgrades?: number; onUpgrade?: () => void }) {
  return (
    <div
      onClick={onUpgrade}
      style={{
        border: '1.5px solid #1a1208', padding: '3px 4px', textAlign: 'center',
        background: '#d4c59a33', cursor: onUpgrade ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 8, letterSpacing: 2, color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace' }}>{k}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, flexShrink: 0 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 6, height: 6,
              border: '1px solid #6b4a1a',
              background: i < upgrades ? '#6b4a1a' : 'transparent',
            }} />
          ))}
        </div>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 26, fontWeight: 700, lineHeight: 1, color: C.redDeep }}>{v}</div>
      </div>
    </div>
  );
}

function PipsParch({ n, max }: { n: number; max: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < n ? '#1a1208' : 'transparent',
          border: '1px solid #1a1208',
        }} />
      ))}
    </div>
  );
}

function ParchmentBody({ hp, pilotImg }: {
  hp: { loc: string; label: string; max: number; dmg: number }[];
  pilotImg?: string;
}) {
  const total = hp.reduce((a, b) => a + b.max, 0);
  const dmg   = hp.reduce((a, b) => a + b.dmg, 0);

  const damageMarks = (
    <svg viewBox="0 0 100 190" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {hp.map((h, i) => {
        if (!h.dmg) return null;
        const pos = [[50,12],[50,70],[24,80],[78,80],[42,150],[58,150]][i];
        if (!pos) return null;
        return (
          <g key={h.loc} transform={`translate(${pos[0]} ${pos[1]})`}>
            {Array.from({ length: Math.min(h.dmg, 5) }).map((_, j) => (
              <line key={j} x1="-4" y1={-4 + j * 1.5} x2="4" y2={-3 + j * 1.5}
                stroke={C.redDeep} strokeWidth="0.8" />
            ))}
          </g>
        );
      })}
    </svg>
  );

  return (
    <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '88px 1fr', gap: 10 }}>
      {/* Foto piloto o SVG silueta */}
      <div style={{ width: 88, height: 190, position: 'relative', overflow: 'hidden', border: '1px solid #1a120833' }}>
        {pilotImg ? (
          <>
            <img src={pilotImg} alt="Piloto" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
            {damageMarks}
          </>
        ) : (
          <svg viewBox="0 0 100 190" style={{ width: 88 }}>
            <g stroke="#1a1208" strokeWidth="1.2" fill="none">
              <circle cx="50" cy="15" r="11" />
              <path d="M 35 28 L 65 28 L 72 80 L 62 110 L 38 110 L 28 80 Z"
                fill={hp[1]?.dmg ? '#a13a2b22' : 'none'} />
              <path d="M 35 30 L 20 70 L 18 100 L 24 100 L 32 72"
                fill={hp[2]?.dmg ? '#a13a2b22' : 'none'} />
              <path d="M 65 30 L 80 70 L 82 100 L 76 100 L 68 72"
                fill={hp[3]?.dmg ? '#a13a2b22' : 'none'} />
              <path d="M 38 110 L 36 170 L 48 170 L 50 115 Z"
                fill={hp[4]?.dmg ? '#a13a2b22' : 'none'} />
              <path d="M 62 110 L 64 170 L 52 170 L 50 115 Z"
                fill={hp[5]?.dmg ? '#a13a2b22' : 'none'} />
            </g>
            {damageMarks}
          </svg>
        )}
      </div>

      {/* Tabla HP */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
        {hp.map(h => (
          <div key={h.loc} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 6,
            fontSize: 10.5, borderBottom: '1px dotted #1a120855', padding: '1.5px 0',
            fontFamily: '"Special Elite", monospace',
          }}>
            <span style={{ color: '#1a1208' }}>{h.label.toLowerCase()}</span>
            <span style={{
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontSize: 13, fontWeight: 700,
              color: h.dmg > 0 ? C.redDeep : '#1a1208',
            }}>
              {h.max - h.dmg}/{h.max}
            </span>
          </div>
        ))}
        <div style={{
          marginTop: 4, paddingTop: 4, borderTop: '2px solid #1a1208',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{
            fontSize: 9, letterSpacing: 2, color: '#6b4a1a',
            fontFamily: '"Share Tech Mono", monospace',
          }}>TOTAL</span>
          <span style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 18, fontStyle: 'italic', color: C.redDeep, fontWeight: 700,
          }}>
            {total - dmg}/{total}
          </span>
        </div>
      </div>
    </div>
  );
}

function ParchmentSeal({ callsign, nombre, rank, crestAsset, crestScale = 1, crestOffsetY = 0 }: {
  callsign: string; nombre: string; rank: string; crestAsset: string | null; crestScale?: number; crestOffsetY?: number;
}) {
  const monogram = callsign ? callsign[0].toUpperCase() : (nombre ? nombre[0].toUpperCase() : 'K');
  const ringText = `· ${rank.toUpperCase()} · ${nombre.split(' ').slice(-1)[0].toUpperCase()} · ${callsign.toUpperCase()} ·`;
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx="60" cy="60" r="58" fill="#6b4a1a22" stroke="#1a1208" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1208"
          strokeWidth="0.6" strokeDasharray="2 3" opacity="0.6" />
        <circle cx="60" cy="60" r="38" fill="#c8b88a" stroke={C.redDeep} strokeWidth="1.5" />
        {[0, 90, 180, 270].map(a => (
          <line key={a} x1="60" y1="2" x2="60" y2="12"
            transform={`rotate(${a} 60 60)`} stroke="#1a1208" strokeWidth="1.2" />
        ))}
        <defs>
          <path id="sealring-fh"
            d="M 60 60 m -45 0 a 45 45 0 1 1 90 0 a 45 45 0 1 1 -90 0" />
        </defs>
        <text style={{ font: '7.5px "Share Tech Mono", monospace' }} fill="#1a1208" letterSpacing="2">
          <textPath href="#sealring-fh" startOffset="0">{ringText}</textPath>
        </text>
      </svg>
      <div style={{
        position: 'absolute', top: 22, left: 22, width: 76, height: 76,
        display: 'grid', placeItems: 'center',
      }}>
        {crestAsset ? (
          <img
            src={`${BASE}${crestAsset}`}
            alt=""
            style={{ width: 56 * crestScale, height: 56 * crestScale, objectFit: 'contain', filter: 'sepia(0.4) contrast(1.1)', transform: `translateY(${crestOffsetY}px)` }}
          />
        ) : (
          <span style={{
            fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, fontStyle: 'italic',
            fontSize: 58, color: C.redDeep, lineHeight: 1,
            textShadow: '1px 1px 0 #00000022',
          }}>{monogram}</span>
        )}
      </div>
    </div>
  );
}

function VetStamp({ children }: { children: string }) {
  return (
    <div style={{
      display: 'inline-block', padding: '4px 16px',
      border: `2.5px solid ${C.redDeep}`, color: C.redDeep,
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: 16, letterSpacing: 8, fontWeight: 700,
      transform: 'rotate(-4deg)', opacity: 0.75,
      background: `repeating-linear-gradient(
        135deg, transparent 0 2px, #c8b88a66 2px 3px
      )`,
    }}>
      {children}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────

const RANGED_WEAPONS = INFANTRY_WEAPON_TABLE.filter(w =>
  ['pistola', 'rifle', 'arco'].includes(w.tipo.toLowerCase())
);
const MELEE_WEAPONS = INFANTRY_WEAPON_TABLE.filter(w =>
  ['melee', 'espada', 'granada'].includes(w.tipo.toLowerCase())
);

export function FichaHeraldica({ pilot, pilotImg, onAddQuirk, onSetWeapon, onSetArmadura, onSetArmadura2, onSetNotas, onUpgradeSkill, onUpgradeAttr, onAddSkill }: {
  pilot: Pilot;
  pilotImg?: string;
  onAddQuirk?:     (quirkId: string, mechName: string) => void;
  onSetWeapon?:    (idx: number, slot: Partial<Pilot['armas'][0]>) => void;
  onSetArmadura?:  (a: Pilot['armadura'])  => void;
  onSetArmadura2?: (a: Pilot['armadura2']) => void;
  onSetNotas?:     (v: string) => void;
  onUpgradeSkill?: (nombre: string, cost: number) => void;
  onUpgradeAttr?:  (attr: 'fue' | 'des' | 'int' | 'car', cost: number) => void;
  onAddSkill?:     (nombre: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const [showPicker, setShowPicker]     = useState(false);
  const [pickQuirkId, setPickQuirkId]   = useState('');
  const [pickMech, setPickMech]         = useState('');

  type AttrKey = 'fue' | 'des' | 'int' | 'car';
  const [attrPopup, setAttrPopup]     = useState<AttrKey | null>(null);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [pickSkillName, setPickSkillName]     = useState('');

  // Extrae el chasis eliminando el código de variante (ej. "Marauder MAD-3D" → "Marauder")
  function extractChassis(mech: string): string {
    return mech.replace(/\s+[A-Z]{2,5}-\d[A-Za-z]?\s*$/, '').trim();
  }

  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(w / DW);
    });
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Data transformations ──────────────────────────────────

  const hp = calcHp(pilot.fue).map(h => ({
    ...h,
    dmg: pilot.hpDmg[h.loc] ?? 0,
  }));

  const baseAttr = {
    fue: pilot.fue - (pilot.attrUpgrades?.fue ?? 0),
    des: pilot.des - (pilot.attrUpgrades?.des ?? 0),
    int: pilot.int - (pilot.attrUpgrades?.int ?? 0),
    car: pilot.car - (pilot.attrUpgrades?.car ?? 0),
  };

  const attrAvg = calcAttrAvg(baseAttr.fue, baseAttr.des, baseAttr.int, baseAttr.car);

  const skills = pilot.habilidades.map(s => {
    const def = SKILLS_CATALOG.find(sc => sc.nombre === s.nombre);
    const attrKey = def?.attr ?? 'des';
    return {
      nombre: s.nombre,
      attr: attrKey.toUpperCase(),
      nivel: s.nivel,
      upgrades: s.upgrades ?? 0,
      tir: calcTIR(attrAvg, s.nivel),
    };
  });

  const quirks = pilot.quirks.map(q => {
    const pos = QUIRKS_DATABASE.positivos.find(d => d.id === q.quirkId);
    const neg = QUIRKS_DATABASE.negativos.find(d => d.id === q.quirkId);
    const def = pos || neg;
    return {
      q: def?.nombre ?? q.quirkId,
      efecto: `${def?.efecto ?? ''} (${q.mechName})`,
      isPos: !!pos,
    };
  });

  const armaduras = [pilot.armadura, pilot.armadura2]
    .filter(a => a.tipo)
    .map(a => {
      const row = ARMOR_TABLE.find(at => at.nombre === a.tipo);
      return {
        tipo:   a.tipo,
        zonas:  row?.zonas ?? '',
        bonus:  row?.bonus ?? 0,
        piezas: a.piezas,
      };
    });

  const armas = pilot.armas.filter(a => a.nombre);

  const vet = getVeterancy(pilot.xpTotal);
  const dossier = getDossierForOrigin(pilot.origen);
  const serial = `${dossier.filePrefix}-${pilot.id.slice(0, 4).toUpperCase()}-K`;
  const rank = vet.nombre.toUpperCase();

  // ── Render ───────────────────────────────────────────────

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: DH * scale, overflow: 'hidden' }}>
      <div style={{
        width: DW, height: DH,
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
        position: 'relative', overflow: 'hidden',
        background: `
          radial-gradient(ellipse at top, #1a1410 0%, ${C.void} 60%),
          linear-gradient(180deg, ${C.void2} 0%, ${C.void} 100%)
        `,
        fontFamily: '"Special Elite", "Share Tech Mono", monospace',
        color: C.cream,
      }}>

        {/* ═ Frame heráldico dorado ═ */}
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 3,
        }}>
          <rect x="20" y="20" width="1400" height="860"
            fill="none" stroke={C.goldDeep} strokeWidth="1" />
          <rect x="28" y="28" width="1384" height="844"
            fill="none" stroke={C.gold} strokeWidth="0.5" opacity="0.5" />
          {([[40,40,0],[1400,40,90],[1400,860,180],[40,860,270]] as [number,number,number][])
            .map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
                <path d="M 0 0 L 30 0 M 0 0 L 0 30 M 0 0 L 22 22"
                  stroke={C.gold} strokeWidth="0.8" fill="none" />
                <circle cx="0" cy="0" r="3" fill={C.gold} />
              </g>
          ))}
        </svg>

        {/* Top motto */}
        <div style={{
          position: 'absolute', top: 40, left: 100, right: 100, height: 28,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
          letterSpacing: 8, color: C.goldDim, zIndex: 4,
        }}>
          <span>◆ {dossier.militaryAcronym}</span>
          <span style={{
            fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
            fontSize: 14, letterSpacing: 4, color: C.gold,
          }}>— · {dossier.dossierTitle} · —</span>
          <span>◆ Anno Domini MMMXXVI</span>
        </div>

        {/* ═ PERGAMINO INTERIOR ═ */}
        <div style={{
          position: 'absolute', top: 82, left: 60, right: 60, bottom: 50,
          zIndex: 2,
          backgroundColor: '#c8b88a',
          backgroundImage: `
            radial-gradient(circle at 15% 30%, #8a7a4522 0%, transparent 20%),
            radial-gradient(circle at 80% 70%, #6b4a1a22 0%, transparent 25%),
            radial-gradient(circle at 50% 50%, #a08a5011 0%, transparent 60%),
            radial-gradient(ellipse at 20% 10%, #d4c59a 0%, #c8b88a 40%, #b8a775 100%)
          `,
          boxShadow: `inset 0 0 60px #6b4a1a55, inset 0 0 0 1px #6b4a1a, 0 4px 20px #00000088`,
          padding: '16px 20px',
          color: '#1a1208',
          overflow: 'hidden',
        }}>

          {/* Manchas envejecimiento */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(circle at 88% 14%, #6b4a1a33 0%, transparent 4%),
              radial-gradient(circle at 10% 85%, #6b4a1a22 0%, transparent 3%),
              radial-gradient(circle at 55% 90%, #6b4a1a22 0%, transparent 2%)
            `,
          }} />

          {/* ─── HEADER DEL PERGAMINO ─── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16,
            alignItems: 'center', paddingBottom: 12,
            borderBottom: '2px solid #1a1208',
            position: 'relative', zIndex: 2,
          }}>
            <div style={{
              fontSize: 10, letterSpacing: 4,
              fontFamily: '"Share Tech Mono", monospace',
            }}>
              {dossier.militaryName}
              <div style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 22, fontStyle: 'italic', letterSpacing: 2,
                color: C.redDeep, marginTop: 4,
              }}>
                Dossier Personal · N.º {serial}
              </div>
            </div>

            <ParchmentSeal callsign={pilot.callsign} nombre={pilot.nombre} rank={rank} crestAsset={dossier.crestAsset} crestScale={dossier.crestScale} crestOffsetY={dossier.crestOffsetY} />

            <div style={{
              textAlign: 'right', fontSize: 10, letterSpacing: 4,
              fontFamily: '"Share Tech Mono", monospace',
            }}>
              CLEARANCE · HAZEL (∆)
              <div style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 22, fontStyle: 'italic', letterSpacing: 2,
                color: C.redDeep, marginTop: 4,
              }}>
                {rank}
              </div>
            </div>
          </div>

          {/* ─── IDENTIDAD ─── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
            padding: '10px 40px 8px',
            borderBottom: '1px dashed #1a120866',
            position: 'relative', zIndex: 2,
          }}>
            <HandField label="Apodo" val={pilot.callsign || '—'} big />
            <HandField label="Nombre legal" val={pilot.nombre || '—'} big />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <HandField label="Sexo"   val={pilot.sexo  || '—'} />
              <HandField label="Edad"   val={pilot.edad  || '—'} />
              <HandField label="Altura" val={pilot.altura || '—'} />
              <HandField label="Peso"   val={pilot.peso  || '—'} />
            </div>
            <HandField label="Battlemech asignado" val={pilot.mech || '—'} />
          </div>

          {/* ─── CUERPO A 3 COLUMNAS ─── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.1fr 0.95fr 1.1fr',
            gap: 20, padding: '10px 0 0',
            position: 'relative', zIndex: 2,
            height: 'calc(100% - 186px)', overflow: 'hidden',
          }}>

            {/* IZQUIERDA · Atributos + Habilidades */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
              <SectionHead num="I" title="Atributos" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                <AttrBox k="FUE" v={pilot.fue} upgrades={pilot.attrUpgrades?.fue ?? 0} onUpgrade={onUpgradeAttr ? () => setAttrPopup('fue') : undefined} />
                <AttrBox k="DES" v={pilot.des} upgrades={pilot.attrUpgrades?.des ?? 0} onUpgrade={onUpgradeAttr ? () => setAttrPopup('des') : undefined} />
                <AttrBox k="INT" v={pilot.int} upgrades={pilot.attrUpgrades?.int ?? 0} onUpgrade={onUpgradeAttr ? () => setAttrPopup('int') : undefined} />
                <AttrBox k="CAR" v={pilot.car} upgrades={pilot.attrUpgrades?.car ?? 0} onUpgrade={onUpgradeAttr ? () => setAttrPopup('car') : undefined} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHead num="II" title="Habilidades" tail="TIR = ATR − NIVEL" />
                {onAddSkill && (() => {
                  const atMax = pilot.habilidades.length >= pilot.int;
                  return (
                    <button
                      onClick={() => { if (!atMax) { setPickSkillName(''); setShowSkillPicker(true); } }}
                      title={atMax ? `Máx habilidades (INT ${pilot.int})` : `Añadir habilidad (${pilot.habilidades.length}/${pilot.int})`}
                      style={{
                        width: 16, height: 16, flexShrink: 0,
                        border: `1px solid ${atMax ? '#1a120844' : C.redDeep}`,
                        background: 'transparent',
                        color: atMax ? '#1a120844' : C.redDeep,
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 13, lineHeight: 1,
                        cursor: atMax ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >+</button>
                  );
                })()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <table style={{
                  width: '100%', borderCollapse: 'collapse',
                  fontFamily: '"Special Elite", monospace', fontSize: 11,
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1208' }}>
                      <th style={TH}>disciplina</th>
                      <th style={{ ...TH, width: 36, textAlign: 'center' }}>atr</th>
                      <th style={{ ...TH, width: 50, textAlign: 'center' }}>niv</th>
                      <th style={{ ...TH, width: 30, textAlign: 'center' }}>tir</th>
                      {onUpgradeSkill && <th style={{ ...TH, width: 18 }} />}
                    </tr>
                  </thead>
                  <tbody>
                    {skills.length === 0 && (
                      <tr>
                        <td colSpan={onUpgradeSkill ? 5 : 4} style={{ ...TD, color: '#6b4a1a', fontStyle: 'italic', padding: '8px 2px' }}>
                          Sin habilidades registradas
                        </td>
                      </tr>
                    )}
                    {skills.map((s, idx) => {
                      const upgCost = skillUpgradeCost(s.nivel);
                      const canUp   = s.nivel < 6 && pilot.xpDisponible >= upgCost;
                      return (
                      <tr key={idx} style={{ borderBottom: '1px dotted #1a120855' }}>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, flexShrink: 0 }}>
                              {[0,1,2,3].map(i => (
                                <div key={i} style={{
                                  width: 6, height: 6,
                                  border: '1px solid #6b4a1a',
                                  background: i < s.upgrades ? '#6b4a1a' : 'transparent',
                                }} />
                              ))}
                            </div>
                            {s.nombre}
                          </div>
                        </td>
                        <td style={{ ...TD, textAlign: 'center', color: '#6b4a1a', fontSize: 10 }}>{s.attr}</td>
                        <td style={{ ...TD, textAlign: 'center' }}>
                          <PipsParch n={s.nivel} max={9} />
                        </td>
                        <td style={{
                          ...TD, textAlign: 'center',
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: 15, fontStyle: 'italic', color: C.redDeep, fontWeight: 700,
                        }}>
                          {s.tir}
                        </td>
                        {onUpgradeSkill && (
                          <td style={{ ...TD, textAlign: 'center', padding: '2px 0' }}>
                            <button
                              onClick={() => canUp && onUpgradeSkill(s.nombre, upgCost)}
                              title={canUp ? `+1 niv · −${upgCost} XP` : s.nivel >= 6 ? 'Máx' : `XP insuf. (${upgCost})`}
                              style={{
                                width: 16, height: 16,
                                border: `1px solid ${canUp ? C.redDeep : '#1a120844'}`,
                                background: 'transparent',
                                color: canUp ? C.redDeep : '#1a120844',
                                fontFamily: '"Share Tech Mono", monospace',
                                fontSize: 12, lineHeight: 1,
                                cursor: canUp ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >+</button>
                          </td>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CENTRO · HP + Quirks + VetStamp */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              minHeight: 0, alignItems: 'center',
            }}>
              <SectionHead num="III" title="Condición física" center />
              <ParchmentBody hp={hp} pilotImg={pilotImg} />

              {/* Quirks header + botón "+" */}
              <div style={{ position: 'relative', width: '100%' }}>
                <SectionHead num="VI" title="Chasis · Quirks" center />
                {onAddQuirk && (
                  <button
                    onClick={() => { setPickMech(extractChassis(pilot.mech || '')); setShowPicker(true); }}
                    style={{
                      position: 'absolute', top: 0, right: 0,
                      width: 16, height: 16,
                      background: 'transparent',
                      border: '1px solid #6b4a1a',
                      color: '#6b4a1a',
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: 11, lineHeight: 1,
                      cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                )}
              </div>
              <div style={{ width: '100%' }}>
                {quirks.length === 0 && (
                  <div style={{ ...TD, color: '#6b4a1a', fontStyle: 'italic' }}>
                    Sin quirks de mech
                  </div>
                )}
                {quirks.map((q, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 6, alignItems: 'baseline',
                    padding: '2px 0', borderBottom: '1px dotted #1a120855',
                  }}>
                    <span style={{
                      fontSize: 14, lineHeight: 1,
                      color: q.isPos ? C.redDeep : '#1a1208',
                    }}>
                      {q.isPos ? '✓' : '✗'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: '#1a1208',
                        fontFamily: '"Special Elite", monospace',
                      }}>{q.q}</div>
                      <div style={{
                        fontSize: 9.5, color: '#6b4a1a', fontStyle: 'italic',
                        fontFamily: '"Cormorant Garamond", serif',
                      }}>{q.efecto}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <VetStamp>{vet.nombre.toUpperCase()}</VetStamp>
              </div>
            </div>

            {/* DERECHA · Armamento + Armadura + Méritos/Defectos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
              <SectionHead num="IV" title="Armamento" tail={`${pilot.armas.filter(a => a.nombre).length} pertrechos`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pilot.armas.map((slot, i) => {
                  const isMelee = i >= 3;
                  const opts = isMelee ? MELEE_WEAPONS : RANGED_WEAPONS;
                  const groups = [...new Set(opts.map(w => w.tipo))];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px dotted #1a120855', padding: '2px 0' }}>
                      <span style={{ ...TD, color: '#6b4a1a', fontSize: 9, width: 22, flexShrink: 0 }}>
                        {isMelee ? `C${i - 2}` : `A${i + 1}`}
                      </span>
                      <select
                        value={slot.nombre}
                        onChange={e => onSetWeapon?.(i, { nombre: e.target.value, munActual: slot.munActual })}
                        style={{
                          flex: 1, height: 20,
                          background: '#d4c59a', border: '1px solid #6b4a1a88',
                          color: '#1a1208', fontFamily: '"Special Elite", monospace',
                          fontSize: 10, padding: '0 2px', outline: 'none',
                          cursor: onSetWeapon ? 'pointer' : 'default',
                        }}
                        disabled={!onSetWeapon}
                      >
                        <option value="">— ninguna —</option>
                        {groups.map(g => (
                          <optgroup key={g} label={g}>
                            {opts.filter(w => w.tipo === g).map(w => (
                              <option key={w.name} value={w.name}>{w.name} ({w.dmg})</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {!isMelee && slot.nombre && (
                        <input
                          type="number" min={0} value={slot.munActual}
                          onChange={e => onSetWeapon?.(i, { munActual: parseInt(e.target.value) || 0 })}
                          disabled={!onSetWeapon}
                          style={{
                            width: 34, height: 20, flexShrink: 0,
                            background: '#d4c59a', border: '1px solid #6b4a1a88',
                            color: C.redDeep, fontFamily: '"Cormorant Garamond", serif',
                            fontSize: 13, fontStyle: 'italic', fontWeight: 700,
                            textAlign: 'center', padding: 0, outline: 'none',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <SectionHead num="V" title="Armadura corporal" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {([
                  { slot: pilot.armadura,  label: '①', setter: onSetArmadura  },
                  { slot: pilot.armadura2, label: '②', setter: onSetArmadura2 },
                ] as const).map(({ slot, label, setter }) => {
                  const row = ARMOR_TABLE.find(a => a.nombre === slot?.tipo);
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px dotted #1a120855', padding: '2px 0' }}>
                      <span style={{ ...TD, color: '#6b4a1a', fontSize: 9, width: 14, flexShrink: 0 }}>{label}</span>
                      <select
                        value={slot?.tipo ?? ''}
                        onChange={e => setter?.({ tipo: e.target.value, piezas: slot?.piezas ?? 0 })}
                        style={{
                          flex: 1, height: 20,
                          background: '#d4c59a', border: '1px solid #6b4a1a88',
                          color: '#1a1208', fontFamily: '"Special Elite", monospace',
                          fontSize: 10, padding: '0 2px', outline: 'none',
                          cursor: setter ? 'pointer' : 'default',
                        }}
                        disabled={!setter}
                      >
                        <option value="">— sin armadura —</option>
                        {ARMOR_TABLE.map(a => (
                          <option key={a.nombre} value={a.nombre}>{a.nombre} +{a.bonus}</option>
                        ))}
                      </select>
                      {slot?.tipo && (
                        <>
                          <span style={{ fontSize: 8, color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace', flexShrink: 0 }}>{row?.zonas}</span>
                          <input
                            type="number" min={0} max={99} value={slot.piezas}
                            onChange={e => setter?.({ tipo: slot.tipo, piezas: parseInt(e.target.value) || 0 })}
                            disabled={!setter}
                            style={{
                              width: 28, height: 20, flexShrink: 0,
                              background: '#d4c59a', border: '1px solid #6b4a1a88',
                              color: C.redDeep, fontFamily: '"Cormorant Garamond", serif',
                              fontSize: 13, fontStyle: 'italic', fontWeight: 700,
                              textAlign: 'center', padding: 0, outline: 'none',
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <SectionHead num="VII" title="Méritos &amp; Defectos" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{
                    fontSize: 9, letterSpacing: 3, color: '#6b4a1a',
                    fontFamily: '"Share Tech Mono", monospace', marginBottom: 2,
                  }}>MÉRITOS</div>
                  {pilot.meritos.length === 0 && (
                    <span style={{ ...TD, fontSize: 10, color: '#6b4a1a', fontStyle: 'italic' }}>—</span>
                  )}
                  {pilot.meritos.map(m => (
                    <label key={m} style={CHECK_ROW}>
                      <span style={CHECK_BOX}>✓</span>
                      <span style={{ fontSize: 11 }}>{m}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <div style={{
                    fontSize: 9, letterSpacing: 3, color: '#6b4a1a',
                    fontFamily: '"Share Tech Mono", monospace', marginBottom: 2,
                  }}>DEFECTOS</div>
                  {pilot.defectos.length === 0 && (
                    <span style={{ ...TD, fontSize: 10, color: '#6b4a1a', fontStyle: 'italic' }}>—</span>
                  )}
                  {pilot.defectos.map(m => (
                    <label key={m} style={CHECK_ROW}>
                      <span style={{ ...CHECK_BOX, color: C.redDeep }}>✗</span>
                      <span style={{ fontSize: 11 }}>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {onSetNotas && (
                <>
                  <SectionHead num="VIII" title="Rasgos &amp; Notas" />
                  <textarea
                    value={pilot.notas}
                    onChange={e => onSetNotas(e.target.value)}
                    placeholder="Equipo adicional, rasgos especiales…"
                    style={{
                      width: '100%', flex: 1, minHeight: 48, boxSizing: 'border-box',
                      background: '#d4c59a55', border: '1px dotted #6b4a1a',
                      color: '#1a1208', fontFamily: '"Special Elite", monospace',
                      fontSize: 10.5, lineHeight: 1.55, padding: '4px 6px',
                      outline: 'none', resize: 'none',
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quirk picker — portal para escapar del transform:scale */}
        {showPicker && onAddQuirk && createPortal(
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(10,13,18,0.72)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setShowPicker(false)}
          >
            <div
              style={{
                background: '#c8b88a',
                backgroundImage: 'radial-gradient(ellipse at 20% 10%, #d4c59a 0%, #c8b88a 40%, #b8a775 100%)',
                border: '2px solid #6b4a1a',
                boxShadow: '0 4px 32px #00000099, inset 0 0 0 1px #6b4a1a55',
                padding: '22px 28px',
                minWidth: 340,
                fontFamily: '"Special Elite", monospace',
                color: '#1a1208',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Título */}
              <div style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 17, fontStyle: 'italic', color: C.redDeep,
                fontWeight: 700, marginBottom: 18,
                borderBottom: '1px solid #1a1208', paddingBottom: 8,
              }}>
                § VI — Añadir Quirk de Chasis
              </div>

              {/* Select quirk */}
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 8, letterSpacing: 3, color: '#6b4a1a',
                  fontFamily: '"Share Tech Mono", monospace',
                  textTransform: 'uppercase', marginBottom: 5,
                }}>Quirk</div>
                <select
                  value={pickQuirkId}
                  onChange={e => setPickQuirkId(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#d4c59a', border: '1px solid #6b4a1a',
                    color: '#1a1208',
                    fontFamily: '"Special Elite", monospace',
                    fontSize: 13, padding: '6px 8px',
                    outline: 'none',
                  }}
                >
                  <option value="">— seleccionar —</option>
                  <optgroup label="── POSITIVOS ──">
                    {QUIRKS_DATABASE.positivos.map(q => (
                      <option key={q.id} value={q.id}>{q.nombre}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── NEGATIVOS ──">
                    {QUIRKS_DATABASE.negativos.map(q => (
                      <option key={q.id} value={q.id}>{q.nombre}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Mech input */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 8, letterSpacing: 3, color: '#6b4a1a',
                  fontFamily: '"Share Tech Mono", monospace',
                  textTransform: 'uppercase', marginBottom: 5,
                }}>BattleMech</div>
                <input
                  type="text"
                  value={pickMech}
                  onChange={e => setPickMech(e.target.value)}
                  placeholder="ej. Marauder MAD-3D"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#d4c59a', border: '1px solid #6b4a1a',
                    color: '#1a1208',
                    fontFamily: '"Special Elite", monospace',
                    fontSize: 13, padding: '6px 8px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowPicker(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #6b4a1a',
                    color: '#6b4a1a',
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: 9, letterSpacing: 3,
                    textTransform: 'uppercase',
                    padding: '7px 18px', cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  disabled={!pickQuirkId || !pickMech.trim()}
                  onClick={() => {
                    if (pickQuirkId && pickMech.trim()) {
                      onAddQuirk(pickQuirkId, pickMech.trim());
                      setShowPicker(false);
                      setPickQuirkId('');
                      setPickMech('');
                    }
                  }}
                  style={{
                    background: pickQuirkId && pickMech.trim() ? '#6b4a1a' : '#6b4a1a55',
                    border: '1px solid #6b4a1a',
                    color: pickQuirkId && pickMech.trim() ? '#c8b88a' : '#c8b88a77',
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: 9, letterSpacing: 3,
                    textTransform: 'uppercase',
                    padding: '7px 18px',
                    cursor: pickQuirkId && pickMech.trim() ? 'pointer' : 'not-allowed',
                  }}
                >Añadir</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Attr upgrade popup */}
        {attrPopup && onUpgradeAttr && createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,13,18,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setAttrPopup(null)}
          >
            <div
              style={{
                background: '#c8b88a',
                backgroundImage: 'radial-gradient(ellipse at 20% 10%, #d4c59a 0%, #c8b88a 40%, #b8a775 100%)',
                border: '2px solid #6b4a1a',
                boxShadow: '0 4px 32px #00000099, inset 0 0 0 1px #6b4a1a55',
                padding: '22px 28px', minWidth: 300,
                fontFamily: '"Special Elite", monospace', color: '#1a1208',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 17, fontStyle: 'italic', color: C.redDeep, fontWeight: 700, marginBottom: 18, borderBottom: '1px solid #1a1208', paddingBottom: 8 }}>
                § I — Subir {ATTR_LABELS[attrPopup] ?? attrPopup.toUpperCase()}
              </div>
              {(() => {
                const cur  = pilot[attrPopup];
                const cost = attrUpgradeCost(attrPopup, cur);
                const canUp = cur < 12 && pilot.xpDisponible >= cost;
                return (
                  <>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 18, alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 8, letterSpacing: 3, color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace', textTransform: 'uppercase', marginBottom: 3 }}>Actual</div>
                        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 36, fontWeight: 700, lineHeight: 1, color: C.redDeep }}>{cur}</div>
                      </div>
                      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 16, color: '#6b4a1a', paddingBottom: 4 }}>→</div>
                      <div>
                        <div style={{ fontSize: 8, letterSpacing: 3, color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace', textTransform: 'uppercase', marginBottom: 3 }}>Nuevo</div>
                        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 36, fontWeight: 700, lineHeight: 1, color: cur < 12 ? C.redDeep : '#1a120844' }}>{cur < 12 ? cur + 1 : '—'}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 18, fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 1 }}>
                      <div style={{ color: '#6b4a1a' }}>COSTE: <span style={{ color: '#1a1208', fontWeight: 700 }}>{cur < 12 ? cost.toLocaleString('es-ES') : '—'} XP</span></div>
                      <div style={{ color: '#6b4a1a', marginTop: 4 }}>DISPONIBLE: <span style={{ color: canUp ? '#1a1208' : C.redDeep, fontWeight: 700 }}>{pilot.xpDisponible.toLocaleString('es-ES')} XP</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setAttrPopup(null)} style={{ background: 'transparent', border: '1px solid #6b4a1a', color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', padding: '7px 18px', cursor: 'pointer' }}>Cancelar</button>
                      <button
                        disabled={!canUp}
                        onClick={() => { if (canUp) { onUpgradeAttr(attrPopup, cost); setAttrPopup(null); } }}
                        style={{ background: canUp ? C.redDeep : '#6b4a1a55', border: 'none', color: canUp ? '#c8b88a' : '#c8b88a77', fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', padding: '7px 18px', cursor: canUp ? 'pointer' : 'not-allowed' }}
                      >{cur >= 12 ? 'Máximo' : canUp ? 'Confirmar' : 'XP insuf.'}</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

        {/* Skill picker popup */}
        {showSkillPicker && onAddSkill && createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,13,18,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowSkillPicker(false)}
          >
            <div
              style={{
                background: '#c8b88a',
                backgroundImage: 'radial-gradient(ellipse at 20% 10%, #d4c59a 0%, #c8b88a 40%, #b8a775 100%)',
                border: '2px solid #6b4a1a', boxShadow: '0 4px 32px #00000099, inset 0 0 0 1px #6b4a1a55',
                padding: '22px 28px', minWidth: 320,
                fontFamily: '"Special Elite", monospace', color: '#1a1208',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 17, fontStyle: 'italic', color: C.redDeep, fontWeight: 700, marginBottom: 18, borderBottom: '1px solid #1a1208', paddingBottom: 8 }}>
                § II — Adquirir Habilidad
              </div>
              <div style={{ marginBottom: 6, fontSize: 8, letterSpacing: 3, color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace', textTransform: 'uppercase' }}>
                Habilidades: {pilot.habilidades.length} / {pilot.int}
              </div>
              <select
                value={pickSkillName}
                onChange={e => setPickSkillName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: '#d4c59a', border: '1px solid #6b4a1a', color: '#1a1208', fontFamily: '"Special Elite", monospace', fontSize: 13, padding: '6px 8px', outline: 'none', marginBottom: 18 }}
              >
                <option value="">— seleccionar —</option>
                {SKILLS_CATALOG
                  .filter(sc => !pilot.habilidades.some(h => h.nombre === sc.nombre))
                  .map(sc => <option key={sc.nombre} value={sc.nombre}>{sc.nombre} ({sc.attr.toUpperCase()})</option>)
                }
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowSkillPicker(false)} style={{ background: 'transparent', border: '1px solid #6b4a1a', color: '#6b4a1a', fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', padding: '7px 18px', cursor: 'pointer' }}>Cancelar</button>
                <button
                  disabled={!pickSkillName}
                  onClick={() => { if (pickSkillName) { onAddSkill(pickSkillName); setShowSkillPicker(false); } }}
                  style={{ background: pickSkillName ? C.redDeep : '#6b4a1a55', border: 'none', color: pickSkillName ? '#c8b88a' : '#c8b88a77', fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', padding: '7px 18px', cursor: pickSkillName ? 'pointer' : 'not-allowed' }}
                >Añadir</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Bottom motto */}
        <div style={{
          position: 'absolute', bottom: 22, left: 100, right: 100, height: 22,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 4,
          fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
          fontSize: 13, letterSpacing: 2, color: C.goldDim,
        }}>
          <span style={{
            fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal',
            fontSize: 9, letterSpacing: 4,
          }}>
            FILE · {serial}
          </span>
          <span>— King Karl. For Eridani. —</span>
          <span style={{
            fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal',
            fontSize: 9, letterSpacing: 4,
          }}>
            ◆ XP {pilot.xpTotal.toLocaleString('es')} / {pilot.xpDisponible.toLocaleString('es')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FICHA HERÁLDICA · P2 MEDALLÓN
//  Reskin: medallón ceremonial central + 4 papeles atornillados
//  Mantiene interfaz props con BarraconesPage. Lógica intacta.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pilot } from '@/lib/barracones-types';
import { getDossierForOrigin } from '@/data/faction-dossier';
import {
  getVeterancy,
  SKILLS_CATALOG, QUIRKS_DATABASE, ARMOR_TABLE,
  attrUpgradeCost, skillUpgradeCost,
  calcAttrAvg, calcTIR, ATTR_LABELS,
} from '@/lib/barracones-data';
import { INFANTRY_WEAPON_TABLE } from '@/lib/barracones-weapons';

const BASE = import.meta.env.BASE_URL;

const DW = 1440;
const DH = 900;

const C = {
  gold:    '#e8c06a',
  goldHi:  '#f5d985',
  goldDim: '#b08a3a',
  goldDeep:'#6b4a1a',
  bronze:  '#8a6a35',
  bronzeHi:'#c9a560',
  bronzeLo:'#3d2a10',
  cream:   '#d8ccb5',
  creamDim:'#b8a775',
  paper:   '#c8b88a',
  paperHi: '#d4c59a',
  paperShade: '#a89060',
  ink:     '#1a1208',
  inkSoft: '#3d2a14',
  red:     '#a13a2b',
  redDeep: '#6b1f15',
  void:    '#0a0d12',
  void2:   '#10141a',
};

const VET_ORDER = ['Novato', 'Regular', 'Veterano', 'Elite', 'As'] as const;
const ROMAN     = ['I', 'II', 'III', 'IV', 'V'] as const;

// ── Sub: Tornillo ─────────────────────────────────────────

function Screw({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={size / 2} fill="url(#screwGrad)" stroke={C.bronzeLo} strokeWidth="0.6" />
      <line x1={-size / 3} y1="0" x2={size / 3} y2="0" stroke={C.bronzeLo} strokeWidth="1" />
    </g>
  );
}

// ── Sub: Sello APROBADO ────────────────────────────────────

function ApprovalStamp({ size = 64, acronym = 'FAFS' }: { size?: number; acronym?: string }) {
  return (
    <div style={{
      position: 'absolute', right: -8, bottom: -8,
      width: size, height: size,
      transform: 'rotate(-12deg)',
      pointerEvents: 'none', opacity: 0.78,
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          <pattern id={`hatchstamp-${acronym}`} patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={C.redDeep} strokeWidth="0.4" opacity="0.4" />
          </pattern>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke={C.redDeep} strokeWidth="2.5" />
        <circle cx="50" cy="50" r="40" fill={`url(#hatchstamp-${acronym})`} />
        <circle cx="50" cy="50" r="40" fill="none" stroke={C.redDeep} strokeWidth="0.8" />
        <text x="50" y="44" textAnchor="middle" style={{ font: 'bold 9px "Share Tech Mono", monospace', letterSpacing: 1 }} fill={C.redDeep}>APROBADO</text>
        <text x="50" y="56" textAnchor="middle" style={{ font: '7px "Share Tech Mono", monospace', letterSpacing: 0.5 }} fill={C.redDeep}>· {acronym} ·</text>
        <text x="50" y="68" textAnchor="middle" style={{ font: 'italic 7px "Cormorant Garamond", serif' }} fill={C.redDeep}>3026</text>
      </svg>
    </div>
  );
}

// ── Sub: PaperPatch ───────────────────────────────────────

interface PaperPatchProps {
  x: number; y: number; w: number; h: number;
  tilt?: number;
  showSeal?: boolean;
  acronym?: string;
  children: React.ReactNode;
}
function PaperPatch({ x, y, w, h, tilt = 0, showSeal = false, acronym = 'FAFS', children }: PaperPatchProps) {
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y, width: w, height: h,
      transform: `rotate(${tilt}deg)`,
      transformOrigin: 'center',
      filter: 'drop-shadow(2px 4px 0 rgba(0,0,0,0.45)) drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(circle at 18% 22%, ${C.paperShade}33 0%, transparent 25%),
          radial-gradient(circle at 82% 78%, ${C.paperShade}22 0%, transparent 22%),
          radial-gradient(ellipse at 30% 12%, ${C.paperHi} 0%, ${C.paper} 55%, ${C.paperShade} 100%)
        `,
        boxShadow: `inset 0 0 30px ${C.paperShade}44, inset 0 0 0 1px ${C.goldDeep}66`,
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55,
          background: `
            radial-gradient(circle at 88% 14%, ${C.goldDeep}66 0%, transparent 3%),
            radial-gradient(circle at 8% 78%, ${C.goldDeep}55 0%, transparent 2.4%),
            radial-gradient(circle at 60% 92%, ${C.goldDeep}44 0%, transparent 1.8%)
          `,
        }} />
      </div>

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <radialGradient id="screwGrad" cx="35%" cy="35%">
            <stop offset="0%" stopColor={C.goldHi} />
            <stop offset="55%" stopColor={C.bronze} />
            <stop offset="100%" stopColor={C.bronzeLo} />
          </radialGradient>
        </defs>
        <Screw x={10} y={10} />
        <Screw x={w - 10} y={10} />
        <Screw x={10} y={h - 10} />
        <Screw x={w - 10} y={h - 10} />
      </svg>

      {showSeal && <ApprovalStamp acronym={acronym} />}

      <div style={{ position: 'absolute', inset: 18, color: C.ink, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// ── Sub: PaperSection ─────────────────────────────────────

function PaperSection({ num, title, tail }: { num: string; title: string; tail?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 8, borderBottom: `1px solid ${C.ink}`, paddingBottom: 3, marginBottom: 6,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 3, color: C.goldDeep }}>§ {num}</span>
        <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 16, fontStyle: 'italic', color: C.redDeep, fontWeight: 700, letterSpacing: 1 }}>
          {title}
        </span>
      </div>
      {tail && (
        <span style={{ fontFamily: '"Special Elite", monospace', fontSize: 9, color: C.goldDeep, fontStyle: 'italic' }}>{tail}</span>
      )}
    </div>
  );
}

// ── Sub: Pip ──────────────────────────────────────────────

function Pip({ filled }: { filled: boolean }) {
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%',
      background: filled ? C.ink : 'transparent',
      border: `1px solid ${C.ink}`,
    }} />
  );
}

// ── Sub: Medallón ─────────────────────────────────────────

function MedallionPlaque({ crest, ringText }: { crest: string | null; ringText: string }) {
  return (
    <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto' }}>
      {/* Disco oscuro central — fondo */}
      <div style={{
        position: 'absolute', top: 50, left: 50, width: 180, height: 180,
        borderRadius: '50%',
        clipPath: 'circle(50%)',
        background: `radial-gradient(circle at 35% 30%, #f0d48a66 0%, transparent 55%), linear-gradient(180deg, #1c1610, ${C.void})`,
        boxShadow: `inset 0 0 30px ${C.void}`,
        zIndex: 1,
      }} />

      {/* Crest dentro del pozo */}
      <div style={{
        position: 'absolute', top: 50, left: 50, width: 180, height: 180,
        display: 'grid', placeItems: 'center', zIndex: 2,
      }}>
        {crest ? (
          <img src={crest} alt="" style={{
            width: 130, height: 130, objectFit: 'contain',
            filter: 'sepia(0.45) saturate(1.1) brightness(1.05) drop-shadow(0 0 12px rgba(232,192,106,0.5))',
          }} />
        ) : (
          <span style={{
            fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, fontStyle: 'italic',
            fontSize: 90, color: C.gold, lineHeight: 1,
          }}>K</span>
        )}
      </div>

      {/* Anillo bronce + texto curvo + aros — encima */}
      <svg viewBox="0 0 280 280" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id="bronze-p2" cx="40%" cy="35%">
            <stop offset="0%"  stopColor="#f0d48a" />
            <stop offset="40%" stopColor="#b08a3a" />
            <stop offset="100%" stopColor="#4a320e" />
          </radialGradient>
          <path id="plaquering-p2"
            d="M 140 140 m -98 0 a 98 98 0 1 1 196 0 a 98 98 0 1 1 -196 0" />
        </defs>
        <circle cx="140" cy="140" r="138" fill="none" stroke={C.goldDeep} strokeWidth="1.5" />
        <circle cx="140" cy="140" r="128" fill="none" stroke={C.gold} strokeWidth="0.5" opacity="0.6" />
        {/* Anillo bronce con hueco (r ext 112, r int 90) */}
        <path
          d="M 28 140 a 112 112 0 1 0 224 0 a 112 112 0 1 0 -224 0 Z
             M 50 140 a 90 90 0 1 0 180 0 a 90 90 0 1 0 -180 0 Z"
          fill="url(#bronze-p2)"
          fillRule="evenodd"
        />
        <circle cx="140" cy="140" r="112" fill="none" stroke={C.gold} strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
        <circle cx="140" cy="140" r="90" fill="none" stroke={C.gold} strokeWidth="2.5" opacity="0.95" />
        <circle cx="140" cy="140" r="93" fill="none" stroke={C.goldDeep} strokeWidth="0.6" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
          <line key={a} x1="140" y1="22" x2="140" y2="34"
            transform={`rotate(${a} 140 140)`} stroke={C.gold} strokeWidth="1.3" />
        ))}
        <text style={{ font: '11px "Cormorant Garamond", serif', fill: C.gold, letterSpacing: 7, fontStyle: 'italic' }}>
          <textPath href="#plaquering-p2" startOffset="0">{ringText}</textPath>
        </text>
      </svg>
    </div>
  );
}

// ── Sub: Picker (skill / quirk) ────────────────────────────

interface PickerProps {
  title: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  onClose: () => void;
}
function Picker({ title, options, onPick, onClose }: PickerProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'grid', placeItems: 'center', zIndex: 10000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.paperHi, border: `2px solid ${C.goldDeep}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 18px', borderBottom: `1px solid ${C.ink}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontStyle: 'italic', color: C.redDeep, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.ink, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 8 }}>
          {options.map(o => (
            <button key={o.value} onClick={() => onPick(o.value)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', margin: '2px 0',
              background: 'transparent', border: `1px solid ${C.ink}33`,
              color: C.ink, fontFamily: '"Special Elite", monospace', fontSize: 12,
              cursor: 'pointer',
            }}>{o.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub: Habilidades ──────────────────────────────────────

interface HabilidadesProps {
  pilot: Pilot;
  onUpgradeSkill?: (nombre: string, cost: number) => void;
  onAddSkill?: (nombre: string) => void;
}
function PaperHabilidades({ pilot, onUpgradeSkill, onAddSkill }: HabilidadesProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const xpDisp = pilot.xpDisponible;
  const atMax = pilot.habilidades.length >= pilot.int;
  const attrAvg = calcAttrAvg(pilot.fue, pilot.des, pilot.int, pilot.car);

  // Existentes para excluir
  const existingNames = new Set(pilot.habilidades.map(h => h.nombre));
  const skillOptions = SKILLS_CATALOG.filter(s => !existingNames.has(s.nombre)).map(s => ({
    value: s.nombre,
    label: `${s.nombre} (${s.attr.toUpperCase()})`,
  }));

  return (
    <>
      <div style={{ position: 'relative', paddingRight: 24 }}>
        <PaperSection num="I" title="Habilidades" tail="TIR = 14 − ATR_avg − NIVEL" />
        <button
          onClick={() => { if (!atMax) setPickerOpen(true); }}
          title={atMax ? `Máx (${pilot.int})` : `Añadir habilidad (${pilot.habilidades.length}/${pilot.int})`}
          style={{
            position: 'absolute', top: 0, right: 0,
            width: 18, height: 18,
            border: `1px solid ${atMax ? C.ink + '44' : C.redDeep}`,
            background: 'transparent',
            color: atMax ? C.ink + '44' : C.redDeep,
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: 13, lineHeight: 1, padding: 0,
            cursor: atMax ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"Special Elite", monospace', fontSize: 11.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.ink}` }}>
            <th style={{ textAlign: 'left',  fontSize: 9, letterSpacing: 2, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', padding: '2px 0', textTransform: 'uppercase' }}>disciplina</th>
            <th style={{ textAlign: 'center', width: 90, fontSize: 9, letterSpacing: 2, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', padding: '2px 0', textTransform: 'uppercase' }}>niv</th>
            <th style={{ textAlign: 'center', width: 30, fontSize: 9, letterSpacing: 2, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', padding: '2px 0', textTransform: 'uppercase' }}>tir</th>
            <th style={{ width: 22 }} />
          </tr>
        </thead>
        <tbody>
          {pilot.habilidades.map((s, i) => {
            const tir = calcTIR(attrAvg, s.nivel);
            const upgCost = skillUpgradeCost(s.nivel);
            const canUp = s.nivel < 6 && xpDisp >= upgCost;
            return (
              <tr key={i} style={{ borderBottom: `1px dotted ${C.ink}55` }}>
                <td style={{ padding: '3px 0', color: C.ink }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, flexShrink: 0 }}>
                      {[0, 1, 2, 3].map(j => (
                        <div key={j} style={{
                          width: 6, height: 6,
                          border: `1px solid ${C.goldDeep}`,
                          background: j < (s.upgrades ?? 0) ? C.goldDeep : 'transparent',
                        }} />
                      ))}
                    </div>
                    <span>{s.nombre}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '3px 0' }}>
                  <div style={{ display: 'inline-flex', gap: 2 }}>
                    {Array.from({ length: 9 }).map((_, j) => <Pip key={j} filled={j < s.nivel} />)}
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '3px 0', fontFamily: '"Cormorant Garamond", serif', fontSize: 17, fontStyle: 'italic', color: C.redDeep, fontWeight: 700 }}>
                  {tir}
                </td>
                <td style={{ textAlign: 'center', padding: '2px 0' }}>
                  <button
                    onClick={() => canUp && onUpgradeSkill?.(s.nombre, upgCost)}
                    title={canUp ? `+1 niv · −${upgCost} XP` : s.nivel >= 6 ? 'Máx' : `XP insuf. (${upgCost})`}
                    style={{
                      width: 16, height: 16,
                      border: `1px solid ${canUp ? C.redDeep : C.ink + '44'}`,
                      background: 'transparent',
                      color: canUp ? C.redDeep : C.ink + '44',
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: 12, lineHeight: 1,
                      cursor: canUp ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  >+</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pickerOpen && (
        <Picker
          title="Añadir habilidad"
          options={skillOptions}
          onPick={v => { onAddSkill?.(v); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ── Sub: Quirks ───────────────────────────────────────────

interface QuirksProps {
  pilot: Pilot;
  onAddQuirk?: (quirkId: string, mechName: string) => void;
}
function PaperQuirks({ pilot, onAddQuirk }: QuirksProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const allQuirks = [...QUIRKS_DATABASE.positivos, ...QUIRKS_DATABASE.negativos];
  const quirkOptions = allQuirks.map(q => ({
    value: q.id,
    label: `${q.nombre} — ${q.efecto}`,
  }));

  return (
    <>
      <div style={{ position: 'relative', paddingRight: 24 }}>
        <PaperSection num="II" title="Chasis · Quirks" tail={pilot.mech || '—'} />
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            position: 'absolute', top: 0, right: 0,
            width: 18, height: 18, background: 'transparent',
            border: `1px solid ${C.goldDeep}`, color: C.goldDeep,
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: 12, lineHeight: 1, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>
      {pilot.quirks.length === 0 && (
        <div style={{ fontSize: 10, color: C.goldDeep, fontStyle: 'italic', fontFamily: '"Cormorant Garamond", serif' }}>
          — Sin quirks registrados —
        </div>
      )}
      {pilot.quirks.map((q, i) => {
        const def = allQuirks.find(qd => qd.id === q.quirkId);
        const isPos = QUIRKS_DATABASE.positivos.some(qd => qd.id === q.quirkId);
        return (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0',
            borderBottom: `1px dotted ${C.ink}55`,
          }}>
            <span style={{ fontSize: 16, color: isPos ? C.redDeep : C.ink, lineHeight: 1 }}>
              {isPos ? '✓' : '✗'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: '"Special Elite", monospace' }}>
                {def?.nombre ?? q.quirkId}
              </div>
              <div style={{ fontSize: 11, color: C.goldDeep, fontStyle: 'italic', fontFamily: '"Cormorant Garamond", serif' }}>
                {def?.efecto ?? ''} {q.mechName ? `(${q.mechName})` : ''}
              </div>
            </div>
          </div>
        );
      })}
      {pickerOpen && (
        <Picker
          title="Añadir quirk"
          options={quirkOptions}
          onPick={v => { onAddQuirk?.(v, pilot.mech); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ── Sub: Equipo (foto + armas + armaduras) ────────────────

interface EquipoProps {
  pilot: Pilot;
  pilotImg?: string;
  onSetWeapon?: (idx: number, slot: Partial<Pilot['armas'][0]>) => void;
  onSetArmadura?: (a: Pilot['armadura']) => void;
  onSetArmadura2?: (a: Pilot['armadura2']) => void;
}
function PaperEquipo({ pilot, pilotImg, onSetWeapon, onSetArmadura, onSetArmadura2 }: EquipoProps) {
  const rangedWeapons = INFANTRY_WEAPON_TABLE.filter(w => !['melee', 'espada', 'granada'].includes(w.tipo.toLowerCase()));
  const meleeWeapons  = INFANTRY_WEAPON_TABLE.filter(w =>  ['melee', 'espada', 'granada'].includes(w.tipo.toLowerCase()));

  const slotLabels = ['A1', 'A2', 'A3', 'C1', 'C2'] as const;
  const equippedCount = pilot.armas.filter(a => a.nombre).length;

  return (
    <>
      <PaperSection num="III" title="Equipo" tail={`${equippedCount} pertrechos`} />
      <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 10 }}>
        {/* Foto piloto */}
        <div style={{ width: 88, height: 244, position: 'relative', overflow: 'hidden', border: `1px solid ${C.ink}33` }}>
          {pilotImg && (
            <img src={pilotImg} alt="Piloto" style={{
              width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block',
            }} />
          )}
        </div>
        {/* Armas + armaduras */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pilot.armas.map((a, i) => {
            const isMelee = i >= 3;
            const opts = isMelee ? meleeWeapons : rangedWeapons;
            const inList = opts.some(o => o.name === a.nombre);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 0', borderBottom: `1px dotted ${C.ink}55`,
              }}>
                <span style={{ fontSize: 8, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', width: 18 }}>
                  {slotLabels[i]}
                </span>
                <select
                  value={a.nombre || ''}
                  onChange={e => onSetWeapon?.(i, { nombre: e.target.value })}
                  style={{
                    flex: 1, height: 20,
                    background: C.paperHi,
                    border: `1px solid ${C.goldDeep}88`,
                    color: C.ink,
                    fontFamily: '"Special Elite", monospace',
                    fontSize: 10, padding: '0 3px', outline: 'none',
                  }}
                >
                  <option value="">— ninguna —</option>
                  {!inList && a.nombre && <option value={a.nombre}>{a.nombre}</option>}
                  {opts.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                </select>
                {!isMelee && a.nombre && (
                  <input
                    type="number" min={0} value={a.munActual}
                    onChange={e => onSetWeapon?.(i, { munActual: parseInt(e.target.value) || 0 })}
                    style={{
                      width: 32, height: 20,
                      background: C.paperHi,
                      border: `1px solid ${C.goldDeep}88`,
                      color: C.redDeep,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: 13, fontStyle: 'italic', fontWeight: 700,
                      textAlign: 'center', padding: 0, outline: 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
          {/* Separador armadura */}
          <div style={{
            margin: '4px 0 2px',
            fontSize: 8, letterSpacing: 3, color: C.goldDeep,
            fontFamily: '"Share Tech Mono", monospace',
            borderTop: `1px solid ${C.ink}66`, paddingTop: 3,
          }}>ARMADURA</div>
          {([
            ['①', pilot.armadura,  onSetArmadura],
            ['②', pilot.armadura2, onSetArmadura2],
          ] as const).map(([label, slot, setter], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 0', borderBottom: `1px dotted ${C.ink}55`,
            }}>
              <span style={{ fontSize: 8, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', width: 12 }}>{label}</span>
              <select
                value={slot.tipo || ''}
                onChange={e => {
                  const tipo = e.target.value;
                  setter?.({ tipo, piezas: tipo ? slot.piezas || 1 : 0 });
                }}
                style={{
                  flex: 1, height: 20,
                  background: C.paperHi,
                  border: `1px solid ${C.goldDeep}88`,
                  color: C.ink,
                  fontFamily: '"Special Elite", monospace',
                  fontSize: 10, padding: '0 3px', outline: 'none',
                }}
              >
                <option value="">— sin armadura —</option>
                {ARMOR_TABLE.map(o => (
                  <option key={o.nombre} value={o.nombre}>{o.nombre} +{o.bonus}</option>
                ))}
              </select>
              {slot.tipo && (
                <input
                  type="number" min={0} max={99} value={slot.piezas}
                  onChange={e => setter?.({ tipo: slot.tipo, piezas: parseInt(e.target.value) || 0 })}
                  style={{
                    width: 26, height: 20,
                    background: C.paperHi,
                    border: `1px solid ${C.goldDeep}88`,
                    color: C.redDeep,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: 13, fontStyle: 'italic', fontWeight: 700,
                    textAlign: 'center', padding: 0, outline: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Sub: Méritos & Defectos ───────────────────────────────

function PaperMeritos({ pilot }: { pilot: Pilot }) {
  return (
    <>
      <PaperSection num="IV" title="Méritos & Defectos" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', marginBottom: 4 }}>MÉRITOS</div>
          {pilot.meritos.length === 0 && (
            <div style={{ fontSize: 10, color: C.goldDeep, fontStyle: 'italic', fontFamily: '"Cormorant Garamond", serif' }}>
              — Sin méritos registrados —
            </div>
          )}
          {pilot.meritos.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <span style={{ display: 'inline-grid', placeItems: 'center', width: 14, height: 14, border: `1px solid ${C.ink}`, color: C.ink, fontSize: 11, lineHeight: 1, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 12, color: C.ink, fontFamily: '"Special Elite", monospace' }}>{m}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', marginBottom: 4 }}>DEFECTOS</div>
          {pilot.defectos.length === 0 && (
            <div style={{ fontSize: 10, color: C.goldDeep, fontStyle: 'italic', fontFamily: '"Cormorant Garamond", serif' }}>
              — Sin defectos registrados —
            </div>
          )}
          {pilot.defectos.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <span style={{ display: 'inline-grid', placeItems: 'center', width: 14, height: 14, border: `1px solid ${C.ink}`, color: C.redDeep, fontSize: 11, lineHeight: 1, flexShrink: 0 }}>✗</span>
              <span style={{ fontSize: 11.5, color: C.ink, fontFamily: '"Special Elite", monospace' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────

export function FichaHeraldica({ pilot, pilotImg, apodoOverride, onAddQuirk, onSetWeapon, onSetArmadura, onSetArmadura2, onUpgradeSkill, onUpgradeAttr, onAddSkill }: {
  pilot: Pilot;
  pilotImg?: string;
  apodoOverride?: string;
  onAddQuirk?: (quirkId: string, mechName: string) => void;
  onSetWeapon?: (idx: number, slot: Partial<Pilot['armas'][0]>) => void;
  onSetArmadura?: (a: Pilot['armadura']) => void;
  onSetArmadura2?: (a: Pilot['armadura2']) => void;
  onSetNotas?: (v: string) => void;
  onUpgradeSkill?: (nombre: string, cost: number) => void;
  onUpgradeAttr?: (attr: 'fue' | 'des' | 'int' | 'car', cost: number) => void;
  onAddSkill?: (nombre: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [attrPopup, setAttrPopup] = useState<'fue' | 'des' | 'int' | 'car' | null>(null);

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

  // Datos derivados
  const vet = getVeterancy(pilot.xpTotal);
  const dossier = getDossierForOrigin(pilot.origen);
  const vetIdx = Math.max(0, VET_ORDER.indexOf(vet.nombre as typeof VET_ORDER[number]));
  const clearance = dossier.clearanceNames[vetIdx].toUpperCase();

  const apodo = apodoOverride?.trim() || pilot.apodo || pilot.callsign || '—';
  const crest = dossier.crestAsset ? `${BASE}${dossier.crestAsset}` : null;
  const acronym = dossier.militaryAcronym ?? 'FAFS';

  const ringText = `· ${acronym} · ${clearance} · ${apodo.toUpperCase()} ·`;

  // Atributos para grid
  const attrs: Array<{ k: 'FUE' | 'DES' | 'INT' | 'CAR'; key: 'fue' | 'des' | 'int' | 'car'; label: string }> = [
    { k: 'FUE', key: 'fue', label: 'Fuerza' },
    { k: 'DES', key: 'des', label: 'Destreza' },
    { k: 'INT', key: 'int', label: 'Ingenio' },
    { k: 'CAR', key: 'car', label: 'Carisma' },
  ];

  return (
    <div style={{
      width: '100%', minHeight: '100%',
      display: 'grid', placeItems: 'center', padding: '20px 0',
      background: `radial-gradient(ellipse at top, #1a1410 0%, ${C.void} 60%), linear-gradient(180deg, ${C.void2} 0%, ${C.void} 100%)`,
    }}>
      <div ref={wrapRef} style={{ width: DW * scale, height: DH * scale, position: 'relative' }}>
        <div style={{
          width: DW, height: DH,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(ellipse at top, #1a1410 0%, ${C.void} 60%), linear-gradient(180deg, ${C.void2} 0%, ${C.void} 100%)`,
          fontFamily: '"Special Elite", "Share Tech Mono", monospace',
          color: C.cream,
        }}>

          {/* Frame heráldico — DETRÁS */}
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
          </svg>

          {/* Top motto */}
          <div style={{
            position: 'absolute', top: 40, left: 100, right: 100, height: 28,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            letterSpacing: 8, color: C.goldDim, zIndex: 4,
          }}>
            <span>◆ {acronym}</span>
            <span style={{
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontSize: 14, letterSpacing: 4, color: C.gold,
            }}>— · Hoja de Servicio · —</span>
            <span>◆ Anno Domini MMMXXVI</span>
          </div>

          {/* MEDALLÓN CENTRAL + datos del piloto */}
          <div style={{
            position: 'absolute', top: 92, left: '50%',
            transform: 'translateX(-50%)', zIndex: 3,
            width: 360, textAlign: 'center',
          }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: 34, fontWeight: 700, color: C.gold, lineHeight: 1,
              letterSpacing: 1, fontStyle: 'italic',
              textShadow: '0 2px 12px rgba(232,192,106,0.3)',
              marginBottom: 4,
            }}>{pilot.nombre || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: C.goldDim }}>—</span>
              <span style={{
                fontSize: 14, color: C.cream, letterSpacing: 2, fontStyle: 'italic',
                fontFamily: '"Special Elite", monospace',
              }}>«{apodo}»</span>
              <span style={{ fontSize: 14, color: C.goldDim }}>—</span>
            </div>

            <MedallionPlaque crest={crest} ringText={ringText} />

            <div style={{ marginTop: 8, fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 5, color: C.gold }}>
              {clearance} · {ROMAN[vetIdx]}
            </div>

            {/* Atributos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
              {attrs.map(({ k, key, label }) => {
                const v = pilot[key];
                const ups = pilot.attrUpgrades?.[key] ?? 0;
                const cost = attrUpgradeCost(key, v);
                const canUp = v < 12 && pilot.xpDisponible >= cost;
                return (
                  <div key={k}
                    onClick={() => onUpgradeAttr && setAttrPopup(key)}
                    title={canUp ? `Subir ${k} (${v} → ${v + 1}) · −${cost} XP` : v >= 12 ? 'Máx' : `XP insuf. (${cost})`}
                    style={{
                      border: `1px solid ${C.gold}66`,
                      background: `linear-gradient(180deg, ${C.gold}10, transparent)`,
                      textAlign: 'center', padding: '4px 0',
                      cursor: canUp ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (canUp) e.currentTarget.style.background = `linear-gradient(180deg, ${C.gold}25, ${C.gold}05)`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(180deg, ${C.gold}10, transparent)`; }}
                  >
                    <div style={{ fontSize: 8, letterSpacing: 3, color: C.goldDim, fontFamily: '"Share Tech Mono", monospace' }}>{k}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, flexShrink: 0 }}>
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} style={{
                            width: 6, height: 6,
                            border: `1px solid ${C.goldDim}`,
                            background: i < ups ? C.goldDim : 'transparent',
                          }} />
                        ))}
                      </div>
                      <div style={{
                        fontSize: 26, color: C.gold, lineHeight: 1,
                        fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontStyle: 'italic',
                      }}>{v}</div>
                    </div>
                    <div style={{ fontSize: 8, color: C.creamDim, fontStyle: 'italic' }}>{label}</div>
                  </div>
                );
              })}
            </div>

            {/* Datos físicos */}
            <div style={{
              marginTop: 14, padding: '10px 14px',
              border: `1px solid ${C.gold}44`,
              background: 'rgba(232,192,106,0.04)',
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
              textAlign: 'center',
            }}>
              {[
                ['SEXO', pilot.sexo || '—'],
                ['EDAD', String(pilot.edad || '—')],
                ['ALT.', pilot.altura || '—'],
                ['PESO', pilot.peso || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: C.goldDim, fontFamily: '"Share Tech Mono", monospace' }}>{k}</div>
                  <div style={{
                    fontSize: 14, color: C.cream, fontFamily: '"Special Elite", monospace',
                    marginTop: 2,
                  }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 8, padding: '6px 12px',
              border: `1px solid ${C.gold}44`,
              background: 'rgba(232,192,106,0.04)',
            }}>
              <div style={{ fontSize: 8, letterSpacing: 4, color: C.goldDim, fontFamily: '"Share Tech Mono", monospace' }}>BATTLEMECH</div>
              <div style={{
                fontSize: 15, color: C.cream, letterSpacing: 1, fontStyle: 'italic',
                marginTop: 2, fontFamily: '"Cormorant Garamond", serif',
              }}>{pilot.mech || '—'}</div>
            </div>
          </div>

          {/* PAPELES — 4 alrededor */}
          <PaperPatch x={62} y={108} w={400} h={420} tilt={0} acronym={acronym}>
            <PaperHabilidades pilot={pilot} onUpgradeSkill={onUpgradeSkill} onAddSkill={onAddSkill} />
          </PaperPatch>
          <PaperPatch x={62} y={548} w={400} h={188} tilt={0} acronym={acronym}>
            <PaperQuirks pilot={pilot} onAddQuirk={onAddQuirk} />
          </PaperPatch>
          <PaperPatch x={978} y={108} w={400} h={340} tilt={0} acronym={acronym}>
            <PaperEquipo pilot={pilot} pilotImg={pilotImg}
              onSetWeapon={onSetWeapon} onSetArmadura={onSetArmadura} onSetArmadura2={onSetArmadura2} />
          </PaperPatch>
          <PaperPatch x={978} y={468} w={400} h={270} tilt={0} acronym={acronym}>
            <PaperMeritos pilot={pilot} />
          </PaperPatch>

          {/* Bottom motto */}
          <div style={{
            position: 'absolute', bottom: 22, left: 100, right: 100, height: 22,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 4,
            fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
            fontSize: 13, letterSpacing: 2, color: C.goldDim,
          }}>
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal', fontSize: 9, letterSpacing: 4 }}>
              FILE · {dossier.filePrefix}-{pilot.id.slice(0, 4).toUpperCase()}-K
            </span>
            <span>— King Karl. For Eridani. —</span>
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontStyle: 'normal', fontSize: 9, letterSpacing: 4 }}>
              ◆ XP {pilot.xpTotal.toLocaleString('es')} / {pilot.xpDisponible.toLocaleString('es')}
            </span>
          </div>
        </div>
      </div>

      {/* Popup confirmación atributo */}
      {attrPopup && onUpgradeAttr && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,13,18,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setAttrPopup(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#c8b88a',
              backgroundImage: 'radial-gradient(ellipse at 20% 10%, #d4c59a 0%, #c8b88a 40%, #b8a775 100%)',
              border: `2px solid ${C.goldDeep}`,
              boxShadow: '0 4px 32px #00000099, inset 0 0 0 1px #6b4a1a55',
              padding: '22px 28px', minWidth: 300,
              fontFamily: '"Special Elite", monospace', color: C.ink,
            }}
          >
            <div style={{
              fontFamily: '"Cormorant Garamond", serif', fontSize: 17, fontStyle: 'italic',
              color: C.redDeep, fontWeight: 700, marginBottom: 18,
              borderBottom: `1px solid ${C.ink}`, paddingBottom: 8,
            }}>
              § Subir {ATTR_LABELS[attrPopup] ?? attrPopup.toUpperCase()}
            </div>
            {(() => {
              const cur = pilot[attrPopup];
              const cost = attrUpgradeCost(attrPopup, cur);
              const canUp = cur < 12 && pilot.xpDisponible >= cost;
              return (
                <>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 18, alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 8, letterSpacing: 3, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', textTransform: 'uppercase', marginBottom: 3 }}>Actual</div>
                      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 36, fontWeight: 700, lineHeight: 1, color: C.redDeep }}>{cur}</div>
                    </div>
                    <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 16, color: C.goldDeep, paddingBottom: 4 }}>→</div>
                    <div>
                      <div style={{ fontSize: 8, letterSpacing: 3, color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace', textTransform: 'uppercase', marginBottom: 3 }}>Nuevo</div>
                      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 36, fontWeight: 700, lineHeight: 1, color: cur < 12 ? C.redDeep : C.ink + '44' }}>{cur < 12 ? cur + 1 : '—'}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 18, fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 1 }}>
                    <div style={{ color: C.goldDeep }}>COSTE: <span style={{ color: C.ink, fontWeight: 700 }}>{cur < 12 ? cost.toLocaleString('es-ES') : '—'} XP</span></div>
                    <div style={{ color: C.goldDeep, marginTop: 4 }}>DISPONIBLE: <span style={{ color: canUp ? C.ink : C.redDeep, fontWeight: 700 }}>{pilot.xpDisponible.toLocaleString('es-ES')} XP</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setAttrPopup(null)}
                      style={{
                        background: 'transparent', border: `1px solid ${C.goldDeep}`,
                        color: C.goldDeep, fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 9, letterSpacing: 3, textTransform: 'uppercase',
                        padding: '7px 18px', cursor: 'pointer',
                      }}
                    >Cancelar</button>
                    <button
                      disabled={!canUp}
                      onClick={() => { if (canUp) { onUpgradeAttr(attrPopup, cost); setAttrPopup(null); } }}
                      style={{
                        background: canUp ? C.redDeep : C.goldDeep + '55',
                        border: 'none',
                        color: canUp ? '#c8b88a' : '#c8b88a77',
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 9, letterSpacing: 3, textTransform: 'uppercase',
                        padding: '7px 18px', cursor: canUp ? 'pointer' : 'not-allowed',
                      }}
                    >{cur >= 12 ? 'Máximo' : canUp ? 'Confirmar' : 'XP insuf.'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

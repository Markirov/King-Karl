import { useState, useCallback, useEffect } from 'react';
import type { Pilot } from '@/lib/barracones-types';
import { calcHp, calcAttrAvg, calcTIR, ARMOR_TABLE } from '@/lib/barracones-data';
import { INFANTRY_WEAPON_TABLE, getWeaponSkillCandidates, getWeaponMod, resolveWeaponName } from '@/lib/barracones-weapons';

// ─── Types ────────────────────────────────────────────────────
interface Props {
  pilot: Pilot;
  onSetHpDmg: (loc: string, dmg: number) => void;
  onSetWeapon: (idx: number, slot: Partial<Pilot['armas'][0]>) => void;
}

interface LogEntry { time: string; msg: string; color: string }

// ─── Armor zone → HP loc mapping ─────────────────────────────
const ZONE_TO_LOCS: Record<string, string[]> = {
  'Cabeza':  ['cabeza'],
  'Torso':   ['torso'],
  'Brazos':  ['brazoIzq', 'brazoDer'],
  'Piernas': ['piernaIzq', 'piernaDer'],
};

function calcArmorByLoc(pilot: Pilot): Record<string, number> {
  const result: Record<string, number> = {};
  const slots = [pilot.armadura, pilot.armadura2 ?? { tipo: '', piezas: 0 }].filter(a => a?.tipo);
  for (const slot of slots) {
    const def = ARMOR_TABLE.find(a => a.nombre === slot.tipo);
    if (!def) continue;
    for (const zone of def.zonas.split(',').map(z => z.trim())) {
      for (const loc of ZONE_TO_LOCS[zone] ?? []) {
        result[loc] = (result[loc] ?? 0) + def.bonus;
      }
    }
  }
  return result;
}

// ─── Constants ────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { label: 'Corto',  val: 0 },
  { label: 'Medio',  val: 2 },
  { label: 'Largo',  val: 4 },
];
const MOV_OPTIONS = [
  { label: 'Parado',    val: 0 },
  { label: 'Caminando', val: 1 },
  { label: 'Corriendo', val: 2 },
  { label: 'Esquivando',val: 3 },
];
const COMBAT_SKILLS = ['armas pequeñas', 'rifle', 'armas de apoyo', 'arco', 'pelea', 'armas arrojadizas', 'artillería', 'pistola', 'espada'];

const DOT = 10;  // px — tamaño de cada dot (igual que en ArmorDiagram)
const GAP = 1;  // px — separación entre dots

// Zonas del cuerpo humano — top/left en % sobre la imagen
// Ajusta top/left para alinear con la silueta
const HUMAN_ZONES = [
  { loc: 'cabeza',    label: 'CAB', top: 12, left: 50, cols: 4 },  // 3 cols → 3×N
  { loc: 'brazoIzq',  label: 'BIZ', top: 38, left: 30, cols: 2 },  // 3×4 = 12
  { loc: 'torso',     label: 'TOR', top: 46, left: 50, cols: 6 },  // 5×4 ≈ 18
  { loc: 'brazoDer',  label: 'BDE', top: 38, left: 75, cols: 2 },  // 3×4 = 12
  { loc: 'piernaIzq', label: 'PIZ', top: 80, left: 37, cols: 3 },  // 3×4 = 12
  { loc: 'piernaDer', label: 'PDE', top: 80, left: 70, cols: 3 },  // 3×4 = 12
] as const;

// ─── Helper ───────────────────────────────────────────────────
function nowTime() {
  return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────
export function CombatePanel({ pilot, onSetHpDmg, onSetWeapon }: Props) {
  const baseFue = pilot.fue - (pilot.attrUpgrades?.fue ?? 0);
  const baseDes = pilot.des - (pilot.attrUpgrades?.des ?? 0);
  const baseInt = pilot.int - (pilot.attrUpgrades?.int ?? 0);
  const baseCar = pilot.car - (pilot.attrUpgrades?.car ?? 0);
  const attrAvg = calcAttrAvg(baseFue, baseDes, baseInt, baseCar);
  const hpLocs    = calcHp(pilot.fue);
  const armorByLoc = calcArmorByLoc(pilot);

  // Defensive fallbacks for legacy saves that may lack these fields
  const armas = Array.isArray(pilot.armas) ? pilot.armas : [];
  const habs  = Array.isArray(pilot.habilidades) ? pilot.habilidades : [];

  // Skills sorted: combat first
  const skills = [...habs].sort((a, b) => {
    const aC = COMBAT_SKILLS.some(s => a.nombre.toLowerCase().includes(s)) ? 1 : 0;
    const bC = COMBAT_SKILLS.some(s => b.nombre.toLowerCase().includes(s)) ? 1 : 0;
    return bC - aC;
  });

  const [selectedSkill,   setSelectedSkill]   = useState<string | null>(null);
  const [selectedWeapon,  setSelectedWeapon]  = useState<number | null>(null);
  const [weaponMod,       setWeaponMod]       = useState(0);
  const [missingPenalty,  setMissingPenalty]  = useState(0);
  const [range,           setRange]           = useState(0);
  const [movSelf,         setMovSelf]         = useState(0);
  const [movTarget,       setMovTarget]       = useState(0);
  const [turn,          setTurn]          = useState(1);
  const [log,           setLog]           = useState<LogEntry[]>([]);
  const [selectedLoc,   setSelectedLoc]   = useState<string | null>(null);
  const [pendingByLoc,  setPendingByLoc]  = useState<Record<string, number>>({});
  const [armorDmgByLoc, setArmorDmgByLoc] = useState<Record<string, number>>({});

  // Reset combat state when pilot slot changes
  useEffect(() => {
    setSelectedWeapon(null);
    setSelectedSkill(null);
    setWeaponMod(0);
    setMissingPenalty(0);
    setRange(0); setMovSelf(0); setMovTarget(0);
    setTurn(1);  setLog([]);
    setSelectedLoc(null);
    setPendingByLoc({});
    setArmorDmgByLoc({});
  }, [pilot.id]);

  // ── Melee detection ───────────────────────────────────────
  const selectedWeaponDef = selectedWeapon !== null
    ? INFANTRY_WEAPON_TABLE.find(w => w.name === resolveWeaponName(armas[selectedWeapon]?.nombre || ''))
    : null;
  const isMelee = selectedWeaponDef?.tipo === 'Melee' || selectedWeaponDef?.tipo === 'Espada';

  // ── Skill / TN calculation ──────────────────────────────────
  const activeSkill  = skills.find(s => s.nombre === selectedSkill) ?? null;
  // missingPenalty se suma UNA SOLA VEZ en tnFinal, nunca en tirBase
  const tirBase      = activeSkill
    ? calcTIR(attrAvg, activeSkill.nivel)
    : selectedWeapon !== null ? calcTIR(attrAvg, 0) : null;
  const tnRaw        = tirBase !== null ? tirBase + range + movSelf + movTarget + weaponMod + missingPenalty : null;
  const tnFinal      = tnRaw !== null ? (tnRaw >= 13 ? null : tnRaw) : null; // null = N/A

  // ── Log helper ─────────────────────────────────────────────
  const addLog = useCallback((msg: string, color = '#e0e0e0') => {
    setLog(prev => [...prev, { time: nowTime(), msg, color }].slice(-50));
  }, []);

  // ── Apply damage to location (armor absorbs first) ────────
  const handleApplyDamage = useCallback((loc: string) => {
    const pending = pendingByLoc[loc] ?? 0;
    if (pending === 0) return;

    setPendingByLoc(prev => ({ ...prev, [loc]: 0 }));

    // ── Heal (negative) ───────────────────────────────────────
    if (pending < 0) {
      const healAmt      = Math.abs(pending);
      const currentHpDmg = pilot.hpDmg[loc] ?? 0;
      const hpRestored   = Math.min(healAmt, currentHpDmg);
      if (hpRestored > 0) onSetHpDmg(loc, currentHpDmg - hpRestored);
      // Restore depleted armor with the remainder
      const remainder    = healAmt - hpRestored;
      if (remainder > 0) {
        setArmorDmgByLoc(prev => ({ ...prev, [loc]: Math.max(0, (prev[loc] ?? 0) - remainder) }));
      }
      addLog(`💚 ${loc.toUpperCase()}: +${healAmt} curado`, '#4ade80');
      return;
    }

    // ── Damage (positive) — armor absorbs first ───────────────
    const freshArmor     = calcArmorByLoc(pilot);
    const totalArmor     = freshArmor[loc] ?? 0;
    const armorUsed      = armorDmgByLoc[loc] ?? 0;
    const armorRemaining = Math.max(0, totalArmor - armorUsed);
    const armorAbsorbs   = Math.min(pending, armorRemaining);
    const hpDmg          = pending - armorAbsorbs;
    const maxHp          = calcHp(pilot.fue).find(l => l.loc === loc)?.max ?? 0;
    const currentHpDmg   = pilot.hpDmg[loc] ?? 0;

    if (armorAbsorbs > 0) {
      setArmorDmgByLoc(prev => ({ ...prev, [loc]: (prev[loc] ?? 0) + armorAbsorbs }));
    }
    if (hpDmg > 0) {
      onSetHpDmg(loc, Math.min(maxHp, currentHpDmg + hpDmg));
    }

    const parts: string[] = [];
    if (armorAbsorbs > 0) parts.push(`🛡 ${armorAbsorbs} blindaje`);
    if (hpDmg > 0) parts.push(`💔 ${hpDmg} HP`);
    addLog(`💥 ${loc.toUpperCase()}: ${pending} dmg${parts.length ? ` (${parts.join(', ')})` : ''}`, '#ff6b6b');
  }, [pendingByLoc, pilot, armorDmgByLoc, onSetHpDmg, addLog]);

  // ── Weapon selection ───────────────────────────────────────
  const handleSelectWeapon = useCallback((idx: number) => {
    setSelectedWeapon(idx);
    const arma = armas[idx];
    if (!arma?.nombre) return;

    const weaponName = resolveWeaponName(arma.nombre);

    // Walk candidates in priority order and pick the first the pilot actually has
    const candidates = getWeaponSkillCandidates(weaponName);
    let found: string | null = null;
    let penalty = 0;

    if (candidates.length > 0) {
      for (const candidate of candidates) {
        const match = skills.find(s => s.nombre.toLowerCase() === candidate.toLowerCase());
        if (match) { found = match.nombre; break; }
      }
      if (!found) penalty = 2; // weapon type known but pilot lacks any applicable skill
    } else {
      // Weapon not in table — fallback: first combat skill the pilot has
      const cs = skills.find(s => COMBAT_SKILLS.some(c => s.nombre.toLowerCase().includes(c)));
      if (cs) found = cs.nombre;
    }

    setSelectedSkill(found);
    setMissingPenalty(penalty);

    // Weapon special modifier
    const wMod = getWeaponMod(weaponName);
    setWeaponMod(wMod);

    // Melee weapons are always at short range
    const def = INFANTRY_WEAPON_TABLE.find(w => w.name === weaponName);
    if (def?.tipo === 'Melee' || def?.tipo === 'Espada') setRange(0);
  }, [armas, skills]);

  // ── DISPARAR ──────────────────────────────────────────────
  const handleDisparar = useCallback(() => {
    if (tnFinal === null) {
      addLog('⚠️ Selecciona un arma primero', '#ff6b6b');
      return;
    }
    const armaNombre = selectedWeapon !== null ? resolveWeaponName(armas[selectedWeapon]?.nombre || '') || 'Sin arma' : 'Sin arma';
    const skillLabel = activeSkill ? activeSkill.nombre : `Sin habilidad (+${missingPenalty})`;
    let munMsg = '';

    if (selectedWeapon !== null && selectedWeapon < 3) {
      const arma = armas[selectedWeapon];
      if (arma?.nombre) {
        if (arma.munActual <= 0) {
          addLog(`⚠️ ¡${arma.nombre} sin munición! Recarga`, '#ff6b6b');
          return;
        }
        onSetWeapon(selectedWeapon, { munActual: arma.munActual - 1 });
        munMsg = ` [mun: ${arma.munActual - 1}]`;
      }
    }

    addLog(`🎯 ${armaNombre} (${skillLabel}) → TN ${tnFinal}${munMsg}`, '#4ade80');
  }, [tnFinal, activeSkill, selectedWeapon, pilot.armas, onSetWeapon, addLog]);

  // ── Siguiente turno ───────────────────────────────────────
  const handleNextTurn = useCallback(() => {
    const next = turn + 1;
    setTurn(next);
    setMovSelf(0); setMovTarget(0);
    addLog(`═══ TURNO ${next} ═══`, '#f59e0b');
  }, [turn, addLog]);

  // ── Reset HP ──────────────────────────────────────────────
  const handleResetHP = useCallback(() => {
    hpLocs.forEach(l => onSetHpDmg(l.loc, 0));
    addLog('💚 Daños reiniciados', '#4ade80');
  }, [hpLocs, onSetHpDmg, addLog]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-4 font-mono">

      {/* ── Estado Físico + Armamento ─── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Estado Físico — diagrama */}
        <div className="bg-surface-container border-t-2 border-primary-container/30 relative overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1 z-10 relative">
            <span className="font-headline text-[9px] font-bold text-primary-container tracking-[2px] uppercase">
              {pilot.callsign || pilot.nombre}
            </span>
            <button onClick={handleResetHP}
              className="text-[8px] border border-green-400/20 text-outline hover:text-green-400 hover:border-green-400/50 px-1.5 py-0.5 transition-all">
              💚
            </button>
          </div>

          {/* Área de diagrama — la imagen dicta la altura, sin espacios vacíos */}
          <div className="relative w-full" onClick={() => setSelectedLoc(null)}>
            <img
              src={`${import.meta.env.BASE_URL}barracones.jpeg`}
              alt=""
              className="block w-full h-auto pointer-events-none select-none opacity-30"
              style={{ filter: 'grayscale(1)', mixBlendMode: 'screen' }}
            />

            {/* Zonas de HP */}
            {HUMAN_ZONES.map(zone => {
              const hpLoc      = hpLocs.find(l => l.loc === zone.loc);
              if (!hpLoc) return null;
              const max        = hpLoc.max;
              const dmg        = pilot.hpDmg[zone.loc] ?? 0;
              const current    = max - dmg;
              const pct        = max > 0 ? current / max : 1;
              const aBonus     = armorByLoc[zone.loc] ?? 0;
              const aDmg       = armorDmgByLoc[zone.loc] ?? 0;
              const aRemaining = Math.max(0, aBonus - aDmg);
              const isSelected = selectedLoc === zone.loc;
              const cols       = zone.cols;
              const aCols      = zone.cols;

              return (
                <div
                  key={zone.loc}
                  className={`absolute z-10 cursor-pointer transition-all duration-150 ${isSelected ? 'z-20' : 'hover:z-20'}`}
                  style={{ top: `${zone.top}%`, left: `${zone.left}%`, transform: 'translate(-50%, -50%)' }}
                  onClick={e => { e.stopPropagation(); setSelectedLoc(isSelected ? null : zone.loc); }}
                >
                  <div className={`p-1 border transition-all ${
                    isSelected
                      ? 'bg-surface-container-high/90 border-primary shadow-[0_0_10px_rgba(223,186,116,0.25)]'
                      : 'bg-surface-container/80 border-outline-variant/30 hover:border-secondary/50 hover:bg-surface-container-high/80'
                  }`}>
                    {/* Label + contadores */}
                    <div className="flex justify-between items-center gap-1.5 mb-0.5">
                      <span className={`text-[7px] font-mono font-bold leading-none ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                        {zone.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {aBonus > 0 && (
                          <span className={`text-[7px] font-mono leading-none ${aRemaining > 0 ? 'text-amber-400' : 'text-outline line-through'}`}>
                            🛡{aRemaining}
                          </span>
                        )}
                        <span className={`text-[7px] font-mono leading-none ${dmg > 0 ? 'text-error font-bold' : 'text-outline'}`}>
                          {current}
                        </span>
                      </div>
                    </div>

                    {/* HP dots */}
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${DOT}px)`, gap: `${GAP}px` }}>
                      {Array.from({ length: max }).map((_, i) => (
                        <div key={i} style={{ width: DOT, height: DOT }} className={`transition-all ${
                          i >= current
                            ? 'bg-red-900/80 border border-red-500/50'
                            : pct > 0.5 ? 'bg-secondary/70'
                            : pct > 0.25 ? 'bg-amber-500/70'
                            : 'bg-red-600/70'
                        }`} />
                      ))}
                    </div>

                    {/* Armor dots */}
                    {aBonus > 0 && (
                      <>
                        <div className="border-t border-outline-variant/20 my-0.5" />
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${aCols}, ${DOT}px)`, gap: `${GAP}px` }}>
                          {Array.from({ length: aBonus }).map((_, i) => (
                            <div key={i} style={{ width: DOT, height: DOT }} className={`transition-all ${
                              i < aRemaining
                                ? 'bg-amber-500/60'
                                : 'bg-outline-variant/20 border border-outline-variant/30'
                            }`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Panel de detalle para la zona seleccionada */}
            {selectedLoc && (() => {
              const hpLoc  = hpLocs.find(l => l.loc === selectedLoc);
              const max    = hpLoc?.max ?? 0;
              const dmg    = pilot.hpDmg[selectedLoc] ?? 0;
              const pending = pendingByLoc[selectedLoc] ?? 0;
              const range2 = max * 2;
              const thumbPct = range2 > 0 ? ((pending + max) / range2) * 100 : 50;
              let bgSlider = '#1a1a2e';
              if (pending > 0) bgSlider = `linear-gradient(to right, #1a1a2e 50%, #7f1d1d 50%, #7f1d1d ${thumbPct}%, #1a1a2e ${thumbPct}%)`;
              else if (pending < 0) bgSlider = `linear-gradient(to right, #1a1a2e ${thumbPct}%, #14532d ${thumbPct}%, #14532d 50%, #1a1a2e 50%)`;
              const aBonus = armorByLoc[selectedLoc] ?? 0;
              const aRemain = Math.max(0, aBonus - (armorDmgByLoc[selectedLoc] ?? 0));

              return (
                <div className="absolute top-0 right-0 w-40 bg-surface-container-high/95 border-l-2 border-primary-container/50 p-2 z-30 shadow-[0_0_16px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-2 border-b border-outline-variant/20 pb-1">
                    <span className="font-mono text-[9px] font-bold text-primary uppercase">{selectedLoc}</span>
                    <button onClick={() => setSelectedLoc(null)} className="text-outline hover:text-secondary text-[10px] leading-none">✕</button>
                  </div>
                  <div className="space-y-1 font-mono text-[9px]">
                    <div className="flex justify-between">
                      <span className="text-outline">HP:</span>
                      <span className={dmg > 0 ? 'text-error' : 'text-on-surface-variant'}>{max - dmg} / {max}</span>
                    </div>
                    {aBonus > 0 && (
                      <div className="flex justify-between">
                        <span className="text-outline">🛡:</span>
                        <span className={aRemain < aBonus ? 'text-amber-400' : 'text-on-surface-variant'}>{aRemain} / {aBonus}</span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-outline-variant/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-outline">{pending < 0 ? 'Curar:' : 'Daño:'}</span>
                        <span className={`font-bold text-[10px] ${pending < 0 ? 'text-green-400' : pending > 0 ? 'text-error' : 'text-outline'}`}>
                          {pending > 0 ? `-${pending}` : pending < 0 ? `+${Math.abs(pending)}` : '—'}
                        </span>
                      </div>
                      <input
                        type="range" min={-max} max={max} value={pending}
                        onChange={e => setPendingByLoc(prev => ({ ...prev, [selectedLoc]: parseInt(e.target.value) }))}
                        onPointerUp={() => handleApplyDamage(selectedLoc)}
                        className="w-full h-1.5 cursor-pointer appearance-none"
                        style={{ background: bgSlider, accentColor: pending < 0 ? '#4ade80' : '#ef4444' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Turno */}
        <div className="bg-surface-container p-3 border-t-2 border-secondary/20 space-y-2 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[9px] font-bold text-primary-container tracking-[2px] uppercase">Turno</span>
            <button
              onClick={() => armas.forEach((a, i) => {
                if (!a.nombre) return;
                const def = INFANTRY_WEAPON_TABLE.find(w => w.name === a.nombre);
                const max = def ? parseInt(def.car) || 0 : 0;
                if (max > 0) onSetWeapon(i, { munActual: max });
              })}
              className="text-[8px] border border-primary-container/20 text-primary-fixed-dim hover:text-primary-container hover:border-primary-container/50 px-1.5 py-0.5 transition-all">
              ↺ Recargar
            </button>
          </div>
          {/* Armamento */}
          <div className="space-y-1">
            <div className="text-[8px] text-outline uppercase tracking-widest">Armamento</div>
          {armas.every(a => !a?.nombre) ? (
            <p className="text-[10px] text-outline italic py-1">Sin armas equipadas</p>
          ) : (
            <div className="space-y-1 flex-1">
              {armas.map((arma, i) => {
                if (!arma.nombre) return null;
                const resolvedName = resolveWeaponName(arma.nombre);
                const isSelected = selectedWeapon === i;
                const isRanged   = i < 3;
                const skill      = getWeaponSkillCandidates(resolvedName)[0] ?? null;
                const wmod       = getWeaponMod(resolvedName);

                return (
                  <button key={i}
                    onClick={() => handleSelectWeapon(i)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 border text-left transition-all ${
                      isSelected
                        ? 'bg-green-400/10 border-green-400/50 shadow-[0_0_8px_rgba(74,222,128,0.15)]'
                        : 'bg-surface-container-high/40 border-outline-variant/20 hover:border-outline-variant/50'
                    }`}>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[10px] truncate ${isSelected ? 'text-green-400' : 'text-on-surface'}`}>
                        {resolvedName}
                      </span>
                      <div className="flex gap-2">
                        {skill && <span className="text-[8px] text-outline">{skill}</span>}
                        {wmod !== 0 && (
                          <span className={`text-[8px] ${wmod < 0 ? 'text-green-400' : 'text-error'}`}>
                            {wmod > 0 ? `+${wmod}` : wmod} mod
                          </span>
                        )}
                      </div>
                    </div>
                    {isRanged && (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button onClick={e => { e.stopPropagation(); onSetWeapon(i, { munActual: Math.max(0, (arma.munActual ?? 0) - 1) }); }}
                          className="w-4 h-4 border border-error/30 text-error hover:bg-error/20 text-[9px] leading-none transition-all">−</button>
                        <span className={`w-5 text-center text-[10px] font-bold tabular-nums ${(arma.munActual ?? 0) === 0 ? 'text-error' : 'text-on-surface'}`}>
                          {arma.munActual ?? 0}
                        </span>
                        <button onClick={e => { e.stopPropagation(); onSetWeapon(i, { munActual: (arma.munActual ?? 0) + 1 }); }}
                          className="w-4 h-4 border border-primary/30 text-primary-fixed-dim hover:bg-primary/20 text-[9px] leading-none transition-all">+</button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          </div>
          {/* Habilidad activa */}
          <div className="border-t border-outline-variant/20 pt-2 space-y-1.5">
            <div className="text-[8px] text-outline uppercase tracking-widest">Habilidad actual</div>
            <div className={`px-2 py-1.5 border text-[11px] ${
              activeSkill
                ? 'border-green-400/40 text-green-400 bg-green-400/5'
                : missingPenalty > 0
                  ? 'border-amber-400/40 text-amber-400 italic'
                  : 'border-outline-variant/20 text-outline italic'
            }`}>
              {activeSkill ? activeSkill.nombre
                : missingPenalty > 0 ? `⚠️ Sin habilidad (+${missingPenalty})`
                : 'Selecciona un arma…'}
            </div>
            <div className="flex flex-wrap gap-1">
              {skills.filter(s => COMBAT_SKILLS.some(cs => s.nombre.toLowerCase().includes(cs))).map(s => {
                const tir = calcTIR(attrAvg, s.nivel);
                return (
                  <span key={s.nombre} className={`px-1.5 py-0.5 text-[8px] border ${
                    selectedSkill === s.nombre
                      ? 'bg-sky-400/10 border-sky-400/50 text-sky-400'
                      : 'border-green-400/20 text-outline'
                  }`}>
                    {s.nombre}<span className="ml-1 opacity-700">TIR{tir}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Alcance + Movimientos */}
          <div className="border-t border-outline-variant/20 pt-2 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Alcance */}
              <div className="space-y-1">
                <div className="text-[8px] text-outline uppercase tracking-widest">Alcance</div>
                {RANGE_OPTIONS.map(o => (
                  <RadioRow key={o.val} label={o.label} val={o.val} selected={range === o.val} onClick={() => setRange(o.val)} disabled={isMelee && o.val > 0} />
                ))}
              </div>
              {/* Mi Movimiento */}
              <div className="space-y-1">
                <div className="text-[8px] text-outline uppercase tracking-widest">Mi movimiento</div>
                {MOV_OPTIONS.map(o => (
                  <RadioRow key={o.val} label={o.label} val={o.val} selected={movSelf === o.val} onClick={() => setMovSelf(o.val)} />
                ))}
              </div>
              {/* Movimiento Objetivo */}
              <div className="space-y-1">
                <div className="text-[8px] text-outline uppercase tracking-widest">Movimiento del Objetivo</div>
                {MOV_OPTIONS.map(o => (
                  <RadioRow key={o.val} label={o.label} val={o.val} selected={movTarget === o.val} onClick={() => setMovTarget(o.val)} />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── TN Final ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary-container/10 to-black/80 border-2 border-primary-container/30 p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-5 items-center">

          {/* Desglose */}
          <div className="text-[11px] space-y-1">
            {[
              { label: 'Alcance',     val: range,          show: true              },
              { label: 'Mi Mov',      val: movSelf,         show: true              },
              { label: 'Mov Obj',     val: movTarget,       show: true              },
              { label: 'Mod Arma',    val: weaponMod,       show: weaponMod !== 0   },
              { label: 'Sin habilidad', val: missingPenalty, show: missingPenalty > 0 },
            ].filter(r => r.show).map(r => (
              <div key={r.label} className="flex justify-between border-b border-outline-variant/10 py-0.5">
                <span className="text-outline">{r.label}:</span>
                <span className={r.val > 0 ? 'text-error' : r.val < 0 ? 'text-green-400' : 'text-primary-container'}>
                  {r.val >= 0 ? '+' : ''}{r.val}
                </span>
              </div>
            ))}
          </div>

          {/* TN Final */}
          <div className="text-center px-4">
            <div className="text-[10px] text-amber-400 uppercase tracking-[2px] mb-1">TN Final</div>
            <div className={`font-headline font-black leading-none ${
              tnRaw !== null && tnRaw < 13 ? 'text-[56px] text-error'
              : tnRaw !== null && tnRaw >= 13 ? 'text-[40px] text-outline'
              : 'text-[40px] text-outline'
            }`} style={{ textShadow: tnRaw !== null && tnRaw < 13 ? '0 0 30px rgba(255,68,68,0.5)' : 'none' }}>
              {tnRaw === null ? '--' : tnRaw >= 13 ? 'N/A' : tnRaw}
            </div>
            {selectedWeapon !== null && armas[selectedWeapon]?.nombre && (
              <div className="text-[10px] text-green-400 mt-1">
                🔫 {resolveWeaponName(armas[selectedWeapon].nombre)}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <button onClick={handleDisparar}
              className="px-4 py-3 bg-gradient-to-br from-amber-500/80 to-amber-700/60 border-2 border-amber-400 text-black font-headline font-black text-[13px] uppercase tracking-widest hover:from-amber-400 hover:to-amber-600 transition-all">
              🎯 DISPARAR
            </button>
            <button onClick={handleNextTurn}
              className="px-4 py-2 bg-surface-container-high border border-primary-container/40 text-primary-container text-[11px] uppercase tracking-widest hover:bg-primary-container/10 transition-all">
              ⏭ SIG. TURNO
            </button>
          </div>
        </div>
      </div>

      {/* ── Combat Log ──────────────────────────────────────────── */}
      <div className="bg-surface-container p-3 border border-outline-variant/20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-primary-container uppercase tracking-widest">📜 Log de Combate</span>
            <span className="text-[11px] font-bold text-primary-container">Turno {turn}</span>
          </div>
          <button onClick={() => { setLog([]); setTurn(1); }}
            className="text-[8px] border border-outline-variant/20 text-outline hover:text-secondary px-2 py-0.5 transition-all">
            Limpiar
          </button>
        </div>
        <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-0.5 text-[10px]">
          {log.length === 0 ? (
            <span className="text-outline italic">Sin acciones registradas…</span>
          ) : (
            [...log].reverse().map((e, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-outline-variant/10">
                <span className="text-outline shrink-0">[{e.time}]</span>
                <span style={{ color: e.color }}>{e.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Radio Row ────────────────────────────────────────────────
function RadioRow({ label, val, selected, onClick, disabled = false }: {
  label: string; val: number; selected: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-1.5 border text-[11px] transition-all ${
        disabled
          ? 'opacity-25 cursor-not-allowed bg-black/10 border-outline-variant/10'
          : selected
            ? 'bg-green-400/15 border-green-400/50'
            : 'bg-black/20 border-outline-variant/20 text-outline hover:border-outline-variant/40'
      }`}>
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${
          selected && !disabled ? 'border-green-400 bg-green-400' : 'border-outline'
        }`} />
        <span className={selected ? 'text-on-surface' : 'text-on-surface-variant'}>{label}</span>
      </div>
      <span className={selected ? 'text-green-400' : 'text-outline'}>+{val}</span>
    </button>
  );
}

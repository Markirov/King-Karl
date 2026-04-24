import { useState } from 'react';
import { X, Crosshair, ChevronDown, ChevronRight, AlertTriangle, Plus, Minus } from 'lucide-react';
import type { VehicleState, VehicleSession } from '@/lib/combat-types';
import {
  vehicleGetEffectiveMP, vehicleGunneryMod,
  vehicleGetCritTable, VEHICLE_MOTIVE_CRIT_TABLE,
} from '@/lib/combat-data';

const LOC_LABEL: Record<string, string> = {
  FR: 'FRENTE', LT: 'IZQUIERDA', RT: 'DERECHA', RR: 'TRASERA',
  TU: 'TORRETA', T2: 'TORRETA 2', RO: 'ROTOR',
};

const DOT = 5;
const GAP = 1;

const VLOC_POS: Record<string, { top: number; left: number }> = {
  FR: { top: 5, left: 50 },
  LT: { top: 45, left: 28 },
  RT: { top: 45, left: 72 },
  RR: { top: 90, left: 50 },
  TU: { top: 45, left: 50 },
  T2: { top: 55, left: 50 },
  RO: { top: 45, left: 50 },
};

interface Props {
  state:           VehicleState;
  session:         VehicleSession;
  selectedSection: string | null;
  damageAmount:    number;
  setDamageAmount: (v: number) => void;
  onSectionClick:  (k: string) => void;
  setSelectedSection: (k: string | null) => void;
  onApplyDamage:   () => void;
  onToggleWeapon:  (id: number) => void;
  onNextTurn:      () => void;
  onToggleCrit:    (loc: string, idx: number) => void;
  onSetMoveMode:   (m: 'immobile' | 'cruise' | 'flank') => void;
  onSetMotive:     (count: number, immob: boolean) => void;
  onSetPilot:      (field: 'gunnery' | 'piloting' | 'name', v: number | string) => void;
  onApplyCritEffect?: (effectId: string, locKey?: string) => void;
  onAdjustPendingCrit?: (locKey: string, type: 'damage' | 'motive', delta: number) => void;
}

// ─── LocZone ─────────────────────────────────────────────────────────────────

function LocZone({ label, armorCur, armorMax, isCur, isMax, selected, onClick }: {
  label: string; armorCur: number; armorMax: number; isCur: number; isMax: number;
  selected: boolean; onClick: () => void;
}) {
  const cols = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(armorMax))));
  return (
    <div onClick={onClick}
      className={`cursor-pointer p-1.5 border transition-all ${
        selected ? 'bg-surface-container-high/90 border-primary shadow-[0_0_12px_rgba(223,186,116,0.25)]'
                 : 'bg-surface-container/70 border-outline-variant/25 hover:border-secondary/40 hover:bg-surface-container-high/80'
      }`}>
      <div className="flex justify-between items-center gap-2 mb-1">
        <span className={`text-[8px] font-mono font-bold leading-none ${selected ? 'text-primary' : 'text-secondary/70'}`}>{label}</span>
        <div className="flex items-center gap-1">
          <span className={`text-[8px] font-mono leading-none ${armorCur < armorMax ? 'text-error font-bold' : 'text-secondary/40'}`}>{armorCur}</span>
          {isMax > 0 && (<><span className="text-[7px] text-outline-variant/50">│</span>
            <span className={`text-[8px] font-mono leading-none ${isCur < isMax ? 'text-amber-400/90 font-bold' : 'text-secondary/30'}`}>{isCur}</span></>)}
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${DOT}px)`, gap: `${GAP}px` }}>
        {Array.from({ length: armorMax }).map((_, i) => (
          <div key={i} className={i < armorCur ? 'bg-secondary/80 shadow-[0_0_2px_rgba(153,207,218,0.3)]' : 'bg-outline-variant/20 border border-outline-variant/40'} style={{ width: DOT, height: DOT }} />
        ))}
      </div>
      {isMax > 0 && (<>
        <div className="mt-1 mb-0.5 border-t border-outline-variant/25" />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${DOT}px)`, gap: `${GAP}px` }}>
          {Array.from({ length: isMax }).map((_, i) => (
            <div key={i} className={i < isCur ? 'bg-error/65' : 'bg-outline-variant/20 border border-outline-variant/40'} style={{ width: DOT, height: DOT }} />
          ))}
        </div>
      </>)}
    </div>
  );
}

// ─── Crit Table Modal (dice resolution) ──────────────────────────────────────

function CritTableModal({ locKey, tableType, onSelect, onClose }: {
  locKey: string; tableType: 'damage' | 'motive';
  onSelect: (effectId: string) => void; onClose: () => void;
}) {
  const table = tableType === 'motive' ? VEHICLE_MOTIVE_CRIT_TABLE : vehicleGetCritTable(locKey);
  const title = tableType === 'motive' ? 'CRÍTICO MOTRIZ' : `CRÍTICO DAÑO — ${LOC_LABEL[locKey] ?? locKey}`;
  const isMotive = tableType === 'motive';

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container border-2 border-primary-container w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isMotive ? 'border-amber-400/30' : 'border-error/30'}`}>
          <h3 className={`font-mono text-[11px] font-bold uppercase tracking-[2px] ${isMotive ? 'text-amber-400' : 'text-error'}`}>{title}</h3>
          <button onClick={onClose} className="text-outline hover:text-on-surface"><X size={14} /></button>
        </div>
        <div className="p-3">
          <p className="font-mono text-[9px] text-outline mb-3">Resultado de la tirada 2D6:</p>
          <div className="space-y-0.5">
            {Object.entries(table).map(([dice, entry]) => {
              const fatal = entry.id.includes('killed') || entry.id.includes('fuel') || entry.id.includes('ammo') || entry.id === 'immobilized' || entry.id.includes('turret_destroyed');
              return (
                <button key={dice} onClick={() => onSelect(entry.id)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 text-[10px] font-mono text-left transition-all hover:bg-surface-container-high ${
                    entry.id === 'no_effect' ? 'text-outline/40' : fatal ? 'text-error hover:bg-error/10' : 'text-on-surface-variant'
                  }`}>
                  <span className={`font-bold w-5 text-center ${isMotive ? 'text-amber-400' : 'text-primary-container'}`}>{dice}</span>
                  <span className="flex-1">{entry.label}</span>
                  {fatal && <AlertTriangle size={10} className="text-error shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Weapon Picker Modal ─────────────────────────────────────────────────────

function WeaponPickerModal({ weapons, session, label, onPick, onClose }: {
  weapons: VehicleState['weapons']; session: VehicleSession;
  label: string; onPick: (id: number) => void; onClose: () => void;
}) {
  const available = weapons.filter(w => !(session.weaponDestroyedIds ?? []).includes(w.id) && (session.is[w.loc] ?? 1) > 0);
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container border-2 border-amber-400 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-400/30">
          <h3 className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-[2px]">{label}</h3>
          <button onClick={onClose} className="text-outline hover:text-on-surface"><X size={14} /></button>
        </div>
        <div className="p-3 space-y-1">
          {available.length === 0
            ? <p className="font-mono text-[9px] text-outline italic text-center py-4">Sin armas disponibles</p>
            : available.map(w => (
              <button key={w.id} onClick={() => onPick(w.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono hover:bg-surface-container-high transition-all text-left border-l-2 border-transparent hover:border-amber-400">
                <span className="font-bold text-on-surface uppercase">{w.name}</span>
                <span className="text-secondary/40">{LOC_LABEL[w.loc] ?? w.loc}</span>
              </button>
            ))}
          <button onClick={onClose} className="w-full mt-2 py-1.5 border border-outline-variant/25 text-outline font-mono text-[9px] uppercase tracking-widest hover:text-secondary transition-all">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Crits +/- button ────────────────────────────────────────────────

function CritCounter({ value, color, onInc, onDec }: { value: number; color: string; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={onDec} disabled={value === 0}
        className={`w-5 h-5 flex items-center justify-center border border-${color}/30 text-${color} disabled:opacity-20 hover:bg-${color}/10 transition-all`}>
        <Minus size={9} />
      </button>
      <span className={`font-mono text-[11px] font-bold w-5 text-center ${value > 0 ? `text-${color}` : 'text-outline/30'}`}>{value}</span>
      <button onClick={onInc}
        className={`w-5 h-5 flex items-center justify-center border border-${color}/30 text-${color} hover:bg-${color}/10 transition-all`}>
        <Plus size={9} />
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VehiclePanel({
  state, session, selectedSection, damageAmount, setDamageAmount,
  onSectionClick, setSelectedSection, onApplyDamage,
  onToggleWeapon, onNextTurn,
  onToggleCrit, onSetMoveMode, onSetMotive, onSetPilot,
  onApplyCritEffect, onAdjustPendingCrit,
}: Props) {
  const [showCrits, setShowCrits] = useState(false);
  // Modal state: which table to show, and chained steps
  const [modal, setModal] = useState<{
    step: 'closed' | 'table' | 'weapon_pick';
    locKey: string;
    tableType: 'damage' | 'motive';
    pendingEffectId?: string;
  }>({ step: 'closed', locKey: '', tableType: 'damage' });

  const isVTOL = state.motiveType.toUpperCase().includes('VTOL');
  const locs = state.locations;
  const hasLoc = (key: string) => locs.some(l => l.key === key);
  const locDef = (key: string) => locs.find(l => l.key === key);
  const gunMod = vehicleGunneryMod(session);
  const gunneryTotal = session.pilot.gunnery + gunMod;
  const mp = vehicleGetEffectiveMP(state, session);
  const fx = session.effects ?? {};
  const pc = session.pendingCrits ?? {};
  const totalPending = Object.values(pc).reduce((a, c) => a + c.damage + c.motive, 0);
  const [endingTurn, setEndingTurn] = useState(false);

  const zone = (key: string) => {
    const def = locDef(key)!;
    return { armorCur: session.armor[key] ?? 0, armorMax: def.maxArmor, isCur: session.is[key] ?? 0, isMax: def.maxIS };
  };

  // ── Find next pending crit (damage first, then motive) ──
  const findNextPending = (): { locKey: string; type: 'damage' | 'motive' } | null => {
    // Use session.pendingCrits directly for freshest data
    const current = session.pendingCrits ?? {};
    // Damage crits first, all locations
    for (const loc of locs) {
      const c = current[loc.key];
      if (c && c.damage > 0) return { locKey: loc.key, type: 'damage' };
    }
    // Then motive crits (non-turret)
    for (const loc of locs) {
      if (loc.key === 'TU' || loc.key === 'T2') continue;
      const c = current[loc.key];
      if (c && c.motive > 0) return { locKey: loc.key, type: 'motive' };
    }
    return null;
  };

  // ── Open next pending or finish turn ──
  const openNextOrFinish = () => {
    const next = findNextPending();
    if (next) {
      setModal({ step: 'table', locKey: next.locKey, tableType: next.type });
    } else {
      // All crits resolved → actually end the turn
      setEndingTurn(false);
      setModal({ step: 'closed', locKey: '', tableType: 'damage' });
      onNextTurn();
    }
  };

  // ── "Fin de Turno" handler ──
  const handleEndTurn = () => {
    if (totalPending > 0) {
      setEndingTurn(true);
      const next = findNextPending();
      if (next) {
        setModal({ step: 'table', locKey: next.locKey, tableType: next.type });
      }
    } else {
      onNextTurn();
    }
  };

  // ── Manual resolve (from table click) ──
  const resolveCrit = (locKey: string, type: 'damage' | 'motive') => {
    const cur = pc[locKey];
    if (!cur || cur[type] <= 0) return;
    setModal({ step: 'table', locKey, tableType: type });
  };

  // ── After picking a dice result ──
  const handleCritResult = (effectId: string) => {
    const { locKey, tableType } = modal;
    onAdjustPendingCrit?.(locKey, tableType, -1);

    if (effectId === 'no_effect') {
      if (endingTurn) { setTimeout(openNextOrFinish, 50); } // small delay for state to update
      else setModal({ step: 'closed', locKey: '', tableType: 'damage' });
      return;
    }
    if (effectId === 'weapon_malfunction' || effectId === 'weapon_destroyed' || effectId === 'ammo_weapon') {
      setModal({ ...modal, step: 'weapon_pick', pendingEffectId: effectId });
      return;
    }
    if (effectId === 'engine_hit') {
      onApplyCritEffect?.(effectId, locKey);
      setModal({ step: 'table', locKey, tableType: 'motive', pendingEffectId: 'engine_extra' });
      return;
    }
    onApplyCritEffect?.(effectId, locKey);
    if (endingTurn) { setTimeout(openNextOrFinish, 50); }
    else setModal({ step: 'closed', locKey: '', tableType: 'damage' });
  };

  const handleMotiveFromEngine = (effectId: string) => {
    if (effectId !== 'no_effect') onApplyCritEffect?.(effectId);
    if (endingTurn) { setTimeout(openNextOrFinish, 50); }
    else setModal({ step: 'closed', locKey: '', tableType: 'damage' });
  };

  const handleWeaponPick = (_weaponId: number) => {
    const eid = modal.pendingEffectId;
    if (eid) onApplyCritEffect?.(eid, modal.locKey);
    if (endingTurn) { setTimeout(openNextOrFinish, 50); }
    else setModal({ step: 'closed', locKey: '', tableType: 'damage' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 max-w-7xl mx-auto">

      {/* ── LEFT COL ── */}
      <div className="col-span-1 lg:col-span-3 space-y-4">

        {/* Vehicle info */}
        <section className="bg-surface-container-low p-4 clip-chamfer border-l-2 border-primary-container/30 space-y-2">
          <div>
            <div className="font-headline text-base font-black text-primary-container uppercase tracking-tight">{state.name}</div>
            <div className="font-mono text-[10px] text-secondary/50">{state.model}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-[10px] font-mono">
            <div className="text-secondary/40">Tonelaje</div> <div>{state.tons}t</div>
            <div className="text-secondary/40">Tipo</div> <div className="capitalize">{state.motiveType}</div>
            <div className="text-secondary/40">Crucero</div> <div className={mp.cruise < state.cruise ? 'text-amber-400' : ''}>{mp.cruise} MP{mp.cruise < state.cruise ? ` (${state.cruise})` : ''}</div>
            <div className="text-secondary/40">Flanqueo</div> <div className={mp.cruise < state.cruise ? 'text-amber-400' : ''}>{mp.flank} MP</div>
          </div>
        </section>

        {/* Pilot */}
        <section className="bg-surface-container-low p-4 clip-chamfer border-l-2 border-primary-container/30 space-y-2">
          <h3 className="font-headline text-[10px] font-bold text-primary-container/60 tracking-[2px] uppercase">Piloto</h3>
          <input value={session.pilot.name} onChange={e => onSetPilot('name', e.target.value)}
            placeholder="Nombre del piloto"
            className="w-full h-7 bg-surface-container border border-outline-variant/25 px-2 font-mono text-[10px] text-on-surface focus:outline-none focus:border-primary" />
          <div className="grid grid-cols-2 gap-2">
            {(['gunnery', 'piloting'] as const).map(f => (
              <div key={f} className="space-y-0.5">
                <div className="text-[8px] text-secondary/40 uppercase tracking-widest">{f === 'gunnery' ? 'Disparo' : 'Pilotaje'}</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onSetPilot(f, Math.max(0, session.pilot[f] - 1))} className="w-5 h-5 border border-outline-variant/30 text-secondary/50 hover:bg-surface-container-high text-[10px]">−</button>
                  <span className="text-primary-container font-bold font-mono text-sm w-4 text-center">{session.pilot[f]}</span>
                  <button onClick={() => onSetPilot(f, Math.min(9, session.pilot[f] + 1))} className="w-5 h-5 border border-outline-variant/30 text-secondary/50 hover:bg-surface-container-high text-[10px]">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-outline-variant/20 pt-2 text-[10px] font-mono">
            <span className="text-secondary/40">Disparo total: </span>
            <span className="text-primary-container font-bold">{gunneryTotal >= 13 ? 'N/A' : `${gunneryTotal}+`}</span>
            {gunMod !== 0 && <span className={gunMod < 0 ? 'text-green-400/70' : 'text-amber-400/70'}> ({gunMod > 0 ? '+' : ''}{gunMod})</span>}
          </div>
        </section>

        {/* Active effects */}
        {Object.values(fx).some(v => v) && (
          <section className="bg-surface-container-low p-3 clip-chamfer border-l-2 border-error/30 space-y-1">
            <h3 className="font-headline text-[10px] font-bold text-error/60 tracking-[2px] uppercase mb-1">Efectos activos</h3>
            <div className="space-y-0.5 text-[9px] font-mono">
              {(fx.stabilizer ?? 0) > 0 && <div className="text-amber-400">Estabilizador ×{fx.stabilizer}: +{fx.stabilizer} disparo</div>}
              {(fx.sensors ?? 0) > 0 && <div className="text-amber-400">Sensores ×{fx.sensors}: +{(fx.sensors ?? 0) * 2} disparo</div>}
              {fx.commanderHit && <div className="text-error">Comandante herido: +2 todo</div>}
              {(fx.crewStunned ?? 0) > 0 && <div className="text-error font-bold">Tripulación aturdida ({fx.crewStunned}t)</div>}
              {(fx.driverHit ?? 0) > 0 && <div className="text-amber-400">Conductor herido ×{fx.driverHit}</div>}
              {(fx.pilotingMod ?? 0) > 0 && <div className="text-amber-400">Pilotaje motriz: +{fx.pilotingMod}</div>}
              {fx.turretLocked && <div className="text-error font-bold">Torreta BLOQUEADA</div>}
              {fx.turretDestroyed && <div className="text-error font-bold">Torreta DESTRUIDA</div>}
              {(fx.turretJammedCount ?? 0) > 0 && <div className="text-amber-400">Torreta atascada ({fx.turretJammedCount}t)</div>}
              {(fx.cargoHit ?? 0) > 0 && <div className="text-secondary/50">Carga ×{fx.cargoHit}</div>}
              {fx.fuelEngineDestroyed && <div className="text-error font-bold">Motor DESTRUIDO</div>}
              {session.immobilized && <div className="text-error font-bold">INMOVILIZADO</div>}
            </div>
          </section>
        )}

        {/* Movement */}
        <section className="bg-surface-container-low p-3 clip-chamfer border-l-2 border-primary-container/30 space-y-2">
          <h3 className="font-headline text-[10px] font-bold text-primary-container/60 tracking-[2px] uppercase">Movimiento</h3>
          <div className="flex gap-1.5">
            {([['immobile', 'Inmóvil', '−1'], ['cruise', 'Crucero', ''], ['flank', 'Flanqueo', '+1']] as const).map(([m, label, hint]) => {
              const disabled = session.immobilized && m !== 'immobile';
              return (
                <button key={m} onClick={() => !disabled && onSetMoveMode(m as any)} disabled={disabled}
                  className={`flex-1 py-1.5 text-[9px] font-mono uppercase border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    session.moveMode === m
                      ? m === 'immobile' ? 'bg-green-400/20 border-green-400 text-green-400' : 'bg-primary-container/20 border-primary-container text-primary-container'
                      : 'border-outline-variant/30 text-secondary/50 hover:border-primary-container/40'
                  }`}>
                  {label}{hint && <span className="block text-[7px] opacity-60">{hint} disp</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Motive damage */}
        <section className="bg-surface-container-low p-3 clip-chamfer border-l-2 border-amber-400/30 space-y-2">
          <h3 className="font-headline text-[10px] font-bold text-amber-400/60 tracking-[2px] uppercase">Daño Motriz</h3>
          <div className="space-y-1 text-[9px] font-mono">
            <div className="flex items-center justify-between"><span className="text-secondary/40">Motor (−1 PM)</span><span className="text-amber-400">{session.motiveMP ?? 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-secondary/40">Medios (/2 PM)</span><span className="text-amber-400">{session.motiveHalfCount}</span></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={session.immobilized} onChange={e => onSetMotive(session.motiveHalfCount, e.target.checked)} className="accent-error" />
            <span className={`text-[10px] font-mono ${session.immobilized ? 'text-error font-bold' : 'text-secondary/40'}`}>INMOVILIZADO</span>
          </label>
        </section>

        {/* End of turn */}
        <button onClick={handleEndTurn} disabled={session.destroyed}
          className={`w-full disabled:opacity-30 disabled:cursor-not-allowed border font-headline font-bold uppercase tracking-widest py-4 clip-chamfer transition-all flex items-center justify-center gap-2 ${
            totalPending > 0
              ? 'bg-amber-400/20 hover:bg-amber-400/40 border-amber-400 text-amber-400'
              : 'bg-error/20 hover:bg-error/40 border-error text-error'
          }`}>
          <Crosshair size={20} />
          {session.destroyed ? 'DESTRUIDO' : totalPending > 0 ? `Resolver críticos (${totalPending})` : 'Fin de Turno'}
        </button>
      </div>

      {/* ── CENTER: Armor diagram ── */}
      <div className="col-span-1 lg:col-span-6 space-y-4">
        <div className="bg-surface-container p-4 clip-chamfer border-t-2 border-primary-container/40 flex flex-col relative overflow-hidden">
          <img src={`${import.meta.env.BASE_URL}${isVTOL ? 'VTOL' : 'vehicle-blueprint'}.png`} alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-60 mix-blend-screen"
            style={{ filter: 'invert(0) hue-rotate(180deg)' }} />
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline text-[10px] font-bold text-primary-container/60 tracking-[3px] uppercase">Blindaje / EI</h2>
            <div className="flex gap-3 text-[9px] font-mono text-secondary/40 uppercase">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-secondary/70 inline-block" /> BL</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-error/60 inline-block" /> EI</span>
            </div>
          </div>

          <div className="flex-1 relative min-h-[400px]">
            {(['FR', 'LT', 'RT', 'RR', 'TU', 'T2', 'RO'] as const).filter(k => hasLoc(k)).map(k => {
              const pos = VLOC_POS[k] ?? { top: 50, left: 50 };
              return (
                <div key={k} className="absolute z-10 transition-all duration-200 hover:z-20"
                  style={{ top: `${pos.top}%`, left: `${pos.left}%`, transform: 'translate(-50%, -50%)' }}>
                  <LocZone label={LOC_LABEL[k] ?? k} {...zone(k)} selected={selectedSection === k}
                    onClick={() => onSectionClick(k)} />
                </div>
              );
            })}

            {/* Detail panel */}
            {selectedSection && (() => {
              const def = locDef(selectedSection);
              if (!def) return null;
              const armorCur = session.armor[selectedSection] ?? 0;
              const isCur    = session.is[selectedSection] ?? 0;
              return (
                <div className="absolute top-0 right-0 w-56 bg-surface-container-high border-l-2 border-primary-container/50 p-3 clip-chamfer z-30 shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
                  <div className="flex justify-between items-start mb-2 border-b border-outline-variant pb-1">
                    <h3 className="font-headline text-xs font-bold text-primary-container uppercase">{LOC_LABEL[selectedSection] ?? selectedSection}</h3>
                    <button onClick={() => setSelectedSection(null)} className="text-secondary hover:text-primary"><X size={14} /></button>
                  </div>
                  <div className="space-y-2 font-mono text-[9px]">
                    <div className="flex justify-between"><span className="text-secondary/60">BLINDAJE:</span><span>{armorCur} / {def.maxArmor}</span></div>
                    {def.maxIS > 0 && <div className="flex justify-between"><span className="text-secondary/60">EI:</span><span>{isCur} / {def.maxIS}</span></div>}
                    <div className="pt-2 border-t border-outline-variant">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-secondary/60">{damageAmount < 0 ? 'CURAR:' : 'DAÑO:'}</span>
                        <span className={`font-bold text-[10px] ${damageAmount < 0 ? 'text-primary' : damageAmount > 0 ? 'text-error' : 'text-secondary/40'}`}>
                          {damageAmount > 0 ? `+${damageAmount}` : damageAmount}
                        </span>
                      </div>
                      <input type="range" min="-15" max="30" value={damageAmount}
                        onChange={e => setDamageAmount(parseInt(e.target.value))}
                        className="w-full h-1 appearance-none cursor-pointer"
                        style={{ accentColor: damageAmount < 0 ? 'var(--p)' : 'var(--error)' }} />
                      <button onClick={onApplyDamage} disabled={damageAmount === 0}
                        className={`mt-2 w-full disabled:opacity-50 disabled:cursor-not-allowed py-1 uppercase tracking-widest transition-colors border ${
                          damageAmount < 0 ? 'bg-primary/20 hover:bg-primary/40 border-primary text-primary' : 'bg-error/20 hover:bg-error/40 border-error text-error'
                        }`}>{damageAmount < 0 ? 'Curar' : 'Aplicar'}</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ═══ PENDING CRITS TABLE ═══ */}
        <div className="bg-surface-container-low p-4 clip-chamfer border-t-2 border-error/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline text-[10px] font-bold text-error tracking-[3px] uppercase">Críticos pendientes</h2>
            {totalPending > 0 && <span className="font-mono text-[9px] text-error font-bold">{totalPending} pendiente{totalPending > 1 ? 's' : ''}</span>}
          </div>

          <table className="w-full font-mono text-[9px]">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="text-left py-1.5 text-secondary/40 uppercase tracking-widest font-normal" />
                <th className="text-center py-1.5 text-error/60 uppercase tracking-widest font-normal w-28">Daño</th>
                <th className="text-center py-1.5 text-amber-400/60 uppercase tracking-widest font-normal w-28">Motriz</th>
              </tr>
            </thead>
            <tbody>
              {locs.filter(l => l.key !== 'T2').map(loc => {
                const cur = pc[loc.key] ?? { damage: 0, motive: 0 };
                const isTurret = loc.key === 'TU';
                return (
                  <tr key={loc.key} className="border-b border-outline-variant/8">
                    <td className="py-1.5 text-secondary/70 uppercase tracking-widest">{loc.label}</td>
                    <td className="py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onAdjustPendingCrit?.(loc.key, 'damage', -1)} disabled={cur.damage === 0}
                          className="w-5 h-5 flex items-center justify-center border border-error/25 text-error disabled:opacity-20 hover:bg-error/10 transition-all"><Minus size={8} /></button>
                        <span className={`w-5 text-center font-bold ${cur.damage > 0 ? 'text-error' : 'text-outline/25'}`}>{cur.damage}</span>
                        <button onClick={() => onAdjustPendingCrit?.(loc.key, 'damage', 1)}
                          className="w-5 h-5 flex items-center justify-center border border-error/25 text-error hover:bg-error/10 transition-all"><Plus size={8} /></button>
                        {cur.damage > 0 && (
                          <button onClick={() => resolveCrit(loc.key, 'damage')}
                            className="ml-1 px-1.5 py-0.5 border border-error/40 text-error text-[8px] uppercase tracking-widest hover:bg-error/10 transition-all">
                            Tirar
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5">
                      {!isTurret ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onAdjustPendingCrit?.(loc.key, 'motive', -1)} disabled={cur.motive === 0}
                            className="w-5 h-5 flex items-center justify-center border border-amber-400/25 text-amber-400 disabled:opacity-20 hover:bg-amber-400/10 transition-all"><Minus size={8} /></button>
                          <span className={`w-5 text-center font-bold ${cur.motive > 0 ? 'text-amber-400' : 'text-outline/25'}`}>{cur.motive}</span>
                          <button onClick={() => onAdjustPendingCrit?.(loc.key, 'motive', 1)}
                            className="w-5 h-5 flex items-center justify-center border border-amber-400/25 text-amber-400 hover:bg-amber-400/10 transition-all"><Plus size={8} /></button>
                          {cur.motive > 0 && (
                            <button onClick={() => resolveCrit(loc.key, 'motive')}
                              className="ml-1 px-1.5 py-0.5 border border-amber-400/40 text-amber-400 text-[8px] uppercase tracking-widest hover:bg-amber-400/10 transition-all">
                              Tirar
                            </button>
                          )}
                        </div>
                      ) : <span className="text-outline/20 text-center block">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RIGHT COL ── */}
      <div className="col-span-1 lg:col-span-3 space-y-4">

        {/* Weapons */}
        <section className="bg-surface-container-low p-4 clip-chamfer border-l-2 border-primary-container/30">
          <h2 className="font-headline text-sm font-bold text-primary-container tracking-widest uppercase mb-3">Armas</h2>
          {state.weapons.length === 0 ? (
            <div className="font-mono text-[10px] text-secondary/40 italic py-4 text-center">Sin armas</div>
          ) : (
            <div className="space-y-1">
              {state.weapons.map(w => {
                const isActive     = session.activeShots[w.id] ?? false;
                const noAmmo       = w.ammoKey !== undefined && (session.ammoPools[w.ammoKey] ?? 0) <= 0;
                const locDest      = (session.is[w.loc] ?? 1) <= 0;
                const wDestroyed   = (session.weaponDestroyedIds ?? []).includes(w.id);
                const wMalfunction = (session.weaponMalfunctionIds ?? []).includes(w.id);
                const disabled     = locDest || wDestroyed || wMalfunction || noAmmo;
                const ammoLeft     = w.ammoKey ? (session.ammoPools[w.ammoKey] ?? 0) : null;
                return (
                  <div key={w.id} onClick={() => !disabled && onToggleWeapon(w.id)}
                    className={`flex items-center justify-between p-2 transition-all text-[10px] font-mono border-l-2 ${
                      wDestroyed   ? 'opacity-20 cursor-not-allowed border-error line-through'
                      : wMalfunction ? 'opacity-40 cursor-not-allowed border-amber-400 italic'
                      : locDest    ? 'opacity-20 cursor-not-allowed border-error line-through'
                      : isActive   ? 'bg-error/20 border-error text-error cursor-pointer'
                      : noAmmo     ? 'opacity-40 border-outline-variant cursor-not-allowed'
                                   : 'border-transparent hover:bg-secondary/10 text-secondary cursor-pointer'
                    }`}>
                    <div className="flex flex-col">
                      <span className="font-bold uppercase">{w.name}</span>
                      <span className="text-[8px] text-secondary/40">{LOC_LABEL[w.loc] ?? w.loc} · {w.r}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px]">
                      {w.heat > 0 && <span>🔥{w.heat}</span>}
                      <span>💥{w.dmg}</span>
                      {ammoLeft !== null && <span className={noAmmo ? 'text-error font-bold' : 'text-secondary/50'}>{ammoLeft}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Ammo */}
        {Object.keys(session.ammoPools).length > 0 && (
          <section className="bg-surface-container-low p-3 clip-chamfer border-l-2 border-amber-400/20">
            <h3 className="font-headline text-[10px] font-bold text-amber-400/60 tracking-[2px] uppercase mb-2">Munición</h3>
            <div className="space-y-1">
              {Object.entries(session.ammoPools).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-secondary/50 truncate max-w-[120px]">{key}</span>
                  <span className={`font-bold tabular-nums ${count <= 0 ? 'text-error' : 'text-on-surface/70'}`}>{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Crits */}
        {Object.values(session.crits).some(slots => slots.some(s => s.name !== '-')) && (
          <section className="bg-surface-container-low clip-chamfer border border-outline-variant/20">
            <button onClick={() => setShowCrits(v => !v)} className="w-full flex items-center justify-between p-3 hover:bg-surface-container transition-all">
              <span className="font-headline text-[10px] font-bold text-primary-container/60 tracking-[2px] uppercase">Críticos</span>
              {showCrits ? <ChevronDown size={14} className="text-secondary/40" /> : <ChevronRight size={14} className="text-secondary/40" />}
            </button>
            {showCrits && (
              <div className="px-3 pb-3 space-y-3">
                {Object.entries(session.crits).map(([loc, slots]) => {
                  if (!slots.some(s => s.name !== '-')) return null;
                  return (
                    <div key={loc} className="space-y-1">
                      <div className="text-[8px] text-primary-container/50 tracking-[2px] uppercase font-bold">{LOC_LABEL[loc] ?? loc}</div>
                      <div className="flex flex-wrap gap-1">
                        {slots.map((slot, i) => slot.name === '-' ? null : (
                          <button key={i} onClick={() => onToggleCrit(loc, i)}
                            className={`px-2 py-0.5 text-[8px] font-mono border transition-all ${
                              slot.hit ? 'bg-error/20 border-error/60 text-error line-through' : 'border-outline-variant/25 text-secondary/60 hover:border-primary-container/40'
                            }`}>{slot.name}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Log */}
        <section className="bg-surface-container-low p-3 clip-chamfer border-l-2 border-outline-variant/20">
          <h3 className="font-headline text-[10px] font-bold text-primary-container/40 tracking-[2px] uppercase mb-2">Log</h3>
          <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
            {session.logs.length === 0 ? (
              <div className="font-mono text-[9px] text-secondary/25 italic">Sin entradas</div>
            ) : session.logs.map((line, i) => (
              <div key={i} className={`font-mono text-[9px] leading-tight ${
                line.includes('DESTRUIDO') || line.includes('MUERTA') || line.includes('EXPLOSIÓN') ? 'text-error font-bold'
                : line.includes('CRIT') || line.includes('MOTRIZ') ? 'text-amber-400' : 'text-secondary/50'
              }`}>{line}</div>
            ))}
          </div>
        </section>
      </div>

      {/* ── MODALS ── */}
      {modal.step === 'table' && (
        <CritTableModal locKey={modal.locKey} tableType={modal.tableType}
          onSelect={modal.pendingEffectId === 'engine_extra' ? handleMotiveFromEngine : handleCritResult}
          onClose={() => setModal({ step: 'closed', locKey: '', tableType: 'damage' })} />
      )}
      {modal.step === 'weapon_pick' && (
        <WeaponPickerModal weapons={state.weapons} session={session}
          label={modal.pendingEffectId === 'weapon_malfunction' ? 'Fallo de arma' : modal.pendingEffectId === 'ammo_weapon' ? 'Munición/Arma' : 'Arma destruida'}
          onPick={handleWeaponPick}
          onClose={() => setModal({ step: 'closed', locKey: '', tableType: 'damage' })} />
      )}
    </div>
  );
}

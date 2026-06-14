import { useState } from 'react';
import type { BASlot, FireTarget } from '@/lib/combat-types';
import { BASuitGrid } from './BASuitGrid';

const MOVE_LABEL: Record<string, string> = {
  stand: 'FIRME', walk: 'MARCHA', jump: 'SALTO', prone: 'CUBIERTO', swarming: 'SWARM',
};
const TYPE_LABEL: Record<string, string> = { mech: 'MCH', vehicle: 'VHC', inf: 'INF', ba: 'BA' };
const TYPE_COLOR: Record<string, string> = {
  mech: 'border-green-500/50 text-green-400', vehicle: 'border-secondary/50 text-secondary',
  inf:  'border-amber-400/50 text-amber-400', ba: 'border-purple-400/50 text-purple-400',
};

interface Props {
  slot:            BASlot;
  targets?:        FireTarget[];
  onFireWeaponAt?: (weaponId: number, rangeBand: 0 | 1 | 2, target: FireTarget | null) => void;
  onNextTurn?:     () => void;
  onApplyDamage?:  (targetSuit: number | 'cluster', amount: number) => void;
}

export function BAPanel({ slot, targets = [], onFireWeaponAt, onNextTurn, onApplyDamage }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<FireTarget | null>(null);
  const { state, session } = slot;

  if (!state || !session) {
    return (
      <div className="flex items-center justify-center h-48 border border-outline-variant/20 bg-surface-container-low clip-chamfer">
        <span className="font-mono text-[10px] text-outline tracking-widest">SLOT VACÍO</span>
      </div>
    );
  }

  const aliveSuits = session.suits.filter(s => s.alive).length;

  return (
    <div className="bg-surface-container border border-outline-variant/40 clip-chamfer flex flex-col divide-y divide-outline-variant/20">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <div className="font-mono text-[11px] text-primary tracking-widest uppercase">
            {state.name}
            <span className="ml-2 text-outline text-[9px]">{state.faction} · {state.weightClass.toUpperCase()}</span>
          </div>
          <div className="font-mono text-[9px] text-outline tracking-widest mt-0.5">
            W{state.walkMP}{state.jumpMP > 0 ? `/J${state.jumpMP}` : ''}
            {state.magneticClamps ? ' · CLAMPS' : ''}
            {state.stealthArmor  ? ' · STEALTH' : ''}
            {state.antiMech      ? ' · ANTI-MECH' : ''}
          </div>
        </div>
        <div className={`font-mono text-[10px] px-2 py-0.5 border ${
          session.destroyed
            ? 'border-red-500 text-red-500'
            : aliveSuits < state.suitCount * 0.5
            ? 'border-yellow-400 text-yellow-400'
            : 'border-primary text-primary'
        }`}>
          {session.destroyed ? 'ELIMINADO' : `${aliveSuits}/${state.suitCount} SUITS`}
        </div>
      </div>

      {/* Suit grid — click armor dots to mark pending damage */}
      <div className="px-3 py-2">
        <BASuitGrid
          state={state}
          suits={session.suits}
          onApplySuit={onApplyDamage ? (idx, dmg) => onApplyDamage(idx, dmg) : undefined}
        />
      </div>

      {/* Movement */}
      <div className="px-3 py-2">
        <div className="font-mono text-[8px] text-outline tracking-widest mb-1.5">MOVIMIENTO</div>
        <div className="flex flex-wrap gap-1">
          {(['stand', 'walk', 'jump', 'prone', 'swarming'] as const).map(m => {
            const disabled = m === 'jump' && state.jumpMP === 0;
            return (
              <div key={m} className={`font-mono text-[8px] px-2 py-0.5 border tracking-widest ${
                session.moveMode === m
                  ? 'border-primary bg-primary/10 text-primary'
                  : disabled
                  ? 'border-outline-variant/20 text-outline/30'
                  : 'border-outline-variant/40 text-outline'
              }`}>{MOVE_LABEL[m]}</div>
            );
          })}
        </div>
      </div>

      {/* Weapons + target selector */}
      <div className="px-3 py-2 space-y-2">
        <div className="font-mono text-[8px] text-outline tracking-widest">ARMAS</div>

        {/* Target selector */}
        {targets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedTarget(null)}
              className={`font-mono text-[7px] px-1.5 py-0.5 border tracking-widest transition-colors ${
                !selectedTarget
                  ? 'border-outline-variant text-secondary bg-outline-variant/10'
                  : 'border-outline-variant/30 text-outline/50 hover:border-outline-variant'
              }`}
            >
              SIN OBJ
            </button>
            {targets.map(t => (
              <button
                key={`${t.type}-${t.slotIdx}`}
                onClick={() => setSelectedTarget(prev => prev?.type === t.type && prev.slotIdx === t.slotIdx ? null : t)}
                className={`font-mono text-[7px] px-1.5 py-0.5 border tracking-widest transition-colors ${
                  selectedTarget?.type === t.type && selectedTarget.slotIdx === t.slotIdx
                    ? `${TYPE_COLOR[t.type]} bg-current/10`
                    : 'border-outline-variant/30 text-outline/50 hover:border-outline-variant hover:text-outline'
                }`}
              >
                <span className="opacity-50 mr-0.5">[{TYPE_LABEL[t.type]}]</span>{t.label}
              </button>
            ))}
          </div>
        )}

        {/* Weapon rows */}
        <div className="space-y-2">
          {state.weapons.map(w => {
            const allFired    = session.suits.filter(s => s.alive).every(s => s.weaponsFiredThisTurn[w.id]);
            const allExpended = session.suits.filter(s => s.alive).every(s => s.weaponsExpended[w.id]);
            const canFire     = onFireWeaponAt && !session.destroyed && !allFired && !allExpended;

            return (
              <div key={w.id} className={`flex items-center gap-2 ${allExpended ? 'opacity-30' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-secondary truncate">
                    {w.name}
                    {w.oneShot && <span className="ml-1 text-[7px] text-yellow-500 border border-yellow-600 px-1">OS</span>}
                    {allFired && !allExpended && <span className="ml-1 text-[7px] text-outline">(DISPARADO)</span>}
                    {allExpended && <span className="ml-1 text-[7px] text-red-500">(AGOTADO)</span>}
                  </div>
                  <div className="font-mono text-[8px] text-outline">
                    {w.damagePerShot} dmg/suit · S{w.rangeShort}/M{w.rangeMedium}/L{w.rangeLong}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {([
                    { label: 'C', band: 0 as const, range: w.rangeShort },
                    { label: 'M', band: 1 as const, range: w.rangeMedium },
                    { label: 'L', band: 2 as const, range: w.rangeLong },
                  ] as const).map(rb => (
                    <button
                      key={rb.label}
                      onClick={() => canFire && onFireWeaponAt!(w.id, rb.band, selectedTarget)}
                      disabled={!canFire || rb.range === 0}
                      className={`font-mono text-[8px] w-5 h-5 border flex items-center justify-center transition-colors ${
                        !canFire || rb.range === 0
                          ? 'border-outline-variant/20 text-outline/30 cursor-not-allowed'
                          : 'border-outline-variant/60 text-outline hover:border-primary hover:text-primary cursor-pointer'
                      }`}
                    >
                      {rb.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Anti-mech */}
      {state.antiMech && (
        <div className="px-3 py-2">
          <div className="font-mono text-[8px] text-outline tracking-widest mb-1.5">ANTI-MECH</div>
          <div className="flex gap-2">
            <div className="font-mono text-[9px] px-3 py-1.5 border border-outline-variant/40 text-outline tracking-widest">LEG ATTACK →</div>
            <div className="font-mono text-[9px] px-3 py-1.5 border border-outline-variant/40 text-outline tracking-widest">SWARM →</div>
          </div>
        </div>
      )}

      {/* Fin de turno */}
      {onNextTurn && (
        <div className="px-3 py-2">
          <button
            onClick={onNextTurn}
            disabled={session.destroyed}
            className="w-full font-mono text-[9px] tracking-widest uppercase py-2 border border-outline-variant/60 text-outline hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Fin de Turno
          </button>
        </div>
      )}

      {/* Log */}
      {session.logs.length > 0 && (
        <div className="px-3 py-2 max-h-24 overflow-y-auto">
          <div className="font-mono text-[8px] text-outline tracking-widest mb-1">LOG</div>
          {session.logs.slice(-5).reverse().map((l, i) => (
            <div key={i} className="font-mono text-[9px] text-on-surface-variant leading-relaxed">› {l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

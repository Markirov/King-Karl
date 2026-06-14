import { useState } from 'react';
import type { InfantrySlot, DamageFlags, FireTarget } from '@/lib/combat-types';
import { TrooperBar } from './TrooperBar';

const MOV_LABEL: Record<string, string> = {
  foot: 'Pie', motorized: 'Motorizada', mechanized: 'Mecanizada', jump: 'Salto',
};
const MOVE_MODES = ['stand', 'walk', 'jump', 'prone', 'dug-in'] as const;
const MOVE_LABEL: Record<string, string> = {
  stand: 'FIRME', walk: 'MARCHA', jump: 'SALTO', prone: 'CUBIERTO', 'dug-in': 'ATRINCHERADO',
};

const TYPE_LABEL: Record<string, string> = { mech: 'MCH', vehicle: 'VHC', inf: 'INF', ba: 'BA' };
const TYPE_COLOR: Record<string, string> = {
  mech:    'border-green-500/50 text-green-400',
  vehicle: 'border-secondary/50 text-secondary',
  inf:     'border-amber-400/50 text-amber-400',
  ba:      'border-purple-400/50 text-purple-400',
};

interface Props {
  slot:           InfantrySlot;
  targets?:       FireTarget[];
  onFireAt?:      (rangeBand: 0 | 1 | 2, target: FireTarget | null) => void;
  onNextTurn?:    () => void;
  onApplyDamage?: (amount: number, flags: DamageFlags) => void;
  onDirectLoss?:  (loss: number) => void;
}

export function InfantryPanel({ slot, targets = [], onFireAt, onNextTurn, onDirectLoss }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<FireTarget | null>(null);
  const { state, session } = slot;

  if (!state || !session) {
    return (
      <div className="flex items-center justify-center h-48 border border-outline-variant/20 bg-surface-container-low clip-chamfer">
        <span className="font-mono text-[10px] text-outline tracking-widest">SLOT VACÍO</span>
      </div>
    );
  }

  const dmg0 = state.damageTable.short[session.troopers]  ?? 0;
  const dmgM = state.damageTable.medium[session.troopers] ?? 0;
  const dmgL = state.damageTable.long[session.troopers]   ?? 0;
  const canFire = !session.destroyed && session.moveMode !== 'prone';

  return (
    <div className="bg-surface-container border border-outline-variant/40 clip-chamfer flex flex-col divide-y divide-outline-variant/20">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <div className="font-mono text-[11px] text-primary tracking-widest uppercase">{state.name}</div>
          <div className="font-mono text-[9px] text-outline tracking-widest mt-0.5">
            {state.squadCount} ESC · {MOV_LABEL[state.movement]} {state.walkMP}
            {state.jumpMP > 0 ? `/J${state.jumpMP}` : ''} · {state.weaponClass.toUpperCase()}
            {state.antiMech ? ' · ANTI-MECH' : ''}
          </div>
        </div>
        <div className={`font-mono text-[10px] px-2 py-0.5 border ${
          session.destroyed
            ? 'border-red-500 text-red-500'
            : session.troopers < state.platoonSize * 0.5
            ? 'border-yellow-400 text-yellow-400'
            : 'border-primary text-primary'
        }`}>
          {session.destroyed ? 'ELIMINADO' : `${session.troopers}/${state.platoonSize}`}
        </div>
      </div>

      {/* Trooper bar — click squares to mark losses */}
      <div className="px-3 py-2">
        <TrooperBar
          alive={session.troopers}
          total={state.platoonSize}
          onApply={onDirectLoss}
        />
      </div>

      {/* Movement mode */}
      <div className="px-3 py-2">
        <div className="font-mono text-[8px] text-outline tracking-widest mb-1.5">MOVIMIENTO</div>
        <div className="flex flex-wrap gap-1">
          {MOVE_MODES.map(m => {
            const disabled = m === 'jump' && state.jumpMP === 0;
            return (
              <div key={m} className={`font-mono text-[8px] px-2 py-0.5 border tracking-widest ${
                session.moveMode === m
                  ? 'border-primary bg-primary/10 text-primary'
                  : disabled
                  ? 'border-outline-variant/20 text-outline/30'
                  : 'border-outline-variant/40 text-outline'
              }`}>
                {MOVE_LABEL[m]}
              </div>
            );
          })}
          {session.infernoTurnsLeft > 0 && (
            <div className="font-mono text-[8px] px-2 py-0.5 border border-orange-500 text-orange-400 tracking-widest animate-pulse">
              🔥 INFERNO ×{session.infernoTurnsLeft}
            </div>
          )}
        </div>
      </div>

      {/* Disparo */}
      <div className="px-3 py-2 space-y-2">
        <div className="font-mono text-[8px] text-outline tracking-widest">DISPARO · {state.weaponClass.toUpperCase()}</div>

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
              SIN OBJETIVO
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

        {/* Range band buttons */}
        <div className="flex gap-2">
          {([
            { label: 'CORTO', dmg: dmg0, range: `${state.range.short}h`,  band: 0 as const, disabled: dmg0 === 0 },
            { label: 'MEDIO', dmg: dmgM, range: `${state.range.medium}h`, band: 1 as const, disabled: dmgM === 0 },
            { label: 'LARGO', dmg: dmgL, range: `${state.range.long}h`,   band: 2 as const, disabled: dmgL === 0 },
          ] as const).map(b => {
            const active    = session.activeShotRange === b.band;
            const clickable = onFireAt && canFire && !b.disabled;
            return (
              <button
                key={b.label}
                onClick={() => clickable && onFireAt!(b.band, selectedTarget)}
                disabled={!clickable}
                className={`flex-1 border px-2 py-1.5 text-center font-mono transition-colors ${
                  active
                    ? 'border-error bg-error/20 text-error'
                    : b.disabled || !canFire
                    ? 'border-outline-variant/20 text-outline/30 cursor-not-allowed'
                    : 'border-outline-variant/60 text-secondary hover:border-primary hover:text-primary cursor-pointer'
                }`}
              >
                <div className="text-[8px] tracking-widest">{b.label}</div>
                <div className="text-[14px] font-bold mt-0.5">{b.disabled ? '—' : b.dmg}</div>
                <div className="text-[8px] text-outline">{b.range}</div>
              </button>
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

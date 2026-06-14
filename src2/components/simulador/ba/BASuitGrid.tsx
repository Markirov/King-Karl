import { useState } from 'react';
import type { BAState, BASuitSession } from '@/lib/combat-types';

interface Props {
  state:          BAState;
  suits:          BASuitSession[];
  onApplySuit?:   (suitIdx: number, damage: number) => void;
}

export function BASuitGrid({ state, suits, onApplySuit }: Props) {
  const [pendingPerSuit, setPendingPerSuit] = useState<Record<number, number>>({});

  const handleDotClick = (suitIdx: number, dotIdx: number, currentArmor: number) => {
    if (!onApplySuit || dotIdx >= currentArmor) return;
    const dmg = currentArmor - dotIdx;
    setPendingPerSuit(prev => ({ ...prev, [suitIdx]: prev[suitIdx] === dmg ? 0 : dmg }));
  };

  const handleApply = (suitIdx: number) => {
    const dmg = pendingPerSuit[suitIdx] ?? 0;
    if (dmg > 0 && onApplySuit) {
      onApplySuit(suitIdx, dmg);
      setPendingPerSuit(prev => ({ ...prev, [suitIdx]: 0 }));
    }
  };

  return (
    <div className="space-y-1">
      {suits.map(suit => {
        const pending     = pendingPerSuit[suit.index] ?? 0;
        const pendingStart = suit.armor - pending;

        return (
          <div key={suit.index} className={`flex items-center gap-2 px-2 py-1 border ${
            !suit.alive ? 'border-red-900/40 bg-red-950/20 opacity-50' : 'border-outline-variant/20'
          }`}>
            <span className="font-mono text-[9px] text-outline w-12 tracking-widest shrink-0">
              SUIT {suit.index + 1}
            </span>

            {/* Armor dots */}
            <div className="flex gap-0.5 flex-1">
              {Array.from({ length: state.armorPerSuit }).map((_, i) => {
                const filled   = i < suit.armor;
                const isPending = filled && i >= pendingStart;
                return (
                  <div
                    key={i}
                    onClick={() => suit.alive && handleDotClick(suit.index, i, suit.armor)}
                    className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                      onApplySuit && suit.alive && filled ? 'cursor-pointer' : ''
                    } ${
                      isPending
                        ? 'bg-red-500 border-red-400 scale-110'
                        : filled
                        ? (!suit.alive ? 'bg-red-700' : suit.armor / state.armorPerSuit > 0.5 ? 'bg-primary' : suit.armor / state.armorPerSuit > 0.25 ? 'bg-yellow-400' : 'bg-red-500') + ' border-outline-variant/30'
                        : 'bg-surface-container-low border-outline-variant/30'
                    }`}
                  />
                );
              })}
            </div>

            <span className={`font-mono text-[9px] shrink-0 w-10 text-right ${suit.alive ? 'text-secondary' : 'text-red-500'}`}>
              {suit.alive
                ? pending > 0
                  ? <span className="text-red-400">{suit.armor - pending}/{state.armorPerSuit}</span>
                  : `${suit.armor}/${state.armorPerSuit}`
                : 'DEAD'}
            </span>

            {/* Per-suit apply button */}
            {pending > 0 && suit.alive && (
              <button
                onClick={() => handleApply(suit.index)}
                className="font-mono text-[7px] tracking-widest uppercase px-1.5 py-0.5 border border-error text-error hover:bg-error/20 transition-colors shrink-0"
              >
                −{pending}
              </button>
            )}

            {/* Weapon status */}
            {pending === 0 && (
              <div className="flex gap-1 shrink-0">
                {state.weapons.map(w => {
                  const expended = suit.weaponsExpended[w.id];
                  const fired    = suit.weaponsFiredThisTurn[w.id];
                  return (
                    <span key={w.id} className={`font-mono text-[7px] px-1 border tracking-widest ${
                      expended ? 'border-red-800 text-red-700 line-through'
                      : fired   ? 'border-outline-variant/30 text-outline'
                      : 'border-primary/40 text-primary'
                    }`}>
                      {w.name.split(' ')[0]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

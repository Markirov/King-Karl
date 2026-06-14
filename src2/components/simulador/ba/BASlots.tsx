import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { BASlot } from '@/lib/combat-types';
import { BAPicker } from './BAPicker';

interface Props {
  slots:     BASlot[];
  activeIdx: number;
  onSelect:  (i: number) => void;
  onAssign:  (slotIdx: number, catalogId: string) => void;
  onClear:   (slotIdx: number) => void;
}

export function BASlots({ slots, activeIdx, onSelect, onAssign, onClear }: Props) {
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {slots.map((slot, i) => {
          const aliveSuits = slot.session?.suits.filter(s => s.alive).length ?? 0;
          const totalSuits = slot.state?.suitCount ?? 0;
          const dead       = slot.session?.destroyed;
          const occupied   = !!slot.state;
          const pct        = totalSuits > 0 ? aliveSuits / totalSuits : 0;
          const dotColor   = dead ? 'bg-red-500' : pct < 0.5 ? 'bg-yellow-400' : 'bg-primary';

          return (
            <div key={i} className="relative">
              <button
                onClick={() => occupied ? onSelect(i) : setPickerFor(i)}
                className={`flex items-center gap-2 px-3 py-1.5 border clip-chamfer transition-all font-mono text-[10px] tracking-widest ${
                  activeIdx === i && occupied
                    ? 'border-primary bg-primary/10 text-primary'
                    : occupied
                    ? 'border-outline-variant text-secondary hover:border-secondary'
                    : 'border-outline-variant/40 text-outline hover:border-primary hover:text-primary'
                }`}
              >
                {occupied ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="max-w-[120px] truncate">{slot.state!.name}</span>
                    <span className="text-outline">{aliveSuits}/{totalSuits}</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    <span>BA-{i + 1}</span>
                  </>
                )}
              </button>
              {occupied && (
                <button
                  onClick={e => { e.stopPropagation(); onClear(i); }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-surface-container border border-outline-variant flex items-center justify-center text-outline hover:text-red-400 transition-colors z-10"
                >
                  <X size={8} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pickerFor !== null && (
        <BAPicker
          onSelect={id => { onAssign(pickerFor!, id); setPickerFor(null); }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </>
  );
}

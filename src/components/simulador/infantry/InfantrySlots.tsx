import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { InfantrySlot } from '@/lib/combat-types';
import { InfantryPicker } from './InfantryPicker';

interface Props {
  slots:       InfantrySlot[];
  activeIdx:   number;
  onSelect:    (i: number) => void;
  onAssign:    (slotIdx: number, catalogId: string) => void;
  onClear:     (slotIdx: number) => void;
}

export function InfantrySlots({ slots, activeIdx, onSelect, onAssign, onClear }: Props) {
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {slots.map((slot, i) => {
          const alive    = slot.session?.troopers ?? 0;
          const total    = slot.state?.platoonSize ?? 0;
          const dead     = slot.session?.destroyed;
          const occupied = !!slot.state;
          const pct      = total > 0 ? alive / total : 0;
          const dotColor = dead ? 'bg-red-500' : pct < 0.5 ? 'bg-yellow-400' : 'bg-primary';

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
                    <span className="text-outline">{alive}/{total}</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    <span>INF-{i + 1}</span>
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
        <InfantryPicker
          onSelect={id => { onAssign(pickerFor!, id); setPickerFor(null); }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </>
  );
}

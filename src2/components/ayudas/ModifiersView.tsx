import { useState } from 'react';
import { ATTACK_MODIFIERS, MOVEMENT_MODIFIERS } from '@/lib/ayudas-data';

type Tab = 'ataque' | 'movimiento';

function modColor(mod: string) {
  if (mod.startsWith('−') || mod.startsWith('-')) return 'text-primary font-bold';
  if (mod.startsWith('+') && mod !== '+0') return 'text-error font-bold';
  if (mod === 'Caída automática') return 'text-error font-bold';
  return 'text-secondary/60';
}

export function ModifiersView() {
  const [tab, setTab] = useState<Tab>('ataque');
  const data = tab === 'ataque' ? ATTACK_MODIFIERS : MOVEMENT_MODIFIERS;

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-outline-variant/30">
        {[['ataque', 'Modificadores de Ataque'], ['movimiento', 'Modificadores de Movimiento']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as Tab)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2 -mb-px ${
              tab === k ? 'border-primary text-primary' : 'border-transparent text-secondary/40 hover:text-secondary/70'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(group => (
          <div key={group.title} className="bg-surface-container border border-outline-variant/25">
            <div className="bg-surface-container-high px-4 py-2 border-b border-outline-variant/30">
              <h3 className="font-headline text-[10px] font-bold text-primary-container/80 uppercase tracking-widest">{group.title}</h3>
            </div>
            <table className="w-full border-collapse font-mono text-[10px]">
              <tbody>
                {group.entries.map((entry, i) => (
                  <tr key={i} className="border-b border-outline-variant/15 last:border-0 hover:bg-surface-container-high/30 transition-colors">
                    <td className="px-3 py-1.5 text-on-surface/70">
                      {entry.label}
                      {entry.note && <span className="block text-[8px] text-secondary/30 mt-0.5">{entry.note}</span>}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums w-24 ${modColor(entry.mod)}`}>{entry.mod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

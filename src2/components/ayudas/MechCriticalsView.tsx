import { useState } from 'react';
import { MECH_CRITICAL_HITS, MECH_CRITICAL_EFFECTS } from '@/lib/ayudas-data';

function roll2D6() { return Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6); }

type ColType = 'torso' | 'brazos' | 'piernas';

const COL_COLORS: Record<ColType, string> = {
  torso:   'text-primary',
  brazos:  'text-secondary',
  piernas: 'text-on-surface/70',
};

export function MechCriticalsView() {
  const [roll, setRoll] = useState<number | null>(null);
  const [col, setCol] = useState<ColType>('torso');
  const [selected, setSelected] = useState<string | null>(null);

  const doRoll = () => setRoll(roll2D6());

  const colLabels: { key: ColType; label: string }[] = [
    { key: 'torso',   label: 'Torso / Cabeza' },
    { key: 'brazos',  label: 'Brazos' },
    { key: 'piernas', label: 'Piernas' },
  ];

  const colIdx: Record<ColType, number> = { torso: 1, brazos: 2, piernas: 3 };

  const resultName = roll ? MECH_CRITICAL_HITS.find(r => r[0] === roll)?.[colIdx[col]] : null;
  const effect = resultName ? MECH_CRITICAL_EFFECTS[resultName as string] : null;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-surface-container p-4 border border-outline-variant/30 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">Localización</label>
          <div className="flex gap-1">
            {colLabels.map(c => (
              <button key={c.key} onClick={() => setCol(c.key)}
                className={`px-3 py-1.5 font-mono text-[10px] border transition-all ${
                  col === c.key
                    ? 'bg-secondary/20 border-secondary/60 text-secondary'
                    : 'border-outline-variant/30 text-secondary/40 hover:border-secondary/30'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={doRoll}
          className="px-5 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-headline text-[11px] uppercase tracking-widest transition-all">
          Tirar 2D6
        </button>
        {roll !== null && (
          <div className="flex items-center gap-3 font-mono">
            <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-primary">{roll}</span>
            {resultName && (
              <>
                <span className="text-secondary/40">→</span>
                <span className={`text-sm font-bold ${COL_COLORS[col]}`}>{resultName as string}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Effect box */}
      {roll && effect && (
        <div className="bg-error/5 border border-error/30 p-3">
          <div className="text-[9px] font-mono text-error/60 uppercase tracking-widest mb-1">Efecto — {resultName as string}</div>
          <p className="text-[11px] font-mono text-on-surface/80">{effect}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[10px]">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="px-3 py-2 text-center text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 w-12">2D6</th>
                {colLabels.map(c => (
                  <th key={c.key}
                    className={`px-3 py-2 text-center text-[9px] uppercase tracking-widest border border-outline-variant/20 transition-colors ${
                      col === c.key ? `${COL_COLORS[c.key]} bg-surface-container-high` : 'text-secondary/40'
                    }`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MECH_CRITICAL_HITS.map(([r, t, b, l]) => {
                const isHL = roll === r;
                return (
                  <tr key={r} className={`border border-outline-variant/15 ${isHL ? 'bg-primary/5' : 'hover:bg-surface-container-high/30'}`}>
                    <td className={`px-3 py-1.5 font-bold text-center border border-outline-variant/20 ${isHL ? 'text-primary' : 'text-secondary/60'}`}>{r}</td>
                    {([t, b, l] as string[]).map((val, ci) => {
                      const ckey = (['torso', 'brazos', 'piernas'] as ColType[])[ci];
                      const isHlCell = isHL && col === ckey;
                      return (
                        <td key={ci}
                          onClick={() => setSelected(selected === val ? null : val)}
                          className={`px-3 py-1.5 text-center border border-outline-variant/20 cursor-pointer transition-all ${
                            isHlCell ? 'bg-error/20 text-error font-bold ring-1 ring-error/50' : `${COL_COLORS[ckey]} hover:bg-surface-container-high`
                          } ${selected === val ? 'underline underline-offset-2' : ''}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Effects reference */}
        <div className="space-y-2">
          <h3 className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest mb-2">Referencia de efectos</h3>
          {(selected
            ? Object.entries(MECH_CRITICAL_EFFECTS).filter(([k]) => k === selected)
            : Object.entries(MECH_CRITICAL_EFFECTS)
          ).map(([name, eff]) => (
            <div key={name}
              onClick={() => setSelected(selected === name ? null : name)}
              className={`p-2.5 border cursor-pointer transition-all ${
                selected === name
                  ? 'border-error/50 bg-error/5'
                  : 'border-outline-variant/20 hover:border-outline-variant/40'
              }`}>
              <div className="text-[10px] font-mono font-bold text-primary-container mb-0.5">{name}</div>
              <div className="text-[10px] font-mono text-on-surface/60">{eff}</div>
            </div>
          ))}
          {selected && (
            <button onClick={() => setSelected(null)}
              className="text-[9px] font-mono text-secondary/30 hover:text-secondary/60 uppercase tracking-widest transition-all">
              Ver todos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

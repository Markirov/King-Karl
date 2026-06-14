import { useState } from 'react';
import { CLUSTER_TABLE, CLUSTER_SIZES } from '@/lib/ayudas-data';

export function ClusterTableView() {
  const [highlight, setHighlight] = useState<{ roll: number; size: number } | null>(null);
  const [d1, setD1] = useState<number | null>(null);
  const [d2, setD2] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<number>(10);

  const roll2D6 = () => {
    const r1 = Math.ceil(Math.random() * 6);
    const r2 = Math.ceil(Math.random() * 6);
    setD1(r1); setD2(r2);
    setHighlight({ roll: r1 + r2, size: selectedSize });
  };

  const total = d1 && d2 ? d1 + d2 : null;
  const result = total ? CLUSTER_TABLE[total]?.[selectedSize] : null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-surface-container p-4 border border-outline-variant/30 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">Tamaño del lanzador</label>
          <div className="flex gap-1">
            {CLUSTER_SIZES.map(sz => (
              <button key={sz} onClick={() => { setSelectedSize(sz); if (total) setHighlight({ roll: total, size: sz }); }}
                className={`w-9 h-8 font-mono text-[10px] font-bold border transition-all ${
                  selectedSize === sz
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface-container-high border-outline-variant/30 text-secondary/60 hover:border-secondary/40'
                }`}>
                {sz}
              </button>
            ))}
          </div>
        </div>
        <button onClick={roll2D6}
          className="px-6 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-headline font-bold text-[11px] uppercase tracking-widest transition-all">
          Tirar 2D6
        </button>
        {d1 && d2 && (
          <div className="flex items-center gap-3 font-mono">
            <div className="flex gap-2">
              <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-on-surface">{d1}</span>
              <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-on-surface">{d2}</span>
            </div>
            <span className="text-secondary/40 text-sm">=</span>
            <span className="text-xl font-bold text-primary">{total}</span>
            {result !== undefined && result !== null && (
              <>
                <span className="text-secondary/40 mx-1">→</span>
                <span className="text-2xl font-bold text-error">{result}</span>
                <span className="text-[10px] text-secondary/50 uppercase">impactos</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 w-16">2D6</th>
              {CLUSTER_SIZES.map(sz => (
                <th key={sz}
                  className={`px-3 py-2 text-center text-[9px] uppercase tracking-widest border border-outline-variant/20 transition-colors ${
                    highlight?.size === sz ? 'text-primary bg-primary/10' : 'text-secondary/50'
                  }`}>
                  {sz}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 11 }, (_, i) => i + 2).map(roll => {
              const isHlRow = highlight?.roll === roll;
              return (
                <tr key={roll} className={`border border-outline-variant/15 transition-colors ${isHlRow ? 'bg-primary/10' : 'hover:bg-surface-container-high/40'}`}>
                  <td className={`px-4 py-1.5 font-bold border border-outline-variant/20 text-center ${isHlRow ? 'text-primary' : 'text-secondary/60'}`}>{roll}</td>
                  {CLUSTER_SIZES.map(sz => {
                    const val = CLUSTER_TABLE[roll][sz];
                    const isHl = highlight?.roll === roll && highlight?.size === sz;
                    return (
                      <td key={sz}
                        className={`px-3 py-1.5 text-center border border-outline-variant/20 font-bold transition-all ${
                          isHl ? 'bg-error/30 text-error text-base' : isHlRow ? 'text-primary/80' : 'text-on-surface/70'
                        }`}>
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
      <p className="text-[9px] font-mono text-secondary/30 uppercase tracking-widest">
        Columna = tamaño del lanzador (LRM/SRM) · Fila = tirada 2D6 · Valor = misiles que impactan
      </p>
    </div>
  );
}

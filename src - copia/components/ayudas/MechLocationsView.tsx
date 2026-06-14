import { useState } from 'react';
import {
  MECH_HIT_LOCATIONS, MECH_KICK_LOCATIONS, MECH_PUNCH_LOCATIONS, MECH_FALL_TABLE,
} from '@/lib/ayudas-data';

type SubTab = 'impacto' | 'patada' | 'punetazo' | 'caida';

function roll2D6() { return Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6); }
function roll1D6() { return Math.ceil(Math.random() * 6); }

const LOC_COLORS: Record<string, string> = {
  'Cabeza':           'text-error',
  'Torso Central':    'text-primary',
  'Torso Izquierdo':  'text-secondary',
  'Torso Derecho':    'text-secondary',
  'Brazo Izquierdo':  'text-on-surface/80',
  'Brazo Derecho':    'text-on-surface/80',
  'Pierna Izquierda': 'text-on-surface/60',
  'Pierna Derecha':   'text-on-surface/60',
};

function LocCell({ text, highlight }: { text: string; highlight?: boolean }) {
  const color = LOC_COLORS[text] ?? 'text-on-surface/70';
  return (
    <td className={`px-3 py-1.5 text-center font-mono text-[10px] border border-outline-variant/20 transition-all ${
      highlight ? 'bg-primary/15 font-bold ring-1 ring-primary/50' : ''
    } ${color}`}>
      {text}
    </td>
  );
}

export function MechLocationsView() {
  const [sub, setSub] = useState<SubTab>('impacto');
  const [roll, setRoll] = useState<number | null>(null);
  const [dir, setDir] = useState<0 | 1 | 2>(1); // 0=left, 1=central, 2=right

  const doRoll = () => setRoll(sub === 'patada' || sub === 'punetazo' ? roll1D6() : roll2D6());

  const tabs: { key: SubTab; label: string }[] = [
    { key: 'impacto',   label: 'Impacto (2D6)' },
    { key: 'patada',    label: 'Patada (1D6)' },
    { key: 'punetazo',  label: 'Puñetazo (1D6)' },
    { key: 'caida',     label: 'Caída' },
  ];

  const tableData = sub === 'impacto' ? MECH_HIT_LOCATIONS
    : sub === 'patada' ? MECH_KICK_LOCATIONS
    : MECH_PUNCH_LOCATIONS;

  const dirLabels = ['Izquierda', 'Frontal / Central', 'Derecha'];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-outline-variant/30">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setSub(t.key); setRoll(null); }}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2 -mb-px ${
              sub === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary/40 hover:text-secondary/70'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {sub !== 'caida' && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4">
            {sub === 'impacto' && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">Dirección del ataque</label>
                <div className="flex gap-1">
                  {dirLabels.map((l, i) => (
                    <button key={i} onClick={() => setDir(i as 0 | 1 | 2)}
                      className={`px-3 py-1.5 font-mono text-[10px] border transition-all ${
                        dir === i
                          ? 'bg-secondary/20 border-secondary/60 text-secondary'
                          : 'border-outline-variant/30 text-secondary/40 hover:border-secondary/30'
                      }`}>
                      {['Izq.', 'Frontal', 'Der.'][i]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={doRoll}
              className="px-5 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-headline text-[11px] uppercase tracking-widest transition-all">
              Tirar {sub === 'impacto' ? '2D6' : '1D6'}
            </button>
            {roll !== null && (
              <div className="flex items-center gap-3 font-mono">
                <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-primary">{roll}</span>
                {(() => {
                  const row = tableData.find(r => r[0] === roll);
                  const res = row?.[dir + 1];
                  return res ? (
                    <>
                      <span className="text-secondary/40">→</span>
                      <span className={`text-sm font-bold ${LOC_COLORS[res as string] ?? 'text-on-surface'}`}>{res}</span>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 w-16">
                    {sub === 'impacto' ? '2D6' : '1D6'}
                  </th>
                  {dirLabels.map((l, i) => (
                    <th key={i} className={`px-3 py-2 text-center text-[9px] uppercase tracking-widest border border-outline-variant/20 ${
                      sub === 'impacto' && dir === i ? 'text-secondary bg-secondary/10' : 'text-secondary/50'
                    }`}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map(([r, izq, cen, der]) => {
                  const isHL = roll === r;
                  return (
                    <tr key={r} className={`border border-outline-variant/15 ${isHL ? 'bg-primary/5' : 'hover:bg-surface-container-high/30'}`}>
                      <td className={`px-4 py-1.5 font-bold text-center border border-outline-variant/20 ${isHL ? 'text-primary' : 'text-secondary/60'}`}>{r}</td>
                      <LocCell text={izq as string} highlight={isHL && dir === 0} />
                      <LocCell text={cen as string} highlight={isHL && dir === 1} />
                      <LocCell text={der as string} highlight={isHL && dir === 2} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sub === 'caida' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px] max-w-sm">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20">Dirección de impacto</th>
                <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20">Encaramiento resultante</th>
              </tr>
            </thead>
            <tbody>
              {MECH_FALL_TABLE.map(([impact, facing]) => (
                <tr key={impact} className="border border-outline-variant/15 hover:bg-surface-container-high/30">
                  <td className="px-4 py-2 text-on-surface/80 border border-outline-variant/20">{impact}</td>
                  <td className="px-4 py-2 text-secondary font-bold border border-outline-variant/20">{facing}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[9px] font-mono text-secondary/30 uppercase tracking-widest">
            Daño por caída = niveles de altura × tonelaje ÷ 10 (mín. 1). Tirada de pilotaje por cada nivel.
          </p>
        </div>
      )}
    </div>
  );
}

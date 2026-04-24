import { useState } from 'react';
import { VEHICLE_HIT_LOCATIONS, VEHICLE_CRITICAL_RESULTS, VEHICLE_MOTIVE_TABLE } from '@/lib/ayudas-data';

type SubTab = 'localizaciones' | 'criticos' | 'motriz';

function roll2D6() { return Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6); }
function roll1D6() { return Math.ceil(Math.random() * 6); }

export function VehicleTablesView() {
  const [sub, setSub] = useState<SubTab>('localizaciones');
  const [roll, setRoll] = useState<number | null>(null);
  const [dir, setDir] = useState<0 | 1 | 2>(1);

  const tabs: { key: SubTab; label: string }[] = [
    { key: 'localizaciones', label: 'Localizaciones (2D6)' },
    { key: 'criticos',       label: 'Críticos (1D6)' },
    { key: 'motriz',         label: 'Daño Motriz (2D6)' },
  ];

  const doRoll = () => setRoll(sub === 'criticos' ? roll1D6() : roll2D6());

  const dirLabels = ['Izquierda', 'Frontal', 'Derecha'];

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-outline-variant/30">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setSub(t.key); setRoll(null); }}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2 -mb-px ${
              sub === t.key ? 'border-primary text-primary' : 'border-transparent text-secondary/40 hover:text-secondary/70'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      {sub !== 'criticos' && (
        <div className="flex flex-wrap items-end gap-4">
          {sub === 'localizaciones' && (
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
            Tirar 2D6
          </button>
          {roll !== null && (
            <div className="flex items-center gap-3 font-mono">
              <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-primary">{roll}</span>
              {sub === 'localizaciones' && (() => {
                const row = VEHICLE_HIT_LOCATIONS.find(r => r[0] === roll);
                const res = row?.[dir + 1];
                return res ? (
                  <>
                    <span className="text-secondary/40">→</span>
                    <span className="text-sm font-bold text-secondary">{res}</span>
                  </>
                ) : null;
              })()}
              {sub === 'motriz' && (() => {
                const row = VEHICLE_MOTIVE_TABLE.find(r => r[0] === roll);
                return row ? (
                  <>
                    <span className="text-secondary/40">→</span>
                    <span className="text-sm font-bold text-error">{row[1]}</span>
                  </>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {sub === 'localizaciones' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="px-4 py-2 text-center text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 w-12">2D6</th>
                {dirLabels.map((l, i) => (
                  <th key={i} className={`px-3 py-2 text-center text-[9px] uppercase tracking-widest border border-outline-variant/20 ${
                    dir === i ? 'text-secondary bg-secondary/10' : 'text-secondary/50'
                  }`}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VEHICLE_HIT_LOCATIONS.map(([r, izq, cen, der]) => {
                const isHL = roll === r;
                return (
                  <tr key={r} className={`border border-outline-variant/15 ${isHL ? 'bg-primary/5' : 'hover:bg-surface-container-high/30'}`}>
                    <td className={`px-4 py-1.5 font-bold text-center border border-outline-variant/20 ${isHL ? 'text-primary' : 'text-secondary/60'}`}>{r}</td>
                    {([izq, cen, der] as string[]).map((val, ci) => (
                      <td key={ci} className={`px-3 py-1.5 text-center font-mono text-[10px] border border-outline-variant/20 transition-all ${
                        isHL && dir === ci
                          ? 'bg-primary/20 font-bold text-primary ring-1 ring-primary/50'
                          : val === 'Crítico' ? 'text-error font-bold' : val === 'Conductor' ? 'text-amber-400/80' : 'text-on-surface/70'
                      }`}>{val}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2 space-y-1 text-[9px] font-mono text-secondary/40">
            <p><span className="text-error">Crítico</span> — Tira 1D6 en tabla de Críticos para el resultado específico.</p>
            <p><span className="text-amber-400/80">Conductor</span> — El conductor recibe 1 daño y +1 a tiradas de Conducción.</p>
          </div>
        </div>
      )}

      {sub === 'criticos' && (
        <div className="space-y-3">
          <div className="flex items-end gap-4">
            <button onClick={doRoll}
              className="px-5 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-headline text-[11px] uppercase tracking-widest transition-all">
              Tirar 1D6
            </button>
            {roll !== null && (() => {
              const row = VEHICLE_CRITICAL_RESULTS.find(r => r[0] === roll);
              return row ? (
                <div className="flex items-center gap-3 font-mono">
                  <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-primary">{roll}</span>
                  <span className="text-secondary/40">→</span>
                  <span className="text-sm font-bold text-error">{row[1]}</span>
                </div>
              ) : null;
            })()}
          </div>
          {roll !== null && (() => {
            const row = VEHICLE_CRITICAL_RESULTS.find(r => r[0] === roll);
            return row ? (
              <div className="bg-error/5 border border-error/30 p-3">
                <div className="text-[9px] font-mono text-error/60 uppercase tracking-widest mb-1">{row[1]}</div>
                <p className="text-[11px] font-mono text-on-surface/80">{row[2]}</p>
              </div>
            ) : null;
          })()}
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="px-4 py-2 text-center text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 w-12">1D6</th>
                <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20">Resultado</th>
                <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20">Efecto</th>
              </tr>
            </thead>
            <tbody>
              {VEHICLE_CRITICAL_RESULTS.map(([r, res, eff]) => {
                const isHL = roll === r;
                return (
                  <tr key={r} className={`border border-outline-variant/15 ${isHL ? 'bg-error/5' : 'hover:bg-surface-container-high/30'}`}>
                    <td className={`px-4 py-2 font-bold text-center border border-outline-variant/20 ${isHL ? 'text-primary' : 'text-secondary/60'}`}>{r}</td>
                    <td className={`px-3 py-2 font-bold border border-outline-variant/20 ${isHL ? 'text-error' : 'text-on-surface/80'}`}>{res}</td>
                    <td className="px-3 py-2 text-on-surface/50 border border-outline-variant/20 text-[10px]">{eff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sub === 'motriz' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px] max-w-lg">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="px-4 py-2 text-center text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 w-12">2D6</th>
                <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20">Resultado</th>
                <th className="px-4 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20">Efecto</th>
              </tr>
            </thead>
            <tbody>
              {VEHICLE_MOTIVE_TABLE.map(([r, res, eff]) => {
                const isHL = roll === r;
                return (
                  <tr key={`${r}-${res}`} className={`border border-outline-variant/15 ${isHL ? 'bg-primary/5' : 'hover:bg-surface-container-high/30'}`}>
                    <td className={`px-4 py-2 font-bold text-center border border-outline-variant/20 ${isHL ? 'text-primary' : 'text-secondary/60'}`}>{r}</td>
                    <td className={`px-3 py-2 font-bold border border-outline-variant/20 ${res === 'Vehículo destruido' ? 'text-error' : isHL ? 'text-primary' : 'text-on-surface/80'}`}>{res}</td>
                    <td className="px-3 py-2 text-on-surface/50 border border-outline-variant/20 text-[10px]">{eff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[9px] font-mono text-secondary/30 uppercase tracking-widest">
            Se tira al impactar los sistemas de propulsión del vehículo. Los efectos son acumulativos.
          </p>
        </div>
      )}
    </div>
  );
}

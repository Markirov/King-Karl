import { useState } from 'react';
import {
  INFANTRY_HIT_TABLE, INFANTRY_CRIT_TRIGGER,
  INFANTRY_CRIT_TABLES, INFANTRY_CRIT_RULES,
} from '@/lib/ayudas-data';
type SubTab = 'localizacion' | 'referencia';

const LOCATION_COLORS: Record<string, string> = {
  'Cabeza':           'text-error',
  'Torso':            'text-primary',
  'Brazo Izquierdo':  'text-secondary',
  'Brazo Derecho':    'text-secondary',
  'Pierna Izquierda': 'text-on-surface/70',
  'Pierna Derecha':   'text-on-surface/70',
};

function shortLoc(loc: string) {
  return loc
    .replace(' Izquierdo', ' Izq.')
    .replace(' Derecho', ' Der.')
    .replace('Izquierda', 'Izq.')
    .replace('Derecha', 'Der.');
}

export function InfantryView() {
  const [sub, setSub] = useState<SubTab>('localizacion');

  // Hit roll state
  const [d1, setD1] = useState<number | null>(null);
  const [d2, setD2] = useState<number | null>(null);

  // Crit state (derived from current selection)
  const [critRoll, setCritRoll] = useState<number | null>(null);

  // Reset crit when selection changes
  const selectCell = (r1: number, r2: number) => {
    setD1(r1); setD2(r2);
    setCritRoll(null);
  };

  const rollHit = () => {
    const r1 = Math.ceil(Math.random() * 6);
    const r2 = Math.ceil(Math.random() * 6);
    selectCell(r1, r2);
  };

  const rollCrit = () => setCritRoll(Math.ceil(Math.random() * 6));

  const key = d1 && d2 ? `${d1}${d2}` : null;
  const hitLoc = key ? INFANTRY_HIT_TABLE[key] : null;
  const critTableKey = key ? INFANTRY_CRIT_TRIGGER[key] : null; // 'Brazo' | 'Pierna' | 'Torso' | undefined
  const isCrit = !!critTableKey;

  const critTable = critTableKey ? INFANTRY_CRIT_TABLES[critTableKey] : null;
  const critInjury = critRoll && critTable ? critTable[critRoll] : null;
  const critRule = critInjury ? INFANTRY_CRIT_RULES[critInjury] : null;

  const tabs: { key: SubTab; label: string }[] = [
    { key: 'localizacion', label: 'Localización de Impacto' },
    { key: 'referencia',   label: 'Referencia de Lesiones' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-outline-variant/30">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2 -mb-px ${
              sub === t.key ? 'border-primary text-primary' : 'border-transparent text-secondary/40 hover:text-secondary/70'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LOCALIZACIÓN ── */}
      {sub === 'localizacion' && (
        <div className="space-y-4">
          <p className="text-[11px] font-mono text-secondary/40">
            Tira 2D6 o haz clic en una celda para seleccionar manualmente.
            Los dados iguales producen una lesión crítica.
          </p>

          {/* Roller + resultado */}
          <div className="bg-surface-container p-4 border border-outline-variant/30 flex flex-wrap items-center gap-4">
            <button onClick={rollHit}
              className="px-5 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-headline text-[11px] uppercase tracking-widest transition-all">
              Tirar 2D6
            </button>

            {d1 && d2 && (
              <div className="flex items-center gap-3 font-mono">
                <div className="flex gap-1.5">
                  <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-on-surface">{d1}</span>
                  <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-outline-variant/50 text-lg font-bold text-on-surface">{d2}</span>
                </div>
                {hitLoc && (
                  <>
                    <span className="text-secondary/40">→</span>
                    <span className={`text-sm font-bold ${LOCATION_COLORS[hitLoc] ?? 'text-on-surface'}`}>{hitLoc}</span>
                    {isCrit && (
                      <span className="bg-error/20 border border-error/50 text-error text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider animate-pulse">
                        ¡CRÍTICO!
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tabla 6×6 */}
          <div className="overflow-x-auto">
            <table className="border-collapse font-mono text-[10px]">
              <thead>
                <tr>
                  <th className="w-8 h-8 bg-surface-container-high border border-outline-variant/20 text-secondary/30 text-[8px]">D1↓ D2→</th>
                  {[1,2,3,4,5,6].map(d => (
                    <th key={d} className="w-24 px-2 py-1.5 text-center bg-surface-container-high border border-outline-variant/20 text-[9px] text-secondary/50">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5,6].map(r1 => (
                  <tr key={r1}>
                    <td className="px-2 py-1.5 text-center bg-surface-container-high border border-outline-variant/20 text-[9px] text-secondary/50 font-bold">{r1}</td>
                    {[1,2,3,4,5,6].map(r2 => {
                      const k = `${r1}${r2}`;
                      const loc = INFANTRY_HIT_TABLE[k];
                      const isCritCell = !!INFANTRY_CRIT_TRIGGER[k];
                      const isSelected = d1 === r1 && d2 === r2;
                      return (
                        <td key={r2}
                          onClick={() => selectCell(r1, r2)}
                          className={`px-2 py-1 text-center border border-outline-variant/20 cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-primary/25 ring-1 ring-inset ring-primary'
                              : isCritCell
                                ? 'bg-error/10 hover:bg-error/20'
                                : 'hover:bg-surface-container-high/60'
                          }`}>
                          <span className={`text-[9px] ${LOCATION_COLORS[loc] ?? ''} ${isCritCell ? 'font-bold' : ''}`}>
                            {shortLoc(loc)}
                          </span>
                          {isCritCell && (
                            <span className="block text-[7px] text-error/60 leading-none mt-0.5">crit</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Panel crítico — se despliega cuando hay crítico activo */}
          {isCrit && critTableKey && (
            <div className="border border-error/40 bg-error/5 p-4 space-y-4 animate-[fadeInUp_0.2s_ease]">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-[9px] font-mono text-error/60 uppercase tracking-widest block mb-0.5">Lesión crítica en</span>
                  <span className="font-headline text-sm font-bold text-error uppercase">{critTableKey}</span>
                </div>
                <button onClick={rollCrit}
                  className="px-5 py-2 bg-error/20 hover:bg-error/40 border border-error text-error font-headline text-[11px] uppercase tracking-widest transition-all">
                  Tirar 1D6
                </button>
                {critRoll && critInjury && (
                  <div className="flex items-center gap-3 font-mono">
                    <span className="w-10 h-10 flex items-center justify-center bg-surface-container-high border border-error/40 text-lg font-bold text-error">{critRoll}</span>
                    <span className="text-secondary/40">→</span>
                    <span className="text-sm font-bold text-error">{critInjury}</span>
                  </div>
                )}
              </div>

              {/* Tabla de críticos de la localización */}
              <table className="border-collapse font-mono text-[10px] w-full max-w-xs">
                <tbody>
                  {Object.entries(critTable!).map(([roll, injury]) => {
                    const isHL = critRoll === Number(roll);
                    return (
                      <tr key={roll} className={`border border-outline-variant/20 transition-all ${isHL ? 'bg-error/20' : ''}`}>
                        <td className={`px-3 py-1.5 text-center font-bold w-8 border-r border-outline-variant/20 ${isHL ? 'text-error' : 'text-secondary/50'}`}>{roll}</td>
                        <td className={`px-3 py-1.5 ${isHL ? 'text-error font-bold' : 'text-on-surface/70'}`}>{injury}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Efecto de la lesión */}
              {critRule && (
                <div className="border-t border-error/20 pt-3 space-y-1">
                  <div className="text-[9px] font-mono text-error/60 uppercase tracking-widest">{critRule.rule}</div>
                  <p className="text-[11px] font-mono text-on-surface/80">{critRule.effect}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REFERENCIA ── */}
      {sub === 'referencia' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(INFANTRY_CRIT_TABLES).map(([loc, table]) => (
              <div key={loc}>
                <div className="bg-surface-container-high px-3 py-2 border border-outline-variant/30 border-b-0">
                  <h3 className="font-headline text-[10px] font-bold text-primary-container/80 uppercase tracking-widest">{loc}</h3>
                </div>
                <table className="w-full border-collapse font-mono text-[10px]">
                  <tbody>
                    {Object.entries(table).map(([roll, injury]) => (
                      <tr key={roll} className="border border-outline-variant/20 hover:bg-surface-container-high/40 transition-colors">
                        <td className="px-3 py-1.5 text-center font-bold w-8 border-r border-outline-variant/20 text-secondary/50">{roll}</td>
                        <td className="px-3 py-1.5 text-on-surface/70">{injury}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">Efectos de lesiones</h3>
            {Object.entries(INFANTRY_CRIT_RULES).map(([injury, info]) => (
              <div key={injury} className="p-3 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
                <div className="text-[9px] font-mono font-bold text-error/80 uppercase tracking-widest">{info.rule}
                  <span className="text-secondary/30 font-normal normal-case tracking-normal ml-2">— {injury}</span>
                </div>
                <p className="text-[10px] font-mono text-on-surface/60 mt-1">{info.effect}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

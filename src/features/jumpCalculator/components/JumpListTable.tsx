import type { JumpStep } from '../types';
import type { SystemsDatabase } from '../types';
import { getFactionName } from '../lib/factions';

interface Props {
  steps: JumpStep[];
  db: SystemsDatabase;
}

export function JumpListTable({ steps, db }: Props) {
  return (
    <div className="border border-outline-variant/30">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_1fr_72px_80px_72px] gap-0 bg-surface-container-high border-b border-outline-variant/30">
        {['#', 'Origen', 'Destino', 'LY', 'Facción', 'Días ac.'].map(h => (
          <div key={h} className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-widest text-outline">
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="max-h-72 overflow-y-auto custom-scrollbar">
        {steps.map((step, i) => {
          const factionName  = getFactionName(step.factionAtArrival, db.factions);
          const isLast       = i === steps.length - 1;
          const hasVisit     = step.planetVisit;

          return (
            <div key={i}>
              <div
                className={`grid grid-cols-[32px_1fr_1fr_72px_80px_72px] gap-0 border-b border-outline-variant/15 hover:bg-surface-container-high/50 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-surface-container/30'
                } ${hasVisit ? 'border-l-2 border-l-primary-container/50' : ''}`}
              >
                <div className="px-2 py-1.5 font-mono text-[10px] text-outline">{i + 1}</div>
                <div className="px-2 py-1.5 font-mono text-[11px] text-on-surface-variant truncate" title={step.fromSystem.name}>
                  {step.fromSystem.name}
                </div>
                <div className="px-2 py-1.5 font-mono text-[11px] text-on-surface truncate" title={step.toSystem.name}>
                  {step.toSystem.name}
                </div>
                <div className="px-2 py-1.5 font-mono text-[11px] text-on-surface-variant">
                  {step.distance.toFixed(1)}
                </div>
                <div className="px-2 py-1.5 font-mono text-[10px] flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: step.factionColor }}
                  />
                  <span
                    className={`truncate ${step.factionAtArrival ? 'text-on-surface-variant' : 'text-outline/50 italic'}`}
                    title={factionName}
                  >
                    {step.factionAtArrival ?? '??'}
                  </span>
                </div>
                <div className="px-2 py-1.5 font-mono text-[11px] text-outline flex items-center gap-1">
                  {step.cumulativeDays}d
                  {isLast && (
                    <span className="text-primary-container/50 text-[9px]">🏁</span>
                  )}
                </div>
              </div>

              {/* Sub-fila de visita al planeta */}
              {hasVisit && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary-container/5 border-b border-outline-variant/10 border-l-2 border-l-primary-container/50">
                  <span className="text-[10px]">⬇</span>
                  <span className="font-mono text-[9px] text-primary-container/70">
                    Visita al planeta · +{step.planetVisitDays}d
                    {step.visitReason && (
                      <span className="text-outline/60 ml-2">— {step.visitReason}</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { MechState, MechSession } from '@/lib/combat-types';
import { getHeatWarnings, mechCalcHeatDelta } from '@/lib/combat-data';

interface Props {
  state: MechState;
  session: MechSession;
  onAdjustHeat?: (delta: number) => void;
}

export function HeatMonitor({ state, session, onAdjustHeat }: Props) {
  const warnings = getHeatWarnings(session.heat);
  const hd = mechCalcHeatDelta(state, session);
  const pct = Math.min(100, (session.heat / 30) * 100);
  const severity = session.heat >= 14 ? 'critical' : session.heat >= 5 ? 'warning' : 'nominal';

  return (
    <section className="bg-surface-container-low p-4 relative clip-chamfer border-l-2 border-primary-container/30">
      <h2 className="font-headline text-sm font-bold text-primary-container tracking-widest uppercase mb-4">Calor</h2>
      <div className="flex h-56 gap-4">
        <div className="flex-1 relative">
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary-container to-on-tertiary-container transition-all duration-500" style={{ height: `${pct}%` }}>
            <div className="absolute top-0 w-full h-px bg-primary shadow-[0_0_8px_white]" />
          </div>
          <div className="flex flex-col justify-between h-full font-mono text-[10px] text-secondary/40 z-10 relative pl-1">
            {[30, 24, 18, 12, 6, 0].map(v => <span key={v}>{String(v).padStart(2, '0')}</span>)}
          </div>
        </div>
        <div className="w-1/2 flex flex-col justify-end gap-2 font-mono text-right">
          <div><span className="block text-[10px] text-secondary/60 uppercase">Actual</span><span className="text-3xl text-primary font-bold">{session.heat}</span></div>
          {hd.delta !== 0 && (
            <div className="border-t border-outline-variant pt-1">
              <span className="block text-[9px] text-secondary/60">Proyección</span>
              <span className={`text-sm ${hd.delta > 0 ? 'text-error' : 'text-secondary'}`}>{hd.delta > 0 ? '+' : ''}{hd.delta}</span>
            </div>
          )}
          <div className="border-t border-outline-variant pt-1">
            <span className="block text-[9px] text-secondary/60">Disipación</span>
            <span className="text-sm text-primary">{state.diss}</span>
          </div>
        </div>
      </div>
      <div className={`mt-3 p-2 border text-[9px] font-mono uppercase ${
        severity === 'critical' ? 'bg-error/20 border-error text-error'
        : severity === 'warning' ? 'bg-on-tertiary/10 border-on-tertiary-fixed-variant/30 text-on-tertiary-container'
        : 'bg-secondary/10 border-secondary/30 text-secondary'
      }`}>{warnings.join(' | ')}</div>

      {/* Ajuste manual de calor (flames, infierno, etc) */}
      {onAdjustHeat && (
        <div className="mt-2 border-t border-outline-variant pt-2">
          <div className="flex items-center justify-between text-[8px] font-mono text-secondary/60 uppercase tracking-widest mb-1">
            <span>Ajuste manual</span>
            <span>Calor Extra</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            <button onClick={() => onAdjustHeat(-5)} className="bg-secondary/10 hover:bg-secondary/30 border border-secondary/40 text-secondary font-mono text-[10px] py-1.5">−5</button>
            <button onClick={() => onAdjustHeat(-1)} className="bg-secondary/10 hover:bg-secondary/30 border border-secondary/40 text-secondary font-mono text-[10px] py-1.5">−1</button>
            <button onClick={() => onAdjustHeat(+1)} className="bg-error/10 hover:bg-error/30 border border-error/40 text-error font-mono text-[10px] py-1.5">+1</button>
            <button onClick={() => onAdjustHeat(+2)} className="bg-error/10 hover:bg-error/30 border border-error/40 text-error font-mono text-[10px] py-1.5">+2</button>
            <button onClick={() => onAdjustHeat(+5)} className="bg-error/10 hover:bg-error/30 border border-error/40 text-error font-mono text-[10px] py-1.5">+5</button>
            <button onClick={() => onAdjustHeat(+10)} className="bg-error/20 hover:bg-error/40 border border-error text-error font-mono text-[10px] py-1.5 font-bold">+10</button>
          </div>
        </div>
      )}
    </section>
  );
}

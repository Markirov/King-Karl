import type { MechState, MechSession, MoveMode } from '@/lib/combat-types';
import { WOUND_CHECKS } from '@/lib/combat-data';

export interface AvailablePilot {
  name: string;
  gunnery: number;
  piloting: number;
}

interface Props {
  state: MechState;
  session: MechSession;
  gunneryTotal: number;
  pilotingTotal: number;
  sysHits: { engine: number; gyro: number; sensors: number; lifeSupport: number; heatsinks: number };
  effectiveWalkMP: number;
  effectiveRunMP: number;
  availablePilots: AvailablePilot[];
  onSetPilot: (field: 'gunnery' | 'piloting', value: number) => void;
  onSetWounds: (w: number) => void;
  onSetMoveMode: (m: MoveMode) => void;
  onSetJumpUsed: (h: number) => void;
  onLoadPilot: (p: AvailablePilot) => void;
}

export function PilotPanel({ state, session, gunneryTotal, pilotingTotal, sysHits, effectiveWalkMP, effectiveRunMP, availablePilots, onSetPilot, onSetWounds, onSetMoveMode, onSetJumpUsed, onLoadPilot }: Props) {
  return (
    <section className="bg-surface-container-low p-4 relative clip-chamfer border-l-2 border-primary-container/30">
      {/* Identity */}
      <div className="mb-4 border-b border-outline-variant pb-3">
        <div className="text-primary-container font-black text-xl tracking-tighter uppercase mb-1 truncate">{state.chassis}</div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-secondary/60 uppercase">
          <span>{state.model}</span><span className="w-1 h-1 bg-secondary/30 rounded-full" />
          <span>{state.tonnage}T</span><span className="w-1 h-1 bg-secondary/30 rounded-full" />
          <span>BV:{state.bv || '?'}</span>
        </div>
        {session.destroyed && (
          <div className="mt-2 px-2 py-1 bg-error/20 border border-error text-error text-[10px] font-mono uppercase">
            {session.destroyedReason}
          </div>
        )}
      </div>

      {/* Pilot loader buttons */}
      <div className="mb-3 flex flex-wrap gap-1">
        {availablePilots.map(p => (
          <button key={p.name} onClick={() => onLoadPilot(p)}
            className={`px-2 py-0.5 font-mono text-[9px] uppercase border transition-colors clip-chamfer ${
              session.pilot.name === p.name
                ? 'bg-primary/20 border-primary text-primary'
                : 'border-outline-variant/40 text-secondary/60 hover:border-primary/40 hover:text-primary/80'
            }`}
          >{p.name}</button>
        ))}
        <button onClick={() => onLoadPilot({ name: 'Genérico', gunnery: 4, piloting: 5 })}
          className={`px-2 py-0.5 font-mono text-[9px] uppercase border transition-colors clip-chamfer ${
            session.pilot.name === 'Genérico'
              ? 'bg-primary/20 border-primary text-primary'
              : 'border-outline-variant/40 text-secondary/40 hover:border-primary/40 hover:text-primary/60'
          }`}
        >Genérico</button>
      </div>

      <div className="space-y-3">
        {/* Gunnery + Piloting */}
        {(['gunnery', 'piloting'] as const).map(field => {
          const base = session.pilot[field];
          const total = field === 'gunnery' ? gunneryTotal : pilotingTotal;
          return (
            <div key={field} className="flex justify-between items-end border-b border-outline-variant pb-2">
              <div>
                <span className="text-xs text-secondary/60 font-mono uppercase block">{field === 'gunnery' ? 'Disparo' : 'Pilotaje'}</span>
                {total !== base && <span className="text-[9px] font-mono text-error">(base {base}, mods {total > base ? '+' : ''}{total - base})</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onSetPilot(field, Math.max(0, base - 1))} className="text-secondary hover:text-primary text-lg">-</button>
                <span className={`text-2xl font-mono leading-none w-8 text-center ${total > base ? 'text-error' : 'text-primary'}`}>{total}</span>
                <button onClick={() => onSetPilot(field, Math.min(8, base + 1))} className="text-secondary hover:text-primary text-lg">+</button>
              </div>
            </div>
          );
        })}

        {/* System warnings */}
        {sysHits.sensors >= 2 && (
          <div className="text-[9px] font-mono text-error bg-error/10 px-2 py-1 border border-error/30">⚠ SENSORES DESTRUIDOS — NO PUEDE DISPARAR</div>
        )}
        {sysHits.engine >= 1 && (
          <div className="text-[9px] font-mono text-error bg-error/10 px-2 py-1 border border-error/30">⚠ REACTOR DAÑADO ({sysHits.engine}/3) — +{sysHits.engine * 5} calor</div>
        )}

        {/* Wounds */}
        <div>
          <span className="text-[10px] font-mono text-secondary/60 uppercase block mb-2">Heridas</span>
          <div className="flex gap-2">
            {WOUND_CHECKS.map(({ hits, tn }) => (
              <div key={hits}
                onClick={() => onSetWounds(session.wounds === hits ? hits - 1 : hits)}
                className={`w-10 h-10 border cursor-pointer transition-colors flex items-center justify-center ${
                  hits <= session.wounds ? 'border-error bg-error/40' : 'border-outline-variant hover:border-secondary'
                }`}
              >
                <span className={`text-[9px] font-mono font-bold ${hits <= session.wounds ? 'text-error' : 'text-secondary/50'}`}>{tn}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Movement */}
        <div className="pt-3 border-t border-outline-variant">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-secondary/60 uppercase">Movimiento</span>
            <span className="text-[9px] font-mono text-secondary/40">W:{effectiveWalkMP} R:{effectiveRunMP} J:{state.jumpMP}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase">
            {([
              { mode: 'stand' as MoveMode, label: 'Inmóvil (-1)' },
              { mode: 'walk' as MoveMode, label: 'Caminar' },
              { mode: 'run' as MoveMode, label: 'Correr (+1)' },
            ]).map(({ mode, label }) => (
              <button key={mode} onClick={() => onSetMoveMode(mode)}
                className={`py-1.5 border transition-colors ${session.moveMode === mode ? 'bg-primary/20 border-primary text-primary' : 'border-outline-variant text-secondary hover:border-secondary'}`}
              >{label}</button>
            ))}
            {state.jumpMP > 0 && (
              <div className={`col-span-2 border transition-colors ${session.moveMode === 'jump' ? 'border-primary' : 'border-outline-variant'}`}>
                <div className={`text-center py-1 text-[9px] font-mono uppercase ${session.moveMode === 'jump' ? 'text-primary' : 'text-secondary/60'}`}>
                  Saltar (+3) — {session.moveMode === 'jump' ? `${session.jumpUsed} hex` : 'hex:'}
                </div>
                <div className="flex justify-center gap-1 pb-1.5 px-2">
                  {Array.from({ length: state.jumpMP }, (_, i) => i + 1).map(h => (
                    <button key={h}
                      onClick={() => session.moveMode === 'jump' && session.jumpUsed === h ? onSetMoveMode('walk') : onSetJumpUsed(h)}
                      className={`w-6 h-6 text-[9px] font-mono border transition-colors ${
                        session.moveMode === 'jump' && session.jumpUsed === h
                          ? 'bg-primary/30 border-primary text-primary'
                          : session.moveMode === 'jump' && h < session.jumpUsed
                          ? 'bg-primary/10 border-primary/40 text-primary/60'
                          : 'border-outline-variant text-secondary/50 hover:border-secondary'
                      }`}
                    >{h}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* To-Hit */}
        <div className="pt-3 border-t border-outline-variant flex justify-between items-center">
          <span className="text-[10px] font-mono text-secondary/60 uppercase">Impactar</span>
          <span className={`text-xl font-mono font-bold ${sysHits.sensors >= 2 ? 'text-error line-through' : 'text-error'}`}>
            {gunneryTotal >= 13 ? 'N/A' : `${gunneryTotal}+`}
          </span>
        </div>
      </div>
    </section>
  );
}

import type { MechState, MechSession } from '@/lib/combat-types';
import { mechIsAmmoCrit } from '@/lib/weapons';

interface Props {
  state: MechState;
  session: MechSession;
  onToggleCrit: (loc: string, slotIdx: number) => void;
  sysHits: { engine: number; gyro: number; sensors: number; lifeSupport: number; heatsinks: number };
}

const MECH_LAYOUT_BIPED = [
  [{ key: 'LA', label: 'Brazo Izquierdo', slots: 12 }, { key: 'HD', label: 'Cabeza', slots: 6 }, { key: 'RA', label: 'Brazo Derecho', slots: 12 }],
  [{ key: 'LT', label: 'Torso Izquierdo', slots: 12 }, { key: 'CT', label: 'Torso Central', slots: 12 }, { key: 'RT', label: 'Torso Derecho', slots: 12 }],
  [{ key: 'LL', label: 'Pierna Izquierda', slots: 6 }, { key: '_DMG', label: 'Control de Daños', slots: 0 }, { key: 'RL', label: 'Pierna Derecha', slots: 6 }],
];

const MECH_LAYOUT_QUAD = [
  [{ key: 'LA', label: 'P. Delantera Izquierda', slots: 6 }, { key: 'HD', label: 'Cabeza', slots: 6 }, { key: 'RA', label: 'P. Delantera Derecha', slots: 6 }],
  [{ key: 'LT', label: 'Torso Izquierdo', slots: 12 }, { key: 'CT', label: 'Torso Central', slots: 12 }, { key: 'RT', label: 'Torso Derecho', slots: 12 }],
  [{ key: 'LL', label: 'P. Trasera Izquierda', slots: 6 }, { key: '_DMG', label: 'Control de Daños', slots: 0 }, { key: 'RL', label: 'P. Trasera Derecha', slots: 6 }],
];

export function CriticalMatrix({ state, session, onToggleCrit, sysHits }: Props) {
  const MECH_LAYOUT = state.isQuad ? MECH_LAYOUT_QUAD : MECH_LAYOUT_BIPED;
  return (
    <section className="bg-surface-container-low p-6 clip-chamfer border-t-2 border-secondary/20">
      <h2 className="font-headline text-sm font-bold text-[var(--p,theme(colors.primary-container))] tracking-[2px] uppercase mb-4">Slots Críticos</h2>
      <div className="space-y-4">
        {MECH_LAYOUT.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-4">
            {row.map(col => {
              if (col.key === '_DMG') return <DamageControl key={col.key} state={state} session={session} sysHits={sysHits} />;
              const crits = session.crits[col.key] || [];
              const totalSlots = col.slots;
              const slots = Array.from({ length: totalSlots }, (_, i) => crits[i] || { name: '-', hit: false });
              const isDestroyed = session.is[col.key] !== undefined && session.is[col.key] <= 0 && state.is[col.key as keyof typeof state.is] > 0;

              return (
                <div key={col.key} className={`border border-outline-variant/30 bg-surface-container/50 ${isDestroyed ? 'opacity-40' : ''}`}>
                  <div className={`text-[10px] font-headline font-bold tracking-[2px] uppercase px-3 py-2 border-b border-outline-variant/30 ${isDestroyed ? 'text-error' : 'text-[var(--p,theme(colors.primary-container))]'}`}>
                    {col.label} {isDestroyed && '— DESTRUIDO'}
                  </div>
                  <div className="divide-y divide-outline-variant/15">
                    {slots.map((s, idx) => {
                      const isEmpty = s.name === '-' || s.name === 'Empty';
                      const ammoBin = !isEmpty && mechIsAmmoCrit(s.name)
                        ? session.ammoBins.find(b => b.loc === col.key && b.slotIdx === idx)
                        : null;
                      return (
                        <div key={idx} onClick={() => !isEmpty && onToggleCrit(col.key, idx)}
                          className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono transition-colors ${
                            isEmpty ? 'text-secondary/20 cursor-default'
                            : s.hit ? 'bg-error/15 text-error cursor-pointer'
                            : 'text-on-surface hover:bg-secondary/10 cursor-pointer'
                          }`}
                        >
                          <span className="text-[9px] text-secondary/30 w-4 shrink-0">{idx + 1}.</span>
                          {isEmpty
                            ? <span className="text-secondary/20">-</span>
                            : <span className={`flex-1 ${s.hit ? 'line-through' : ''}`}>
                                {s.name}
                                {ammoBin && (
                                  <span className={`ml-1 ${ammoBin.current === 0 ? 'text-error/70' : s.hit ? 'text-error/60' : 'text-secondary/50'}`}>
                                    ({ammoBin.current})
                                  </span>
                                )}
                              </span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function DamageControl({ state, session, sysHits }: { state: MechState; session: MechSession; sysHits: Props['sysHits'] }) {
  const systems = [
    { name: 'Engine', circles: 3, hits: sysHits.engine, fatal: 3 },
    { name: 'Gyro', circles: 2, hits: sysHits.gyro, fatal: 2 },
    { name: 'Sensores', circles: 2, hits: sysHits.sensors, fatal: 2 },
    { name: 'Soporte V.', circles: 1, hits: sysHits.lifeSupport, fatal: 1 },
  ];

  const effectiveDiss = Math.max(0, state.diss - sysHits.heatsinks);

  return (
    <div className="border border-outline-variant/30 bg-surface-container/50">
      <div className="text-[10px] font-headline font-bold text-[var(--p,theme(colors.primary-container))] tracking-[2px] uppercase px-3 py-2 border-b border-outline-variant/30">
        Control de Daños
      </div>
      <div className="p-3 space-y-3">
        {systems.map(sys => (
          <div key={sys.name} className="flex items-center justify-between">
            <span className={`text-[11px] font-mono ${sys.hits >= sys.fatal ? 'text-error line-through' : 'text-on-surface'}`}>{sys.name}</span>
            <div className="flex gap-1.5">
              {Array.from({ length: sys.circles }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  i < sys.hits ? 'border-error bg-error/50' : 'border-secondary/40'
                }`} />
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
          <span className="text-[11px] font-mono text-on-surface">Radiadores</span>
          <span className={`text-[12px] font-mono font-bold ${sysHits.heatsinks > 0 ? 'text-error' : 'text-primary-container'}`}>
            {effectiveDiss}/{state.diss}
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { MechState, MechSession } from '@/lib/combat-types';
import { mechIsAmmoCrit } from '@/lib/weapons';
import { ammoExplosionDmgPerRound } from '@/lib/combat-data';

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

  // Seguro anti explosión accidental: modal de confirmación
  const [confirmAmmo, setConfirmAmmo] = useState<{
    loc: string; idx: number; name: string; bin: any; dmg: number;
  } | null>(null);

  const handleSlotClick = (loc: string, idx: number, name: string, alreadyHit: boolean) => {
    // Si ya está hit → reparar sin preguntar
    if (alreadyHit) {
      onToggleCrit(loc, idx);
      return;
    }
    // Si es ammo y tiene rondas → confirmar
    if (mechIsAmmoCrit(name)) {
      const bin = session.ammoBins.find(b => b.loc === loc && b.slotIdx === idx);
      if (bin && bin.current > 0) {
        const dmg = bin.current * ammoExplosionDmgPerRound(bin.family);
        // Solo confirmar si hay daño real (Gauss = 0 → no explota, no preguntar)
        if (dmg > 0) {
          setConfirmAmmo({ loc, idx, name, bin, dmg });
          return;
        }
      }
    }
    // Resto → toggle directo
    onToggleCrit(loc, idx);
  };

  return (
    <section className="bg-surface-container-low p-3 md:p-6 clip-chamfer border-t-2 border-secondary/20">
      <h2 className="font-headline text-sm font-bold text-[var(--p,theme(colors.primary-container))] tracking-[2px] uppercase mb-3 md:mb-4">Slots Críticos</h2>
      <div className="space-y-2 md:space-y-4">
        {MECH_LAYOUT.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-1.5 md:gap-4">
            {row.map(col => {
              if (col.key === '_DMG') return <DamageControl key={col.key} state={state} session={session} sysHits={sysHits} />;
              const crits = session.crits[col.key] || [];
              const totalSlots = col.slots;
              const slots = Array.from({ length: totalSlots }, (_, i) => crits[i] || { name: '-', hit: false });
              const isDestroyed = session.is[col.key] !== undefined && session.is[col.key] <= 0 && state.is[col.key as keyof typeof state.is] > 0;

              return (
                <div key={col.key} className={`border border-outline-variant/30 bg-surface-container/50 ${isDestroyed ? 'opacity-40' : ''}`}>
                  <div className={`text-[8px] md:text-[10px] font-headline font-bold tracking-[1.5px] md:tracking-[2px] uppercase px-1.5 md:px-3 py-1 md:py-2 border-b border-outline-variant/30 truncate ${isDestroyed ? 'text-error' : 'text-[var(--p,theme(colors.primary-container))]'}`}>
                    {col.label} {isDestroyed && '— DESTRUIDO'}
                  </div>
                  <div className="divide-y divide-outline-variant/15">
                    {slots.map((s, idx) => {
                      const isEmpty = s.name === '-' || s.name === 'Empty';
                      const ammoBin = !isEmpty && mechIsAmmoCrit(s.name)
                        ? session.ammoBins.find(b => b.loc === col.key && b.slotIdx === idx)
                        : null;
                      return (
                        <div key={idx} onClick={() => !isEmpty && handleSlotClick(col.key, idx, s.name, s.hit)}
                          className={`flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[11px] font-mono transition-colors ${
                            isEmpty ? 'text-secondary/20 cursor-default'
                            : s.hit ? 'bg-error/15 text-error cursor-pointer'
                            : 'text-on-surface hover:bg-secondary/10 cursor-pointer'
                          }`}
                        >
                          <span className="text-[8px] md:text-[9px] text-secondary/30 w-3 md:w-4 shrink-0">{idx + 1}.</span>
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

      {/* Modal confirmación explosión munición */}
      {confirmAmmo && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setConfirmAmmo(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-surface-container-high border-2 border-error max-w-md w-full p-5 clip-chamfer shadow-[0_0_40px_rgba(255,80,80,0.4)]"
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-error/40">
              <span className="text-3xl">⚠️</span>
              <h3 className="font-headline text-lg font-black text-error uppercase tracking-widest">
                Explosión de munición
              </h3>
            </div>

            <div className="space-y-2 font-mono text-xs text-on-surface mb-5">
              <div className="flex justify-between">
                <span className="text-secondary/60">Slot:</span>
                <span className="font-bold">{confirmAmmo.loc} / {confirmAmmo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary/60">Familia:</span>
                <span>{confirmAmmo.bin.family}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary/60">Rondas restantes:</span>
                <span className="font-bold">{confirmAmmo.bin.current}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-outline-variant">
                <span className="text-error/80">DAÑO INTERNO:</span>
                <span className="font-black text-error text-base">{confirmAmmo.dmg}</span>
              </div>
              <div className="text-[10px] text-secondary/50 pt-1">
                IS-first desde {confirmAmmo.loc} → puede destruir torso CT y reventar el mech.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAmmo(null)}
                className="flex-1 py-3 bg-surface-container hover:bg-surface-container-highest border border-outline text-on-surface uppercase tracking-widest text-sm clip-chamfer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const c = confirmAmmo;
                  setConfirmAmmo(null);
                  onToggleCrit(c.loc, c.idx);
                }}
                className="flex-1 py-3 bg-error/30 hover:bg-error/50 border-2 border-error text-error font-bold uppercase tracking-widest text-sm clip-chamfer"
              >
                ⚠ EXPLOTAR
              </button>
            </div>
          </div>
        </div>
      )}
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

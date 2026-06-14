import { useState } from 'react';
import { Flame, Crosshair, X } from 'lucide-react';

export interface AdjustModTarget {
  /** Etiqueta legible: "AC/20 (RT)" o "RT/Gyro" */
  label: string;
  /** Valores actuales (0-5) */
  heat: number;
  atk: number;
}

interface Props {
  target: AdjustModTarget;
  onChangeHeat: (value: number) => void;
  onChangeAtk: (value: number) => void;
  onClose: () => void;
}

const MIN = 0;
const MAX = 5;

/**
 * Modal genérico: ajusta calor extra y dificultad extra (0-5) para un arma o componente.
 * Usado desde la lista de Armas y desde CriticalMatrix (componentes).
 */
export function AdjustModModal({ target, onChangeHeat, onChangeAtk, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface-container-high border-2 border-amber-400 max-w-sm w-full p-5 clip-chamfer shadow-[0_0_40px_rgba(251,191,36,0.3)]"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-400/40">
          <h3 className="font-headline text-sm font-black text-amber-400 uppercase tracking-widest">
            Ajuste manual
          </h3>
          <button onClick={onClose} className="text-secondary/50 hover:text-secondary">
            <X size={16} />
          </button>
        </div>

        <div className="font-mono text-[11px] text-secondary/70 mb-4 uppercase tracking-wide">
          {target.label}
        </div>

        <AdjustRow
          icon={<Flame size={14} />}
          label="Calor extra"
          hint="Se suma al disparar/usar"
          value={target.heat}
          onChange={onChangeHeat}
        />

        <div className="h-3" />

        <AdjustRow
          icon={<Crosshair size={14} />}
          label="Dificultad extra"
          hint="Se suma a la tirada de impacto"
          value={target.atk}
          onChange={onChangeAtk}
        />

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-surface-container hover:bg-surface-container-highest border border-outline-variant/40 text-secondary uppercase tracking-widest text-[10px] font-mono clip-chamfer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function AdjustRow({ icon, label, hint, value, onChange }: {
  icon: React.ReactNode; label: string; hint: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface uppercase tracking-wide">
          {icon} {label}
        </span>
        <span className="font-mono text-[8px] text-secondary/40">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(MIN, value - 1))}
          disabled={value <= MIN}
          className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/40 text-secondary disabled:opacity-30 hover:border-amber-400/60 hover:text-amber-400 font-mono text-sm clip-chamfer"
        >−</button>
        <span className="w-6 text-center font-mono text-sm font-bold text-amber-400">
          {value > 0 ? `+${value}` : value}
        </span>
        <button
          onClick={() => onChange(Math.min(MAX, value + 1))}
          disabled={value >= MAX}
          className="w-7 h-7 flex items-center justify-center bg-surface-container border border-outline-variant/40 text-secondary disabled:opacity-30 hover:border-amber-400/60 hover:text-amber-400 font-mono text-sm clip-chamfer"
        >+</button>
      </div>
    </div>
  );
}

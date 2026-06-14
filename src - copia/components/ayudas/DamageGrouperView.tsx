import { useState } from 'react';

interface DamageGroup { dmg: number; loc: string | null; roll: number | null }

function roll2D6() { return Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6); }

const MECH_LOCS_FRONT: Record<number, string> = {
  2: 'Torso Central', 3: 'Brazo Derecho', 4: 'Brazo Derecho', 5: 'Pierna Derecha',
  6: 'Torso Derecho', 7: 'Torso Central', 8: 'Torso Izquierdo', 9: 'Pierna Izquierda',
  10: 'Brazo Izquierdo', 11: 'Brazo Izquierdo', 12: 'Cabeza',
};

export function DamageGrouperView() {
  const [totalDmg, setTotalDmg] = useState('');
  const [groups, setGroups] = useState<DamageGroup[]>([]);

  const calcGroups = () => {
    const n = parseInt(totalDmg);
    if (!n || n <= 0) return;
    const result: DamageGroup[] = [];
    let rem = n;
    while (rem > 0) {
      const chunk = Math.min(rem, 5);
      result.push({ dmg: chunk, loc: null, roll: null });
      rem -= chunk;
    }
    setGroups(result);
  };

  const rollLocations = () => {
    setGroups(prev => prev.map(g => {
      const r = roll2D6();
      return { ...g, roll: r, loc: MECH_LOCS_FRONT[r] };
    }));
  };

  const reset = () => { setGroups([]); setTotalDmg(''); };

  return (
    <div className="space-y-6">
      <p className="text-[11px] font-mono text-secondary/50">
        El daño se aplica en grupos de 5 puntos. Cada grupo requiere una tirada de localización independiente.
      </p>

      <div className="bg-surface-container p-4 border border-outline-variant/30 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">Daño total recibido</label>
          <input
            type="number" min="1" max="200" value={totalDmg}
            onChange={e => setTotalDmg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && calcGroups()}
            className="w-28 h-9 bg-surface-container-high border border-outline-variant/40 px-3 font-mono text-lg text-on-surface text-center focus:outline-none focus:border-primary"
          />
        </div>
        <button onClick={calcGroups} disabled={!totalDmg}
          className="px-5 py-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 text-secondary font-headline text-[11px] uppercase tracking-widest disabled:opacity-30 transition-all">
          Agrupar
        </button>
        {groups.length > 0 && (
          <>
            <button onClick={rollLocations}
              className="px-5 py-2 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-headline text-[11px] uppercase tracking-widest transition-all">
              Tirar localizaciones
            </button>
            <button onClick={reset}
              className="px-4 py-2 border border-outline-variant/30 text-secondary/40 hover:text-secondary font-mono text-[10px] uppercase tracking-widest transition-all">
              Reset
            </button>
          </>
        )}
      </div>

      {groups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[9px] font-mono text-secondary/40 uppercase tracking-widest">
              {groups.length} grupo{groups.length !== 1 ? 's' : ''} de daño
            </span>
            <span className="text-[9px] font-mono text-primary/60">
              Total: {groups.reduce((s, g) => s + g.dmg, 0)} puntos
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {groups.map((g, i) => (
              <div key={i} className={`p-3 border text-center transition-all ${
                g.loc ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/30 bg-surface-container'
              }`}>
                <div className="text-[9px] font-mono text-secondary/40 uppercase mb-1">Grupo {i + 1}</div>
                <div className="text-2xl font-bold text-error font-mono">{g.dmg}</div>
                {g.roll && (
                  <>
                    <div className="text-[9px] font-mono text-secondary/40 mt-1">2D6 = {g.roll}</div>
                    <div className="text-[10px] font-mono text-primary font-bold mt-0.5 leading-tight">{g.loc}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

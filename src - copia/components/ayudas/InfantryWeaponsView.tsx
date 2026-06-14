import { useState, useMemo } from 'react';
import { INFANTRY_WEAPONS, type InfantryWeapon } from '@/lib/ayudas-data';

const TIPOS  = ['Todos', 'Rifle', 'Pistola', 'Arco', 'Melee', 'Granada'] as const;
const CLASES = ['Todas', 'Balística', 'Láser', 'Gyro', 'Pulso', 'Misil', 'Explosivo', 'Agujas', 'Arco', 'Ballesta', 'Inflamable', 'Sónica', 'Tranquilizante', 'Cuerpo a Cuerpo', 'Granada'] as const;
const SIZES  = ['Todos', 'A', 'Pequeño', 'Medio', 'Grande', 'Enorme'] as const;

const SPECIAL_COLORS: Record<string, string> = {
  'Insonoro':         'text-secondary/80',
  'Ignora Blindaje':  'text-error',
  '−2 Impactar':      'text-amber-400/80',
  'Ráfaga':           'text-primary/80',
  'Explosivo':        'text-error',
  'Inflamable':       'text-orange-400/80',
  'No letal':         'text-green-400/80',
  'Aturdidor':        'text-green-400/80',
};

export function InfantryWeaponsView() {
  const [search, setSearch]   = useState('');
  const [tipo, setTipo]       = useState<string>('Todos');
  const [clase, setClase]     = useState<string>('Todas');
  const [size, setSize]       = useState<string>('Todos');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return INFANTRY_WEAPONS.filter(w =>
      (!q || w.name.toLowerCase().includes(q) || w.especial.toLowerCase().includes(q)) &&
      (tipo  === 'Todos'  || w.tipo  === tipo) &&
      (clase === 'Todas'  || w.clase === clase) &&
      (size  === 'Todos'  || w.size  === size)
    );
  }, [search, tipo, clase, size]);

  const clearFilters = () => { setSearch(''); setTipo('Todos'); setClase('Todas'); setSize('Todos'); };
  const hasFilters = search || tipo !== 'Todos' || clase !== 'Todas' || size !== 'Todos';

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-surface-container p-3 border border-outline-variant/30 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-40">
          <label className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">Buscar</label>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nombre o propiedad..."
            className="h-8 bg-surface-container-high border border-outline-variant/40 px-3 font-mono text-[11px] text-on-surface placeholder:text-secondary/25 focus:outline-none focus:border-primary"
          />
        </div>

        <FilterSelect label="Tipo"  value={tipo}  onChange={setTipo}  options={TIPOS as unknown as string[]} />
        <FilterSelect label="Clase" value={clase} onChange={setClase} options={CLASES as unknown as string[]} />
        <FilterSelect label="Tamaño" value={size} onChange={setSize}  options={SIZES as unknown as string[]} />

        {hasFilters && (
          <button onClick={clearFilters}
            className="h-8 px-3 font-mono text-[10px] text-secondary/40 hover:text-secondary border border-outline-variant/20 hover:border-outline-variant/50 uppercase tracking-widest transition-all self-end">
            Limpiar
          </button>
        )}

        <span className="font-mono text-[10px] text-secondary/30 self-end pb-1 ml-auto">
          {filtered.length} / {INFANTRY_WEAPONS.length} armas
        </span>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 font-mono text-[11px] text-secondary/30 uppercase tracking-widest">
          Sin resultados con los filtros aplicados
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[10px]">
            <thead>
              <tr className="bg-surface-container-high">
                {['Nombre', 'Daño', 'S', 'M', 'L', 'Car.', 'Rec.', 'Peso', 'Tipo', 'Clase', 'Tamaño', 'Especial'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] text-secondary/50 uppercase tracking-widest border border-outline-variant/20 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <WeaponRow key={w.name} weapon={w} stripe={i % 2 === 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda especiales */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-outline-variant/20">
        {Object.entries(SPECIAL_COLORS).map(([tag, cls]) => (
          <span key={tag} className={`font-mono text-[9px] ${cls}`}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-mono text-secondary/50 uppercase tracking-widest">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 bg-surface-container-high border border-outline-variant/40 px-2 font-mono text-[10px] text-on-surface focus:outline-none focus:border-primary appearance-none pr-6">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function WeaponRow({ weapon: w, stripe }: { weapon: InfantryWeapon; stripe: boolean }) {
  const isMelee   = w.tipo === 'Melee' || w.tipo === 'Granada';
  const specialCls = SPECIAL_COLORS[w.especial] ?? 'text-secondary/50';

  return (
    <tr className={`border border-outline-variant/15 transition-colors hover:bg-surface-container-high/50 ${stripe ? 'bg-surface-container/30' : ''}`}>
      <td className="px-3 py-1.5 font-bold text-on-surface/90 border border-outline-variant/15 whitespace-nowrap">
        {w.name}
        {w.habilidad && <span className="block text-[8px] text-secondary/30 font-normal">{w.habilidad}</span>}
      </td>
      <td className="px-3 py-1.5 text-error font-bold text-center border border-outline-variant/15 whitespace-nowrap">{w.dmg}</td>
      <td className={`px-3 py-1.5 text-center border border-outline-variant/15 ${isMelee ? 'text-secondary/20' : 'text-secondary/70'}`}>{w.s}</td>
      <td className={`px-3 py-1.5 text-center border border-outline-variant/15 ${isMelee || w.m === '—' ? 'text-secondary/20' : 'text-secondary/70'}`}>{w.m}</td>
      <td className={`px-3 py-1.5 text-center border border-outline-variant/15 ${isMelee || w.l === '—' ? 'text-secondary/20' : 'text-secondary/70'}`}>{w.l}</td>
      <td className="px-3 py-1.5 text-center text-on-surface/60 border border-outline-variant/15">{w.car}</td>
      <td className="px-3 py-1.5 text-center text-on-surface/50 border border-outline-variant/15">{w.rec}</td>
      <td className="px-3 py-1.5 text-center text-on-surface/50 border border-outline-variant/15">{w.w}</td>
      <td className="px-3 py-1.5 text-secondary/60 border border-outline-variant/15 whitespace-nowrap">{w.tipo}</td>
      <td className="px-3 py-1.5 text-secondary/50 border border-outline-variant/15 whitespace-nowrap">{w.clase}</td>
      <td className="px-3 py-1.5 text-secondary/40 border border-outline-variant/15 text-center">{w.size}</td>
      <td className={`px-3 py-1.5 border border-outline-variant/15 whitespace-nowrap ${w.especial ? specialCls : 'text-secondary/20'}`}>
        {w.especial || '—'}
      </td>
    </tr>
  );
}

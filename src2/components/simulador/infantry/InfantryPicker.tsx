import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { INFANTRY_CATALOG } from '@/lib/infantry-catalog';
import type { InfantryState } from '@/lib/combat-types';

interface Props {
  onSelect: (id: string) => void;
  onClose:  () => void;
}

const MOV_LABEL: Record<string, string> = {
  foot: 'Pie', motorized: 'Motorizada', mechanized: 'Mecanizada', jump: 'Salto',
};

export function InfantryPicker({ onSelect, onClose }: Props) {
  const [faction, setFaction]   = useState<'all' | 'IS' | 'Clan'>('all');
  const [movement, setMovement] = useState<string>('all');
  const [query, setQuery]       = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INFANTRY_CATALOG.filter(u =>
      (faction === 'all' || u.faction === faction) &&
      (movement === 'all' || u.movement === movement) &&
      (!q || u.name.toLowerCase().includes(q) || u.weaponClass.toLowerCase().includes(q)),
    );
  }, [faction, movement, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-surface-container border border-outline-variant clip-chamfer w-[480px] max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <span className="font-mono text-[11px] text-primary tracking-widest uppercase">Asignar Pelotón</span>
          <button onClick={onClose} className="text-outline hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-outline-variant/40 bg-surface-container-low">
          <Search size={12} className="text-secondary/40 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar pelotón…"
            className="flex-1 bg-transparent font-mono text-[10px] text-on-surface placeholder:text-secondary/25 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-outline hover:text-primary transition-colors">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-2 border-b border-outline-variant/40 flex-wrap">
          {(['all', 'IS', 'Clan'] as const).map(f => (
            <button key={f}
              onClick={() => setFaction(f)}
              className={`font-mono text-[9px] tracking-widest px-2 py-1 border transition-colors ${
                faction === f
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-outline-variant text-outline hover:border-secondary'
              }`}
            >
              {f === 'all' ? 'TODOS' : f}
            </button>
          ))}
          <div className="w-px bg-outline-variant/40 mx-1" />
          {(['all', 'foot', 'motorized', 'mechanized', 'jump'] as const).map(m => (
            <button key={m}
              onClick={() => setMovement(m)}
              className={`font-mono text-[9px] tracking-widest px-2 py-1 border transition-colors ${
                movement === m
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-outline-variant text-outline hover:border-secondary'
              }`}
            >
              {m === 'all' ? 'MOV' : MOV_LABEL[m]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.map(u => (
            <UnitRow key={u.id} unit={u} onSelect={() => { onSelect(u.id); onClose(); }} />
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center font-mono text-[10px] text-outline tracking-widest">SIN RESULTADOS</div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnitRow({ unit, onSelect }: { unit: InfantryState; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-outline-variant/20 hover:bg-primary/5 transition-colors text-left group"
    >
      <div className={`w-1.5 h-8 ${unit.faction === 'Clan' ? 'bg-red-500' : 'bg-primary'}`} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] text-on-surface group-hover:text-primary transition-colors truncate">
          {unit.name}
        </div>
        <div className="font-mono text-[9px] text-outline tracking-widest mt-0.5">
          {MOV_LABEL[unit.movement]} · {unit.weaponClass.toUpperCase()} · {unit.platoonSize} TROPAS
          · S{unit.range.short}/M{unit.range.medium}/L{unit.range.long}
          {unit.antiMech ? ' · ANTI-MECH' : ''}
        </div>
      </div>
      <div className="font-mono text-[9px] text-outline shrink-0">BV {unit.bv}</div>
    </button>
  );
}

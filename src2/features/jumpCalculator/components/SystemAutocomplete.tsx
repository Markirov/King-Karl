import { useState, useRef, useEffect, useCallback } from 'react';
import type { StarSystem } from '../types';

interface Props {
  label: string;
  systems: StarSystem[];
  value: StarSystem | null;
  onChange: (system: StarSystem | null) => void;
  placeholder?: string;
}

export function SystemAutocomplete({ label, systems, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync query when value changes externally
  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  const filtered = query.length >= 2
    ? systems
        .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 12)
    : [];

  const select = useCallback((sys: StarSystem) => {
    onChange(sys);
    setQuery(sys.name);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative flex-1">
      <label className="block font-mono text-[9px] uppercase tracking-widest text-outline mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder ?? 'Buscar sistema...'}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlighted(0);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className="w-full bg-surface-container border border-outline-variant/40 text-on-surface font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary-container/60 placeholder:text-outline/40"
      />

      {/* Indicador de sistema seleccionado */}
      {value && (
        <div className="absolute right-2 top-7 text-primary-container/60 font-mono text-[9px] pointer-events-none">
          [{value.x.toFixed(1)}, {value.y.toFixed(1)}]
        </div>
      )}

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 top-full mt-0.5 left-0 right-0 bg-surface-container-high border border-outline-variant/40 max-h-48 overflow-y-auto"
        >
          {filtered.map((sys, i) => (
            <li
              key={sys.id}
              onMouseDown={() => select(sys)}
              className={`px-3 py-1.5 font-mono text-xs cursor-pointer flex items-center justify-between ${
                i === highlighted
                  ? 'bg-primary-container/20 text-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              <span>{sys.name}</span>
              {sys.spectralType && (
                <span className="text-outline/60 text-[10px]">{sys.spectralType}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

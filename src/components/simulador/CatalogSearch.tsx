import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Loader } from 'lucide-react';
import { useAppStore } from '@/lib/store';

type UnitKind = 'mechs' | 'vehicles' | 'infantry' | 'battlearmor';

interface CatalogEntry {
  name: string;
  file: string;
  bv2?: number;
  tons?: number;
  year?: number;
  era?: string;
  motiveType?: string;
  clan?: boolean;
  kind: UnitKind;
}

const KIND_LABEL: Record<UnitKind, string> = { mechs: 'MCH', vehicles: 'VHC', infantry: 'INF', battlearmor: 'BA' };
const KIND_COLOR: Record<UnitKind, string> = { mechs: 'text-green-400 border-green-400/30', vehicles: 'text-secondary border-secondary/30', infantry: 'text-amber-400 border-amber-400/30', battlearmor: 'text-purple-400 border-purple-400/30' };

interface Props {
  onLoad: (text: string, filename: string) => void;
  onSwitchTab?: (tab: UnitKind) => void;
  allowClan?: boolean;
  limitToYear?: boolean;
}

export function CatalogSearch({ onLoad, onSwitchTab, allowClan = true, limitToYear = false }: Props) {
  const campaignYear = useAppStore(s => s.campaign.campaignYear);
  const [catalog, setCatalog]   = useState<CatalogEntry[]>([]);
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [fetching, setFetching] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load both catalogs on mount
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const loadIndex = (folder: string, kind: UnitKind) =>
      fetch(`${base}assets/${folder}/index.json`)
        .then(r => r.ok ? r.json() : [])
        .then((arr: any[]) => arr.map((e: any) => ({
          name: e.name, file: e.file, bv2: e.bv2, tons: e.tons, year: e.year,
          era: e.era, motiveType: e.type, kind,
        })))
        .catch(() => [] as CatalogEntry[]);

    Promise.all([
      loadIndex('mechs', 'mechs'),
      loadIndex('vehicles', 'vehicles'),
      loadIndex('infantry', 'infantry'),
      loadIndex('battlearmor', 'battlearmor'),
    ]).then(results => setCatalog(results.flat()));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return [];
    return catalog.filter(e =>
      (!limitToYear || !e.year || e.year <= campaignYear) &&
      (allowClan || !e.clan) &&
      (e.name.toLowerCase().includes(q) ||
       (e.motiveType && e.motiveType.toLowerCase().includes(q)))
    ).slice(0, 20);
  }, [q, catalog, campaignYear, allowClan, limitToYear]);

  const handleSelect = async (entry: CatalogEntry) => {
    setOpen(false);
    setQuery(entry.name);
    setFetching(entry.file);

    // Switch to the correct sub-tab before loading
    onSwitchTab?.(entry.kind);

    try {
      const url = `${import.meta.env.BASE_URL}assets/${entry.kind}/${encodeURIComponent(entry.file)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      onLoad(text, entry.file);
      setQuery('');
    } catch (err) {
      console.error('Catalog load error:', err);
    } finally {
      setFetching(null);
    }
  };

  const isBusy = fetching !== null;

  return (
    <div ref={wrapRef} className="relative">
      <div className={`flex items-center gap-1.5 bg-surface-container-low border px-2 h-8 clip-chamfer transition-colors ${
        open ? 'border-primary-container/60' : 'border-outline-variant/30'
      } focus-within:border-primary-container/60`}>
        {isBusy
          ? <Loader size={12} className="text-secondary/40 shrink-0 animate-spin" />
          : <Search size={12} className="text-secondary/40 shrink-0" />}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={catalog.length === 0 ? 'Cargando catálogo…' : 'Buscar mech o vehículo…'}
          disabled={isBusy}
          className="w-48 bg-transparent font-mono text-[10px] text-on-surface placeholder:text-secondary/25 focus:outline-none disabled:opacity-40"
        />
        {catalog.length > 0 && (
          <span className="text-[8px] text-secondary/25 font-mono shrink-0">{catalog.length}</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 z-50 w-80 max-h-72 overflow-y-auto bg-surface-container-highest border border-primary-container/30 shadow-[0_8px_24px_rgba(0,0,0,0.7)] clip-chamfer custom-scrollbar">
          {results.map((entry, i) => (
            <button key={i} onClick={() => handleSelect(entry)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary-container/10 transition-colors border-b border-outline-variant/10 last:border-0">
              <span className={`font-mono text-[7px] font-bold uppercase tracking-wider shrink-0 px-1 py-0.5 border ${KIND_COLOR[entry.kind]}`}>
                {KIND_LABEL[entry.kind]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] text-on-surface/80 truncate font-bold">{entry.name}</div>
                <div className="font-mono text-[8px] text-secondary/40 flex gap-2">
                  {entry.year && <span>{entry.year}</span>}
                  {entry.bv2 && <span>BV {entry.bv2}</span>}
                  {entry.motiveType && <span className="capitalize">{entry.motiveType}</span>}
                </div>
              </div>
              {fetching === entry.file && (
                <Loader size={10} className="text-primary-container/60 animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {open && q.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1 left-0 z-50 w-56 bg-surface-container-highest border border-outline-variant/20 shadow-xl clip-chamfer px-3 py-2">
          <span className="font-mono text-[9px] text-secondary/30 italic">Sin resultados</span>
        </div>
      )}
    </div>
  );
}

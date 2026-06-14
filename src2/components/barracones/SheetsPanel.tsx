import { useState, useEffect } from 'react';
import { Cloud, Search, Upload, Download, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import type { SheetsStatus, SheetsSearchResult } from '@/hooks/useBarracones';
import type { Pilot } from '@/lib/barracones-types';

interface Props {
  pilot:        Pilot | null;
  status:       SheetsStatus;
  msg:          string;
  results:      SheetsSearchResult[];
  initialQuery?: string;
  onSearch: (name: string) => void;
  onLoad:   (raw: any) => void;
  onSave:   () => void;
  onClose:  () => void;
}

export function SheetsPanel({ pilot, status, msg, results, initialQuery = '', onSearch, onLoad, onSave, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => { if (initialQuery) setQuery(initialQuery); }, [initialQuery]);

  const handleSearch = () => onSearch(query);

  return (
    <div className="bg-surface-container border border-primary-container/20 border-t-2 border-t-primary-container/60 p-4 space-y-4 animate-[fadeInUp_0.2s_ease]">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-primary-container" />
          <span className="font-headline text-[10px] font-bold text-primary-container tracking-[3px] uppercase">
            Google Sheets
          </span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center border border-outline-variant/30 text-outline hover:text-on-surface hover:border-outline-variant transition-all">
          <X size={11} />
        </button>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="text-[8px] font-mono text-outline uppercase tracking-widest">Buscar piloto por callsign</div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Callsign del jugador…"
            className="flex-1 h-8 bg-surface-container-high border border-outline-variant/30 px-3 font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || status === 'loading'}
            className="px-3 h-8 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-mono text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all flex items-center gap-1.5">
            {status === 'loading' ? <Loader size={11} className="animate-spin" /> : <Search size={11} />}
            Buscar
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="border border-outline-variant/20 divide-y divide-outline-variant/10">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-surface-container-high/50 transition-colors">
                <div>
                  <span className="font-mono text-[11px] text-primary-container font-bold">{r.jugador || '—'}</span>
                  {r.nombre && <span className="font-mono text-[10px] text-secondary ml-2">{r.nombre}</span>}
                </div>
                <button
                  onClick={() => onLoad(r.raw)}
                  className="flex items-center gap-1 px-2 py-1 border border-primary/40 text-primary hover:text-primary hover:border-primary font-mono text-[9px] uppercase tracking-widest transition-all">
                  <Download size={10} /> Cargar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save current pilot */}
      {pilot && (
        <div className="border-t border-outline-variant/20 pt-3 flex items-center justify-between">
          <div className="text-[9px] font-mono text-outline">
            Guardar <span className="text-primary-container">{pilot.callsign || pilot.nombre || 'piloto'}</span> en la hoja
          </div>
          <button
            onClick={onSave}
            disabled={status === 'loading'}
            className="flex items-center gap-1.5 px-3 h-8 bg-primary-container/10 hover:bg-primary-container/20 border border-primary-container/40 text-primary-container font-mono text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all">
            {status === 'loading' ? <Loader size={11} className="animate-spin" /> : <Upload size={11} />}
            Guardar
          </button>
        </div>
      )}

      {/* Status message */}
      {msg && (
        <div className={`flex items-center gap-2 text-[10px] font-mono py-1.5 px-2 border ${
          status === 'ok'
            ? 'text-green-400 border-green-400/20 bg-green-400/5'
            : 'text-error border-error/20 bg-error/5'
        }`}>
          {status === 'ok'
            ? <CheckCircle size={11} />
            : <AlertCircle size={11} />}
          {msg}
        </div>
      )}
    </div>
  );
}

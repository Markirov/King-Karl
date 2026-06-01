// FuerzaSyncBar — indicador estado + Save/Load/Reset fuerza
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cloud, CloudUpload, AlertCircle, FolderOpen, Save, Trash2 } from 'lucide-react';
import { loadFuerzas, saveFuerza, type FuerzaEntry } from '@/lib/sheets-service';
import type { SimuladorSnapshot } from '@/lib/simulador-persistence';
import { useDismissable } from '@/hooks/useDismissable';

interface Props {
  dirty: boolean;
  lastLocalSave: string | null;
  getSnapshot: () => Omit<SimuladorSnapshot, 'schemaVersion' | 'updatedAt'>;
  hydrateFromSnapshot: (snap: SimuladorSnapshot) => void;
  resetSession: () => void;
  markSynced: () => void;
  /** BV total para guardar como metadato (calcula caller). */
  bvTotal: number;
}

type PushState = 'idle' | 'pushing' | 'ok' | 'error';

export function FuerzaSyncBar({
  dirty, lastLocalSave, getSnapshot, hydrateFromSnapshot, resetSession, markSynced, bvTotal,
}: Props) {
  const [pushState, setPushState] = useState<PushState>('idle');
  const [pushError, setPushError] = useState<string | null>(null);
  const [lastSyncIso, setLastSyncIso] = useState<string | null>(null);

  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [loadPanelOpen, setLoadPanelOpen] = useState(false);
  const [fuerzaNombre, setFuerzaNombre] = useState('');

  const [fuerzas, setFuerzas] = useState<FuerzaEntry[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const savePanelRef = useRef<HTMLDivElement>(null);
  const loadPanelRef = useRef<HTMLDivElement>(null);
  useDismissable(savePanelRef, savePanelOpen, () => setSavePanelOpen(false));
  useDismissable(loadPanelRef, loadPanelOpen, () => setLoadPanelOpen(false));

  // Auto-OK indicator después de 2s
  useEffect(() => {
    if (pushState === 'ok') {
      const t = setTimeout(() => setPushState('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [pushState]);

  const handleSave = async () => {
    if (!fuerzaNombre.trim()) return;
    setPushState('pushing');
    setPushError(null);
    const snap: SimuladorSnapshot = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      ...getSnapshot(),
    };
    const res = await saveFuerza({ nombre: fuerzaNombre.trim(), bv: bvTotal, snapshot: snap });
    if (res.success) {
      setPushState('ok');
      setLastSyncIso(new Date().toISOString());
      markSynced();
      setSavePanelOpen(false);
      setFuerzaNombre('');
    } else {
      setPushState('error');
      setPushError(res.error ?? 'desconocido');
    }
  };

  const openLoadPanel = async () => {
    setLoadPanelOpen(true);
    setLoadingList(true);
    const res = await loadFuerzas();
    setLoadingList(false);
    if (res.success && Array.isArray((res.data as any)?.fuerzas)) {
      setFuerzas((res.data as any).fuerzas);
    } else {
      setFuerzas([]);
    }
  };

  const handleLoadOne = (entry: FuerzaEntry) => {
    try {
      const snap = typeof (entry as any).json === 'string'
        ? JSON.parse((entry as any).json)
        : entry.snapshot;
      if (!snap?.schemaVersion) return;
      hydrateFromSnapshot(snap);
      setLoadPanelOpen(false);
      markSynced();
    } catch (e) {
      setPushError(String(e));
    }
  };

  // ── Status pill ──
  let statusIcon = <Cloud size={12} />;
  let statusTone = 'text-secondary/50 border-outline-variant/40';
  let statusLabel = 'Sin sesión';
  if (pushState === 'pushing') {
    statusIcon = <CloudUpload size={12} className="animate-pulse" />;
    statusTone = 'text-sky-400 border-sky-400/50';
    statusLabel = 'Guardando…';
  } else if (pushState === 'error') {
    statusIcon = <AlertCircle size={12} />;
    statusTone = 'text-error border-error/50';
    statusLabel = `Error: ${pushError ?? '—'}`;
  } else if (pushState === 'ok') {
    statusIcon = <CheckCircle2 size={12} />;
    statusTone = 'text-emerald-400 border-emerald-400/50';
    statusLabel = 'Guardado';
  } else if (dirty) {
    statusIcon = <CloudUpload size={12} />;
    statusTone = 'text-amber-400 border-amber-400/50';
    statusLabel = lastLocalSave
      ? `Cambios locales · ${new Date(lastLocalSave).toLocaleTimeString('es-ES')}`
      : 'Cambios locales sin guardar';
  } else if (lastSyncIso) {
    statusIcon = <CheckCircle2 size={12} />;
    statusTone = 'text-emerald-400 border-emerald-400/50';
    statusLabel = `Sincronizado · ${new Date(lastSyncIso).toLocaleTimeString('es-ES')}`;
  }

  return (
    <div className="relative flex items-center gap-2">
      <div
        title={statusLabel}
        className={`flex items-center gap-1.5 border px-2 py-1 clip-chamfer ${statusTone} font-mono text-[9px] uppercase tracking-widest select-none`}
      >
        {statusIcon}
        <span className="hidden sm:inline">{statusLabel}</span>
      </div>

      <button
        onClick={() => setSavePanelOpen(o => !o)}
        title="Guardar fuerza"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-primary-container/60 text-secondary/70 hover:text-primary-container px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <Save size={12} /> Guardar
      </button>

      <button
        onClick={openLoadPanel}
        title="Cargar fuerza"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-primary-container/60 text-secondary/70 hover:text-primary-container px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <FolderOpen size={12} /> Cargar
      </button>

      <button
        onClick={() => {
          if (confirm('Vaciar simulador y borrar sesión local. ¿Continuar?')) resetSession();
        }}
        title="Cerrar misión (limpia slots y snapshot local)"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-error/60 text-secondary/40 hover:text-error px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <Trash2 size={12} />
      </button>

      {/* Save panel */}
      {savePanelOpen && (
        <div ref={savePanelRef} className="absolute right-0 top-full mt-2 z-40 w-72 bg-surface-container-high border border-primary-container/40 p-3 clip-chamfer shadow-lg">
          <h3 className="font-headline text-xs font-bold text-primary-container uppercase tracking-widest mb-2">Guardar fuerza</h3>
          <input
            type="text"
            value={fuerzaNombre}
            onChange={e => setFuerzaNombre(e.target.value)}
            placeholder="Nombre lanza (p.ej. PRIMUS)"
            className="w-full bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-[10px] text-secondary placeholder:text-outline-variant/50 focus:border-primary-container/60 focus:outline-none mb-2"
            autoFocus
          />
          <div className="flex justify-between items-center text-[9px] font-mono text-secondary/50 mb-2">
            <span>BV total: {bvTotal}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSavePanelOpen(false)}
              className="flex-1 border border-outline-variant/40 hover:border-secondary/40 text-secondary/70 py-1 font-mono text-[9px] uppercase tracking-widest"
            >Cancelar</button>
            <button
              onClick={handleSave}
              disabled={!fuerzaNombre.trim() || pushState === 'pushing'}
              className="flex-1 bg-primary-container/20 hover:bg-primary-container/40 disabled:opacity-30 border border-primary-container text-primary-container py-1 font-mono text-[9px] uppercase tracking-widest"
            >Guardar</button>
          </div>
        </div>
      )}

      {/* Load panel */}
      {loadPanelOpen && (
        <div ref={loadPanelRef} className="absolute right-0 top-full mt-2 z-40 w-80 bg-surface-container-high border border-primary-container/40 p-3 clip-chamfer shadow-lg max-h-[400px] overflow-y-auto custom-scrollbar">
          <h3 className="font-headline text-xs font-bold text-primary-container uppercase tracking-widest mb-2">Cargar fuerza</h3>
          {loadingList && <p className="font-mono text-[10px] text-secondary/50 italic">Cargando…</p>}
          {!loadingList && fuerzas.length === 0 && (
            <p className="font-mono text-[10px] text-secondary/50 italic">No hay fuerzas guardadas</p>
          )}
          {!loadingList && fuerzas.length > 0 && (
            <ul className="space-y-1">
              {fuerzas.map((f, i) => (
                <li key={f.id ?? i}>
                  <button
                    onClick={() => handleLoadOne(f)}
                    className="w-full text-left flex justify-between items-center gap-2 hover:bg-primary-container/10 px-2 py-1 border-b border-outline-variant/20"
                  >
                    <span className="font-mono text-[10px] text-secondary truncate">{f.nombre || '(sin nombre)'}</span>
                    <span className="font-mono text-[9px] text-secondary/50 shrink-0">
                      {f.bv ? `${f.bv} BV` : ''} · {f.fecha ? new Date(f.fecha).toLocaleDateString('es-ES') : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

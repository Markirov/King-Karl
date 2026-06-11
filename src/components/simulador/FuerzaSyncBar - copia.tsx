// FuerzaSyncBar — indicador estado + Save/Load/Reset fuerza
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cloud, CloudUpload, AlertCircle, FolderOpen, Save, Trash2, Archive } from 'lucide-react';
import {
  loadFuerzas, saveFuerza, type FuerzaEntry,
  loadAllFuerzaConfigSlots, saveFuerzaConfigSlot, clearFuerzaConfigSlot,
  type FuerzaSlot, type FuerzaConfigEntry,
} from '@/lib/sheets-service';
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
  const [slotsPanelOpen, setSlotsPanelOpen] = useState(false);
  const [fuerzaNombre, setFuerzaNombre] = useState('');

  const [fuerzas, setFuerzas] = useState<FuerzaEntry[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Slots fijos en Configuracion (FUERZA1..FUERZA5)
  const [slots, setSlots] = useState<Record<FuerzaSlot, FuerzaConfigEntry | null>>({ 1: null, 2: null, 3: null, 4: null, 5: null });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotNombre, setSlotNombre] = useState('');

  const savePanelRef = useRef<HTMLDivElement>(null);
  const loadPanelRef = useRef<HTMLDivElement>(null);
  const slotsPanelRef = useRef<HTMLDivElement>(null);
  useDismissable(savePanelRef, savePanelOpen, () => setSavePanelOpen(false));
  useDismissable(loadPanelRef, loadPanelOpen, () => setLoadPanelOpen(false));
  useDismissable(slotsPanelRef, slotsPanelOpen, () => setSlotsPanelOpen(false));

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

  // ── Slots fijos en Configuracion ──

  const openSlotsPanel = async () => {
    setSlotsPanelOpen(true);
    setLoadingSlots(true);
    const all = await loadAllFuerzaConfigSlots();
    setSlots(all);
    setLoadingSlots(false);
  };

  const handleSaveSlot = async (slot: FuerzaSlot) => {
    setPushState('pushing');
    setPushError(null);
    const snap: SimuladorSnapshot = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      ...getSnapshot(),
    };
    const nombre = slotNombre.trim() || `Fuerza ${slot}`;
    const res = await saveFuerzaConfigSlot(slot, { nombre, bv: bvTotal, snapshot: snap });
    if (res?.success) {
      setPushState('ok');
      setLastSyncIso(new Date().toISOString());
      markSynced();
      // refresca slots
      const all = await loadAllFuerzaConfigSlots();
      setSlots(all);
      setSlotNombre('');
    } else {
      setPushState('error');
      setPushError(String((res as any)?.error || 'no_save'));
    }
  };

  const handleLoadSlot = (slot: FuerzaSlot) => {
    const entry = slots[slot];
    if (!entry?.snapshot?.schemaVersion) return;
    hydrateFromSnapshot(entry.snapshot);
    setSlotsPanelOpen(false);
    markSynced();
  };

  const handleClearSlot = async (slot: FuerzaSlot) => {
    if (!confirm(`Borrar slot FUERZA${slot}?`)) return;
    await clearFuerzaConfigSlot(slot);
    const all = await loadAllFuerzaConfigSlots();
    setSlots(all);
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
    <div className="relative flex items-center gap-1 sm:gap-2">
      {/* Status pill: solo desktop (2xl+) para no comer espacio en tablet */}
      <div
        title={statusLabel}
        className={`hidden 2xl:flex items-center gap-1.5 border px-2 py-1 clip-chamfer ${statusTone} font-mono text-[9px] uppercase tracking-widest select-none`}
      >
        {statusIcon}
        <span>{statusLabel}</span>
      </div>

      <button
        onClick={() => setSavePanelOpen(o => !o)}
        title={`Guardar fuerza · ${statusLabel}`}
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-primary-container/60 text-secondary/70 hover:text-primary-container px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <Save size={12} /> <span className="hidden sm:inline">Guardar</span>
      </button>

      <button
        onClick={openLoadPanel}
        title="Cargar fuerza"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-primary-container/60 text-secondary/70 hover:text-primary-container px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <FolderOpen size={12} /> <span className="hidden sm:inline">Cargar</span>
      </button>

      <button
        onClick={openSlotsPanel}
        title="Slots fijos FUERZA1-5 (Configuracion)"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-amber-400/60 text-secondary/70 hover:text-amber-400 px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <Archive size={12} /> <span className="hidden sm:inline">Slots</span>
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

      {/* Slots panel — FUERZA1..5 en Configuracion */}
      {slotsPanelOpen && (
        <div ref={slotsPanelRef} className="absolute right-0 top-full mt-2 z-40 w-[360px] max-w-[95vw] bg-surface-container-high border border-amber-400/40 p-3 clip-chamfer shadow-lg max-h-[500px] overflow-y-auto custom-scrollbar">
          <h3 className="font-headline text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Archive size={12} /> Slots fijos
          </h3>
          <div className="font-mono text-[9px] text-secondary/50 mb-3">
            5 espacios en celdas FUERZA1..5 de Configuracion. Guardar sobrescribe.
          </div>

          {/* Nombre opcional al guardar */}
          <input
            type="text"
            value={slotNombre}
            onChange={e => setSlotNombre(e.target.value)}
            placeholder="Nombre (opcional, default: Fuerza N)"
            className="w-full bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-[10px] text-secondary placeholder:text-outline-variant/50 focus:border-amber-400/60 focus:outline-none mb-3"
          />

          {loadingSlots && <p className="font-mono text-[10px] text-secondary/50 italic">Cargando slots…</p>}

          {!loadingSlots && (
            <ul className="space-y-1.5">
              {([1, 2, 3, 4, 5] as FuerzaSlot[]).map(s => {
                const entry = slots[s];
                const occupied = !!entry?.snapshot;
                return (
                  <li key={s} className="border border-outline-variant/30 bg-surface-container p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-headline text-[10px] font-bold text-amber-400 tracking-widest">
                        FUERZA{s}
                      </span>
                      {occupied ? (
                        <span className="font-mono text-[9px] text-secondary/70">
                          {entry!.nombre} · {entry!.bv} BV
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-outline-variant/60 italic">— vacío —</span>
                      )}
                    </div>
                    {occupied && (
                      <div className="font-mono text-[8px] text-secondary/40 mb-1.5">
                        {entry!.updatedAt ? new Date(entry!.updatedAt).toLocaleString('es-ES') : ''}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSaveSlot(s)}
                        disabled={pushState === 'pushing'}
                        className="flex-1 bg-amber-400/15 hover:bg-amber-400/30 disabled:opacity-30 border border-amber-400/50 text-amber-400 py-1 font-mono text-[9px] uppercase tracking-widest"
                        title={occupied ? 'Sobrescribir slot' : 'Guardar en slot vacío'}
                      >
                        {occupied ? 'Sobreescribir' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => handleLoadSlot(s)}
                        disabled={!occupied}
                        className="flex-1 bg-primary-container/15 hover:bg-primary-container/30 disabled:opacity-20 border border-primary-container/50 text-primary-container py-1 font-mono text-[9px] uppercase tracking-widest"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleClearSlot(s)}
                        disabled={!occupied}
                        className="px-2 bg-error/15 hover:bg-error/30 disabled:opacity-20 border border-error/50 text-error py-1 font-mono text-[9px] uppercase tracking-widest"
                        title="Vaciar slot"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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

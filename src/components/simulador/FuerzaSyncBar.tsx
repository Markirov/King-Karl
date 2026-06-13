// FuerzaSyncBar — indicador estado + Slots/Reset fuerza
import { useEffect, useRef, useState } from 'react';
import { CloudUpload, AlertCircle, Trash2, Archive, Lock, LockOpen } from 'lucide-react';
import {
  loadAllFuerzaConfigSlots, saveFuerzaConfigSlot, clearFuerzaConfigSlot, saveConfigBatch,
  type FuerzaSlot, type FuerzaConfigEntry,
} from '@/lib/sheets-service';
import type { SimuladorSnapshot } from '@/lib/simulador-persistence';
import { useDismissable } from '@/hooks/useDismissable';

interface Props {
  dirty: boolean;
  lastLocalSave: string | null;
  getSnapshot: () => Omit<SimuladorSnapshot, 'schemaVersion' | 'updatedAt'>;
  hydrateFromSnapshot: (snap: SimuladorSnapshot) => void;
  clearCurrentUnit: () => void;
  markSynced: () => void;
  /** BV total para guardar como metadato (calcula caller). */
  bvTotal: number;
  /** Modo campaña activo (FUERZA5 lock + pilot order fijo). */
  campaignMode?: boolean;
  /** Toggle handler (pide clave si activa). */
  onToggleCampaignMode?: () => void | Promise<void>;
}

type PushState = 'idle' | 'pushing' | 'ok' | 'error';

export function FuerzaSyncBar({
  dirty, lastLocalSave, getSnapshot, hydrateFromSnapshot, clearCurrentUnit, markSynced, bvTotal,
  campaignMode, onToggleCampaignMode,
}: Props) {
  const [pushState, setPushState] = useState<PushState>('idle');
  const [pushError, setPushError] = useState<string | null>(null);
  const [lastSyncIso, setLastSyncIso] = useState<string | null>(null);

  const [slotsPanelOpen, setSlotsPanelOpen] = useState(false);

  // Slots fijos en Configuracion (FUERZA1..FUERZA5)
  const [slots, setSlots] = useState<Record<FuerzaSlot, FuerzaConfigEntry | null>>({ 1: null, 2: null, 3: null, 4: null, 5: null });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotNombre, setSlotNombre] = useState('');

  const slotsPanelRef = useRef<HTMLDivElement>(null);
  useDismissable(slotsPanelRef, slotsPanelOpen, () => setSlotsPanelOpen(false));

  // Auto-OK indicator después de 2s
  useEffect(() => {
    if (pushState === 'ok') {
      const t = setTimeout(() => setPushState('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [pushState]);

  // ── Slot 5 protegido — clave "Mark" para sobrescribir/borrar ──
  // Slot 5 ya no protegido — el lock vive en modo campaña.
  const PROTECTED_FUERZA_SLOTS: FuerzaSlot[] = [];
  const PROTECTED_PASSWORD = 'Mark';
  const UNLOCK_KEY = 'kk_fuerza_slot_unlock';

  const isFuerzaSlotUnlocked = (slot: FuerzaSlot): boolean => {
    if (!PROTECTED_FUERZA_SLOTS.includes(slot)) return true;
    try {
      const raw = sessionStorage.getItem(UNLOCK_KEY);
      if (!raw) return false;
      const arr = JSON.parse(raw) as number[];
      return Array.isArray(arr) && arr.includes(slot);
    } catch { return false; }
  };

  const unlockFuerzaSlot = (slot: FuerzaSlot) => {
    try {
      const raw = sessionStorage.getItem(UNLOCK_KEY);
      const arr: number[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(slot)) arr.push(slot);
      sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(arr));
    } catch { /* ignore */ }
  };

  const guardFuerzaSlotWrite = (slot: FuerzaSlot): boolean => {
    if (isFuerzaSlotUnlocked(slot)) return true;
    const pwd = prompt(`FUERZA${slot} protegida. Introduce la clave:`);
    if (pwd === null) return false;
    if (pwd === PROTECTED_PASSWORD) {
      unlockFuerzaSlot(slot);
      return true;
    }
    alert(`Clave incorrecta. FUERZA${slot} no modificada.`);
    return false;
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
    if (!guardFuerzaSlotWrite(slot)) return;
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

      // Slot 5 = "fuerza activa" → escribe ESTADOMECHS (mapa %estado por mech) para Comision.
      if (slot === 5) {
        try {
          const map: Record<string, number> = {};
          for (const ms of (snap.mechSlots ?? [])) {
            const st: any = ms?.state; const se: any = ms?.session;
            if (!st || !se) continue;
            const armorLocs = ['HD','CTf','CTr','LTf','LTr','RTf','RTr','LA','RA','LL','RL'];
            const isLocs    = ['HD','CT','LT','RT','LA','RA','LL','RL'];
            const armorMax = armorLocs.reduce((s,k) => s + ((st.armor || {})[k] ?? 0), 0);
            const armorCur = armorLocs.reduce((s,k) => s + ((se.armor || {})[k] ?? 0), 0);
            const isMax    = isLocs.reduce((s,k) => s + ((st.is || {})[k] ?? 0), 0);
            const isCur    = isLocs.reduce((s,k) => s + ((se.is || {})[k] ?? 0), 0);
            const total = armorMax + isMax;
            if (total <= 0) continue;
            // Mech destruido -> estado 0% (override aunque queden pts en otras locs).
            const pct = se.destroyed
              ? 0
              : Math.round(((armorCur + isCur) / total) * 100);
            const key = `${st.chassis || ''} ${st.model || ''}`.trim();
            if (key) map[key] = pct;
          }
          await saveConfigBatch({ ESTADOMECHS: JSON.stringify(map) });
        } catch {/* ignore */}
      }
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
    if (!guardFuerzaSlotWrite(slot)) return;
    if (!confirm(`Borrar slot FUERZA${slot}?`)) return;
    await clearFuerzaConfigSlot(slot);
    const all = await loadAllFuerzaConfigSlots();
    setSlots(all);
  };

  return (
    <div className="relative flex items-center gap-1 sm:gap-2">
      <button
        onClick={openSlotsPanel}
        title="Slots fijos FUERZA1-5 (Configuracion)"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-amber-400/60 text-secondary/70 hover:text-amber-400 px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <Archive size={12} /> <span className="hidden sm:inline">Slots</span>
      </button>

      <button
        onClick={() => {
          if (confirm('Borrar la unidad en uso de este slot. ¿Continuar?')) clearCurrentUnit();
        }}
        title="Borrar unidad en uso (solo este slot)"
        className="flex items-center gap-1 border border-outline-variant/40 hover:border-error/60 text-secondary/40 hover:text-error px-2 py-1 clip-chamfer font-mono text-[9px] uppercase tracking-widest transition-colors"
      >
        <Trash2 size={12} />
      </button>

      {/* Slots panel — FUERZA1..5 en Configuracion */}
      {slotsPanelOpen && (
        <div ref={slotsPanelRef} className="absolute right-0 top-full mt-2 z-40 w-[360px] max-w-[95vw] bg-surface-container-high border border-amber-400/40 p-3 clip-chamfer shadow-lg max-h-[500px] overflow-y-auto custom-scrollbar">
          <h3 className="font-headline text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Archive size={12} /> Slots fijos
          </h3>
          <div className="font-mono text-[9px] text-secondary/50 mb-3">
            5 espacios en celdas FUERZA1..5 de Configuracion. Guardar sobrescribe.
          </div>

          {/* Toggle Modo Campaña */}
          {onToggleCampaignMode && (
            <button
              onClick={onToggleCampaignMode}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 mb-3 clip-chamfer font-mono text-[10px] uppercase tracking-widest transition-colors border ${
                campaignMode
                  ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                  : 'bg-surface-container border-outline-variant/40 text-secondary/70 hover:border-amber-400/60 hover:text-amber-400'
              }`}
              title={campaignMode ? 'Modo campaña activo — pulsa para salir' : 'Activar modo campaña (carga FUERZA5 + lock)'}
            >
              {campaignMode ? <Lock size={12} /> : <LockOpen size={12} />}
              {campaignMode ? 'Modo Campaña ON' : 'Modo Campaña'}
            </button>
          )}

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
    </div>
  );
}

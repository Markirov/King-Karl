import { useState, useMemo, useCallback } from 'react';
import { Loader2, Map, List, Plus, X } from 'lucide-react';
import { useStarSystems } from './hooks/useStarSystems';
import { useCampaignYear } from './hooks/useCampaignYear';
import { useJumpRoute } from './hooks/useJumpRoute';
import { SystemAutocomplete } from './components/SystemAutocomplete';
import { RouteSummary } from './components/RouteSummary';
import { JumpListTable } from './components/JumpListTable';
import { StarMap } from './components/StarMap';
import type { StarSystem, RouteWaypoint, CalculatorOptions } from './types';
import { IN_SYSTEM_DAYS_DESTINATION } from './constants';

type ViewMode = 'list' | 'map';

// Estado interno de un waypoint en el formulario
interface WaypointEntry {
  id: number;
  system: StarSystem | null;
  planetVisit: boolean;
  visitReason: string;
}

let nextId = 3; // origen=0, destino=1, escalas intermedias desde 2

export function JumpCalculator() {
  const { db, graph, loading, error } = useStarSystems();
  const campaignYear = useCampaignYear();

  // Origen y destino siempre presentes; escalas intermedias opcionales
  const [origin, setOrigin]           = useState<StarSystem | null>(null);
  const [destination, setDestination] = useState<StarSystem | null>(null);
  const [intermediates, setIntermediates] = useState<WaypointEntry[]>([]);

  const [customYear, setCustomYear]   = useState<number | null>(null);
  const [minimize, setMinimize]       = useState<'jumps' | 'distance'>('jumps');
  const [view, setView]               = useState<ViewMode>('list');
  const [showResult, setShowResult]   = useState(false);
  const [calculating, setCalculating] = useState(false);

  const effectiveYear = customYear ?? campaignYear;

  const options: CalculatorOptions = useMemo(() => ({
    year: effectiveYear,
    minimize,
    inSystemDaysAtDestination: IN_SYSTEM_DAYS_DESTINATION,
  }), [effectiveYear, minimize]);

  // Construir array de RouteWaypoint para el hook
  const routeWaypoints: RouteWaypoint[] = useMemo(() => {
    if (!origin || !destination) return [];
    const waypoints: RouteWaypoint[] = [
      { system: origin, planetVisit: false },
      ...intermediates.map(e => ({
        system: e.system!,
        planetVisit: e.planetVisit,
        visitReason: e.visitReason || undefined,
      })).filter(w => w.system !== null),
      { system: destination, planetVisit: false },
    ];
    return waypoints.length >= 2 ? waypoints : [];
  }, [origin, destination, intermediates]);

  const route = useJumpRoute(
    showResult ? graph : null,
    showResult ? db : null,
    routeWaypoints,
    options,
  );

  function resetResult() { setShowResult(false); }

  function handleCalculate() {
    if (!origin || !destination) return;
    setCalculating(true);
    setTimeout(() => {
      setShowResult(true);
      setCalculating(false);
    }, 50);
  }

  function handleReset() {
    setShowResult(false);
    setOrigin(null);
    setDestination(null);
    setIntermediates([]);
  }

  function addIntermediate() {
    setIntermediates(prev => [...prev, { id: nextId++, system: null, planetVisit: false, visitReason: '' }]);
    resetResult();
  }

  function removeIntermediate(id: number) {
    setIntermediates(prev => prev.filter(e => e.id !== id));
    resetResult();
  }

  function updateIntermediate(id: number, patch: Partial<WaypointEntry>) {
    setIntermediates(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    resetResult();
  }

  // ── Loading / error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 h-64 text-outline font-mono text-sm">
        <Loader2 size={18} className="animate-spin text-primary-container/60" />
        Cargando base de datos estelar…
      </div>
    );
  }

  if (error || !db) {
    return (
      <div className="flex items-center justify-center h-64 text-on-tertiary-container font-mono text-sm">
        Error al cargar los datos: {error ?? 'db nulo'}
      </div>
    );
  }

  // ── UI ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Inputs */}
      <div className="border border-outline-variant/30 bg-surface-container-low p-4 space-y-4">

        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-base font-black text-primary-container uppercase tracking-tight">
            Calculadora de Saltos Hiperespaciales
          </h2>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-outline">AÑO:</span>
            <span className={customYear !== null ? 'text-primary-container' : 'text-primary-container/70'}>
              {effectiveYear}
            </span>
            {customYear === null && (
              <span className="text-outline/40">CAMPAÑA</span>
            )}
          </div>
        </div>

        {/* Origen */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SystemAutocomplete
            label="Origen"
            systems={db.systems}
            value={origin}
            onChange={sys => { setOrigin(sys); resetResult(); }}
            placeholder="Sistema de partida…"
          />
        </div>

        {/* Escalas intermedias */}
        {intermediates.map((entry, idx) => (
          <div key={entry.id} className="border border-outline-variant/20 bg-surface-container/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-outline flex-shrink-0">
                Escala {idx + 1}
              </span>
              <div className="flex-1">
                <SystemAutocomplete
                  label=""
                  systems={db.systems}
                  value={entry.system}
                  onChange={sys => updateIntermediate(entry.id, { system: sys })}
                  placeholder="Sistema intermedio…"
                />
              </div>
              <button
                onClick={() => removeIntermediate(entry.id)}
                className="flex-shrink-0 p-1 text-outline/50 hover:text-on-surface-variant transition-colors"
                title="Eliminar escala"
              >
                <X size={14} />
              </button>
            </div>

            {/* Toggle visita al planeta */}
            <div className="flex items-center gap-3 pl-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <button
                  type="button"
                  onClick={() => updateIntermediate(entry.id, { planetVisit: !entry.planetVisit })}
                  className={`w-4 h-4 border flex items-center justify-center transition-all flex-shrink-0 ${
                    entry.planetVisit
                      ? 'bg-primary-container/30 border-primary-container text-primary-container'
                      : 'border-outline-variant/40 text-transparent hover:border-outline-variant/70'
                  }`}
                >
                  {entry.planetVisit && <span className="text-[10px] leading-none">✓</span>}
                </button>
                <span className="font-mono text-[10px] text-outline group-hover:text-on-surface-variant transition-colors select-none">
                  Visitar planeta
                </span>
                {entry.planetVisit && (
                  <span className="font-mono text-[9px] text-primary-container/60">+14 días</span>
                )}
              </label>

              {entry.planetVisit && (
                <input
                  type="text"
                  value={entry.visitReason}
                  placeholder="Motivo (opcional)…"
                  onChange={e => updateIntermediate(entry.id, { visitReason: e.target.value })}
                  className="flex-1 bg-surface-container border border-outline-variant/30 text-on-surface font-mono text-xs px-2 py-1 focus:outline-none focus:border-primary-container/50 placeholder:text-outline/30"
                />
              )}
            </div>
          </div>
        ))}

        {/* Botón añadir escala */}
        <button
          onClick={addIntermediate}
          className="flex items-center gap-1.5 font-mono text-[10px] text-outline/60 hover:text-on-surface-variant border border-dashed border-outline-variant/25 hover:border-outline-variant/50 px-3 py-1.5 transition-all"
        >
          <Plus size={11} /> Añadir escala intermedia
        </button>

        {/* Destino */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SystemAutocomplete
            label="Destino"
            systems={db.systems}
            value={destination}
            onChange={sys => { setDestination(sys); resetResult(); }}
            placeholder="Sistema de llegada…"
          />
        </div>

        {/* Opciones */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-outline-variant/15">
          {/* Override año */}
          <div className="flex items-center gap-2">
            <label className="font-mono text-[9px] uppercase tracking-widest text-outline">
              Override año:
            </label>
            <input
              type="number"
              value={customYear ?? ''}
              placeholder={String(campaignYear)}
              min={2250}
              max={3150}
              onChange={e => {
                const v = parseInt(e.target.value);
                setCustomYear(isNaN(v) ? null : v);
                resetResult();
              }}
              className="w-20 bg-surface-container border border-outline-variant/40 text-on-surface font-mono text-xs px-2 py-1 focus:outline-none focus:border-primary-container/60"
            />
            {customYear !== null && (
              <button
                onClick={() => { setCustomYear(null); resetResult(); }}
                className="font-mono text-[9px] text-outline hover:text-on-surface-variant transition-colors"
              >
                ✕ reset
              </button>
            )}
          </div>

          {/* Minimizar */}
          <div className="flex items-center gap-2">
            <label className="font-mono text-[9px] uppercase tracking-widest text-outline">
              Optimizar:
            </label>
            {(['jumps', 'distance'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setMinimize(mode); resetResult(); }}
                className={`px-2 py-1 font-mono text-[10px] border transition-all ${
                  minimize === mode
                    ? 'bg-primary-container/20 border-primary-container text-primary-container'
                    : 'border-outline-variant/30 text-outline hover:border-outline-variant/60'
                }`}
              >
                {mode === 'jumps' ? 'Mín. saltos' : 'Mín. distancia'}
              </button>
            ))}
          </div>
        </div>

        {/* Botones acción */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={!origin || !destination || calculating}
            className="px-6 py-2 bg-primary-container/15 border border-primary-container/60 text-primary-container font-mono text-xs uppercase tracking-widest hover:bg-primary-container/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {calculating && <Loader2 size={12} className="animate-spin" />}
            Calcular Ruta
          </button>
          {showResult && (
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-outline-variant/30 text-outline font-mono text-xs hover:border-outline-variant/60 hover:text-on-surface-variant transition-all"
            >
              Nueva búsqueda
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      {showResult && (
        route === null ? (
          <div className="border border-tertiary-container/40 bg-error-container/10 p-4 font-mono text-sm text-on-tertiary-container/80">
            No se encontró ruta entre los sistemas seleccionados.
            Puede que estén en regiones desconectadas del mapa (año {effectiveYear}).
          </div>
        ) : (
          <div className="space-y-4">
            <RouteSummary route={route} />

            {/* Toggle lista/mapa */}
            <div className="flex items-center gap-2">
              {(['list', 'map'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] border transition-all ${
                    view === v
                      ? 'bg-primary-container/20 border-primary-container text-primary-container'
                      : 'border-outline-variant/30 text-outline hover:border-outline-variant/60'
                  }`}
                >
                  {v === 'list' ? <><List size={12} /> Lista</> : <><Map size={12} /> Mapa</>}
                </button>
              ))}
            </div>

            {view === 'list' && <JumpListTable steps={route.steps} db={db} />}
            {view === 'map'  && <StarMap db={db} route={route} year={effectiveYear} />}
          </div>
        )
      )}
    </div>
  );
}

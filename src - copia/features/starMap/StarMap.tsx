import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import type { JumpRoute, SystemsDatabase } from '@/features/jumpCalculator/types';
import { useStarSystems } from '@/features/jumpCalculator/hooks/useStarSystems';
import { useTerritories } from './hooks/useTerritories';
import { usePanZoom } from './hooks/usePanZoom';
import { TerritoryLayer } from './components/TerritoryLayer';
import { SystemsLayer } from './components/SystemsLayer';
import { RouteOverlay } from './components/RouteOverlay';
import { YearSlider } from './components/YearSlider';
import { FactionLegend } from './components/FactionLegend';
import { SystemTooltip } from './components/SystemTooltip';
import type { Transform } from './hooks/usePanZoom';
import type { StarSystem } from '@/features/jumpCalculator/types';

// Stub para estado pre-carga (db vacío para que los hooks siempre reciban objetos válidos)
const EMPTY_DB: SystemsDatabase = {
  meta: { version: '', generated: '', sucsVersion: '', systemCount: 0, yearColumns: [] },
  availableYears: [],
  systems: [],
  nebulae: [],
  factions: {},
};

interface StarMapProps {
  /** Jump route to overlay (optional) */
  route?: JumpRoute;
  /** Override the displayed year from outside (e.g. from JumpCalculator) */
  externalYear?: number;
  /** Called when user changes the year via the slider */
  onYearChange?: (year: number) => void;
  /** Initial year to show when no externalYear is provided */
  defaultYear?: number;
  /** Pan/zoom to this system when it changes */
  focusSystem?: StarSystem | null;
  className?: string;
}

export function StarMap({
  route,
  externalYear,
  onYearChange,
  defaultYear = 3025,
  focusSystem,
  className,
}: StarMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });

  // Year state — controlled externally when externalYear is provided
  const [internalYear, setInternalYear] = useState(defaultYear);
  const year = externalYear ?? internalYear;

  const [hoveredSystem, setHoveredSystem] = useState<StarSystem | null>(null);
  const [legendVisible, setLegendVisible] = useState(true);

  // Track container dimensions for initial fit — only update when values change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize(prev =>
          prev.w === Math.round(width) && prev.h === Math.round(height)
            ? prev
            : { w: Math.round(width), h: Math.round(height) }
        );
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initial transform: center Terra (0,0), fit 1500×1500 LY map
  const initialTransform = useMemo((): Transform => {
    const { w, h } = size;
    const scale = Math.min(w, h) / 1500 * 0.88;
    return { x: w / 2, y: h / 2, scale };
  }, [size]);

  const [tf, handlers, setTf] = usePanZoom({
    initialTransform,
    minScale: 0.04,
    maxScale: 30,
  });

  const resetView = useCallback(() => setTf(initialTransform), [setTf, initialTransform]);

  // Navigate to a specific system — only fires when focusSystem.id changes
  const prevFocusId = useRef<number | null>(null);
  useEffect(() => {
    if (!focusSystem || focusSystem.id === prevFocusId.current) return;
    prevFocusId.current = focusSystem.id;
    const zoom = Math.max(tf.scale, 4);
    // SVG coords: (sys.x, -sys.y); to center at screen (W/2, H/2):
    //   tf.x = W/2 - sys.x * zoom
    //   tf.y = H/2 - (-sys.y) * zoom = H/2 + sys.y * zoom
    setTf({
      x: size.w / 2 - focusSystem.x * zoom,
      y: size.h / 2 + focusSystem.y * zoom,
      scale: zoom,
    });
  }, [focusSystem, size, setTf, tf.scale]);

  const handleYearChange = useCallback((y: number) => {
    setInternalYear(y);
    onYearChange?.(y);
  }, [onYearChange]);

  // Data
  const { db, loading, error } = useStarSystems();
  const activeDb = db ?? EMPTY_DB;

  const territories = useTerritories(activeDb.systems, activeDb, year);

  // Collect route system ids for SystemsLayer highlighting
  const routeSystemIds = useMemo(() => {
    if (!route) return undefined;
    const ids = new Set<number>();
    for (const step of route.steps) {
      ids.add(step.fromSystem.id);
      ids.add(step.toSystem.id);
    }
    return ids;
  }, [route]);

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-[#05080d] overflow-hidden ${className ?? ''}`}>

      {/* Loading / error states */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#05080d]">
          <span className="font-mono text-[11px] text-outline/60 animate-pulse uppercase tracking-widest">
            Cargando base de datos estelar…
          </span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#05080d]">
          <span className="font-mono text-[11px] text-red-500/70">
            Error: {error}
          </span>
        </div>
      )}

      {/* SVG map — always mounted so ResizeObserver fires */}
      <svg
        className="w-full h-full"
        style={{ cursor: 'crosshair', display: 'block' }}
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
      >
        {/* Subtle grid / axis cross at Terra (0,0) */}
        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.scale})`}>
          {/* Terra cross */}
          <line x1={-8} y1={0} x2={8} y2={0} stroke="#ffffff" strokeWidth={0.3 / tf.scale} opacity={0.15} />
          <line x1={0} y1={-8} x2={0} y2={8} stroke="#ffffff" strokeWidth={0.3 / tf.scale} opacity={0.15} />

          <TerritoryLayer territories={territories} />

          {db && (
            <SystemsLayer
              systems={db.systems}
              year={year}
              db={db}
              scale={tf.scale}
              routeSystemIds={routeSystemIds}
              onHover={setHoveredSystem}
            />
          )}

          {route && route.steps.length > 0 && (
            <RouteOverlay steps={route.steps} scale={tf.scale} />
          )}
        </g>
      </svg>

      {/* ── Overlays ─────────────────────────────────────────── */}

      {/* Faction legend */}
      {db && (
        <FactionLegend
          territories={territories}
          db={db}
          visible={legendVisible}
          onToggle={() => setLegendVisible(v => !v)}
        />
      )}

      {/* Hovered system tooltip */}
      {hoveredSystem && db && (
        <SystemTooltip system={hoveredSystem} year={year} db={db} />
      )}

      {/* Year slider */}
      <YearSlider year={year} onChange={handleYearChange} />

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button
          onClick={resetView}
          className="font-mono text-[9px] border border-outline-variant/30 text-outline/60 hover:text-on-surface-variant hover:border-outline-variant/60 px-2.5 py-1 bg-[#0a0d12]/80 transition-colors backdrop-blur-sm"
          title="Encuadrar mapa completo"
        >
          FIT
        </button>
      </div>

      {/* Scale readout */}
      <div className="absolute bottom-14 right-3 font-mono text-[8px] text-outline-variant/40 select-none pointer-events-none">
        {Math.round(tf.scale * 100)}% · rueda=zoom · arrastrar=mover
      </div>
    </div>
  );
}

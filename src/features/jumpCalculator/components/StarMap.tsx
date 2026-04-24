import { useRef, useState, useCallback, useMemo } from 'react';
import type { StarSystem, JumpRoute, SystemsDatabase } from '../types';
import { getFactionColor, getFactionAt } from '../lib/factions';

interface Props {
  db: SystemsDatabase;
  route: JumpRoute;
  year: number;
}

interface Transform { x: number; y: number; scale: number; }

// Calcula bounds de los sistemas en ruta + vecindario cercano
function getViewBounds(systems: StarSystem[], padding = 40) {
  if (systems.length === 0) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
  const xs = systems.map(s => s.x);
  const ys = systems.map(s => s.y);
  return {
    minX: Math.min(...xs) - padding,
    maxX: Math.max(...xs) + padding,
    minY: Math.min(...ys) - padding,
    maxY: Math.max(...ys) + padding,
  };
}

export function StarMap({ db, route, year }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Todos los sistemas en la ruta
  const routeSystemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const step of route.steps) {
      ids.add(step.fromSystem.id);
      ids.add(step.toSystem.id);
    }
    return ids;
  }, [route]);

  // Sistemas a mostrar: ruta + sistemas cercanos al bbox de la ruta
  const bounds = useMemo(() => {
    const routeSystems = route.steps.flatMap(s => [s.fromSystem, s.toSystem]);
    return getViewBounds(routeSystems, 25);
  }, [route]);

  const visibleSystems = useMemo(() => {
    return db.systems.filter(s =>
      s.x >= bounds.minX && s.x <= bounds.maxX &&
      s.y >= bounds.minY && s.y <= bounds.maxY
    );
  }, [db.systems, bounds]);

  // Proyección mundo→SVG
  const SVG_W = 800;
  const SVG_H = 500;
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  const scaleX = SVG_W / worldW;
  const scaleY = SVG_H / worldH;
  const mapScale = Math.min(scaleX, scaleY) * 0.9;
  const offsetX = (SVG_W - worldW * mapScale) / 2 - bounds.minX * mapScale;
  const offsetY = (SVG_H - worldH * mapScale) / 2 - bounds.minY * mapScale;

  function toSvg(x: number, y: number) {
    // BT: Y positivo = norte en el mapa
    return {
      sx: x * mapScale + offsetX,
      sy: SVG_H - (y * mapScale + offsetY),
    };
  }

  // Pan & zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setTf(prev => {
      const newScale = Math.min(10, Math.max(0.3, prev.scale * factor));
      const rect = containerRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const dx = cx - prev.x;
      const dy = cy - prev.y;
      return {
        scale: newScale,
        x: prev.x + dx - dx * (newScale / prev.scale),
        y: prev.y + dy - dy * (newScale / prev.scale),
      };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTf(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);
  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  const hoveredSystem = hoveredId ? db.systems.find(s => s.id === hoveredId) : null;

  return (
    <div className="relative border border-outline-variant/30 bg-[#05080d]">
      {/* Reset button */}
      <button
        onClick={() => setTf({ x: 0, y: 0, scale: 1 })}
        className="absolute top-2 right-2 z-10 px-2 py-1 font-mono text-[9px] border border-outline-variant/30 text-outline hover:border-outline-variant/60 hover:text-on-surface-variant transition-all bg-surface-container/80"
      >
        1:1
      </button>

      <div
        ref={containerRef}
        style={{ cursor: dragging.current ? 'grabbing' : 'grab', height: 400 }}
        className="overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: '100%',
            height: '100%',
            transformOrigin: '0 0',
            transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
            userSelect: 'none',
          }}
        >
          {/* Background systems */}
          {visibleSystems.map(sys => {
            const { sx, sy } = toSvg(sys.x, sys.y);
            const isOnRoute = routeSystemIds.has(sys.id);
            const factionColor = getFactionColor(
              getFactionAt(sys, year, db.meta?.yearColumns ?? []),
              db.factions,
            );
            return (
              <g key={sys.id}>
                <circle
                  cx={sx} cy={sy}
                  r={isOnRoute ? 0 : 1.8}
                  fill={factionColor}
                  opacity={0.35}
                />
              </g>
            );
          })}

          {/* Route lines */}
          {route.steps.map((step, i) => {
            const from = toSvg(step.fromSystem.x, step.fromSystem.y);
            const to = toSvg(step.toSystem.x, step.toSystem.y);
            return (
              <line
                key={i}
                x1={from.sx} y1={from.sy}
                x2={to.sx} y2={to.sy}
                stroke="#ffae00"
                strokeWidth={1.5}
                strokeOpacity={0.7}
                strokeDasharray="4 2"
              />
            );
          })}

          {/* Route waypoints */}
          {route.steps.map((step, i) => {
            const isLast = i === route.steps.length - 1;
            const systems = i === 0
              ? [step.fromSystem, step.toSystem]
              : [step.toSystem];

            return systems.map(sys => {
              const { sx, sy } = toSvg(sys.x, sys.y);
              const isOrigin = sys.id === route.waypoints[0].id;
              const isDest = sys.id === route.waypoints[route.waypoints.length - 1].id;
              const color = isOrigin ? '#4ade80' : isDest ? '#f87171' : '#ffae00';
              return (
                <g
                  key={sys.id}
                  onMouseEnter={() => setHoveredId(sys.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={sx} cy={sy} r={5} fill={color} opacity={0.2} />
                  <circle cx={sx} cy={sy} r={2.5} fill={color} />
                  <text
                    x={sx + 5} y={sy - 4}
                    fontSize={7}
                    fill={color}
                    opacity={0.9}
                    fontFamily="'Share Tech Mono', monospace"
                  >
                    {sys.name}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredSystem && (
        <div className="absolute bottom-2 left-2 bg-surface-container-highest/90 border border-outline-variant/40 px-3 py-2 pointer-events-none">
          <div className="font-mono text-[11px] text-primary-container">{hoveredSystem.name}</div>
          <div className="font-mono text-[9px] text-outline mt-0.5">
            [{hoveredSystem.x.toFixed(1)}, {hoveredSystem.y.toFixed(1)}] · {hoveredSystem.spectralType ?? '?'}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-2 left-2 flex items-center gap-3 pointer-events-none">
        <LegendDot color="#4ade80" label="Origen" />
        <LegendDot color="#f87171" label="Destino" />
        <LegendDot color="#ffae00" label="Escala" />
      </div>

      <div className="absolute bottom-2 right-2 font-mono text-[9px] text-outline-variant/50 pointer-events-none select-none">
        {Math.round(tf.scale * 100)}% · rueda=zoom · arrastrar=mover
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-mono text-[9px] text-outline/70">{label}</span>
    </div>
  );
}

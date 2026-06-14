import type { StarSystem, SystemsDatabase } from '@/features/jumpCalculator/types';
import { getFactionAt } from '@/features/jumpCalculator/lib/factions';
import { FACTION_COLORS } from '../constants';

interface Props {
  systems: StarSystem[];
  year: number;
  db: SystemsDatabase;
  scale: number;
  routeSystemIds?: Set<number>;
  onHover: (s: StarSystem | null) => void;
}

// Don't render dots below this zoom — they'd be invisible anyway
const MIN_SCALE = 0.07;

export function SystemsLayer({ systems, year, db, scale, routeSystemIds, onHover }: Props) {
  if (scale < MIN_SCALE) return null;

  const yearColumns = db.meta?.yearColumns ?? [];
  const dotR     = Math.max(0.4, 2.0 / scale);
  const hitR     = Math.max(dotR, 7 / scale);
  const strokeW  = Math.max(0.2, 0.8 / scale);
  const showLabels = scale >= 0.6;
  const labelSize  = Math.max(3, 7 / scale);

  return (
    <g>
      {systems.map(s => {
        const faction  = getFactionAt(s, year, yearColumns) ?? 'U';
        const color    =
          db.factions[faction]?.color ??
          FACTION_COLORS[faction] ??
          '#555555';
        const onRoute  = routeSystemIds?.has(s.id) ?? false;
        const cx = s.x;
        const cy = -s.y;  // BT y-up → SVG y-down

        return (
          <g
            key={s.id}
            onMouseEnter={() => onHover(s)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'crosshair' }}
          >
            {/* Transparent hit area */}
            <circle cx={cx} cy={cy} r={hitR} fill="transparent" />

            {/* System dot */}
            <circle
              cx={cx} cy={cy}
              r={onRoute ? dotR * 1.8 : dotR}
              fill={onRoute ? '#ffae00' : color}
              opacity={onRoute ? 1.0 : 0.65}
            />

            {/* Route system ring */}
            {onRoute && (
              <circle
                cx={cx} cy={cy}
                r={dotR * 3.5}
                fill="none"
                stroke="#ffae00"
                strokeWidth={strokeW}
                opacity={0.6}
              />
            )}

            {/* Label (only at sufficient zoom or for route systems) */}
            {(showLabels || onRoute) && (
              <text
                x={cx + dotR * 2}
                y={cy - dotR}
                fontSize={onRoute ? labelSize * 1.2 : labelSize}
                fill={onRoute ? '#ffae00' : '#c0c8d8'}
                opacity={onRoute ? 0.95 : 0.5}
                fontFamily="'Share Tech Mono', monospace"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {s.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

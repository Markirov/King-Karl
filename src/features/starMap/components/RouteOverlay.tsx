import type { JumpStep } from '@/features/jumpCalculator/types';

interface Props {
  steps: JumpStep[];
  scale: number;
}

export function RouteOverlay({ steps, scale }: Props) {
  if (steps.length === 0) return null;

  const strokeW  = Math.max(0.3, 1.8 / scale);
  const dotR     = Math.max(0.6, 3.5 / scale);
  const dashLen  = 5 / scale;
  const gapLen   = 2.5 / scale;
  const labelSz  = Math.max(4, 8 / scale);

  // Collect unique waypoint systems in order
  const waypointSystems = (() => {
    const seen = new Set<number>();
    const result: typeof steps[0]['fromSystem'][] = [];
    for (const step of steps) {
      if (!seen.has(step.fromSystem.id)) {
        seen.add(step.fromSystem.id);
        result.push(step.fromSystem);
      }
    }
    const last = steps[steps.length - 1].toSystem;
    if (!seen.has(last.id)) result.push(last);
    return result;
  })();

  const n = waypointSystems.length;

  return (
    <g>
      {/* Jump lines */}
      {steps.map((step, i) => (
        <line
          key={`jump-${i}`}
          x1={step.fromSystem.x} y1={-step.fromSystem.y}
          x2={step.toSystem.x}   y2={-step.toSystem.y}
          stroke="#ffae00"
          strokeWidth={strokeW}
          strokeOpacity={0.65}
          strokeDasharray={`${dashLen} ${gapLen}`}
        />
      ))}

      {/* Waypoint markers */}
      {waypointSystems.map((sys, i) => {
        const isOrigin = i === 0;
        const isDest   = i === n - 1;
        const color    = isOrigin ? '#4ade80' : isDest ? '#f87171' : '#ffae00';
        const cx = sys.x;
        const cy = -sys.y;

        // Find step index for cumulative days
        const step = steps.find(s => s.toSystem.id === sys.id);
        const days = step?.cumulativeDays;

        return (
          <g key={sys.id}>
            {/* Outer glow */}
            <circle cx={cx} cy={cy} r={dotR * 2.5} fill={color} opacity={0.12} />
            {/* Core dot */}
            <circle cx={cx} cy={cy} r={dotR} fill={color} opacity={0.95} />
            {/* Ring */}
            <circle
              cx={cx} cy={cy}
              r={dotR * 1.8}
              fill="none"
              stroke={color}
              strokeWidth={strokeW * 0.8}
              opacity={0.5}
            />

            {/* System name */}
            <text
              x={cx + dotR * 2.2}
              y={cy - dotR * 0.5}
              fontSize={labelSz}
              fill={color}
              opacity={0.95}
              fontFamily="'Share Tech Mono', monospace"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {sys.name}
            </text>

            {/* Cumulative days badge */}
            {days != null && !isOrigin && (
              <text
                x={cx + dotR * 2.2}
                y={cy + labelSz * 1.1}
                fontSize={labelSz * 0.8}
                fill={color}
                opacity={0.55}
                fontFamily="'Share Tech Mono', monospace"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                +{days}d
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

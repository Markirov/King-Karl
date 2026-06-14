import { useMemo } from 'react';
import type { JumpRoute, JumpStep, CalculatorOptions, RouteWaypoint, SystemsDatabase } from '../types';
import type { SystemGraph } from '../lib/graph';
import { findShortestRoute } from '../lib/dijkstra';
import { distance } from '../lib/distance';
import { getFactionAt, getFactionColor, getFactionName } from '../lib/factions';
import { calculateRouteTime, cumulativeDaysAt } from '../lib/time';
import { calculateCost } from '../lib/cost';
import { RECHARGE_DAYS_STANDARD, PLANET_VISIT_DAYS } from '../constants';

export function useJumpRoute(
  graph: SystemGraph | null,
  db: SystemsDatabase | null,
  waypoints: RouteWaypoint[],
  options: CalculatorOptions,
): JumpRoute | null {
  return useMemo(() => {
    if (!graph || !db) return null;

    const validWaypoints = waypoints.filter(w => w.system !== null);
    if (validWaypoints.length < 2) return null;

    const allSteps: JumpStep[] = [];
    let totalDistance = 0;
    const warnings: string[] = [];
    const factionCounts: Record<string, number> = {};

    for (let i = 0; i < validWaypoints.length - 1; i++) {
      const fromWp = validWaypoints[i];
      const toWp   = validWaypoints[i + 1];

      const path = findShortestRoute(graph, String(fromWp.system.id), String(toWp.system.id), options.minimize);
      if (!path) {
        warnings.push(`Sin ruta disponible: ${fromWp.system.name} → ${toWp.system.name}`);
        return null;
      }

      const isFinalSegment = i === validWaypoints.length - 2;

      for (let j = 0; j < path.length - 1; j++) {
        const fromSys = graph.nodes.get(path[j])!;
        const toSys   = graph.nodes.get(path[j + 1])!;
        const dist    = distance(fromSys, toSys);
        const faction = getFactionAt(toSys, options.year, db.meta?.yearColumns ?? []);
        const factionColor = getFactionColor(faction, db.factions);

        // Este step llega al waypoint de destino del segmento
        const isSegmentEnd = j === path.length - 2;
        // Visita al planeta: solo si es el final del segmento, toWp tiene
        // planetVisit=true, y NO es el destino final (ese tiene su propio cómputo)
        const planetVisit = isSegmentEnd && toWp.planetVisit && !isFinalSegment;

        const isLastStep = isFinalSegment && isSegmentEnd;
        const rechargeDays = isLastStep ? 0 : RECHARGE_DAYS_STANDARD;

        totalDistance += dist;
        if (faction) factionCounts[faction] = (factionCounts[faction] ?? 0) + 1;

        allSteps.push({
          fromSystem: fromSys,
          toSystem:   toSys,
          distance:   dist,
          rechargeDays,
          factionAtArrival: faction,
          factionColor,
          planetVisit,
          visitReason:      planetVisit ? toWp.visitReason : undefined,
          planetVisitDays:  planetVisit ? PLANET_VISIT_DAYS : 0,
          cumulativeDays:   0, // se rellena abajo, una vez tenemos todos los steps
        });
      }
    }

    if (allSteps.length === 0) return null;

    // Calcular tiempo (necesita el array completo de steps)
    const { totalDays, rechargeDays, planetVisitDays, destinationDays } =
      calculateRouteTime(allSteps, options);

    // Rellenar cumulativeDays ahora que conocemos destinationDays
    for (let i = 0; i < allSteps.length; i++) {
      allSteps[i].cumulativeDays = cumulativeDaysAt(i, allSteps, destinationDays);
    }

    const estimatedCost = calculateCost(allSteps.length, totalDays);

    // Warnings de facciones frecuentes
    const topFactions = Object.entries(factionCounts)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1]);

    for (const [faction, count] of topFactions.slice(0, 3)) {
      const name = getFactionName(faction, db.factions);
      warnings.push(`Pasa por ${count} sistemas de ${name}`);
    }

    return {
      waypoints:       validWaypoints.map(w => w.system),
      steps:           allSteps,
      totalDistance,
      totalJumps:      allSteps.length,
      totalDays,
      rechargeDays,
      planetVisitDays,
      destinationDays,
      estimatedCost,
      warnings,
    };
  }, [graph, db, waypoints, options]);
}

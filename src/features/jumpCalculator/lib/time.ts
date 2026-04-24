import type { JumpStep, CalculatorOptions } from '../types';
import { RECHARGE_DAYS_STANDARD } from '../constants';

/**
 * Calcula el tiempo total de una ruta.
 *
 * Regla canónica BattleTech:
 * - El JumpShip salta al punto zenith/nadir y RECARGA el KF drive (7 días).
 *   El DropShip permanece acoplado. No hay tránsito al planeta.
 * - El tránsito al planeta solo ocurre en el destino final
 *   (y en escalas con visita explícita al planeta).
 *
 * totalDays = rechargeDays + planetVisitDays + destinationDays
 */
export function calculateRouteTime(
  steps: JumpStep[],
  options: CalculatorOptions,
): { totalDays: number; rechargeDays: number; planetVisitDays: number; destinationDays: number } {
  const jumpCount = steps.length;

  // Recarga: todos los saltos excepto el último
  const rechargeDays = Math.max(0, jumpCount - 1) * RECHARGE_DAYS_STANDARD;

  // Visitas al planeta en escalas intermedias
  const planetVisitDays = steps.reduce((sum, s) => sum + s.planetVisitDays, 0);

  // Destino final
  const destinationDays = options.inSystemDaysAtDestination;

  return {
    totalDays: rechargeDays + planetVisitDays + destinationDays,
    rechargeDays,
    planetVisitDays,
    destinationDays,
  };
}

/**
 * Calcula los días acumulados hasta el step i (inclusive).
 *
 * Para cada step j ≤ i:
 *   +7  si j < totalSteps-1   (recarga KF)
 *   +14 si steps[j].planetVisit  (visita al planeta en escala intermedia)
 *   +14 si j === totalSteps-1    (destino final)
 */
export function cumulativeDaysAt(
  stepIndex: number,
  steps: JumpStep[],
  destinationDays: number,
): number {
  const n = steps.length;
  let days = 0;
  for (let j = 0; j <= stepIndex; j++) {
    if (j < n - 1) days += RECHARGE_DAYS_STANDARD;
    if (steps[j].planetVisit) days += steps[j].planetVisitDays;
    if (j === n - 1) days += destinationDays;
  }
  return days;
}

// src/features/jumpCalculator/constants.ts

export const JUMP_RANGE_LY = 30;
export const RECHARGE_DAYS_STANDARD = 7;   // Recarga KF drive en punto zenith/nadir

// Tránsito punto-de-salto ↔ planeta. Solo ocurre en el destino final
// (y en escalas con visita explícita al planeta).
export const IN_SYSTEM_DAYS_DESTINATION = 14;  // Tránsito + ops en destino final
export const PLANET_VISIT_DAYS = 14;           // Visita al planeta en escala intermedia

// C-bills por salto (Leopard DropShip, lance pequeño)
export const COST_PER_JUMP_LEOPARD = 50_000;
export const COST_PER_DAY_OPERATIONS = 5_000;

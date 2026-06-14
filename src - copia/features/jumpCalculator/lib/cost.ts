import { COST_PER_JUMP_LEOPARD, COST_PER_DAY_OPERATIONS } from '../constants';

export function calculateCost(jumpCount: number, totalDays: number): number {
  return jumpCount * COST_PER_JUMP_LEOPARD + totalDays * COST_PER_DAY_OPERATIONS;
}

export function formatCBills(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M C-bills`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K C-bills`;
  return `${amount} C-bills`;
}

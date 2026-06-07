// ═══════════════════════════════════════════════════════════════
//  TELEGRAM SERVICE — Cliente wrapper para notificaciones salientes
//
//  Llama a Apps Script con action:'tgSend'. Drop silencioso si falla.
//  El backend valida TELEGRAM_ENABLED + token + chat_id.
//
//  Eventos soportados (ver TELEGRAM_SPEC.md):
//   - mision_cerrada
//   - libro_mayor_relevante  (umbral >10k₡ aplicado en cliente)
//   - tesoreria_grande       (umbral >100k₡ aplicado en cliente)
//   - cronica_nueva
//   - parte_nuevo
// ═══════════════════════════════════════════════════════════════

import { sheetsPost } from './sheets-service';

export type TelegramEvent =
  | 'mision_cerrada'
  | 'libro_mayor_relevante'
  | 'tesoreria_grande'
  | 'cronica_nueva'
  | 'parte_nuevo';

export interface TelegramSendResult {
  success: boolean;
  error?: string;
}

/**
 * Envía notificación a Telegram. Drop silencioso si falla.
 * Llamar SIEMPRE awaited (es async) pero NUNCA bloquear UX por respuesta.
 */
export async function sendTelegramNotif(
  event: TelegramEvent,
  data: Record<string, any>,
): Promise<TelegramSendResult> {
  try {
    const res = await sheetsPost({
      action: 'tgSend',
      event,
      data: JSON.stringify(data),
    });
    if (res?.success) return { success: true };
    return { success: false, error: String((res as any)?.error || 'unknown') };
  } catch (e) {
    console.warn('[telegram] send failed (silent drop):', event, e);
    return { success: false, error: String(e) };
  }
}

// ── Toggle persistence ───────────────────────────────────────────

const TG_TOGGLE_PREFIX = 'kk_tg_toggle_';

/** Devuelve último valor del toggle UI para este contexto. Default true. */
export function getTelegramToggle(context: string): boolean {
  try {
    const raw = localStorage.getItem(TG_TOGGLE_PREFIX + context);
    if (raw === null) return true; // default ON
    return raw === '1';
  } catch {
    return true;
  }
}

/** Persiste último valor del toggle UI. */
export function setTelegramToggle(context: string, on: boolean): void {
  try {
    localStorage.setItem(TG_TOGGLE_PREFIX + context, on ? '1' : '0');
  } catch { /* ignore */ }
}

// ── Umbral check ─────────────────────────────────────────────────

const UMBRAL_DEFAULT = 100_000;

/** Devuelve true si la cantidad supera el umbral para notif "tesoreria_grande". */
export function exceedsTesoreriaUmbral(cantidad: number, umbral = UMBRAL_DEFAULT): boolean {
  return Math.abs(cantidad) >= umbral;
}

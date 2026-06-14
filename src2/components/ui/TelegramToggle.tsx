// ═══════════════════════════════════════════════════════════════
//  TelegramToggle — Checkbox "📢 Notificar al grupo Telegram"
//
//  Reusable en: HojaServicio, TallerModal, AcquisitionModal,
//  CronicasPage, ParteDiario. Persiste valor por context en localStorage.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { getTelegramToggle, setTelegramToggle } from '@/lib/telegram-service';

interface Props {
  /** ID para persistencia (ej. 'mision_cerrada', 'taller', 'compras'). */
  context: string;
  /** Callback cuando cambia. */
  onChange?: (on: boolean) => void;
  /** Label opcional, default "📢 Notificar al grupo Telegram". */
  label?: string;
  /** Color del acento (default amber para palette civil). */
  accent?: string;
}

export function TelegramToggle({
  context,
  onChange,
  label = '📢 Notificar al grupo Telegram',
  accent = '#ffae00',
}: Props) {
  const [on, setOn] = useState(() => getTelegramToggle(context));

  useEffect(() => {
    setTelegramToggle(context, on);
    onChange?.(on);
  }, [on, context, onChange]);

  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 10px',
      background: on ? `${accent}15` : 'transparent',
      border: `1px solid ${on ? accent : '#4e453a'}`,
      cursor: 'pointer',
      fontFamily: '"Share Tech Mono", monospace', fontSize: 11,
      letterSpacing: 1,
      color: on ? accent : '#9a8f81',
      transition: 'all 0.15s ease',
    }}>
      <input
        type="checkbox"
        checked={on}
        onChange={e => setOn(e.target.checked)}
        style={{ accentColor: accent }}
      />
      {label}
    </label>
  );
}

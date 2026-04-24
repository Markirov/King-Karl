import { useState } from 'react';

interface Props {
  alive:    number;
  total:    number;
  onApply?: (directLoss: number) => void;
}

export function TrooperBar({ alive, total, onApply }: Props) {
  const [pending, setPending] = useState(0);

  const pct   = total > 0 ? alive / total : 0;
  const alive_color = pct > 0.5 ? 'bg-primary' : pct > 0.25 ? 'bg-yellow-400' : 'bg-red-500';

  const handleClick = (idx: number) => {
    if (!onApply || idx >= alive) return;
    const loss = alive - idx;
    setPending(p => p === loss ? 0 : loss);
  };

  const handleApply = () => {
    if (pending > 0 && onApply) {
      onApply(pending);
      setPending(0);
    }
  };

  const pendingStart = alive - pending;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: total }).map((_, i) => {
          const isAlive   = i < alive;
          const isPending = isAlive && i >= pendingStart;
          return (
            <div
              key={i}
              onClick={() => handleClick(i)}
              className={`w-3 h-3 border transition-colors ${
                onApply && isAlive ? 'cursor-pointer' : ''
              } ${
                isPending
                  ? 'bg-red-500 border-red-400 scale-110'
                  : isAlive
                  ? `${alive_color} border-outline-variant/40`
                  : 'bg-surface-container-low border-outline-variant/20 opacity-30'
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-secondary tracking-widest">
          {alive}/{total} TROPAS
          {pending > 0 && (
            <span className="ml-2 text-red-400">−{pending}</span>
          )}
        </span>
        {pending > 0 && (
          <button
            onClick={handleApply}
            className="font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 border border-error text-error hover:bg-error/20 transition-colors"
          >
            Aplicar
          </button>
        )}
      </div>
    </div>
  );
}

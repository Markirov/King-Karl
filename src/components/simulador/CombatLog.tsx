interface Props {
  logs: string[];
  onReset: () => void;
}

export function CombatLog({ logs, onReset }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-headline text-[9px] font-bold text-secondary/40 tracking-[2px] uppercase">Log</span>
        <button onClick={onReset} className="font-mono text-[8px] text-secondary/30 hover:text-error uppercase tracking-widest border border-outline-variant/20 hover:border-error/40 px-2 py-0.5 transition-colors">
          Reset
        </button>
      </div>
      <div className="bg-surface-container-highest p-4 font-mono text-[9px] text-secondary/30 clip-chamfer h-32 overflow-y-auto custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className={i === 0 ? 'text-secondary/60' : ''}>{log}</div>
        ))}
      </div>
    </div>
  );
}

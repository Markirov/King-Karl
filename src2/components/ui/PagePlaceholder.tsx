interface PlaceholderProps {
  icon: string;
  label: string;
  description?: string;
}

export function PagePlaceholder({ icon, label, description }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 opacity-40">
      <span className="text-5xl">{icon}</span>
      <span className="font-mono text-[12px] text-outline tracking-[2px] uppercase">
        {label}
      </span>
      <span className="font-mono text-[10px] text-outline-variant tracking-wider px-3 py-1 border border-outline-variant">
        {description || 'PENDIENTE DE MIGRACIÓN'}
      </span>
    </div>
  );
}

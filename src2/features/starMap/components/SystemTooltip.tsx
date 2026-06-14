import type { StarSystem, SystemsDatabase } from '@/features/jumpCalculator/types';
import { getFactionAt, getProvinceAt } from '@/features/jumpCalculator/lib/factions';

interface Props {
  system: StarSystem;
  year: number;
  db: SystemsDatabase;
}

export function SystemTooltip({ system: s, year, db }: Props) {
  const yearColumns = db.meta?.yearColumns ?? [];
  const faction     = getFactionAt(s, year, yearColumns) ?? 'U';
  const province    = getProvinceAt(s, year, yearColumns);
  const factionData = db.factions[faction];
  const color       = factionData?.color ?? '#666';
  const factionLabel = factionData?.name ?? faction;

  // Extraer provincia/distrito del string completo "LC|Province|District"
  const provinceParts = province?.split('|').slice(1).filter(Boolean) ?? [];

  const UNINHABITED = new Set(['U', 'A', 'I', '']);
  const isUninhabited = UNINHABITED.has(faction);

  // Distancia a Terra
  const distToTerra = Math.sqrt(s.x * s.x + s.y * s.y).toFixed(1);

  return (
    <div className="absolute bottom-14 left-3 bg-[#0a0d12]/92 border border-outline-variant/40 px-3 py-2 pointer-events-none backdrop-blur-sm max-w-72">
      {/* System name + alt names */}
      <div className="font-mono text-[12px] font-bold text-on-surface tracking-wide leading-tight">
        {s.name}
      </div>
      {s.altNames && s.altNames.length > 0 && (
        <div className="font-mono text-[8px] text-outline/45 mt-0.5 leading-tight">
          {s.altNames.slice(0, 3).join(' · ')}
        </div>
      )}

      {/* Faction */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className="w-2 h-2 inline-block flex-shrink-0 border border-white/10"
          style={{ backgroundColor: color }}
        />
        <span
          className="font-mono text-[10px] font-bold"
          style={{ color: isUninhabited ? '#555' : color }}
        >
          {isUninhabited ? 'Sin reclamar' : factionLabel}
          {!isUninhabited && (
            <span className="text-outline/45 ml-1 font-normal">[{faction}]</span>
          )}
        </span>
      </div>

      {/* Provincia / distrito */}
      {provinceParts.length > 0 && (
        <div className="font-mono text-[8px] text-outline/55 mt-0.5 leading-tight pl-3.5">
          {provinceParts.join(' › ')}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-outline-variant/15 mt-1.5 pt-1.5 space-y-0.5">
        {/* Espectral + posición primaria */}
        <div className="flex items-center gap-3 font-mono text-[9px] text-outline/60">
          {s.spectralType && (
            <span>
              <span className="text-outline/35">estrella </span>
              <span className="text-on-surface-variant/70">{s.spectralType}</span>
            </span>
          )}
          {s.primarySlot != null && (
            <span>
              <span className="text-outline/35">órbita </span>
              <span className="text-on-surface-variant/70">{s.primarySlot}</span>
            </span>
          )}
        </div>

        {/* Coordenadas + distancia a Terra */}
        <div className="font-mono text-[9px] text-outline/50">
          {s.x.toFixed(1)}, {s.y.toFixed(1)} LY
          <span className="text-outline/35 ml-2">{distToTerra} LY de Terra</span>
        </div>
      </div>

      {/* Sarna link indicator */}
      {s.sarnaUrl && (
        <div className="font-mono text-[8px] text-outline/30 mt-1 italic">
          sarna.net disponible
        </div>
      )}
    </div>
  );
}

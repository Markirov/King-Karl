import type { TerritoryBlob } from '../hooks/useTerritories';

const UNINHABITED = new Set(['U', 'A', 'I', '']);

interface Props { territories: TerritoryBlob[] }

export function TerritoryLayer({ territories }: Props) {
  return (
    <g>
      {territories.map(t => {
        const isUninhabited = UNINHABITED.has(t.faction);
        return (
          <path
            key={t.faction}
            d={t.path}
            fill={t.color}
            fillOpacity={isUninhabited ? 0.07 : 0.22}
            stroke="none"
          />
        );
      })}
    </g>
  );
}

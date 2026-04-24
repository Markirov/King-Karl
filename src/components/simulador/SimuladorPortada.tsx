import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';

const BASE = import.meta.env.BASE_URL;

interface CatalogEntry { year?: number; clan?: boolean; type?: string; kind: string; }

interface StatItem { label: string; count: number | string; }

interface PortadaCard {
  title: string;
  subtitle: string;
  stat: number | string;
  image: string;
  invertImage?: boolean;
  stats: StatItem[];
  onClick: () => void;
}

interface Props {
  onSelectMechs: (clan: boolean) => void;
  onSelectVehicles: () => void;
  onSelectInfanteria: () => void;
  allowClan: boolean;
  limitToYear: boolean;
}

export function SimuladorPortada({ onSelectMechs, onSelectVehicles, onSelectInfanteria, allowClan, limitToYear }: Props) {
  const campaignYear = useAppStore(s => s.campaign.campaignYear);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    const load = (folder: string, kind: string) =>
      fetch(`${BASE}assets/${folder}/index.json`)
        .then(r => r.ok ? r.json() : [])
        .then((arr: any[]) => arr.map((e: any) => ({ year: e.year, clan: e.clan ?? false, type: e.type, kind })))
        .catch(() => [] as CatalogEntry[]);

    Promise.all([
      load('mechs', 'mechs'),
      load('vehicles', 'vehicles'),
      load('infantry', 'infantry'),
      load('battlearmor', 'battlearmor'),
    ]).then(results => setCatalog(results.flat()));
  }, []);

  const counts = useMemo(() => {
    const yearOk = (e: CatalogEntry) => !limitToYear || !e.year || e.year <= campaignYear;
    const mechsIS   = catalog.filter(e => e.kind === 'mechs' && !e.clan && yearOk(e)).length;
    const mechsClan = catalog.filter(e => e.kind === 'mechs' &&  e.clan && yearOk(e)).length;
    const vType = (t: string) => catalog.filter(e => e.kind === 'vehicles' && e.type === t && yearOk(e)).length;
    const infantry   = catalog.filter(e => e.kind === 'infantry'   && yearOk(e)).length;
    const battlearmor = catalog.filter(e => e.kind === 'battlearmor' && yearOk(e)).length;
    return {
      mechs: allowClan ? mechsIS + mechsClan : mechsIS,
      mechsIS, mechsClan,
      tracked: vType('Tracked'),
      vtol: vType('VTOL'),
      wheeled: vType('Wheeled'),
      hover: vType('Hovercraft'),
      vehicles: vType('Tracked') + vType('VTOL') + vType('Wheeled') + vType('Hovercraft'),
      infantry, battlearmor,
    };
  }, [catalog, allowClan, limitToYear, campaignYear]);

  const showBA = allowClan && campaignYear >= 3050;

  const cards: PortadaCard[] = [
    {
      title: showBA ? 'Infantería y BAs' : 'Infantería',
      subtitle: 'Modelos',
      stat: showBA ? counts.infantry + counts.battlearmor || '—' : counts.infantry || '—',
      image: `${BASE}infanteria.jpeg`,
      stats: [
        { label: 'Infantería', count: counts.infantry || '—' },
        ...(showBA ? [{ label: 'Battle Armors', count: counts.battlearmor || '—' }] : []),
      ],
      onClick: onSelectInfanteria,
    },
    {
      title: 'BattleMechs',
      subtitle: 'Modelos',
      stat: counts.mechs || '—',
      image: `${BASE}mech-blueprint.png`,
      invertImage: false,
      stats: [
        { label: 'Interior', count: counts.mechsIS   || '—' },
        ...(allowClan ? [{ label: 'Clan', count: counts.mechsClan || '—' }] : []),
      ],
      onClick: () => onSelectMechs(allowClan),
    },
    {
      title: 'Vehículos',
      subtitle: 'Modelos',
      stat: counts.vehicles || '—',
      image: `${BASE}vehicle-blueprint.png`,
      stats: [
        { label: 'Cadenas', count: counts.tracked || '—' },
        { label: 'VTOL',    count: counts.vtol    || '—' },
        { label: 'Ruedas',  count: counts.wheeled || '—' },
        { label: 'Hover',   count: counts.hover   || '—' },
      ],
      onClick: onSelectVehicles,
    },
  ];

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            className="relative overflow-hidden min-h-[420px] flex flex-col justify-end text-left border border-primary-container/15 hover:border-primary-container/40 transition-all duration-300 group clip-chamfer"
          >
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: `url('${card.image}')`,
                ...(card.invertImage ? { filter: 'invert(1) hue-rotate(180deg)', mixBlendMode: 'screen' } : {}),
              }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--p-bright,theme(colors.green.400))]/40 group-hover:bg-[var(--p-bright,theme(colors.green.400))]/80 transition-colors" />

            {/* Content */}
            <div className="relative z-10 p-5 w-full">
              <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight uppercase leading-none mb-3">
                {card.title}
              </h2>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-mono text-[9px] tracking-[2px] uppercase text-secondary/50">
                  {card.subtitle}
                </span>
                <span className="font-mono text-base font-bold text-[var(--p-bright,theme(colors.green.400))]">
                  {card.stat}
                </span>
              </div>

              {/* Type stats */}
              <div className="flex gap-4 border-t border-outline-variant/20 pt-3">
                {card.stats.map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[8px] tracking-wider uppercase text-secondary/40">
                      {s.label}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-secondary/60">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

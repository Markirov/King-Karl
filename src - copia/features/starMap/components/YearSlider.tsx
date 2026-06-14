import { SUCS_YEARS } from '../constants';

interface Props {
  year: number;
  campaignYear?: number;
  onChange: (year: number) => void;
}

export function YearSlider({ year, campaignYear, onChange }: Props) {
  // Find closest SUCS year index to the current year
  const idx = (SUCS_YEARS as readonly number[]).indexOf(year);
  const currentIdx = idx >= 0 ? idx : findClosestIdx(year);

  function findClosestIdx(y: number): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < SUCS_YEARS.length; i++) {
      const d = Math.abs(SUCS_YEARS[i] - y);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  const campaignIdx = campaignYear != null ? findClosestIdx(campaignYear) : null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#0a0d12]/85 border border-outline-variant/30 px-4 py-2 backdrop-blur-sm">
      <span className="font-mono text-[9px] text-outline uppercase tracking-wider">Año</span>

      <div className="relative flex items-center">
        <input
          type="range"
          min={0}
          max={SUCS_YEARS.length - 1}
          value={currentIdx}
          onChange={e => onChange(SUCS_YEARS[+e.target.value])}
          className="w-52 h-1 appearance-none bg-outline-variant/30 cursor-pointer"
          style={{ accentColor: 'var(--p-bright, #60a5fa)' }}
        />
        {/* Campaign year marker */}
        {campaignIdx != null && (
          <div
            className="absolute top-0 w-0.5 h-3 bg-[#4ade80] opacity-70 pointer-events-none -translate-y-1"
            style={{ left: `${(campaignIdx / (SUCS_YEARS.length - 1)) * 100}%` }}
            title={`Campaña: ${campaignYear}`}
          />
        )}
      </div>

      <span className="font-mono text-[15px] font-bold text-primary-container w-12 text-right">
        {SUCS_YEARS[currentIdx]}
      </span>

      {campaignYear != null && (
        <button
          onClick={() => onChange(SUCS_YEARS[campaignIdx ?? 0])}
          className="font-mono text-[8px] text-[#4ade80]/70 hover:text-[#4ade80] border border-[#4ade80]/20 hover:border-[#4ade80]/50 px-1.5 py-0.5 transition-colors"
          title="Ir al año de campaña"
        >
          HOY
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TRO · Technical Readout — Catálogo searchable
//  Paleta: blue (tech/intel)
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Search, X, Loader } from 'lucide-react';
import { useAppStore } from '@/lib/store';

type UnitKind = 'mechs' | 'vehicles' | 'infantry' | 'battlearmor';

interface CatalogEntry {
  name: string;
  file: string;
  bv2?: number;
  tons?: number;
  year?: number;
  era?: string;
  motiveType?: string;
  kind: UnitKind;
}

const KIND_LABEL: Record<UnitKind, string> = {
  mechs: 'MECH',
  vehicles: 'VEHÍCULO',
  infantry: 'INFANTERÍA',
  battlearmor: 'BATTLE ARMOR',
};

const KIND_COLOR: Record<UnitKind, string> = {
  mechs:       '#4ade80',
  vehicles:    '#bdf4ff',
  infantry:    '#ffd79b',
  battlearmor: '#c084fc',
};

type WeightClass = 'all' | 'light' | 'medium' | 'heavy' | 'assault';
const WEIGHT_CLASSES: { key: WeightClass; label: string; range: [number, number] }[] = [
  { key: 'all',     label: 'Todos',     range: [0, 999] },
  { key: 'light',   label: 'Ligeros',   range: [0, 35] },
  { key: 'medium',  label: 'Medianos',  range: [40, 55] },
  { key: 'heavy',   label: 'Pesados',   range: [60, 75] },
  { key: 'assault', label: 'Asalto',    range: [80, 999] },
];

type SortBy = 'name' | 'bv2' | 'year' | 'tons';

export function TROPage() {
  const campaignYear = useAppStore(s => s.campaign.campaignYear);
  const [catalog, setCatalog]   = useState<CatalogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [kindFilter, setKindFilter] = useState<UnitKind | 'all'>('mechs');
  const [weightClass, setWeightClass] = useState<WeightClass>('all');
  const [limitToYear, setLimitToYear] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('bv2');
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [detailText, setDetailText] = useState<string | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Load all catalogs on mount
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const loadIndex = (folder: string, kind: UnitKind) =>
      fetch(`${base}assets/${folder}/index.json`)
        .then(r => r.ok ? r.json() : [])
        .then((arr: any[]) => arr.map((e: any) => ({
          name: e.name, file: e.file, bv2: e.bv2, tons: e.tons, year: e.year,
          era: e.era, motiveType: e.type, kind,
        }) as CatalogEntry))
        .catch(() => [] as CatalogEntry[]);

    Promise.all([
      loadIndex('mechs', 'mechs'),
      loadIndex('vehicles', 'vehicles'),
      loadIndex('infantry', 'infantry'),
      loadIndex('battlearmor', 'battlearmor'),
    ]).then(results => {
      setCatalog(results.flat());
      setLoading(false);
    });
  }, []);

  // Fetch raw file when selecting
  useEffect(() => {
    if (!selected) { setDetailText(null); return; }
    setFetchingDetail(true);
    const base = import.meta.env.BASE_URL;
    fetch(`${base}assets/${selected.kind}/${encodeURIComponent(selected.file)}`)
      .then(r => r.ok ? r.text() : '')
      .then(t => setDetailText(t))
      .catch(() => setDetailText(null))
      .finally(() => setFetchingDetail(false));
  }, [selected]);

  // Apply filters + sort
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const wc = WEIGHT_CLASSES.find(w => w.key === weightClass)!;
    let list = catalog.filter(e => {
      if (kindFilter !== 'all' && e.kind !== kindFilter) return false;
      if (limitToYear && e.year && e.year > campaignYear) return false;
      if (weightClass !== 'all' && e.tons) {
        if (e.tons < wc.range[0] || e.tons > wc.range[1]) return false;
      }
      if (q.length > 0) {
        if (!e.name.toLowerCase().includes(q) &&
            !(e.motiveType ?? '').toLowerCase().includes(q) &&
            !(e.era ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'bv2') cmp = (a.bv2 ?? 0) - (b.bv2 ?? 0);
      else if (sortBy === 'year') cmp = (a.year ?? 0) - (b.year ?? 0);
      else if (sortBy === 'tons') cmp = (a.tons ?? 0) - (b.tons ?? 0);
      return sortDesc ? -cmp : cmp;
    });

    return list;
  }, [catalog, query, kindFilter, weightClass, limitToYear, campaignYear, sortBy, sortDesc]);

  const counts = useMemo(() => {
    const byKind: Record<string, number> = { all: catalog.length, mechs: 0, vehicles: 0, infantry: 0, battlearmor: 0 };
    catalog.forEach(e => { byKind[e.kind] = (byKind[e.kind] ?? 0) + 1; });
    return byKind;
  }, [catalog]);

  const handleSortClick = (col: SortBy) => {
    if (sortBy === col) setSortDesc(d => !d);
    else { setSortBy(col); setSortDesc(col !== 'name'); }
  };

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]" style={{ height: 'calc(100vh - 88px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #4e453a' }}>
        <div>
          <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: '#bdf4ff', letterSpacing: 4, textTransform: 'uppercase' }}>
            — Technical Readout · Catálogo —
          </div>
          <h1 style={{ margin: '6px 0 4px', fontFamily: '"Space Grotesk", sans-serif', fontSize: 30, fontWeight: 800, color: '#fff1d6', letterSpacing: -0.6 }}>
            TRO {loading && <Loader size={20} className="animate-spin inline ml-2" />}
          </h1>
          <div style={{ fontSize: 12, color: '#9a8f81' }}>
            {visible.length} de {catalog.length} unidades
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#181c22', border: '1px solid #4e453a', padding: '6px 10px', flex: 1, minWidth: 280 }}>
          <Search size={14} color="#9a8f81" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar nombre, era, tipo motor…"
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#e8d5b8', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: '#9a8f81', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Year toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#9a8f81', fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1.5 }}>
          <input type="checkbox" checked={limitToYear} onChange={e => setLimitToYear(e.target.checked)} style={{ accentColor: '#bdf4ff' }} />
          AÑO ≤ {campaignYear ?? '?'}
        </label>
      </div>

      {/* Kind chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {(['all', 'mechs', 'vehicles', 'infantry', 'battlearmor'] as const).map(k => (
          <ChipBtn
            key={k}
            active={kindFilter === k}
            color={k === 'all' ? '#bdf4ff' : KIND_COLOR[k as UnitKind]}
            onClick={() => setKindFilter(k)}
          >
            {(k === 'all' ? 'TODOS' : KIND_LABEL[k as UnitKind])} ({counts[k] ?? 0})
          </ChipBtn>
        ))}
      </div>

      {/* Weight chips (solo mechs/vehicles) */}
      {(kindFilter === 'mechs' || kindFilter === 'vehicles') && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {WEIGHT_CLASSES.map(w => (
            <ChipBtn
              key={w.key}
              active={weightClass === w.key}
              color="#ffd79b"
              onClick={() => setWeightClass(w.key)}
              small
            >
              {w.label.toUpperCase()} {w.key !== 'all' && `${w.range[0]}-${w.range[1] === 999 ? '+' : w.range[1]}t`}
            </ChipBtn>
          ))}
        </div>
      )}

      {/* Layout: tabla + panel detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 460px' : '1fr', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Tabla */}
        <div style={{ overflow: 'auto', border: '1px solid #4e453a', background: '#181c22' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#10141a', zIndex: 1 }}>
              <tr>
                <Th onClick={() => handleSortClick('name')} active={sortBy === 'name'} desc={sortDesc}>Nombre</Th>
                <Th>Tipo</Th>
                <Th onClick={() => handleSortClick('tons')} active={sortBy === 'tons'} desc={sortDesc} align="right">Tons</Th>
                <Th onClick={() => handleSortClick('bv2')} active={sortBy === 'bv2'} desc={sortDesc} align="right">BV2</Th>
                <Th onClick={() => handleSortClick('year')} active={sortBy === 'year'} desc={sortDesc} align="right">Año</Th>
                <Th>Era</Th>
                <Th>Motor</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9a8f81', fontFamily: '"Share Tech Mono", monospace', letterSpacing: 2 }}>
                  CARGANDO CATÁLOGO…
                </td></tr>
              )}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9a8f81', fontFamily: '"Share Tech Mono", monospace', letterSpacing: 2 }}>
                  SIN RESULTADOS
                </td></tr>
              )}
              {visible.slice(0, 500).map((e, i) => (
                <tr key={i}
                  onClick={() => setSelected(e)}
                  style={{
                    cursor: 'pointer',
                    borderTop: '1px solid #4e453a40',
                    background: selected?.file === e.file ? '#bdf4ff15' : 'transparent',
                  }}
                  onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = selected?.file === e.file ? '#bdf4ff25' : '#bdf4ff08'; }}
                  onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = selected?.file === e.file ? '#bdf4ff15' : 'transparent'; }}
                >
                  <Td style={{ color: '#fff1d6', fontWeight: 600 }}>{e.name}</Td>
                  <Td>
                    <span style={{
                      display: 'inline-block', padding: '1px 6px',
                      border: `1px solid ${KIND_COLOR[e.kind]}`,
                      color: KIND_COLOR[e.kind],
                      fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5,
                    }}>
                      {KIND_LABEL[e.kind]}
                    </span>
                  </Td>
                  <Td mono align="right">{e.tons ?? '—'}</Td>
                  <Td mono align="right" style={{ color: '#bdf4ff' }}>{e.bv2 ?? '—'}</Td>
                  <Td mono align="right">{e.year ?? '—'}</Td>
                  <Td style={{ color: '#9a8f81', fontSize: 11 }}>{e.era ?? '—'}</Td>
                  <Td style={{ color: '#9a8f81', fontSize: 11 }}>{e.motiveType ?? '—'}</Td>
                </tr>
              ))}
              {visible.length > 500 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 16, color: '#9a8f81', fontStyle: 'italic', fontSize: 11 }}>
                  Mostrando primeras 500 de {visible.length}. Refina filtros.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel detalle */}
        {selected && (
          <DetailPanel
            entry={selected}
            text={detailText}
            loading={fetchingDetail}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  DETAIL PANEL — muestra info del fichero SSW/SAW seleccionado
// ══════════════════════════════════════════════════════════

function DetailPanel({ entry, text, loading, onClose }: {
  entry: CatalogEntry;
  text: string | null;
  loading: boolean;
  onClose: () => void;
}) {
  // Parse rápido SSW XML para sacar datos básicos
  const parsed = useMemo(() => parseSSWBasic(text ?? ''), [text]);

  return (
    <div style={{
      border: '1px solid #bdf4ff', background: '#181c22',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #4e453a',
        background: '#10141a',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            color: KIND_COLOR[entry.kind], letterSpacing: 2,
          }}>
            {KIND_LABEL[entry.kind]} {entry.year ? `· ${entry.year}` : ''}
          </div>
          <h2 style={{
            margin: '4px 0 0',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 800,
            color: '#fff1d6', letterSpacing: -0.3,
          }}>{entry.name}</h2>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid #4e453a',
          color: '#9a8f81', padding: '4px 10px', cursor: 'pointer',
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
        }}>X</button>
      </div>

      {/* KPIs */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #4e453a40' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Kpi label="BV2" value={String(entry.bv2 ?? '—')} color="#bdf4ff" />
          <Kpi label="Tons" value={String(entry.tons ?? parsed.tons ?? '—')} color="#ffd79b" />
          <Kpi label="Era" value={entry.era ?? parsed.era ?? '—'} color="#e8d5b8" />
        </div>
      </div>

      {/* Detalle */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9a8f81', fontFamily: '"Share Tech Mono", monospace' }}>
            CARGANDO FICHA…
          </div>
        ) : !text ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#9a8f81', fontFamily: '"Share Tech Mono", monospace' }}>
            ERROR CARGANDO FICHERO
          </div>
        ) : (
          <>
            {parsed.chassis && (
              <DetailSection title="Chasis">
                {parsed.chassis} {parsed.model && `· ${parsed.model}`}
              </DetailSection>
            )}
            {parsed.engineRating && (
              <DetailSection title="Motor">
                {parsed.engineType ?? '—'} · Rating {parsed.engineRating}
              </DetailSection>
            )}
            {parsed.walkMP !== null && (
              <DetailSection title="Movimiento">
                Caminar {parsed.walkMP} · Correr {Math.ceil(parsed.walkMP * 1.5)} {parsed.jumpMP ? `· Salto ${parsed.jumpMP}` : ''}
              </DetailSection>
            )}
            {parsed.armorType && (
              <DetailSection title="Blindaje">
                {parsed.armorType} {parsed.armorTotal && `· ${parsed.armorTotal} pts`}
              </DetailSection>
            )}
            {parsed.heatSinks !== null && (
              <DetailSection title="Radiadores">
                {parsed.heatSinks} {parsed.heatSinkType ? `(${parsed.heatSinkType})` : ''}
              </DetailSection>
            )}
            {parsed.weapons.length > 0 && (
              <DetailSection title={`Armas (${parsed.weapons.length})`}>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  {parsed.weapons.slice(0, 20).map((w, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>
                      {w}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}
            {parsed.cost && (
              <DetailSection title="Coste">
                {new Intl.NumberFormat('es-ES').format(parsed.cost)} ₡
              </DetailSection>
            )}
            <DetailSection title="Archivo">
              <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: '#9a8f81' }}>
                {entry.file}
              </span>
            </DetailSection>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #4e453a40', background: '#10141a' }}>
        <button onClick={() => {
          // Drop file en localStorage para que Simulador lo recoja
          if (!text) return;
          try {
            localStorage.setItem('kk_tro_send_to_sim', JSON.stringify({ text, file: entry.file, kind: entry.kind }));
            window.location.hash = '#/simulador';
          } catch { /* silent */ }
        }} style={{
          width: '100%', padding: '8px 12px',
          background: '#bdf4ff', color: '#0a0e14',
          border: 'none', fontFamily: '"Share Tech Mono", monospace',
          fontSize: 10, letterSpacing: 2, fontWeight: 700,
          cursor: text ? 'pointer' : 'not-allowed', opacity: text ? 1 : 0.4,
        }}>ENVIAR A SIMULADOR →</button>
      </div>
    </div>
  );
}

// ── SSW basic parser ──────────────────────────────────────
interface ParsedSSW {
  chassis: string | null;
  model: string | null;
  tons: number | null;
  era: string | null;
  engineType: string | null;
  engineRating: number | null;
  walkMP: number | null;
  jumpMP: number | null;
  armorType: string | null;
  armorTotal: number | null;
  heatSinks: number | null;
  heatSinkType: string | null;
  weapons: string[];
  cost: number | null;
}

function parseSSWBasic(text: string): ParsedSSW {
  const get = (tag: string) => {
    const m = text.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
    return m ? m[1].trim() : null;
  };
  const getNum = (tag: string) => {
    const v = get(tag);
    if (v == null) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  const weapons: string[] = [];
  const wMatches = text.matchAll(/<weapon>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?(<location>([^<]+)<\/location>)?[\s\S]*?<\/weapon>/g);
  for (const m of wMatches) {
    const loc = m[3] ? ` [${m[3]}]` : '';
    weapons.push(`${m[1]}${loc}`);
  }

  return {
    chassis:      get('chassis'),
    model:        get('model'),
    tons:         getNum('tons') || getNum('mass'),
    era:          get('era') || get('introyear'),
    engineType:   get('enginetype') || get('engine'),
    engineRating: getNum('rating') || getNum('enginerating'),
    walkMP:       getNum('walkmp') || getNum('walk'),
    jumpMP:       getNum('jumpmp') || getNum('jump'),
    armorType:    get('armortype'),
    armorTotal:   getNum('armortotal') || getNum('armorpoints'),
    heatSinks:    getNum('heatsinks') || getNum('numheatsinks'),
    heatSinkType: get('heatsinktype') || get('hstype'),
    weapons:      weapons.slice(0, 40),
    cost:         getNum('cost'),
  };
}

// ── UI helpers ──────────────────────────────────────────
function Th({ children, onClick, active, desc, align = 'left' }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; desc?: boolean; align?: 'left' | 'right' | 'center';
}) {
  return (
    <th onClick={onClick} style={{
      padding: '8px 12px',
      textAlign: align,
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
      color: active ? '#bdf4ff' : '#9a8f81',
      letterSpacing: 2, fontWeight: 700,
      borderBottom: '1px solid #4e453a',
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none', textTransform: 'uppercase',
    }}>
      {children}
      {active && (desc ? ' ▼' : ' ▲')}
    </th>
  );
}

function Td({ children, mono, align = 'left', style }: {
  children: React.ReactNode; mono?: boolean; align?: 'left' | 'right' | 'center'; style?: React.CSSProperties;
}) {
  return (
    <td style={{
      padding: '6px 12px',
      textAlign: align,
      fontFamily: mono ? '"Share Tech Mono", monospace' : 'Inter, sans-serif',
      color: '#e8d5b8',
      ...style,
    }}>{children}</td>
  );
}

function ChipBtn({ children, onClick, active, color, small }: {
  children: React.ReactNode; onClick: () => void; active: boolean; color: string; small?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : 'transparent',
      color: active ? '#0a0e14' : color,
      border: `1px solid ${color}`,
      padding: small ? '3px 8px' : '5px 12px',
      fontFamily: '"Share Tech Mono", monospace', fontSize: small ? 9 : 10,
      letterSpacing: 1.5, fontWeight: 700,
      cursor: 'pointer',
    }}>{children}</button>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 8, color: '#9a8f81', letterSpacing: 2 }}>{label}</div>
      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 16, color, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
        color: '#bdf4ff', letterSpacing: 2, textTransform: 'uppercase',
        marginBottom: 3, paddingBottom: 2, borderBottom: '1px solid #4e453a40',
      }}>{title}</div>
      <div style={{ color: '#e8d5b8', fontSize: 12 }}>{children}</div>
    </div>
  );
}

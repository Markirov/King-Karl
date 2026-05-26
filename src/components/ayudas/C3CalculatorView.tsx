// ══════════════════════════════════════════════════════════════
//  C3 STANDARD NETWORK CALCULATOR
//  Total Warfare BV rule: cada unidad en red C3 × 1.05.
//  Componentes: Master 1.5M C-Bills / 5t / 5 crits;
//               Slave  250k / 1t / 1 crit.
//  Max 12 unidades. 1 Master por cada 4 unidades.
//  C3 Standard disponible 3050+.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Search } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

// ── Datos C3 ──────────────────────────────────────────────

const C3_MULTIPLIER = 1.05;
const NETWORK_MAX = 12;
const UNITS_PER_MASTER = 4;       // 1 Master cubre sí mismo + 3 Slaves

const COMPONENTS = {
  master: { name: 'C3 Master Computer', cost: 1_500_000, tons: 5, crits: 5 },
  slave:  { name: 'C3 Slave Unit',       cost: 250_000,   tons: 1, crits: 1 },
};

// ── Tipos ─────────────────────────────────────────────────

interface MechCatalogEntry {
  name: string;
  bv2:  number;
  file: string;
  year: number;
}

interface NetworkUnit {
  id:     string;
  name:   string;
  bv:     number;
  source: 'catalog' | 'manual';
}

// ── Helpers ───────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-ES');

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function calcComponents(n: number) {
  if (n <= 0) return { masters: 0, slaves: 0, cost: 0, tons: 0, crits: 0 };
  const masters = Math.ceil(n / UNITS_PER_MASTER);
  const slaves  = n - masters;
  const cost  = masters * COMPONENTS.master.cost  + slaves * COMPONENTS.slave.cost;
  const tons  = masters * COMPONENTS.master.tons  + slaves * COMPONENTS.slave.tons;
  const crits = masters * COMPONENTS.master.crits + slaves * COMPONENTS.slave.crits;
  return { masters, slaves, cost, tons, crits };
}

// ── Component ─────────────────────────────────────────────

export function C3CalculatorView() {
  const [catalog, setCatalog] = useState<MechCatalogEntry[]>([]);
  const [units, setUnits] = useState<NetworkUnit[]>([]);
  const [search, setSearch] = useState('');

  // Manual input
  const [manualName, setManualName] = useState('');
  const [manualBV, setManualBV] = useState('');

  // Load catalog
  useEffect(() => {
    fetch(`${BASE}assets/mechs/index.json`)
      .then(r => r.json())
      .then((data: MechCatalogEntry[]) => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => setCatalog([]));
  }, []);

  // Filter catalog by search
  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return catalog.filter(m => m.name.toLowerCase().includes(q)).slice(0, 30);
  }, [catalog, search]);

  function addFromCatalog(m: MechCatalogEntry) {
    if (units.length >= NETWORK_MAX) return;
    setUnits(u => [...u, {
      id: genId(),
      name: m.name,
      bv: m.bv2,
      source: 'catalog',
    }]);
    setSearch('');
  }

  function addManual() {
    const bv = parseInt(manualBV, 10);
    if (!manualName.trim() || isNaN(bv) || bv <= 0) return;
    if (units.length >= NETWORK_MAX) return;
    setUnits(u => [...u, {
      id: genId(),
      name: manualName.trim(),
      bv,
      source: 'manual',
    }]);
    setManualName('');
    setManualBV('');
  }

  function removeUnit(id: string) {
    setUnits(u => u.filter(x => x.id !== id));
  }

  function clearAll() {
    setUnits([]);
  }

  // Cálculos
  const baseBV = units.reduce((s, u) => s + u.bv, 0);
  const c3BV   = Math.round(baseBV * C3_MULTIPLIER);
  const deltaBV = c3BV - baseBV;
  const comps = calcComponents(units.length);
  const networkFull = units.length >= NETWORK_MAX;

  return (
    <div className="space-y-6">

      {/* === Inputs === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Buscador catálogo */}
        <div className="bg-surface-container-low/60 border border-outline-variant/20 p-4">
          <div className="font-mono text-[10px] text-secondary tracking-[3px] uppercase mb-3">
            Catálogo Mechs ({catalog.length})
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-outline" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar (Marauder, Atlas, MAD-3R...)"
              className="w-full h-9 pl-7 pr-3 bg-surface-container-lowest border border-outline-variant/30 font-mono text-[11px] text-on-surface focus:outline-none focus:border-primary-container"
            />
          </div>
          {/* Results */}
          {search.trim() && (
            <div className="mt-2 max-h-60 overflow-y-auto custom-scrollbar border border-outline-variant/10">
              {filtered.length === 0 ? (
                <div className="p-3 font-mono text-[10px] text-outline text-center">
                  Sin resultados
                </div>
              ) : (
                filtered.map(m => (
                  <button key={m.file} onClick={() => addFromCatalog(m)} disabled={networkFull}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-primary-container/10 disabled:opacity-30 disabled:cursor-not-allowed text-left transition-colors">
                    <span className="font-mono text-[11px] text-on-surface truncate">{m.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[9px] text-outline">{m.year}</span>
                      <span className="font-headline text-[11px] font-bold text-primary-container">
                        BV {fmt(m.bv2)}
                      </span>
                      <Plus size={11} className="text-primary-container" />
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          {catalog.length === 0 && (
            <div className="mt-2 font-mono text-[9px] text-outline">
              Cargando catálogo…
            </div>
          )}
        </div>

        {/* Entry manual */}
        <div className="bg-surface-container-low/60 border border-outline-variant/20 p-4">
          <div className="font-mono text-[10px] text-secondary tracking-[3px] uppercase mb-3">
            Entry manual
          </div>
          <div className="space-y-2">
            <input value={manualName} onChange={e => setManualName(e.target.value)}
              placeholder="Nombre unidad"
              className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant/30 font-mono text-[11px] text-on-surface focus:outline-none focus:border-primary-container" />
            <div className="flex gap-2">
              <input type="number" min={1} value={manualBV} onChange={e => setManualBV(e.target.value)}
                placeholder="BV2"
                onKeyDown={e => e.key === 'Enter' && addManual()}
                className="flex-1 h-9 px-3 bg-surface-container-lowest border border-outline-variant/30 font-mono text-[11px] text-on-surface text-right focus:outline-none focus:border-primary-container" />
              <button onClick={addManual} disabled={networkFull || !manualName.trim() || !manualBV}
                className="px-4 h-9 bg-primary-container/20 border border-primary-container text-primary-container font-mono text-[10px] uppercase tracking-widest hover:bg-primary-container/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <Plus size={12} className="inline" /> Añadir
              </button>
            </div>
            <p className="font-mono text-[9px] text-outline mt-2">
              Para unidades no en catálogo o BV custom.
            </p>
          </div>
        </div>
      </div>

      {/* === Unidades en red === */}
      <div className="bg-surface-container-low/60 border border-outline-variant/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] text-secondary tracking-[3px] uppercase">
            Red C3 — {units.length} / {NETWORK_MAX} unidades
          </div>
          {units.length > 0 && (
            <button onClick={clearAll}
              className="font-mono text-[9px] text-error/70 hover:text-error tracking-widest uppercase">
              Limpiar
            </button>
          )}
        </div>
        {units.length === 0 ? (
          <div className="py-6 font-mono text-[10px] text-outline text-center tracking-widest uppercase">
            Añade unidades arriba (catálogo o manual)
          </div>
        ) : (
          <div className="space-y-1.5">
            {units.map((u, i) => {
              // Primeros N masters están al frente: cada 4 unidades, la 1ª es master
              const isMaster = i % UNITS_PER_MASTER === 0;
              return (
                <div key={u.id}
                  className="flex items-center gap-3 px-3 py-2 bg-surface-container/40 border border-outline-variant/10 hover:border-primary-container/30 transition-all">
                  <span className={`font-mono text-[9px] tracking-[2px] uppercase shrink-0 w-16 ${
                    isMaster ? 'text-amber-400' : 'text-outline'
                  }`}>
                    {isMaster ? '◆ Master' : '○ Slave'}
                  </span>
                  <span className="flex-1 font-mono text-[11px] text-on-surface truncate">
                    {u.name}
                    {u.source === 'manual' && (
                      <span className="ml-2 font-mono text-[8px] text-outline tracking-widest uppercase">manual</span>
                    )}
                  </span>
                  <span className="font-headline text-[12px] font-bold text-primary-container shrink-0">
                    BV {fmt(u.bv)}
                  </span>
                  <button onClick={() => removeUnit(u.id)}
                    className="w-6 h-6 flex items-center justify-center text-outline hover:text-error transition-colors">
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === Resultados === */}
      {units.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* BV (lo más importante) */}
          <div className="bg-primary-container/10 border-2 border-primary-container/40 p-4 col-span-1 md:col-span-2">
            <div className="font-mono text-[10px] text-primary-container tracking-[3px] uppercase mb-2">
              Battle Value (red C3)
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">Base</div>
                <div className="font-headline text-2xl font-black text-on-surface">{fmt(baseBV)}</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">× C3</div>
                <div className="font-mono text-sm text-primary-container">× {C3_MULTIPLIER}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">Total</div>
                <div className="font-headline text-3xl font-black text-primary-container leading-none">
                  {fmt(c3BV)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/15 flex items-center justify-between">
              <span className="font-mono text-[10px] text-outline tracking-widest uppercase">
                Bonus BV
              </span>
              <span className="font-headline text-lg font-bold text-amber-400">
                +{fmt(deltaBV)}
              </span>
            </div>
            <p className="font-mono text-[9px] text-outline/70 mt-2 leading-relaxed">
              TW p. 285: cada unidad en C3 multiplica su BV × 1.05.
            </p>
          </div>

          {/* Componentes */}
          <div className="bg-surface-container-low/60 border border-outline-variant/20 p-4">
            <div className="font-mono text-[10px] text-secondary tracking-[3px] uppercase mb-2">
              Componentes
            </div>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-outline">Masters:</span>
                <span className="text-amber-400 font-bold">{comps.masters} × 1,5M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Slaves:</span>
                <span className="text-on-surface">{comps.slaves} × 250k</span>
              </div>
              <div className="border-t border-outline-variant/15 pt-1.5 mt-2">
                <div className="flex justify-between">
                  <span className="text-outline">Coste:</span>
                  <span className="text-primary-container font-bold">{fmt(comps.cost)} ₡</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Tons:</span>
                  <span className="text-on-surface">{comps.tons} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Crits:</span>
                  <span className="text-on-surface">{comps.crits}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Notas reglas === */}
      <div className="bg-surface-container-low/30 border border-outline-variant/15 p-4">
        <div className="font-mono text-[10px] text-outline tracking-[3px] uppercase mb-2">
          Reglas C3 Standard
        </div>
        <ul className="font-mono text-[10px] text-on-surface-variant/70 leading-relaxed space-y-1 list-disc list-inside">
          <li>Cada Master controla sí mismo + 3 Slaves (lanza 4 unidades)</li>
          <li>Múltiples Masters se interconectan → compañía hasta 12 unidades</li>
          <li>Slaves comparten datos de targeting via Master (to-hit usa distancia más corta de la red)</li>
          <li>Master destruido → red colapsa (Slaves desconectados)</li>
          <li>LOS Master ↔ Slave máx 60 hex</li>
          <li>ECM enemigo interfiere la red</li>
        </ul>
      </div>
    </div>
  );
}

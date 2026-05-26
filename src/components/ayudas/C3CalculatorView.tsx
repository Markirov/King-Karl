// ══════════════════════════════════════════════════════════════
//  C3 STANDARD NETWORK CALCULATOR
//  Total Warfare BV rule: cada unidad en red C3 × 1.05.
//  Componentes: Master 1.5M C-Bills / 5t / 5 crits;
//               Slave  250k / 1t / 1 crit.
//  Max 12 unidades. 1 Master por cada 4 unidades.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Search } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

// ── Datos C3 ──────────────────────────────────────────────

const NETWORK_MAX = 12;

const COMPONENTS = {
  master: { name: 'C3 Master Computer', cost: 1_500_000, tons: 5, crits: 5 },
  slave:  { name: 'C3 Slave Unit',       cost: 250_000,   tons: 1, crits: 1 },
};

/**
 * BV multiplier por número de unidades en red C3 Standard.
 * N=1 → 1.00 (sin red). N≥2 → 1 + 0.05·N (lineal hasta N=12 → 1.60).
 */
function c3Multiplier(n: number): number {
  if (n <= 1) return 1.00;
  return 1.00 + 0.05 * n;
}

/**
 * Masters mínimos para red C3 Standard según tabla canon:
 * 1-4 → 1, 5-8 → 3, 9-12 → 4.
 */
function mastersNeeded(n: number): number {
  if (n <= 0) return 0;
  if (n <= 4) return 1;
  if (n <= 8) return 3;
  return 4;
}

// ── Tipos ─────────────────────────────────────────────────

interface MechCatalogEntry {
  name: string;
  bv2:  number;
  file: string;
  year: number;
}

interface NetworkUnit {
  id:       string;
  name:     string;
  bv:       number;
  source:   'catalog' | 'manual';
  isMaster: boolean;     // user-controlled
  gunnery:  number;      // 0-8, default 4 (Disparo)
  piloting: number;      // 0-8, default 5 (Pilotaje)
}

const DEFAULT_GUNNERY = 4;
const DEFAULT_PILOTING = 5;

// ── Helpers ───────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-ES');

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function bvWithC3(bv: number, n: number): number {
  return Math.round(bv * c3Multiplier(n));
}

/**
 * Skill Multiplier para BV2 (TacOps p.275 — fórmula simplificada).
 * Base: Gunnery 4 / Piloting 5 = ×1.00.
 *   gunnery: +20% por cada nivel BAJO 4, −20% por cada nivel SOBRE 4
 *   piloting: +5% por cada nivel BAJO 5, −5% por cada nivel SOBRE 5
 */
function skillMultiplier(gunnery: number, piloting: number): number {
  const gMod = 1 + 0.2 * (4 - gunnery);
  const pMod = 1 + 0.05 * (5 - piloting);
  return Math.max(0, gMod * pMod);
}

function bvAdjusted(bv: number, gunnery: number, piloting: number): number {
  return Math.round(bv * skillMultiplier(gunnery, piloting));
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

  // Filter catalog
  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return catalog.filter(m => m.name.toLowerCase().includes(q)).slice(0, 30);
  }, [catalog, search]);

  /** Default isMaster: cubre tabla 1-4→1, 5-8→3, 9-12→4 */
  function defaultIsMaster(currentUnits: NetworkUnit[]): boolean {
    const newCount = currentUnits.length + 1;
    const needed = mastersNeeded(newCount);
    const currentMasters = currentUnits.filter(u => u.isMaster).length;
    return currentMasters < needed;
  }

  function addFromCatalog(m: MechCatalogEntry) {
    if (units.length >= NETWORK_MAX) return;
    setUnits(u => [...u, {
      id: genId(),
      name: m.name,
      bv: m.bv2,
      source: 'catalog',
      isMaster: defaultIsMaster(u),
      gunnery: DEFAULT_GUNNERY,
      piloting: DEFAULT_PILOTING,
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
      isMaster: defaultIsMaster(u),
      gunnery: DEFAULT_GUNNERY,
      piloting: DEFAULT_PILOTING,
    }]);
    setManualName('');
    setManualBV('');
  }

  function toggleMaster(id: string) {
    setUnits(u => u.map(x => x.id === id ? { ...x, isMaster: !x.isMaster } : x));
  }

  function setSkill(id: string, field: 'gunnery' | 'piloting', val: number) {
    const clamped = Math.max(0, Math.min(8, val));
    setUnits(u => u.map(x => x.id === id ? { ...x, [field]: clamped } : x));
  }

  function removeUnit(id: string) {
    setUnits(u => u.filter(x => x.id !== id));
  }

  function clearAll() {
    setUnits([]);
  }

  // Cálculos
  const n = units.length;
  const multiplier = c3Multiplier(n);
  const baseBV    = units.reduce((s, u) => s + u.bv, 0);
  const skillBV   = units.reduce((s, u) => s + bvAdjusted(u.bv, u.gunnery, u.piloting), 0);
  const c3BV      = units.reduce((s, u) => s + bvWithC3(bvAdjusted(u.bv, u.gunnery, u.piloting), n), 0);
  const deltaBV   = c3BV - baseBV;

  const mastersCount = units.filter(u => u.isMaster).length;
  const slavesCount  = n - mastersCount;
  const mastersRequired = mastersNeeded(n);
  const mastersShortage = Math.max(0, mastersRequired - mastersCount);

  const cost = mastersCount * COMPONENTS.master.cost + slavesCount * COMPONENTS.slave.cost;
  const tons = mastersCount * COMPONENTS.master.tons + slavesCount * COMPONENTS.slave.tons;
  const crits = mastersCount * COMPONENTS.master.crits + slavesCount * COMPONENTS.slave.crits;

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
            <span className="ml-3 text-outline">
              ◆ {mastersCount} Master · ○ {slavesCount} Slave
            </span>
          </div>
          {units.length > 0 && (
            <button onClick={clearAll}
              className="font-mono text-[9px] text-error/70 hover:text-error tracking-widest uppercase">
              Limpiar
            </button>
          )}
        </div>

        {mastersShortage > 0 && (
          <div className="mb-3 px-3 py-2 bg-amber-400/10 border border-amber-400/30 font-mono text-[10px] text-amber-400">
            ⚠ Faltan {mastersShortage} Master(s). Red requiere mínimo {mastersRequired} para {n} unidades.
          </div>
        )}

        {units.length === 0 ? (
          <div className="py-6 font-mono text-[10px] text-outline text-center tracking-widest uppercase">
            Añade unidades arriba (catálogo o manual)
          </div>
        ) : (
          <>
            {/* Header tabla */}
            <div className="grid grid-cols-[78px_1fr_50px_50px_70px_80px_80px_24px] gap-2 px-3 py-1.5 font-mono text-[8px] text-outline tracking-[2px] uppercase">
              <span>Rol</span>
              <span>Unidad</span>
              <span className="text-center">G</span>
              <span className="text-center">P</span>
              <span className="text-right">BV base</span>
              <span className="text-right">BV skill</span>
              <span className="text-right">BV ×{multiplier.toFixed(2)}</span>
              <span />
            </div>
            <div className="space-y-1.5">
              {units.map(u => {
                const sm = skillMultiplier(u.gunnery, u.piloting);
                const adj = bvAdjusted(u.bv, u.gunnery, u.piloting);
                const c3 = bvWithC3(adj, n);
                return (
                  <div key={u.id}
                    className={`grid grid-cols-[78px_1fr_50px_50px_70px_80px_80px_24px] gap-2 items-center px-3 py-2 border transition-all ${
                      u.isMaster
                        ? 'bg-amber-400/5 border-amber-400/30'
                        : 'bg-surface-container/40 border-outline-variant/10'
                    } hover:border-primary-container/30`}>

                    {/* Toggle Master/Slave */}
                    <button onClick={() => toggleMaster(u.id)}
                      title={u.isMaster ? 'Clic para hacer Slave' : 'Clic para hacer Master'}
                      className={`font-mono text-[9px] tracking-[2px] uppercase text-left cursor-pointer transition-colors ${
                        u.isMaster ? 'text-amber-400 hover:text-amber-300' : 'text-outline hover:text-on-surface'
                      }`}>
                      {u.isMaster ? '◆ Master' : '○ Slave'}
                    </button>

                    {/* Nombre */}
                    <span className="font-mono text-[11px] text-on-surface truncate">
                      {u.name}
                      {u.source === 'manual' && (
                        <span className="ml-2 font-mono text-[8px] text-outline tracking-widest uppercase">manual</span>
                      )}
                    </span>

                    {/* Gunnery */}
                    <input type="number" min={0} max={8} value={u.gunnery}
                      onChange={e => setSkill(u.id, 'gunnery', parseInt(e.target.value) || 0)}
                      title="Disparo (Gunnery) 0-8 · default 4"
                      className="w-full h-7 bg-surface-container-lowest border border-outline-variant/30 px-1 font-mono text-[11px] text-on-surface text-center focus:outline-none focus:border-primary-container [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />

                    {/* Piloting */}
                    <input type="number" min={0} max={8} value={u.piloting}
                      onChange={e => setSkill(u.id, 'piloting', parseInt(e.target.value) || 0)}
                      title="Pilotaje (Piloting) 0-8 · default 5"
                      className="w-full h-7 bg-surface-container-lowest border border-outline-variant/30 px-1 font-mono text-[11px] text-on-surface text-center focus:outline-none focus:border-primary-container [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />

                    {/* BV base */}
                    <span className="font-mono text-[11px] text-on-surface-variant text-right">
                      {fmt(u.bv)}
                    </span>

                    {/* BV adjusted by skill */}
                    <span className="font-mono text-[11px] text-amber-400 text-right" title={`Skill ×${sm.toFixed(2)}`}>
                      {fmt(adj)}
                    </span>

                    {/* BV C3 final */}
                    <span className="font-headline text-[12px] font-bold text-primary-container text-right">
                      {fmt(c3)}
                    </span>

                    {/* Remove */}
                    <button onClick={() => removeUnit(u.id)}
                      className="w-6 h-6 flex items-center justify-center text-outline hover:text-error transition-colors justify-self-end">
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* === Resultados === */}
      {units.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* BV totales */}
          <div className="bg-primary-container/10 border-2 border-primary-container/40 p-4 col-span-1 md:col-span-2">
            <div className="font-mono text-[10px] text-primary-container tracking-[3px] uppercase mb-2">
              Battle Value Final
            </div>
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">Base</div>
                <div className="font-headline text-xl font-black text-on-surface">{fmt(baseBV)}</div>
              </div>
              <div>
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">Con Skill</div>
                <div className="font-headline text-xl font-black text-amber-400">{fmt(skillBV)}</div>
              </div>
              <div>
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">× C3 (N={n})</div>
                <div className="font-mono text-sm text-primary-container">×{multiplier.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[8px] text-outline tracking-[2px] uppercase">C3 Final</div>
                <div className="font-headline text-2xl font-black text-primary-container leading-none">
                  {fmt(c3BV)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/15 flex items-center justify-between">
              <span className="font-mono text-[10px] text-outline tracking-widest uppercase">
                Bonus BV vs base
              </span>
              <span className="font-headline text-lg font-bold text-amber-400">
                {deltaBV >= 0 ? '+' : ''}{fmt(deltaBV)}
              </span>
            </div>
            <p className="font-mono text-[9px] text-outline/70 mt-2 leading-relaxed">
              Cadena: BV publicado → ajuste por skills (G/P) → ajuste por red C3 (×{multiplier.toFixed(2)} si N={n}). Cada mech aporta su BV final al total.
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
                <span className="text-amber-400 font-bold">{mastersCount} × 1,5M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Slaves:</span>
                <span className="text-on-surface">{slavesCount} × 250k</span>
              </div>
              <div className="border-t border-outline-variant/15 pt-1.5 mt-2">
                <div className="flex justify-between">
                  <span className="text-outline">Coste:</span>
                  <span className="text-primary-container font-bold">{fmt(cost)} ₡</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Tons:</span>
                  <span className="text-on-surface">{tons} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Crits:</span>
                  <span className="text-on-surface">{crits}</span>
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
          <li>Cada Master controla sí mismo + 3 Slaves. Masters mínimos: 1-4→1, 5-8→3, 9-12→4</li>
          <li>Multiplicador BV C3 lineal: 1+0.05·N (N=2→1.10, N=12→1.60)</li>
          <li>Skill BV (TacOps): G4/P5 = base (×1.00). Por cada nivel: ±20% Gunnery, ±5% Piloting</li>
          <li>Slaves comparten datos de targeting via Master (to-hit usa distancia más corta de la red)</li>
          <li>Master destruido → red colapsa (Slaves desconectados)</li>
          <li>LOS Master ↔ Slave máx 60 hex</li>
          <li>ECM enemigo interfiere la red</li>
          <li>Clic en rol (◆/○) de cada unidad para cambiar Master ↔ Slave manualmente</li>
        </ul>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TALLER PAGE — Pagina standalone (sidebar). Hospeda TallerModal
//  como contenido principal (tab Factura) y sistema priorizacion
//  de reparaciones por tiempo (tab Prioridades).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { TallerModal, genId, getCampaignDateISO } from '@/pages/FinanzasPage';
import { commitLibroEntryAndTreasury, loadPersonal, type PersonalEntry, type PersonalNivel } from '@/lib/sheets-service';
import { useAppStore } from '@/lib/store';
import { loadLocalSnapshot } from '@/lib/simulador-persistence';
import { deriveDamageFromSession } from '@/lib/repair-engine';
import {
  PRESETS, calcularMinutosDisponibles, aplicarPreset, calcularReparaciones,
  mapearDamageARepairItems, MINUTOS_POR_PUNTO_BLINDAJE,
  agregarPersonal, bayMultiplier, aplicarMultiplierBay, listarBays,
  type Preset, type OrdenSecundario, type RepairItem, type ResultadoItem,
  type UnidadTiempo,
} from '@/lib/repair-priority';

export function TallerPage() {
  const { activeSubTab, setActiveSubTab, campaign } = useAppStore();
  const view: 'factura' | 'prioridades' = activeSubTab === 'factura' ? 'factura' : 'prioridades';

  useEffect(() => {
    if (activeSubTab !== 'factura' && activeSubTab !== 'prioridades') {
      setActiveSubTab('prioridades');
    }
  }, [activeSubTab, setActiveSubTab]);

  const campaignDate = useMemo(
    () => getCampaignDateISO(campaign?.campaignYear, campaign?.campaignMonth),
    [campaign?.campaignYear, campaign?.campaignMonth],
  );

  if (view === 'prioridades') return <PrioridadesTab />;

  return (
    <div className="p-4 sm:p-6 animate-[fadeInUp_0.3s_ease]">
      <TallerInlineWrapper campaignDate={campaignDate} />
    </div>
  );
}

function TallerInlineWrapper({ campaignDate }: { campaignDate: string }) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <TallerModal
      key={resetKey}
      inline
      campaignDate={campaignDate}
      onClose={() => setResetKey(k => k + 1)}
      onCommit={async (total, concepto, mechName) => {
        await commitLibroEntryAndTreasury({
          id: genId('lm'),
          fecha: campaignDate,
          concepto,
          cantidad: Math.round(total),
          tipo: 'gasto',
          categoria: 'repuestos',
          nota: `Reparación ${mechName} · Taller`,
          jugador: '',
        });
        setResetKey(k => k + 1);
      }}
    />
  );
}

// ══════════════════════════════════════════════════════════
//  TAB PRIORIDADES
// ══════════════════════════════════════════════════════════

function PrioridadesTab() {
  // ── Selector de mech (del simulador) ──
  const [simSlotIdx, setSimSlotIdx] = useState<number | null>(null);
  const simSlots = useMemo(() => {
    const snap = loadLocalSnapshot();
    if (!snap) return [];
    return snap.mechSlots
      .map((s, i) => ({ slot: s, idx: i }))
      .filter(({ slot }) => slot?.state && slot?.session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simSlotIdx]);

  // ── Tiempo disponible ──
  const [valor, setValor] = useState(3);
  const [unidad, setUnidad] = useState<UnidadTiempo>('dias');
  const [turnosExt, setTurnosExt] = useState(0);

  const tiempoCalc = useMemo(
    () => calcularMinutosDisponibles({ valor, unidad, turnosExtendidos: turnosExt }),
    [valor, unidad, turnosExt],
  );

  // ── Preset + orden ──
  const [presetId, setPresetId] = useState<string>('persecucion');
  const [ordenSec, setOrdenSec] = useState<OrdenSecundario>('asc');
  const preset: Preset = PRESETS.find(p => p.id === presetId) ?? PRESETS[0];

  // ── Personal (techs + astechs) ──
  const [personal, setPersonal] = useState<PersonalEntry[]>([]);
  useEffect(() => {
    loadPersonal().then(res => {
      if (res?.success && Array.isArray((res.data as any)?.entries)) {
        setPersonal((res.data as any).entries as PersonalEntry[]);
      }
    }).catch(() => {});
  }, []);

  const personalAgg = useMemo(() => agregarPersonal(personal), [personal]);
  const baysDisponibles = useMemo(() => listarBays(personal), [personal]);

  // Bay del mech actual: por defecto primer bay disponible + 6 astechs (canon).
  const [bayTechSkill, setBayTechSkill] = useState<PersonalNivel>('regular');
  const [bayAstechs, setBayAstechs] = useState(6);

  useEffect(() => {
    if (baysDisponibles.length > 0) {
      setBayTechSkill(baysDisponibles[0].skill);
    }
    setBayAstechs(Math.min(6, personalAgg.totalAstechs));
  }, [baysDisponibles, personalAgg.totalAstechs]);

  const bayMult = useMemo(() => bayMultiplier(bayTechSkill, bayAstechs), [bayTechSkill, bayAstechs]);

  // ── Construir items desde mech seleccionado ──
  const baseItems = useMemo<RepairItem[]>(() => {
    if (simSlotIdx === null) return [];
    const snap = loadLocalSnapshot();
    const slot = snap?.mechSlots[simSlotIdx];
    if (!slot?.state || !slot?.session) return [];
    const { damage } = deriveDamageFromSession(slot.state, slot.session);
    return mapearDamageARepairItems(damage, slot.state.tonnage);
  }, [simSlotIdx]);

  // Aplica multiplier de bay a los tiempos base.
  const itemsAjustados = useMemo(
    () => aplicarMultiplierBay(baseItems, bayMult),
    [baseItems, bayMult],
  );

  const orderedItems = useMemo(
    () => aplicarPreset(itemsAjustados, preset, ordenSec),
    [itemsAjustados, preset, ordenSec],
  );

  const resultado = useMemo(
    () => calcularReparaciones(orderedItems, tiempoCalc.minutosDisponibles, tiempoCalc.minutosBase),
    [orderedItems, tiempoCalc.minutosDisponibles, tiempoCalc.minutosBase],
  );

  return (
    <div className="p-4 sm:p-6 animate-[fadeInUp_0.3s_ease] max-w-6xl mx-auto">
      <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mb-4">
        Prioridades de reparación
      </h1>

      {/* Selector mech del simulador */}
      <section className="mb-4 bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
        <label className="block font-mono text-[10px] uppercase tracking-widest text-secondary/60 mb-2">
          Mech del simulador
        </label>
        <select
          value={simSlotIdx ?? ''}
          onChange={e => setSimSlotIdx(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-[11px] text-secondary"
        >
          <option value="">— Seleccionar —</option>
          {simSlots.map(({ slot, idx }) => (
            <option key={idx} value={idx}>
              SLOT {idx + 1}: {slot.state!.chassis} {slot.state!.model}
            </option>
          ))}
        </select>
        {simSlots.length === 0 && (
          <p className="font-mono text-[9px] text-secondary/50 mt-2 italic">
            No hay mechs cargados en simulador. Carga uno primero.
          </p>
        )}
      </section>

      <div className="grid md:grid-cols-4 gap-4">
        {/* Time Input */}
        <TimeInputPanel
          valor={valor} setValor={setValor}
          unidad={unidad} setUnidad={setUnidad}
          turnosExt={turnosExt} setTurnosExt={setTurnosExt}
          turnosMax={tiempoCalc.turnosMax}
          minutosBase={tiempoCalc.minutosBase}
          minutosExtra={tiempoCalc.minutosExtra}
          minutosDisponibles={tiempoCalc.minutosDisponibles}
        />

        {/* Bay (equipo reparacion) */}
        <BayPanel
          totalTechs={personalAgg.totalTechs}
          totalAstechs={personalAgg.totalAstechs}
          techsBySkill={personalAgg.techsBySkill}
          bayTechSkill={bayTechSkill} setBayTechSkill={setBayTechSkill}
          bayAstechs={bayAstechs} setBayAstechs={setBayAstechs}
          bayMult={bayMult}
        />

        {/* Preset Selector */}
        <PresetSelector
          presetId={presetId} setPresetId={setPresetId}
          ordenSec={ordenSec} setOrdenSec={setOrdenSec}
        />

        {/* Budget Bar */}
        <BudgetBar
          minutosBase={tiempoCalc.minutosBase}
          minutosExtra={tiempoCalc.minutosExtra}
          minutosUsadosTotal={resultado.minutosUsadosTotal}
        />
      </div>

      {/* Lista items + resultados */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <RepairItemList
          items={orderedItems}
          resultados={resultado.resultados}
        />
        <ResultsSummary resultado={resultado} />
      </div>
    </div>
  );
}

// ── TimeInputPanel ──

function TimeInputPanel(p: {
  valor: number; setValor: (v: number) => void;
  unidad: UnidadTiempo; setUnidad: (u: UnidadTiempo) => void;
  turnosExt: number; setTurnosExt: (n: number) => void;
  turnosMax: number;
  minutosBase: number; minutosExtra: number; minutosDisponibles: number;
}) {
  return (
    <section className="bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
      <h2 className="font-headline text-xs font-bold text-primary-container tracking-widest uppercase mb-3">
        Tiempo disponible
      </h2>
      <div className="flex gap-2 mb-2">
        <input
          type="number" min={0} value={p.valor || ''}
          onFocus={e => e.target.select()}
          onChange={e => p.setValor(parseInt(e.target.value) || 0)}
          className="flex-1 bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-sm text-secondary"
        />
        <select
          value={p.unidad} onChange={e => p.setUnidad(e.target.value as UnidadTiempo)}
          className="bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-[11px] text-secondary"
        >
          <option value="horas">horas</option>
          <option value="dias">días</option>
          <option value="semanas">semanas</option>
          <option value="meses">meses</option>
        </select>
      </div>
      <label className="block font-mono text-[9px] uppercase tracking-widest text-secondary/60 mb-1">
        Turnos extendidos (16h) — máx {p.turnosMax}
      </label>
      <input
        type="number" min={0} max={p.turnosMax}
        value={p.turnosExt || ''}
        onFocus={e => e.target.select()}
        onChange={e => p.setTurnosExt(Math.min(p.turnosMax, parseInt(e.target.value) || 0))}
        className="w-full bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-sm text-secondary mb-2"
      />
      <div className="font-mono text-[10px] text-secondary/70 space-y-1">
        <div>Base: <span className="text-primary">{p.minutosBase}</span> min</div>
        <div>Extra: <span className="text-error">{p.minutosExtra}</span> min</div>
        <div className="pt-1 border-t border-outline-variant/30">
          Total: <span className="text-primary-container font-bold">{p.minutosDisponibles}</span> min
          <span className="text-secondary/50 ml-2">({Math.round(p.minutosDisponibles / 60)}h)</span>
        </div>
      </div>
    </section>
  );
}

// ── PresetSelector ──

function PresetSelector(p: {
  presetId: string; setPresetId: (id: string) => void;
  ordenSec: OrdenSecundario; setOrdenSec: (o: OrdenSecundario) => void;
}) {
  const isManual = p.presetId === 'manual';
  return (
    <section className="bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
      <h2 className="font-headline text-xs font-bold text-primary-container tracking-widest uppercase mb-3">
        Preset
      </h2>
      <div className="space-y-2 mb-3">
        {PRESETS.map(pr => (
          <button
            key={pr.id}
            onClick={() => p.setPresetId(pr.id)}
            className={`w-full text-left px-2 py-1.5 border font-mono text-[10px] uppercase tracking-widest transition-colors ${
              p.presetId === pr.id
                ? 'border-primary-container bg-primary-container/15 text-primary-container'
                : 'border-outline-variant/40 text-secondary/70 hover:border-primary-container/60'
            }`}
          >{pr.nombre}</button>
        ))}
      </div>
      <label className="block font-mono text-[9px] uppercase tracking-widest text-secondary/60 mb-1">
        Orden secundario
      </label>
      <div className="grid grid-cols-3 gap-1">
        {(['asc', 'desc', 'manual'] as OrdenSecundario[]).map(o => (
          <button
            key={o}
            disabled={isManual}
            onClick={() => p.setOrdenSec(o)}
            className={`px-1.5 py-1 border font-mono text-[9px] uppercase transition-colors ${
              p.ordenSec === o
                ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                : 'border-outline-variant/40 text-secondary/60 hover:border-amber-400/40'
            } disabled:opacity-30`}
          >{o === 'asc' ? '↑' : o === 'desc' ? '↓' : '='}</button>
        ))}
      </div>
    </section>
  );
}

// ── BudgetBar ──

// ── BayPanel ──

function BayPanel(p: {
  totalTechs: number;
  totalAstechs: number;
  techsBySkill: Record<PersonalNivel, number>;
  bayTechSkill: PersonalNivel;
  setBayTechSkill: (n: PersonalNivel) => void;
  bayAstechs: number;
  setBayAstechs: (n: number) => void;
  bayMult: number;
}) {
  const noViable = p.totalTechs === 0;
  const multPct = Math.round((p.bayMult - 1) * 100);
  return (
    <section className="bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
      <h2 className="font-headline text-xs font-bold text-primary-container tracking-widest uppercase mb-3">
        Equipo Reparación
      </h2>
      {noViable ? (
        <p className="font-mono text-[10px] text-error italic">
          Sin Mech Techs activos. No se puede reparar.
        </p>
      ) : (
        <>
          <label className="block font-mono text-[9px] uppercase tracking-widest text-secondary/60 mb-1">
            Tech (skill)
          </label>
          <select
            value={p.bayTechSkill}
            onChange={e => p.setBayTechSkill(e.target.value as PersonalNivel)}
            className="w-full bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-[11px] text-secondary mb-2"
          >
            {(['green', 'regular', 'veteran', 'elite'] as PersonalNivel[]).map(n => (
              <option key={n} value={n} disabled={(p.techsBySkill[n] ?? 0) === 0}>
                {n} ({p.techsBySkill[n] ?? 0} disp)
              </option>
            ))}
          </select>

          <label className="block font-mono text-[9px] uppercase tracking-widest text-secondary/60 mb-1">
            AsTechs asignados (de {p.totalAstechs})
          </label>
          <input
            type="number" min={0} max={p.totalAstechs}
            value={p.bayAstechs || ''}
            onFocus={e => e.target.select()}
            onChange={e => p.setBayAstechs(Math.min(p.totalAstechs, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-full bg-surface-container border border-outline-variant/40 px-2 py-1 font-mono text-sm text-secondary mb-2"
          />

          <div className="font-mono text-[10px] text-secondary/70 space-y-1">
            <div>
              Multiplier:{' '}
              <span className={p.bayMult < 1 ? 'text-primary font-bold' : p.bayMult > 1.25 ? 'text-error font-bold' : 'text-amber-400'}>
                ×{p.bayMult.toFixed(2)}
              </span>
              <span className="text-secondary/50 ml-1">
                ({multPct > 0 ? `+${multPct}` : multPct}% tiempo)
              </span>
            </div>
            <div className="text-secondary/50 text-[9px]">
              Canon: 1 Tech + 6 AsTech = ×1.00
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function BudgetBar(p: { minutosBase: number; minutosExtra: number; minutosUsadosTotal: number }) {
  const total = p.minutosBase + p.minutosExtra;
  const pctBase = total > 0 ? Math.min(100, (Math.min(p.minutosUsadosTotal, p.minutosBase) / total) * 100) : 0;
  const pctExtra = total > 0 ? Math.min(100, (Math.max(0, p.minutosUsadosTotal - p.minutosBase) / total) * 100) : 0;
  return (
    <section className="bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
      <h2 className="font-headline text-xs font-bold text-primary-container tracking-widest uppercase mb-3">
        Presupuesto
      </h2>
      <div className="h-6 bg-surface-container border border-outline-variant/40 relative overflow-hidden mb-2">
        <div className="absolute top-0 bottom-0 bg-primary/70" style={{ left: 0, width: `${pctBase}%` }} />
        <div className="absolute top-0 bottom-0 bg-error/70" style={{ left: `${pctBase}%`, width: `${pctExtra}%` }} />
      </div>
      <div className="font-mono text-[10px] text-secondary/70 space-y-1">
        <div>Usados: <span className="text-primary-container font-bold">{p.minutosUsadosTotal}</span> min</div>
        <div>Restantes: <span className="text-secondary">{Math.max(0, total - p.minutosUsadosTotal)}</span> min</div>
      </div>
    </section>
  );
}

// ── RepairItemList ──

function RepairItemList({ items, resultados }: { items: RepairItem[]; resultados: ResultadoItem[] }) {
  const resultadoMap = new Map(resultados.map(r => [r.item.id, r]));
  return (
    <section className="bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
      <h2 className="font-headline text-xs font-bold text-primary-container tracking-widest uppercase mb-3">
        Reparaciones ({items.length})
      </h2>
      {items.length === 0 && (
        <p className="font-mono text-[10px] text-secondary/50 italic">
          Sin daños registrados. Selecciona un mech con combate previo.
        </p>
      )}
      <ul className="space-y-1.5">
        {items.map(it => {
          const r = resultadoMap.get(it.id);
          const estado = r?.estado ?? 'pendiente';
          const bg =
            estado === 'reparado' ? 'border-primary/60 bg-primary/5' :
            estado === 'parcial'  ? 'border-amber-400/60 bg-amber-400/5' :
            'border-error/40 bg-error/5';
          return (
            <li key={it.id} className={`border ${bg} p-2 flex items-center gap-2`}>
              <span className="font-mono text-[9px] text-secondary/60 w-14 uppercase">{it.categoria}</span>
              <span className="font-mono text-[10px] text-secondary flex-1 truncate">{it.nombre}</span>
              <span className="font-mono text-[9px] text-secondary/60">{it.localizacion}</span>
              <span className="font-mono text-[10px] text-primary-container font-bold w-14 text-right">{it.tiempoBase}min</span>
              <span className={`font-mono text-[8px] uppercase tracking-widest w-12 text-right ${
                estado === 'reparado' ? 'text-primary' :
                estado === 'parcial'  ? 'text-amber-400' :
                'text-error'
              }`}>{estado.slice(0,4)}{r?.riesgoFatiga ? '⚠' : ''}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── ResultsSummary ──

function ResultsSummary({ resultado }: { resultado: ReturnType<typeof calcularReparaciones> }) {
  const rep = resultado.resultados.filter(r => r.estado === 'reparado');
  const par = resultado.resultados.filter(r => r.estado === 'parcial');
  const pen = resultado.resultados.filter(r => r.estado === 'pendiente');
  const blindajePts = rep.filter(r => r.item.divisible).reduce((s, r) => s + (r.puntosReparados ?? 0), 0)
                   + par.filter(r => r.item.divisible).reduce((s, r) => s + (r.puntosReparados ?? 0), 0);

  return (
    <section className="bg-surface-container-low border-l-2 border-primary-container/30 p-3 clip-chamfer">
      <h2 className="font-headline text-xs font-bold text-primary-container tracking-widest uppercase mb-3">
        Resumen
      </h2>
      <div className="grid grid-cols-3 gap-2 mb-3 font-mono text-[10px]">
        <div className="border border-primary/40 bg-primary/5 p-2">
          <div className="text-primary uppercase tracking-widest text-[8px]">Reparado</div>
          <div className="text-primary font-bold text-base">{rep.length}</div>
        </div>
        <div className="border border-amber-400/40 bg-amber-400/5 p-2">
          <div className="text-amber-400 uppercase tracking-widest text-[8px]">Parcial</div>
          <div className="text-amber-400 font-bold text-base">{par.length}</div>
        </div>
        <div className="border border-error/40 bg-error/5 p-2">
          <div className="text-error uppercase tracking-widest text-[8px]">Pendiente</div>
          <div className="text-error font-bold text-base">{pen.length}</div>
        </div>
      </div>
      <div className="font-mono text-[10px] text-secondary/70 space-y-1">
        <div>Min usados: <span className="text-primary">{resultado.minutosUsadosTotal}</span></div>
        <div>Min libres: <span className="text-secondary">{resultado.minutosSinUsar}</span></div>
        {blindajePts > 0 && <div>Blindaje recuperado: <span className="text-primary-container">{blindajePts} pts</span></div>}
        {resultado.minutosSinUsar > 0 && resultado.pendientesBlindaje?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-outline-variant/30 text-amber-400 text-[9px]">
            Sobran {resultado.minutosSinUsar} min (~{Math.floor(resultado.minutosSinUsar / MINUTOS_POR_PUNTO_BLINDAJE)} pts blindaje). Próxima iter: ArmorOfferPanel.
          </div>
        )}
      </div>
    </section>
  );
}

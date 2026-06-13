// ══════════════════════════════════════════════════════════════
//  FINANZAS — Libro Mayor + Personal
//  Tabs: libro-mayor / personal
//  Paleta: amber (civil/contable)
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useViewport } from '@/hooks/useViewport';
import { isActivo } from '@/lib/roster';
import { calcSalary, RANK_LABELS, type Quality } from '@/lib/salary-calc';
import { calcHangarMonthlyMaintenance, mechWeightClass, type HangarUnit, type UnitClass } from '@/lib/maintenance-calc';
import {
  getAcquisitionPrice, getPriceLabel,
  ACQUISITION_KINDS, WEIGHT_CLASSES as ACQ_WEIGHT_CLASSES, LEVELS as ACQ_LEVELS,
  classifyMechWeight,
  type AcquisitionKind, type MechWeightClass, type ExperienceLevel,
} from '@/lib/asset-prices';
import { useMechCatalog, findMechByName, type CatalogMech } from '@/hooks/useMechCatalog';
import {
  calcRepairCostBySystem, configFromCatalog, emptyDamage, deriveDamageFromSession,
  ESTADO_FACTURA_PCT, ESTADO_COLOR,
  PRECIO_ACTUADOR,
  type MechRepairConfig, type MechRepairDamage, type RepairBreakdown, type RepairSystem,
} from '@/lib/repair-engine';
import { loadLocalSnapshot, restoreMechSlotFull } from '@/lib/simulador-persistence';
import { sendTelegramNotif, getTelegramToggle, exceedsTesoreriaUmbral } from '@/lib/telegram-service';
import { TelegramToggle } from '@/components/ui/TelegramToggle';
import type { MechSlot } from '@/lib/combat-types';
import {
  loadLibroMayor, commitLibroEntryAndTreasury, deleteLibroEntryAndTreasury,
  loadPersonal, savePersonalEntry, deletePersonalEntry,
  type LibroMayorEntry, type LibroMayorCategoria, type LibroMayorTipo,
  type PersonalEntry, type PersonalRol, type PersonalNivel, type PersonalEstado,
} from '@/lib/sheets-service';

// ── Paleta ─────────────────────────────────────────────────
const T = {
  void:       '#0a0e14',
  surface:    '#10141a',
  surfaceLow: '#181c22',
  outlineV:   '#4e453a',
  gold:       '#ffd79b',
  bronze:     '#c79764',
  cream:      '#e8d5b8',
  creamHi:    '#fff1d6',
  bone:       '#d1c5b6',
  bloodLight: '#ffb4ab',
  greenDeep:  '#9bd28a',
  outline:    '#9a8f81',
};

// ── Catálogos ──────────────────────────────────────────────
const CATEGORIAS: { key: LibroMayorCategoria; label: string; tipo: LibroMayorTipo }[] = [
  { key: 'contrato_secundario',    label: 'Contrato secundario',  tipo: 'ingreso' },
  { key: 'venta_mech',             label: 'Venta de Mech',         tipo: 'ingreso' },
  { key: 'ingreso_misc',           label: 'Ingreso varios',         tipo: 'ingreso' },
  { key: 'compra_mech',            label: 'Compra de Mech',         tipo: 'gasto'   },
  { key: 'repuestos',              label: 'Repuestos',              tipo: 'gasto'   },
  { key: 'sueldo_extra',           label: 'Sueldo extra',           tipo: 'gasto'   },
  { key: 'mantenimiento_mensual',  label: 'Mantenimiento mensual',  tipo: 'gasto'   },
  { key: 'soborno',                label: 'Soborno',                tipo: 'gasto'   },
  { key: 'gasto_misc',             label: 'Gasto varios',           tipo: 'gasto'   },
];

const ROLES: { key: PersonalRol; label: string; sueldoDefault: number }[] = [
  { key: 'mech_tech',            label: 'Mech Tech',            sueldoDefault: 800   },
  { key: 'astech',               label: 'Astech',               sueldoDefault: 100   },
  { key: 'medico',               label: 'Médico',                sueldoDefault: 200   },
  { key: 'representante',        label: 'Representante',         sueldoDefault: 1500  },
  { key: 'seguridad',            label: 'Seguridad',             sueldoDefault: 300   },
  { key: 'administrativo',       label: 'Administrativo',         sueldoDefault: 400   },
  { key: 'infanteria',           label: 'Infantería',             sueldoDefault: 150   },
  { key: 'tripulacion_vehiculo', label: 'Tripulación vehículo',   sueldoDefault: 200   },
  { key: 'tripulacion_nave',     label: 'Tripulación nave',       sueldoDefault: 500   },
  { key: 'piloto_aerospace',     label: 'Piloto aerospace',       sueldoDefault: 4000  },
  { key: 'battle_armor',         label: 'Battle Armor',           sueldoDefault: 1500  },
  { key: 'quartermaster',        label: 'Quartermaster',          sueldoDefault: 600   },
  { key: 'oficial_radio',        label: 'Oficial de comms',       sueldoDefault: 350   },
  { key: 'comstar_liaison',      label: 'Comstar Liaison',        sueldoDefault: 2000  },
  { key: 'ingeniero_combate',    label: 'Ingeniero de combate',   sueldoDefault: 500   },
  { key: 'intel_officer',        label: 'Oficial de inteligencia', sueldoDefault: 1200 },
  { key: 'chaplain',             label: 'Capellán',                sueldoDefault: 250   },
  { key: 'otros',                label: 'Otros',                   sueldoDefault: 0     },
];

const NIVELES: { key: PersonalNivel; label: string; mult: number }[] = [
  { key: 'green',   label: 'Green',   mult: 0.5 },
  { key: 'regular', label: 'Regular', mult: 1.0 },
  { key: 'veteran', label: 'Veteran', mult: 1.5 },
  { key: 'elite',   label: 'Elite',   mult: 2.0 },
];

const ESTADOS: PersonalEstado[] = ['activo', 'baja', 'kia', 'retirado'];

// ── Helpers ────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-ES').format(Math.round(n)) + ' ₡';

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return iso.slice(0, 10); }
};

export const genId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** Fecha de campaña como YYYY-MM-DD (día 1 por defecto, sin tener campaignDay). */
export function getCampaignDateISO(year: number | undefined, month: number | undefined): string {
  const y = year ?? new Date().getFullYear();
  const m = month ?? 1;
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

const rolLabel = (k: PersonalRol) => ROLES.find(r => r.key === k)?.label ?? k;
const catLabel = (k: LibroMayorCategoria) => CATEGORIAS.find(c => c.key === k)?.label ?? k;

// ══════════════════════════════════════════════════════════
//  Componente principal
// ══════════════════════════════════════════════════════════

export function FinanzasPage() {
  const { activeSubTab, setActiveSubTab, campaign, roster, setFinanzasPendingModal } = useAppStore();
  // Defaults: si la sub-tab activa no es de Finanzas, mostramos 'home'
  const view: 'home' | 'libro-mayor' | 'personal' =
    activeSubTab === 'libro-mayor' ? 'libro-mayor'
    : activeSubTab === 'personal'  ? 'personal'
    : 'home';
  const campaignDate = getCampaignDateISO(campaign?.campaignYear, campaign?.campaignMonth);

  const goToLibroWithModal = (modal: 'taller' | 'compras' | 'projector' | null) => {
    if (modal) setFinanzasPendingModal(modal);
    setActiveSubTab('libro-mayor');
  };

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      background: T.void, color: T.cream,
      fontFamily: 'Inter, sans-serif',
      padding: '16px 24px 36px',
    }}>
      {/* Barra de acciones fija para TODAS las sub-secciones */}
      <FinanzasActionBar
        activeView={view}
        onHome={()      => { setFinanzasPendingModal(null); setActiveSubTab('home'); }}
        onLibro={()     => { setFinanzasPendingModal(null); setActiveSubTab('libro-mayor'); }}
        onCompras={()   => goToLibroWithModal('compras')}
        onTaller={()    => goToLibroWithModal('taller')}
        onPersonal={()  => setActiveSubTab('personal')}
        onProjector={() => goToLibroWithModal('projector')}
      />

      {view === 'home' && <FinanzasHome />}
      {view === 'libro-mayor' && (
        <LibroMayorTab campaignDate={campaignDate} campaignYear={campaign?.campaignYear ?? 3026} campaignMonth={campaign?.campaignMonth ?? 1} roster={roster} />
      )}
      {view === 'personal' && <PersonalTab campaignDate={campaignDate} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  ACTION BAR — siempre visible, todas las sub-secciones
// ══════════════════════════════════════════════════════════

interface FinanzasActionBarProps {
  activeView: 'home' | 'libro-mayor' | 'personal';
  onHome:      () => void;
  onLibro:     () => void;
  onCompras:   () => void;
  onTaller:    () => void;
  onPersonal:  () => void;
  onProjector: () => void;
}

function FinanzasActionBar({ activeView, onHome, onLibro, onCompras, onTaller, onPersonal, onProjector }: FinanzasActionBarProps) {
  const BTN_BASE: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    background: T.void,
    border: `1px solid ${T.gold}`,
    color: T.gold,
    cursor: 'pointer',
    fontFamily: '"Share Tech Mono", monospace',
    fontSize: 11, letterSpacing: 2, fontWeight: 700,
    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
  };
  const active = (on: boolean): React.CSSProperties => on
    ? { ...BTN_BASE, background: `${T.gold}25`, color: T.creamHi }
    : BTN_BASE;

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      marginBottom: 20, paddingBottom: 14,
      borderBottom: `1px solid ${T.outlineV}`,
    }}>
      <button style={active(activeView === 'home')} onClick={onHome} title="Histórico">
        📒 INICIO
      </button>
      <button style={active(activeView === 'libro-mayor')} onClick={onLibro}>
        📒 LIBRO DE CUENTAS
      </button>
      <button style={BTN_BASE} onClick={onCompras}>🛒 COMPRAS</button>
      <button style={BTN_BASE} onClick={onTaller}>🔧 TALLER</button>
      <button style={active(activeView === 'personal')} onClick={onPersonal}>
        👥 PERSONAL
      </button>
      <button style={BTN_BASE} onClick={onProjector}>📊 PROYECTAR MES</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PORTADA — histórico movimientos
// ══════════════════════════════════════════════════════════

function FinanzasHome() {
  const { setActiveSubTab } = useAppStore();
  const [entries, setEntries] = useState<LibroMayorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LibroMayorEntry | null>(null);

  const refresh = async () => {
    setLoading(true);
    const res = await loadLibroMayor();
    if (res.success && Array.isArray((res.data as any)?.entries)) {
      setEntries((res.data as any).entries as LibroMayorEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  // Últimos 30 ordenados por fecha desc
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 30),
    [entries],
  );

  const totalIngresos = sorted.filter(e => e.tipo === 'ingreso').reduce((s, e) => s + (e.cantidad || 0), 0);
  const totalGastos   = sorted.filter(e => e.tipo === 'gasto').reduce((s, e) => s + (e.cantidad || 0), 0);
  const balance       = totalIngresos - totalGastos;

  const handleSave = async () => {
    if (!editing) return;
    const payload = { ...editing, id: editing.id || genId('lm') };
    const prevEntry = editing.id ? entries.find(e => e.id === editing.id) ?? null : null;
    setEditorOpen(false);
    setEditing(null);
    await commitLibroEntryAndTreasury(payload, prevEntry);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar entrada del Libro Mayor?')) return;
    const entry = entries.find(e => e.id === id);
    if (entry) await deleteLibroEntryAndTreasury(entry);
    refresh();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <SmallLabel>Histórico · últimas 30 entradas del Libro Mayor</SmallLabel>
        <h1 style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 28, fontWeight: 800, color: T.creamHi,
          margin: '6px 0 0', letterSpacing: -0.4,
        }}>HISTÓRICO DE MOVIMIENTOS</h1>
      </div>

      {/* KPIs resumen (sobre lo visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <Kpi label="Ingresos visibles" value={fmtMoney(totalIngresos)} color={T.greenDeep} />
        <Kpi label="Gastos visibles"   value={fmtMoney(totalGastos)}   color={T.bloodLight} />
        <Kpi label="Balance"           value={fmtMoney(balance)}        color={balance >= 0 ? T.greenDeep : T.bloodLight} />
      </div>

      {/* Editor inline */}
      {editorOpen && editing && (
        <div style={{ marginBottom: 18 }}>
          <LibroMayorEditor
            entry={editing}
            setEntry={setEditing}
            onSave={handleSave}
            onCancel={() => { setEditorOpen(false); setEditing(null); }}
          />
        </div>
      )}

      {/* Tabla histórico */}
      <div style={{ background: T.surface, border: `1px solid ${T.outlineV}` }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '100px 80px 1fr 130px 110px',
          padding: '10px 14px', gap: 12,
          borderBottom: `1px solid ${T.outlineV}`,
          fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 2,
        }}>
          <div>FECHA</div>
          <div>TIPO</div>
          <div>CONCEPTO</div>
          <div style={{ textAlign: 'right' }}>CANTIDAD ₡</div>
          <div style={{ textAlign: 'right' }}>ACCIONES</div>
        </div>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: T.outline, fontFamily: '"Share Tech Mono", monospace', fontSize: 11 }}>
            Cargando histórico…
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: T.outline, fontFamily: '"Share Tech Mono", monospace', fontSize: 11 }}>
            Sin entradas registradas
          </div>
        )}

        {!loading && sorted.map((e, i) => {
          const isIngreso = e.tipo === 'ingreso';
          const color     = isIngreso ? T.greenDeep : T.bloodLight;
          const fechaShort = e.fecha
            ? new Date(e.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
            : '—';
          return (
            <div key={e.id || i} style={{
              display: 'grid', gridTemplateColumns: '100px 80px 1fr 130px 110px',
              padding: '8px 14px', gap: 12, alignItems: 'center',
              borderBottom: i < sorted.length - 1 ? `1px solid ${T.outlineV}40` : 'none',
              fontFamily: 'Inter, sans-serif', fontSize: 12,
            }}>
              <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.bone }}>{fechaShort}</div>
              <div style={{
                fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1,
                color,
              }}>{isIngreso ? '➕ INGR' : '➖ GAST'}</div>
              <div style={{ color: T.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={e.nota || ''}>
                {e.concepto || '—'}
              </div>
              <div style={{
                fontFamily: '"Share Tech Mono", monospace', fontSize: 12, fontWeight: 700,
                textAlign: 'right', color,
              }}>
                {isIngreso ? '+' : '−'}{fmtMoney(Math.abs(e.cantidad || 0))}
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditing({ ...e }); setEditorOpen(true); }} style={smallBtn(T.gold)}>EDIT</button>
                <button onClick={() => handleDelete(e.id)} style={smallBtn(T.bloodLight)}>×</button>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > 30 && !loading && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button onClick={() => setActiveSubTab('libro-mayor')} style={{
            background: 'transparent', border: 'none',
            color: T.gold, cursor: 'pointer',
            fontFamily: '"Share Tech Mono", monospace', fontSize: 11, letterSpacing: 2,
            textDecoration: 'underline',
          }}>
            VER LIBRO MAYOR COMPLETO ({entries.length} entradas) →
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  LIBRO MAYOR
// ══════════════════════════════════════════════════════════

interface LibroMayorTabProps {
  campaignDate: string;
  campaignYear: number;
  campaignMonth: number;
  roster: any[];
}

function LibroMayorTab({ campaignDate, campaignYear, campaignMonth, roster }: LibroMayorTabProps) {
  const { finanzasPendingModal, setFinanzasPendingModal, tallerAutoLoadSlot, setTallerAutoLoadSlot } = useAppStore();
  const [entries, setEntries] = useState<LibroMayorEntry[]>([]);
  const [personal, setPersonal] = useState<PersonalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LibroMayorEntry | null>(null);
  const [filterCat, setFilterCat] = useState<LibroMayorCategoria | 'all'>('all');
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [acqOpen, setAcqOpen] = useState(false);
  const [tallerOpen, setTallerOpen] = useState(false);

  // Consume señal de la portada — abre modal pedido al entrar
  useEffect(() => {
    if (!finanzasPendingModal) return;
    if (finanzasPendingModal === 'taller')     setTallerOpen(true);
    else if (finanzasPendingModal === 'compras')   setAcqOpen(true);
    else if (finanzasPendingModal === 'projector') setProjectorOpen(true);
    setFinanzasPendingModal(null);
  }, [finanzasPendingModal, setFinanzasPendingModal]);

  const refresh = async () => {
    setLoading(true);
    const [resLm, resPers] = await Promise.all([loadLibroMayor(), loadPersonal()]);
    if (resLm.success && Array.isArray((resLm.data as any)?.entries)) {
      setEntries((resLm.data as any).entries as LibroMayorEntry[]);
    }
    if (resPers.success && Array.isArray((resPers.data as any)?.entries)) {
      setPersonal((resPers.data as any).entries as PersonalEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const visible = useMemo(() => {
    const sorted = [...entries].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return filterCat === 'all' ? sorted : sorted.filter(e => e.categoria === filterCat);
  }, [entries, filterCat]);

  const totalIngresos = visible
    .filter(e => e.tipo === 'ingreso')
    .reduce((s, e) => s + (e.cantidad || 0), 0);
  const totalGastos = visible
    .filter(e => e.tipo === 'gasto')
    .reduce((s, e) => s + (e.cantidad || 0), 0);
  const balance = totalIngresos - totalGastos;

  const openNew = () => {
    setEditing({
      id: '',
      fecha: campaignDate,
      concepto: '',
      cantidad: 0,
      tipo: 'gasto',
      categoria: 'gasto_misc',
      nota: '',
      jugador: '',
    });
    setEditorOpen(true);
  };

  const openEdit = (e: LibroMayorEntry) => {
    setEditing({ ...e });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    const payload = { ...editing, id: editing.id || genId('lm') };
    // Si era edit (id pre-existente), busca prev para calcular delta correcto
    const prevEntry = editing.id ? entries.find(e => e.id === editing.id) ?? null : null;
    setEditorOpen(false);
    setEditing(null);
    await commitLibroEntryAndTreasury(payload, prevEntry);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar entrada del Libro Mayor?')) return;
    const entry = entries.find(e => e.id === id);
    if (entry) {
      await deleteLibroEntryAndTreasury(entry);
    }
    refresh();
  };

  return (
    <>
      <Header
        title="Libro Mayor"
        subtitle="Ingresos y gastos ad-hoc fuera de misión"
        action={!editorOpen ? (
          <PrimaryBtn onClick={openNew}>+ NUEVA ENTRADA</PrimaryBtn>
        ) : null}
      />

      {acqOpen && (
        <AcquisitionModal
          campaignDate={campaignDate}
          onClose={() => setAcqOpen(false)}
          onCommit={async (price, label, level) => {
            await commitLibroEntryAndTreasury({
              id: genId('lm'),
              fecha: campaignDate,
              concepto: `${label} (${level})`,
              cantidad: Math.round(price),
              tipo: 'gasto',
              categoria: label.toLowerCase().includes('mech') ? 'compra_mech'
                       : label.toLowerCase().includes('repuestos') ? 'repuestos'
                       : 'gasto_misc',
              nota: `Adquisición tabla Hoja 28 nivel ${level}`,
              jugador: '',
            });
            setAcqOpen(false);
            refresh();
          }}
        />
      )}

      {tallerOpen && (
        <TallerModal
          campaignDate={campaignDate}
          initialSimSlotIdx={tallerAutoLoadSlot}
          onClose={() => { setTallerOpen(false); setTallerAutoLoadSlot(null); }}
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
            setTallerOpen(false);
            setTallerAutoLoadSlot(null);
            refresh();
          }}
        />
      )}

      {projectorOpen && (
        <MaintenanceModal
          roster={roster}
          personal={personal}
          campaignYear={campaignYear}
          campaignMonth={campaignMonth}
          onClose={() => setProjectorOpen(false)}
          onCommit={async (total, detalles) => {
            const fechaProyectada = getCampaignDateISO(
              campaignMonth === 12 ? campaignYear + 1 : campaignYear,
              campaignMonth === 12 ? 1 : campaignMonth + 1,
            );
            await commitLibroEntryAndTreasury({
              id: genId('lm'),
              fecha: fechaProyectada,
              concepto: `Mantenimiento mensual (sueldos + personal + mechs)`,
              cantidad: Math.round(total),
              tipo: 'gasto',
              categoria: 'mantenimiento_mensual',
              nota: detalles,
              jugador: '',
            });
            setProjectorOpen(false);
            refresh();
          }}
        />
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Kpi label="Ingresos" value={fmtMoney(totalIngresos)} color={T.greenDeep} />
        <Kpi label="Gastos"   value={fmtMoney(totalGastos)}   color={T.bloodLight} />
        <Kpi label="Balance"  value={fmtMoney(balance)}      color={balance >= 0 ? T.greenDeep : T.bloodLight} />
      </div>

      {/* Editor */}
      {editorOpen && editing && (
        <LibroMayorEditor
          entry={editing}
          setEntry={setEditing}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditing(null); }}
        />
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <FilterChip active={filterCat === 'all'} label="TODAS" onClick={() => setFilterCat('all')} />
        {CATEGORIAS.map(c => (
          <FilterChip
            key={c.key}
            active={filterCat === c.key}
            label={c.label.toUpperCase()}
            onClick={() => setFilterCat(c.key)}
            color={c.tipo === 'ingreso' ? T.greenDeep : T.bloodLight}
          />
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <EmptyState text="CARGANDO…" />
      ) : visible.length === 0 ? (
        <EmptyState text="SIN MOVIMIENTOS REGISTRADOS" />
      ) : (
        <div style={{
          border: `1px solid ${T.outlineV}`,
          background: T.surfaceLow,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                <Th>Fecha</Th>
                <Th>Concepto</Th>
                <Th>Categoría</Th>
                <Th align="right">Cantidad</Th>
                <Th>Nota</Th>
                <Th align="right" style={{ width: 90 }}>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map(e => (
                <tr key={e.id} style={{ borderTop: `1px solid ${T.outlineV}40` }}>
                  <Td mono>{fmtDate(e.fecha)}</Td>
                  <Td>{e.concepto || '—'}</Td>
                  <Td><CategoryBadge cat={e.categoria} /></Td>
                  <Td align="right" style={{
                    fontFamily: '"Share Tech Mono", monospace',
                    color: e.tipo === 'ingreso' ? T.greenDeep : T.bloodLight,
                    fontWeight: 700,
                  }}>
                    {e.tipo === 'ingreso' ? '+' : '−'}{fmtMoney(Math.abs(e.cantidad || 0))}
                  </Td>
                  <Td style={{ fontSize: 11, color: T.outline }} title={e.nota}>
                    {(e.nota || '').slice(0, 40)}
                  </Td>
                  <Td align="right">
                    <button onClick={() => openEdit(e)} style={smallBtn(T.gold)}>EDIT</button>
                    <button onClick={() => handleDelete(e.id)} style={smallBtn(T.bloodLight)}>×</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function LibroMayorEditor({ entry, setEntry, onSave, onCancel }: {
  entry: LibroMayorEntry;
  setEntry: (e: LibroMayorEntry) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const valid = entry.concepto.trim().length > 0 && entry.cantidad >= 0;

  // Normaliza fecha a YYYY-MM-DD (input date lo exige)
  const fechaInput = (entry.fecha || '').slice(0, 10);

  return (
    <div style={editorBox}>
      <SmallLabel>{entry.id ? `Editar Entrada · ${entry.id}` : 'Nueva Entrada'}</SmallLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 160px 140px', gap: 12, marginTop: 10 }}>
        <FieldLabel>Fecha (campaña)</FieldLabel>
        <FieldLabel>Concepto</FieldLabel>
        <FieldLabel>Categoría</FieldLabel>
        <FieldLabel>Cantidad ₡</FieldLabel>

        <input type="date" value={fechaInput}
          onChange={e => setEntry({ ...entry, fecha: e.target.value })}
          style={inputStyle} />
        <input type="text" value={entry.concepto}
          onChange={e => setEntry({ ...entry, concepto: e.target.value })}
          placeholder="Reparación blindaje Marauder…"
          style={inputStyle} />
        <select value={entry.categoria}
          onChange={e => {
            const cat = e.target.value as LibroMayorCategoria;
            const tipo = CATEGORIAS.find(c => c.key === cat)?.tipo ?? entry.tipo;
            setEntry({ ...entry, categoria: cat, tipo });
          }}
          style={inputStyle}>
          {CATEGORIAS.map(c => (
            <option key={c.key} value={c.key}>{c.label} ({c.tipo})</option>
          ))}
        </select>
        <input type="number" min={0} value={entry.cantidad}
          onChange={e => setEntry({ ...entry, cantidad: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <select value={entry.tipo}
            onChange={e => setEntry({ ...entry, tipo: e.target.value as LibroMayorTipo })}
            style={inputStyle}>
            <option value="ingreso">ingreso (+)</option>
            <option value="gasto">gasto (−)</option>
          </select>
        </div>
        <div>
          <FieldLabel>Jugador relacionado (opcional)</FieldLabel>
          <input type="text" value={entry.jugador}
            onChange={e => setEntry({ ...entry, jugador: e.target.value })}
            placeholder="Handle del jugador (Marcos, Jaime…)"
            style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <FieldLabel>Nota (opcional)</FieldLabel>
        <input type="text" value={entry.nota}
          onChange={e => setEntry({ ...entry, nota: e.target.value })}
          placeholder="Detalles, referencia, etc."
          style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <SecondaryBtn onClick={onCancel}>Cancelar</SecondaryBtn>
        <PrimaryBtn disabled={!valid} onClick={onSave}>{entry.id ? 'Guardar cambios' : 'Crear entrada'}</PrimaryBtn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PERSONAL
// ══════════════════════════════════════════════════════════

function PersonalTab({ campaignDate }: { campaignDate: string }) {
  const [entries, setEntries] = useState<PersonalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalEntry | null>(null);
  const [filterRol, setFilterRol] = useState<PersonalRol | 'all'>('all');

  const refresh = async () => {
    setLoading(true);
    const res = await loadPersonal();
    if (res.success && Array.isArray((res.data as any)?.entries)) {
      setEntries((res.data as any).entries as PersonalEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const visible = useMemo(() => {
    const sorted = [...entries].sort((a, b) => rolLabel(a.rol).localeCompare(rolLabel(b.rol)));
    return filterRol === 'all' ? sorted : sorted.filter(e => e.rol === filterRol);
  }, [entries, filterRol]);

  const totalSueldo = visible
    .filter(e => e.estado === 'activo')
    .reduce((s, e) => s + (e.sueldoMes || 0) * (e.cantidad || 1), 0);
  const totalCabezas = visible
    .filter(e => e.estado === 'activo')
    .reduce((s, e) => s + (e.cantidad || 1), 0);

  const openNew = () => {
    setEditing({
      id: '',
      rol: 'mech_tech',
      nombre: '',
      nivel: 'regular',
      sueldoMes: 800,
      fechaAlta: campaignDate,
      estado: 'activo',
      nota: '',
      cantidad: 1,
    });
    setEditorOpen(true);
  };

  const openEdit = (e: PersonalEntry) => {
    setEditing({ ...e });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    const payload = { ...editing, id: editing.id || genId('pers') };
    setEditorOpen(false);
    setEditing(null);
    await savePersonalEntry(payload);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar entrada de Personal?')) return;
    await deletePersonalEntry(id);
    refresh();
  };

  return (
    <>
      <Header
        title="Personal"
        subtitle="Técnicos, astechs, médicos, tripulaciones y staff de la unidad"
        action={!editorOpen ? <PrimaryBtn onClick={openNew}>+ NUEVA ENTRADA</PrimaryBtn> : null}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <Kpi label="Sueldo mensual total" value={fmtMoney(totalSueldo)} color={T.bloodLight} />
        <Kpi label="Personal activo (cabezas)" value={String(totalCabezas)} color={T.gold} />
      </div>

      {editorOpen && editing && (
        <PersonalEditor
          entry={editing}
          setEntry={setEditing}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditing(null); }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <FilterChip active={filterRol === 'all'} label="TODOS" onClick={() => setFilterRol('all')} />
        {ROLES.map(r => (
          <FilterChip
            key={r.key}
            active={filterRol === r.key}
            label={r.label.toUpperCase()}
            onClick={() => setFilterRol(r.key)}
          />
        ))}
      </div>

      {loading ? (
        <EmptyState text="CARGANDO…" />
      ) : visible.length === 0 ? (
        <EmptyState text="SIN PERSONAL REGISTRADO" />
      ) : (
        <div style={{ border: `1px solid ${T.outlineV}`, background: T.surfaceLow }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                <Th>Rol</Th>
                <Th>Nombre</Th>
                <Th>Nivel</Th>
                <Th align="right">Cant.</Th>
                <Th align="right">Sueldo/mes</Th>
                <Th align="right">Total/mes</Th>
                <Th>Alta</Th>
                <Th>Estado</Th>
                <Th align="right" style={{ width: 90 }}>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map(e => (
                <tr key={e.id} style={{ borderTop: `1px solid ${T.outlineV}40` }}>
                  <Td>{rolLabel(e.rol)}</Td>
                  <Td>{e.nombre || '—'}</Td>
                  <Td mono>{e.nivel}</Td>
                  <Td align="right" mono>{e.cantidad || 1}</Td>
                  <Td align="right" mono>{fmtMoney(e.sueldoMes)}</Td>
                  <Td align="right" mono style={{ color: T.creamHi, fontWeight: 700 }}>
                    {fmtMoney((e.sueldoMes || 0) * (e.cantidad || 1))}
                  </Td>
                  <Td mono>{fmtDate(e.fechaAlta)}</Td>
                  <Td><EstadoBadge estado={e.estado} /></Td>
                  <Td align="right">
                    <button onClick={() => openEdit(e)} style={smallBtn(T.gold)}>EDIT</button>
                    <button onClick={() => handleDelete(e.id)} style={smallBtn(T.bloodLight)}>×</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PersonalEditor({ entry, setEntry, onSave, onCancel }: {
  entry: PersonalEntry;
  setEntry: (e: PersonalEntry) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const valid = entry.sueldoMes >= 0 && entry.cantidad >= 1;

  // Auto-sueldo según rol+nivel (rule-of-thumb actual)
  const recalcSueldo = (rol: PersonalRol, nivel: PersonalNivel) => {
    const base = ROLES.find(r => r.key === rol)?.sueldoDefault ?? 0;
    const mult = NIVELES.find(n => n.key === nivel)?.mult ?? 1;
    return Math.round(base * mult);
  };

  // ── Calculadora canónica FM Mercs (A2 — INFORME_COSTES) ──
  const [canonOpen, setCanonOpen] = useState(false);
  const [canonBase, setCanonBase] = useState<number>(
    () => ROLES.find(r => r.key === entry.rol)?.sueldoDefault ?? 800
  );
  const [canonOfficer, setCanonOfficer] = useState(false);
  const [canonRank, setCanonRank] = useState(0);
  const canonQuality: Quality =
    entry.nivel === 'green' ? 'green' :
    entry.nivel === 'veteran' ? 'veteran' :
    entry.nivel === 'elite' ? 'elite' : 'regular';
  const canonResult = calcSalary(canonBase, canonQuality, canonOfficer, canonRank);

  return (
    <div style={editorBox}>
      <SmallLabel>{entry.id ? 'Editar Personal' : 'Nuevo Personal'}</SmallLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 0.7fr 1fr', gap: 12, marginTop: 10 }}>
        <FieldLabel>Rol</FieldLabel>
        <FieldLabel>Nombre / Etiqueta</FieldLabel>
        <FieldLabel>Nivel</FieldLabel>
        <FieldLabel>Cantidad</FieldLabel>
        <FieldLabel>Sueldo/mes ₡</FieldLabel>

        <select value={entry.rol}
          onChange={e => {
            const rol = e.target.value as PersonalRol;
            setEntry({ ...entry, rol, sueldoMes: recalcSueldo(rol, entry.nivel) });
          }}
          style={inputStyle}>
          {ROLES.map(r => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <input type="text" value={entry.nombre}
          onChange={e => setEntry({ ...entry, nombre: e.target.value })}
          placeholder="P.ej. Equipo Alpha — taller Marauder"
          style={inputStyle} />
        <select value={entry.nivel}
          onChange={e => {
            const nivel = e.target.value as PersonalNivel;
            setEntry({ ...entry, nivel, sueldoMes: recalcSueldo(entry.rol, nivel) });
          }}
          style={inputStyle}>
          {NIVELES.map(n => (
            <option key={n.key} value={n.key}>{n.label} (×{n.mult})</option>
          ))}
        </select>
        <input type="number" min={1} value={entry.cantidad || 1}
          onChange={e => setEntry({ ...entry, cantidad: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
        <input type="number" min={0} value={entry.sueldoMes}
          onChange={e => setEntry({ ...entry, sueldoMes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 180px 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <FieldLabel>Fecha de alta</FieldLabel>
          <input type="date" value={entry.fechaAlta.slice(0, 10)}
            onChange={e => setEntry({ ...entry, fechaAlta: e.target.value })}
            style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Estado</FieldLabel>
          <select value={entry.estado}
            onChange={e => setEntry({ ...entry, estado: e.target.value as PersonalEstado })}
            style={inputStyle}>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Nota</FieldLabel>
          <input type="text" value={entry.nota}
            onChange={e => setEntry({ ...entry, nota: e.target.value })}
            placeholder="Especialidad, asignación, comentarios"
            style={inputStyle} />
        </div>
      </div>

      {/* Calculadora canónica FM Mercs */}
      <div style={{ marginTop: 14, border: `1px solid ${T.outlineV}`, background: T.void }}>
        <button
          onClick={() => setCanonOpen(o => !o)}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'transparent', border: 'none',
            color: T.gold,
            fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 2,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          {canonOpen ? '▼' : '▶'} CALCULADORA CANÓNICA · FM MERCS (BASE × QUALITY × OFFICER × RANK/2)
        </button>
        {canonOpen && (
          <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px 160px', gap: 10, alignItems: 'end' }}>
            <div>
              <FieldLabel>Sueldo base ₡/mes</FieldLabel>
              <input type="number" min={0} value={canonBase}
                onChange={e => setCanonBase(Math.max(0, parseInt(e.target.value, 10) || 0))}
                style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
            </div>
            <div>
              <FieldLabel>Quality</FieldLabel>
              <input type="text" value={`${canonQuality} (${canonQuality === 'veteran' ? '×1.6' : canonQuality === 'elite' ? '×2.0' : canonQuality === 'green' ? '×0.5' : '×1.0'})`}
                readOnly
                style={{ ...inputStyle, opacity: 0.7, fontSize: 10 }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: `1px solid ${canonOfficer ? T.gold : T.outlineV}`, background: canonOfficer ? `${T.gold}10` : T.void, cursor: 'pointer' }}>
                <input type="checkbox" checked={canonOfficer} onChange={e => setCanonOfficer(e.target.checked)} style={{ accentColor: T.gold }} />
                <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: canonOfficer ? T.gold : T.cream, letterSpacing: 1.5 }}>
                  OFICIAL ×1.2
                </span>
              </label>
            </div>
            <div>
              <FieldLabel>Rango</FieldLabel>
              <select value={canonRank}
                onChange={e => setCanonRank(parseInt(e.target.value, 10) || 0)}
                style={inputStyle}>
                {RANK_LABELS.map(r => (
                  <option key={r.rank} value={r.rank}>{r.rank} · {r.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <FieldLabel>= Sueldo final</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{
                  flex: 1, padding: '8px 10px',
                  background: T.surfaceLow, border: `1px solid ${T.gold}`,
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 13,
                  color: T.gold, fontWeight: 700, textAlign: 'right',
                }}>
                  {fmtMoney(canonResult)}
                </div>
                <button onClick={() => setEntry({ ...entry, sueldoMes: canonResult })}
                  style={{
                    padding: '6px 10px',
                    background: T.gold, color: T.void,
                    border: 'none', cursor: 'pointer',
                    fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5, fontWeight: 700,
                  }}>
                  ←APLICAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <SecondaryBtn onClick={onCancel}>Cancelar</SecondaryBtn>
        <PrimaryBtn disabled={!valid} onClick={onSave}>Guardar</PrimaryBtn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  UI shared components
// ══════════════════════════════════════════════════════════

function Header({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.outlineV}`,
    }}>
      <div>
        <div style={{
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
          color: T.gold, letterSpacing: 4, textTransform: 'uppercase',
        }}>— Finanzas · {title} —</div>
        <h1 style={{
          margin: '6px 0 4px',
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 30, fontWeight: 800,
          color: T.creamHi, letterSpacing: -0.6,
        }}>{title.toUpperCase()}</h1>
        <div style={{ fontSize: 12, color: T.outline, letterSpacing: 0.5 }}>{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: T.surfaceLow, borderLeft: `3px solid ${color}`,
      padding: '14px 18px',
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
    }}>
      <div style={{
        fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
        color: T.outline, letterSpacing: 2, textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 800,
        color, marginTop: 4, letterSpacing: -0.3,
      }}>{value}</div>
    </div>
  );
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
      color: T.gold, letterSpacing: 3, textTransform: 'uppercase',
    }}>— {children} —</div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
      color: T.outline, letterSpacing: 2, textTransform: 'uppercase',
      marginBottom: 4,
    }}>{children}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: T.void,
  border: `1px solid ${T.outlineV}`,
  color: T.creamHi,
  padding: '8px 10px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const editorBox: React.CSSProperties = {
  background: T.surfaceLow,
  borderLeft: `2px solid ${T.gold}`,
  padding: '18px 22px',
  marginBottom: 22,
  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
};

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? T.surfaceLow : T.gold,
      color: disabled ? T.outline : T.void,
      border: `1px solid ${disabled ? T.outlineV : T.gold}`,
      padding: '8px 18px',
      fontFamily: '"Share Tech Mono", monospace', fontSize: 11, letterSpacing: 2,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function SecondaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent',
      color: T.outline,
      border: `1px solid ${T.outlineV}`,
      padding: '8px 18px',
      fontFamily: '"Share Tech Mono", monospace', fontSize: 11, letterSpacing: 2,
      cursor: 'pointer',
    }}>{children}</button>
  );
}

function FilterChip({ active, color, label, onClick }: {
  active: boolean; color?: string; label: string; onClick: () => void;
}) {
  const c = color ?? T.gold;
  return (
    <button onClick={onClick} style={{
      background: active ? c : 'transparent',
      color: active ? T.void : c,
      border: `1px solid ${c}`,
      padding: '5px 12px',
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5,
      cursor: 'pointer',
    }}>{label}</button>
  );
}

function CategoryBadge({ cat }: { cat: LibroMayorCategoria }) {
  const c = CATEGORIAS.find(x => x.key === cat);
  const color = c?.tipo === 'ingreso' ? T.greenDeep : T.bloodLight;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      border: `1px solid ${color}`,
      fontSize: 9, letterSpacing: 1.5,
      fontFamily: '"Share Tech Mono", monospace',
      color,
    }}>{c?.label.toUpperCase() ?? cat.toUpperCase()}</span>
  );
}

function EstadoBadge({ estado }: { estado: PersonalEstado }) {
  const color =
    estado === 'activo' ? T.greenDeep :
    estado === 'baja' ? T.gold :
    estado === 'kia' ? T.bloodLight :
    T.outline;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      border: `1px solid ${color}`,
      fontSize: 9, letterSpacing: 1.5,
      fontFamily: '"Share Tech Mono", monospace',
      color,
    }}>{estado.toUpperCase()}</span>
  );
}

function Th({ children, align = 'left', style }: { children: React.ReactNode; align?: 'left' | 'right' | 'center'; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '10px 12px',
      textAlign: align, fontWeight: 700,
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
      color: T.outline, letterSpacing: 2,
      borderBottom: `1px solid ${T.outlineV}`,
      ...style,
    }}>{children}</th>
  );
}

function Td({ children, align = 'left', mono, style, title }: {
  children: React.ReactNode; align?: 'left' | 'right' | 'center'; mono?: boolean;
  style?: React.CSSProperties; title?: string;
}) {
  return (
    <td title={title} style={{
      padding: '8px 12px',
      textAlign: align,
      fontFamily: mono ? '"Share Tech Mono", monospace' : 'Inter, sans-serif',
      color: T.cream,
      ...style,
    }}>{children}</td>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      fontFamily: '"Share Tech Mono", monospace', fontSize: 11,
      color: T.outline, letterSpacing: 2,
      border: `1px dashed ${T.outlineV}`,
    }}>{text}</div>
  );
}

function smallBtn(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    color, border: `1px solid ${color}40`,
    padding: '3px 8px', marginLeft: 4,
    fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5,
    cursor: 'pointer',
  };
}

// ══════════════════════════════════════════════════════════
//  MAINTENANCE MODAL (F3)
// ══════════════════════════════════════════════════════════

interface MaintenanceModalProps {
  roster: any[];
  personal: PersonalEntry[];
  campaignYear: number;
  campaignMonth: number;
  onClose: () => void;
  onCommit: (total: number, detalles: string) => Promise<void>;
}

const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function MaintenanceModal({ roster, personal, campaignYear, campaignMonth, onClose, onCommit }: MaintenanceModalProps) {
  const { isTabletDown, isMobile } = useViewport();
  // Editables in-place — defaults StratOps / FM Mercs
  const [useCanonMaintenance, setUseCanonMaintenance] = useState(true);     // A4: toggle canon vs flat
  const [mantenimientoMechMes, setMantenimientoMechMes] = useState(30000); // ₡/mes/mech (legacy flat)
  const [suministrosPct, setSuministrosPct] = useState(10);                 // % sobre subtotal
  const [cubiertoContrato, setCubiertoContrato] = useState(false);          // FM Mercs: Salary/Support coverage
  const [committing, setCommitting] = useState(false);

  // Pilotos activos con sueldo desde roster (col R Personajes)
  const pilotos = useMemo(() => {
    return roster
      .filter(isActivo)
      .map(r => {
        // sueldo puede venir como número o string formateado
        const raw = String(r.sueldo ?? '').replace(/[^\d.-]/g, '');
        const n = parseInt(raw, 10);
        return {
          nombre: r.apodo || r.nombre || r.jugador || '?',
          sueldo: Number.isFinite(n) ? n : 0,
        };
      })
      .filter(p => p.sueldo > 0);
  }, [roster]);

  // Personal activo agrupado por rol
  const personalActivo = useMemo(() => {
    return personal
      .filter(p => p.estado === 'activo')
      .map(p => ({
        rol: rolLabel(p.rol),
        cantidad: p.cantidad || 1,
        sueldoUnit: p.sueldoMes,
        total: (p.sueldoMes || 0) * (p.cantidad || 1),
        nombre: p.nombre,
      }));
  }, [personal]);

  const sueldosPilotos  = pilotos.reduce((s, p) => s + p.sueldo, 0);
  const sueldosPersonal = personalActivo.reduce((s, p) => s + p.total, 0);
  const mechsCount      = roster.filter(r => r.mech).length;

  // A4 — Mantenimiento canon FM Mercs vs flat legacy
  // Lookup tonelaje real per mech del catálogo enriquecido (index.json)
  const { catalog: mechCatalog } = useMechCatalog();
  const canonHangar = useMemo<{ units: HangarUnit[]; matches: { mech: string; tons: number; match: boolean }[] }>(() => {
    const mechs = mechCatalog?.mechs ?? [];
    const matches: { mech: string; tons: number; match: boolean }[] = [];
    const units: HangarUnit[] = [];
    for (const r of roster.filter(r => r.mech)) {
      const found = findMechByName(mechs, r.mech);
      const tons = found?.tons ?? 60;  // fallback 60t medio si no encuentra
      matches.push({ mech: r.mech, tons, match: !!found });
      units.push({ cls: 'battlemech', tons });
    }
    return { units, matches };
  }, [roster, mechCatalog]);
  const canonResult = useMemo(() => calcHangarMonthlyMaintenance(canonHangar.units), [canonHangar]);
  const mantenimientoMechs = useCanonMaintenance ? canonResult.total : mechsCount * mantenimientoMechMes;

  const subtotal = sueldosPilotos + sueldosPersonal + mantenimientoMechs;
  const suministros = Math.round(subtotal * (suministrosPct / 100));
  const subtotalConSuministros = subtotal + suministros;
  // Si contrato cubre → total real para la unidad = 0 (empleador paga)
  const total = cubiertoContrato ? 0 : subtotalConSuministros;

  const mesProximo = campaignMonth === 12 ? 1 : campaignMonth + 1;
  const yearProximo = campaignMonth === 12 ? campaignYear + 1 : campaignYear;
  const labelMes = `${MESES_NOMBRE[mesProximo - 1]} ${yearProximo}`;

  const detallesText = [
    `Mantenimiento ${labelMes}${cubiertoContrato ? ' [CUBIERTO POR CONTRATO]' : ''}`,
    `Sueldos pilotos: ${fmtMoney(sueldosPilotos)}`,
    `Sueldos personal (${personalActivo.reduce((s, p) => s + p.cantidad, 0)}): ${fmtMoney(sueldosPersonal)}`,
    `Mantenimiento mechs (${mechsCount} × ${fmtMoney(mantenimientoMechMes)}): ${fmtMoney(mantenimientoMechs)}`,
    `Suministros (${suministrosPct}%): ${fmtMoney(suministros)}`,
    cubiertoContrato
      ? `TOTAL ASUMIDO POR EMPLEADOR: ${fmtMoney(subtotalConSuministros)} · IMPUTADO A UNIDAD: 0 ₡`
      : `TOTAL: ${fmtMoney(subtotalConSuministros)}`,
  ].join(' | ');

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface,
        border: `1px solid ${T.gold}`,
        padding: 'clamp(16px, 3vw, 28px)',
        width: 'min(900px, 95vw)',
        maxHeight: '90vh', overflow: 'auto',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)',
      }}>
        <SmallLabel>Proyección · {labelMes}</SmallLabel>
        <h2 style={{
          margin: '6px 0 14px',
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 800,
          color: T.creamHi, letterSpacing: -0.4,
        }}>MANTENIMIENTO MENSUAL PROYECTADO</h2>

        {/* Toggle canon vs flat */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setUseCanonMaintenance(true)}
            style={{
              flex: 1, padding: '6px 10px',
              background: useCanonMaintenance ? T.gold : 'transparent',
              color: useCanonMaintenance ? T.void : T.gold,
              border: `1px solid ${T.gold}`,
              fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5, fontWeight: 700,
              cursor: 'pointer',
            }}
          >CANON FM MERCS (75 ₡/sem × 4)</button>
          <button
            onClick={() => setUseCanonMaintenance(false)}
            style={{
              flex: 1, padding: '6px 10px',
              background: !useCanonMaintenance ? T.outline : 'transparent',
              color: !useCanonMaintenance ? T.void : T.outline,
              border: `1px solid ${T.outline}`,
              fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5, fontWeight: 700,
              cursor: 'pointer',
            }}
          >FLAT LEGACY (30 k/mes/mech)</button>
        </div>

        {/* Parámetros editables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
          <div>
            <FieldLabel>Mantenimiento mech (₡/mes/mech)</FieldLabel>
            <input type="number" min={0} value={mantenimientoMechMes}
              disabled={useCanonMaintenance}
              onChange={e => setMantenimientoMechMes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right', opacity: useCanonMaintenance ? 0.4 : 1 }} />
            {useCanonMaintenance && (
              <div style={{ fontSize: 9, color: T.outline, marginTop: 3, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1 }}>
                Auto-calc: 75 ₡/sem × 4 = 300 ₡/mech (peso real per mech via catálogo enriquecido)
                {canonHangar.matches.length > 0 && (
                  <span style={{ color: T.bone, marginLeft: 4 }}>
                    · {canonHangar.matches.filter(m => m.match).length}/{canonHangar.matches.length} mechs identificados
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <FieldLabel>Suministros (% sobre subtotal)</FieldLabel>
            <input type="number" min={0} max={100} value={suministrosPct}
              onChange={e => setSuministrosPct(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
              style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
          </div>
        </div>

        {/* Cobertura contrato (FM Mercs / StratOps salary+support) */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: cubiertoContrato ? `${T.greenDeep}15` : T.void,
          border: `1px solid ${cubiertoContrato ? T.greenDeep : T.outlineV}`,
          marginBottom: 18, cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}>
          <input
            type="checkbox"
            checked={cubiertoContrato}
            onChange={e => setCubiertoContrato(e.target.checked)}
            style={{ accentColor: T.greenDeep, width: 16, height: 16, cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: '"Share Tech Mono", monospace', fontSize: 11,
              color: cubiertoContrato ? T.greenDeep : T.cream,
              letterSpacing: 1.5, fontWeight: 700,
            }}>
              CUBIERTO POR CONTRATO
            </div>
            <div style={{
              fontSize: 10, color: T.outline, marginTop: 2,
              fontFamily: 'Inter, sans-serif',
            }}>
              {cubiertoContrato
                ? 'Empleador paga sueldos, mantenimiento y suministros. Entrada al Libro Mayor = 0 ₡.'
                : 'Coste asumido por la unidad. Marca esta casilla si el contrato incluye salary+support coverage.'}
            </div>
          </div>
        </label>

        {/* Desglose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <BreakdownRow label="Sueldos pilotos" detail={`${pilotos.length} activos`} value={sueldosPilotos} />
          <BreakdownRow label="Sueldos personal" detail={`${personalActivo.reduce((s, p) => s + p.cantidad, 0)} cabezas`} value={sueldosPersonal} />
          <BreakdownRow label="Mantenimiento mechs" detail={`${mechsCount} × ${fmtMoney(mantenimientoMechMes)}`} value={mantenimientoMechs} />
          <div style={{ borderTop: `1px solid ${T.outlineV}`, paddingTop: 8, marginTop: 4 }}>
            <BreakdownRow label="Subtotal" detail="" value={subtotal} color={T.gold} />
          </div>
          <BreakdownRow label="Suministros" detail={`${suministrosPct}%`} value={suministros} />
          {cubiertoContrato && (
            <div style={{ borderTop: `1px dashed ${T.greenDeep}`, paddingTop: 8, marginTop: 4 }}>
              <BreakdownRow label="Asume empleador" detail="contrato salary+support" value={subtotalConSuministros} color={T.greenDeep} />
            </div>
          )}
          <div style={{ borderTop: `2px solid ${T.gold}`, paddingTop: 10, marginTop: 4 }}>
            <BreakdownRow
              label={cubiertoContrato ? 'IMPUTADO A UNIDAD' : 'TOTAL MES'}
              detail={cubiertoContrato ? 'CUBIERTO POR CONTRATO' : labelMes.toUpperCase()}
              value={total}
              color={cubiertoContrato ? T.greenDeep : T.bloodLight}
              bold
            />
          </div>
        </div>

        {/* Pilotos detalle (collapsible-style siempre visible) */}
        {pilotos.length > 0 && (
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, color: T.outline, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1.5 }}>
              ▸ Detalle pilotos ({pilotos.length})
            </summary>
            <div style={{ marginTop: 8, fontSize: 11, color: T.bone, fontFamily: '"Share Tech Mono", monospace' }}>
              {pilotos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{p.nombre}</span>
                  <span>{fmtMoney(p.sueldo)}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {personalActivo.length > 0 && (
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, color: T.outline, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1.5 }}>
              ▸ Detalle personal ({personalActivo.length} grupos)
            </summary>
            <div style={{ marginTop: 8, fontSize: 11, color: T.bone, fontFamily: '"Share Tech Mono", monospace' }}>
              {personalActivo.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{p.rol} × {p.cantidad}{p.nombre ? ` (${p.nombre})` : ''}</span>
                  <span>{fmtMoney(p.total)}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <TelegramToggle context="proyectar" />
          <div style={{ display: 'flex', gap: 10 }}>
            <SecondaryBtn onClick={onClose}>Cancelar</SecondaryBtn>
            <PrimaryBtn
              disabled={committing || total === 0}
              onClick={async () => {
                setCommitting(true);
                await onCommit(total, detallesText);
                if (getTelegramToggle('proyectar')) {
                  const event = exceedsTesoreriaUmbral(total) ? 'tesoreria_grande' : 'libro_mayor_relevante';
                  sendTelegramNotif(event, {
                    concepto: 'Mantenimiento mensual',
                    cantidad: total, tipo: 'gasto', categoria: 'mantenimiento_mensual',
                  });
                }
                setCommitting(false);
              }}
            >{committing ? 'Cargando…' : 'CARGAR AL LIBRO MAYOR'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  ACQUISITION MODAL (A3) — calculadora compra/venta Hoja 28
// ══════════════════════════════════════════════════════════

function AcquisitionModal({ campaignDate, onClose, onCommit }: {
  campaignDate: string;
  onClose: () => void;
  onCommit: (price: number, label: string, level: ExperienceLevel) => Promise<void>;
}) {
  const { isMobile } = useViewport();
  const [kind, setKind] = useState<AcquisitionKind>('mech_new');
  const [weight, setWeight] = useState<MechWeightClass>('medium');
  const [level, setLevel] = useState<ExperienceLevel>('regular');
  const [qty, setQty] = useState(1);
  const [discountPct, setDiscountPct] = useState(0);
  const [committing, setCommitting] = useState(false);

  // Catálogo SSW para autocomplete precio canon
  const { catalog } = useMechCatalog();
  const [mechQuery, setMechQuery] = useState('');
  const [selectedMech, setSelectedMech] = useState<CatalogMech | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isMechKind = kind === 'mech_new' || kind === 'mech_salvaged';
  const isFighterKind = kind === 'fighter_new' || kind === 'fighter_salvaged';
  const isSalvaged = kind === 'mech_salvaged' || kind === 'fighter_salvaged';

  // Suggestions: filter catalog por query
  const suggestions = useMemo(() => {
    if (!catalog || mechQuery.trim().length < 2) return [];
    const q = mechQuery.trim().toLowerCase();
    return catalog.mechs
      .filter(m => m.cost > 0 && m.fullName.toLowerCase().includes(q))
      .slice(0, 12);
  }, [catalog, mechQuery]);

  const kindDef = ACQUISITION_KINDS.find(k => k.kind === kind);
  const needsWeight = !!kindDef?.needsWeight;

  // Si hay mech seleccionado, usa cost real (salvaged = 40% del nuevo, FM Mercs convention)
  const sswPrice = selectedMech
    ? (isSalvaged ? Math.round(selectedMech.cost * 0.4) : selectedMech.cost)
    : 0;
  const tablePrice = getAcquisitionPrice(kind, level, needsWeight ? weight : undefined);
  const unitPrice = sswPrice > 0 ? sswPrice : tablePrice;
  const priceSource = sswPrice > 0 ? 'SSW' : 'Hoja 28';

  const subtotal = unitPrice * qty;
  const discount = Math.round(subtotal * (discountPct / 100));
  const total = subtotal - discount;
  const label = selectedMech
    ? `${selectedMech.fullName}${isSalvaged ? ' (recuperado)' : ''}`
    : getPriceLabel(kind, needsWeight ? weight : undefined);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, border: `1px solid ${T.gold}`,
        padding: 'clamp(16px, 3vw, 28px)',
        width: 'min(900px, 95vw)',
        maxHeight: '90vh', overflow: 'auto',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)',
      }}>
        <SmallLabel>Calculadora Adquisiciones · Hoja 28 + Catálogo SSW</SmallLabel>
        <h2 style={{
          margin: '6px 0 14px',
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 800,
          color: T.creamHi, letterSpacing: -0.4,
        }}>COMPRA / COTIZACIÓN</h2>

        {/* Search box catálogo SSW — visible solo para mechs/fighters */}
        {(isMechKind || isFighterKind) && (
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <FieldLabel>Buscar modelo específico (catálogo SSW) — opcional</FieldLabel>
            <input type="text"
              value={selectedMech ? selectedMech.fullName : mechQuery}
              onChange={e => {
                setMechQuery(e.target.value);
                setSelectedMech(null);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Ej: Atlas AS7-D, Marauder MAD-3R..."
              style={inputStyle} />
            {selectedMech && (
              <button onClick={() => { setSelectedMech(null); setMechQuery(''); }}
                style={{
                  position: 'absolute', right: 8, top: 26,
                  background: 'transparent', border: 'none', color: T.gold,
                  cursor: 'pointer', fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                }}>× CLEAR</button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: T.surface, border: `1px solid ${T.gold}`,
                maxHeight: 240, overflow: 'auto', zIndex: 10,
                marginTop: 2,
              }}>
                {suggestions.map((m, i) => (
                  <button key={i}
                    onClick={() => {
                      setSelectedMech(m);
                      setMechQuery(m.fullName);
                      setShowSuggestions(false);
                      // Auto-update weight class según peso real
                      setWeight(classifyMechWeight(m.tons));
                    }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 10px',
                      background: 'transparent',
                      border: 'none', borderBottom: `1px solid ${T.outlineV}40`,
                      color: T.cream,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12,
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${T.gold}15`}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 700 }}>{m.fullName}</span>
                    <span style={{ color: T.outline, marginLeft: 8, fontFamily: '"Share Tech Mono", monospace', fontSize: 10 }}>
                      {m.tons}t · {m.categoria} · BV{m.bv2} · {fmtMoney(m.cost)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedMech && (
              <div style={{ marginTop: 6, fontSize: 10, color: T.gold, fontFamily: '"Share Tech Mono", monospace', letterSpacing: 1 }}>
                ✓ SSW: {selectedMech.tons}t · {selectedMech.categoria} · BV {selectedMech.bv2} · Coste base {fmtMoney(selectedMech.cost)} ₡
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : (needsWeight ? '1.4fr 1fr 1fr 80px 100px' : '1.6fr 1fr 100px 110px'), gap: 12, marginBottom: 18 }}>
          <div>
            <FieldLabel>Tipo activo</FieldLabel>
            <select value={kind}
              onChange={e => setKind(e.target.value as AcquisitionKind)}
              style={inputStyle}>
              {ACQUISITION_KINDS.map(k => (
                <option key={k.kind} value={k.kind}>{k.label}</option>
              ))}
            </select>
          </div>
          {needsWeight && (
            <div>
              <FieldLabel>Peso</FieldLabel>
              <select value={weight}
                onChange={e => setWeight(e.target.value as MechWeightClass)}
                style={inputStyle}>
                {ACQ_WEIGHT_CLASSES.map(w => (
                  <option key={w.key} value={w.key}>{w.label} ({w.range})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <FieldLabel>Nivel exp.</FieldLabel>
            <select value={level}
              onChange={e => setLevel(e.target.value as ExperienceLevel)}
              style={inputStyle}>
              {ACQ_LEVELS.map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Cantidad</FieldLabel>
            <input type="number" min={1} value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
          </div>
          <div>
            <FieldLabel>Desc. %</FieldLabel>
            <input type="number" min={0} max={100} value={discountPct}
              onChange={e => setDiscountPct(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
              style={{ ...inputStyle, fontFamily: '"Share Tech Mono", monospace', textAlign: 'right' }} />
          </div>
        </div>

        {/* Desglose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          <BreakdownRow label={label} detail={`${qty} × ${fmtMoney(unitPrice)} · ${priceSource}`} value={subtotal} />
          {discount > 0 && (
            <BreakdownRow label="Descuento" detail={`${discountPct}%`} value={-discount} color={T.greenDeep} />
          )}
          <div style={{ borderTop: `2px solid ${T.gold}`, paddingTop: 10, marginTop: 4 }}>
            <BreakdownRow label="TOTAL" detail={level.toUpperCase()} value={total} color={T.bloodLight} bold />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <TelegramToggle context="compras" />
          <div style={{ display: 'flex', gap: 10 }}>
            <SecondaryBtn onClick={onClose}>Cancelar</SecondaryBtn>
            <PrimaryBtn
              disabled={committing || total === 0}
              onClick={async () => {
                const concepto = `${label} ×${qty}`;
                setCommitting(true);
                await onCommit(total, concepto, level);
                if (getTelegramToggle('compras')) {
                  const event = exceedsTesoreriaUmbral(total) ? 'tesoreria_grande' : 'libro_mayor_relevante';
                  sendTelegramNotif(event, {
                    concepto, cantidad: total,
                    tipo: 'gasto',
                    categoria: label.toLowerCase().includes('mech') ? 'compra_mech' : 'repuestos',
                  });
                }
                setCommitting(false);
              }}
            >{committing ? 'Cargando…' : 'CARGAR AL LIBRO MAYOR'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, detail, value, color, bold }: {
  label: string; detail: string; value: number; color?: string; bold?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'baseline' }}>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: bold ? 14 : 13,
        fontWeight: bold ? 800 : 500,
        color: color ?? T.cream,
      }}>{label}</div>
      <div style={{
        fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
        color: T.outline, letterSpacing: 1,
      }}>{detail}</div>
      <div style={{
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: bold ? 18 : 14,
        fontWeight: bold ? 800 : 700,
        color: color ?? T.creamHi,
        textAlign: 'right', minWidth: 140,
      }}>{fmtMoney(value)}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  TALLER MODAL (A1) — factura reparación post-combate
// ══════════════════════════════════════════════════════════

export function TallerModal({ onClose, onCommit, initialSimSlotIdx, onRestore }: {
  campaignDate: string;
  onClose: () => void;
  onCommit: (total: number, concepto: string, mechName: string) => Promise<void>;
  /** Si se pasa, auto-carga ese slot del simulador al montar. */
  initialSimSlotIdx?: number | null;
  /** Notifica al caller tras restaurar mech en simulador (para rehydrate). */
  onRestore?: () => void;
}) {
  const { isTabletDown, isMobile } = useViewport();
  const { catalog } = useMechCatalog();
  const [mechQuery, setMechQuery] = useState('');
  const [selected, setSelected] = useState<CatalogMech | null>(null);
  const [showSugg, setShowSugg] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Config + damage state
  const [config, setConfig] = useState<MechRepairConfig | null>(null);
  const [damage, setDamage] = useState<MechRepairDamage>(emptyDamage);
  const [estadoPct, setEstadoPct] = useState(100);
  const [pctDañoTotal, setPctDañoTotal] = useState(0);
  const [system, setSystem] = useState<RepairSystem>('canon');

  // Simulador import
  const [showSimPicker, setShowSimPicker] = useState(false);
  const [municionDetalle, setMunicionDetalle] = useState<import('@/lib/repair-engine').MunicionDetalleEntry[]>([]);
  const [simSlotIdx, setSimSlotIdx] = useState<number | null>(null); // null = no cargado desde sim
  const simSlots: { slot: MechSlot; idx: number }[] = useMemo(() => {
    const snap = loadLocalSnapshot();
    if (!snap) return [];
    return snap.mechSlots
      .map((s, i) => ({ slot: s, idx: i }))
      .filter(({ slot }) => slot?.state && slot?.session);
  }, [showSimPicker]); // re-leer cuando se abre picker

  const loadFromSimSlot = (mechSlot: MechSlot, slotIdx: number) => {
    if (!mechSlot.state || !mechSlot.session) return;
    const st = mechSlot.state;
    // Derivar daños
    const { damage: derivedDmg, pctDañoTotal: pct, municionDetalle: detalle } = deriveDamageFromSession(st, mechSlot.session);
    setMunicionDetalle(detalle);
    // Intentar match en catálogo para config correcta
    const catMatch = catalog
      ? findMechByName(catalog.mechs, `${st.chassis} ${st.model}`)
      : null;
    const derivedConfig = catMatch
      ? configFromCatalog(catMatch)
      : {
          tons:           st.tonnage,
          walkMP:         st.walkMP,
          reactorType:    'Fusion',
          gyroType:       'Estandar',
          miomeroType:    'Estandar',
          estructuraType: 'Estandar',
          retroType:      'Estandar',
          radType:        st.hsDouble ? 'Dobles' : 'Normales',
          blindajeType:   (() => {
            const a = (st.armorType || '').toLowerCase();
            if (a.includes('stealth'))                                  return 'Stealth';
            if (a.includes('ferro') && a.includes('lig'))               return 'Ferro Fibroso Ligero';
            if (a.includes('ferro') && a.includes('pesado'))            return 'Ferro Fibroso Pesado';
            if (a.includes('ferro'))                                    return 'Ferro Fibroso';
            if (a.includes('industrial') && a.includes('pesado'))       return 'Industrial Pesado';
            if (a.includes('industrial'))                               return 'Industrial';
            if (a.includes('comercial') || a.includes('commerc'))      return 'Comercial';
            return 'Estandar';
          })(),
        } satisfies MechRepairConfig;

    setConfig(derivedConfig);
    setDamage(derivedDmg);
    setPctDañoTotal(pct);
    setMechQuery(catMatch ? catMatch.fullName : `${st.chassis} ${st.model}`);
    setSelected(catMatch ?? null);
    setShowSimPicker(false);
    setSimSlotIdx(slotIdx);
  };

  // Auto-load desde simulador si el caller paso initialSimSlotIdx (boton llave en PilotPanel)
  useEffect(() => {
    if (initialSimSlotIdx === null || initialSimSlotIdx === undefined) return;
    if (!catalog) return; // espera a que el catalogo este listo
    const snap = loadLocalSnapshot();
    if (!snap) return;
    const slot = snap.mechSlots[initialSimSlotIdx];
    if (slot?.state && slot?.session) loadFromSimSlot(slot, initialSimSlotIdx);
    // Solo en mount (o cuando llega catalog tarde)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // Sugerencias
  const suggestions = useMemo(() => {
    if (!catalog || mechQuery.trim().length < 2) return [];
    const q = mechQuery.trim().toLowerCase();
    return catalog.mechs
      .filter(m => m.fullName.toLowerCase().includes(q))
      .slice(0, 12);
  }, [catalog, mechQuery]);

  const handleSelectMech = (m: CatalogMech) => {
    setSelected(m);
    setMechQuery(m.fullName);
    setShowSugg(false);
    setConfig(configFromCatalog(m));
    setDamage(emptyDamage());
    setMunicionDetalle([]);
    setSimSlotIdx(null);
  };

  const handleClear = () => {
    setSelected(null);
    setMechQuery('');
    setConfig(null);
    setDamage(emptyDamage());
    setMunicionDetalle([]);
    setSimSlotIdx(null);
  };

  // Factura
  const factura: RepairBreakdown | null = config ? calcRepairCostBySystem(system, config, damage, estadoPct, pctDañoTotal) : null;

  // Helper actualizar damage
  const updDmg = <K extends keyof MechRepairDamage>(k: K, v: MechRepairDamage[K]) =>
    setDamage(d => ({ ...d, [k]: v }));

  const updActuador = (name: keyof typeof PRECIO_ACTUADOR, qty: number) =>
    setDamage(d => ({ ...d, actuadores: { ...d.actuadores, [name]: qty } }));

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, border: `1px solid ${T.gold}`,
        padding: 'clamp(14px, 2.5vw, 26px)',
        width: 'min(1100px, 95vw)',
        maxHeight: '92vh', overflow: 'auto',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)',
      }}>
        <SmallLabel>Taller · Factura reparación Mech (Ayudas BW:BX)</SmallLabel>
        <h2 style={{
          margin: '6px 0 16px',
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 24, fontWeight: 800,
          color: T.creamHi, letterSpacing: -0.4,
        }}>TALLER · REPARACIÓN</h2>

        {/* Mech search */}
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <FieldLabel>Mech a reparar (catálogo SSW)</FieldLabel>
          <input type="text"
            value={mechQuery}
            onChange={e => { setMechQuery(e.target.value); setSelected(null); setShowSugg(true); }}
            onFocus={() => setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Ej: Atlas AS7-D, Marauder MAD-3R..."
            style={inputStyle} />
          {selected && (
            <button onClick={handleClear} style={{
              position: 'absolute', right: 8, top: 26,
              background: 'transparent', border: 'none', color: T.gold,
              cursor: 'pointer', fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
            }}>× CLEAR</button>
          )}
          {showSugg && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: T.surface, border: `1px solid ${T.gold}`,
              maxHeight: 240, overflow: 'auto', zIndex: 10, marginTop: 2,
            }}>
              {suggestions.map((m, i) => (
                <button key={i} onClick={() => handleSelectMech(m)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '6px 10px', background: 'transparent',
                    border: 'none', borderBottom: `1px solid ${T.outlineV}40`,
                    color: T.cream, cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: 12,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${T.gold}15`}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 700 }}>{m.fullName}</span>
                  <span style={{ color: T.outline, marginLeft: 8, fontFamily: '"Share Tech Mono", monospace', fontSize: 10 }}>
                    {m.tons}t · {m.categoria} · {m.armor.type} · {m.heatSinks.type} HS
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Importar desde Simulador */}
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <button
            onClick={() => setShowSimPicker(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px',
              background: showSimPicker ? `${T.gold}20` : T.void,
              border: `1px solid ${T.gold}`,
              color: T.gold, cursor: 'pointer',
              fontFamily: '"Share Tech Mono", monospace', fontSize: 11, letterSpacing: 1,
            }}
          >
            📡 CARGAR DESDE SIMULADOR
            {simSlots.length > 0 && (
              <span style={{
                background: T.gold, color: T.void,
                borderRadius: 2, padding: '1px 5px', fontSize: 10, fontWeight: 700,
              }}>{simSlots.length}</span>
            )}
          </button>
          {showSimPicker && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 4,
              background: T.surface, border: `1px solid ${T.gold}`,
              minWidth: 380,
            }}>
              {simSlots.length === 0 ? (
                <div style={{
                  padding: '12px 16px',
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 11, color: T.outline,
                }}>
                  No hay mechs en el simulador. Carga una ficha .ssw primero.
                </div>
              ) : (
                simSlots.map(({ slot, idx }) => {
                  const st = slot.state!;
                  const se = slot.session!;
                  const armorLocs = ['HD','CTf','CTr','LTf','LTr','RTf','RTr','LA','RA','LL','RL'];
                  const armorMax  = armorLocs.reduce((s,k) => s + ((st.armor  as Record<string,number>)[k] ?? 0), 0);
                  const armorCur  = armorLocs.reduce((s,k) => s + ((se.armor as Record<string,number>)[k] ?? 0), 0);
                  const isLocs    = ['HD','CT','LT','RT','LA','RA','LL','RL'];
                  const isMax     = isLocs.reduce((s,k) => s + ((st.is   as Record<string,number>)[k] ?? 0), 0);
                  const isCur     = isLocs.reduce((s,k) => s + ((se.is  as Record<string,number>)[k] ?? 0), 0);
                  const totalMax  = armorMax + isMax;
                  const totalLost = (armorMax - armorCur) + (isMax - isCur);
                  const pct = totalMax > 0 ? Math.round((totalLost / totalMax) * 100) : 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => loadFromSimSlot(slot, idx)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 14px',
                        background: 'transparent', border: 'none',
                        borderBottom: `1px solid ${T.outlineV}40`,
                        color: T.cream, cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: 12,
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${T.gold}15`}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: 700 }}>
                        SLOT {idx + 1} — {st.chassis} {st.model}
                      </span>
                      <span style={{
                        marginLeft: 10, fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 10, color: pct > 60 ? '#ef4444' : pct > 20 ? '#fbbf24' : '#4ade80',
                      }}>
                        {st.tonnage}t · {pct}% daño
                        {se.destroyed ? ' · ⚠ DESTRUIDO' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {!config ? (
          <EmptyState text="SELECCIONA UN MECH PARA EMPEZAR LA FACTURA" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isTabletDown ? '1fr' : '1.4fr 1fr', gap: isTabletDown ? 14 : 18 }}>
            {/* Daños — IZQUIERDA */}
            <div>
              <SmallLabel>Daños declarados (Taller G5-G17)</SmallLabel>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                <DmgNum label="Reactor (0-3 · 3=DESTRUIDO)" value={damage.reactor}     onChange={v => updDmg('reactor', v)}     max={3} />
                <DmgNum label="Gyro (0-2)"                  value={damage.gyro}        onChange={v => updDmg('gyro', v)}        max={2} />
                {/* Cabina booleana */}
                <div>
                  <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 1.5, marginBottom: 3 }}>
                    Cabina (SI/NO)
                  </div>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px',
                    background: damage.cabinaDañada ? `${T.bloodLight}15` : T.void,
                    border: `1px solid ${damage.cabinaDañada ? T.bloodLight : T.outlineV}`,
                    cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={damage.cabinaDañada}
                      onChange={e => updDmg('cabinaDañada', e.target.checked)}
                      style={{ accentColor: T.bloodLight }} />
                    <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: damage.cabinaDañada ? T.bloodLight : T.cream }}>
                      {damage.cabinaDañada ? 'DAÑADA (200k)' : 'OK'}
                    </span>
                  </label>
                </div>
                <DmgNum label="Soporte vida (uds dañadas)"  value={damage.soporteVida} onChange={v => updDmg('soporteVida', v)} max={20} />
                <DmgNum label="Sensores (uds dañadas)"      value={damage.sensores}    onChange={v => updDmg('sensores', v)}    max={20} />
                <DmgNum label="Miomero (uds dañadas)"       value={damage.miomero}     onChange={v => updDmg('miomero', v)}     max={20} />
                <DmgNum label="Estructura (pts perdidos)"   value={damage.estructura}  onChange={v => updDmg('estructura', v)}  max={999} />
                <DmgNum label="Blindaje (pts → ton)"        value={damage.blindaje}    onChange={v => updDmg('blindaje', v)}    max={999} />
                <DmgNum label="Retros (uds dañadas)"        value={damage.retros}      onChange={v => updDmg('retros', v)}      max={20} />
                <DmgNum label="Radiadores (uds dañadas)"    value={damage.radiadores}  onChange={v => updDmg('radiadores', v)}  max={config.tons} />
              </div>

              <SmallLabel>Actuadores</SmallLabel>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8 }}>
                {(Object.keys(PRECIO_ACTUADOR) as (keyof typeof PRECIO_ACTUADOR)[]).map(name => (
                  <DmgNum key={name}
                    label={`${name} (${fmtMoney(PRECIO_ACTUADOR[name])})`}
                    value={damage.actuadores[name] ?? 0}
                    onChange={v => updActuador(name, v)}
                    max={4} small />
                ))}
              </div>

              <SmallLabel>Sistema de cálculo</SmallLabel>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                {(['propio', 'canon'] as RepairSystem[]).map(s => (
                  <button key={s} onClick={() => setSystem(s)}
                    style={{
                      flex: 1, padding: '8px 12px',
                      background: system === s ? T.gold : T.void,
                      border: `1px solid ${T.gold}`,
                      color: system === s ? T.void : T.gold,
                      cursor: 'pointer',
                      fontFamily: '"Share Tech Mono", monospace', fontSize: 11, letterSpacing: 1.5,
                      fontWeight: system === s ? 700 : 400,
                    }}>
                    {s === 'propio' ? 'PROPIO (HOUSE RULE)' : 'CANON (CamOps p.205)'}
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: 4, padding: '4px 8px',
                fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline,
                lineHeight: 1.5,
              }}>
                {system === 'propio'
                  ? 'Tu Taller: precio × peso × pts/2 × estado%. Cubre daño parcial.'
                  : 'Tech Manual: precios canon. Reactor/Gyro parcial = 0 ₡ (sólo labor). Estado factura % también se aplica.'}
              </div>

              <SmallLabel>Estado factura · Datos sim</SmallLabel>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'end' }}>
                {/* Estado factura — IZQ */}
                <div>
                  <FieldLabel>Estado factura (%)</FieldLabel>
                  <select value={estadoPct}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      setEstadoPct(Number.isFinite(v) ? v : 100);
                    }}
                    style={inputStyle}>
                    {[...ESTADO_FACTURA_PCT].map(p => (
                      <option key={p} value={p}>{p}% factura</option>
                    ))}
                  </select>
                </div>

                {/* 5 botones quick % — CENTRO */}
                <div>
                  <FieldLabel>Quick %</FieldLabel>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 25, 50, 75, 100].map(p => (
                      <button key={p}
                        onClick={() => setEstadoPct(p)}
                        style={{
                          width: 36, padding: '6px 0',
                          background: estadoPct === p ? T.gold : T.void,
                          border: `1px solid ${T.gold}`,
                          color: estadoPct === p ? T.void : T.gold,
                          cursor: 'pointer',
                          fontFamily: '"Share Tech Mono", monospace', fontSize: 10, fontWeight: 700,
                        }}>{p}</button>
                    ))}
                  </div>
                </div>

                {/* Muni + % daño readonly — DCHA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>
                    <FieldLabel>Munición (sim) 🔒</FieldLabel>
                    <div style={{
                      padding: '6px 10px',
                      background: T.void, border: `1px solid ${T.outlineV}`,
                      fontFamily: '"Share Tech Mono", monospace', fontSize: 11, textAlign: 'right',
                      color: T.cream,
                    }}>{fmtMoney(damage.municion ?? 0)}</div>
                  </div>
                  <div>
                    <FieldLabel>% daño total (sim) 🔒</FieldLabel>
                    <div style={{
                      padding: '6px 10px',
                      background: T.void, border: `1px solid ${T.outlineV}`,
                      fontFamily: '"Share Tech Mono", monospace', fontSize: 11, textAlign: 'right',
                      color: T.cream,
                    }}>{pctDañoTotal}%</div>
                  </div>
                </div>
              </div>

              <SmallLabel>Config detectada (catálogo SSW)</SmallLabel>
              <div style={{
                marginTop: 8, padding: '8px 12px',
                background: T.void, border: `1px solid ${T.outlineV}`,
                fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                color: T.outline, lineHeight: 1.7,
              }}>
                <div>Reactor: <span style={{ color: T.bone }}>{config.reactorType}</span> · Estructura: <span style={{ color: T.bone }}>{config.estructuraType}</span></div>
                <div>Blindaje: <span style={{ color: T.bone }}>{config.blindajeType}</span> · Radiadores: <span style={{ color: T.bone }}>{config.radType}</span></div>
                <div>Peso: <span style={{ color: T.bone }}>{config.tons}t</span> · Walk: <span style={{ color: T.bone }}>{config.walkMP}</span></div>
              </div>
            </div>

            {/* Factura — DERECHA */}
            <div>
              <SmallLabel>Factura desglosada</SmallLabel>
              {factura && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FacturaRow label="Reactor"        value={factura.reactor} />
                  <FacturaRow label="Gyro"           value={factura.gyro} />
                  <FacturaRow label="Cabina"         value={factura.cabina} />
                  <FacturaRow label="Soporte vida"   value={factura.soporteVida} />
                  <FacturaRow label="Sensores"       value={factura.sensores} />
                  <FacturaRow label="Estructura"     value={factura.estructura} />
                  <FacturaRow label="Blindaje"       value={factura.blindaje} />
                  <FacturaRow label="Miomero"        value={factura.miomero} />
                  <FacturaRow label="Actuadores"     value={factura.actuadores} />
                  <FacturaRow label="Retros"         value={factura.retros} />
                  <FacturaRow label="Radiadores"     value={factura.radiadores} />
                  <FacturaRow label="Armas"          value={factura.armas} />
                  {(damage.armas?.length ?? 0) > 0 && (
                    <div style={{
                      marginLeft: 12, padding: '4px 8px',
                      borderLeft: `2px solid ${T.outlineV}`,
                      fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline,
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      {(damage.armas ?? []).map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ flex: 1, color: a.status === 'destruida' ? T.bloodLight : T.bone }}>
                            {a.name} <span style={{ color: T.outline }}>
                              [{a.loc} {a.slotsHit}/{a.slotsTotal} · {a.status === 'destruida' ? 'DESTR' : 'parcial'}]
                            </span>
                          </span>
                          <input
                            type="number"
                            value={a.cost || ''}
                            placeholder="₡ coste"
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setDamage(d => ({
                                ...d,
                                armas: (d.armas ?? []).map((w, j) => j === i ? { ...w, cost: val } : w),
                              }));
                            }}
                            style={{
                              width: 90, padding: '2px 4px',
                              background: T.surfaceLow, border: `1px solid ${T.outlineV}`,
                              color: T.bone, fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <FacturaRow label="Munición"       value={factura.municion} />
                  {municionDetalle.length > 0 && (
                    <div style={{
                      marginLeft: 12, padding: '4px 8px',
                      borderLeft: `2px solid ${T.outlineV}`,
                      fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline,
                    }}>
                      {municionDetalle.map((d, i) => {
                        const isLBX = !!d.lbxKey && d.clusterPrice !== undefined;
                        const toggleAmmoType = (next: 'slug' | 'cluster') => {
                          if (!isLBX || d.ammoType === next) return;
                          const price = next === 'cluster' ? (d.clusterPrice ?? 0) : (d.slugPrice ?? 0);
                          const newCost = d.tons * price;
                          setMunicionDetalle(prev => prev.map((e, j) => j === i ? { ...e, ammoType: next, cost: newCost } : e));
                          setDamage(dmg => {
                            const total = municionDetalle.reduce((sum, e, j) => sum + (j === i ? newCost : e.cost), 0);
                            return { ...dmg, municion: total };
                          });
                        };
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ flex: 1 }}>{d.family} ({d.spent} disp · {d.tons}t)</span>
                            {isLBX && (
                              <div style={{ display: 'flex', gap: 2 }}>
                                <button onClick={() => toggleAmmoType('slug')}
                                  style={{
                                    padding: '1px 6px', fontSize: 8, fontFamily: '"Share Tech Mono", monospace',
                                    background: d.ammoType === 'slug' ? T.gold + '30' : 'transparent',
                                    color: d.ammoType === 'slug' ? T.gold : T.outline,
                                    border: `1px solid ${d.ammoType === 'slug' ? T.gold : T.outlineV}`,
                                    cursor: 'pointer', textTransform: 'uppercase',
                                  }}>Slug</button>
                                <button onClick={() => toggleAmmoType('cluster')}
                                  style={{
                                    padding: '1px 6px', fontSize: 8, fontFamily: '"Share Tech Mono", monospace',
                                    background: d.ammoType === 'cluster' ? T.gold + '30' : 'transparent',
                                    color: d.ammoType === 'cluster' ? T.gold : T.outline,
                                    border: `1px solid ${d.ammoType === 'cluster' ? T.gold : T.outlineV}`,
                                    cursor: 'pointer', textTransform: 'uppercase',
                                  }}>Cluster</button>
                              </div>
                            )}
                            <span style={{ color: T.bone, minWidth: 70, textAlign: 'right' }}>{fmtMoney(d.cost)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${T.outlineV}`, paddingTop: 8, marginTop: 6 }}>
                    <FacturaRow label="Subtotal" value={factura.subtotal} color={T.gold} bold />
                  </div>
                  <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 10, color: T.outline, padding: '4px 0' }}>
                    Estado factura: {factura.estadoFacturaPct}%
                  </div>
                  {/* Badge estado mech */}
                  <div style={{
                    marginTop: 6, padding: '8px 12px',
                    background: `${ESTADO_COLOR[factura.estadoMech]}15`,
                    border: `1px solid ${ESTADO_COLOR[factura.estadoMech]}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: T.outline, letterSpacing: 2 }}>
                      ESTADO MECH
                    </span>
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 800,
                      color: ESTADO_COLOR[factura.estadoMech], letterSpacing: 2,
                    }}>
                      {factura.estadoMech}
                    </span>
                  </div>
                  <div style={{ borderTop: `2px solid ${T.gold}`, paddingTop: 10 }}>
                    <FacturaRow label="TOTAL" value={factura.total} color={T.bloodLight} bold />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                <TelegramToggle context="taller" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <SecondaryBtn onClick={onClose}>Cancelar</SecondaryBtn>
                  <PrimaryBtn
                    disabled={!factura || committing}
                    onClick={async () => {
                      if (!factura) return;
                      const mechName = selected?.fullName || mechQuery.trim() || 'Mech';
                      const sysTag   = system === 'canon' ? 'CamOps' : `propio · ${factura.estadoFacturaPct}%`;
                      const restoreTag = simSlotIdx !== null ? ' · sim restaurado' : '';
                      const concepto = `Reparación ${mechName} [${sysTag}]${restoreTag}`;
                      setCommitting(true);
                      await onCommit(factura.total, concepto, mechName);
                      // Si vino del simulador → restaurar slot a estado nuevo
                      if (simSlotIdx !== null) {
                        const ok = restoreMechSlotFull(simSlotIdx);
                        if (ok) {
                          console.log(`[Taller] Slot ${simSlotIdx + 1} restaurado en simulador (armor/IS/crits/ammo).`);
                          onRestore?.();
                        }
                      }
                      // Telegram notif (drop silencioso, post-commit)
                      if (getTelegramToggle('taller') && factura.total > 0) {
                        const event = exceedsTesoreriaUmbral(factura.total) ? 'tesoreria_grande' : 'libro_mayor_relevante';
                        sendTelegramNotif(event, {
                          concepto, cantidad: factura.total,
                          tipo: 'gasto', categoria: 'repuestos',
                        });
                      }
                      setCommitting(false);
                    }}
                  >{committing ? 'Cargando…' : (simSlotIdx !== null ? 'CARGAR + RESTAURAR SIM' : 'CARGAR AL LIBRO MAYOR')}</PrimaryBtn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DmgNum({ label, value, onChange, max, small }: {
  label: string; value: number; onChange: (v: number) => void; max: number; small?: boolean;
}) {
  return (
    <div>
      <div style={{
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: small ? 8 : 9,
        color: T.outline, letterSpacing: 1.5, marginBottom: 3,
      }}>{label}</div>
      <input type="number" min={0} max={max} value={value}
        onChange={e => onChange(Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0)))}
        style={{
          ...inputStyle,
          padding: small ? '4px 6px' : '6px 10px',
          fontSize: small ? 11 : 13,
          fontFamily: '"Share Tech Mono", monospace', textAlign: 'right',
        }} />
    </div>
  );
}

function FacturaRow({ label, value, color, bold }: {
  label: string; value: number; color?: string; bold?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{
        fontFamily: bold ? '"Space Grotesk", sans-serif' : 'Inter, sans-serif',
        fontSize: bold ? 14 : 12,
        fontWeight: bold ? 800 : 500,
        color: color ?? T.cream,
      }}>{label}</span>
      <span style={{
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: bold ? 16 : 12,
        fontWeight: bold ? 800 : 700,
        color: color ?? (value > 0 ? T.creamHi : T.outline),
      }}>{value > 0 ? fmtMoney(value) : '—'}</span>
    </div>
  );
}

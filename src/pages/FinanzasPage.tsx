// ══════════════════════════════════════════════════════════════
//  FINANZAS — Libro Mayor + Personal
//  Tabs: libro-mayor / personal
//  Paleta: amber (civil/contable)
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  loadLibroMayor, saveLibroMayorEntry, deleteLibroMayorEntry,
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

const genId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const rolLabel = (k: PersonalRol) => ROLES.find(r => r.key === k)?.label ?? k;
const catLabel = (k: LibroMayorCategoria) => CATEGORIAS.find(c => c.key === k)?.label ?? k;

// ══════════════════════════════════════════════════════════
//  Componente principal
// ══════════════════════════════════════════════════════════

export function FinanzasPage() {
  const { activeSubTab } = useAppStore();
  const tab = (activeSubTab === 'personal' ? 'personal' : 'libro-mayor') as 'libro-mayor' | 'personal';

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      background: T.void, color: T.cream,
      fontFamily: 'Inter, sans-serif',
      padding: '24px 36px 36px',
    }}>
      {tab === 'libro-mayor' ? <LibroMayorTab /> : <PersonalTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  LIBRO MAYOR
// ══════════════════════════════════════════════════════════

function LibroMayorTab() {
  const [entries, setEntries] = useState<LibroMayorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LibroMayorEntry | null>(null);
  const [filterCat, setFilterCat] = useState<LibroMayorCategoria | 'all'>('all');

  const refresh = async () => {
    setLoading(true);
    const res = await loadLibroMayor();
    if (res.success && Array.isArray((res.data as any)?.entries)) {
      setEntries((res.data as any).entries as LibroMayorEntry[]);
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
      fecha: new Date().toISOString().slice(0, 10),
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
    setEditorOpen(false);
    setEditing(null);
    await saveLibroMayorEntry(payload);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar entrada del Libro Mayor?')) return;
    await deleteLibroMayorEntry(id);
    refresh();
  };

  return (
    <>
      <Header
        title="Libro Mayor"
        subtitle="Ingresos y gastos ad-hoc fuera de misión"
        action={!editorOpen ? <PrimaryBtn onClick={openNew}>+ NUEVA ENTRADA</PrimaryBtn> : null}
      />

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
  const valid = entry.concepto.trim().length > 0 && entry.cantidad > 0;

  return (
    <div style={editorBox}>
      <SmallLabel>{entry.id ? 'Editar Entrada' : 'Nueva Entrada'}</SmallLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 160px 140px', gap: 12, marginTop: 10 }}>
        <FieldLabel>Fecha</FieldLabel>
        <FieldLabel>Concepto</FieldLabel>
        <FieldLabel>Categoría</FieldLabel>
        <FieldLabel>Cantidad ₡</FieldLabel>

        <input type="date" value={entry.fecha.slice(0, 10)}
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

      <div style={{ marginTop: 12 }}>
        <FieldLabel>Nota (opcional)</FieldLabel>
        <input type="text" value={entry.nota}
          onChange={e => setEntry({ ...entry, nota: e.target.value })}
          placeholder="Detalles, referencia, etc."
          style={inputStyle} />
      </div>

      <div style={{ marginTop: 12 }}>
        <FieldLabel>Jugador relacionado (opcional)</FieldLabel>
        <input type="text" value={entry.jugador}
          onChange={e => setEntry({ ...entry, jugador: e.target.value })}
          placeholder="Handle del jugador (Marcos, Jaime…)"
          style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <SecondaryBtn onClick={onCancel}>Cancelar</SecondaryBtn>
        <PrimaryBtn disabled={!valid} onClick={onSave}>Guardar</PrimaryBtn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PERSONAL
// ══════════════════════════════════════════════════════════

function PersonalTab() {
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
      fechaAlta: new Date().toISOString().slice(0, 10),
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

  // Auto-sueldo según rol+nivel
  const recalcSueldo = (rol: PersonalRol, nivel: PersonalNivel) => {
    const base = ROLES.find(r => r.key === rol)?.sueldoDefault ?? 0;
    const mult = NIVELES.find(n => n.key === nivel)?.mult ?? 1;
    return Math.round(base * mult);
  };

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

// ══════════════════════════════════════════════════════════════
//  CRÓNICAS — Bitácora narrativa de la unidad
//  Persiste en localStorage + sync Google Sheets (CRONICAS)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  readCronicas, addCronica, updateCronica, deleteCronica,
  loadCronicasFromSheets, sortCronicas,
  type CronicaEntry, type CronicaAutor, type CronicaTag,
} from '@/lib/cronicas-store';
import { renderMarkdownLite } from '@/lib/markdown-lite';
import { sendTelegramNotif, getTelegramToggle } from '@/lib/telegram-service';
import { TelegramToggle } from '@/components/ui/TelegramToggle';
import {
  readPartes, addParte, updateParte, deleteParte,
  loadPartesFromSheets, type ParteEntry, type ParteTone,
} from '@/lib/parte-store';

// ── Paleta (eco de ComisionPage) ────────────────────────────
const T = {
  void:       '#0a0e14',
  surface:    '#10141a',
  surfaceLow: '#181c22',
  outlineV:   '#4e453a',
  gold:       '#ffd79b',
  cream:      '#e8d5b8',
  creamHi:    '#fff1d6',
  bone:       '#d1c5b6',
  bloodDark:  '#7a1620',
  bloodLight: '#ffb4ab',
  ice:        '#99cfda',
  outline:    '#9a8f81',
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Metadatos autor/tag ────────────────────────────────────
const AUTOR_META: Record<CronicaAutor, { label: string; defaultName: string; color: string; border: string; italic?: boolean }> = {
  mando:        { label: 'MANDO',        defaultName: 'Coronel Karl',  color: T.gold,       border: T.gold       },
  contratista:  { label: 'CONTRATISTA',  defaultName: 'Empleador',     color: T.ice,        border: T.ice        },
  narrador:     { label: 'NARRADOR',     defaultName: 'Cronista',      color: T.bone,       border: T.outline,   italic: true },
};

const TAG_META: Record<CronicaTag, { label: string; color: string }> = {
  aar:        { label: 'AAR',        color: T.ice        },
  politica:   { label: 'POLÍTICA',   color: T.gold       },
  personal:   { label: 'PERSONAL',   color: T.bloodLight },
  salto:      { label: 'SALTO',      color: T.cream      },
};

// ── Helpers ───────────────────────────────────────────────
function formatCampaignDate(y: number, m: number, d: number): string {
  const mes = MESES[m - 1] ?? '—';
  return `${String(d).padStart(2, '0')} · ${mes} · ${y}`;
}

interface FormState {
  id?:           string;
  campaignYear:  number;
  campaignMonth: number;
  campaignDay:   number;
  autor:         CronicaAutor;
  autorNombre:   string;
  titulo:        string;
  cuerpo:        string;
  tag:           CronicaTag;
}

function emptyForm(year: number, month: number): FormState {
  return {
    campaignYear:  year,
    campaignMonth: month,
    campaignDay:   1,
    autor:         'mando',
    autorNombre:   '',
    titulo:        '',
    cuerpo:        '',
    tag:           'aar',
  };
}

// ── Sub-components ────────────────────────────────────────

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
      color: T.gold, letterSpacing: 3, textTransform: 'uppercase',
      marginBottom: 8,
    }}>— {children} —</div>
  );
}

interface EditorProps {
  form:   FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}
function Editor({ form, setForm, onSave, onCancel, isEdit }: EditorProps) {
  const valid = form.titulo.trim().length > 0 && form.cuerpo.trim().length > 0;

  return (
    <div style={{
      background: T.surfaceLow,
      borderLeft: `2px solid ${T.gold}`,
      padding: '18px 22px',
      marginBottom: 20,
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
    }}>
      <SmallLabel>{isEdit ? 'Editar Entrada' : 'Nueva Entrada'}</SmallLabel>

      {/* Fecha campaña */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px 130px 90px 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <FieldLabel>Día</FieldLabel>
          <input type="number" min={1} max={30}
            value={form.campaignDay}
            onChange={e => setForm({ ...form, campaignDay: Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)) })}
            style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Mes</FieldLabel>
          <select value={form.campaignMonth}
            onChange={e => setForm({ ...form, campaignMonth: parseInt(e.target.value, 10) })}
            style={inputStyle}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Año</FieldLabel>
          <input type="number"
            value={form.campaignYear}
            onChange={e => setForm({ ...form, campaignYear: parseInt(e.target.value, 10) || form.campaignYear })}
            style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Tag</FieldLabel>
          <select value={form.tag}
            onChange={e => setForm({ ...form, tag: e.target.value as CronicaTag })}
            style={inputStyle}>
            {(Object.keys(TAG_META) as CronicaTag[]).map(k => (
              <option key={k} value={k}>{TAG_META[k].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Autor */}
      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Autor</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {(Object.keys(AUTOR_META) as CronicaAutor[]).map(k => {
            const meta = AUTOR_META[k];
            const active = form.autor === k;
            return (
              <button key={k} type="button"
                onClick={() => setForm({ ...form, autor: k })}
                style={{
                  flex: 1,
                  background: active ? meta.color : T.void,
                  color: active ? T.void : meta.color,
                  border: `1px solid ${meta.color}`,
                  padding: '8px 0',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: 10, letterSpacing: 2,
                  cursor: 'pointer',
                }}>{meta.label}</button>
            );
          })}
        </div>
        <input type="text"
          placeholder={`Nombre (default: ${AUTOR_META[form.autor].defaultName})`}
          value={form.autorNombre}
          onChange={e => setForm({ ...form, autorNombre: e.target.value })}
          style={inputStyle} />
      </div>

      {/* Título */}
      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Título</FieldLabel>
        <input type="text"
          value={form.titulo}
          onChange={e => setForm({ ...form, titulo: e.target.value })}
          style={inputStyle} />
      </div>

      {/* Cuerpo */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>
          Cuerpo (markdown ligero: **negrita** *cursiva* &gt;cita)
        </FieldLabel>
        <textarea
          value={form.cuerpo}
          onChange={e => setForm({ ...form, cuerpo: e.target.value })}
          rows={8}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.55 }} />
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        {!isEdit && <TelegramToggle context="cronica" />}
        {isEdit && <span />}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={btnStyle(T.outline, false)}>Cancelar</button>
          <button onClick={onSave} disabled={!valid} style={btnStyle(T.gold, valid)}>
            {isEdit ? 'Guardar cambios' : 'Crear entrada'}
          </button>
        </div>
      </div>
    </div>
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
  fontFamily: '"Share Tech Mono", monospace',
  fontSize: 12,
  letterSpacing: 0.5,
  outline: 'none',
};

function btnStyle(color: string, enabled: boolean): React.CSSProperties {
  return {
    background: enabled ? color : T.surfaceLow,
    color: enabled ? T.void : T.outline,
    border: `1px solid ${enabled ? color : T.outlineV}`,
    padding: '8px 18px',
    fontFamily: '"Share Tech Mono", monospace',
    fontSize: 11, letterSpacing: 2,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
  };
}

interface EntryCardProps {
  entry:   CronicaEntry;
  onEdit:  () => void;
  onDelete: () => void;
}
function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const am = AUTOR_META[entry.autor];
  const tm = TAG_META[entry.tag];
  const autorNombre = entry.autorNombre?.trim() || am.defaultName;
  const html = useMemo(() => renderMarkdownLite(entry.cuerpo), [entry.cuerpo]);

  return (
    <article style={{
      background: T.surfaceLow,
      borderLeft: `3px solid ${am.border}`,
      padding: '16px 20px',
      marginBottom: 14,
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
      position: 'relative',
    }}>
      {/* Cabecera */}
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            color: am.color, letterSpacing: 2,
          }}>
            {am.label} · {autorNombre.toUpperCase()}
          </div>
          <h3 style={{
            margin: '4px 0 0',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 700,
            color: T.creamHi, letterSpacing: 0.2,
            fontStyle: am.italic ? 'italic' : 'normal',
          }}>{entry.titulo}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            color: tm.color, letterSpacing: 2,
            border: `1px solid ${tm.color}`, padding: '2px 8px',
          }}>{tm.label}</span>
          <span style={{
            fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
            color: T.outline, letterSpacing: 1.5,
          }}>{formatCampaignDate(entry.campaignYear, entry.campaignMonth, entry.campaignDay)}</span>
        </div>
      </header>

      {/* Cuerpo */}
      <div
        className="cronica-body"
        style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          color: T.bone, lineHeight: 1.6,
          fontStyle: am.italic ? 'italic' : 'normal',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onEdit} style={iconBtn(T.gold)}>EDITAR</button>
        <button onClick={onDelete} style={iconBtn(T.bloodLight)}>BORRAR</button>
      </div>
    </article>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    color, border: `1px solid ${color}40`,
    padding: '4px 10px',
    fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 2,
    cursor: 'pointer',
  };
}

// ── Parte del Día (sección dentro de Crónicas) ─────────────

const PARTE_TONE_META: Record<ParteTone, { label: string; color: string }> = {
  info:      { label: 'INFO',     color: T.ice        },
  victoria:  { label: 'VICTORIA', color: T.gold       },
  warning:   { label: 'WARNING',  color: T.bloodLight },
  status:    { label: 'STATUS',   color: T.cream      },
};

function ParteSection() {
  const [partes, setPartes] = useState<ParteEntry[]>([]);
  const [draftText, setDraftText] = useState('');
  const [draftTone, setDraftTone] = useState<ParteTone>('info');
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    setPartes(readPartes());
    loadPartesFromSheets().then(remote => {
      if (remote && remote.length > 0) setPartes(remote);
    }).catch(() => {});
  }, []);

  function commit() {
    const text = draftText.trim();
    if (!text) return;
    if (editId) {
      updateParte(editId, { text, tone: draftTone });
    } else {
      addParte(text, draftTone);
    }
    setPartes(readPartes());
    setDraftText('');
    setDraftTone('info');
    setEditId(null);
  }

  function startEdit(e: ParteEntry) {
    setEditId(e.id);
    setDraftText(e.text);
    setDraftTone(e.tone);
  }

  function cancelEdit() {
    setEditId(null);
    setDraftText('');
    setDraftTone('info');
  }

  function handleDelete(id: string) {
    if (!confirm('¿Borrar línea de Parte del Día?')) return;
    deleteParte(id);
    setPartes(readPartes());
    if (editId === id) cancelEdit();
  }

  return (
    <div style={{
      background: T.surfaceLow,
      borderLeft: `2px solid ${T.ice}`,
      padding: '16px 20px',
      marginBottom: 22,
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <SmallLabel>Parte del Día</SmallLabel>
        <span style={{
          fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
          color: T.outline, letterSpacing: 1.5,
        }}>
          {partes.length} {partes.length === 1 ? 'línea' : 'líneas'} · 6 visibles en Comisión
        </span>
      </div>

      {/* Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12 }}>
        <input type="text"
          placeholder="Frase informativa…"
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
          style={inputStyle} />
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(PARTE_TONE_META) as ParteTone[]).map(k => {
            const meta = PARTE_TONE_META[k];
            const active = draftTone === k;
            return (
              <button key={k} type="button"
                onClick={() => setDraftTone(k)}
                title={meta.label}
                style={{
                  background: active ? meta.color : 'transparent',
                  color: active ? T.void : meta.color,
                  border: `1px solid ${meta.color}`,
                  padding: '6px 10px',
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 9, letterSpacing: 1.5,
                  cursor: 'pointer',
                }}>{meta.label}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14 }}>
        {editId && (
          <button onClick={cancelEdit} style={btnStyle(T.outline, true)}>Cancelar</button>
        )}
        <button onClick={commit} disabled={!draftText.trim()}
          style={btnStyle(T.ice, !!draftText.trim())}>
          {editId ? 'Guardar cambios' : '+ Añadir'}
        </button>
      </div>

      {/* Lista */}
      {partes.length === 0 ? (
        <div style={{
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
          color: T.outline, letterSpacing: 1.5, padding: '8px 0',
        }}>SIN LÍNEAS REGISTRADAS</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {partes.map((p, i) => {
            const meta = PARTE_TONE_META[p.tone];
            const visible = i < 6;
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '4px 0',
                borderBottom: `1px solid ${T.outlineV}40`,
                opacity: visible ? 1 : 0.5,
              }}>
                <span style={{
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 9,
                  color: meta.color, letterSpacing: 1.5,
                }}>{meta.label}</span>
                <span style={{
                  fontFamily: '"Share Tech Mono", monospace', fontSize: 11,
                  color: meta.color, lineHeight: 1.3,
                }}>{p.text}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(p)} style={iconBtn(T.gold)}>EDIT</button>
                  <button onClick={() => handleDelete(p.id)} style={iconBtn(T.bloodLight)}>×</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────

export function CronicasPage() {
  const { campaign } = useAppStore();
  const year  = campaign.campaignYear  ?? 3026;
  const month = campaign.campaignMonth ?? 1;

  const [entries, setEntries]     = useState<CronicaEntry[]>([]);
  const [filterTag, setFilterTag] = useState<CronicaTag | 'all'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm]           = useState<FormState>(() => emptyForm(year, month));

  // Carga inicial
  useEffect(() => {
    setEntries(readCronicas());
    loadCronicasFromSheets().then(remote => {
      if (remote && remote.length > 0) setEntries(remote);
    }).catch(() => {});
  }, []);

  // Sort + filter
  const visible = useMemo(() => {
    const sorted = sortCronicas(entries);
    return filterTag === 'all' ? sorted : sorted.filter(e => e.tag === filterTag);
  }, [entries, filterTag]);

  function openNew() {
    setForm(emptyForm(year, month));
    setEditorOpen(true);
  }

  function openEdit(e: CronicaEntry) {
    setForm({
      id:            e.id,
      campaignYear:  e.campaignYear,
      campaignMonth: e.campaignMonth,
      campaignDay:   e.campaignDay,
      autor:         e.autor,
      autorNombre:   e.autorNombre ?? '',
      titulo:        e.titulo,
      cuerpo:        e.cuerpo,
      tag:           e.tag,
    });
    setEditorOpen(true);
  }

  function handleSave() {
    const payload = {
      campaignYear:  form.campaignYear,
      campaignMonth: form.campaignMonth,
      campaignDay:   form.campaignDay,
      autor:         form.autor,
      autorNombre:   form.autorNombre.trim() || undefined,
      titulo:        form.titulo.trim(),
      cuerpo:        form.cuerpo,
      tag:           form.tag,
    };
    if (form.id) {
      updateCronica(form.id, payload);
    } else {
      addCronica(payload);
    }
    setEntries(readCronicas());
    setEditorOpen(false);

    // Telegram notif (drop silencioso, sólo en nueva entrada)
    if (!form.id && getTelegramToggle('cronica')) {
      sendTelegramNotif('cronica_nueva', {
        fechaCampaign: `${form.campaignDay}/${form.campaignMonth}/${form.campaignYear}`,
        titulo:        payload.titulo,
        autorNombre:   payload.autorNombre || payload.autor,
        cuerpo:        payload.cuerpo,
      });
    }
  }

  function handleDelete(id: string) {
    if (!confirm('¿Borrar entrada de Crónicas?')) return;
    deleteCronica(id);
    setEntries(readCronicas());
  }

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      background: T.void, color: T.cream,
      fontFamily: 'Inter, sans-serif',
      padding: '24px 36px 36px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.outlineV}`,
      }}>
        <div>
          <div style={{
            fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
            color: T.gold, letterSpacing: 4, textTransform: 'uppercase',
          }}>— Crónicas de Campaña —</div>
          <h1 style={{
            margin: '6px 0 0',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 32, fontWeight: 800,
            color: T.creamHi, letterSpacing: -0.6,
          }}>HISTORIA DE LA UNIDAD</h1>
        </div>
        {!editorOpen && (
          <button onClick={openNew} style={{
            background: T.gold, color: T.void,
            border: 'none', padding: '10px 22px',
            fontFamily: '"Share Tech Mono", monospace', fontSize: 11, letterSpacing: 2,
            cursor: 'pointer',
          }}>+ NUEVA ENTRADA</button>
        )}
      </div>

      {/* Parte del Día — frases rápidas para Comisión */}
      <ParteSection />

      {/* Editor */}
      {editorOpen && (
        <Editor
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={() => setEditorOpen(false)}
          isEdit={!!form.id}
        />
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <FilterChip active={filterTag === 'all'} color={T.gold} label="TODAS"
          onClick={() => setFilterTag('all')} />
        {(Object.keys(TAG_META) as CronicaTag[]).map(k => (
          <FilterChip key={k}
            active={filterTag === k}
            color={TAG_META[k].color}
            label={TAG_META[k].label}
            onClick={() => setFilterTag(k)} />
        ))}
        <div style={{ marginLeft: 'auto', alignSelf: 'center',
          fontFamily: '"Share Tech Mono", monospace', fontSize: 10,
          color: T.outline, letterSpacing: 1.5,
        }}>
          {visible.length} {visible.length === 1 ? 'entrada' : 'entradas'}
        </div>
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          fontFamily: '"Share Tech Mono", monospace', fontSize: 11,
          color: T.outline, letterSpacing: 2,
          border: `1px dashed ${T.outlineV}`,
        }}>
          {entries.length === 0
            ? 'BITÁCORA VACÍA · CREA LA PRIMERA ENTRADA'
            : 'NINGUNA ENTRADA EN ESTA CATEGORÍA'}
        </div>
      ) : (
        visible.map(e => (
          <EntryCard key={e.id} entry={e}
            onEdit={() => openEdit(e)}
            onDelete={() => handleDelete(e.id)} />
        ))
      )}

      {/* Estilos blockquote dentro del cuerpo markdown */}
      <style>{`
        .cronica-body p { margin: 0 0 10px; }
        .cronica-body p:last-child { margin-bottom: 0; }
        .cronica-body strong { color: ${T.creamHi}; font-weight: 700; }
        .cronica-body em { color: ${T.gold}; font-style: italic; }
        .cronica-body blockquote {
          margin: 10px 0;
          padding: 8px 14px;
          border-left: 2px solid ${T.bloodDark};
          color: ${T.cream};
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

interface FilterChipProps {
  active: boolean; color: string; label: string; onClick: () => void;
}
function FilterChip({ active, color, label, onClick }: FilterChipProps) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : 'transparent',
      color: active ? T.void : color,
      border: `1px solid ${color}`,
      padding: '6px 14px',
      fontFamily: '"Share Tech Mono", monospace', fontSize: 10, letterSpacing: 2,
      cursor: 'pointer',
    }}>{label}</button>
  );
}

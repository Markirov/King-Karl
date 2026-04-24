import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { loadConfig, saveConfigBatch } from '@/lib/sheets-service';

// ─── Constants ───────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'] as const;
const YEARS = Array.from({ length: 100 }, (_, i) => 3000 + i);
const PASSWORD = 'Mark';

const COMBAT_DEFAULTS = {
  rangeShort: 0, rangeMedium: 2, rangeLong: 4,
  movStand: 0, movWalk: 1, movRun: 2, movJump: 3,
  movTargetStand: 0, movTargetWalk: 1, movTargetRun: 2, movTargetJump: 3,
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void }

export function SecretMenu({ open, onClose }: Props) {
  const { setCampaign } = useAppStore();
  const [step, setStep] = useState<'password' | 'config'>('password');
  const [pw, setPw]     = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [month, setMonth]       = useState(1);
  const [year, setYear]         = useState(3028);
  const [scriptUrl, setScriptUrl] = useState('');
  const [company, setCompany]   = useState('');
  const [system, setSystem]     = useState('');
  const [faction, setFaction]   = useState('');
  const [prompt, setPrompt]     = useState('');
  const [pilots, setPilots]     = useState<{ name: string; rank: string; mech: string }[]>(
    Array(4).fill(null).map(() => ({ name: '', rank: '', mech: '' })),
  );
  const [combat, setCombat]     = useState(COMBAT_DEFAULTS);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('password'); setPw(''); setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Load config from Sheets after auth
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await loadConfig();
      const cfg = res.success ? (res.data?.config ?? res.data ?? {}) : {};

      setYear(parseInt(cfg['AÑO_CAMPANA']) || 3028);
      setMonth(parseInt(cfg['MES_CAMPANA']) || 1);
      setScriptUrl(localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM') || '');
      setCompany(cfg['COMPANIA_NOMBRE'] || '');
      setSystem(cfg['SISTEMA_ACTUAL'] || '');
      setFaction(cfg['FACCION_ACTUAL'] || '');
      setPrompt(cfg['PROMPT_INSTRUCCIONES'] || '');

      const p = [1, 2, 3, 4].map(i => ({
        name: cfg[`PILOTO_${i}_NOMBRE`] || '',
        rank: cfg[`PILOTO_${i}_RANGO`] || '',
        mech: cfg[`PILOTO_${i}_MECH`] || '',
      }));
      setPilots(p);

      let cc = COMBAT_DEFAULTS;
      try { cc = { ...COMBAT_DEFAULTS, ...JSON.parse(localStorage.getItem('combatConfig') || '{}') }; } catch {}
      setCombat(cc);
    } catch {}
    setLoading(false);
  };

  const verify = () => {
    if (pw === PASSWORD) {
      setStep('config');
      loadData();
    } else {
      setError(true); setPw('');
    }
  };

  const save = async () => {
    setSaving(true);

    // Save URL to localStorage
    if (scriptUrl.trim()) localStorage.setItem('GOOGLE_SCRIPT_URL_CUSTOM', scriptUrl.trim());

    // Save config to Sheets
    const config: Record<string, string> = {
      'AÑO_CAMPANA': String(year),
      'MES_CAMPANA': String(month),
      'COMPANIA_NOMBRE': company,
      'SISTEMA_ACTUAL': system,
      'FACCION_ACTUAL': faction,
      'PROMPT_INSTRUCCIONES': prompt,
    };
    pilots.forEach((p, i) => {
      config[`PILOTO_${i + 1}_NOMBRE`] = p.name;
      config[`PILOTO_${i + 1}_RANGO`] = p.rank;
    });

    try { await saveConfigBatch(config); } catch {}

    // Update Zustand store
    setCampaign({ campaignYear: year, campaignMonth: month, unitName: company || undefined });

    // Save combat config to localStorage
    localStorage.setItem('combatConfig', JSON.stringify(combat));
    localStorage.setItem('CAMPAIGN_YEAR', String(year));
    localStorage.setItem('CAMPAIGN_MONTH', String(month));

    setSaving(false);
    onClose();
  };

  const updatePilot = (idx: number, field: string, val: string) => {
    setPilots(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const updateCombat = (key: string, val: string) => {
    setCombat(prev => ({ ...prev, [key]: parseInt(val) || 0 }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/92 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border-2 border-primary-container w-full max-w-[1100px] max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* ── PASSWORD STEP ── */}
        {step === 'password' && (
          <div className="p-8 flex flex-col items-center gap-4 max-w-sm mx-auto w-full">
            <h2 className="font-mono text-[12px] font-bold text-primary-container uppercase tracking-[3px]">
              Configuracion
            </h2>
            <p className="font-mono text-[10px] text-outline text-center tracking-widest uppercase">
              Introduce la contraseña de administrador
            </p>
            <input
              ref={inputRef} type="password" value={pw}
              onChange={e => { setPw(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="********"
              className={`w-full h-10 bg-surface-container-high border px-3 font-mono text-[13px] text-center focus:outline-none ${
                error ? 'border-error text-error' : 'border-primary-container/40 text-primary-container focus:border-primary-container'
              }`}
            />
            {error && <p className="font-mono text-[9px] text-error">Contraseña incorrecta</p>}
            <div className="grid grid-cols-2 gap-2 w-full">
              <button onClick={verify}
                className="h-9 font-mono text-[10px] font-bold uppercase tracking-widest border-2 border-primary-container text-primary-container hover:bg-primary-container/10 transition-all">
                Acceder
              </button>
              <button onClick={onClose}
                className="h-9 font-mono text-[10px] uppercase tracking-widest border border-outline-variant/30 text-outline hover:text-on-surface transition-all">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIG STEP ── */}
        {step === 'config' && (
          <>
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary-container/30 shrink-0">
              <h3 className="font-mono text-[12px] font-bold text-primary-container uppercase tracking-[2px]">
                Configuracion unificada
              </h3>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 px-3 h-8 bg-green-400/10 border border-green-400 text-green-400 font-mono text-[10px] uppercase tracking-widest hover:bg-green-400/20 disabled:opacity-40 transition-all">
                  {saving ? <Loader size={11} className="animate-spin" /> : <Save size={11} />} Guardar
                </button>
                <button onClick={onClose}
                  className="flex items-center gap-1 px-3 h-8 border border-primary-container/40 text-primary-container font-mono text-[10px] uppercase tracking-widest hover:bg-primary-container/10 transition-all">
                  <X size={11} /> Cerrar
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 font-mono text-[10px] text-outline">
                  <Loader size={14} className="animate-spin" /> Cargando configuración…
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* ─ Database / Sistema ─ */}
                  <div className="bg-primary-container/5 border border-primary-container/20 p-3 space-y-2">
                    <div className="font-mono text-[10px] font-bold text-primary-container uppercase tracking-[2px]">Database / Sistema</div>
                    <Label>Mes campaña</Label>
                    <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
                      className="w-full h-9 bg-surface-container-lowest border border-outline-variant/25 px-2 font-mono text-[11px] text-green-400 focus:outline-none focus:border-primary-container appearance-none cursor-pointer">
                      {MESES.map((m, i) => <option key={i} value={i + 1}>{m.toUpperCase()}</option>)}
                    </select>
                    <Label>Año campaña</Label>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))}
                      className="w-full h-9 bg-surface-container-lowest border border-outline-variant/25 px-2 font-mono text-[11px] text-green-400 focus:outline-none focus:border-primary-container appearance-none cursor-pointer">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <Label>URL Apps Script</Label>
                    <input value={scriptUrl} onChange={e => setScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/..."
                      className="w-full h-8 bg-surface-container-lowest border border-outline-variant/25 px-2 font-mono text-[10px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container" />
                  </div>

                  {/* ─ Crónicas / Campaña ─ */}
                  <div className="bg-primary-container/5 border border-primary-container/20 p-3 space-y-2">
                    <div className="font-mono text-[10px] font-bold text-primary-container uppercase tracking-[2px]">Crónicas / Campaña</div>
                    <Label>Compañía</Label>
                    <Input value={company} onChange={setCompany} />
                    <Label>Sistema</Label>
                    <Input value={system} onChange={setSystem} />
                    <Label>Facción</Label>
                    <Input value={faction} onChange={setFaction} />
                    <Label>Prompt instrucciones</Label>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                      className="w-full bg-surface-container-lowest border border-outline-variant/25 px-2 py-1.5 font-mono text-[10px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container resize-none custom-scrollbar" />
                  </div>

                  {/* ─ Pilotos ─ */}
                  <div className="lg:col-span-2 bg-green-400/5 border border-green-400/20 p-3 space-y-2">
                    <div className="font-mono text-[10px] font-bold text-green-400 uppercase tracking-[2px]">Pilotos (Crónicas)</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {pilots.map((p, i) => (
                        <div key={i} className="space-y-1.5">
                          <input value={p.name} onChange={e => updatePilot(i, 'name', e.target.value)}
                            placeholder={`Piloto ${i + 1}`}
                            className="w-full h-7 bg-surface-container-lowest border border-green-400/20 px-2 font-mono text-[10px] text-on-surface focus:outline-none focus:border-green-400" />
                          <input value={p.rank} onChange={e => updatePilot(i, 'rank', e.target.value)}
                            placeholder="Rango"
                            className="w-full h-7 bg-surface-container-lowest border border-green-400/20 px-2 font-mono text-[10px] text-on-surface focus:outline-none focus:border-green-400" />
                          <input value={p.mech} readOnly title="Solo lectura (desde Sheets)"
                            className="w-full h-7 bg-surface-container-lowest border border-green-400/20 px-2 font-mono text-[10px] text-outline opacity-60 cursor-not-allowed" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ─ Combate (modificadores) ─ */}
                  <div className="lg:col-span-2 bg-secondary/5 border border-secondary/20 p-3 space-y-2">
                    <div className="font-mono text-[10px] font-bold text-secondary uppercase tracking-[2px]">Combate (modificadores)</div>
                    <div className="grid grid-cols-11 gap-1.5">
                      {(Object.keys(COMBAT_DEFAULTS) as (keyof typeof COMBAT_DEFAULTS)[]).map(key => (
                        <input key={key} type="number"
                          value={combat[key]}
                          onChange={e => updateCombat(key, e.target.value)}
                          title={key}
                          className="h-8 bg-surface-container-lowest border border-secondary/20 px-1 font-mono text-[11px] text-on-surface text-center focus:outline-none focus:border-secondary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[9px] text-outline uppercase tracking-widest mt-2">{children}</div>;
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-8 bg-surface-container-lowest border border-outline-variant/25 px-2 font-mono text-[10px] text-on-surface focus:outline-none focus:border-primary-container" />
  );
}

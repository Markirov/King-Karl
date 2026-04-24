import { useState, useEffect, useCallback } from 'react';
import { User, Loader, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { getVeterancy } from '@/lib/barracones-data';
import { loadPlayer, registerMission, registerXPExpense } from '@/lib/sheets-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYERS = ['Marcos', 'Jaime', 'Joan', 'Juan'] as const;
type PlayerName = (typeof PLAYERS)[number];

const PLAYER_COLORS: Record<PlayerName, string> = {
  Marcos: '#4ade80', Jaime: '#60a5fa', Joan: '#fbbf24', Juan: '#c084fc',
};

const PLAYER_DISPLAY: Record<PlayerName, string> = {
  Marcos: 'MARCOS', Jaime: 'JAIME', Joan: 'JOAN', Juan: 'PALACIOS',
};

/** Reroll cost & max per veteran level */
const REROLL_CONFIG: Record<string, { max: number; cost: number }> = {
  Novato:   { max: 1, cost: 100  },
  Regular:  { max: 2, cost: 200  },
  Veterano: { max: 3, cost: 300  },
  Elite:    { max: 4, cost: 1000 },
  As:       { max: 5, cost: 6000 },
};


// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerRow {
  name: PlayerName;
  xpTotal: number;
  xpDisponible: number;
  nivel: string;
  xpGanado: number;
  chequeos: number;
  rerolls: number;
  loading: boolean;
}

const LS_KEY = 'kk_hoja_xp_from_hud';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcSpent(p: PlayerRow) {
  const rc = REROLL_CONFIG[p.nivel] ?? REROLL_CONFIG.Novato;
  return p.rerolls * rc.cost;
}

function fmtNum(n: number) {
  return n.toLocaleString('de-DE'); // dots as thousand separators
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HojaServicioPage() {
  const [players, setPlayers] = useState<PlayerRow[]>(() =>
    PLAYERS.map(name => ({
      name, xpTotal: 0, xpDisponible: 0, nivel: 'Novato',
      xpGanado: 0, chequeos: 0, rerolls: 0, loading: true,
    })),
  );

  const [missionType, setMissionType] = useState('EXPERIENCIA / BALANCE');
  const [duration, setDuration]       = useState('24:00:00');
  const [missionNote, setMissionNote] = useState('MISION COMPLETADA');

  // Finance
  const [pago, setPago]             = useState(0);
  const [salvamento, setSalvamento] = useState(0);
  const [reparacion, setReparacion] = useState(0);
  const [municion, setMunicion]     = useState(0);

  // Status
  const [status, setStatus]       = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // ── Load XP + gastos from HUD + player data from Sheets ────────────────────
  useEffect(() => {
    let hudXP: number[] | null = null;
    let hudGastos: { rerolls: number; chequeos?: number }[] | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { hudXP = JSON.parse(raw); localStorage.removeItem(LS_KEY); }
      const rawG = localStorage.getItem('kk_hoja_gastos_from_hud');
      if (rawG) { hudGastos = JSON.parse(rawG); localStorage.removeItem('kk_hoja_gastos_from_hud'); }
    } catch { /* ignore */ }

    PLAYERS.forEach((name, i) => {
      loadPlayer(name).then(res => {
        const p0 = res.success && res.data?.personajes?.[0];
        const xpTotal      = Number(p0?.xpTotal)      || 0;
        const xpDisponible = Number(p0?.xpDisponible)  || 0;
        const nivel = getVeterancy(xpTotal).nombre;
        const hg = hudGastos?.[i];
        setPlayers(prev => prev.map((p, j) => j === i ? {
          ...p, xpTotal, xpDisponible, nivel, loading: false,
          xpGanado: hudXP ? (hudXP[i] ?? 0) : p.xpGanado,
          rerolls: hg ? hg.rerolls : p.rerolls,
          chequeos: hg?.chequeos ?? p.chequeos,
        } : p));
      }).catch(() => {
        setPlayers(prev => prev.map((p, j) => j === i ? { ...p, loading: false } : p));
      });
    });
  }, []);

  // ── Player updater ────────────────────────────────────────────────────────
  const upd = useCallback((idx: number, patch: Partial<PlayerRow>) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }, []);

  // ── Finance ───────────────────────────────────────────────────────────────
  const balance = pago + salvamento - reparacion - municion;

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const xpMap: Record<string, number> = {};
    players.forEach(p => { xpMap[p.name] = p.xpGanado; });

    const hasAnything = players.some(p => p.xpGanado > 0 || calcSpent(p) > 0)
                        || pago > 0 || salvamento > 0 || reparacion > 0 || municion > 0;
    if (!hasAnything) { setStatus('error'); setStatusMsg('Nada que registrar'); return; }

    setStatus('loading');
    setStatusMsg('Registrando misión…');

    try {
      const res = await registerMission(xpMap, pago + salvamento, reparacion + municion);
      if (!res.success) throw new Error(res.error ?? 'Error de red');

      // Register individual XP expenses
      for (const p of players) {
        const spent = calcSpent(p);
        if (spent > 0) {
          const rc = REROLL_CONFIG[p.nivel] ?? REROLL_CONFIG.Novato;
          if (p.rerolls > 0) {
            for (let r = 0; r < p.rerolls; r++) {
              await registerXPExpense(p.name, rc.cost, `${p.name}: Repetir Tirada (${p.nivel})`);
            }
          }
        }
      }

      setStatus('ok');
      setStatusMsg('Misión registrada correctamente');
      // Reset form after successful registration
      setPlayers(prev => prev.map(p => ({ ...p, xpGanado: 0, chequeos: 0, rerolls: 0 })));
      setPago(0); setSalvamento(0); setReparacion(0); setMunicion(0);
    } catch (e: any) {
      setStatus('error');
      setStatusMsg(`Error: ${e.message || e}`);
    }
  };

  const handleReset = () => {
    setPlayers(prev => prev.map(p => ({ ...p, xpGanado: 0, chequeos: 0, rerolls: 0 })));
    setPago(0); setSalvamento(0); setReparacion(0); setMunicion(0);
    setStatus('idle'); setStatusMsg('');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 pb-20 animate-[fadeInUp_0.3s_ease]">

      {/* ═══ HERO TITLE ═══ */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex-1" />
          <div className="text-right shrink-0">
            <div className="font-mono text-[8px] text-outline/40 tracking-[2px] uppercase">
              VER_0825.4.HUD // RESUMEN TACTICo
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-4 mb-3">
          <h1 className="font-headline text-5xl font-black italic text-primary uppercase leading-none tracking-tight">
            Informe de Mision
          </h1>
          <div className="text-right shrink-0">
            <div className="font-mono text-[8px] text-outline/40 uppercase tracking-[2px] mb-0.5">Tipo de Registro</div>
            <input
              value={missionType}
              onChange={e => setMissionType(e.target.value)}
              className="bg-transparent font-headline text-[15px] font-bold text-primary-container uppercase tracking-widest text-right border-none focus:outline-none w-72"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-secondary/60">◇</span>
          <span className="text-secondary/60 uppercase tracking-widest">Duration:</span>
          <input
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="bg-transparent font-mono text-sm text-on-surface-variant/70 border-none focus:outline-none w-28"
          />
          <span className="text-outline/30">//</span>
          <span className="font-mono text-sm text-on-surface-variant/70 uppercase tracking-wider">{missionNote}</span>
        </div>
      </div>

      {/* ═══ MAIN 2-COL LAYOUT ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 max-w-[1200px]">

        {/* ─── LEFT: ANALISIS DE COMBATE DE PILOTOS ─── */}
        <div className="bg-surface-container-low/80 border border-outline-variant/8 overflow-hidden">

          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-outline-variant/8">
            <h2 className="font-headline text-[11px] font-bold text-on-surface tracking-[2px] uppercase">
              Analisis de combate de pilotos
            </h2>
            <span className="font-mono text-[9px] text-secondary/40 tracking-widest uppercase">Squad_ID: KKK</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_100px_90px_100px_80px_90px_100px] items-center px-6 py-3 border-b border-outline-variant/6">
            <span />
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Nombre</span>
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Exp actual</span>
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Exp ganada</span>
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Chequeos</span>
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Gastada</span>
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Total sesión</span>
            <span className="font-mono text-[9px] text-secondary/30 uppercase tracking-[3px]">Exp final</span>
          </div>

          {/* ── Player rows ── */}
          {players.map((p, i) => {
            const spent = calcSpent(p);
            const sessionNet = p.xpGanado + p.chequeos - spent;
            // Positive: adds to total (and disponible). Negative: only subtracts from disponible.
            const xpTotalFinal = sessionNet >= 0 ? p.xpTotal + sessionNet : p.xpTotal;
            const xpDispFinal  = p.xpDisponible + sessionNet;
            return (
              <div key={p.name}
                className="grid grid-cols-[32px_1fr_100px_90px_100px_80px_90px_100px] items-center px-6 py-4 border-b border-outline-variant/6 transition-colors hover:bg-surface-container/30">

                {/* Icon */}
                <User size={14} className="opacity-40" style={{ color: PLAYER_COLORS[p.name] }} />

                {/* Name */}
                <span className="font-headline text-[13px] font-bold uppercase tracking-wider text-primary-container">
                  {PLAYER_DISPLAY[p.name]}
                </span>

                {/* Current XP */}
                <span className="font-mono text-[12px] text-on-surface-variant/70">
                  {p.loading
                    ? <Loader size={11} className="animate-spin text-outline/40" />
                    : <>{fmtNum(p.xpTotal)} <span className="text-[9px] text-outline/40">PX</span></>
                  }
                </span>

                {/* XP Ganada */}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-green-400">+</span>
                  <input type="number" min={0} value={p.xpGanado}
                    onChange={e => upd(i, { xpGanado: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-14 h-7 bg-transparent border border-outline-variant/8 px-1 font-mono text-[12px] text-green-400 font-bold text-center focus:outline-none focus:border-green-400/30"
                  />
                  <span className="font-mono text-[9px] text-outline/40">XP</span>
                </div>

                {/* Chequeos ±100 */}
                <div className="flex items-center gap-1">
                  <button onClick={() => upd(i, { chequeos: p.chequeos - 100 })}
                    className="w-5 h-5 flex items-center justify-center border border-outline-variant/10 font-mono text-[9px] text-error/70 hover:bg-error/10 hover:text-error transition-all select-none">
                    −
                  </button>
                  <span className={`font-mono text-[11px] font-bold w-10 text-center ${p.chequeos > 0 ? 'text-amber-400' : p.chequeos < 0 ? 'text-error' : 'text-outline/30'}`}>
                    {p.chequeos !== 0 ? (p.chequeos > 0 ? `+${p.chequeos}` : p.chequeos) : '0'}
                  </span>
                  <button onClick={() => upd(i, { chequeos: p.chequeos + 100 })}
                    className="w-5 h-5 flex items-center justify-center border border-outline-variant/10 font-mono text-[9px] text-green-400/70 hover:bg-green-400/10 hover:text-green-400 transition-all select-none">
                    +
                  </button>
                </div>

                {/* XP Gastada (rerolls + iniciativa) */}
                <span className={`font-mono text-[12px] font-bold ${spent > 0 ? 'text-error' : 'text-outline/30'}`}>
                  {spent > 0 ? `−${spent}` : '0'} <span className="text-[9px] font-normal">XP</span>
                </span>

                {/* Total sesión (ganado + chequeos − gastado) */}
                <span className={`font-mono text-[12px] font-bold ${sessionNet > 0 ? 'text-green-400' : sessionNet < 0 ? 'text-error' : 'text-outline/30'}`}>
                  {sessionNet > 0 ? '+' : ''}{sessionNet !== 0 ? fmtNum(sessionNet) : '0'} <span className="text-[9px] font-normal">XP</span>
                </span>

                {/* Exp final */}
                <div className="flex flex-col">
                  {p.loading ? <span className="font-mono text-[12px] text-outline/40">—</span> : (
                    <>
                      <span className="font-mono text-[12px] font-bold text-primary-container">
                        {fmtNum(xpTotalFinal)} <span className="text-[9px] font-normal text-outline/40">PX</span>
                      </span>
                      {sessionNet < 0 && (
                        <span className={`font-mono text-[9px] ${xpDispFinal < 0 ? 'text-error' : 'text-outline/50'}`}>
                          disp: {fmtNum(xpDispFinal)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── GASTOS DE SESION (below table) ── */}
          <div className="px-6 py-5 border-t border-outline-variant/8">
            <div className="font-mono text-[8px] text-outline/40 uppercase tracking-[3px] mb-4">
              Gastos de sesion
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {players.map((p, i) => {
                const rc = REROLL_CONFIG[p.nivel] ?? REROLL_CONFIG.Novato;
                const spent = calcSpent(p);
                const canAfford = (cost: number) => p.xpDisponible - spent - cost >= 0;

                return (
                  <div key={p.name} className="bg-surface-container-low/50 border border-outline-variant/8 border-t-2 border-t-primary-container/20 p-3 space-y-2">
                    {/* Player name + nivel */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: PLAYER_COLORS[p.name] }}>
                        {PLAYER_DISPLAY[p.name]}
                      </span>
                      <span className="font-mono text-[8px] text-outline/40">{p.nivel}</span>
                    </div>

                    {/* XP Disponible */}
                    <div className="flex items-center justify-between bg-green-400/3 border border-green-400/10 px-2 py-1">
                      <span className="font-mono text-[8px] text-outline/40">XP Disponible</span>
                      <span className="font-mono text-[11px] text-green-400 font-bold">
                        {p.loading ? '…' : fmtNum(p.xpDisponible)}
                      </span>
                    </div>

                    {/* Reroll buttons */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[7px] text-outline/40 uppercase tracking-widest">Repetir Tirada</span>
                        <span className={`font-mono text-[8px] ${p.rerolls > 0 ? 'text-amber-400' : 'text-outline/30'}`}>
                          {p.rerolls}/{rc.max}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: rc.max }).map((_, ri) => (
                          <button key={ri}
                            onClick={() => {
                              if (p.rerolls <= ri) {
                                if (canAfford(rc.cost)) upd(i, { rerolls: ri + 1 });
                              } else {
                                upd(i, { rerolls: ri });
                              }
                            }}
                            disabled={p.loading}
                            className={`flex-1 h-5 font-mono text-[7px] border transition-all ${
                              ri < p.rerolls
                                ? 'bg-amber-400/10 border-amber-400/50 text-amber-400'
                                : 'border-outline-variant/10 text-outline/30 hover:border-outline-variant/20'
                            } disabled:opacity-30`}>
                            R{ri + 1}
                          </button>
                        ))}
                      </div>
                      <div className="font-mono text-[7px] text-outline/30 text-right">
                        {rc.cost} XP c/u
                      </div>
                    </div>

                    {/* Total spent */}
                    <div className="flex items-center justify-between border-t border-outline-variant/8 pt-1.5">
                      <span className="font-mono text-[8px] text-outline/40">Total gastado:</span>
                      <span className={`font-mono text-[10px] font-bold ${spent > 0 ? 'text-error' : 'text-outline/30'}`}>
                        {spent > 0 ? `−${spent} XP` : '0 XP'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: REPORTE FINANCIERO + ACTIONS ─── */}
        <div className="space-y-4">

          {/* Financial report */}
          <div className="bg-surface-container/60 border border-outline-variant/8 p-6">
            <h2 className="font-headline text-base font-bold text-on-surface tracking-[2px] uppercase mb-4">
              Reporte financiero
            </h2>

            <div className="divide-y divide-outline-variant/6">
              {/* PAGO POR CONTRATO */}
              <FinRow label="Pago por contrato" sign="" color="text-primary" labelColor="text-secondary/40"
                value={pago} onChange={setPago} />

              {/* SALVAMENTO */}
              <FinRow label="Salvamento" sign="+" color="text-primary" labelColor="text-secondary/40" signColor="text-green-400"
                value={salvamento} onChange={setSalvamento} />

              {/* COSTES DE REPARACIÓN */}
              <FinRow label="Costes de reparación" sign="−" color="text-error" labelColor="text-error/50" signColor="text-error"
                value={reparacion} onChange={setReparacion} />

              {/* AMMO RESUPPLY */}
              <FinRow label="Ammo resupply" sign="−" color="text-error" labelColor="text-error/50" signColor="text-error"
                value={municion} onChange={setMunicion} />
            </div>

            {/* BALANCE */}
            <div className="border-t border-outline-variant/8 pt-5 mt-4">
              <div className="font-mono text-[8px] text-outline/30 uppercase tracking-[3px] mb-2">Balance</div>
              <div className={`font-headline text-4xl font-black leading-none ${balance >= 0 ? 'text-primary' : 'text-error'}`}>
                {balance < 0 ? '−' : ''}{fmtNum(Math.abs(balance))}
              </div>
              <div className="font-mono text-xs text-outline/40 uppercase tracking-widest mt-1">C-BILLS ₡</div>
            </div>
          </div>

          {/* System heat decorative box */}
          <div className="bg-surface-container-low/50 border border-outline-variant/8 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-outline/50 uppercase tracking-[3px]">System heat: nominal</span>
              <span className="font-mono text-[12px] text-green-400 font-bold">42°C</span>
            </div>
            {/* Heat bar */}
            <div className="flex gap-1 h-3">
              <div className="flex-[3] bg-secondary/40" />
              <div className="flex-[2] bg-secondary/25" />
              <div className="flex-[1] bg-secondary/15" />
              <div className="flex-[2] bg-outline-variant/10" />
              <div className="flex-[2] bg-outline-variant/5" />
            </div>
            <div className="font-mono text-[8px] text-outline/30 leading-relaxed">
              // SENSOR LOGS CAPTURED // ENEMY SALVAGE DETECTED<br />
              // PREPARING LOGISTICS FOR DEPARTURE //
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <button
            onClick={handleRegister}
            disabled={status === 'loading'}
            className="w-full h-12 font-headline text-[11px] font-bold uppercase tracking-[3px] border border-green-400/60 text-green-400 hover:bg-green-400/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
            {status === 'loading'
              ? <><Loader size={12} className="animate-spin" /> Registrando…</>
              : '📡 Registrar mision'}
          </button>

          <button
            onClick={handleReset}
            className="w-full h-8 font-mono text-[9px] uppercase tracking-widest border border-outline-variant/10 text-outline/40 hover:border-secondary/30 hover:text-secondary transition-all flex items-center justify-center gap-1.5">
            <RotateCcw size={9} /> Limpiar formulario
          </button>

          {/* Status message */}
          {statusMsg && (
            <div className={`flex items-center gap-2 font-mono text-[10px] py-2 px-3 border ${
              status === 'ok'    ? 'text-green-400 border-green-400/20 bg-green-400/5' :
              status === 'error' ? 'text-error border-error/20 bg-error/5' :
                                   'text-amber-400 border-amber-400/20 bg-amber-400/5'
            }`}>
              {status === 'ok' ? <CheckCircle size={11} /> : status === 'error' ? <AlertCircle size={11} /> : <Loader size={11} className="animate-spin" />}
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Finance row sub-component ───────────────────────────────────────────────

function FinRow({ label, sign, color, labelColor, signColor, value, onChange }: {
  label: string; sign: string; color: string;
  labelColor?: string; signColor?: string;
  value: number; onChange: (v: number) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, '');
    onChange(Math.max(0, parseInt(raw) || 0));
  };

  return (
    <div className="py-3">
      <div className={`font-mono text-[8px] uppercase tracking-[2px] mb-1 ${labelColor || 'text-outline'}`}>
        {label}
      </div>
      <div className="flex items-baseline justify-end gap-1.5">
        {sign && <span className={`font-mono text-base ${signColor || color} shrink-0`}>{sign}</span>}
        <input value={fmtNum(value)}
          onChange={handleChange}
          className={`w-full h-10 bg-transparent border-none font-headline text-2xl font-black text-right focus:outline-none ${color}`}
        />
        <span className={`font-mono text-sm shrink-0 ${color}`}>₡</span>
      </div>
    </div>
  );
}

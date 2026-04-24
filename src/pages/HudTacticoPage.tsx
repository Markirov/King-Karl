import { useReducer, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Play, RotateCcw, Cloud, Download, Upload, ChevronDown, ChevronUp, Skull, Shield, FileText, Search } from 'lucide-react';
import { getVeterancy } from '@/lib/barracones-data';
import { loadPlayer } from '@/lib/sheets-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYER_NAMES = ['Marcos', 'Jaime', 'Joan', 'Alex', 'Invitado'] as const;
const PLAYER_SHEET_NAMES = ['Marcos', 'Jaime', 'Joan', 'Juan'] as const;
const PLAYER_COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#c084fc', '#f87171'] as const;
const ENEMY_COLORS  = ['#ef4444', '#22c55e', '#3b82f6', '#fbbf24', '#ec4899'] as const;

const REROLL_CONFIG: Record<string, { max: number; cost: number }> = {
  Novato: { max: 1, cost: 100 }, Regular: { max: 2, cost: 200 },
  Veterano: { max: 3, cost: 500 }, Elite: { max: 4, cost: 1000 }, As: { max: 5, cost: 6000 },
};
const INIT_COST = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerInfo { nivel: string; maxRerolls: number; rerollCost: number; }
interface BTEnemy   { id: string; name: string; xp: number; color: string; }
interface SavedForce { id: string; name: string; createdAt: string; units: { name: string; xp: number; color: string }[]; }
type Step = 'setup' | 'combat' | 'results';

interface BTState {
  step: Step;
  numPlayers: number;
  enemies: BTEnemy[];
  hits: Record<string, number[]>;
  dead: Record<string, boolean>;   // true = abatido (da XP)
  bonus: Record<number, number>;   // playerIdx → bonus/malus XP
  rerolls: Record<number, number>;    // playerIdx → rerolls used
  iniciativa: Record<number, boolean>; // playerIdx → initiative purchased
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_PLAYERS'; n: number }
  | { type: 'ADD_ENEMY'; enemy: BTEnemy }
  | { type: 'REMOVE_ENEMY'; id: string }
  | { type: 'UPDATE_ENEMY'; id: string; patch: Partial<BTEnemy> }
  | { type: 'LOAD_ENEMIES'; enemies: BTEnemy[] }
  | { type: 'START' }
  | { type: 'HIT'; eid: string; pidx: number; delta: number }
  | { type: 'TOGGLE_DEAD'; id: string }
  | { type: 'ADJ_BONUS'; pidx: number; delta: number }
  | { type: 'SET_REROLLS'; pidx: number; value: number }
  | { type: 'TOGGLE_INIT'; pidx: number }
  | { type: 'FINISH' }
  | { type: 'BACK_TO_SETUP' }
  | { type: 'RESET' };

const INIT: BTState = { step: 'setup', numPlayers: 3, enemies: [], hits: {}, dead: {}, bonus: {}, rerolls: {}, iniciativa: {} };

function mkHits(n: number) { return Array(n).fill(0); }

function reducer(s: BTState, a: Action): BTState {
  switch (a.type) {
    case 'SET_PLAYERS': {
      const hits = Object.fromEntries(s.enemies.map(e => [e.id, mkHits(a.n)]));
      return { ...s, numPlayers: a.n, hits };
    }
    case 'ADD_ENEMY': {
      return {
        ...s,
        enemies: [...s.enemies, a.enemy],
        hits: { ...s.hits, [a.enemy.id]: mkHits(s.numPlayers) },
        dead:  { ...s.dead,  [a.enemy.id]: true },
      };
    }
    case 'REMOVE_ENEMY': {
      const { [a.id]: _h, ...hits } = s.hits;
      const { [a.id]: _d, ...dead  } = s.dead;
      return { ...s, enemies: s.enemies.filter(e => e.id !== a.id), hits, dead };
    }
    case 'UPDATE_ENEMY':
      return { ...s, enemies: s.enemies.map(e => e.id === a.id ? { ...e, ...a.patch } : e) };
    case 'LOAD_ENEMIES': {
      const hits = Object.fromEntries(a.enemies.map(e => [e.id, mkHits(s.numPlayers)]));
      const dead  = Object.fromEntries(a.enemies.map(e => [e.id, true]));
      return { ...s, enemies: a.enemies, hits, dead };
    }
    case 'START':
      return { ...s, step: 'combat', bonus: {} };
    case 'HIT': {
      const arr = [...(s.hits[a.eid] ?? mkHits(s.numPlayers))];
      arr[a.pidx] = Math.max(0, (arr[a.pidx] ?? 0) + a.delta);
      return { ...s, hits: { ...s.hits, [a.eid]: arr } };
    }
    case 'TOGGLE_DEAD':
      return { ...s, dead: { ...s.dead, [a.id]: !s.dead[a.id] } };
    case 'ADJ_BONUS':
      return { ...s, bonus: { ...s.bonus, [a.pidx]: (s.bonus[a.pidx] ?? 0) + a.delta } };
    case 'SET_REROLLS':
      return { ...s, rerolls: { ...s.rerolls, [a.pidx]: a.value } };
    case 'TOGGLE_INIT':
      return { ...s, iniciativa: { ...s.iniciativa, [a.pidx]: !s.iniciativa[a.pidx] } };
    case 'FINISH':
      return { ...s, step: 'results' };
    case 'BACK_TO_SETUP':
      return { ...s, step: 'setup' };
    case 'RESET':
      return { ...INIT, numPlayers: s.numPlayers };
    default: return s;
  }
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

function calcXP(s: BTState): number[] {
  const totals = Array(s.numPlayers).fill(0);
  for (const enemy of s.enemies) {
    if (!s.dead[enemy.id]) continue;
    const hArr = s.hits[enemy.id] ?? [];
    const totalHits = hArr.reduce((a, b) => a + b, 0);
    if (totalHits > 0) {
      const perHit = enemy.xp / totalHits;
      hArr.forEach((h, i) => { totals[i] += h * perHit; });
    }
  }
  return totals.map((v, i) => Math.max(0, Math.floor(v) + (s.bonus[i] ?? 0)));
}

// ─── Saved Forces (localStorage) ──────────────────────────────────────────────

const FORCES_KEY = 'kk_bt_saved_forces';
function loadForces(): SavedForce[]  { try { return JSON.parse(localStorage.getItem(FORCES_KEY) ?? '[]'); } catch { return []; } }
function saveForces(f: SavedForce[]) { localStorage.setItem(FORCES_KEY, JSON.stringify(f)); }

// ─── Catalog types ───────────────────────────────────────────────────────────

interface CatalogEntry { name: string; bv2: number; type?: string; kind: 'mech' | 'vehicle' }

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HudTacticoPage() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const navigate = useNavigate();
  const [forces, setForcesState] = useState<SavedForce[]>(loadForces);
  const [newName, setNewName] = useState('');
  const [newXP,   setNewXP]   = useState('');
  const [forceName, setForceName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Player info (loaded from Sheets)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo[]>(
    Array(5).fill(null).map(() => ({ nivel: 'Novato', maxRerolls: 1, rerollCost: 100 })),
  );

  useEffect(() => {
    PLAYER_SHEET_NAMES.forEach((name, i) => {
      loadPlayer(name).then(res => {
        const p0 = res.success && res.data?.personajes?.[0];
        const xpTotal = Number(p0?.xpTotal) || 0;
        const nivel = getVeterancy(xpTotal).nombre;
        const rc = REROLL_CONFIG[nivel] ?? REROLL_CONFIG.Novato;
        setPlayerInfo(prev => prev.map((pi, j) => j === i
          ? { nivel, maxRerolls: rc.max, rerollCost: rc.cost } : pi));
      }).catch(() => {});
    });
  }, []);

  // Catalog search
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catQuery, setCatQuery] = useState('');

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}assets/mechs/index.json`).then(r => r.json()).then((arr: any[]) =>
        arr.map(m => ({ name: m.name, bv2: m.bv2, kind: 'mech' as const }))),
      fetch(`${base}assets/vehicles/index.json`).then(r => r.json()).then((arr: any[]) =>
        arr.map(v => ({ name: v.name, bv2: v.bv2, type: v.type, kind: 'vehicle' as const }))),
    ]).then(([mechs, vehicles]) => setCatalog([...mechs, ...vehicles]))
      .catch(() => {});
  }, []);

  const catResults = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return catalog.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [catQuery, catalog]);

  // ── Enemy helpers ─────────────────────────────────────────────────────────
  const addEnemy = useCallback(() => {
    const name = newName.trim();
    const xp   = parseInt(newXP);
    if (!name || !xp || xp <= 0) return;
    dispatch({ type: 'ADD_ENEMY', enemy: { id: Date.now().toString(), name, xp, color: '#fbbf24' } });
    setNewName(''); setNewXP('');
  }, [newName, newXP]);

  // ── Forces helpers ────────────────────────────────────────────────────────
  const saveForce = useCallback(() => {
    const n = forceName.trim();
    if (!n || state.enemies.length === 0) return;
    const updated = forces.filter(f => f.name.toLowerCase() !== n.toLowerCase());
    const newForce: SavedForce = {
      id: Date.now().toString(), name: n, createdAt: new Date().toISOString(),
      units: state.enemies.map(e => ({ name: e.name, xp: e.xp, color: e.color })),
    };
    updated.push(newForce);
    saveForces(updated); setForcesState(updated); setForceName('');
  }, [forceName, state.enemies, forces]);

  const loadForce = useCallback((id: string, replace: boolean) => {
    const force = forces.find(f => f.id === id);
    if (!force) return;
    const newEnemies: BTEnemy[] = force.units.map(u => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: u.name, xp: u.xp, color: u.color,
    }));
    if (replace) {
      dispatch({ type: 'LOAD_ENEMIES', enemies: newEnemies });
    } else {
      newEnemies.forEach(e => dispatch({ type: 'ADD_ENEMY', enemy: e }));
    }
  }, [forces]);

  const deleteForce = useCallback((id: string) => {
    const updated = forces.filter(f => f.id !== id);
    saveForces(updated); setForcesState(updated);
  }, [forces]);

  const exportForces = useCallback(() => {
    const blob = new Blob([JSON.stringify(forces, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bt-forces.json'; a.click();
    URL.revokeObjectURL(url);
  }, [forces]);

  const importForces = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) { saveForces(data); setForcesState(data); }
      } catch { /* ignore */ }
    };
    reader.readAsText(file); e.target.value = '';
  }, []);

  const canStart = state.enemies.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase">
          HUD TACTICO
        </h1>
        <div className="flex items-center gap-2 font-mono text-[10px] text-outline uppercase tracking-widest">
          {(['setup','combat','results'] as Step[]).map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-outline">›</span>}
              <span className={state.step === step ? 'text-green-400 font-bold' : ''}>
                {step === 'setup' ? 'Preparación' : step === 'combat' ? 'Combate' : 'Resultados'}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── SETUP VIEW ── */}
      {state.step === 'setup' && (
        <div className="max-w-2xl space-y-5">

          {/* Jugadores */}
          <section className="bg-surface-container p-4 border-t-2 border-primary-container">
            <h2 className="font-headline text-[10px] font-bold text-primary-container tracking-[3px] uppercase mb-3">
              Combatientes activos
            </h2>
            <div className="flex gap-2 mb-4">
              {[3, 4, 5].map(n => (
                <button key={n} onClick={() => dispatch({ type: 'SET_PLAYERS', n })}
                  className={`flex-1 h-10 font-headline text-sm font-bold border transition-all ${
                    state.numPlayers === n
                      ? 'bg-primary-container/20 border-primary-container text-primary-container'
                      : 'border-outline-variant/30 text-outline hover:border-primary-container hover:text-primary-container'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: state.numPlayers }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-l-2 bg-surface-container-high"
                  style={{ borderColor: PLAYER_COLORS[i] }}>
                  <span className="font-mono text-[9px] font-bold" style={{ color: PLAYER_COLORS[i] }}>P{i + 1}</span>
                  <span className="font-mono text-[11px] text-on-surface">{PLAYER_NAMES[i]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Añadir hostiles */}
          <section className="bg-surface-container p-4 border-t-2 border-error">
            <h2 className="font-headline text-[10px] font-bold text-error tracking-[3px] uppercase mb-3">
              Hostiles
            </h2>
            {/* Manual add form */}
            <div className="flex gap-2 mb-2">
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEnemy()}
                placeholder="Nombre (ej. Atlas AS7-D)"
                className="flex-1 h-9 bg-surface-container-high border border-outline-variant/30 px-3 font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container"
              />
              <input
                value={newXP} onChange={e => setNewXP(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEnemy()}
                type="number" placeholder="BV/XP" min={1}
                className="w-24 h-9 bg-surface-container-high border border-outline-variant/30 px-2 font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container text-center"
              />
              <button onClick={addEnemy} disabled={!newName.trim() || !newXP}
                className="w-9 h-9 flex items-center justify-center border border-green-400 text-green-400 hover:bg-green-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <Plus size={14} />
              </button>
            </div>

            {/* Catalog search */}
            <div className="relative mb-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                  <input
                    value={catQuery} onChange={e => setCatQuery(e.target.value)}
                    placeholder="Buscar en catálogo (mechs / vehículos)…"
                    className="w-full h-8 bg-surface-container-high border border-outline-variant/20 pl-7 pr-3 font-mono text-[10px] text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
              {catResults.length > 0 && (
                <div className="absolute z-10 top-9 left-0 right-0 bg-surface-container-high border border-outline-variant/30 shadow-lg max-h-52 overflow-y-auto">
                  {catResults.map((c, ci) => (
                    <button key={ci}
                      onClick={() => {
                        dispatch({ type: 'ADD_ENEMY', enemy: {
                          id: Date.now().toString() + ci,
                          name: c.name, xp: c.bv2, color: '#fbbf24',
                        }});
                        setCatQuery('');
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-container-highest transition-colors text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-[8px] uppercase tracking-wider shrink-0 ${c.kind === 'mech' ? 'text-green-400' : 'text-secondary'}`}>
                          {c.kind === 'mech' ? 'MCH' : 'VHC'}
                        </span>
                        <span className="font-mono text-[10px] text-on-surface truncate">{c.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-green-400 font-bold shrink-0 ml-2">{c.bv2} BV</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Enemy list */}
            {state.enemies.length === 0 ? (
              <p className="text-[10px] font-mono text-outline italic text-center py-4">Sin hostiles — añade unidades enemigas</p>
            ) : (
              <div className="space-y-2">
                {state.enemies.map(e => (
                  <EnemySetupRow key={e.id} enemy={e}
                    onUpdate={patch => dispatch({ type: 'UPDATE_ENEMY', id: e.id, patch })}
                    onRemove={() => dispatch({ type: 'REMOVE_ENEMY', id: e.id })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Fuerzas guardadas */}
          <section className="bg-surface-container p-4 border-t-2 border-secondary">
            <h2 className="font-headline text-[10px] font-bold text-secondary tracking-[3px] uppercase mb-3">
              Fuerzas guardadas
            </h2>

            {/* Save current */}
            <div className="flex gap-2 mb-3">
              <input value={forceName} onChange={e => setForceName(e.target.value)}
                placeholder="Nombre de la fuerza…"
                className="flex-1 h-8 bg-surface-container-high border border-outline-variant/30 px-3 font-mono text-[10px] text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary"
              />
              <button onClick={saveForce} disabled={!forceName.trim() || state.enemies.length === 0}
                className="flex items-center gap-1 px-3 h-8 border border-secondary text-secondary hover:bg-secondary/10 font-mono text-[9px] uppercase tracking-widest disabled:opacity-30 transition-all">
                <Download size={10} /> Guardar
              </button>
            </div>

            {/* Export/Import */}
            <div className="flex gap-2 mb-3 pb-3 border-b border-outline-variant/20">
              <button onClick={exportForces}
                className="flex items-center gap-1 px-2 h-7 border border-outline-variant/30 text-outline hover:text-secondary hover:border-secondary font-mono text-[9px] uppercase tracking-widest transition-all">
                <Upload size={10} /> Exportar JSON
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 px-2 h-7 border border-outline-variant/30 text-outline hover:text-secondary hover:border-secondary font-mono text-[9px] uppercase tracking-widest transition-all">
                <Cloud size={10} /> Importar JSON
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importForces} />
            </div>

            {/* Forces list */}
            {forces.length === 0 ? (
              <p className="text-[10px] font-mono text-outline italic text-center py-2">Sin fuerzas guardadas…</p>
            ) : (
              <div className="space-y-1.5">
                {[...forces].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(f => (
                  <SavedForceRow key={f.id} force={f}
                    hasEnemies={state.enemies.length > 0}
                    onLoad={replace => loadForce(f.id, replace)}
                    onDelete={() => deleteForce(f.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Start button */}
          <button onClick={() => dispatch({ type: 'START' })} disabled={!canStart}
            className={`w-full h-14 font-headline text-sm font-black uppercase tracking-[4px] border-2 transition-all ${
              canStart
                ? 'border-green-400 text-green-400 hover:bg-green-400/10'
                : 'border-outline-variant/30 text-outline cursor-not-allowed'
            }`}>
            {canStart ? `⚔️ INICIAR COMBATE (${state.enemies.length} hostiles)` : 'AÑADE HOSTILES PARA COMBATIR'}
          </button>
        </div>
      )}

      {/* ── COMBAT VIEW ── */}
      {state.step === 'combat' && (
        <div className="max-w-3xl space-y-4">

          {/* Player panel: bonus XP + rerolls + initiative */}
          <div className="bg-surface-container p-3 border-t-2 border-amber-400">
            <div className="text-[8px] font-mono text-outline uppercase tracking-[3px] mb-3">Gastos de sesión por jugador</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: Math.min(state.numPlayers, 4) }).map((_, i) => {
                const bonus = state.bonus[i] ?? 0;
                const pi = playerInfo[i];
                const usedRerolls = state.rerolls[i] ?? 0;
                const hasInit = state.iniciativa[i] ?? false;
                return (
                  <div key={i} className="bg-surface-container-high border border-outline-variant/15 border-t-2 p-2.5 space-y-2"
                    style={{ borderTopColor: PLAYER_COLORS[i] }}>
                    {/* Name + nivel */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: PLAYER_COLORS[i] }}>
                        {PLAYER_NAMES[i]}
                      </span>
                      <span className="font-mono text-[8px] text-outline">{pi.nivel}</span>
                    </div>

                    {/* Bonus XP */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[7px] text-outline uppercase tracking-widest">Bonus XP</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => dispatch({ type: 'ADJ_BONUS', pidx: i, delta: -100 })}
                          className="w-5 h-5 flex items-center justify-center border border-error/20 text-error font-mono text-[10px] hover:bg-error/10 transition-all">−</button>
                        <span className={`font-mono text-[9px] font-bold w-10 text-center ${bonus > 0 ? 'text-green-400' : bonus < 0 ? 'text-error' : 'text-outline'}`}>
                          {bonus > 0 ? `+${bonus}` : bonus}
                        </span>
                        <button onClick={() => dispatch({ type: 'ADJ_BONUS', pidx: i, delta: 100 })}
                          className="w-5 h-5 flex items-center justify-center border border-green-400/20 text-green-400 font-mono text-[10px] hover:bg-green-400/10 transition-all">+</button>
                      </div>
                    </div>

                    {/* Initiative */}
                    <button onClick={() => dispatch({ type: 'TOGGLE_INIT', pidx: i })}
                      className={`w-full h-5 font-mono text-[7px] uppercase tracking-widest border transition-all ${
                        hasInit
                          ? 'bg-primary-container/10 border-primary-container/40 text-primary-container'
                          : 'border-outline-variant/15 text-outline/50 hover:border-outline-variant/30'
                      }`}>
                      Iniciativa ({INIT_COST} XP)
                    </button>

                    {/* Rerolls */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[7px] text-outline uppercase tracking-widest">Rerolls</span>
                        <span className={`font-mono text-[8px] ${usedRerolls > 0 ? 'text-amber-400' : 'text-outline/30'}`}>
                          {usedRerolls}/{pi.maxRerolls}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: pi.maxRerolls }).map((_, ri) => (
                          <button key={ri}
                            onClick={() => dispatch({ type: 'SET_REROLLS', pidx: i, value: usedRerolls <= ri ? ri + 1 : ri })}
                            className={`flex-1 h-4 font-mono text-[7px] border transition-all ${
                              ri < usedRerolls
                                ? 'bg-amber-400/10 border-amber-400/50 text-amber-400'
                                : 'border-outline-variant/15 text-outline/30 hover:border-outline-variant/30'
                            }`}>
                            R{ri + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enemy combat cards */}
          <div className="space-y-4">
            {state.enemies.map(enemy => {
              const isDead = state.dead[enemy.id];
              const hits   = state.hits[enemy.id] ?? mkHits(state.numPlayers);
              const totalH = hits.reduce((a, b) => a + b, 0);

              return (
                <div key={enemy.id} className={`bg-surface-container border-2 transition-all ${isDead ? 'border-error' : 'border-outline-variant/30'}`}
                  style={{ borderLeftColor: enemy.color, borderLeftWidth: 4 }}>

                  {/* Enemy header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/20">
                    <div>
                      <div className="font-headline text-sm font-bold uppercase tracking-widest" style={{ color: enemy.color }}>
                        {enemy.name}
                      </div>
                      <div className="font-mono text-[9px] text-outline mt-0.5">
                        Valor: <span className="text-green-400 font-bold">{enemy.xp} XP</span>
                        {totalH > 0 && <span className="ml-3">· {totalH} impactos · {Math.round(enemy.xp / totalH)} XP/golpe</span>}
                      </div>
                    </div>
                    <button onClick={() => dispatch({ type: 'TOGGLE_DEAD', id: enemy.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[9px] font-bold uppercase tracking-widest transition-all ${
                        isDead
                          ? 'border-error/50 bg-error/10 text-error hover:bg-error/20'
                          : 'border-outline-variant/30 text-outline hover:border-green-400 hover:text-green-400'
                      }`}>
                      {isDead ? <><Skull size={10} /> Abatido</> : <><Shield size={10} /> Vivo</>}
                    </button>
                  </div>

                  {/* Hit counters */}
                  <div className={`grid p-3 gap-2 ${state.numPlayers <= 3 ? 'grid-cols-3' : state.numPlayers === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                    {Array.from({ length: state.numPlayers }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        {/* Hit button */}
                        <button onClick={() => dispatch({ type: 'HIT', eid: enemy.id, pidx: i, delta: 1 })}
                          className="h-16 flex flex-col items-center justify-center border-2 border-outline-variant/25 hover:border-outline-variant/60 bg-surface-container-high transition-all"
                          style={{ borderTopColor: PLAYER_COLORS[i] }}>
                          <span className="font-mono text-[8px] font-bold text-outline uppercase">{PLAYER_NAMES[i]}</span>
                          <span className="font-headline text-2xl font-black text-on-surface leading-none my-0.5"
                            style={{ color: hits[i] > 0 ? PLAYER_COLORS[i] : undefined }}>
                            {hits[i]}
                          </span>
                          <span className="font-mono text-[7px] text-outline">IMPACTOS</span>
                        </button>
                        {/* Undo button */}
                        <button onClick={() => dispatch({ type: 'HIT', eid: enemy.id, pidx: i, delta: -1 })}
                          disabled={hits[i] === 0}
                          className="h-5 border border-error/20 text-error font-mono text-[9px] hover:bg-error/10 disabled:opacity-20 transition-all">
                          −
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finish button */}
          <div className="sticky bottom-4">
            <button onClick={() => dispatch({ type: 'FINISH' })}
              className="w-full h-14 font-headline text-sm font-black uppercase tracking-[4px] border-2 border-amber-400 text-amber-400 bg-surface-container hover:bg-amber-400/10 transition-all">
              📊 CALCULAR EXPERIENCIA
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTS VIEW ── */}
      {state.step === 'results' && (() => {
        const xpResults = calcXP(state);
        return (
          <div className="max-w-2xl space-y-5">

            {/* Title */}
            <div className="text-center py-4 border-t-2 border-amber-400 bg-surface-container">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="font-headline text-xl font-black text-amber-400 uppercase tracking-[4px]">
                Combate Finalizado
              </h2>
              <p className="font-mono text-[10px] text-green-400 uppercase tracking-[3px] mt-1">
                Reparto de experiencia basado en contribución
              </p>
            </div>

            {/* XP Table */}
            <div className="bg-surface-container border-t-2 border-primary-container overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-outline-variant/20">
                <span className="font-mono text-[9px] text-outline uppercase tracking-widest">Combatiente</span>
                <span className="font-mono text-[9px] text-outline uppercase tracking-widest">XP Ganada</span>
              </div>
              {xpResults.map((xp, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] px-4 py-3 border-b border-outline-variant/10 items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-headline text-[10px] font-bold w-6 h-6 flex items-center justify-center border border-outline-variant/30"
                      style={{ color: PLAYER_COLORS[i], borderColor: PLAYER_COLORS[i] }}>
                      P{i + 1}
                    </span>
                    <span className="font-mono text-[12px] text-on-surface">{PLAYER_NAMES[i]}</span>
                  </div>
                  <span className="font-headline text-2xl font-black text-green-400">
                    +{xp}
                  </span>
                </div>
              ))}
            </div>

            {/* Kill summary */}
            <div className="bg-surface-container p-4 border-t-2 border-error space-y-2">
              <h3 className="font-headline text-[10px] font-bold text-error tracking-[3px] uppercase mb-2">
                Resumen de bajas
              </h3>
              {state.enemies.map(e => {
                const isDead = state.dead[e.id];
                const totalH = (state.hits[e.id] ?? []).reduce((a, b) => a + b, 0);
                return (
                  <div key={e.id} className="flex items-center gap-3 font-mono text-[10px] border-l-2 pl-3 py-1"
                    style={{ borderColor: isDead ? e.color : '#4e453a' }}>
                    <span className={isDead ? 'text-on-surface' : 'text-outline line-through'} style={{ color: isDead ? e.color : undefined }}>
                      {isDead ? '💀' : '✓'} {e.name}
                    </span>
                    <span className="text-outline ml-auto">
                      {isDead
                        ? `${e.xp} XP / ${totalH} impactos${totalH > 0 ? ` = ${Math.round(e.xp / totalH)} XP/golpe` : ''}`
                        : 'Escapó (0 XP)'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Guest warning */}
            {state.numPlayers === 5 && (
              <div className="bg-amber-400/10 border-2 border-amber-400 p-3 text-center font-mono text-[10px] text-amber-400 uppercase tracking-widest">
                ⚠️ Recuerda copiar los PX del invitado de forma manual
              </div>
            )}

            {/* Actions */}
            <button onClick={() => {
                localStorage.setItem('kk_hoja_xp_from_hud', JSON.stringify(xpResults));
                // Pass reroll & initiative data
                const gastos = Array.from({ length: Math.min(state.numPlayers, 4) }).map((_, i) => ({
                  rerolls: state.rerolls[i] ?? 0,
                  iniciativa: state.iniciativa[i] ?? false,
                  chequeos: state.bonus[i] ?? 0,
                }));
                localStorage.setItem('kk_hoja_gastos_from_hud', JSON.stringify(gastos));
                navigate('/hoja-servicio');
              }}
              className="w-full h-14 font-headline text-sm font-black uppercase tracking-[4px] border-2 border-green-400 text-green-400 hover:bg-green-400/10 transition-all flex items-center justify-center gap-2 mb-3">
              <FileText size={14} /> IR A REGISTRO
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => dispatch({ type: 'RESET' })}
                className="h-12 font-headline text-[11px] font-bold uppercase tracking-[3px] border-2 border-primary-container text-primary-container hover:bg-primary-container/10 transition-all">
                🔄 Nuevo Combate
              </button>
              <button onClick={() => dispatch({ type: 'BACK_TO_SETUP' })}
                className="h-12 font-headline text-[11px] font-bold uppercase tracking-[3px] border-2 border-outline-variant/30 text-outline hover:border-secondary hover:text-secondary transition-all">
                ← Volver al Setup
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EnemySetupRow({ enemy, onUpdate, onRemove }: {
  enemy: BTEnemy;
  onUpdate: (patch: Partial<BTEnemy>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-surface-container-high p-2 border-l-2" style={{ borderColor: enemy.color }}>
      <input value={enemy.name}
        onChange={e => onUpdate({ name: e.target.value })}
        className="flex-1 h-7 bg-surface-container border border-outline-variant/25 px-2 font-mono text-[10px] text-on-surface focus:outline-none focus:border-primary-container"
      />
      <input type="number" value={enemy.xp} min={1}
        onChange={e => onUpdate({ xp: parseInt(e.target.value) || 1 })}
        className="w-20 h-7 bg-surface-container border border-outline-variant/25 px-1 font-mono text-[10px] text-center text-green-400 focus:outline-none focus:border-primary-container"
      />
      <div className="flex gap-1">
        {ENEMY_COLORS.map(c => (
          <button key={c} onClick={() => onUpdate({ color: c })}
            className="w-4 h-4 transition-all"
            style={{
              background: c,
              outline: enemy.color === c ? `2px solid white` : 'none',
              outlineOffset: 1,
            }}
          />
        ))}
      </div>
      <button onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center border border-error/20 text-outline hover:text-error hover:border-error transition-all">
        <Trash2 size={10} />
      </button>
    </div>
  );
}

function SavedForceRow({ force, hasEnemies, onLoad, onDelete }: {
  force: SavedForce;
  hasEnemies: boolean;
  onLoad: (replace: boolean) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalBV = force.units.reduce((a, u) => a + u.xp, 0);

  return (
    <div className="bg-surface-container-high border border-outline-variant/20">
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 text-left min-w-0">
          {expanded ? <ChevronUp size={10} className="text-outline shrink-0" /> : <ChevronDown size={10} className="text-outline shrink-0" />}
          <span className="font-mono text-[10px] text-on-surface truncate">{force.name}</span>
          <span className="font-mono text-[9px] text-outline shrink-0">{force.units.length} uds · {totalBV} XP</span>
        </button>
        <div className="flex gap-1 ml-2">
          <button onClick={() => onLoad(true)}
            className="px-2 h-6 border border-green-400/30 text-green-400 font-mono text-[8px] uppercase hover:bg-green-400/10 transition-all">
            Cargar
          </button>
          {hasEnemies && (
            <button onClick={() => onLoad(false)}
              className="px-2 h-6 border border-secondary/30 text-secondary font-mono text-[8px] uppercase hover:bg-secondary/10 transition-all">
              Añadir
            </button>
          )}
          <button onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center border border-error/20 text-outline hover:text-error hover:border-error transition-all">
            <Trash2 size={9} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2 border-t border-outline-variant/15 pt-2 space-y-0.5">
          {force.units.map((u, i) => (
            <div key={i} className="flex items-center gap-2 font-mono text-[9px]">
              <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: u.color }} />
              <span className="text-on-surface-variant truncate">{u.name}</span>
              <span className="text-outline ml-auto">{u.xp} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

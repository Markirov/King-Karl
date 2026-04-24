import { useState, useCallback, useEffect } from 'react';
import type { Pilot } from '@/lib/barracones-types';
import { emptyPilot } from '@/lib/barracones-types';
import { calcHp } from '@/lib/barracones-data';
import { searchPilots, savePilot, registerImprovement } from '@/lib/sheets-service';
import { resolveWeaponName } from '@/lib/barracones-weapons';
import { useAppStore } from '@/lib/store';
import { appendLog } from '@/lib/barracones-log';

const STORAGE_KEY = 'barracones_slots_v1';
const SLOT_COUNT = 6;

// ── Sheets ↔ Pilot conversion ──────────────────────────────

// Sheets may return arrays as real arrays, JSON strings, or comma-separated strings.
// This helper normalises all three cases.
function parseSheetArray(val: any): any[] {
  if (!val) return [];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    // Try JSON parse first (handles "[\"a\",\"b\"]")
    try { val = JSON.parse(trimmed); }
    catch {
      // Fallback: comma-separated plain string ("a,b,c")
      return trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return Array.isArray(val) ? val : [];
}

function toStringArray(val: any): string[] {
  return parseSheetArray(val)
    .map((v: any) => (typeof v === 'string' ? v : (v?.name || v?.nombre || '')))
    .filter((s: string) => s.trim() !== '');
}

function sheetsDataToPilot(d: any): Pilot {
  const p = emptyPilot();
  p.nombre    = d.nombre   || '';
  p.callsign  = d.jugador  || '';
  p.mech      = d.mech || d.mechModel || d.battlemech || '';
  p.fue       = parseInt(d.str) || 6;
  p.des       = parseInt(d.dex) || 6;
  p.int       = parseInt(d.int) || 6;
  p.car       = parseInt(d.cha) || 6;
  p.xpTotal      = parseInt(d.xpTotal)      || 0;
  p.xpDisponible = parseInt(d.xpDisponible) || 0;
  p.sexo  = d.sexo   || '';
  p.altura= d.altura || '';
  p.peso  = d.peso   || '';
  p.pelo  = d.pelo   || '';
  p.ojos  = d.ojos   || '';
  p.origen= d.origen || '';
  p.notas = d.notas  || '';

  // Age — store raw fields so the UI can recalculate with current campaignYear
  if (d.decade !== undefined) {
    p.decade   = parseInt(d.decade)  || 0;
    p.yearBorn = parseInt(d.year)    || 0;
    p.ageRoll  = parseInt(d.ageRoll) || 0;
    // fallback stored edad (decade stores full decade, e.g. 2990)
    const birthYear = p.decade + p.yearBorn + p.ageRoll;
    p.edad = 3026 - birthYear;
  } else if (d.edad !== undefined) {
    p.edad = parseInt(d.edad) || 25;
  }

  // Skills — extraSkills may arrive as array, JSON string, or comma-separated
  const rawSkills = parseSheetArray(d.extraSkills);
  if (rawSkills.length > 0) {
    p.habilidades = rawSkills
      .map((s: any) => {
        if (typeof s === 'string') return { nombre: s, nivel: 1, upgrades: 0 };
        const nivel = Math.max(1, parseInt(s.level ?? s.nivel) || 1);
        const upgrades = parseInt(s.upgrades) || 0;
        return { nombre: s.name || s.nombre || '', nivel, upgrades };
      })
      .filter((s: any) => s.nombre.trim() !== '');
  }

  // Weapons — armas may arrive as array or JSON string
  const rawArmas = parseSheetArray(d.armas);
  rawArmas.slice(0, 5).forEach((w: any, i: number) => {
    if (typeof w === 'string') return; // skip unparseable entries
    const rawName = w.select !== undefined && w.select !== '' ? String(w.select) : (w.nombre || '');
    p.armas[i] = {
      nombre:    rawName ? resolveWeaponName(rawName) : '',
      munActual: parseInt(w.munActual) || 0,
    };
  });

  // Armor — armaduraInfanteria may arrive as object or JSON string
  let armorData = d.armaduraInfanteria;
  if (typeof armorData === 'string') { try { armorData = JSON.parse(armorData); } catch { armorData = null; } }
  if (armorData) {
    p.armadura = {
      tipo:   armorData.tipo   || '',
      piezas: parseInt(armorData.piezas) || 0,
    };
  }

  // Méritos y defectos
  p.meritos  = toStringArray(d.merits   ?? d.meritos  ?? d.ventajas);
  p.defectos = toStringArray(d.demerits ?? d.defectos ?? d.desventajas);

  // Quirks — try several field name variations from old HTML and new format
  const rawQuirks = parseSheetArray(d.quirksComprados ?? d.quirks);
  p.quirks = rawQuirks
    .map((q: any) => typeof q === 'string'
      ? { quirkId: q, mechName: '' }
      : { quirkId: q.quirkId || q.id || q.quirk || '', mechName: q.mechName || q.mech || q.battlemech || '' })
    .filter((q: any) => q.quirkId);

  // HP damage — estadoFisico is a flat ordered array of dots {index, damaged}
  // We use calcHp to determine location boundaries
  const rawEstado = parseSheetArray(d.estadoFisico);
  if (rawEstado.length > 0) {
    const locs = calcHp(p.fue);
    let offset = 0;
    for (const { loc, max } of locs) {
      let dmg = 0;
      for (let i = 0; i < max; i++) {
        const entry = rawEstado[offset + i];
        if (entry?.damaged) dmg++;
      }
      if (dmg > 0) p.hpDmg[loc] = dmg;
      offset += max;
    }
  }

  return p;
}

function pilotToSheets(pilot: Pilot): Record<string, any> {
  const locs = calcHp(pilot.fue);
  const estadoFisico: { index: number; loc: string; damaged: boolean }[] = [];
  let idx = 0;
  for (const { loc, max } of locs) {
    const dmg = pilot.hpDmg[loc] ?? 0;
    for (let i = 0; i < max; i++) {
      estadoFisico.push({ index: idx++, loc, damaged: i >= (max - dmg) });
    }
  }

  return {
    action:    'guardarJugador',
    jugador:   pilot.callsign,
    nombre:    pilot.nombre,
    str:       pilot.fue,
    dex:       pilot.des,
    int:       pilot.int,
    cha:       pilot.car,
    mech:      pilot.mech,
    xpTotal:      pilot.xpTotal,
    xpDisponible: pilot.xpDisponible,
    sexo:   pilot.sexo,
    edad:   pilot.edad,
    altura: pilot.altura,
    peso:   pilot.peso,
    pelo:   pilot.pelo,
    ojos:   pilot.ojos,
    origen: pilot.origen,
    notas:  pilot.notas,
    extraSkills: pilot.habilidades.map(h => ({ name: h.nombre, level: h.nivel, upgrades: h.upgrades ?? 0 })),
    armas:       pilot.armas.map(a => ({ select: a.nombre, munActual: a.munActual })),
    armaduraInfanteria: { tipo: pilot.armadura.tipo, piezas: pilot.armadura.piezas },
    estadoFisico,
    merits:   pilot.meritos  ?? [],
    demerits: pilot.defectos ?? [],
    // Send under both names for backwards-compatibility with Apps Script
    quirks:          pilot.quirks ?? [],
    quirksComprados: pilot.quirks ?? [],
  };
}

export type SheetsStatus = 'idle' | 'loading' | 'ok' | 'error';
export interface SheetsSearchResult { raw: any; nombre: string; jugador: string }

function loadSlots(): (Pilot | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return Array(SLOT_COUNT).fill(null);
}

function saveSlots(slots: (Pilot | null)[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

export function useBarracones() {
  const { campaign } = useAppStore();
  const [slots, setSlots] = useState<(Pilot | null)[]>(loadSlots);
  const [activeIdx, setActiveIdx] = useState(0);

  // Sheets cloud state
  const [sheetsStatus,  setSheetsStatus]  = useState<SheetsStatus>('idle');
  const [sheetsMsg,     setSheetsMsg]     = useState('');
  const [sheetsResults, setSheetsResults] = useState<SheetsSearchResult[]>([]);

  const current = slots[activeIdx] ?? null;

  // When campaign config loads/updates, refresh mech for all fixed slots from config
  useEffect(() => {
    if (!campaign.pilotMechs.length) return;
    setSlots(prev => {
      const next = [...prev];
      let changed = false;
      campaign.pilotMechs.forEach((mech, i) => {
        if (mech && next[i] && next[i]!.mech !== mech) {
          next[i] = { ...next[i]!, mech };
          changed = true;
        }
      });
      if (!changed) return prev;
      saveSlots(next);
      return next;
    });
  }, [campaign.pilotMechs]);

  const updatePilot = useCallback((updater: (p: Pilot) => Pilot) => {
    setSlots(prev => {
      const next = [...prev];
      const p = next[activeIdx];
      if (!p) return prev;
      next[activeIdx] = updater(structuredClone(p));
      saveSlots(next);
      return next;
    });
  }, [activeIdx]);

  const createPilot = useCallback(() => {
    setSlots(prev => {
      const next = [...prev];
      next[activeIdx] = emptyPilot();
      saveSlots(next);
      return next;
    });
  }, [activeIdx]);

  const deletePilot = useCallback(() => {
    setSlots(prev => {
      const next = [...prev];
      next[activeIdx] = null;
      saveSlots(next);
      return next;
    });
  }, [activeIdx]);

  // ── Field setters ──
  const setField = useCallback(<K extends keyof Pilot>(key: K, value: Pilot[K]) => {
    if (key === 'mech') {
      const pilot = slots[activeIdx];
      const prev = pilot?.mech || '';
      if (prev !== value && value) {
        appendLog({
          pilot: pilot?.callsign || pilot?.nombre || '?',
          tipo: 'mech',
          desc: `Mech: ${prev || '—'} → ${String(value)}`,
        });
      }
    }
    updatePilot(p => ({ ...p, [key]: value }));
  }, [slots, activeIdx, updatePilot]);

  // ── Attribute upgrade/downgrade ──
  const upgradeAttr = useCallback((attr: 'fue' | 'des' | 'int' | 'car', cost: number) => {
    const pilot = slots[activeIdx];
    updatePilot(p => {
      if (p.xpDisponible < cost) return p;
      if (p[attr] >= 12) return p;
      appendLog({
        pilot: pilot?.callsign || pilot?.nombre || '?',
        tipo: 'attr',
        desc: `${attr.toUpperCase()} ${p[attr]} → ${p[attr] + 1} (−${cost} XP)`,
      });
      return { ...p, [attr]: p[attr] + 1, xpDisponible: p.xpDisponible - cost };
    });
  }, [slots, activeIdx, updatePilot]);

  const downgradeAttr = useCallback((attr: 'fue' | 'des' | 'int' | 'car', refund: number) => {
    updatePilot(p => {
      if (p[attr] <= 6) return p;
      return { ...p, [attr]: p[attr] - 1, xpDisponible: p.xpDisponible + refund };
    });
  }, [updatePilot]);

  // ── Skills ──
  const addSkill = useCallback((nombre: string) => {
    updatePilot(p => {
      if (p.habilidades.some(h => h.nombre === nombre)) return p;
      return { ...p, habilidades: [...p.habilidades, { nombre, nivel: 1, upgrades: 0 }] };
    });
  }, [updatePilot]);

  const removeSkill = useCallback((nombre: string) => {
    updatePilot(p => ({
      ...p,
      habilidades: p.habilidades.filter(h => h.nombre !== nombre),
    }));
  }, [updatePilot]);

  const upgradeSkill = useCallback((nombre: string, cost: number) => {
    const pilot = slots[activeIdx];
    updatePilot(p => {
      if (p.xpDisponible < cost) return p;
      const skill = p.habilidades.find(h => h.nombre === nombre);
      if (!skill || skill.nivel >= 9) return p;
      appendLog({
        pilot: pilot?.callsign || pilot?.nombre || '?',
        tipo: 'skill',
        desc: `${nombre} niv ${skill.nivel} → ${skill.nivel + 1} (−${cost} XP)`,
      });
      return {
        ...p,
        xpDisponible: p.xpDisponible - cost,
        habilidades: p.habilidades.map(h =>
          h.nombre === nombre ? { ...h, nivel: h.nivel + 1, upgrades: (h.upgrades ?? 0) + 1 } : h
        ),
      };
    });
  }, [slots, activeIdx, updatePilot]);

  const downgradeSkill = useCallback((nombre: string, refund: number) => {
    updatePilot(p => ({
      ...p,
      xpDisponible: p.xpDisponible + refund,
      habilidades: p.habilidades.map(h =>
        h.nombre === nombre && h.nivel > 1 ? { ...h, nivel: h.nivel - 1 } : h
      ),
    }));
  }, [updatePilot]);

  // ── HP damage ──
  const setHpDmg = useCallback((loc: string, dmg: number) => {
    updatePilot(p => ({ ...p, hpDmg: { ...p.hpDmg, [loc]: Math.max(0, dmg) } }));
  }, [updatePilot]);

  // ── Weapons ──
  const setWeapon = useCallback((idx: number, slot: Partial<Pilot['armas'][0]>) => {
    updatePilot(p => {
      const armas = [...p.armas];
      armas[idx] = { ...armas[idx], ...slot };
      return { ...p, armas };
    });
  }, [updatePilot]);

  // ── Armadura 1 y 2 ──
  const setArmadura  = useCallback((a: Pilot['armadura'])  => {
    updatePilot(p => ({ ...p, armadura: a }));
  }, [updatePilot]);
  const setArmadura2 = useCallback((a: Pilot['armadura2']) => {
    updatePilot(p => ({ ...p, armadura2: a }));
  }, [updatePilot]);

  // ── Notas ──
  const setNotas = useCallback((v: string) => {
    updatePilot(p => ({ ...p, notas: v }));
  }, [updatePilot]);

  // ── Quirks ──
  const addQuirk = useCallback((quirkId: string, mechName: string) => {
    const pilot = slots[activeIdx];
    if (!pilot || pilot.xpDisponible < 1000) return;
    if ((pilot.quirks ?? []).some(q => q.quirkId === quirkId && q.mechName === mechName)) return;

    updatePilot(p => ({
      ...p,
      xpDisponible: p.xpDisponible - 1000,
      quirks: [...(p.quirks ?? []), { quirkId, mechName }],
    }));

    // Log local + Sheets history
    const jugador = pilot.callsign || pilot.nombre;
    appendLog({
      pilot: jugador || '?',
      tipo: 'quirk',
      desc: `Quirk: ${quirkId} — ${mechName} (−1000 XP)`,
    });
    if (jugador) {
      registerImprovement(jugador, 1000, `Quirk: ${quirkId} — ${mechName}`).catch(() => {});
    }
  }, [slots, activeIdx, updatePilot]);

  // ── Méritos y defectos ──
  const setMeritos  = useCallback((v: string[]) => updatePilot(p => ({ ...p, meritos:  v })), [updatePilot]);
  const setDefectos = useCallback((v: string[]) => updatePilot(p => ({ ...p, defectos: v })), [updatePilot]);

  // ── XP ──
  const addXP = useCallback((amount: number) => {
    const pilot = slots[activeIdx];
    appendLog({
      pilot: pilot?.callsign || pilot?.nombre || '?',
      tipo: 'xp',
      desc: `+${amount} XP`,
    });
    updatePilot(p => ({
      ...p,
      xpTotal: p.xpTotal + amount,
      xpDisponible: p.xpDisponible + amount,
    }));
  }, [slots, activeIdx, updatePilot]);

  // ── Google Sheets cloud ──
  const sheetsSearch = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setSheetsStatus('loading');
    setSheetsMsg('');
    setSheetsResults([]);
    const res = await searchPilots(name.trim());
    if (!res.success) {
      setSheetsStatus('error');
      setSheetsMsg(res.error ?? 'Error de red');
      return;
    }
    const data = res.data;
    if (data.result !== 'success' || !Array.isArray(data.personajes)) {
      setSheetsStatus('error');
      setSheetsMsg(data.msg || 'Sin resultados');
      return;
    }
    const results: SheetsSearchResult[] = data.personajes.map((p: any) => ({
      raw:     p,
      nombre:  p.nombre  || '',
      jugador: p.jugador || '',
    }));
    setSheetsResults(results);
    setSheetsStatus(results.length ? 'ok' : 'error');
    setSheetsMsg(results.length ? '' : 'No se encontraron pilotos');
  }, []);

  // Auto-load: always loads the best match silently. Returns true on success.
  // targetIdx: slot to load into — defaults to activeIdx but callers can pass the
  // intended index directly to avoid React's stale-closure problem when setActiveIdx
  // has been called in the same event handler just before this function.
  const sheetsQuickLoad = useCallback(async (name: string, targetIdx?: number): Promise<boolean> => {
    if (!name.trim()) return false;
    setSheetsStatus('loading');
    setSheetsMsg('');
    setSheetsResults([]);
    const res = await searchPilots(name.trim());
    if (!res.success) {
      setSheetsStatus('error');
      setSheetsMsg(res.error ?? 'Error de red');
      return false;
    }
    const data = res.data;
    if (data.result !== 'success' || !Array.isArray(data.personajes) || data.personajes.length === 0) {
      setSheetsStatus('error');
      setSheetsMsg(data.msg || 'No se encontraron pilotos');
      return false;
    }
    const personajes: any[] = data.personajes;
    // Pick exact match by jugador name, otherwise take first result
    const nameLower = name.trim().toLowerCase();
    const best = personajes.find(p => (p.jugador || '').toLowerCase() === nameLower)
              ?? personajes.find(p => (p.nombre  || '').toLowerCase() === nameLower)
              ?? personajes[0];
    const pilot = sheetsDataToPilot(best);
    const idx = targetIdx ?? activeIdx;
    // Mech assignment lives in campaign config (PILOTO_X_MECH), always takes precedence
    if (campaign.pilotMechs[idx]) {
      pilot.mech = campaign.pilotMechs[idx];
    }
    setSlots(prev => {
      const next = [...prev];
      next[idx] = pilot;
      saveSlots(next);
      return next;
    });
    setActiveIdx(idx);
    setSheetsStatus('ok');
    setSheetsMsg(`${pilot.callsign || pilot.nombre} cargado`);
    return true;
  }, [activeIdx]);

  const sheetsLoad = useCallback((raw: any) => {
    const pilot = sheetsDataToPilot(raw);
    setSlots(prev => {
      const next = [...prev];
      next[activeIdx] = pilot;
      saveSlots(next);
      return next;
    });
    setSheetsResults([]);
    setSheetsStatus('ok');
    setSheetsMsg(`${pilot.callsign || pilot.nombre} cargado`);
  }, [activeIdx]);

  const sheetsSave = useCallback(async () => {
    const pilot = slots[activeIdx];
    if (!pilot) return;
    setSheetsStatus('loading');
    setSheetsMsg('');
    const payload = pilotToSheets(pilot);
    const res = await savePilot(payload);
    if (!res.success) {
      setSheetsStatus('error');
      setSheetsMsg(res.error ?? 'Error de red');
      return;
    }
    const data = res.data;
    setSheetsStatus(data.result === 'success' ? 'ok' : 'error');
    setSheetsMsg(data.msg || (data.result === 'success' ? 'Guardado correctamente' : 'Error al guardar'));
  }, [slots, activeIdx]);

  // ── JSON Export/Import ──
  const exportJSON = useCallback(() => {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.callsign || current.nombre || 'piloto'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [current]);

  const importJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string) as Pilot;
        data.id = crypto.randomUUID(); // ensure unique id
        setSlots(prev => {
          const next = [...prev];
          next[activeIdx] = data;
          saveSlots(next);
          return next;
        });
      } catch { /* ignore bad JSON */ }
    };
    reader.readAsText(file);
  }, [activeIdx]);

  return {
    slots, activeIdx, setActiveIdx,
    current,
    createPilot, deletePilot,
    setField,
    upgradeAttr, downgradeAttr,
    addSkill, removeSkill, upgradeSkill, downgradeSkill,
    setHpDmg,
    setWeapon, setArmadura, setArmadura2, setNotas, setMeritos, setDefectos,
    addXP,
    addQuirk,
    exportJSON, importJSON,
    // Sheets
    sheetsStatus, sheetsMsg, sheetsResults,
    sheetsSearch, sheetsQuickLoad, sheetsLoad, sheetsSave,
  };
}

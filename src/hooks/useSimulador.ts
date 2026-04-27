import { useState, useCallback } from 'react';
import { mechParseMech, vehicleParseSAW } from '@/lib/parsers';
import { mechAmmoMetaForWeapon } from '@/lib/weapons';
import type { MechSlot, VehicleSlot, MechState, MechSession, MoveMode, VehicleSession, InfantrySlot, BASlot, FireTarget } from '@/lib/combat-types';
import { INFANTRY_CATALOG, BA_CATALOG, buildInfantrySession, buildBASession } from '@/lib/infantry-catalog';
import { infantryFire, baFire, infantryNextTurn, baNextTurn, infantryApplyDamage, baApplyDamage } from '@/lib/infantry-combat';
import type { DamageFlags } from '@/lib/combat-types';
import {
  mechInitSession, mechApplyDamage, mechApplyHeal,
  mechNextTurn, mechToggleWeapon, mechToggleCrit,
  calcGunneryTotal, calcPilotingTotal,
  countSystemCritHits, canFire,
  getHeatMPPenalty,
  getArmActuatorMod, getLegActuatorEffects,
  vehicleApplyDamage, vehicleApplyHeal,
  vehicleToggleWeapon, vehicleNextTurn, vehicleToggleCrit,
  vehicleApplyCritEffect,
} from '@/lib/combat-data';

const MECH_SLOTS = 6;
const VEHICLE_SLOTS = 5;
const INF_SLOTS = 4;
const BA_SLOTS = 4;

function emptyMechSlot(): MechSlot { return { state: null, session: null }; }
function emptyVehicleSlot(): VehicleSlot { return { state: null, session: null }; }
function emptyInfSlot(): InfantrySlot { return { state: null, session: null }; }
function emptyBASlot(): BASlot { return { state: null, session: null }; }

export function useSimulador() {
  const [mechSlots, setMechSlots] = useState<MechSlot[]>(Array(MECH_SLOTS).fill(null).map(emptyMechSlot));
  const [vehicleSlots, setVehicleSlots] = useState<VehicleSlot[]>(Array(VEHICLE_SLOTS).fill(null).map(emptyVehicleSlot));
  const [infantrySlots, setInfantrySlots] = useState<InfantrySlot[]>(Array(INF_SLOTS).fill(null).map(emptyInfSlot));
  const [baSlots, setBASlots] = useState<BASlot[]>(Array(BA_SLOTS).fill(null).map(emptyBASlot));
  const [activeInfantryIdx, setActiveInfantryIdx] = useState(0);
  const [activeBAIdx, setActiveBAIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'mechs' | 'vehicles'>('mechs');
  const [currentMechIdx, setCurrentMechIdx] = useState(0);
  const [currentVehicleIdx, setCurrentVehicleIdx] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
const [damageAmount, setDamageAmount] = useState(0);

  // ── Current slot accessors ──
  const currentSlot = activeTab === 'mechs' ? mechSlots[currentMechIdx] : vehicleSlots[currentVehicleIdx];
  const mechState = activeTab === 'mechs' ? mechSlots[currentMechIdx].state : null;
  const mechSession = activeTab === 'mechs' ? mechSlots[currentMechIdx].session : null;
  const vehicleState = activeTab === 'vehicles' ? vehicleSlots[currentVehicleIdx].state : null;
  const vehicleSession = activeTab === 'vehicles' ? vehicleSlots[currentVehicleIdx].session : null;
  const isLoaded = currentSlot.state !== null;

  // ── Mech session updater ──
  const updateMechSession = useCallback((updater: (s: MechSession) => MechSession) => {
    setMechSlots(prev => {
      const next = [...prev];
      const slot = next[currentMechIdx];
      if (slot.session) {
        next[currentMechIdx] = { ...slot, session: updater(slot.session) };
      }
      return next;
    });
  }, [currentMechIdx]);

  // ── Load unit from raw text (shared by file upload and catalog) ──
  const loadUnitText = useCallback((text: string, filename: string) => {
    const ext = filename.toLowerCase().split('.').pop() || '';

    if (ext === 'saw') {
      try {
        const parsed = vehicleParseSAW(text, filename);
        setVehicleSlots(prev => {
          const next = [...prev];
          next[currentVehicleIdx] = {
            state: {
              name: parsed.name, model: parsed.model, tons: parseFloat(parsed.tons) || 0,
              motiveType: parsed.motiveType, cruise: parseInt(parsed.cruise) || 0,
              turretType: parsed.turretType, source: parsed.source || filename,
              locations: parsed.locations,
              weapons: parsed.weapons.map((w: any) => ({
                id: w.id, name: w.name, loc: w.loc,
                heat: w.heat ?? 0, dmg: w.dmg ?? '0', r: w.r ?? '-',
                ammoKey: w.ammoKey ?? undefined,
              })),
              ammoPools: parsed.ammoPools, crits: parsed.crits,
            },
            session: {
              armor: Object.fromEntries(parsed.locations.map(l => [l.key, l.maxArmor])),
              is: Object.fromEntries(parsed.locations.map(l => [l.key, l.maxIS])),
              ammoPools: { ...parsed.ammoPools },
              crits: Object.fromEntries(
                Object.entries(parsed.crits).map(([k, v]) =>
                  [k, (v as string[]).map(name => ({ name, hit: false }))]
                )
              ),
              activeShots: {}, moveMode: 'cruise', motiveMP: 0, motiveHalfCount: 0,
              immobilized: false, destroyed: false, destroyedReason: '',
              pilot: { name: '', gunnery: 4, piloting: 5 },
              logs: [`> VEHICLE_LOADED: ${parsed.name}`, '> SYSTEMS_CHECK: OPTIMAL'],
              effects: {}, weaponDestroyedIds: [], weaponMalfunctionIds: [],
              pendingCrits: {},
            },
          };
          return next;
        });
      } catch (err) { console.error('Vehicle parse error:', err); }
      return;
    }

    if (ext === 'ssw' || ext === 'mtf') {
      try {
        const parsed = mechParseMech(text);
        if (!parsed) return;

        const mechData: MechState = {
          source: ext === 'ssw' ? 'SSW' : 'MTF',
          chassis: parsed.chassis, model: parsed.model, tonnage: parsed.tonnage,
          walkMP: parsed.walkMP || Math.floor(((parsed as any).engineRating || 0) / parsed.tonnage),
          runMP: parsed.runMP || Math.ceil((parsed.walkMP || 0) * 1.5),
          jumpMP: parsed.jumpMP || 0,
          hsCount: parsed.hsCount || 10,
          hsDouble: parsed.hsDouble || false,
          diss: parsed.hsDouble ? (parsed.hsCount || 10) * 2 : (parsed.hsCount || 10),
          engineRating: (parsed as any).engineRating || 0,
          armorType: parsed.armorType || 'Standard',
          techBase: parsed.techBase || 'Inner Sphere',
          era: parsed.era || '',
          bv: parsed.bv || 0,
          isQuad: parsed.isQuad || parsed.configType === 'QUAD' || false,
          armor: parsed.armor,
          is: (parsed.isQuad || parsed.configType === 'QUAD')
            ? { ...parsed.is, LA: parsed.is.LL, RA: parsed.is.RL }
            : parsed.is,
          weapons: (parsed.weapons || []).map((w: any, i: number) => {
            const ammoMeta = mechAmmoMetaForWeapon(w);
            return {
              id: w.id ?? i,
              name: w.name, rawName: w.rawName || w.name, loc: w.loc,
              heat: w.heat || 0, dmg: w.dmg || '0', r: w.r || '0/0/0',
              ammo: w.ammo ?? null, ammoMax: w.ammoMax ?? null,
              ammoFamily: ammoMeta.family || '',
              ammoFamilyKey: ammoMeta.familyKey || '',
              ammoPerTon: ammoMeta.perTon || 0,
              ammoUse: ammoMeta.use || 1,
              usesAmmo: ammoMeta.usesAmmo,
              slotsUsed: w.slotsUsed || 1, slotIndices: w.slotIndices || [],
            };
          }),
          crits: parsed.crits || {},
          ammoBins: (parsed.ammoBins || []).map((b: any, i: number) => ({
            id: b.id ?? i, loc: b.loc, slotIdx: b.slotIdx || 0,
            familyKey: b.familyKey || '', family: b.family || '',
            perTon: b.perTon || 0, current: b.current || b.max || 0, max: b.max || 0,
          })),
        };

        const session = mechInitSession(mechData);
        setMechSlots(prev => {
          const next = [...prev];
          next[currentMechIdx] = { state: mechData, session };
          return next;
        });
      } catch (err) { console.error('Mech parse error:', err); }
    }
  }, [currentMechIdx, currentVehicleIdx]);

  // ── File Upload ──
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (ext === 'saw' && activeTab !== 'vehicles') { alert('Cambia a VEHÍCULOS para cargar .saw'); return; }
    if ((ext === 'ssw' || ext === 'mtf') && activeTab !== 'mechs') { alert('Cambia a MECHS para cargar .ssw/.mtf'); return; }
    const reader = new FileReader();
    reader.onload = e => loadUnitText(e.target?.result as string, file.name);
    reader.readAsText(file);
  };

  // ── Vehicle session updater ──
  const updateVehicleSession = useCallback((updater: (s: VehicleSession) => VehicleSession) => {
    setVehicleSlots(prev => {
      const next = [...prev];
      const slot = next[currentVehicleIdx];
      if (slot.session) {
        next[currentVehicleIdx] = { ...slot, session: updater(slot.session) };
      }
      return next;
    });
  }, [currentVehicleIdx]);

  // ── Mech Actions ──

  const toggleWeapon = (weaponId: number) => {
    if (!mechState || !mechSession) return;
    updateMechSession(s => mechToggleWeapon(mechState, s, weaponId));
  };

  const handleFire = () => {
    if (!mechState || !mechSession) return;
    updateMechSession(s => mechNextTurn(mechState, s));
  };

  const handleDamage = (armorKey: string, amount: number) => {
    if (!mechState || !mechSession) return;
    if (amount > 0) {
      updateMechSession(s => {
        const result = mechApplyDamage(mechState, s, armorKey, amount);
        return { ...result.session, logs: [...result.logs, ...result.session.logs].slice(0, 30) };
      });
    } else if (amount < 0) {
      updateMechSession(s => {
        const result = mechApplyHeal(mechState, s, armorKey, Math.abs(amount));
        return { ...result.session, logs: [...result.logs, ...result.session.logs].slice(0, 30) };
      });
    }
  };

  const applyDamageToSelected = () => {
    if (!selectedSection || damageAmount === 0) return;
    handleDamage(selectedSection, damageAmount);
    setDamageAmount(0);
  };

  const toggleCrit = (loc: string, slotIdx: number) => {
    if (!mechState || !mechSession) return;
    updateMechSession(s => mechToggleCrit(mechState, s, loc, slotIdx));
  };

  const setMoveMode = (mode: MoveMode) => {
    updateMechSession(s => ({ ...s, moveMode: mode }));
  };

  const setJumpUsed = (hexes: number) => {
    updateMechSession(s => ({ ...s, jumpUsed: hexes, moveMode: 'jump' }));
  };

  const setWounds = (w: number) => {
    updateMechSession(s => ({ ...s, wounds: w }));
  };

  const resetLog = () => {
    updateMechSession(s => ({ ...s, logs: [] }));
  };

  const setPilot = (field: 'gunnery' | 'piloting', value: number) => {
    updateMechSession(s => ({ ...s, pilot: { ...s.pilot, [field]: value } }));
  };

  const setPilotFull = (name: string, gunnery: number, piloting: number) => {
    updateMechSession(s => ({ ...s, pilot: { name, gunnery, piloting } }));
  };

  // ── Vehicle Actions ──

  const vehicleToggleWeaponAction = (weaponId: number) => {
    if (!vehicleState || !vehicleSession) return;
    updateVehicleSession(s => vehicleToggleWeapon(vehicleState, s, weaponId));
  };

  const vehicleHandleFire = () => {
    if (!vehicleState || !vehicleSession) return;
    updateVehicleSession(s => vehicleNextTurn(vehicleState, s));
  };

  const vehicleHandleDamage = (locKey: string, amount: number) => {
    if (!vehicleState || !vehicleSession) return;
    if (amount > 0) {
      updateVehicleSession(s => {
        const r = vehicleApplyDamage(vehicleState, s, locKey, amount);
        return r.session;
      });
    } else if (amount < 0) {
      updateVehicleSession(s => {
        const r = vehicleApplyHeal(vehicleState, s, locKey, Math.abs(amount));
        return r.session;
      });
    }
  };

  const vehicleApplyDamageToSelected = () => {
    if (!selectedSection || damageAmount === 0) return;
    vehicleHandleDamage(selectedSection, damageAmount);
    setDamageAmount(0);
  };

  const vehicleToggleCritAction = (locKey: string, slotIdx: number) => {
    if (!vehicleSession) return;
    updateVehicleSession(s => vehicleToggleCrit(s, locKey, slotIdx));
  };

  const vehicleSetMoveMode = (mode: 'immobile' | 'cruise' | 'flank') => {
    updateVehicleSession(s => ({ ...s, moveMode: mode }));
  };

  const vehicleSetMotive = (count: number, immobilized: boolean) => {
    updateVehicleSession(s => ({
      ...s, motiveHalfCount: count, immobilized,
      moveMode: immobilized ? 'immobile' : s.moveMode === 'immobile' ? 'cruise' : s.moveMode,
    }));
  };

  const vehicleSetPilot = (field: 'gunnery' | 'piloting' | 'name', value: number | string) => {
    updateVehicleSession(s => ({ ...s, pilot: { ...s.pilot, [field]: value } }));
  };

  const vehicleApplyCritEffectAction = (effectId: string, locKey?: string) => {
    if (!vehicleState || !vehicleSession) return;
    updateVehicleSession(s => vehicleApplyCritEffect(s, vehicleState, effectId, locKey));
  };

  const vehicleAdjustPendingCrit = (locKey: string, type: 'damage' | 'motive', delta: number) => {
    updateVehicleSession(s => {
      const pc = { ...s.pendingCrits };
      const cur = pc[locKey] ?? { damage: 0, motive: 0 };
      pc[locKey] = { ...cur, [type]: Math.max(0, cur[type] + delta) };
      // Clean up zero entries
      if (pc[locKey].damage === 0 && pc[locKey].motive === 0) delete pc[locKey];
      return { ...s, pendingCrits: pc };
    });
  };

  // ── Computed values ──
  const sysHits = mechSession ? countSystemCritHits(mechSession.crits) : { engine: 0, gyro: 0, sensors: 0, lifeSupport: 0, heatsinks: 0 };

  const legEffects = mechSession ? getLegActuatorEffects(mechSession.crits) : { pilotingMod: 0, mpPenalty: 0, hipHits: 0 };

  const armActuatorMod = mechSession
    ? { LA: getArmActuatorMod(mechSession.crits, 'LA'), RA: getArmActuatorMod(mechSession.crits, 'RA') }
    : { LA: 0, RA: 0 };

  const gunneryTotal = mechSession
    ? calcGunneryTotal(mechSession.pilot.gunnery, mechSession.heat, mechSession.wounds, sysHits.sensors, mechSession.moveMode)
    : 4;

  const pilotingTotal = mechSession
    ? calcPilotingTotal(mechSession.pilot.piloting, sysHits.gyro, mechSession.wounds) + legEffects.pilotingMod
    : 5;

  const canMechFire = mechSession ? canFire(sysHits.sensors, mechSession.destroyed) : false;

  let effectiveWalkMP = mechState && mechSession
    ? Math.max(0, mechState.walkMP - getHeatMPPenalty(mechSession.heat))
    : 0;
  for (let h = 0; h < legEffects.hipHits; h++) effectiveWalkMP = Math.floor(effectiveWalkMP / 2);
  effectiveWalkMP = Math.max(0, effectiveWalkMP - legEffects.mpPenalty);

  const effectiveRunMP = Math.ceil(effectiveWalkMP * 1.5);

  // ── Infantry / BA actions ──
  const assignInfantry = useCallback((slotIdx: number, catalogId: string) => {
    const state = INFANTRY_CATALOG.find(u => u.id === catalogId);
    if (!state) return;
    const session = buildInfantrySession(state);
    setInfantrySlots(prev => { const n = [...prev]; n[slotIdx] = { state, session }; return n; });
    setActiveInfantryIdx(slotIdx);
  }, []);

  const clearInfantry = useCallback((slotIdx: number) => {
    setInfantrySlots(prev => { const n = [...prev]; n[slotIdx] = emptyInfSlot(); return n; });
  }, []);

  const assignBA = useCallback((slotIdx: number, catalogId: string) => {
    const state = BA_CATALOG.find(u => u.id === catalogId);
    if (!state) return;
    const session = buildBASession(state);
    setBASlots(prev => { const n = [...prev]; n[slotIdx] = { state, session }; return n; });
    setActiveBAIdx(slotIdx);
  }, []);

  const clearBA = useCallback((slotIdx: number) => {
    setBASlots(prev => { const n = [...prev]; n[slotIdx] = emptyBASlot(); return n; });
  }, []);

  const infantryFireAction = useCallback((slotIdx: number, rangeBand: 0 | 1 | 2) => {
    setInfantrySlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const { session } = infantryFire(slot.state, slot.session, rangeBand);
      n[slotIdx] = { ...slot, session };
      return n;
    });
  }, []);

  const infantryFireAtAction = useCallback((slotIdx: number, rangeBand: 0 | 1 | 2, target: FireTarget | null) => {
    let capturedDamage = 0;

    setInfantrySlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const { session, damage } = infantryFire(slot.state, slot.session, rangeBand);
      capturedDamage = damage;
      n[slotIdx] = { ...slot, session };

      if (target?.type === 'inf' && target.slotIdx !== slotIdx && damage > 0) {
        const tgt = n[target.slotIdx];
        if (tgt.state && tgt.session) {
          const ts = structuredClone(tgt.session);
          const actual = Math.min(damage, ts.troopers);
          ts.troopers -= actual;
          ts.logs.push(`${slot.state.name} → ${damage} dmg → −${actual} tropas → ${ts.troopers}/${tgt.state.platoonSize}`);
          if (ts.troopers === 0) { ts.destroyed = true; ts.destroyedReason = 'Eliminado'; ts.logs.push(`${tgt.state.name} ELIMINADO`); }
          n[target.slotIdx] = { ...tgt, session: ts };
        }
      }
      return n;
    });

    if (target?.type === 'ba' && capturedDamage > 0) {
      setBASlots(prev => {
        const n = [...prev];
        const tgt = n[target.slotIdx];
        if (tgt.state && tgt.session) {
          const session = baApplyDamage(tgt.state, tgt.session, 'cluster', { amount: capturedDamage, flags: {} });
          n[target.slotIdx] = { ...tgt, session };
        }
        return n;
      });
    }
  }, []);

  const baFireAtAction = useCallback((slotIdx: number, weaponId: number, rangeBand: 0 | 1 | 2, target: FireTarget | null) => {
    let capturedDamage = 0;

    setBASlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const { session, totalDamage } = baFire(slot.state, slot.session, weaponId, rangeBand);
      capturedDamage = totalDamage;
      n[slotIdx] = { ...slot, session };

      if (target?.type === 'ba' && target.slotIdx !== slotIdx && totalDamage > 0) {
        const tgt = n[target.slotIdx];
        if (tgt.state && tgt.session) {
          const ts = baApplyDamage(tgt.state, tgt.session, 'cluster', { amount: totalDamage, flags: {} });
          n[target.slotIdx] = { ...tgt, session: ts };
        }
      }
      return n;
    });

    if (target?.type === 'inf' && capturedDamage > 0) {
      setInfantrySlots(prev => {
        const n = [...prev];
        const tgt = n[target.slotIdx];
        if (tgt.state && tgt.session) {
          const ts = structuredClone(tgt.session);
          const actual = Math.min(capturedDamage, ts.troopers);
          ts.troopers -= actual;
          ts.logs.push(`BA → ${capturedDamage} dmg → −${actual} tropas → ${ts.troopers}/${tgt.state.platoonSize}`);
          if (ts.troopers === 0) { ts.destroyed = true; ts.destroyedReason = 'Eliminado'; ts.logs.push(`${tgt.state.name} ELIMINADO`); }
          n[target.slotIdx] = { ...tgt, session: ts };
        }
        return n;
      });
    }
  }, []);

  const infantryNextTurnAction = useCallback((slotIdx: number) => {
    setInfantrySlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.session) return prev;
      n[slotIdx] = { ...slot, session: infantryNextTurn(slot.session) };
      return n;
    });
  }, []);

  const baFireAction = useCallback((slotIdx: number, weaponId: number, rangeBand: 0 | 1 | 2) => {
    setBASlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const { session } = baFire(slot.state, slot.session, weaponId, rangeBand);
      n[slotIdx] = { ...slot, session };
      return n;
    });
  }, []);

  const baNextTurnAction = useCallback((slotIdx: number) => {
    setBASlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.session) return prev;
      n[slotIdx] = { ...slot, session: baNextTurn(slot.session) };
      return n;
    });
  }, []);

  const infantryDirectLossAction = useCallback((slotIdx: number, loss: number) => {
    setInfantrySlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const s = structuredClone(slot.session);
      const actual = Math.min(loss, s.troopers);
      s.troopers -= actual;
      s.logs.push(`Recibe daño → −${actual} tropas → ${s.troopers}/${slot.state.platoonSize}`);
      if (s.troopers === 0) { s.destroyed = true; s.destroyedReason = 'Eliminado en combate'; s.logs.push(`${slot.state.name} ELIMINADO`); }
      n[slotIdx] = { ...slot, session: s };
      return n;
    });
  }, []);

  const infantryApplyDamageAction = useCallback((slotIdx: number, amount: number, flags: DamageFlags) => {
    setInfantrySlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const session = infantryApplyDamage(slot.state, slot.session, { amount, flags });
      n[slotIdx] = { ...slot, session };
      return n;
    });
  }, []);

  const baApplyDamageAction = useCallback((slotIdx: number, targetSuit: number | 'cluster', amount: number, flags: DamageFlags) => {
    setBASlots(prev => {
      const n = [...prev];
      const slot = n[slotIdx];
      if (!slot.state || !slot.session) return prev;
      const session = baApplyDamage(slot.state, slot.session, targetSuit, { amount, flags });
      n[slotIdx] = { ...slot, session };
      return n;
    });
  }, []);

  return {
    // Slots
    mechSlots, vehicleSlots,
    activeTab, setActiveTab,
    currentMechIdx, setCurrentMechIdx,
    currentVehicleIdx, setCurrentVehicleIdx,

    // Current
    currentSlot, mechState, mechSession, isLoaded,
    vehicleState, vehicleSession,

    // UI state
    selectedSection, setSelectedSection,
    damageAmount, setDamageAmount,

    // Mech actions
    handleFileUpload, loadUnitText,
    toggleWeapon, handleFire,
    handleDamage, applyDamageToSelected,
    toggleCrit,
    setMoveMode, setJumpUsed,
    setWounds, setPilot, setPilotFull, resetLog,

    // Vehicle actions
    vehicleToggleWeapon: vehicleToggleWeaponAction,
    vehicleHandleFire,
    vehicleHandleDamage,
    vehicleApplyDamageToSelected,
    vehicleToggleCrit: vehicleToggleCritAction,
    vehicleSetMoveMode,
    vehicleSetMotive,
    vehicleSetPilot,
    vehicleApplyCritEffect: vehicleApplyCritEffectAction,
    vehicleAdjustPendingCrit,

    // Computed
    sysHits, gunneryTotal, pilotingTotal,
    canMechFire, effectiveWalkMP, effectiveRunMP,
    armActuatorMod,

    // Infantry / BA slots
    infantrySlots, activeInfantryIdx, setActiveInfantryIdx,
    baSlots, activeBAIdx, setActiveBAIdx,
    assignInfantry, clearInfantry,
    assignBA, clearBA,
    infantryFireAction, infantryFireAtAction, infantryNextTurnAction, infantryApplyDamageAction, infantryDirectLossAction,
    baFireAction, baFireAtAction, baNextTurnAction, baApplyDamageAction,
  };
}

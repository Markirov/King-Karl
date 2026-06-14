import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { TallerModal, genId, getCampaignDateISO } from '@/pages/FinanzasPage';
import { commitLibroEntryAndTreasury, removeMechFromUnit, saveFuerzaCampana, loadFuerzaCampana, saveConfigBatch, loadAllFuerzaConfigSlots, saveFuerzaConfigSlot, type FuerzaSlot } from '@/lib/sheets-service';
import { loadLocalSnapshot, snapshotHasUnits } from '@/lib/simulador-persistence';
import { loadRoster } from '@/lib/roster';
import { useSimulador } from '@/hooks/useSimulador';
import { UnitSlots } from '@/components/simulador/UnitSlots';
import { InfantrySlots } from '@/components/simulador/infantry/InfantrySlots';
import { InfantryPanel } from '@/components/simulador/infantry/InfantryPanel';
import { BASlots } from '@/components/simulador/ba/BASlots';
import { BAPanel } from '@/components/simulador/ba/BAPanel';
import { PilotPanel, type AvailablePilot } from '@/components/simulador/PilotPanel';
import { HeatMonitor } from '@/components/simulador/HeatMonitor';
import { ArmorDiagram } from '@/components/simulador/ArmorDiagram';
import { CriticalMatrix } from '@/components/simulador/CriticalMatrix';
import { AdjustModModal, type AdjustModTarget } from '@/components/simulador/AdjustModModal';
import { CombatLog } from '@/components/simulador/CombatLog';
import { VehiclePanel } from '@/components/simulador/VehiclePanel';
import { CatalogSearch } from '@/components/simulador/CatalogSearch';
import { SimuladorPortada } from '@/components/simulador/SimuladorPortada';
import { FuerzaSyncBar } from '@/components/simulador/FuerzaSyncBar';
import { SubtabRightPortal } from '@/components/shell/SubtabRightPortal';
import { useAppStore } from '@/lib/store';
import type { FireTarget } from '@/lib/combat-types';

const TAB_MAP: Record<string, string> = { mechs: 'mechs', vehicles: 'vehiculos' };

// Orden fijo PJs (8 slots simulador en modo campaña). Match contra roster.jugador.
const CAMPAIGN_PILOT_ORDER = ['Jaime', 'Marcos', 'Joan', 'Alex', 'Erik', 'Zhao', 'Val', 'Tariq'];

const CAMPAIGN_UNLOCK_KEY = 'kk_campaign_unlock';
const CAMPAIGN_PASSWORD = 'Mark';

function isCampaignUnlocked(): boolean {
  return sessionStorage.getItem(CAMPAIGN_UNLOCK_KEY) === '1';
}
function gateCampaignWrite(actionLabel: string): boolean {
  if (isCampaignUnlocked()) return true;
  const pwd = prompt(`Modo Campaña (${actionLabel}): introduce la clave`);
  if (pwd === null) return false;
  if (pwd === CAMPAIGN_PASSWORD) {
    sessionStorage.setItem(CAMPAIGN_UNLOCK_KEY, '1');
    return true;
  }
  alert('Clave incorrecta');
  return false;
}

export function SimuladorPage() {
  const { activeSubTab, setActiveSubTab, simuladorPortada, setSimuladorPortada, roster, setRoster, campaign } = useAppStore();
  const sim = useSimulador();
  const [allowClan, setAllowClan] = useState(false);
  const [limitToYear, setLimitToYear] = useState(true);
  const [tallerSlotIdx, setTallerSlotIdx] = useState<number | null>(null);
  const [destroyedModalOpen, setDestroyedModalOpen] = useState(false);
  const [destroyedBusy, setDestroyedBusy] = useState(false);
  // Modo campaña SIEMPRE arranca OFF. Usuario lo activa manualmente.
  const [campaignMode, setCampaignMode] = useState<boolean>(false);
  const prevSubTabRef = useRef<string | null>(null);

  // Modal de ajuste manual de calor/dificultad (armas y componentes)
  const [adjustTarget, setAdjustTarget] = useState<
    | (AdjustModTarget & { kind: 'weapon'; id: number })
    | (AdjustModTarget & { kind: 'crit'; loc: string; slotIdx: number })
    | null
  >(null);

  // Guarda snapshot actual en FUERZACAMPAÑA + recalcula ESTADOMECHS.
  // Reutilizado por: salir de campaña, autosave 5min, guardado manual, y
  // auto-guardado tras reparación en Taller.
  const saveCampaignProgress = async (nombre = 'Campaña'): Promise<boolean> => {
    try {
      const snap: any = { schemaVersion: 1, updatedAt: new Date().toISOString(), ...sim.getSnapshot() };
      const bv = (snap.mechSlots ?? []).reduce((a: number, s: any) => a + (s?.state?.bv ?? 0), 0)
               + (snap.vehicleSlots ?? []).reduce((a: number, s: any) => a + ((s?.state as any)?.bv ?? 0), 0);
      const res = await saveFuerzaCampana({ nombre, bv, snapshot: snap });
      if (!res?.success) {
        alert('Error guardando FUERZACAMPAÑA: ' + ((res as any)?.error || 'no_response'));
        return false;
      }
      // ESTADOMECHS map
      const map: Record<string, number> = {};
      for (const ms2 of (snap.mechSlots ?? [])) {
        const st: any = ms2?.state; const se: any = ms2?.session;
        if (!st || !se) continue;
        const armorLocs = ['HD','CTf','CTr','LTf','LTr','RTf','RTr','LA','RA','LL','RL'];
        const isLocs    = ['HD','CT','LT','RT','LA','RA','LL','RL'];
        const armorMax = armorLocs.reduce((s,k) => s + ((st.armor || {})[k] ?? 0), 0);
        const armorCur = armorLocs.reduce((s,k) => s + ((se.armor || {})[k] ?? 0), 0);
        const isMax    = isLocs.reduce((s,k) => s + ((st.is || {})[k] ?? 0), 0);
        const isCur    = isLocs.reduce((s,k) => s + ((se.is || {})[k] ?? 0), 0);
        const total = armorMax + isMax;
        if (total <= 0) continue;
        const pct = se.destroyed ? 0 : Math.round(((armorCur + isCur) / total) * 100);
        const key = `${st.chassis || ''} ${st.model || ''}`.trim();
        if (key) map[key] = pct;
      }
      await saveConfigBatch({ ESTADOMECHS: JSON.stringify(map) });
      sim.markSynced?.();
      return true;
    } catch (err) {
      alert('Fallo guardando: ' + err);
      return false;
    }
  };

  // Auto-save FUERZACAMPAÑA cada 5 minutos si modo campaña y hay cambios.
  useEffect(() => {
    if (!campaignMode) return;
    const id = setInterval(async () => {
      if (!sim.dirty) return;
      if (!isCampaignUnlocked()) return; // sin clave -> skip
      const ok = await saveCampaignProgress('Campaña');
      if (ok) console.log('[Campaign] auto-save FUERZA5 OK', new Date().toLocaleTimeString());
      else console.warn('[Campaign] auto-save fallo');
    }, 5 * 60 * 1000); // 5 min
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignMode]);

  useEffect(() => {
    // Hide portada only when activeSubTab changes after initial mount
    if (prevSubTabRef.current !== null && prevSubTabRef.current !== activeSubTab) {
      setSimuladorPortada(false);
    }
    prevSubTabRef.current = activeSubTab;
  }, [activeSubTab]);

  useEffect(() => {
    const tab = activeSubTab === 'vehiculos' ? 'vehicles' : 'mechs';
    if (tab !== sim.activeTab) sim.setActiveTab(tab as 'mechs' | 'vehicles');
  }, [activeSubTab]);

  // Pilotos disponibles desde roster (Personajes sheet). Disparo/Pilotaje
  // SIEMPRE de cols O/P (disparoMech/pilotajeMech). Sin fallback Barracones
  // para evitar matches cruzados (NPCs leian skills de Castigador).
  const availablePilots = useMemo<AvailablePilot[]>(() => {
    const fromRoster = roster
      .filter(r => r.estado === 'activo' || r.estado === 'herido')
      .map(r => {
        const name = r.apodo || r.nombre || r.jugador;
        if (!name) return null;
        return {
          name,
          gunnery:  r.disparoMech  ?? 4,
          piloting: r.pilotajeMech ?? 5,
        };
      })
      .filter((x): x is AvailablePilot => x !== null);
    const seen = new Set<string>();
    return fromRoster.filter(p => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [roster]);

  // Modo campaña: orden FIJO de PJs (CAMPAIGN_PILOT_ORDER). Slot N
  // muestra iniciales 2-letras del jugador (estilo Barracones).
  const campaignPilots = useMemo(() => {
    if (!campaignMode) return null;
    return CAMPAIGN_PILOT_ORDER.map(handle => handle.slice(0, 2).toUpperCase());
  }, [campaignMode]);

  const handleToggleCampaign = async () => {
    if (campaignMode) {
      // Salir: pregunta si guardar a FUERZACAMPAÑA
      const choice = confirm('¿Guardar estado actual a FUERZACAMPAÑA antes de salir?\n\nOK = Guardar y salir\nCancelar = Solo salir (sin guardar)');
      if (choice) {
        const ok = await saveCampaignProgress('Campaña');
        if (!ok) return;
      }
      // Limpia el simulador para dejarlo listo para partidas sueltas
      sim.resetSession();
      setCampaignMode(false);
      return;
    }
    // Entrar: pide clave + carga FUERZACAMPAÑA
    if (!gateCampaignWrite('cargar FUERZACAMPAÑA')) return;
    try {
      // Si hay una partida suelta en curso, respaldarla antes de sobrescribir
      const currentSnap = loadLocalSnapshot();
      if (currentSnap && snapshotHasUnits(currentSnap)) {
        const slots = await loadAllFuerzaConfigSlots();
        const freeSlot = ([5, 4, 3, 2, 1] as FuerzaSlot[]).find(s => !slots[s]?.snapshot);
        const bv = (currentSnap.mechSlots ?? []).reduce((a: number, s: any) => a + (s?.state?.bv ?? 0), 0)
                 + (currentSnap.vehicleSlots ?? []).reduce((a: number, s: any) => a + ((s?.state as any)?.bv ?? 0), 0);
        let targetSlot: FuerzaSlot | null = freeSlot ?? null;
        if (!targetSlot) {
          const overwrite = confirm('Los 5 slots de Fuerzas están ocupados.\n\n¿Sobrescribir FUERZA5 con la partida suelta actual antes de cargar la campaña?\n\nOK = Sobrescribir FUERZA5\nCancelar = Descartar partida suelta sin guardar');
          if (overwrite) targetSlot = 5;
        }
        if (targetSlot) {
          const res = await saveFuerzaConfigSlot(targetSlot, { nombre: 'Partida suelta', bv, snapshot: currentSnap });
          if (!res?.success) {
            alert('Error guardando partida suelta en FUERZA' + targetSlot + ': ' + ((res as any)?.error || 'no_response'));
            // continúa igualmente con la carga de campaña
          }
        }
      }

      const entry = await loadFuerzaCampana();
      const loadedMechSlots = entry?.snapshot?.mechSlots ?? [];
      if (entry?.snapshot?.schemaVersion) {
        sim.hydrateFromSnapshot(entry.snapshot);
        sim.markSynced();
      } else {
        // Sin FUERZACAMPAÑA guardada todavía: arranca limpio
        sim.resetSession();
      }

      // Pre-bind: por cada PJ en orden, valida que el slot tenga SU mech.
      // Si el snapshot trae mech equivocado en ese slot (snapshot viejo con
      // orden distinto), recarga desde catalogo y sobreescribe.
      const BASE = import.meta.env.BASE_URL;
      for (let i = 0; i < CAMPAIGN_PILOT_ORDER.length; i++) {
        const handle = CAMPAIGN_PILOT_ORDER[i];
        const pilot = roster.find(r => r.jugador.toLowerCase() === handle.toLowerCase());
        if (!pilot?.mech) continue;
        const loaded: any = loadedMechSlots[i];
        const loadedName = loaded?.state
          ? `${loaded.state.chassis || ''} ${loaded.state.model || ''}`.trim().toLowerCase()
          : '';
        const expected = pilot.mech.trim().toLowerCase();
        // Match tolerante: substring en cualquier direccion
        const isCorrect = loadedName && (loadedName.includes(expected) || expected.includes(loadedName));
        if (isCorrect) continue; // slot ya tiene el mech del PJ correcto
        // Variantes nombre — Unidad concatena chassis duplicado al final.
        // Ej: "Crusader CRD-3R KKK Crusader" -> probar tambien sin trailing "Crusader".
        const nameVariants: string[] = [pilot.mech];
        const tokens = pilot.mech.split(/\s+/);
        if (tokens.length > 1 && tokens[0].toLowerCase() === tokens[tokens.length - 1].toLowerCase()) {
          nameVariants.push(tokens.slice(0, -1).join(' '));
        }
        // Fetch + load (sobreescribe si habia mech equivocado)
        let text: string | null = null;
        let fname = '';
        outerFetch: for (const candidate of nameVariants) {
          const enc = encodeURIComponent(candidate);
          for (const url of [`${BASE}assets/mechs/${enc}.ssw`, `${BASE}assets/mechs/${enc}.mtf`]) {
            try {
              const res = await fetch(url);
              if (!res.ok) continue;
              const body = await res.text();
              // Vite SPA fallback devuelve index.html con 200. Rechaza si parece HTML.
              const trimmed = body.trimStart().slice(0, 30).toLowerCase();
              if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
                console.warn(`[Campaign] ${url} devolvio HTML (archivo no existe). Probando siguiente variante.`);
                continue;
              }
              text = body;
              fname = url.split('/').pop() || `${candidate}.ssw`;
              break outerFetch;
            } catch {/* ignore */}
          }
        }
        if (text) {
          sim.loadUnitText(text, fname, i);
        } else {
          console.warn(`[Campaign] mech no encontrado en catalogo: ${pilot.mech} (PJ ${handle})`);
        }
      }

      setCampaignMode(true);
    } catch (err) {
      alert('Fallo al cargar FUERZACAMPAÑA: ' + err);
    }
  };

  // Toggles Clan + Año compactos (van pegados a CatalogSearch en el portal)
  const flagToggles = (
    <div className="flex items-center gap-2 mr-1">
      <label
        onClick={() => setAllowClan(v => !v)}
        className="flex items-center gap-1 cursor-pointer group select-none"
        title="Permitir tech Clan"
      >
        <div
          className={`w-2 h-2 border shrink-0 transition-colors ${allowClan ? 'bg-primary-container border-primary-container' : 'bg-transparent border-outline-variant/40'}`}
        />
        <span className="font-mono text-[8px] tracking-widest uppercase text-secondary/60 group-hover:text-secondary">Clan</span>
      </label>
      <label
        onClick={() => setLimitToYear(v => !v)}
        className="flex items-center gap-1 cursor-pointer group select-none"
        title="Limitar al año de campaña"
      >
        <div
          className={`w-2 h-2 border shrink-0 transition-colors ${limitToYear ? 'bg-primary-container border-primary-container' : 'bg-transparent border-outline-variant/40'}`}
        />
        <span className="font-mono text-[8px] tracking-widest uppercase text-secondary/60 group-hover:text-secondary">Año</span>
      </label>
    </div>
  );

  if (simuladorPortada) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <SubtabRightPortal>
          {flagToggles}
          <CatalogSearch
            onLoad={(text, file) => { sim.loadUnitText(text, file); setSimuladorPortada(false); }}
            allowClan={allowClan}
            limitToYear={limitToYear}
            onSwitchTab={tab => {
              const subTab = TAB_MAP[tab] ?? tab;
              setActiveSubTab(subTab);
              sim.setActiveTab(tab as 'mechs' | 'vehicles');
              setSimuladorPortada(false);
            }}
          />
        </SubtabRightPortal>
        <SimuladorPortada
          allowClan={allowClan}
          limitToYear={limitToYear}
          onSelectMechs={(clan) => {
            setAllowClan(clan);
            setActiveSubTab('mechs');
            setSimuladorPortada(false);
          }}
          onSelectVehicles={() => {
            setActiveSubTab('vehiculos');
            setSimuladorPortada(false);
          }}
          onSelectInfanteria={() => {
            setActiveSubTab('infanteria');
            setSimuladorPortada(false);
          }}
        />
      </div>
    );
  }

  if (activeSubTab === 'infanteria') {
    return <InfantryView sim={sim} />;
  }

  const { mechState: ms, mechSession: ss, vehicleState: vs, vehicleSession: vss } = sim;
  const isMech = sim.activeTab === 'mechs';

  const slotNames = isMech
    ? sim.mechSlots.map((s, i) => {
        if (campaignPilots && campaignPilots[i]) return campaignPilots[i];
        return s.state ? `${s.state.chassis} ${s.state.model}` : `SLOT ${i + 1}`;
      })
    : sim.vehicleSlots.map((s, i) => s.state ? s.state.name : `SLOT ${i + 1}`);

  const slotCount = isMech ? sim.mechSlots.length : sim.vehicleSlots.length;
  const activeIdx = isMech ? sim.currentMechIdx : sim.currentVehicleIdx;

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      {/* Subtab right-slot: flags + search + slot picker + sync */}
      <SubtabRightPortal>
        {flagToggles}
        <CatalogSearch
          onLoad={sim.loadUnitText}
          allowClan={allowClan}
          limitToYear={limitToYear}
          onSwitchTab={tab => {
            const subTab = TAB_MAP[tab] ?? tab;
            setActiveSubTab(subTab);
            sim.setActiveTab(tab as 'mechs' | 'vehicles');
          }}
        />
        <UnitSlots
          slotNames={slotNames}
          slotCount={slotCount}
          activeIndex={activeIdx}
          onSelectIndex={i => isMech ? sim.setCurrentMechIdx(i) : sim.setCurrentVehicleIdx(i)}
          onFileUpload={sim.handleFileUpload}
          shortLabels={campaignPilots ?? undefined}
        />
        <FuerzaSyncBar
          dirty={sim.dirty}
          lastLocalSave={sim.lastLocalSave}
          getSnapshot={sim.getSnapshot}
          hydrateFromSnapshot={sim.hydrateFromSnapshot}
          clearCurrentUnit={sim.clearCurrentUnit}
          markSynced={sim.markSynced}
          campaignMode={campaignMode}
          onToggleCampaignMode={handleToggleCampaign}
          onSaveCampaign={campaignMode ? () => saveCampaignProgress('Campaña') : undefined}
          bvTotal={
            sim.mechSlots.reduce((acc, s) => acc + (s.state?.bv ?? 0), 0) +
            sim.vehicleSlots.reduce((acc, s) => acc + ((s.state as any)?.bv ?? 0), 0)
          }
        />
      </SubtabRightPortal>

      {!sim.isLoaded ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 opacity-40">
          <span className="text-5xl">{isMech ? '🤖' : '🚛'}</span>
          <span className="font-mono text-[11px] text-outline tracking-[2px] uppercase">
            Busca en el catálogo o carga un archivo {isMech ? '.ssw / .mtf' : '.saw'}
          </span>
        </div>
      ) : isMech && ms && ss ? (
        /* ── MECH LAYOUT ── */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 pb-20 max-w-7xl mx-auto px-2 md:px-0">
          {/* Left: Pilot + Fire + Heat */}
          <div className="col-span-1 md:col-span-3 space-y-4">
            <PilotPanel
              state={ms}
              session={ss}
              gunneryTotal={sim.gunneryTotal}
              pilotingTotal={sim.pilotingTotal}
              sysHits={sim.sysHits}
              effectiveWalkMP={sim.effectiveWalkMP}
              effectiveRunMP={sim.effectiveRunMP}
              availablePilots={availablePilots}
              onSetPilot={sim.setPilot}
              onSetWounds={sim.setWounds}
              onSetMoveMode={sim.setMoveMode}
              onSetJumpUsed={sim.setJumpUsed}
              onLoadPilot={p => sim.setPilotFull(p.name, p.gunnery, p.piloting)}
              onOpenTaller={() => setTallerSlotIdx(sim.currentMechIdx)}
              onHandleDestruction={() => setDestroyedModalOpen(true)}
            />

            <button
              onClick={sim.handleFire}
              disabled={!sim.canMechFire || ss.destroyed}
              className="w-full bg-error/20 hover:bg-error/40 disabled:opacity-30 disabled:cursor-not-allowed border border-error text-error font-headline font-bold uppercase tracking-widest py-4 clip-chamfer transition-all flex items-center justify-center gap-2"
            >
              <Crosshair size={20} /> {ss.destroyed ? 'DESTRUIDO' : 'Fin de Turno'}
            </button>

            <HeatMonitor state={ms} session={ss} onAdjustHeat={sim.adjustHeat} />
          </div>

          {/* Center: Armor Diagram */}
          <div className="col-span-1 md:col-span-6">
            <ArmorDiagram
              state={ms}
              session={ss}
              selectedSection={sim.selectedSection}
              damageAmount={sim.damageAmount}
              setDamageAmount={sim.setDamageAmount}
              onSectionClick={s => sim.setSelectedSection(s === sim.selectedSection ? null : s)}
              onApplyDamage={sim.applyDamageToSelected}
              setSelectedSection={sim.setSelectedSection}
              onForceRevive={sim.forceReviveMech}
              onAdjustAmmo={sim.adjustAmmo}
            />
          </div>

          {/* Right: Weapons + Log */}
          <div className="col-span-1 md:col-span-3 space-y-4">
            {/* Weapons */}
            <section className="bg-surface-container-low p-4 clip-chamfer border-l-2 border-primary-container/30">
              <h2 className="font-headline text-sm font-bold text-primary-container tracking-widest uppercase mb-3">
                Armas
              </h2>
              <div className="space-y-1">
                {ms.weapons.length === 0 ? (
                  <div className="font-mono text-[10px] text-secondary/40 italic py-4 text-center">Sin armas</div>
                ) : ms.weapons.map(w => {
                  const isActive = ss.activeShots[w.id] || false;
                  const isDestroyed = w.slotIndices?.length > 0 && w.slotIndices.every(idx => ss.crits[w.loc]?.[idx]?.hit);
                  const wFam = w.ammoFamilyKey.split(':').slice(2).join(':') || w.ammoFamilyKey;
                  const noAmmo = w.usesAmmo && !ss.ammoBins.some(b => (b.familyKey.split(':').slice(2).join(':') || b.familyKey) === wFam && b.current >= w.ammoUse);
                  const baseArmMod = (w.loc === 'LA' || w.loc === 'RA') ? sim.armActuatorMod[w.loc] : 0;
                  // critMods manuales en slots de actuador del brazo → aplica a TODAS armas del brazo (igual que armMod).
                  const ACTUATOR_NAMES = ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator'];
                  const actuatorCritMod = (w.loc === 'LA' || w.loc === 'RA')
                    ? (ss.crits?.[w.loc] ?? []).reduce((sum, slot, idx) => {
                        if (!slot || !ACTUATOR_NAMES.includes(slot.name)) return sum;
                        const m = ss.critMods?.[`${w.loc}:${idx}`];
                        return sum + (m?.atk ?? 0);
                      }, 0)
                    : 0;
                  const armMod = baseArmMod + actuatorCritMod;
                  const wMod = ss.weaponMods?.[w.id] || { heat: 0, atk: 0 };
                  // critMod per-arma: solo los slots de esta arma cuentan.
                  const slotCritMod = (w.slotIndices ?? []).reduce((acc, idx) => {
                    const m = ss.critMods?.[`${w.loc}:${idx}`];
                    return m ? { heat: acc.heat + (m.heat || 0), atk: acc.atk + (m.atk || 0) } : acc;
                  }, { heat: 0, atk: 0 });
                  const weaponToHit = sim.gunneryTotal + armMod + wMod.atk + slotCritMod.atk;
                  const effectiveHeat = w.heat + wMod.heat + slotCritMod.heat;

                  return (
                    <div key={w.id}
                      className={`flex items-center justify-between p-2 transition-all text-[10px] font-mono border-l-2 ${
                        isDestroyed ? 'opacity-20 border-error line-through'
                        : isActive ? 'bg-error/20 border-error text-error'
                        : noAmmo ? 'opacity-40 border-outline-variant'
                        : (wMod.heat > 0 || wMod.atk > 0) ? 'border-amber-400/60 text-secondary'
                        : 'border-transparent hover:bg-secondary/10 text-secondary'
                      }`}
                    >
                      <div
                        onClick={() => !isDestroyed && sim.toggleWeapon(w.id)}
                        className={`flex flex-col flex-1 ${!isDestroyed ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        <span className="font-bold uppercase">{w.name}</span>
                        <span className="text-[8px] text-secondary/40">{w.loc} • {w.r}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px]">
                        <span>
                          🔥{effectiveHeat}
                          {(wMod.heat > 0 || slotCritMod.heat > 0) && (
                            <span className="text-amber-400/80"> (+{wMod.heat + slotCritMod.heat})</span>
                          )}
                        </span>
                        <span>💥{w.dmg}</span>
                        {!isDestroyed && (
                          <span
                            className="text-secondary/60"
                            title="Total para impactar (Habilidad + modificadores de movimiento/calor del piloto no incluidos)"
                          >
                            🎯{weaponToHit}+
                          </span>
                        )}
                        {armMod > 0 && !isDestroyed && (
                          <span
                            className="text-amber-400/80"
                            title={`Actuador brazo: +${armMod} a impacto (afecta todas las armas del brazo)${actuatorCritMod > 0 ? ` — incluye +${actuatorCritMod} de mod manual en actuador` : ''}`}
                          >+{armMod}🦾</span>
                        )}
                        {wMod.atk > 0 && (
                          <span className="text-amber-400/80" title={`Dificultad extra (mod arma): +${wMod.atk}`}>+{wMod.atk}⚠</span>
                        )}
                        {slotCritMod.atk > 0 && (
                          <span className="text-amber-400/80" title={`Crítico en slot del arma: +${slotCritMod.atk} a impacto`}>+{slotCritMod.atk}💢</span>
                        )}
                        {w.usesAmmo && (
                          <span className={noAmmo ? 'text-error' : ''}>
                            {ss.ammoBins.filter(b => (b.familyKey.split(':').slice(2).join(':') || b.familyKey) === wFam).reduce((sum, b) => sum + b.current, 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <CombatLog logs={ss.logs} onReset={sim.resetLog} />
          </div>

          {/* Bottom: Critical Matrix */}
          <div className="col-span-1 md:col-span-12">
            <CriticalMatrix
              state={ms}
              session={ss}
              onToggleCrit={sim.toggleCrit}
              sysHits={sim.sysHits}
              onAdjustComponent={(loc, slotIdx, name) => {
                const mod = ss.critMods?.[`${loc}:${slotIdx}`] || { heat: 0, atk: 0 };
                setAdjustTarget({ kind: 'crit', loc, slotIdx, label: `${loc} / ${name}`, heat: mod.heat, atk: mod.atk });
              }}
            />
          </div>
        </div>
      ) : vs && vss ? (
        /* ── VEHICLE LAYOUT ── */
        <VehiclePanel
          state={vs}
          session={vss}
          selectedSection={sim.selectedSection}
          damageAmount={sim.damageAmount}
          setDamageAmount={sim.setDamageAmount}
          onSectionClick={s => sim.setSelectedSection(s === sim.selectedSection ? null : s)}
          setSelectedSection={sim.setSelectedSection}
          onApplyDamage={sim.vehicleApplyDamageToSelected}
          onToggleWeapon={sim.vehicleToggleWeapon}
          onNextTurn={sim.vehicleHandleFire}
          onToggleCrit={sim.vehicleToggleCrit}
          onSetMoveMode={sim.vehicleSetMoveMode}
          onSetMotive={sim.vehicleSetMotive}
          onSetPilot={sim.vehicleSetPilot}
          onApplyCritEffect={sim.vehicleApplyCritEffect}
          onAdjustPendingCrit={sim.vehicleAdjustPendingCrit}
        />
      ) : null}

      {tallerSlotIdx !== null && (
        <TallerModal
          campaignDate={getCampaignDateISO(campaign?.campaignYear, campaign?.campaignMonth)}
          initialSimSlotIdx={tallerSlotIdx}
          onClose={() => setTallerSlotIdx(null)}
          onRestore={() => {
            // restoreMechSlotFull ya actualizó localStorage; rehidratamos el estado en RAM
            const snap = loadLocalSnapshot();
            if (snap) sim.hydrateFromSnapshot(snap);
            // En modo campaña, guarda automáticamente el progreso tras reparar
            if (campaignMode && isCampaignUnlocked()) {
              saveCampaignProgress('Campaña auto').catch(err =>
                console.warn('[Taller] auto-save tras reparación fallo', err));
            }
          }}
          onCommit={async (total, concepto, mechName) => {
            await commitLibroEntryAndTreasury({
              id: genId('lm'),
              fecha: getCampaignDateISO(campaign?.campaignYear, campaign?.campaignMonth),
              concepto,
              cantidad: Math.round(total),
              tipo: 'gasto',
              categoria: 'repuestos',
              nota: `Reparación ${mechName} · Taller`,
              jugador: '',
            });
            setTallerSlotIdx(null);
          }}
        />
      )}

      {destroyedModalOpen && ms && (() => {
        const fullName = `${ms.chassis} ${ms.model}`.toLowerCase().trim();
        // Owner: roster entry cuyo mech matchea (substring) con el nombre destruido.
        const owner = roster.find(r => {
          const rm = (r.mech || '').toLowerCase().trim();
          if (!rm) return false;
          return rm === fullName || fullName.includes(rm) || rm.includes(ms.chassis.toLowerCase());
        });
        const closeModal = () => { setDestroyedModalOpen(false); setDestroyedBusy(false); };
        const handleClearSim = () => {
          sim.clearCurrentUnit();
          closeModal();
        };
        const handleDeleteFromUnit = async () => {
          if (!owner) return;
          if (!confirm(`Borrar el mech ${ms.chassis} ${ms.model} de ${owner.nombre || owner.jugador} (sheet Personajes)?\n\nNo se puede deshacer.`)) return;
          setDestroyedBusy(true);
          const res = await removeMechFromUnit(owner.jugador || owner.nombre);
          if (!res?.success) {
            alert('Error: ' + ((res as any)?.error || 'no_response'));
            setDestroyedBusy(false);
            return;
          }
          // Limpia el slot del mech destruido en el simulador
          sim.clearCurrentUnit();
          // Refresca roster (Unidad AE actualizada -> Personajes Q recalcula)
          try { const fresh = await loadRoster(); setRoster(fresh); } catch {/* ignore */}
          // Auto-guarda FUERZA5 + ESTADOMECHS con el estado limpio
          try {
            await saveCampaignProgress('Campaña auto');
          } catch (err) {
            console.warn('[destruction] auto-save FUERZA5/ESTADOMECHS fallo', err);
          }
          closeModal();
        };
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closeModal}>
            <div className="bg-surface-container border border-error/60 clip-chamfer p-5 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="font-headline text-base text-error font-bold uppercase tracking-widest mb-3">
                Mech destruido
              </h3>
              <div className="font-mono text-[11px] text-secondary mb-4">
                <div className="text-primary-container font-bold">{ms.chassis} {ms.model}</div>
                <div className="text-[10px] text-secondary/60 mt-1">{ss?.destroyedReason}</div>
                {owner ? (
                  <div className="mt-3 px-2 py-1 bg-amber-400/10 border border-amber-400/40 text-amber-400 text-[10px] uppercase">
                    Pertenece a la unidad — Piloto: {owner.nombre || owner.jugador}
                  </div>
                ) : (
                  <div className="mt-3 px-2 py-1 bg-secondary/10 border border-outline-variant/40 text-secondary/70 text-[10px] uppercase">
                    No vinculado a piloto en roster
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleClearSim}
                  disabled={destroyedBusy}
                  className="w-full px-3 py-2 border border-secondary/40 hover:border-secondary hover:bg-secondary/10 text-secondary font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-40"
                >Borrar solo del simulador</button>

                {owner && (
                  <button
                    onClick={handleDeleteFromUnit}
                    disabled={destroyedBusy}
                    className="w-full px-3 py-2 border border-error/60 hover:border-error hover:bg-error/20 text-error font-mono text-[10px] uppercase tracking-widest font-bold transition-colors disabled:opacity-40"
                  >{destroyedBusy ? 'Borrando…' : 'Borrar de la unidad (roster + sheet)'}</button>
                )}

                <button
                  onClick={closeModal}
                  disabled={destroyedBusy}
                  className="w-full px-3 py-2 border border-outline-variant/40 hover:border-outline-variant text-secondary/60 hover:text-secondary font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-40"
                >Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal ajuste manual calor/dificultad — armas y componentes */}
      {adjustTarget && (
        <AdjustModModal
          target={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onChangeHeat={(v) => {
            if (adjustTarget.kind === 'weapon') sim.setWeaponMod(adjustTarget.id, 'heat', v);
            else sim.setCritMod(adjustTarget.loc, adjustTarget.slotIdx, 'heat', v);
            setAdjustTarget(t => t ? { ...t, heat: v } : t);
          }}
          onChangeAtk={(v) => {
            if (adjustTarget.kind === 'weapon') sim.setWeaponMod(adjustTarget.id, 'atk', v);
            else sim.setCritMod(adjustTarget.loc, adjustTarget.slotIdx, 'atk', v);
            setAdjustTarget(t => t ? { ...t, atk: v } : t);
          }}
        />
      )}
    </div>
  );
}

// ── Infantry sub-page ──────────────────────────────────────────────────────
type SimHandle = ReturnType<typeof useSimulador>;

function InfantryView({ sim }: { sim: SimHandle }) {
  const [infTab, setInfTab] = useState<'convencional' | 'ba'>('convencional');

  const targets = useMemo<FireTarget[]>(() => {
    const t: FireTarget[] = [];
    sim.mechSlots.forEach((s, i) => {
      if (s.state && s.session && !s.session.destroyed)
        t.push({ type: 'mech', slotIdx: i, label: `${s.state.chassis} ${s.state.model}` });
    });
    sim.vehicleSlots.forEach((s, i) => {
      if (s.state && s.session && !s.session.destroyed)
        t.push({ type: 'vehicle', slotIdx: i, label: s.state.name });
    });
    sim.infantrySlots.forEach((s, i) => {
      if (s.state && s.session && !s.session.destroyed)
        t.push({ type: 'inf', slotIdx: i, label: s.state.name });
    });
    sim.baSlots.forEach((s, i) => {
      if (s.state && s.session && !s.session.destroyed)
        t.push({ type: 'ba', slotIdx: i, label: s.state.name });
    });
    return t;
  }, [sim.mechSlots, sim.vehicleSlots, sim.infantrySlots, sim.baSlots]);

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      {/* Sub-tab selector */}
      <div className="flex gap-2 mb-6">
        {(['convencional', 'ba'] as const).map(t => (
          <button
            key={t}
            onClick={() => setInfTab(t)}
            className={`font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 border clip-chamfer transition-colors ${
              infTab === t
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant/40 text-outline hover:border-primary hover:text-primary'
            }`}
          >
            {t === 'convencional' ? 'Convencional' : 'Battle Armor'}
          </button>
        ))}
      </div>

      {infTab === 'convencional' ? (
        <div className="space-y-4">
          <InfantrySlots
            slots={sim.infantrySlots}
            activeIdx={sim.activeInfantryIdx}
            onSelect={sim.setActiveInfantryIdx}
            onAssign={sim.assignInfantry}
            onClear={sim.clearInfantry}
          />
          <InfantryPanel
            slot={sim.infantrySlots[sim.activeInfantryIdx]}
            targets={targets}
            onFireAt={(rb, tgt) => sim.infantryFireAtAction(sim.activeInfantryIdx, rb, tgt)}
            onNextTurn={() => sim.infantryNextTurnAction(sim.activeInfantryIdx)}
            onDirectLoss={loss => sim.infantryDirectLossAction(sim.activeInfantryIdx, loss)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <BASlots
            slots={sim.baSlots}
            activeIdx={sim.activeBAIdx}
            onSelect={sim.setActiveBAIdx}
            onAssign={sim.assignBA}
            onClear={sim.clearBA}
          />
          <BAPanel
            slot={sim.baSlots[sim.activeBAIdx]}
            targets={targets}
            onFireWeaponAt={(wId, rb, tgt) => sim.baFireAtAction(sim.activeBAIdx, wId, rb, tgt)}
            onNextTurn={() => sim.baNextTurnAction(sim.activeBAIdx)}
            onApplyDamage={(suit, amt) => sim.baApplyDamageAction(sim.activeBAIdx, suit, amt, {})}
          />
        </div>
      )}
    </div>
  );
}

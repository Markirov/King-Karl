import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
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
import { CombatLog } from '@/components/simulador/CombatLog';
import { VehiclePanel } from '@/components/simulador/VehiclePanel';
import { CatalogSearch } from '@/components/simulador/CatalogSearch';
import { SimuladorPortada } from '@/components/simulador/SimuladorPortada';
import { useAppStore } from '@/lib/store';
import { calcAttrAvg, calcTIR } from '@/lib/barracones-data';
import type { FireTarget } from '@/lib/combat-types';

const TAB_MAP: Record<string, string> = { mechs: 'mechs', vehicles: 'vehiculos' };

export function SimuladorPage() {
  const { activeSubTab, setActiveSubTab, simuladorPortada, setSimuladorPortada } = useAppStore();
  const sim = useSimulador();
  const [allowClan, setAllowClan] = useState(false);
  const [limitToYear, setLimitToYear] = useState(true);
  const prevSubTabRef = useRef<string | null>(null);

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

  // Read loaded Barracones pilots and convert to BT gunnery/piloting
  const availablePilots = useMemo<AvailablePilot[]>(() => {
    try {
      const raw = localStorage.getItem('barracones_slots_v1');
      if (!raw) return [];
      const slots: any[] = JSON.parse(raw);
      return slots
        .filter(p => p && (p.nombre || p.callsign))
        .map(p => {
          const habs: { nombre: string; nivel: number }[] = Array.isArray(p.habilidades) ? p.habilidades : [];
          const norm = (s: string) => s.trim().toLowerCase();
          const disparoSkill = habs.find(h => norm(h.nombre) === 'disparo mech');
          const pilotarSkill = habs.find(h => norm(h.nombre) === 'pilotar mech');
          const attrAvg = calcAttrAvg(p.fue ?? 6, p.des ?? 6, p.int ?? 6, p.car ?? 6);
          const gunnery  = disparoSkill ? Math.max(0, calcTIR(attrAvg, disparoSkill.nivel)) : 4;
          const piloting = pilotarSkill ? Math.max(0, calcTIR(attrAvg, pilotarSkill.nivel)) : 5;
          return { name: p.callsign || p.nombre, gunnery, piloting };
        });
    } catch { return []; }
  }, []);

  const header = (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase leading-none">
          Simulador de Combate
        </h1>
        <div className="flex flex-col justify-between self-stretch py-px gap-0.5">
          <label className="flex items-center gap-1 cursor-pointer group">
            <div
              onClick={() => setAllowClan(v => !v)}
              className={`w-2 h-2 border shrink-0 transition-colors ${allowClan ? 'bg-primary-container border-primary-container' : 'bg-transparent border-outline-variant/40'}`}
            />
            <span className="font-mono text-[7px] tracking-widest uppercase text-secondary/50 group-hover:text-secondary/80 transition-colors select-none">
              Clan
            </span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer group">
            <div
              onClick={() => setLimitToYear(v => !v)}
              className={`w-2 h-2 border shrink-0 transition-colors ${limitToYear ? 'bg-primary-container border-primary-container' : 'bg-transparent border-outline-variant/40'}`}
            />
            <span className="font-mono text-[7px] tracking-widest uppercase text-secondary/50 group-hover:text-secondary/80 transition-colors select-none">
              Año
            </span>
          </label>
        </div>
      </div>
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
    </div>
  );

  if (simuladorPortada) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        {header}
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

  // Slot names for UnitSlots
  const slotNames = isMech
    ? sim.mechSlots.map((s, i) => s.state ? `${s.state.chassis} ${s.state.model}` : `SLOT ${i + 1}`)
    : sim.vehicleSlots.map((s, i) => s.state ? s.state.name : `SLOT ${i + 1}`);

  const slotCount = isMech ? sim.mechSlots.length : sim.vehicleSlots.length;
  const activeIdx = isMech ? sim.currentMechIdx : sim.currentVehicleIdx;

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase leading-none">
            Simulador de Combate
          </h1>
          <div className="flex flex-col justify-between self-stretch py-px gap-0.5">
            <label className="flex items-center gap-1 cursor-pointer group">
              <div
                onClick={() => setAllowClan(v => !v)}
                className={`w-2 h-2 border shrink-0 transition-colors ${allowClan ? 'bg-primary-container border-primary-container' : 'bg-transparent border-outline-variant/40'}`}
              />
              <span className="font-mono text-[7px] tracking-widest uppercase text-secondary/50 group-hover:text-secondary/80 transition-colors select-none">
                Clan
              </span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer group">
              <div
                onClick={() => setLimitToYear(v => !v)}
                className={`w-2 h-2 border shrink-0 transition-colors ${limitToYear ? 'bg-primary-container border-primary-container' : 'bg-transparent border-outline-variant/40'}`}
              />
              <span className="font-mono text-[7px] tracking-widest uppercase text-secondary/50 group-hover:text-secondary/80 transition-colors select-none">
                Año
              </span>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          />
        </div>
      </div>

      {!sim.isLoaded ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 opacity-40">
          <span className="text-5xl">{isMech ? '🤖' : '🚛'}</span>
          <span className="font-mono text-[11px] text-outline tracking-[2px] uppercase">
            Busca en el catálogo o carga un archivo {isMech ? '.ssw / .mtf' : '.saw'}
          </span>
        </div>
      ) : isMech && ms && ss ? (
        /* ── MECH LAYOUT ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 max-w-7xl mx-auto">
          {/* Left: Pilot + Fire + Heat */}
          <div className="col-span-1 lg:col-span-3 space-y-4">
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
            />

            <button
              onClick={sim.handleFire}
              disabled={!sim.canMechFire || ss.destroyed}
              className="w-full bg-error/20 hover:bg-error/40 disabled:opacity-30 disabled:cursor-not-allowed border border-error text-error font-headline font-bold uppercase tracking-widest py-4 clip-chamfer transition-all flex items-center justify-center gap-2"
            >
              <Crosshair size={20} /> {ss.destroyed ? 'DESTRUIDO' : 'Fin de Turno'}
            </button>

            <HeatMonitor state={ms} session={ss} />
          </div>

          {/* Center: Armor Diagram */}
          <div className="col-span-1 lg:col-span-6">
            <ArmorDiagram
              state={ms}
              session={ss}
              selectedSection={sim.selectedSection}
              damageAmount={sim.damageAmount}
              setDamageAmount={sim.setDamageAmount}
              onSectionClick={s => sim.setSelectedSection(s === sim.selectedSection ? null : s)}
              onApplyDamage={sim.applyDamageToSelected}
              setSelectedSection={sim.setSelectedSection}
            />
          </div>

          {/* Right: Weapons + Log */}
          <div className="col-span-1 lg:col-span-3 space-y-4">
            {/* Weapons */}
            <section className="bg-surface-container-low p-4 clip-chamfer border-l-2 border-primary-container/30">
              <h2 className="font-headline text-sm font-bold text-primary-container tracking-widest uppercase mb-3">Armas</h2>
              <div className="space-y-1">
                {ms.weapons.length === 0 ? (
                  <div className="font-mono text-[10px] text-secondary/40 italic py-4 text-center">Sin armas</div>
                ) : ms.weapons.map(w => {
                  const isActive = ss.activeShots[w.id] || false;
                  const isDestroyed = w.slotIndices?.length > 0 && w.slotIndices.every(idx => ss.crits[w.loc]?.[idx]?.hit);
                  const wFam = w.ammoFamilyKey.split(':').slice(2).join(':') || w.ammoFamilyKey;
                  const noAmmo = w.usesAmmo && !ss.ammoBins.some(b => (b.familyKey.split(':').slice(2).join(':') || b.familyKey) === wFam && b.current >= w.ammoUse);
                  const armMod = (w.loc === 'LA' || w.loc === 'RA') ? sim.armActuatorMod[w.loc] : 0;
                  const weaponToHit = sim.gunneryTotal + armMod;

                  return (
                    <div key={w.id}
                      onClick={() => !isDestroyed && sim.toggleWeapon(w.id)}
                      className={`flex items-center justify-between p-2 transition-all text-[10px] font-mono border-l-2 ${
                        isDestroyed ? 'opacity-20 cursor-not-allowed border-error line-through'
                        : isActive ? 'bg-error/20 border-error text-error cursor-pointer'
                        : noAmmo ? 'opacity-40 border-outline-variant cursor-not-allowed'
                        : 'border-transparent hover:bg-secondary/10 text-secondary cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold uppercase">{w.name}</span>
                        <span className="text-[8px] text-secondary/40">{w.loc} • {w.r}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px]">
                        <span>🔥{w.heat}</span>
                        <span>💥{w.dmg}</span>
                        {armMod > 0 && !isDestroyed && (
                          <span className="text-amber-400/80">+{armMod}</span>
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
          <div className="col-span-1 lg:col-span-12">
            <CriticalMatrix state={ms} session={ss} onToggleCrit={sim.toggleCrit} sysHits={sim.sysHits} />
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

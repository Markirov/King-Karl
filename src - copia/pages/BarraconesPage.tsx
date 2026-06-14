import { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Download, Upload, Plus, Trash2, Cloud, Save, Loader } from 'lucide-react';
import { useBarracones } from '@/hooks/useBarracones';
import { BarraconesPortada } from '@/components/barracones/BarraconesPortada';
import { FichaHeraldica }    from '@/components/barracones/FichaHeraldica';
import { SheetsPanel }       from '@/components/barracones/SheetsPanel';
import { CombatePanel }      from '@/components/barracones/CombatePanel';
import { pilotSlug } from '@/lib/roster';

const BASE = import.meta.env.BASE_URL;

type Tab = 'ficha' | 'combate';

export function BarraconesPage() {
  const sim = useBarracones();
  const { current: pilot, slots, activeIdx } = sim;
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSheets, setShowSheets] = useState(false);
  const [tab, setTab] = useState<Tab>('ficha');

  const { barraconesPortada, setBarraconesPortada, roster, rosterLoading } = useAppStore();

  const FIXED_COUNT = roster.length;
  const isFixed = activeIdx < FIXED_COUNT;
  const activeRosterEntry = isFixed ? roster[activeIdx] : null;

  const handleSlotClick = async (i: number) => {
    sim.setActiveIdx(i);
    if (i < FIXED_COUNT) {
      await sim.sheetsQuickLoad(roster[i].jugador, i);
    }
  };

  const handlePortadaSelect = async (name: string) => {
    const i = roster.findIndex(r => r.jugador === name);
    if (i === -1) return;
    setBarraconesPortada(false);
    sim.setActiveIdx(i);
    await sim.sheetsQuickLoad(roster[i].jugador, i);
  };

  // Loading state mientras roster carga
  if (rosterLoading) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mb-6">
          Barracones
        </h1>
        <div className="flex items-center justify-center min-h-[40vh] gap-2 font-mono text-[11px] text-outline tracking-[2px] uppercase">
          <Loader size={14} className="animate-spin" /> Cargando roster…
        </div>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mb-6">
          Barracones
        </h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 opacity-60">
          <span className="text-5xl">🪖</span>
          <span className="font-mono text-[11px] text-outline tracking-[2px] uppercase">
            Roster vacío — añade pilotos a Personajes
          </span>
        </div>
      </div>
    );
  }

  if (barraconesPortada) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase">
            Barracones
          </h1>
        </div>
        <BarraconesPortada onSelect={handlePortadaSelect} pilotSlots={slots} />
      </div>
    );
  }

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button onClick={() => setBarraconesPortada(true)}
          className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase hover:opacity-70 transition-opacity">
          Barracones
        </button>

        {/* Slot selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {slots.map((s, i) => {
            const entry = i < FIXED_COUNT ? roster[i] : undefined;
            const fixedName = entry?.jugador;
            const label = s
              ? (s.callsign ? s.callsign.slice(0, 2).toUpperCase() : '?')
              : entry
                ? (entry.apodo || entry.jugador).slice(0, 2).toUpperCase()
                : String(i + 1);
            const titleText = entry ? `${entry.jugador}${entry.apodo ? ` «${entry.apodo}»` : ''}` : undefined;
            return (
              <button key={i} onClick={() => handleSlotClick(i)}
                title={titleText}
                className={`w-9 h-9 font-headline text-[11px] font-bold border transition-all relative ${
                  i === activeIdx
                    ? 'bg-primary-container/20 border-primary-container text-primary-container'
                    : s
                      ? 'bg-surface-container-high border-outline-variant/50 text-on-surface-variant hover:border-primary-container/40'
                      : fixedName
                        ? 'border-primary-container/20 text-primary-fixed-dim hover:border-primary-container/50 hover:text-primary-container'
                        : 'border-outline-variant/25 text-outline hover:border-outline-variant/50'
                }`}>
                {label}
                {s && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-primary-container/60 rounded-full" />}
                {!s && fixedName && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-primary-container/20 rounded-full" />}
              </button>
            );
          })}

          {/* Actions */}
          <div className="flex gap-1 ml-2 border-l border-outline-variant/20 pl-2">
            {isFixed ? (
              /* Fixed slots: save to Sheets + export JSON */
              pilot && (
                <>
                  <button onClick={sim.sheetsSave} disabled={sim.sheetsStatus === 'loading'} title="Guardar en Sheets"
                    className={`w-8 h-9 flex items-center justify-center border transition-all disabled:opacity-40 ${
                      sim.sheetsStatus === 'ok'    ? 'border-green-500/60 text-green-400' :
                      sim.sheetsStatus === 'error' ? 'border-red-500/60  text-red-400'   :
                      'border-outline-variant/30 text-outline hover:text-primary hover:border-primary'
                    }`}>
                    {sim.sheetsStatus === 'loading' ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                  {(sim.sheetsStatus === 'ok' || sim.sheetsStatus === 'error') && sim.sheetsMsg && (
                    <span className={`font-mono text-[9px] self-center max-w-32 truncate ${
                      sim.sheetsStatus === 'ok' ? 'text-green-400/80' : 'text-red-400/80'
                    }`}>
                      {sim.sheetsMsg}
                    </span>
                  )}
                  <button onClick={sim.exportJSON} title="Exportar JSON"
                    className="w-8 h-9 flex items-center justify-center border border-outline-variant/30 text-outline hover:text-primary hover:border-primary transition-all">
                    <Download size={14} />
                  </button>
                </>
              )
            ) : (
              /* Free slots: full controls */
              <>
                {pilot ? (
                  <>
                    <button onClick={sim.exportJSON} title="Exportar JSON"
                      className="w-8 h-9 flex items-center justify-center border border-outline-variant/30 text-outline hover:text-primary hover:border-primary transition-all">
                      <Download size={14} />
                    </button>
                    <button onClick={() => sim.deletePilot()} title="Eliminar piloto"
                      className="w-8 h-9 flex items-center justify-center border border-outline-variant/30 text-outline hover:text-error hover:border-error/40 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={sim.createPilot}
                      className="flex items-center gap-1.5 px-3 h-9 bg-primary/20 hover:bg-primary/40 border border-primary text-primary font-mono text-[10px] uppercase tracking-widest transition-all">
                      <Plus size={12} /> Nuevo piloto
                    </button>
                    <button onClick={() => fileRef.current?.click()} title="Importar JSON"
                      className="w-9 h-9 flex items-center justify-center border border-outline-variant/30 text-outline hover:text-primary hover:border-primary transition-all">
                      <Upload size={14} />
                    </button>
                  </>
                )}
                <button onClick={() => setShowSheets(v => !v)} title="Sheets"
                  className={`w-8 h-9 flex items-center justify-center border transition-all ${
                    showSheets
                      ? 'bg-primary-container/20 border-primary-container text-primary-container'
                      : 'border-outline-variant/30 text-outline hover:text-primary hover:border-primary'
                  }`}>
                  <Cloud size={14} />
                </button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) sim.importJSON(f); e.target.value = ''; }} />
        </div>
      </div>

      {/* Sheets panel — only for free slots */}
      {!isFixed && showSheets && (
        <div className="mb-6 max-w-lg">
          <SheetsPanel
            pilot={pilot}
            status={sim.sheetsStatus}
            msg={sim.sheetsMsg}
            results={sim.sheetsResults}
            initialQuery=""
            onSearch={sim.sheetsSearch}
            onLoad={sim.sheetsLoad}
            onSave={sim.sheetsSave}
            onClose={() => setShowSheets(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {!pilot && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 opacity-40">
          <span className="text-5xl">🪖</span>
          <span className="font-mono text-[11px] text-outline tracking-[2px] uppercase">
            {isFixed ? 'Cargando desde Sheets…' : 'Slot vacío — crea un piloto o importa un JSON'}
          </span>
        </div>
      )}

      {/* Pilot sheet */}
      {pilot && (
        <div className="pb-20 max-w-7xl mx-auto">

          {/* Tab bar */}
          <div className="flex gap-0 mb-5 border-b border-outline-variant/20">
            {(['ficha', 'combate'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 font-headline text-[11px] font-bold uppercase tracking-[2px] border-b-2 transition-all -mb-px ${
                  tab === t
                    ? 'border-primary-container text-primary-container'
                    : 'border-transparent text-outline hover:text-secondary'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* FICHA */}
          {tab === 'ficha' && (
            <FichaHeraldica
              pilot={pilot}
              pilotImg={activeRosterEntry ? `${BASE}pilot-${pilotSlug(activeRosterEntry.jugador)}.png` : undefined}
              apodoOverride={activeRosterEntry?.apodo}
              onAddQuirk={sim.addQuirk}
              onSetWeapon={sim.setWeapon}
              onSetArmadura={sim.setArmadura}
              onSetArmadura2={sim.setArmadura2}
              onSetNotas={sim.setNotas}
              onUpgradeSkill={sim.upgradeSkill}
              onUpgradeAttr={sim.upgradeAttr}
              onAddSkill={sim.addSkill}
            />
          )}

          {/* COMBATE */}
          {tab === 'combate' && (
            <CombatePanel
              pilot={pilot}
              onSetHpDmg={sim.setHpDmg}
              onSetWeapon={sim.setWeapon}
            />
          )}
        </div>
      )}
    </div>
  );
}

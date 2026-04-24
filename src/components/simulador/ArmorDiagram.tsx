import { X } from 'lucide-react';
import type { MechState, MechSession } from '@/lib/combat-types';
import { ARMOR_SLOTS } from '@/lib/combat-data';

interface Props {
  state: MechState;
  session: MechSession;
  selectedSection: string | null;
  damageAmount: number;
  setDamageAmount: (n: number) => void;
  onSectionClick: (s: string) => void;
  onApplyDamage: () => void;
  setSelectedSection: (s: string | null) => void;
}

interface ZoneDef { top: number; left: number; cols: number; label: string; armorKey: string; isKey: string }

const MECH_ZONES_BIPED: ZoneDef[] = [
  { top: 13,  left: 51, cols: 3, label: 'CABEZA',  armorKey: 'HD',  isKey: 'HD' },
  { top: 26, left: 17, cols: 5, label: 'BRAZO\nIZQUIERDO',  armorKey: 'LA',  isKey: 'LA' },
  { top: 26, left: 83, cols: 5, label: 'BRAZO\nDERECHO',  armorKey: 'RA',  isKey: 'RA' },
  { top: 24, left: 36, cols: 5, label: 'TORSO\nIZQUIERO',  armorKey: 'LTf', isKey: 'LT' },
  { top: 32, left: 50, cols: 5, label: 'TORSO\nCENTRAL',  armorKey: 'CTf', isKey: 'CT' },
  { top: 24, left: 64, cols: 5, label: 'TORSO\nDERECHO',  armorKey: 'RTf', isKey: 'RT' },
  { top: 40, left: 36, cols: 5, label: 'TORSO\nIZQUIERDO\nPOSTERIOR', armorKey: 'LTr', isKey: 'LT' },
  { top: 50, left: 50, cols: 5, label: 'TORSO\nCENTRAL\nPOSTERIOR', armorKey: 'CTr', isKey: 'CT' },
  { top: 40, left: 64, cols: 5, label: 'TORSO\nDERECHO\nPOSTERIOR', armorKey: 'RTr', isKey: 'RT' },
  { top: 60, left: 28, cols: 5, label: 'PIERNA\nIZQUIERDA',  armorKey: 'LL',  isKey: 'LL' },
  { top: 60, left: 72, cols: 5, label: 'PIERNA\nDERECHA',  armorKey: 'RL',  isKey: 'RL' },
];

const MECH_ZONES_QUAD: ZoneDef[] = [
  { top: 13,  left: 50, cols: 3, label: 'CABEZA',  armorKey: 'HD',  isKey: 'HD' },
  { top: 26, left: 17, cols: 3, label: 'PIERNA\nDELANTERA\nIZQUIERDA', armorKey: 'LA',  isKey: 'LA' },
  { top: 26, left: 83, cols: 3, label: 'PIERNA\nDELANTERA\nDERECHA', armorKey: 'RA',  isKey: 'RA' },
  { top: 28, left: 36, cols: 4, label: 'TORSO\nIZQUIERDO',  armorKey: 'LTf', isKey: 'LT' },
  { top: 32, left: 50, cols: 5, label: 'TORSO\nCENTRAL',  armorKey: 'CTf', isKey: 'CT' },
  { top: 28, left: 64, cols: 4, label: 'TORSO\nDERECHO',  armorKey: 'RTf', isKey: 'RT' },
  { top: 50, left: 36, cols: 3, label: 'TORSO\nIZQUIERDO\nPOSTERIOR', armorKey: 'LTr', isKey: 'LT' },
  { top: 50, left: 50, cols: 4, label: 'TORSO\nCENTRAL\nPOSTERIOR', armorKey: 'CTr', isKey: 'CT' },
  { top: 50, left: 64, cols: 3, label: 'TORSO\nDERECHO\nPOSTERIOR', armorKey: 'RTr', isKey: 'RT' },
  { top: 70, left: 28, cols: 4, label: 'PIERNA\nTRASERA\nIZQUIERDA', armorKey: 'LL',  isKey: 'LL' },
  { top: 70, left: 72, cols: 4, label: 'PIERNA\nTRASERA\nDERECHA', armorKey: 'RL',  isKey: 'RL' },
];

const DOT = 5;
const GAP = 1;

export function ArmorDiagram({ state, session, selectedSection, damageAmount, setDamageAmount, onSectionClick, onApplyDamage, setSelectedSection }: Props) {
  const MECH_ZONES = state.isQuad ? MECH_ZONES_QUAD : MECH_ZONES_BIPED;
  return (
    <div className="bg-surface-container p-4 relative clip-chamfer border-t-2 border-primary-container/40 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 z-10">
        <h2 className="font-headline text-[10px] font-bold text-primary-container/60 tracking-[3px] uppercase">Blindaje / ESTRUCTURA</h2>
        <div className="flex gap-3 text-[9px] font-mono text-secondary/40 uppercase">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white inline-block" /> Blindaje</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 inline-block" /> ESTRUCTURA</span>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center relative">
        <div className="relative w-full max-w-lg aspect-square">
          <img src={`${import.meta.env.BASE_URL}mech-blueprint.png`} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-60"
            style={{}} />

          {MECH_ZONES.map(zone => {
            const armorCurrent = session.armor[zone.armorKey] ?? 0;
            const armorMax = state.armor[zone.armorKey as keyof typeof state.armor] ?? 0;
            if (armorMax === 0) return null;

            const isRear = zone.armorKey.endsWith('r');
            const isCurrent = !isRear ? (session.is[zone.isKey] ?? 0) : 0;
            const isMax = !isRear ? (state.is[zone.isKey as keyof typeof state.is] ?? 0) : 0;

            const isSelected = selectedSection === zone.armorKey;
            const armorDmg = armorCurrent < armorMax;
            const isDmg = !isRear && isCurrent < isMax;

            const armorCols = Math.ceil(Math.sqrt(armorMax));
            const isCols = isMax > 0 ? Math.ceil(Math.sqrt(isMax)) : armorCols;

            return (
              <div key={zone.armorKey}
                className={`absolute z-10 transition-all duration-200 ${isSelected ? 'z-20' : 'hover:z-20'}`}
                style={{ top: `${zone.top}%`, left: `${zone.left}%`, transform: 'translate(-50%, -50%)' }}
                onClick={() => onSectionClick(zone.armorKey)}
              >
                <div className={`cursor-pointer p-1.5 transition-all ${
                  isSelected
                    ? 'bg-transparent border border-primary shadow-[0_0_12px_rgba(223,186,116,0.25)]'
                    : 'bg-transparent border border-outline-variant/25 hover:border-secondary/40'
                }`}>
                  {/* Header: label */}
                  <div className="mb-1">
                    <div className={`flex flex-col font-mono font-bold text-[8px] leading-none ${isSelected ? 'text-primary' : 'text-secondary/70'}`} style={{ gap: '1px' }}>
                      {zone.label.split('\n').map((line, i) => <span key={i}>{line}</span>)}
                    </div>
                  </div>

                  {/* Armor dots */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: `${armorCols * (DOT + GAP) - GAP}px`, gap: `${GAP}px` }}>
                    {Array.from({ length: armorMax }).map((_, i) => (
                      <div key={i} className={`transition-all ${
                        i < armorCurrent
                          ? 'bg-white'
                          : 'bg-outline-variant/20 border border-outline-variant/40'
                      }`} style={{ width: DOT, height: DOT, flexShrink: 0 }} />
                    ))}
                  </div>

                  {/* IS dots — only for non-rear zones */}
                  {!isRear && isMax > 0 && (
                    <>
                      <div className="mt-1 mb-0.5 border-t border-outline-variant/25" />
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: `${isCols * (DOT + GAP) - GAP}px`, gap: `${GAP}px` }}>
                        {Array.from({ length: isMax }).map((_, i) => (
                          <div key={i} className={`transition-all ${
                            i < isCurrent
                              ? 'bg-red-500'
                              : 'bg-outline-variant/20 border border-outline-variant/40'
                          }`} style={{ width: DOT, height: DOT, flexShrink: 0 }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Detail panel */}
          {selectedSection && (
            <>
            <div className="absolute inset-0 z-20" onClick={() => setSelectedSection(null)} />
            <div className="absolute top-0 right-0 w-52 bg-surface-container-high border-l-2 border-primary-container/50 p-3 clip-chamfer z-30 shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-md max-h-full overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-2 border-b border-outline-variant pb-1">
                <h3 className="font-headline text-xs font-bold text-primary-container uppercase">{selectedSection}</h3>
                <button onClick={() => setSelectedSection(null)} className="text-secondary hover:text-primary"><X size={14} /></button>
              </div>
              <div className="space-y-2 font-mono text-[9px]">
                <div className="flex justify-between">
                  <span className="text-secondary/60">BLINDAJE:</span>
                  <span>{session.armor[selectedSection] ?? '—'} / {(state.armor as any)[selectedSection] ?? '—'}</span>
                </div>
                {(() => {
                  const slotDef = ARMOR_SLOTS.find(a => a.k === selectedSection);
                  if (slotDef && !slotDef.rear) return (
                    <div className="flex justify-between">
                      <span className="text-secondary/60">ESTRUCTURA:</span>
                      <span>{session.is[slotDef.ik] ?? '—'} / {(state.is as any)[slotDef.ik] ?? '—'}</span>
                    </div>
                  );
                  return null;
                })()}

                {/* Damage/Heal slider */}
                <div className="pt-2 border-t border-outline-variant">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-secondary/60">{damageAmount < 0 ? 'CURAR:' : 'DAÑO:'}</span>
                    <span className={`font-bold text-[10px] ${damageAmount < 0 ? 'text-primary' : damageAmount > 0 ? 'text-error' : 'text-secondary/40'}`}>
                      {damageAmount > 0 ? `+${damageAmount}` : damageAmount}
                    </span>
                  </div>
                  <input type="range" min="-15" max="30" value={damageAmount} onChange={e => setDamageAmount(parseInt(e.target.value))}
                    className="w-full h-1 appearance-none cursor-pointer"
                    style={{ accentColor: damageAmount < 0 ? 'var(--p)' : 'var(--error)' }} />
                  <button onClick={onApplyDamage} disabled={damageAmount === 0}
                    className={`mt-2 w-full disabled:opacity-50 disabled:cursor-not-allowed py-1 uppercase tracking-widest transition-colors border ${
                      damageAmount < 0
                        ? 'bg-primary/20 hover:bg-primary/40 border-primary text-primary'
                        : 'bg-error/20 hover:bg-error/40 border-error text-error'
                    }`}
                  >{damageAmount < 0 ? 'Curar' : 'Aplicar'}</button>
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

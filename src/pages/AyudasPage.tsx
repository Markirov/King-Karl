import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { MechLocationsView }    from '@/components/ayudas/MechLocationsView';
import { MechCriticalsView }    from '@/components/ayudas/MechCriticalsView';
import { VehicleTablesView }    from '@/components/ayudas/VehicleTablesView';
import { ClusterTableView }     from '@/components/ayudas/ClusterTableView';
import { DamageGrouperView }    from '@/components/ayudas/DamageGrouperView';
import { ModifiersView }        from '@/components/ayudas/ModifiersView';
import { InfantryView }         from '@/components/ayudas/InfantryView';
import { InfantryWeaponsView }  from '@/components/ayudas/InfantryWeaponsView';
import { JumpCalculator }       from '@/features/jumpCalculator/JumpCalculator';

type View =
  | 'hub'
  | 'mech-locations'
  | 'mech-criticals'
  | 'vehicle-tables'
  | 'cluster'
  | 'grouper'
  | 'modifiers'
  | 'infantry'
  | 'infantry-weapons'
  | 'jump-calculator';

interface Section {
  label: string;
  buttons: { view: View; icon: string; text: string; desc: string }[];
}

const SECTIONS: Section[] = [
  {
    label: 'Mech',
    buttons: [
      { view: 'mech-locations', icon: '📍', text: 'Localizaciones', desc: 'Impacto · Patada · Puñetazo · Caída' },
      { view: 'mech-criticals', icon: '⚠️', text: 'Críticos',       desc: 'Tabla de hits críticos + efectos' },
    ],
  },
  {
    label: 'Vehículos',
    buttons: [
      { view: 'vehicle-tables', icon: '🚗', text: 'Tablas',   desc: 'Localizaciones · Críticos · Motriz' },
    ],
  },
  {
    label: 'Utilidades',
    buttons: [
      { view: 'cluster',   icon: '💥', text: 'Cluster Misiles', desc: 'Tabla 2D6 × tamaño lanzador' },
      { view: 'grouper',   icon: '📊', text: 'Agrupador Daño',  desc: 'Grupos de 5 puntos + localizaciones' },
      { view: 'modifiers', icon: '📐', text: 'Modificadores',   desc: 'Ataque · Movimiento · Terreno · Calor' },
    ],
  },
  {
    label: 'Infantería',
    buttons: [
      { view: 'infantry',         icon: '🪖', text: 'TRR Infantería',    desc: 'Localización · Lesiones críticas · Reglas' },
      { view: 'infantry-weapons', icon: '🔫', text: 'Tabla de Armamento', desc: '61 armas con daño, alcance y propiedades' },
    ],
  },
];

const VIEW_TITLES: Record<View, string> = {
  'hub':              'Ayudas',
  'mech-locations':   'Mech — Localizaciones de Impacto',
  'mech-criticals':   'Mech — Hits Críticos',
  'vehicle-tables':   'Vehículos — Tablas',
  'cluster':          'Tabla de Cluster de Misiles',
  'grouper':          'Agrupador de Daño',
  'modifiers':        'Tabla de Modificadores',
  'infantry':         'TRR Infantería',
  'infantry-weapons': 'Tabla de Armamento — Infantería',
  'jump-calculator':  'Calculadora de Saltos Hiperespaciales',
};

export function AyudasPage() {
  const [view, setView] = useState<View>('hub');

  return (
    <div className="p-6 animate-[fadeInUp_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {view !== 'hub' && (
          <button onClick={() => setView('hub')}
            className="flex items-center gap-1 text-secondary/60 hover:text-secondary font-mono text-[10px] uppercase tracking-widest transition-colors">
            <ChevronLeft size={14} /> Hub
          </button>
        )}
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase">
          {VIEW_TITLES[view]}
        </h1>
      </div>

      {view === 'hub' && (
        <div className="max-w-4xl space-y-8">
          {SECTIONS.map(sec => (
            <div key={sec.label}>
              <div className="text-[9px] font-mono text-secondary/40 uppercase tracking-[4px] mb-3 border-b border-outline-variant/20 pb-1">
                {sec.label}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sec.buttons.map(btn => (
                  <button key={btn.view} onClick={() => setView(btn.view)}
                    className="group text-left p-4 bg-surface-container border border-outline-variant/25 hover:border-primary/40 hover:bg-surface-container-high transition-all clip-chamfer">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{btn.icon}</span>
                      <span className="font-headline text-sm font-bold text-primary-container group-hover:text-primary transition-colors uppercase tracking-wide">{btn.text}</span>
                    </div>
                    <p className="text-[10px] font-mono text-secondary/40 group-hover:text-secondary/60 transition-colors">{btn.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Navegación */}
          <div>
            <div className="text-[9px] font-mono text-secondary/40 uppercase tracking-[4px] mb-3 border-b border-outline-variant/20 pb-1">
              Navegación
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button onClick={() => setView('jump-calculator')}
                className="group text-left p-4 bg-surface-container border border-outline-variant/25 hover:border-primary/40 hover:bg-surface-container-high transition-all clip-chamfer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🚀</span>
                  <span className="font-headline text-sm font-bold text-primary-container group-hover:text-primary transition-colors uppercase tracking-wide">Calculadora de Saltos</span>
                </div>
                <p className="text-[10px] font-mono text-secondary/40 group-hover:text-secondary/60 transition-colors">Rutas KF Drive · Dijkstra · 2866 sistemas</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {view !== 'hub' && (
        <div className="max-w-5xl">
          {view === 'mech-locations'  && <MechLocationsView />}
          {view === 'mech-criticals'  && <MechCriticalsView />}
          {view === 'vehicle-tables'  && <VehicleTablesView />}
          {view === 'cluster'         && <ClusterTableView />}
          {view === 'grouper'         && <DamageGrouperView />}
          {view === 'modifiers'       && <ModifiersView />}
          {view === 'infantry'         && <InfantryView />}
          {view === 'infantry-weapons' && <InfantryWeaponsView />}
          {view === 'jump-calculator'  && <JumpCalculator />}
        </div>
      )}
    </div>
  );
}

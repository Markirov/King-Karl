import type { NavSection, Palette } from './types';

// ═══════════════════════════════════════════════════════════════
// NAVIGATION — Section → Route → Palette mapping
//
// Palette assignment (from original Stitch design):
//   AMBER  → Civil:     Comisión, Reclutamiento, Barracones, Hoja, Crónicas
//   BLUE   → Tech/Intel: TRO, Ayudas
//   GREEN  → Military:   Simulador, HUD Táctico
// ═══════════════════════════════════════════════════════════════

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'CUARTEL GENERAL',
    items: [
      { id: 'comision',      label: 'Comisión',         icon: '🏛️', path: '/comision',      palette: 'amber' },
      { id: 'reclutamiento', label: 'Reclutamiento',    icon: '👤', path: '/reclutamiento', palette: 'amber' },
      { id: 'finanzas',      label: 'Finanzas',         icon: '💰', path: '/finanzas',      palette: 'amber',
        tabs: [
          { id: 'home',        label: 'Inicio' },
          { id: 'libro-mayor', label: 'Libro Mayor' },
          { id: 'personal',    label: 'Personal' },
        ],
      },
      { id: 'barracones',    label: 'Barracones',       icon: '🏠', path: '/barracones',    palette: 'amber' },
    ],
  },
  {
    label: 'OPERACIONES',
    items: [
      {
        id: 'simulador', label: 'Simulador', icon: '⚔️', path: '/simulador', palette: 'green',
        tabs: [
          { id: 'infanteria', label: 'Infantería' },
          { id: 'mechs',      label: 'Mechs' },
          { id: 'vehiculos',  label: 'Vehículos' },
        ],
      },
      { id: 'taller',        label: 'Taller',            icon: '🔧', path: '/taller',        palette: 'amber',
        tabs: [
          { id: 'prioridades', label: 'Prioridades' },
          { id: 'factura',    label: 'Factura' },
        ],
      },
      { id: 'hud',           label: 'Seguimiento de Combate', icon: '🎯', path: '/hud',          palette: 'green' },
      { id: 'hoja',          label: 'Hoja de Servicio', icon: '📝', path: '/hoja-servicio', palette: 'amber' },
    ],
  },
  {
    label: 'TÁCTICO',
    items: [
      { id: 'ayudas', label: 'Ayudas',             icon: '📋', path: '/ayudas', palette: 'blue' },
      { id: 'tro',    label: 'Manual Técnico',  icon: '📖', path: '/tro',    palette: 'blue' },
    ],
  },
  {
    label: 'INTEL',
    items: [
      { id: 'mapa',     label: 'Navegación', icon: '🌌', path: '/mapa',     palette: 'blue',
        tabs: [
                    { id: 'saltos',       label: 'Calculadora de Saltos' },
                    { id: 'mapa-estelar', label: 'Mapa Estelar' },
        ],
      },
      { id: 'logros',   label: 'Logros',        icon: '🎖️', path: '/logros',   palette: 'amber' },
      { id: 'cronicas', label: 'Crónicas',      icon: '📜', path: '/cronicas', palette: 'amber' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

export function getPaletteForPath(pathname: string): Palette {
  const item = ALL_NAV_ITEMS.find(i => i.path === pathname);
  return item?.palette ?? 'amber';
}

export function getNavItemByPath(pathname: string) {
  return ALL_NAV_ITEMS.find(i => i.path === pathname);
}

export function getSectionIdByPath(pathname: string): string {
  return ALL_NAV_ITEMS.find(i => i.path === pathname)?.id ?? 'comision';
}

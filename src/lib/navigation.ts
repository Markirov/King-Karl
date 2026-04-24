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
    label: 'OPERACIONES',
    items: [
      { id: 'comision',      label: 'Comisión',         icon: '🏛️', path: '/comision',      palette: 'amber' },
      { id: 'reclutamiento', label: 'Reclutamiento',    icon: '👤', path: '/reclutamiento', palette: 'amber' },
      { id: 'barracones',    label: 'Barracones',       icon: '🏠', path: '/barracones',    palette: 'amber' },
      { id: 'hoja',          label: 'Hoja de Servicio', icon: '📝', path: '/hoja-servicio', palette: 'amber' },
      {
        id: 'simulador', label: 'Simulador', icon: '⚔️', path: '/simulador', palette: 'green',
        tabs: [
          { id: 'infanteria', label: 'Infantería' },
          { id: 'mechs',      label: 'Mechs' },
          { id: 'vehiculos',  label: 'Vehículos' },
        ],
      },
    ],
  },
  {
    label: 'TÁCTICO',
    items: [
      { id: 'hud',    label: 'HUD Táctico',       icon: '🎯', path: '/hud',    palette: 'green' },
      { id: 'ayudas', label: 'Ayudas',             icon: '📋', path: '/ayudas', palette: 'blue' },
      { id: 'tro',    label: 'Technical Readout',  icon: '📖', path: '/tro',    palette: 'blue' },
    ],
  },
  {
    label: 'INTEL',
    items: [
      { id: 'mapa',     label: 'Mapa Estelar', icon: '🌌', path: '/mapa',     palette: 'blue'  },
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

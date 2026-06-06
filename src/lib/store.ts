import { create } from 'zustand';
import type { CampaignConfig, Palette } from './types';
import { saveConfigBatch } from './sheets-service';
import type { RosterEntry } from './roster';

const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyAAh-lYB1L72hTH72lpYDD0mcaAyeERLjJp1e0Ar0hhuZK8TszJdu-qmlN_cwi4sEncQ/exec';

interface AppState {
  campaign: CampaignConfig;
  setCampaign: (patch: Partial<CampaignConfig>) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;

  activePalette: Palette;
  setActivePalette: (p: Palette) => void;

  activeSubTab: string;
  setActiveSubTab: (t: string) => void;

  simuladorPortada: boolean;
  setSimuladorPortada: (v: boolean) => void;

  barraconesPortada: boolean;
  setBarraconesPortada: (v: boolean) => void;

  useLegacyDesigns: boolean;
  setUseLegacyDesigns: (v: boolean) => void;

  roster: RosterEntry[];
  rosterLoading: boolean;
  setRoster: (r: RosterEntry[]) => void;
  setRosterLoading: (v: boolean) => void;

  /** Acción pendiente para portada Finanzas → Libro Mayor (abre modal al entrar). */
  finanzasPendingModal: 'taller' | 'compras' | 'projector' | null;
  setFinanzasPendingModal: (v: 'taller' | 'compras' | 'projector' | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  campaign: {
    playerName: '',
    campaignYear: 3026,
    campaignMonth: 1,
    unitName: "King Karl's Kürassiers",
    scriptUrl: localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM') || DEFAULT_SCRIPT_URL,
    pilotNames:  [],
    pilotApodos: [],
    pilotMechs:  [],
    contratoValor: '',
    valorUnidad:   '',
    totalMechs:    '',
    pcJugadores:   [],
  },
  setCampaign: (patch) => set((s) => ({ campaign: { ...s.campaign, ...patch } })),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  activePalette: 'amber',
  setActivePalette: (p) => set({ activePalette: p }),

  activeSubTab: 'mechs',
  setActiveSubTab: (t) => set({ activeSubTab: t }),

  simuladorPortada: true,
  setSimuladorPortada: (v) => set({ simuladorPortada: v }),

  barraconesPortada: true,
  setBarraconesPortada: (v) => set({ barraconesPortada: v }),

  // Cache local rápido para evitar flash al recargar; valor real llega de Sheets en App.tsx
  useLegacyDesigns: localStorage.getItem('useLegacyDesigns') === '1',
  setUseLegacyDesigns: (v) => {
    localStorage.setItem('useLegacyDesigns', v ? '1' : '0');
    set({ useLegacyDesigns: v });
    // Persistencia global compartida via celda USE_LEGACY_DESIGNS en Configuracion
    saveConfigBatch({ USE_LEGACY_DESIGNS: v ? '1' : '0' }).catch(() => {});
  },

  roster: [],
  rosterLoading: true,
  setRoster: (r) => set({ roster: r, rosterLoading: false }),
  setRosterLoading: (v) => set({ rosterLoading: v }),

  finanzasPendingModal: null,
  setFinanzasPendingModal: (v) => set({ finanzasPendingModal: v }),
}));

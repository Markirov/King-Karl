import { create } from 'zustand';
import type { CampaignConfig, Palette } from './types';

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
}

export const useAppStore = create<AppState>((set) => ({
  campaign: {
    playerName: '',
    campaignYear: 3026,
    campaignMonth: 1,
    unitName: "King Karl's Kürassiers",
    scriptUrl: localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM') || DEFAULT_SCRIPT_URL,
    pilotMechs: [],
    contratoValor: '',
    valorUnidad:   '',
    totalMechs:    '',
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
}));

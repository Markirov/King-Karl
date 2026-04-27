import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';
import { SectionTabs } from '@/components/shell/SectionTabs';
import { useAppStore } from '@/lib/store';
import { getPaletteForPath, getNavItemByPath } from '@/lib/navigation';
import { loadConfig } from '@/lib/sheets-service';

// Pages
import { ComisionPage } from '@/pages/ComisionPage';
import { ReclutamientoPage } from '@/pages/ReclutamientoPage';
import { BarraconesPage } from '@/pages/BarraconesPage';
import { HojaServicioPage } from '@/pages/HojaServicioPage';
import { SimuladorPage } from '@/pages/SimuladorPage';
import { HudTacticoPage } from '@/pages/HudTacticoPage';
import { AyudasPage } from '@/pages/AyudasPage';
import { TROPage } from '@/pages/TROPage';
import { MapaEstelarPage } from '@/pages/MapaEstelarPage';
import { CronicasPage } from '@/pages/CronicasPage';
import { PortadaPage } from '@/pages/PortadaPage';

export function App() {
  const location = useLocation();
  const { setActivePalette, setCampaign } = useAppStore();

  // Load campaign config from Google Sheets on startup
  useEffect(() => {
    loadConfig().then(res => {
      if (!res.success) return;
      const d = res.data?.config ?? res.data;
      if (!d) return;
      const patch: Record<string, any> = {};
      const year  = parseInt(d['AÑO_CAMPANA'] ?? d['campaignYear']);
      const month = parseInt(d['MES_CAMPANA']  ?? d['campaignMonth']);
      if (year  && year > 0)  patch.campaignYear  = year;
      if (month && month > 0) patch.campaignMonth = month;
      if (d['COMPANIA_NOMBRE']) patch.unitName = d['COMPANIA_NOMBRE'];
      const pilotMechs = [1, 2, 3, 4, 5, 6].map(i => d[`PILOTO_${i}_MECH`] || '');
      if (pilotMechs.some(m => m)) patch.pilotMechs = pilotMechs;
      const pilotNames = [1, 2, 3, 4, 5, 6].map(i => d[`PILOTO_${i}_NOMBRE`] || '');
      if (pilotNames.some(n => n)) patch.pilotNames = pilotNames;
      if (d['CONTRATO_VALOR']) patch.contratoValor = d['CONTRATO_VALOR'];
      if (d['VALOR_UNIDAD'])   patch.valorUnidad   = d['VALOR_UNIDAD'];
      if (d['TOTAL_MECHS'])    patch.totalMechs    = d['TOTAL_MECHS'];
      if (Object.keys(patch).length) setCampaign(patch);
    }).catch(() => {});
  }, [setCampaign]);

  // Sync palette to current route
  useEffect(() => {
    setActivePalette(getPaletteForPath(location.pathname));
  }, [location.pathname, setActivePalette]);

  const currentNav = getNavItemByPath(location.pathname);
  const hasTabs = currentNav?.tabs && currentNav.tabs.length > 0;

  return (
    <div
      className="h-screen overflow-hidden flex flex-col bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary"
      data-palette={getPaletteForPath(location.pathname)}
    >
      {/* CRT scanline overlay */}
      <div className="scanline-overlay" />

      {/* Shell */}
      <Sidebar />
      <Header />
      {hasTabs && <SectionTabs tabs={currentNav!.tabs!} />}

      {/* Content area */}
      <main
        className={`
          lg:ml-[220px] overflow-y-auto overflow-x-hidden custom-scrollbar
          ${hasTabs ? 'mt-[88px] h-[calc(100vh-88px)]' : 'mt-12 h-[calc(100vh-48px)]'}
        `}
      >
        <Routes>
          <Route path="/"               element={<Navigate to="/portada" replace />} />
          <Route path="/portada"        element={<PortadaPage />} />
          <Route path="/comision"       element={<ComisionPage />} />
          <Route path="/reclutamiento"  element={<ReclutamientoPage />} />
          <Route path="/barracones"     element={<BarraconesPage />} />
          <Route path="/hoja-servicio"  element={<HojaServicioPage />} />
          <Route path="/simulador"      element={<SimuladorPage />} />
          <Route path="/hud"            element={<HudTacticoPage />} />
          <Route path="/ayudas"         element={<AyudasPage />} />
          <Route path="/tro"            element={<TROPage />} />
          <Route path="/mapa"            element={<MapaEstelarPage />} />
          <Route path="/cronicas"       element={<CronicasPage />} />
        </Routes>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--color-secondary)_0%,_transparent_70%)]" />
      </div>
    </div>
  );
}

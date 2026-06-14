import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';
import { SectionTabs } from '@/components/shell/SectionTabs';
import { useAppStore } from '@/lib/store';
import { getPaletteForPath, getNavItemByPath } from '@/lib/navigation';
import { loadConfig, syncScriptUrlFromRemote } from '@/lib/sheets-service';
import { loadRoster } from '@/lib/roster';

// Pages
import { ComisionPage } from '@/pages/ComisionPage';
import { ReclutamientoPage } from '@/pages/ReclutamientoPage';
import { BarraconesPage } from '@/pages/BarraconesPage';
import { BarraconesPageLegacy } from '@/pages/BarraconesPageLegacy';
import { HojaServicioPage } from '@/pages/HojaServicioPage';
import { HojaServicioPageLegacy } from '@/pages/HojaServicioPageLegacy';
import { SimuladorPage } from '@/pages/SimuladorPage';
import { FinanzasPage } from '@/pages/FinanzasPage';
import { TallerPage } from '@/pages/TallerPage';
import { HudTacticoPage } from '@/pages/HudTacticoPage';
import { AyudasPage } from '@/pages/AyudasPage';
import { TROPage } from '@/pages/TROPage';
import { MapaEstelarPage } from '@/pages/MapaEstelarPage';
import { CronicasPage } from '@/pages/CronicasPage';
import { LogrosPage } from '@/pages/LogrosPage';
import { PortadaPage } from '@/pages/PortadaPage';

export function App() {
  const location = useLocation();
  const { setActivePalette, setCampaign, useLegacyDesigns, setRoster, setRosterLoading } = useAppStore();

  // Sync URL Apps Script desde public/config.json antes de cargar nada más.
  // Si la URL cambió en config.json, la app la recoge transparente sin redeploy.
  useEffect(() => {
    syncScriptUrlFromRemote();
  }, []);

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
      const pilotApodos = [1, 2, 3, 4, 5, 6].map(i => d[`PILOTO_${i}_APODO`] || '');
      if (pilotApodos.some(a => a)) patch.pilotApodos = pilotApodos;
      if (d['CONTRATO_VALOR']) patch.contratoValor = d['CONTRATO_VALOR'];
      if (d['VALOR_UNIDAD'])   patch.valorUnidad   = d['VALOR_UNIDAD'];
      if (d['TOTAL_MECHS'])    patch.totalMechs    = d['TOTAL_MECHS'];
      if (d['PC_JUGADORES']) {
        patch.pcJugadores = String(d['PC_JUGADORES'])
          .split(',').map(s => s.trim()).filter(Boolean);
      }
      // ESTADOMECHS: JSON con %estado por mech (escrito por FuerzaSyncBar al guardar slot 5).
      if (d['ESTADOMECHS']) {
        try {
          const map = JSON.parse(String(d['ESTADOMECHS']));
          if (map && typeof map === 'object') patch.estadoMechs = map;
        } catch {/* ignore */}
      }
      if (Object.keys(patch).length) setCampaign(patch);

      // Hidratar toggle legacy global desde Sheets (sin reescribir a sheets)
      if (d['USE_LEGACY_DESIGNS'] !== undefined) {
        const useLegacy = String(d['USE_LEGACY_DESIGNS']) === '1';
        useAppStore.setState({ useLegacyDesigns: useLegacy });
        localStorage.setItem('useLegacyDesigns', useLegacy ? '1' : '0');
      }
    }).catch(() => {});
  }, [setCampaign]);

  // Cargar Roster (fuente única de pilotos) al arrancar
  useEffect(() => {
    setRosterLoading(true);
    loadRoster()
      .then(setRoster)
      .catch(() => setRosterLoading(false));
  }, [setRoster, setRosterLoading]);

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
        style={hasTabs
          ? { marginTop: 'calc(48px + var(--tabs-h, 40px))', height: 'calc(100vh - 48px - var(--tabs-h, 40px))' }
          : undefined
        }
        className={`
          2xl:ml-[220px] overflow-y-auto overflow-x-hidden custom-scrollbar
          ${hasTabs ? '' : 'mt-12 h-[calc(100vh-48px)]'}
        `}
      >
        <Routes>
          <Route path="/"               element={<Navigate to="/portada" replace />} />
          <Route path="/portada"        element={<PortadaPage />} />
          <Route path="/comision"       element={<ComisionPage />} />
          <Route path="/reclutamiento"  element={<ReclutamientoPage />} />
          <Route path="/barracones"     element={useLegacyDesigns ? <BarraconesPageLegacy /> : <BarraconesPage />} />
          <Route path="/barracones-legacy" element={<BarraconesPageLegacy />} />
          <Route path="/hoja-servicio"  element={useLegacyDesigns ? <HojaServicioPageLegacy /> : <HojaServicioPage />} />
          <Route path="/hoja-servicio-legacy" element={<HojaServicioPageLegacy />} />
          <Route path="/simulador"      element={<SimuladorPage />} />
          <Route path="/finanzas"       element={<FinanzasPage />} />
          <Route path="/taller"         element={<TallerPage />} />
          <Route path="/hud"            element={<HudTacticoPage />} />
          <Route path="/ayudas"         element={<AyudasPage />} />
          <Route path="/tro"            element={<TROPage />} />
          <Route path="/mapa"            element={<MapaEstelarPage />} />
          <Route path="/cronicas"       element={<CronicasPage />} />
          <Route path="/logros"         element={<LogrosPage />} />
        </Routes>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--color-secondary)_0%,_transparent_70%)]" />
      </div>
    </div>
  );
}

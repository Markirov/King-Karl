# CLAUDE.md — Contexto del Proyecto para Claude Code

## Proyecto
**King Karl's Kürassiers — Fleet Command**
App de gestión de campaña BattleTech. React + TypeScript + Tailwind v4 + Vite.
Repo: `https://github.com/Markirov/King-Karl`
Deploy: `https://markirov.github.io/King-Karl/`

Última actualización: 2026-06-07

---

## Stack Técnico

- **React 19** + TypeScript 5.8
- **Tailwind CSS v4** con `@theme` tokens (NO Tailwind config file — todo en `src/index.css`)
- **Vite 6** con `@tailwindcss/vite` plugin
- **Zustand** para estado global (campaña, UI, snapshot simulador, pending modals)
- **React Router v7** con `HashRouter` (para GitHub Pages)
- **Lucide React** para iconos
- **Motion** (Framer Motion) disponible pero no usado aún
- **Tauri** (Rust + WebView2) — launcher desktop app (carpeta `launcher-app/`)

## Deploy

GitHub Actions automático. Push a `main` → build → deploy a GitHub Pages.
- `base: '/King-Karl/'` en `vite.config.ts`
- Assets estáticos en `/public/` (se referencian con `import.meta.env.BASE_URL`)
- Workflow en `.github/workflows/deploy.yml`

---

## Responsive / Breakpoints

**Target prioritario actual:** tablet 10" (1280×800 landscape, 800×1280 portrait).

Hook `useViewport()` en `src/hooks/useViewport.ts` con breakpoints:
- `mobile`: <768px (collapsible sidebar)
- `tablet`: 768-1279px (sidebar fija, layouts 1-col donde aplica)
- `desktop`: ≥1280px (layout completo)

Shell (Sidebar/Header/main margin) usa `md:` (768px) en lugar de `lg:` (1024px)
para que tablets 10" portrait ya tengan sidebar fija.

Páginas con responsive aplicado:
- ✅ ComisionPage (single col en tablet, banner oculto, KPIs wrap)

Pendiente responsive en:
- Hoja Servicio (P3 Two-Tone tiene layout grande)
- Simulador (ArmorDiagram + panels)
- Finanzas (modales Taller/Compras tienen widths fijos)
- Barracones P2 Medallón

Móvil (<768) — fase posterior.

---

## Estructura del Proyecto

```
src/
├── main.tsx                    ← Entry point (HashRouter)
├── App.tsx                     ← Router + Shell + paleta automática por ruta
├── index.css                   ← Design system Stitch (tokens @theme + paletas + utilities)
│
├── components/
│   ├── shell/
│   │   ├── Sidebar.tsx         ← Navegación lateral (md:+ fija, mobile collapsible)
│   │   ├── Header.tsx          ← Barra superior + hamburger mobile
│   │   ├── SectionTabs.tsx     ← Sub-tabs (driven by navigation.ts)
│   │   └── SecretMenu.tsx      ← Settings modal con toggle USE_LEGACY_DESIGNS
│   ├── simulador/
│   │   ├── ArmorDiagram.tsx    ← Diagrama blindaje + click outside/ESC (F1 done)
│   │   ├── PilotPanel.tsx      ← Piloto, heridas, movimiento, to-hit
│   │   ├── HeatMonitor.tsx     ← Barra calor con proyección y warnings
│   │   ├── CriticalMatrix.tsx  ← Layout 3x3 control daños
│   │   ├── UnitSlots.tsx       ← Selector slots 1-5 + upload
│   │   ├── CombatLog.tsx       ← Terminal logs
│   │   ├── FuerzaSyncBar.tsx   ← Sync con sheet Fuerzas + indicador estado
│   │   └── SimuladorPortada.tsx ← Portada landing simulador
│   ├── barracones/
│   │   └── BarraconesPortada.tsx ← Portada barracones P2 Medallón
│   └── ui/
│       └── PagePlaceholder.tsx
│
├── hooks/
│   ├── useSimulador.ts         ← Hook principal simulador (state/session/snapshots)
│   ├── useMechCatalog.ts       ← Cache singleton index.min.json mechs+vehicles
│   ├── useBarracones.ts        ← Hook barracones (pilotos + slots)
│   └── useViewport.ts          ← Breakpoint detection (mobile/tablet/desktop)
│
├── lib/
│   ├── combat-types.ts         ← Tipos: MechState, MechSession, VehicleState, etc.
│   ├── combat-data.ts          ← Tablas BT, transferencia daño, calor, curación
│   ├── parsers.ts              ← Parsers SSW/MTF/SAW
│   ├── weapons.ts              ← Base armas + ammo helpers
│   ├── types.ts                ← Tipos generales (NavItem, CampaignConfig)
│   ├── navigation.ts           ← Rutas, secciones, paletas, sub-tabs
│   ├── store.ts                ← Zustand store global
│   ├── sheets-service.ts       ← Servicio Google Sheets + wrappers tesorería
│   ├── simulador-persistence.ts ← Snapshot localStorage + restoreMechSlotFull
│   ├── repair-engine.ts        ← Motor reparaciones (propio + canon CamOps toggle)
│   ├── salary-calc.ts          ← Sueldos FM Mercs + quality multipliers
│   ├── maintenance-calc.ts     ← Mantenimiento mensual canon (StratOps)
│   ├── asset-prices.ts         ← Tabla precios compra mechs/vehículos (Hoja 28)
│   ├── currency-utils.ts       ← formatCzar + parseCurrencyValue (₡)
│   ├── roster.ts               ← Roster dinámico desde Personajes sheet
│   ├── barracones-data.ts      ← Tablas atributos/habilidades/quirks RPG
│   └── cronicas-types.ts       ← Tipos Crónicas + Parte Diario
│
├── pages/
│   ├── PortadaPage.tsx         ← Landing al entrar (/portada)
│   ├── ComisionPage.tsx        ← KPIs unidad, lanza prime, ops panel (RESPONSIVE)
│   ├── ReclutamientoPage.tsx   ← Placeholder
│   ├── BarraconesPage.tsx      ← Barracones P2 Medallón (default)
│   ├── BarraconesPageLegacy.tsx ← Variante legacy (toggle USE_LEGACY_DESIGNS)
│   ├── HojaServicioPage.tsx    ← Hoja Servicio P3 Two-Tone (default)
│   ├── HojaServicioPageLegacy.tsx ← Variante legacy
│   ├── SimuladorPage.tsx       ← Simulador combate (FUNCIONAL)
│   ├── FinanzasPage.tsx        ← Libro Mayor + Personal + portada 5 botones
│   ├── HudTacticoPage.tsx      ← Placeholder
│   ├── AyudasPage.tsx          ← Placeholder
│   ├── TROPage.tsx             ← Technical Readout MVP (search + detail)
│   ├── MapaEstelarPage.tsx     ← Mapa estelar + jump calculator
│   ├── CronicasPage.tsx        ← Crónicas + Parte Diario (sheet dedicado)
│   └── LogrosPage.tsx          ← Logros UI + dynamic endpoint
│
├── features/
│   └── jumpCalculator/          ← Calculadora saltos K-F + año campaña
│
public/
├── assets/
│   ├── mechs/index.json + index.min.json    ← 4195 entries enriquecidas
│   └── vehicles/index.json + index.min.json ← 845 entries
├── mech-blueprint.png          ← Silueta mech (fondo ArmorDiagram)
├── banner-kkk.png              ← Banner unidad ComisionPage
├── KIngKarlKRifle.png          ← Emblema ComisionPage
└── .nojekyll                   ← Para GitHub Pages

launcher-app/                   ← Tauri desktop app (F1 done, F2 pending)
scripts/
├── build-mech-data.cjs         ← Port extractor_ssw.py → Node, genera index.min.json
└── index.bat                   ← Rebuild indexes Windows
```

---

## Design System Stitch

### Triple Paleta (se activa por ruta vía `data-palette` en App.tsx)

| Paleta | Uso | Primary | Bright |
|--------|-----|---------|--------|
| **amber** | Civil: Comisión, Reclutamiento, Barracones, Hoja, Crónicas, Finanzas, Mapa, Logros | `#ffd79b` | `#ffae00` |
| **blue** | Tech: TRO, Ayudas | `#bdf4ff` | `#60a5fa` |
| **green** | Militar: Simulador, HUD Táctico | `#4ade80` | `#00ff41` |

### Estilo Visual
- **Zero border-radius** (angular militar)
- **clip-chamfer** vía clip-path para paneles (esquinas biseladas 8px)
- **Scanline CRT** overlay fijo
- **Tipografía:**
  - Hoja Servicio P3: Cormorant Garamond (titles) + Special Elite (mono)
  - General: Space Grotesk (headlines) + Inter (body) + Share Tech Mono (datos)
- **Fondo:** `#10141a` con jerarquía surfaces
- **Imagen mech:** `filter: invert(1) hue-rotate(180deg)` + `mix-blend-mode: screen`

### USE_LEGACY_DESIGNS toggle
- Configuración en sheet Configuracion célula `USE_LEGACY_DESIGNS = 0|1`
- Activable desde Settings → SecretMenu
- Persiste localStorage cache + sync remoto
- Switching: HojaServicioPage ↔ HojaServicioPageLegacy, BarraconesPage ↔ BarraconesPageLegacy

---

## Arquitectura del Simulador

### Separación State / Session

```typescript
interface MechSlot {
  state: MechState | null;   // Datos estáticos parseados (inmutable)
  session: MechSession | null; // Estado combate actual (mutable)
}
```

- **MechState**: chassis, model, tonnage, armor máx, IS máx, armas, crits, ammo bins
- **MechSession**: armor actual, IS actual, calor, heridas, crits con hit, ammo bins con contadores, activeShots, logs

### Persistencia

- `kk_simulador_session_v1` localStorage — `SimuladorSnapshot` schema 1
- Sync remoto: sheet `Fuerzas` (ID|Nombre|Fecha|BV|JSON), `FuerzaSyncBar` UI
- `restoreMechSlotFull(slotIdx)` deja slot como nuevo (armor/IS/crits/ammo)

### Mecánicas Implementadas

1. Cadena transferencia daño (LA→LT→CT)
2. Curación (mechApplyHeal)
3. Destrucción (CT/HD IS=0, Engine≥3, Gyro≥2)
4. Armas (verifica destrucción, munición, consume bins)
5. Explosión munición (al marcar crit ammo)
6. Calor (mov + armas + reactor×5 − disipación)
7. Fin turno (aplica delta calor, reset armas/mov)
8. Gunnery (base + calor + heridas + sensores×2 + mov)
9. Piloting (base + gyro×3 + heridas)
10. MP efectivo (walkMP − penalización calor)

### Combat Improvements

- **F1 done** (commit `61ee16c`): persistencia local + sync Fuerzas + click fuera/ESC ArmorDiagram
- **F2-F5 pending** — ver PENDING.md

---

## Finanzas / Tesorería

### Tabs y portada

`/finanzas` con 3 sub-tabs:
- **Inicio** (`home`): portada con 5 botones grandes (Libro Cuentas / Compras / Taller / Personal / Proyectar Mes)
- **Libro Mayor**: tabla CRUD entradas + 4 modales (Acquisition, Taller, Maintenance, Editor)
- **Personal**: tabla CRUD personal auxiliar (18 roles BT)

### Sistema reparaciones (Taller)

`src/lib/repair-engine.ts` con DOS sistemas:
- **`propio`** (default): house rule basado en Sheets Taller G5:G19 + Ayudas BW:BX + estado factura %
- **`canon`** (CamOps p.205-212): sólo reemplazo total cuesta ₡, parcial = 0 (sólo labor)

Toggle en TallerModal. Concepto en libro mayor etiqueta `[CamOps]` o `[propio · NNN%]`.
Documentado en `INFORME_DISCREPANCIAS_CANON.md`.

Carga datos desde simulador (botón 📡): lee MechSlot, computa damage delta
state-session, mapea crits a componentes, calcula munición gastada × precio canon.
Al commit con sim cargado → `restoreMechSlotFull` (rearm completo).

### Tesorería autoupdate

`commitLibroEntryAndTreasury(entry, prev?)` wrapper en sheets-service:
- guarda entry
- calcula delta (ingreso=+, gasto=−)
- actualiza CONTRATO_VALOR en Configuracion sheet
- update store campaign.contratoValor

ComisionPage KPI Tesorería se refresca inmediato.

---

## Backend Google Apps Script

URL default: `https://script.google.com/macros/s/AKfycby.../exec`
Configurable vía localStorage `GOOGLE_SCRIPT_URL_CUSTOM`.

Versión actual v2.7. Sheets:
- **Configuracion**: COMPANIA_NOMBRE, AÑO_CAMPANA, MES_CAMPANA, CONTRATO_VALOR, VALOR_UNIDAD, TOTAL_MECHS, PC_JUGADORES, PROMPT_*, TELEGRAM_*, USE_LEGACY_DESIGNS
- **Personajes**: pilotos PJ y PNJ (XP, atributos, rerolls, lanza)
- **Logros**: dynamic endpoint
- **Respuestas**: respuestas form misiones
- **Crónicas** (v2.4): hoja dedicada narrativa
- **OrdenDia** + **ParteDiario** (v2.5): hojas dedicadas C1/C2 (C3 muerta)
- **Movimientos** (v2.6): histórico contable
- **LibroMayor** (v2.7): ingresos/gastos ad-hoc CRUD
- **Personal** (v2.7): personal auxiliar CRUD
- **Fuerzas**: snapshots simulador
- **Historial**: combates registrados
- **Taller** + **Ayudas**: tablas reparación + precios componentes
- **Hoja 28**: tabla precios compra mechs/vehículos por clase × experiencia

Endpoints: `loadConfig`, `loadPlayer`, `savePlayer`, `loadRoster`, `getCronicas`,
`saveCronica`, `deleteCronica`, `getOrdenDia`, `saveOrdenDia`, `getParteDiario`,
`saveParteDiario`, `getMovimientos`, `getLibroMayor`, `saveLibroMayor`,
`deleteLibroMayor`, `getPersonal`, `savePersonal`, `deletePersonal`, `getFuerzas`,
`saveFuerzas`, `getHistorial`, `registrarMision`, `saveConfiguracionBatch`,
`registrarGastoXP`.

⚠️ **Deploy**: usar "New deployment" no "Edit deployment" (cache issue).

---

## Secciones de la App

| Sección | Ruta | Paleta | Estado |
|---------|------|--------|--------|
| Portada | `/portada` | amber | Landing |
| Comisión | `/comision` | amber | ✅ KPIs unidad + responsive tablet 10" |
| Reclutamiento | `/reclutamiento` | amber | Placeholder |
| Barracones | `/barracones` | amber | ✅ P2 Medallón + legacy toggle |
| Hoja de Servicio | `/hoja-servicio` | amber | ✅ P3 Two-Tone + legacy toggle |
| **Finanzas** | `/finanzas` | amber | ✅ portada + libro mayor + personal + taller |
| **Simulador** | `/simulador` | green | ✅ FUNCIONAL + persistence + sync |
| HUD Táctico | `/hud` | green | Placeholder |
| Ayudas | `/ayudas` | blue | Placeholder |
| TRO | `/tro` | blue | ✅ MVP search + detail + send to sim |
| Mapa Estelar | `/mapa` | amber | ✅ Funcional con jump calculator |
| Crónicas | `/cronicas` | amber | ✅ Crónicas + Parte Diario |
| Logros | `/logros` | amber | ✅ UI + dynamic endpoint |

### Sub-tabs por sección

- **Simulador**: Infantería (placeholder BA) / Mechs (funcional) / Vehículos (parcial)
- **Finanzas**: Inicio (portada) / Libro Mayor / Personal
- **Barracones**: pagination lanzas PRIMUS / SECUNDUS / TERTIUS

---

## Parsers + Catálogos

### Indexes enriquecidos (port extractor_ssw.py → Node)

`scripts/build-mech-data.cjs` genera:
- `public/assets/mechs/index.json` + `index.min.json` (4195 mechs)
- `public/assets/vehicles/index.json` + `index.min.json` (845 vehículos)

Campos extraídos: name, chassis, model, fullName, tons, weightClass (Light ≤35,
Medium ≤55, Heavy ≤75, Assault ≥80 canon), categoria, isOmni, isClan, techBase,
bv2, cost, year, era, motive, engine{rating,type}, walkMP/runMP/jumpMP,
structure, armor{type,total,byLocation}, heatSinks{count,type,dissipation},
weapons{name:count}, totalHeat, totalDamage, ammo[].

OmniMechs expanden loadouts a entries separadas.

Hook `useMechCatalog()` carga singleton + cache promise. `findMechByName()` fuzzy.

### Runtime parsers (subida ficheros simulador)

`src/lib/parsers.ts` y `src/lib/weapons.ts`:
- `mechParseMech(text)` detecta SSW/MTF y llama parser correcto
- `mechParseSSW(text)` — XML .ssw
- `mechParseMTF(text)` — texto plano .mtf
- `vehicleParseSAW(text)` — XML .saw

Weapons DB con 55 entries hidratada en startup.

---

## Convenciones de Código

- **Componentes**: función exportada con nombre (`export function ComponentName`)
- **Hooks**: prefijo `use` (`useSimulador`, `useViewport`)
- **Tipos**: archivos separados (`combat-types.ts`, `types.ts`)
- **Lógica pura**: en `combat-data.ts`, `repair-engine.ts` (testeable)
- **CSS**: Tailwind v4 utilities + design tokens (`text-primary-container`)
- **Palette-aware**: `var(--p)` para colores que cambian por sección
- **Import paths**: usar `@/` alias
- **Responsive**: `useViewport()` para layouts inline-styled, breakpoints Tailwind para utilities

---

## Manuales y Documentos

Carpeta `manuales/` (gitignored, symlink a `E:\Drive\CBT\Garduña\`) contiene PDFs
comerciales BattleTech (copyright). NO commitear.

Fuentes canon usadas:
- **Campaign Operations** 3rd Print — repair, maintenance, salaries
- **TechManual** — component costs, construction rules
- **Tactical Operations** — advanced equipment
- **FM Mercenaries** — salary scales, contracts
- **Tech Manual** — ammo prices canon

Documentos del proyecto:
- `DESIGN.md` — Design system visual exportado de Google Stitch
- `INFORME_DISCREPANCIAS_CANON.md` — Taller propio vs CamOps canon
- `INFORME_COSTES.md` — compilación costes blindaje/armas/personal/combustible
- `SHEETS_REORG.md` — fases A/B/C reorganización Sheets
- `APPS_SCRIPT.md` — referencia endpoints + headers
- `PENDING.md` — backlog activo
- `COMBAT_IMPROVEMENTS_SPEC.md` — spec mejoras simulador

---

## Seguridad

- `.gitignore` cubre `credenciales*.json`, `*service-account*.json`, `secrets.*`,
  `manuales/` (symlink PDFs), `.env*`
- Google Apps Script URL pública en código (es scriptId, no secret)
- GitHub PAT y service-account credentials NUNCA en repo

---

## Launcher Desktop (Tauri)

`launcher-app/` — F1 done (commit `565efec`). 18 botones distribuidos en 6 grupos.
Backend Rust: `stream_shell`, `get_git_status`, `check_port`, `open_url`, config
persistence. Frontend tema Stitch amber. F2-F3 pendientes (ver PENDING.md).

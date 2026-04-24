# CLAUDE.md — Contexto del Proyecto para Claude Code

## Proyecto
**King Karl's Kürassiers — Fleet Command**  
App de gestión de campaña BattleTech. React + TypeScript + Tailwind v4 + Vite.  
Repo: `https://github.com/Markirov/King-Karl`  
Deploy: `https://markirov.github.io/King-Karl/`

---

## Stack Técnico

- **React 19** + TypeScript 5.8
- **Tailwind CSS v4** con `@theme` tokens (NO Tailwind config file — todo en `src/index.css`)
- **Vite 6** con `@tailwindcss/vite` plugin
- **Zustand** para estado global (campaña, UI)
- **React Router v7** con `HashRouter` (para GitHub Pages)
- **Lucide React** para iconos
- **Motion** (Framer Motion) disponible pero no usado aún

## Deploy

GitHub Actions automático. Push a `main` → build → deploy a GitHub Pages.
- `base: '/King-Karl/'` en `vite.config.ts`
- Assets estáticos en `/public/` (se referencian con `import.meta.env.BASE_URL`)
- Workflow en `.github/workflows/deploy.yml`

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
│   │   ├── Sidebar.tsx         ← Navegación lateral con 9 secciones
│   │   ├── Header.tsx          ← Barra superior (Comisión de Revisión y Fianza de Mercenarios)
│   │   └── SectionTabs.tsx     ← Sub-tabs dentro de secciones (Mechs/Vehículos/Infantería)
│   ├── simulador/
│   │   ├── ArmorDiagram.tsx    ← Diagrama de blindaje con imagen mech + dots por zona
│   │   ├── PilotPanel.tsx      ← Piloto, heridas, movimiento, to-hit
│   │   ├── HeatMonitor.tsx     ← Barra de calor con proyección y warnings
│   │   ├── CriticalMatrix.tsx  ← Layout 3x3 con control de daños
│   │   ├── UnitSlots.tsx       ← Selector de slots 1-5 + botón upload
│   │   └── CombatLog.tsx       ← Terminal de logs
│   └── ui/
│       └── PagePlaceholder.tsx ← Placeholder para secciones no migradas
│
├── hooks/
│   └── useSimulador.ts         ← Hook principal del simulador (state/session)
│
├── lib/
│   ├── combat-types.ts         ← Tipos: MechState, MechSession, VehicleState, etc.
│   ├── combat-data.ts          ← Tablas BT, cadena de transferencia, calor, daño, curación
│   ├── parsers.ts              ← Parsers SSW/MTF/SAW (portados del HTML original)
│   ├── weapons.ts              ← Base de datos de armas + ammo helpers
│   ├── types.ts                ← Tipos generales (NavItem, CampaignConfig, etc.)
│   ├── navigation.ts           ← Rutas, secciones, paletas
│   ├── store.ts                ← Zustand store global
│   └── sheets-service.ts       ← Servicio Google Sheets (Apps Script backend)
│
├── pages/
│   ├── SimuladorPage.tsx       ← Simulador de combate (FUNCIONAL)
│   ├── ComisionPage.tsx        ← Placeholder
│   ├── ReclutamientoPage.tsx   ← Placeholder
│   ├── BarraconesPage.tsx      ← Placeholder
│   ├── HojaServicioPage.tsx    ← Placeholder
│   ├── HudTacticoPage.tsx      ← Placeholder
│   ├── AyudasPage.tsx          ← Placeholder
│   ├── TROPage.tsx             ← Placeholder
│   └── CronicasPage.tsx        ← Placeholder
│
public/
├── mech-blueprint.png          ← Silueta de mech (fondo del diagrama de blindaje)
└── .nojekyll                   ← Para GitHub Pages
```

---

## Design System Stitch

### Triple Paleta (se activa por ruta via `data-palette` en App.tsx)

| Paleta | Uso | Primary | Bright |
|--------|-----|---------|--------|
| **amber** | Civil: Comisión, Reclutamiento, Barracones, Hoja, Crónicas | `#ffd79b` | `#ffae00` |
| **blue** | Tech: TRO, Ayudas | `#bdf4ff` | `#60a5fa` |
| **green** | Militar: Simulador, HUD Táctico | `#4ade80` | `#00ff41` |

Los componentes usan `var(--p)`, `var(--p-bright)`, etc. que cambian según la paleta activa.

### Estilo Visual
- **Zero border-radius** en todo (angular, militar)
- **clip-chamfer** vía clip-path para paneles (esquinas biseladas 8px)
- **Scanline CRT** overlay fijo
- **Tipografía:** Space Grotesk (headlines), Inter (body), Share Tech Mono (datos)
- **Fondo:** `#10141a` con jerarquía de surfaces
- **Imagen del mech:** `filter: invert(1) hue-rotate(180deg)` + `mix-blend-mode: screen` para eliminar fondo blanco

---

## Arquitectura del Simulador

### Separación State / Session

El simulador usa un patrón de **slots** (5 mechs, 4 vehículos):

```typescript
interface MechSlot {
  state: MechState | null;   // Datos estáticos del archivo parseado (inmutable)
  session: MechSession | null; // Estado de combate actual (mutable)
}
```

- **MechState**: chassis, model, tonnage, armor máximo, IS máximo, armas, crits, ammo bins
- **MechSession**: armor actual, IS actual, calor, heridas, crits con hit/no-hit, ammo bins con contadores, activeShots, logs

### Mecánicas Implementadas (en `combat-data.ts`)

1. **Cadena de transferencia de daño**: `mechApplyDamage()` — armor → IS → destruye localización → transfiere (LA→LT→CT)
2. **Curación**: `mechApplyHeal()` — restaura IS y armor hasta máximo
3. **Destrucción**: CT/HD IS=0 → mech destruido. Engine≥3 o Gyro≥2 → destruido
4. **Armas**: `mechToggleWeapon()` — verifica destrucción, munición, consume de bins
5. **Explosión de munición**: `mechToggleCrit()` — al marcar crit de ammo, aplica daño
6. **Calor**: `mechCalcHeatDelta()` — mov + armas + reactor(×5/hit) − disipación
7. **Fin de turno**: `mechNextTurn()` — aplica delta de calor, reset armas/movimiento
8. **Gunnery**: base + calor + heridas + sensores(×2) + movimiento
9. **Piloting**: base + gyro(×3) + heridas
10. **MP efectivo**: walkMP − penalización por calor

### Mecánicas NO Implementadas Aún

- Vehículos completos (session, daño, motive damage, crits fatales)
- Slider de daño bidireccional (negativo = curar)
- Salto por hexes (selector de 1..jumpMP para calor variable)
- Combate RPG personal (Barracones → Combate)
- Validación completa de parser → tipos (puede haber desajustes)

---

## Parsers

Los parsers están en `src/lib/parsers.ts` y `src/lib/weapons.ts`. Fueron portados del HTML original.

### Funciones principales:
- `mechParseMech(text)` — Detecta SSW (XML) o MTF (texto) y llama al parser correcto
- `mechParseSSW(text)` — Parser XML para archivos .ssw
- `mechParseMTF(text)` — Parser texto plano para archivos .mtf
- `vehicleParseSAW(text, sourceName)` — Parser XML para archivos .saw

### Posibles problemas:
Los parsers devuelven objetos que pueden no tener todos los campos que `MechState` espera (como `ammoBins`, `slotIndices`, `ammoFamilyKey`). El hook `useSimulador.ts` hace un mapping defensivo con fallbacks, pero puede que algunos mechs fallen. **Prioridad: probar con varios .ssw y ver qué campos faltan.**

---

## Secciones de la App (9 total)

| Sección | Ruta | Paleta | Estado |
|---------|------|--------|--------|
| Comisión (Landing) | `/` | amber | Placeholder |
| Reclutamiento (Generador) | `/reclutamiento` | amber | Placeholder |
| Barracones (Fichas RPG) | `/barracones` | amber | Placeholder |
| Hoja de Servicio | `/hoja-servicio` | amber | Placeholder |
| **Simulador** | `/simulador` | green | **FUNCIONAL** |
| HUD Táctico (Battle Tracker) | `/hud` | green | Placeholder |
| Ayudas (TRR Hub) | `/ayudas` | blue | Placeholder |
| Technical Readout (TRO) | `/tro` | blue | Placeholder |
| Crónicas | `/cronicas` | amber | Placeholder |

### Sub-tabs del Simulador
- **Infantería** — Placeholder (futuro: Battle Armor)
- **Mechs** — Funcional
- **Vehículos** — Parcial (carga archivos .saw, UI placeholder)

---

## Próximos Pasos Sugeridos (por prioridad)

### 1. Depurar el Simulador
- Probar carga de varios .ssw/.mtf y verificar que todos los datos se mapean correctamente
- Verificar que `ammoBins` y `slotIndices` se populan desde el parser
- Testear cadena de daño, explosión de munición, fin de turno

### 2. Completar Vehículos
- Implementar `VehicleSession` con daño, motive damage, crits fatales (CREW/ENGINE/AMMO)
- Adaptar ArmorDiagram para localizaciones de vehículo
- Adaptar CriticalMatrix para vehículos

### 3. TRO (Technical Readout)
- Cargar catálogos desde `assets/mechs/index.json` y `assets/vehicles/index.json`
- Tabla searchable con nombre, BV, tonelaje, era
- Click para cargar .ssw y ver ficha técnica
- Botón para enviar al simulador o battle tracker

### 4. Barracones
- Ficha de personaje RPG (MechWarrior)
- Sistema de XP y veteranía
- Carga/guardado desde Google Sheets
- Sub-tab de combate personal (calculador de tiradas)

### 5. HUD Táctico (Battle Tracker)
- Lista de unidades enemigas/aliadas con BV
- Tracking de daño rápido
- Resumen de batalla

### 6. Resto de secciones
- Comisión (landing page con datos de campaña)
- Reclutamiento (generador de personaje)
- Hoja de Servicio (registro de combate)
- Ayudas (tablas de referencia BattleTech)
- Crónicas (narrativa de campaña)

---

## Backend: Google Apps Script

URL por defecto: `https://script.google.com/macros/s/AKfycbyAAh-lYB1L72hTH72lpYDD0mcaAyeERLjJp1e0Ar0hhuZK8TszJdu-qmlN_cwi4sEncQ/exec`

Configurable vía localStorage: `GOOGLE_SCRIPT_URL_CUSTOM`

Servicio en `src/lib/sheets-service.ts` con:
- `sheetsGet(params)` — GET request
- `sheetsPost(body)` — POST request
- `loadConfig()`, `loadPlayer(name)`, `savePlayer(data)`, `loadUnitSheet(name)`

---

## Convenciones de Código

- **Componentes:** función exportada con nombre (`export function ComponentName`)
- **Hooks:** `use` prefix (`useSimulador`)
- **Tipos:** en archivos separados (`combat-types.ts`, `types.ts`)
- **Lógica pura:** en `combat-data.ts` (funciones sin side effects, testeables)
- **CSS:** Tailwind v4 utility classes. Colores del design system via `text-primary-container`, `bg-surface-container-low`, etc.
- **Palette-aware:** usar `var(--p)` para colores que cambian por sección
- **Import paths:** usar `@/` alias (configurado en vite y tsconfig)

---

## Referencia Adicional

- `DESIGN.md` — Design system visual exportado de Google Stitch
- El documento de mecánicas completas (Warthogs Fleet — Referencia Completa de Mecánicas) contiene TODAS las reglas BattleTech implementadas y por implementar

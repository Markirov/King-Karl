# COMBAT_IMPROVEMENTS_SPEC.md

Mejoras puntuales al simulador de combate de KKK.
**Premisa:** el motor de reglas (`src/lib/combat-data.ts`, 1177 líneas) es sólido y en varios casos mejor que Flechs Sheets. No se reescribe nada del motor. Lo que se mejora es **persistencia, undo, obligaciones encoladas, UX del paper doll y el agrupador de daños**.

---

## 1. Estado actual (qué se conserva intacto)

- `combat-data.ts` — cascada armadura→IS→destrucción→transfer, doble lógica de transferencia (normal vs explosión IS-first), tabla de heat completa, wound checks, ammo bins por familia con explosión correcta, Gauss weapon crit, sistemas (motor/giroscopio/sensores/SV/radiadores), actuators, vehículos completos con motive damage, infantería, BA. **No se toca.**
- `combat-types.ts` — modelo `MechState`/`MechSession`, `VehicleState`/`Session`, `InfantryState`/`Session`, `BAState`/`Session`, `DamageFlags`. **Se extiende, no se reescribe.**
- `useSimulador.ts` — orquestación de 6 mech / 5 veh / 4 inf / 4 BA slots, fire actions cruzadas. **Se extiende.**
- `CriticalMatrix.tsx`, `HeatMonitor.tsx`, `PilotPanel.tsx`, `VehiclePanel.tsx`, paneles inf/BA. **No se tocan.**

---

## 2. Mejoras

Seis cambios en orden de prioridad. Cada uno es una unidad de trabajo independiente.

| # | Mejora | Bug que arregla / valor | Esfuerzo |
|---|--------|-------------------------|----------|
| 1 | **Persistencia local + sync Fuerzas** | Refresco pierde combate (bug de ayer) | Medio |
| 2 | **Click fuera + ESC en selector daño** | Tener que pulsar X explícito | Trivial |
| 3 | **Paper doll legible estilo Flechs** | Difícil ver localizaciones de un vistazo | Medio |
| 4 | **Undo (5 estados en memoria)** | Errores de aplicación irreversibles | Bajo |
| 5 | **Pending obligations strip** | PSRs / consciousness checks se olvidan | Medio |
| 6 | **DamageGrouper → target** | Tool aislada, no conecta con simulador | Bajo |

---

## 3. Mejora 1 — Persistencia + sync con Fuerzas

### Problema

`useSimulador.ts` mantiene 4 arrays de slots en `useState`. Al refrescar el navegador, todo se pierde. El backend tiene `saveFuerzas`/`getFuerzas` listos, pero el cliente nunca los llama.

### Diseño

**Capa 1 — LocalStorage (anti-refresco):**

Clave `kk_simulador_session_v1` con el snapshot completo:

```ts
interface SimuladorSnapshot {
  schemaVersion: 1;
  updatedAt: string;            // ISO
  activeTab: 'mechs' | 'vehicles';
  currentMechIdx: number;
  currentVehicleIdx: number;
  activeInfantryIdx: number;
  activeBAIdx: number;
  mechSlots: MechSlot[];
  vehicleSlots: VehicleSlot[];
  infantrySlots: InfantrySlot[];
  baSlots: BASlot[];
}
```

Write strategy:

- Middleware en el hook que serializa a localStorage en cada cambio de cualquiera de los 4 arrays. Sin debounce — los cambios son discretos (click de jugador), no streams.
- Listener `beforeunload` opcional para flush final (probablemente innecesario con write-on-every-change).
- Lectura al montar `useSimulador`: si hay snapshot válido, hidrata el estado inicial. Si la `schemaVersion` no coincide, log y descarta.

**Capa 2 — Sync remoto con Fuerzas (backend existente):**

Reutilizamos el endpoint `saveFuerzas` / `getFuerzas` con el esquema actual `ID | Nombre | Fecha | BV | JSON`. El JSON guardado es el `SimuladorSnapshot` completo. Una fuerza = un pack del jugador.

Añadir a `sheets-service.ts`:

```ts
export const loadFuerzas = () =>
  sheetsGet({ action: 'getFuerzas' });

export const saveFuerza = (fuerza: { id?: string; nombre: string; bv: number; snapshot: SimuladorSnapshot }) =>
  sheetsPost({ action: 'saveFuerzas', ...fuerza });
```

Triggers de push (no se sincroniza en cada cambio, solo en momentos significativos):

- Botón **"Guardar fuerza"** (manual) → push inmediato.
- Botón **"Cerrar misión"** → push + clear de la session local.
- `beforeunload` → `navigator.sendBeacon` con el snapshot (best-effort).

**Triggers de pull:**

- Al entrar al simulador: si NO hay snapshot local, mostrar selector con `loadFuerzas`. Si hay snapshot local, hidratar de ahí (es más reciente que el remoto por definición — local-first).

### Flujo concreto

```
Entrar al simulador
  ├─ ¿Hay kk_simulador_session_v1? 
  │   ├─ SÍ → hidratar de localStorage, indicador ⚠ "cambios sin subir"
  │   └─ NO → mostrar selector de Fuerzas (loadFuerzas), elegir → pull → hidratar
  │
  └─ Durante el combate
      └─ Cada cambio → localStorage.setItem (instantáneo)
      
Cerrar misión / botón "Guardar fuerza"
  ├─ saveFuerza({ snapshot, id?, nombre, bv })
  ├─ OK → indicador ✓, localStorage queda como caché
  └─ KO → indicador ✕, mantener en localStorage, reintentar al abrir
```

### Indicador de sync

Pequeño icono en la esquina del simulador (formato visual ya definido en spec previo):

| Estado | Icono | Tooltip |
|--------|-------|---------|
| Sincronizado | ✓ verde | "Último sync: HH:MM" |
| Cambios sin subir | ⚠ ámbar | "Hay cambios locales sin guardar" |
| Subiendo | ⏳ azul | "Guardando…" |
| Error | ✕ rojo | "Último intento falló: {motivo}" |

Click → fuerza intento de push.

### Ficheros afectados

- `src/hooks/useSimulador.ts` — middleware de autosave, hidratación inicial.
- `src/lib/sheets-service.ts` — añadir `loadFuerzas`, `saveFuerza`.
- `src/pages/SimuladorPage.tsx` — selector de Fuerzas al entrar si no hay session local + indicador de sync.

---

## 4. Mejora 2 — Click fuera + ESC en selector de daño

### Problema

`ArmorDiagram.tsx` ya tiene overlay con `onClick={() => setSelectedSection(null)}` (línea 134) pero falta:
- Listener de `Escape`.
- El comportamiento exacto: cualquier click fuera del panel detalle cierra (ya hecho), ESC cierra (falta), botón X explícito conservado (ya hecho).

### Diseño

Crear hook reutilizable `useDismissable`:

```ts
// src/hooks/useDismissable.ts
import { useEffect, type RefObject } from 'react';

export function useDismissable(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose, ref]);
}
```

Aplicado en `ArmorDiagram.tsx`: añadir `ref` al div del panel detalle (línea 135), llamar `useDismissable(panelRef, !!selectedSection, () => setSelectedSection(null))`. El overlay de línea 134 se puede eliminar — el hook lo cubre.

### Ficheros afectados

- `src/hooks/useDismissable.ts` (nuevo)
- `src/components/simulador/ArmorDiagram.tsx`

Y se reutiliza después en cualquier modal/popover del simulador.

---

## 5. Mejora 3 — Paper doll legible estilo Flechs

### Problema (verbalizado por ti)

*"Ver qué hay en cada localización y poner daños era poco cómodo."*

Diagnóstico técnico:

- Las zonas se posicionan en absoluto con `top`/`left` en %, con dimensiones que dependen del contenido. Los labels multilínea (`BRAZO\nIZQUIERDO`) ensanchan las cajas.
- Puntos de 5×5px con gap 1px se ven densos y muy parecidos entre armadura (blanco) y estructura (rojo).
- Front y rear armor son cajas separadas en posiciones distintas — rompe la unidad visual del torso.
- El panel detalle de la derecha tapa la mitad del diagrama cuando se abre.
- No imita el formato de la hoja de récord BT que cualquier jugador reconoce a primera vista.

### Diseño objetivo (referencia: hoja de récord oficial BT + cómo lo hace Flechs)

**Layout en columnas estilo "ficha de récord":**

```
┌────────────────────────────────────────────────────────────────┐
│                          [HD]   ●●● / ▢▢▢                      │
│                                                                │
│  [LA] ●●●●●●●●●     [LT▶] ●●●●●●●●●●     [RA] ●●●●●●●●●        │
│       ●●●●●●        [LT◀]   ●●●●           ●●●●●●              │
│       ▢▢▢▢▢▢        [LT] ▢▢▢▢▢▢▢                ▢▢▢▢▢▢         │
│                                                                │
│                     [CT▶] ●●●●●●●●●●●●                         │
│                     [CT◀]    ●●●●●●                            │
│                     [CT] ▢▢▢▢▢▢▢▢▢▢▢▢                          │
│                                                                │
│                     [RT▶] (mismo patrón)                       │
│                     [RT◀]                                      │
│                     [RT]                                       │
│                                                                │
│  [LL] ●●●●●●●●●●●●                          [RL] ●●●●●●●●●●●● │
│       ▢▢▢▢▢▢▢▢                                   ▢▢▢▢▢▢▢▢      │
└────────────────────────────────────────────────────────────────┘
```

Convenciones:

- **Una "columna" por localización mayor** (LA / LT-completo / HD-CT-RT-stack / RT-completo / RA / LL / RL). Front y rear de un torso van pegados, no en cajas distintas.
- **Glifos diferenciados** en lugar de puntos cuadrados:
  - Armadura externa: **círculos rellenos / vacíos** (●/○)
  - Estructura interna: **rombos rellenos / vacíos** (◆/◇) — o cuadrados con borde grueso, fácilmente distinguibles de los círculos
  - Armadura trasera: **círculos pequeños** o con borde punteado, en una fila aparte etiquetada `▶/◀`
- **Conteo numérico siempre visible al lado** (`24/47`) para no tener que contar puntos.
- **Click en la localización entera** (no solo en la caja de puntos) abre el editor.
- **Editor inline lateral fijo a la derecha del diagrama**, no flotante encima, para no tapar la información.
- **Slider de daño/curación**: input numérico + botones `±1`, `±5`, `±10` para entrada rápida. El slider está bien pero los botones son más precisos.

### Aprovechamiento del blueprint

El `mech-blueprint.png` actual queda como background sutil (opacity 0.3-0.4) tras el grid de localizaciones. No es la fuente de verdad de las zonas, solo decoración.

### Decisión deliberada de diseño

**No imitar la hoja de récord pixel-a-pixel**, sí imitar su **legibilidad**: separación clara entre armadura/IS, conteo numérico siempre, glifos distintos, una localización = una unidad visual coherente.

### Ficheros afectados

- `src/components/simulador/ArmorDiagram.tsx` — rewrite. Mantener el contrato de props (mismas inputs/outputs); solo cambia el render interno.
- Mantener variantes biped / quad como están conceptualmente, pero el layout en columnas es el mismo (en quad, LA/RA son piernas delanteras pero la columna visual sirve igual).

### Salida esperada

Capacidad de ver de un vistazo:
- ¿Qué localizaciones están dañadas y cuánto?
- ¿Qué localizaciones están destruidas?
- ¿Cuánta armadura trasera queda en cada torso?

Sin tener que abrir paneles ni contar dots.

---

## 6. Mejora 4 — Undo simple (5 estados en memoria)

### Problema

Si el jugador aplica daño al mech equivocado o teclea mal una cifra, no hay vuelta atrás salvo recargar la página (y perder más cosas).

### Diseño

Stack circular de **5 snapshots** en memoria (no se persiste). El snapshot es el `SimuladorSnapshot` completo (los 4 arrays + `currentMechIdx` etc.).

```ts
// dentro de useSimulador
const [undoStack, setUndoStack] = useState<SimuladorSnapshot[]>([]);
const MAX_UNDO = 5;

function pushSnapshot(current: SimuladorSnapshot) {
  setUndoStack(prev => [...prev, current].slice(-MAX_UNDO));
}

function undo() {
  if (undoStack.length === 0) return;
  const last = undoStack[undoStack.length - 1];
  setUndoStack(prev => prev.slice(0, -1));
  // ...restaurar last en los 4 arrays + activeTab + currentXxxIdx
}
```

**Cuándo hacer push:** antes de cada operación destructiva — `handleDamage`, `applyDamageToSelected`, `vehicleApplyDamage`, `infantryApplyDamageAction`, `baApplyDamageAction`, `toggleCrit`, `mechNextTurn`, etc. No en cambios triviales (movimiento del slider antes de aplicar).

**UI:** botón "Deshacer" en el header del simulador o atajo `Ctrl+Z`. Cuando `undoStack.length === 0`, desactivado.

**Sin persistir:** si recargas, se pierde el undo. Es coherente con "5 estados en memoria" y mantiene la implementación trivial.

### Ficheros afectados

- `src/hooks/useSimulador.ts` — añadir stack y wrap de acciones destructivas.
- `src/pages/SimuladorPage.tsx` — botón de undo + listener de `Ctrl+Z`.

---

## 7. Mejora 5 — Pending obligations strip

### Problema

Las reglas TW imponen tiradas obligatorias tras ciertos eventos:

- **Piloting Skill Roll (PSR)** cuando un mech recibe 20+ daños en una fase (acumulado en `combat-data.ts` ya está, pero no se queda flotando).
- **Consciousness check** cuando el piloto recibe una wound (umbrales del `WOUND_CHECKS` que ya existen).
- **Shutdown check** cuando heat ≥ 14 (existe en `HEAT_EFFECTS`).
- **Ammo explosion check** cuando heat ≥ 19.

Hoy KKK calcula los umbrales pero no encola las obligaciones, así que se olvidan al pasar a otra acción.

### Diseño

Añadir un campo `pendingObligations` al `MechSession`, `VehicleSession`, `InfantrySession`, `BASession`:

```ts
// src/lib/combat-types.ts
export interface Obligation {
  id: string;                  // crypto.randomUUID
  type: 'psr' | 'consciousness' | 'shutdown' | 'ammo_explosion' | 'restart_reactor';
  triggerReason: string;       // "20+ daño en fase de armas" / "Wound #3"
  targetNumber: string;        // "5+" / "8+"
  createdAt: string;           // ISO
  resolved: boolean;
  result?: 'pass' | 'fail';
}

// Añadir a MechSession:
pendingObligations: Obligation[];
```

En `combat-data.ts`, dentro de `mechApplyDamage` y similares, cuando se cruce un threshold, hacer push de una obligación nueva (con dedupe por turno: no encolar dos PSRs del mismo tipo en la misma fase).

### UI — "obligation strip"

Banda fija en la parte superior del simulador (visible mientras haya obligaciones pendientes):

```
┌────────────────────────────────────────────────────────────┐
│ ⚠ PENDIENTE: PSR (5+) • Consciousness (3+) • Shutdown (4+)│
│              [Tirar] [Pasar] [Fallar]                      │
└────────────────────────────────────────────────────────────┘
```

Cada chip clicable abre un mini-popover con:
- Razón del trigger ("Recibió 22 daños en fase de armas").
- Target number.
- Botones: **Tirar** (random 2d6, registra resultado), **Pasar** (forzar éxito), **Fallar** (forzar fallo), **Descartar** (sin efecto, para corrección manual).

Al resolver, marcar `resolved: true` y aplicar el efecto (auto-fall si PSR falla, etc. — esto requiere extender `mechApplyDamage` para que sepa qué hacer con un PSR fallido, **pero ese trabajo puede quedar para una fase posterior**; en la versión 1 basta con registrar el resultado y dejar que el jugador aplique manualmente la consecuencia).

### Ficheros afectados

- `src/lib/combat-types.ts` — añadir `Obligation` y `pendingObligations` a las 4 sessions.
- `src/lib/combat-data.ts` — push de obligaciones en `mechApplyDamage`, `mechCalcHeatDelta`, etc.
- `src/components/simulador/ObligationStrip.tsx` (nuevo)
- `src/pages/SimuladorPage.tsx` — montar la strip arriba.

---

## 8. Mejora 6 — DamageGrouper → target

### Problema

`src/components/ayudas/DamageGrouperView.tsx` ya divide daño en grupos de 5 y tira localización 2d6 (tabla front-only de mech). Pero:

- Es una tool aislada en la pestaña "Ayudas".
- Solo tabla front, no side ni rear.
- Solo mechs.
- No conecta con el simulador (los grupos resueltos no se aplican a ninguna unidad).

### Diseño v1 (lo que entra en este spec)

Integrar el agrupador como botón dentro del flujo de daño del simulador, NO como vista aislada (aunque la vista en Ayudas puede mantenerse como calculator pura para uso fuera de combate).

En el panel de daño del `ArmorDiagram` (o como botón nuevo "Aplicar daño masivo"):

```
┌──────────────────────────────────┐
│ Daño total recibido: [___]       │
│ Dirección: [Front ▼]             │
│ [Agrupar y tirar]                │
└──────────────────────────────────┘
       ↓ (se genera la lista de grupos)
┌──────────────────────────────────┐
│ Grupo 1: 5 dmg → CT (2d6=7) [✓]  │
│ Grupo 2: 5 dmg → LA (2d6=10)[✓]  │
│ Grupo 3: 3 dmg → ¿?         [↻]  │ (re-roll)
│                                  │
│ [Aplicar todos] [Cancelar]       │
└──────────────────────────────────┘
```

- Cada grupo puede re-rollearse individualmente (`↻`).
- Cada grupo puede editarse manualmente (override de localización, p. ej. aimed shot o critical roll override).
- "Aplicar todos" ejecuta `mechApplyDamage` secuencialmente para cada grupo en el mech seleccionado, alimentando el log.

### Tablas a añadir

En `combat-data.ts`, junto a `MECH_LOCS_FRONT` (que ahora vive en `DamageGrouperView.tsx`):

```ts
export const MECH_HIT_LOCATIONS: Record<'front'|'left'|'right'|'rear', Record<number, string>> = {
  front: { 2:'CT', 3:'RA', 4:'RA', 5:'RL', 6:'RT', 7:'CT', 8:'LT', 9:'LL', 10:'LA', 11:'LA', 12:'HD' },
  left:  { 2:'LT', 3:'LL', 4:'LA', 5:'LA', 6:'LL', 7:'LT', 8:'CT', 9:'RT', 10:'RA', 11:'RL', 12:'HD' },
  right: { 2:'RT', 3:'RL', 4:'RA', 5:'RA', 6:'RL', 7:'RT', 8:'CT', 9:'LT', 10:'LA', 11:'LL', 12:'HD' },
  rear:  { 2:'CT', 3:'RA', 4:'RA', 5:'RL', 6:'RT', 7:'CT', 8:'LT', 9:'LL', 10:'LA', 11:'LA', 12:'HD' },
};
```

(Las direcciones front/rear coinciden en localización pero pintan en armadura trasera — eso lo maneja `mechApplyDamage` con el armorKey distinto.)

### Fuera de scope v1

- Tablas para vehículos / inf / BA (queda para v2).
- Cluster cluster bonus (LRMs grandes que tienen mejor cluster table).
- Aimed shot / called shot mechanics.

### Ficheros afectados

- `src/lib/combat-data.ts` — mover/extender `MECH_HIT_LOCATIONS`.
- `src/components/simulador/DamageGroupModal.tsx` (nuevo)
- `src/components/simulador/ArmorDiagram.tsx` — añadir botón "Aplicar daño masivo" que abre el modal.
- `src/components/ayudas/DamageGrouperView.tsx` — refactor para importar tabla desde `combat-data.ts` en lugar de tenerla hardcoded.

---

## 9. Plan de implementación por fases

Orden recomendado, una fase = una sesión de Claude Code.

### Fase 1 — Persistencia (Mejora 1) + Click fuera (Mejora 2)

Las dos urgencias. Mejora 2 es trivial y puede ir de regalo en la misma sesión.

- [ ] Tipo `SimuladorSnapshot`
- [ ] Middleware autosave en `useSimulador.ts`
- [ ] Hidratación inicial
- [ ] `loadFuerzas` / `saveFuerza` en `sheets-service.ts`
- [ ] Selector de Fuerzas en `SimuladorPage.tsx`
- [ ] Botones "Guardar fuerza" + "Cerrar misión"
- [ ] Indicador de sync
- [ ] Hook `useDismissable`
- [ ] Aplicar a `ArmorDiagram`

### Fase 2 — Paper doll rework (Mejora 3)

Sesión visual. Recomendable hacerlo desde Claude Design primero (mockup), luego implementar.

- [ ] Mockup en Claude Design (no requiere código)
- [ ] Rewrite de `ArmorDiagram.tsx`
- [ ] Variante quad
- [ ] Botones ±1, ±5, ±10

### Fase 3 — Undo (Mejora 4)

Sesión cortita.

- [ ] Stack en `useSimulador`
- [ ] Wrap de acciones destructivas
- [ ] Botón + atajo `Ctrl+Z`

### Fase 4 — Pending obligations (Mejora 5)

Sesión más larga porque toca el motor.

- [ ] `Obligation` type
- [ ] Push de obligaciones en `combat-data.ts`
- [ ] Componente `ObligationStrip`
- [ ] Tirada/pass/fail con efectos (los efectos automáticos pueden quedar parcialmente manuales en v1)

### Fase 5 — DamageGrouper integrado (Mejora 6)

- [ ] `MECH_HIT_LOCATIONS` en `combat-data.ts`
- [ ] Modal `DamageGroupModal`
- [ ] Botón en `ArmorDiagram`
- [ ] Refactor de `DamageGrouperView.tsx` para reutilizar la tabla

---

## 10. Lo que NO entra en este spec

Decisiones explícitas:

- **Damage groups multi-localización dentro del modelo de Unit/Session.** Hoy se aplica daño a una localización a la vez. La integración del agrupador (Mejora 6) lanza N `mechApplyDamage` secuenciales — eso resuelve el caso de uso real sin tocar el modelo. El refactor completo (`DamageGroup[]` como tipo de primera clase) queda para v2 si hace falta.
- **Savepoints / undo persistente entre refrescos.** El undo en memoria (Mejora 4) basta.
- **Auto-resolución de PSR fallidos** (auto-fall + daño físico + nueva PSR encadenada). En v1 el PSR registra resultado, el jugador aplica consecuencias manualmente.
- **Tablas hit location para vehículos / infantería / BA.** Queda para v2.
- **Aimed shots / called shots.** v2.
- **Networked combat.** No aplica (combate asíncrono por jugador).

---

## 11. Riesgos

### 11.1 Tamaño del JSON en Fuerzas

Un `SimuladorSnapshot` completo con 6 mechs + 5 vehículos + 4 inf + 4 BA llenos puede pesar ~40-80 KB serializado. Google Sheets soporta hasta 50 000 caracteres por celda. Margen sobrado, pero monitorizable.

### 11.2 Conflicto entre localStorage y Fuerzas remota

Si el jugador edita en dos sitios, gana el último que pulsa "Guardar fuerza" (last-write-wins, sin warning). Coherente con la decisión asíncrona ya tomada.

### 11.3 Pending obligations encoladas tras refresco

Como las obligaciones viven dentro del `MechSession`, si la session se persiste se persisten también. Bien. Si el jugador resolvió a medias y refrescó, las pendientes vuelven a aparecer — comportamiento correcto.

---

*Estimación total: 4-5 sesiones de Claude Code. Fase 1 sola ya resuelve el bug crítico del refresco.*

# Sheets · Backend · Cliente — Reorganización paso a paso

Informe vivo. Marca `[x]` al completar cada paso. Volver aquí entre sesiones.

Fecha inicio: 2026-06-01

---

## Estado actual

- Sheet auditada: `D:\DESCARGAS\Unidad ELH.xlsx` (snapshot)
- Backend: `mechwarrior-backend.gs` v2.3 (cliente OK, no desplegado al 100% en producción)
- Cliente: web React v2.2.1

---

## A. Bugs críticos

> Estos rompen funcionalidad real. Resolver primero.

### [x] A1. Headers de `Respuestas de formulario 1` no matchean backend

**Síntoma**: `registerMission` y `registerMissionFull` envían `xpMap: {Marcos: N}`. Backend busca header lowercase `marcos`. Header actual es `Experiencia Marcos` → `experiencia marcos` → no matchea → XP no se escribe.

**Igual con**:
- `Marca temporal` ≠ `fecha`
- `Dinero ganado en la misión` ≠ `dinero`
- `Gastos tras la misión` ≠ `gastos`
- `Tipo de Registro` ≠ `tipo`
- `Notas` ≠ `descripcion`

**Fix Sheets** (row 1 de "Respuestas de formulario 1"):

| Col | Header actual | Header nuevo |
|---|---|---|
| A | Marca temporal | **Fecha** |
| B | Experiencia Marcos | **Marcos** |
| C | Experiencia de Jaime | **Jaime** |
| D | Experiencia de Joan | **Joan** |
| E | Experiencia de Alex Palacios | **Alex** |
| F | Dinero ganado en la misión | **Dinero** |
| G | Gastos tras la misión | **Gastos** |
| H | Tipo de Registro | **Tipo** |
| I | Notas | **Descripcion** |

Backend hace lowercase exact match → mayúsculas no importan, espacios sí.

**Headers nuevos a añadir** (Hoja Servicio P3 granular, cols J en adelante):

```
missionId, fechaPropia, codUnidad, oficial, missionType, duration,
pago, salvamento, extrasHaber,
reparacion, municion, blindaje, extrasDebe,
totalHaber, totalDebe, balance,
bitacoraNote
```

**Per-pilot granular** (opcional, para chequeos/rerolls):

```
marcos_chequeos, jaime_chequeos, joan_chequeos,
marcos_rerolls,  jaime_rerolls,  joan_rerolls
```

**Verificación**: tras renombrar y desplegar backend v2.3, lanzar misión desde Hoja Servicio P3 → confirmar fila con todos los campos no vacíos.

---

### [x] A2. Col P de `Personajes` reasignada · `DATOS_RESUELTOS` muerto

**Síntoma**: backend lee col 15 (P) como JSON resuelto (`datos_resueltos`). Sheet actual: col P = Pilotaje (número TIR). Cliente recibe `parseInt → JSON.parse(15)` → falla silencioso → fallback a col K `datos_completos` raw → placeholders `###MECH###` no resueltos.

**Decisión**: en lugar de re-ordenar cols del sheet (rompe muchas fórmulas), **adaptamos backend al layout real**.

**Fix backend** (`mechwarrior-backend.gs`):

```js
const COL_PERSONAJES = {
  NOMBRE: 0, JUGADOR: 1, APODO: 2,
  STR: 3, DEX: 4, INT: 5, CHA: 6,
  ORIGEN: 7, AFILIACION: 8, ESTUDIOS: 9,
  DATOS_COMPLETOS: 10,
  XP_DISPONIBLE: 11, XP_TOTAL: 12, XP_NEGATIVO: 13,
  DISPARO: 14, PILOTAJE: 15,
  MECH: 16, SUELDO: 17, DINERO: 18,
  NOMBRE_DISPLAY: 19, ESTADO: 20, LANZA: 21
  // DATOS_RESUELTOS deprecado — cliente recibe DATOS_COMPLETOS crudo
};
```

`crearObjetoPersonaje`: leer SIEMPRE `K` (datos_completos), no fallback a P.

**Fix cliente** (opcional, para placeholders): en `useAppStore`/`barracones-data` resolver `###MECH###` lado cliente usando `roster[i].mech` cuando se renderiza.

**Limpieza sheet**: borrar fórmulas huérfanas `SUBSTITUTE` en `N12:N14` (filas vacías).

---

### [x] A3. Col T `Personajes` no es `nombre_display`  (Opción A — renombrado)

**Síntoma**: backend lee col 19 (T) como `nombre_display`. Header T actual = `nombre` (clon de A). Cliente recibe siempre nombre completo, feature de override visual portada Barracones muerta.

**Decisión rápida**:
- **Opción A**: renombrar header T → `nombre_display`. Valor por defecto = A. Permite override puntual escribiendo otra cosa.
- **Opción B**: borrar T entera del sheet + backend `NOMBRE_DISPLAY` → fallback a `NOMBRE`. Feature retirada.

Si quieres mantener feature → Opción A. Si nunca la usaste → B.

**Fix cliente**: ya tolera ambos casos (`nombreDisplay || nombre`).

---

## B. Limpieza · Bloat

> No urgente. Cuando A esté cerrado.

### [x] B1. `Configuracion` adelgazar (47 → 17 filas) — PILOTO_X borrados, fechas movidas a CAMPANA_*_INICIO, cols W-Y borradas

- [ ] Borrar 30 filas `PILOTO_X_*` (rangos 5-34). Backend ya ignora.
- [ ] Borrar fila `ULTIMA_ACTUALIZACION_SSW` (vacía).
- [ ] Borrar col C (números sueltos 2/8/2990, sin clave).
- [ ] Borrar cols W-Y (tabla compras mechs Modelo/Precio). Mover a nueva hoja `Compras_Mechs` si se usa.

Claves a mantener:
```
COMPANIA_NOMBRE, AÑO_CAMPANA, MES_CAMPANA, SISTEMA_ACTUAL, FACCION_ACTUAL,
CONTRATO_VALOR, VALOR_UNIDAD, TOTAL_MECHS,
PROMPT_INSTRUCCIONES, PROMPT_TONO,
PC_JUGADORES, USE_LEGACY_DESIGNS,
GITHUB_SYNC_JSON,
ORDEN_DIA, CRONICAS, PARTE_DIARIO (decidir si extraer a hojas propias)
```

### [x] B2. Cronicas duplicado (Opción B — hoja dedicada, 3 endpoints CRUD, cliente refactor, 3 entradas migradas)

- Hoja `Cronicas` (3 filas datos)
- Configuracion fila 45 `CRONICAS` (JSON array)

Cliente lee solo el JSON. La hoja es legacy.

**Decidir**:
- [ ] Migrar hoja `Cronicas` → JSON Configuracion (script o manual), borrar hoja
- [ ] **O** adoptar hoja como fuente, cliente lee de hoja, borrar clave de Config

### [x] B3. Catálogo mechs triplicado · borrar (parcial: borrados Mechs2 + Hoja 29, mantenido Listado de Mechs por named ranges)

Cliente usa `public/assets/mechs/index.json` del repo. Sheets:

- [ ] Borrar `Listado de Mechs` (5000 filas)
- [ ] Borrar `Listado de Mechs2` (3500 filas)
- [ ] Borrar `Hoja 29` (3334 filas, copia)

### [x] B4. Hojas numeradas / borrador (Hoja 23 + Hoja 28 borradas)

- [ ] `Hoja 23` (1 fórmula random, basura) → borrar
- [ ] `Hoja 28` (armas/escuadrones) → ¿renombrar `Armas_Escuadrones` o solapa con `Armas Infanteria`?

### [x] B5. Estado de hojas vacías (Fuerzas headers alineados v2.3)

- `Logros`: 0 datos. UI cliente OK, pendiente meter datos
- `Historial_Combates`: 0 datos. Endpoint `getHistorial` listo, sin UI cliente
- `Fuerzas`: 0 datos + header E desalineado (`Unidades (JSON)` vs `JSON` esperado backend v2.3) → **renombrar E `JSON`** y D `BV` (no `TotalBV`)

### [x] B6. `Personajes` cols W-AK vacías (borradas + filas 16-19 trimadas)

- [ ] Borrar cols W-AK (sin uso, ocupan en serialize)

---

## C. Sheets nuevas propuestas (extracción JSON Configuracion)

> Solo si quieres explotar datos (queries históricas, mejorar UI).

### [x] C1. `OrdenDia` (extraer de Configuracion.ORDEN_DIA) — hoja dedicada + 3 endpoints + cliente refactor + migración + bug dupe fixed (StrictMode dispatch en upgradeAttr/upgradeSkill)

Cols: `Fecha | Piloto | Tipo | XP_Coste | Descripcion`

Apps Script: nuevo `getOrdenDia` / `appendOrdenDia`. Cliente actualizar `useAppStore.ordenDia`.

### [x] C2. `ParteDiario` (extraer de Configuracion.PARTE_DIARIO) — hoja dedicada + 3 endpoints + cliente refactor + migración

Cols: `Fecha | Texto | Autor`

### [x] C3. `Compras_Mechs` (extraer de Configuracion W-Y) — descartado, calc muerta

Cols: `Modelo | Precio | Descuento | Precio_final`

---

## D. Orden de ejecución

1. [ ] A1 — Renombrar headers Respuestas
2. [ ] A2 — Patch backend `COL_PERSONAJES`
3. [ ] A3 — Decidir Opción A/B nombre_display
4. [ ] Deploy backend v2.3 con cambios A1+A2+A3 (Manage deployments → New version)
5. [ ] **Test smoke**: lanzar misión desde Hoja Servicio P3, registrar mejora desde Barracones, abrir Roster
6. [ ] B1-B6 limpieza (no afecta funcionalidad)
7. [ ] C1-C3 extracción JSON (opcional, fase futura)

---

## D-bis. Bugs adicionales detectados

### [x] Rerolls Hoja Servicio no se registran (FIXED)
- Causa: budget gate en `handleReroll` bloqueaba increment cuando `xpDisponible < cost` → click no-op → rerolls=0 → "Nada que registrar"
- Fix 1: drop budget gate. Rerolls fija al target sin condiciones. Si negativo, decisión del registrador
- Fix 2: `hasAnything` chequea explícito `p.rerolls > 0 || p.chequeos > 0` como red de seguridad

Síntoma: añadir rerolls a un piloto sin tocar XP ni Tesorería → `"Nada que registrar"`.

Causa probable: `hasAnything` check en `handleRegister` filtra por `xpGanado > 0 || calcSpent(p) > 0`. Si `calcSpent` no incluye rerolls en su suma, los rerolls aislados son invisibles para el check.

Verificar en `barracones-data.ts` (función `calcSpent`): debe sumar `p.rerolls * REROLL_CONFIG[p.nivel].cost`. Si no lo hace → fix.

### [x] ORDEN_DIA duplica entradas (FIXED — appendLog fuera del updater + dedupe en migración)

En `Configuracion.ORDEN_DIA` cada entrada aparece **dos veces con el mismo `ts`**. Cliente registra dos veces consecutivas por evento. Probable doble dispatch en `useBarracones` al subir attr/skill.

**Investigar**: `useBarracones.ts` → función que añade a `ORDEN_DIA`. Buscar `setOrdenDia` / `appendOrdenDia` o llamada a `saveConfigBatch({ ORDEN_DIA: ... })`.

**Limpieza de datos histórica** (opcional): dedupe por `ts` exacto.

---

## E. Notas de riesgo

- **Backup obligatorio** antes de borrar nada: `Archivo → Crear copia`
- Apps Script deploy → siempre **"New version"** en dropdown
- Migración headers Respuestas: no romper fórmulas Personajes (`SUMIF B:B`, `SUMIF C:C`, etc. son índice de col, no nombre — sobreviven al renombrar)
- Fórmulas `VLOOKUP(B*, Personajes!$B$2:$C$7, 2, 0)` en Configuracion: si borras filas Personajes, ojo al rango

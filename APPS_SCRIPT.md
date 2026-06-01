# Apps Script Backend — Referencia

Backend Google Apps Script para King Karl's Kürassiers. Conecta Google Sheets como BD.

## Setup

1. Abrir spreadsheet → Extensiones → Apps Script
2. Pegar `mechwarrior-backend.gs` (versión actual en este repo no commiteada; ver Apps Script editor)
3. **Deploy → New deployment** o **Manage deployments → Edit → "New version" → Deploy**
4. URL exec → cliente lo usa vía `sheets-service.ts` (constante `DEFAULT_SCRIPT_URL` o `localStorage.GOOGLE_SCRIPT_URL_CUSTOM`)

⚠️ **Crítico**: tras editar código, debe seleccionarse **"New version"** en dropdown al hacer Deploy. Sin esto, URL exec sigue sirviendo código antiguo.

⚠️ **Si "New version" no toma cambios**: a veces el deployment queda corrupto y "Edit deployment → New version" sigue sirviendo viejo. **Solución**: `Deploy → New deployment` (desplegar uno nuevo), copiar nueva URL exec, pegar en `localStorage.GOOGLE_SCRIPT_URL_CUSTOM` del cliente. Eliminar deployment viejo cuando confirme.

---

## Pestañas (sheets) usadas

| Sheet | Función | Columnas |
|---|---|---|
| `Personajes` | Roster + ficha pilotos | Ver tabla abajo |
| `Configuracion` | State campaña + UI | Clave / Valor |
| `Respuestas de formulario 1` | Registro XP + misiones | Headers dinámicos |
| `Logros` | Medallas | Headers dinámicos |
| `Fuerzas` | Lanzas guardadas (HUD) | ID, Nombre, Fecha, BV, JSON |
| `Historial_Combates` | Batallas pasadas | Headers dinámicos |
| `Unidad` | Lookup mech por piloto | B (nombre) / C (mech) |

---

## Personajes — layout

| Col | Idx | Campo | Notas |
|---|---|---|---|
| A | 0 | nombre | Nombre del personaje |
| B | 1 | Jugador | Handle único del jugador. Slug fotos |
| C | 2 | Apodo | Callsign |
| D-G | 3-6 | STR/DEX/INT/CHA | Atributos |
| H | 7 | origen | Facción origen |
| I | 8 | afiliacion | Rama militar |
| J | 9 | estudios | — |
| K | 10 | DATOS_COMPLETOS | JSON crudo (escritura). Puede tener placeholders `###X###` |
| L | 11 | xp_disponible | Fórmula |
| M | 12 | xp_total | Fórmula |
| P | 15 | DATOS_RESUELTOS | JSON resuelto (lectura). Fórmula que sustituye placeholders |
| Q | 16 | Mech | Fórmula `BUSCARV` Unidad |
| R | 17 | Sueldo | C-Bills |
| S | 18 | Dinero | Acumulado |
| T | 19 | nombre_display | Nombre para portada Barracones (override visual) |
| U | 20 | Estado | `activo` / `herido` / `hospitalizado` / `kia` / `mia` / `retirado` |
| V | 21 | Lanza | Nombre de lanza (`Primus`, `Secundus`, etc.) |

---

## Configuracion — claves

| Clave | Tipo | Uso |
|---|---|---|
| `AÑO_CAMPANA` | int | Año actual |
| `MES_CAMPANA` | int 1-12 | Mes actual |
| `SISTEMA_ACTUAL` | string | Sistema estelar |
| `FACCION_ACTUAL` | string | Empleador actual |
| `COMPANIA_NOMBRE` | string | Nombre unidad |
| `CONTRATO_VALOR` | number | Valor contrato (C-Bills) |
| `VALOR_UNIDAD` | number | Valor total unidad |
| `TOTAL_MECHS` | int | Conteo mechs |
| `PILOTO_X_NOMBRE`, `PILOTO_X_APODO`, `PILOTO_X_MECH` | legacy | DEPRECATED — usa Personajes |
| `PC_JUGADORES` | CSV | Handles PC separados por coma (filtra Hoja Servicio) |
| `USE_LEGACY_DESIGNS` | `0`/`1` | Toggle global UI Legacy vs Moderno |
| `ORDEN_DIA` | JSON array | Log Barracones (XP/skill/quirk) |
| `CRONICAS` | JSON array | Entradas Crónicas |
| `PARTE_DIARIO` | JSON array | Frases rápidas Parte del Día |
| `PROMPT_INSTRUCCIONES` | string | Hint AI (futuro Gemini) |
| `PROMPT_TONO` | string | Estilo narrativo |

`GITHUB_SYNC_JSON` puede vivir en celda J2 (no clave/valor).

---

## "Respuestas de formulario 1" — schema dinámico

**Row 1 = HEADERS** que Apps Script mapea a columnas. Convención mínima:

```
Fecha | Marcos | Jaime | Joan | [otros jugadores] | Dinero | Gastos | Tipo | Descripcion
```

Headers case-insensitive. Cualquier handle de jugador con header en row 1 puede recibir XP.

Apps Script `appendRegistroRow` busca cada header lowercase. Si añades col "Alex", piloto Alex puede recibir XP.

Para nueva expansión: añadir col con header = handle exacto del jugador.

### Headers granulares opcionales (Hoja de Servicio P3 — `registrarMision`)

Cliente (`registerMissionFull`) ahora envía TODOS los campos. Apps Script los guarda si existen headers; los ignora si no. Headers reconocidos:

| Header | Tipo | Campo cliente |
|---|---|---|
| `missionId`     | string | `meta.missionId` |
| `fechaPropia`   | string | `meta.fecha` (ej. "14 · IV · MMMXXVI") |
| `codUnidad`     | string | `meta.codUnidad` |
| `oficial`       | string | `meta.oficial` |
| `missionType`   | string | `missionType` |
| `duration`      | string | `duration` |
| `pago`          | number | HABER - Pago contrato |
| `salvamento`    | number | HABER - Salvamento |
| `extrasHaber`   | number | HABER - Extras |
| `reparacion`    | number | DEBE - Reparación |
| `municion`      | number | DEBE - Munición |
| `blindaje`      | number | DEBE - Blindaje |
| `extrasDebe`    | number | DEBE - Extras |
| `totalHaber`    | number | Σ HABER |
| `totalDebe`     | number | Σ DEBE |
| `balance`       | number | totalHaber - totalDebe |
| `bitacoraNote`  | string | "X y Y siguen al frente..." |
| `<handle>_chequeos` | number | Chequeos por piloto (e.g. `marcos_chequeos`) |
| `<handle>_rerolls`  | number | Re-rolls por piloto |

**Compat**: `dineroGanado` y `gastos` siguen enviándose con totales agregados (los headers existentes `Dinero` / `Gastos` mantienen comportamiento legacy).

**Per-pilot maps**: `chequeosMap` y `rerollsMap` se envían como JSON (formato igual que `xpMap`). El backend debe extender `appendRegistroRow` para buscar headers tipo `marcos_chequeos`, `jaime_rerolls` si quieres granularidad por piloto. Si no se extiende, los JSON se ignoran sin error.

---

## Logros — schema dinámico

```
Logro | Descripcion | Icono | Marcos | Jaime | Joan | [otros jugadores]
```

Cols 0-2 fijas, cols 3+ son jugadores. Cualquier valor truthy (no vacío, no 0) en celda = piloto tiene logro.

Apps Script `handleGetLogros` devuelve `jugadores: ["Marcos", "Jaime", ...]` (headers cols 3+) y `logros[].jugadores: {handle: valor}`.

---

## Endpoints HTTP

Base URL: `https://script.google.com/macros/s/{SCRIPT_ID}/exec`

### GET endpoints

| `action` param | Función | Retorna |
|---|---|---|
| `getRoster` | Lista pilotos completa | `{roster: RosterEntry[]}` |
| `getConfiguracion` | Toda la config | `{config: {clave: valor}}` |
| `getLogros` | Logros + medallas | `{logros: Logro[], jugadores: string[]}` |
| `getHistorial` | Batallas pasadas | `{historial: Entry[]}` |
| `getFuerzas` | Lanzas guardadas | `{fuerzas: Fuerza[]}` |
| `getMechPorJugador&jugador=Marcos` | Mech del piloto | `{mech, fuente}` |
| `saveConfiguracion&clave=X&valor=Y` | Set una clave | `{msg}` |
| `saveConfiguracionBatch&config={JSON}` | Set varias claves | `{msg}` |
| `registrarMision` (params en body) | Registro misión + XP | `{msg}` |
| `registrarGastoXP&jugador=X&cantidad=N` | Gasto XP | `{msg}` |
| `registrarMejora` (params) | Upgrade skill/attr | `{msg}` |
| (sin action) `jugador=X` | Búsqueda personaje | `{personajes: [...]}` |

### POST endpoint
Body JSON. Acciones:
- `saveFuerzas` — overwrite Fuerzas sheet
- `registrarGastoXP` — alternativa al GET
- Default: guardar piloto (requiere `nombre` + `jugador`)

### registrarMision params

```
action=registrarMision
xpMap={"Marcos":100,"Jaime":50,"Joan":75}     # JSON, dinámico
dineroGanado=120000
gastos=30000
descripcion="..."
combatPersonaje (opcional)
combatDanos / combatMunicion (opcional)
```

Compat legacy: si `xpMap` falta, acepta `xpMarcos`, `xpJaime`, `xpJoan`, `xpJuan` individuales.

---

## Forms HTTP details

- `GET`: params URL-encoded
- `POST`: `Content-Type: text/plain` (evita CORS preflight), body JSON
- Respuesta siempre JSON `{result: 'success'|'error', ...}`

---

## Mantenimiento

### Añadir nuevo jugador al sistema

1. **Personajes sheet**: añadir fila con nombre/jugador/apodo/atributos
2. **"Respuestas de formulario 1"**: añadir col con header = handle del jugador (para XP)
3. **Logros sheet**: añadir col con header = handle (opcional, solo si va a recibir logros)
4. **`PC_JUGADORES`** en Configuracion: añadir handle al CSV si es PC
5. Foto: subir `public/pilot-{slug}.png` a repo, o queda fallback `pilot-generic.png`
6. Cliente: refresh → roster recarga, piloto aparece automático

Sin tocar código de Apps Script ni cliente. Todo dinámico.

### Retirar piloto

- Personajes col U Estado → `retirado` / `kia` / `mia`
- Roster sigue mostrando piloto (Barracones lo ve), pero excluido de Hoja de Servicio

### Renombrar campaña / unidad

- Configuracion claves: `COMPANIA_NOMBRE`, `AÑO_CAMPANA`, etc.
- Aplica en próximo load del cliente

---

## Troubleshooting

**"Falta parámetro: jugador"** sin action: ruta default cae a búsqueda personaje. Pasar `?action=getRoster` o similar.

**Endpoint sirve código viejo**: Deploy → Manage → ✏️ Edit → dropdown "Version" → "New version" → Deploy.

**`getRoster` devuelve array vacío**: pestaña `Personajes` no existe o fila 0 sin headers.

**Apodo se borra al guardar piloto**: Apps Script `actualizarFila` preserva col C automático si payload no trae `apodo` non-empty.

**Logros sin pilotos**: revisa headers row 1 (cols 3+) coinciden con handles. Case-insensitive pero exacto en spelling.

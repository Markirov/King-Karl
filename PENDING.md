# Pendientes Activos

Última actualización: 2026-06-02

---

## MTF → SSW conversión

Status: parked. MTF files se aceptan as-is en `import-units.cjs`, pero index extrae solo nombre (BV2 = 0).

Para conversión real:

- Opción A: GUI manual SSW (File → Open MTF → Save As SSW). Funcional, tedioso para lote.
- Opción B: implementar parser+BV calculator en Node (~500 líneas). Heavy.
- Opción C: investigar herramientas community (MegaMek CLI, etc.) — TODO

Cuando se necesite BV2 exacto para un MTF: convertir vía SSW GUI manualmente, importar SSW resultante.

---

## Launcher Desktop App (Tauri) — Fase 2

Fase 1 completada (commit `565efec`). 18 botones distribuidos en 6 grupos. Backend Rust con `stream_shell`, `get_git_status`, `check_port`, `open_url`, config persistence. Frontend Stitch theme amber.

Fase 2 pendiente:

- Kill process desde UI (matar dev server arrancado, etc.)
- Build portable .exe real (`npm run tauri build` produce `target/release/launcher-app.exe` ~10-30 MB self-contained)
- Iconos custom (defaults Tauri rojo poco profesional)
- Rename productName final `launcher-app.exe` → `KingKarlLauncher.exe`
- Botones Fase 2: Build, Clean Build, Backup Snapshot
- Botones Fase 3: C3 Calc embebida, Roster Mgr, Config Editor, Asset Health, Logs Viewer

Notas título bar rojo (Windows accent color): fix opcional con `decorations: false` + custom drag region.

---

## Combat Improvements Spec — Fase 2-5

Fase 1 completada (commit `61ee16c`). Persistencia local + sync Fuerzas + click fuera/ESC en ArmorDiagram.

Pendiente del `COMBAT_IMPROVEMENTS_SPEC.md`:

- **Fase 2 — Paper doll rework** (Mejora 3): rewrite `ArmorDiagram.tsx` con layout columnas estilo hoja récord BT, glifos diferenciados armadura/IS, conteo numérico siempre visible, editor lateral fijo, botones rápidos ±1/±5/±10. Mantener contrato props. Variantes biped+quad.
- **Fase 3 — Undo simple** (Mejora 4): stack 5 snapshots memoria, atajo Ctrl+Z, wrap acciones destructivas (handleDamage, applyDamageToSelected, vehicleApplyDamage, toggleCrit, mechNextTurn).
- **Fase 4 — Pending obligations strip** (Mejora 5): tipo `Obligation` en sessions, push automático en `combat-data.ts` cuando se crucen thresholds (PSR 20+ dmg, Consciousness check tras wound, Shutdown ≥14 heat, Ammo explosion ≥19 heat). Componente `ObligationStrip` arriba del simulador con resolución manual o aleatoria 2d6.
- **Fase 5 — DamageGrouper → target** (Mejora 6): integrar `DamageGrouperView` en flujo de daño del simulador. Modal `DamageGroupModal`. Mover `MECH_HIT_LOCATIONS` (4 direcciones front/left/right/rear) a `combat-data.ts`.

---

## Sheets backend — Refactors pendientes

Mayoría completada (`SHEETS_REORG.md`). Pendientes menores:

- Mover backend Apps Script source al repo (`scripts/apps-script/mechwarrior-backend.gs`). Ahora vive solo en editor Google. Riesgo: perder cambios entre versiones.
- Documentar URL deployment v2.5 (la última usada). Múltiples deployments huérfanos podrían existir.

---

## Páginas placeholder (fase futura)

- `ReclutamientoPage` — generador de personaje
- `TROPage` — Technical Readout searchable

---

## Features backend OK sin UI cliente

- **Historial Combates** (`getHistorial` endpoint listo) — sin UI viewer
- **Vehículos VehicleSession** — combate completo en motor, slot disponible, panel y crítico OK. Falta: testing exhaustivo + casos límite vehículos VTOL/Naval
- **AI Crónicas Gemini** — `PROMPT_INSTRUCCIONES` + `PROMPT_TONO` definidos en Configuracion. Sin integración API. Pensado para generar/asistir entradas crónica via Gemini.

---

#### Integración con Telegram

Status: pendiente. Sin detalles definidos aún.

Ideas iniciales (a confirmar):

- Bot Telegram recibe notificaciones eventos web (misión registrada, alta personal, alerta tesorería negativa)
- Comandos rápidos `/roster`, `/tesoreria`, `/cronica X` desde móvil
- Webhook bidireccional: web → bot → grupo jugadores; grupo → bot → Sheets (parte del día por chat)
- Auth: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` en Configuracion
- Stack: Apps Script via `UrlFetchApp.fetch` directo a Telegram Bot API (sin server intermedio)

Definir:

- ¿Solo notificaciones salientes o bidireccional?
- ¿Grupo único o broadcast a varios?
- ¿Qué eventos disparan mensaje?
- ¿Texto solo o media (fotos pilotos / mechs)?CLAUDE.md desactualizado

Refleja estado pre-reskin. Actualizar con:

- Hoja Servicio P3 Two-Tone (vs Legacy)
- Barracones P2 Medallón (vs Legacy)
- USE_LEGACY_DESIGNS toggle
- Roster dinámico desde Personajes sheet
- Lanzas PRIMUS/SECUNDUS/TERTIUS pagination
- Crónicas + Parte Diario (hoja dedicada v2.4/v2.5)
- C3 Calculator
- Logros (UI + dynamic endpoint)
- FuerzaSyncBar simulador
- Launcher Tauri app

---

## Canon Repair Rules — RESUELTO (2026-06-07)

Reglas canon documentadas en `INFORME_DISCREPANCIAS_CANON.md`.
Fuente real: **Campaign Operations** 3rd Print p.205-212 (NO StratOps;
ese capítulo se movió a CamOps en imprentas modernas).

Implementado:
- `repair-engine.ts`: `calcRepairCostCanon()` + `calcRepairCostBySystem()`
  + tipo `RepairSystem = 'propio' | 'canon'`
- `FinanzasPage.tsx` TallerModal: toggle 2 botones PROPIO/CANON, default propio
- Concepto libro mayor etiqueta `[CamOps]` o `[propio · 100%]`

Pendiente menor (no urgente):
- Modelar **tiempo reparación** (minutos × Tech Team rating) → display informativo
- Modelar **tirada Tech Team** con TN modificadores quality/tech rating
- Modelar **partial repairs** (fail por poco margen)
- Modelar **acquisition checks** (CamOps p.196) para piezas en mercado

---

## Tema sugerido por usuario para próxima sesión

- **Mercenarios** (a discutir, sin definir todavía)

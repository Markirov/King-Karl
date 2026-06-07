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

#### Integración con Telegram — preparado, falta deploy backend

Status: cliente listo, falta setup manual del bot + deploy Apps Script.

Decisiones tomadas (16 preguntas, ver TELEGRAM_SPEC.md):
- Bidireccional (out + in)
- Apps Script directo
- Token+config en sheet Configuracion
- 1 grupo único
- Eventos out: misión cerrada · compras/taller · crónicas
- Comandos in: /roster, /tesoreria, /cronica, /parte, /help
- Admin-only: /backup, /anuncio, /resetcampana
- Templates hardcoded
- Umbral tesorería: 100k ₡

Implementado en código:
- `src/lib/telegram-service.ts` — wrapper cliente, toggle persistence
- `src/components/ui/TelegramToggle.tsx` — checkbox reusable
- `scripts/apps-script/telegram.gs` — backend completo (pegar en editor)
- Hooks UI: TallerModal, AcquisitionModal, MaintenanceModal,
  HojaServicioPage, CronicasPage

Pendiente setup MANUAL (usuario):
1. Crear bot @BotFather, copiar token
2. Añadir bot al grupo + dar permisos admin
3. Obtener CHAT_ID (getUpdates) y tu USER_ID (@userinfobot)
4. Rellenar Configuracion: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
   TELEGRAM_ADMIN_ID, TELEGRAM_ENABLED=1, TELEGRAM_UMBRAL=100000,
   PJ_TG_CASTIGADOR, PJ_TG_BOLA_DEMOLICION, PJ_TG_VISTA_PALOMA
5. Pegar `scripts/apps-script/telegram.gs` en editor Apps Script
6. Integrar `doPost_telegram` con doPost existente (case-merge)
7. Deploy → New deployment → Web app, anonymous
8. Ejecutar `tgSetWebhook()` desde editor una vez
9. Probar /roster, /tesoreria, etc

Pendiente extras (no urgente):
- ParteDiario: hook toggle al guardar parte (similar a crónica)
- Más comandos: /historia, /pj <nombre>, /mech <nombre>
- Inline keyboards para confirmar acciones destructivas
- Templates de imagen (banner unidad, foto mech) en notif misión

---

## Comisión — reorganizar + responsive tablet 10" (luego móvil)

Target prioritario: **tablet 10" (1280×800 landscape, 800×1280 portrait)**.
Móvil (375-414px) en fase posterior.

**Estado actual (roto en tablet):**
- Layout `gridTemplateColumns: '1fr 380px'` fijo → no cabe en <1100px
- Hero 300px alto fijo + banner art `width: 340` absolute negativo
- KPI bronce `gridTemplateColumns: 'repeat(3, auto)'` → desborda
- `overflow: hidden` en root → contenido cortado, no se ve
- Sidebar `lg:ml-[220px]` solo aplica >1024px → posibles solapes
- Cero media queries — desktop-first sin fallbacks

**Plan reorg:**
- Media query `<1100px`: layout 1 columna (panel derecho debajo)
- Hero: alto auto en lugar de 300px fijo
- Banner art: oculto en <900px o reducido
- KPI bronce: `repeat(auto-fit, minmax(140px, 1fr))` para wrap
- Root `overflow: auto` con `min-height: 100%`
- Padding y font sizes responsive (clamp())
- Considerar tabs/acordeón si vertical scroll demasiado largo

Archivos a tocar: `src/pages/ComisionPage.tsx` solamente.

---

## Recuperación de Mechs (salvage post-combate)

Pendiente: sistema para registrar mechs recuperados después de misión.

**Concepto:**
- Tras misión, jugador puede "recuperar" un mech enemigo derribado
- Registro: chassis, model, estado (operativo/dañado/destruido),
  valor BV, % daño aproximado
- Resultado contable: ingreso a Libro Mayor (valor venta) o asset
  (añadir a roster/inventario, valor unidad ↑)
- Categoría LibroMayor `venta_mech` o nueva `recuperacion_mech`

**Flujo sugerido:**
- Modal `RecoveryModal` en Finanzas / Libro Mayor
- Selector tipo: vender salvage (ingreso ₡) / añadir al hangar (asset)
- Si vende: precio = BV × tabla salvage CamOps (50% si dañado, 30% destruido)
- Si añade al hangar: actualizar `VALOR_UNIDAD` y opcionalmente `TOTAL_MECHS`

**Integración tesorería:**
- Ya implementado `commitLibroEntryAndTreasury` que suma/resta CONTRATO_VALOR
  en Sheets al guardar/borrar entradas
- Mech recovery debería usar este wrapper

Archivos a tocar: nuevo `RecoveryModal`, posible nueva categoria en
`LibroMayorCategoria`, FinanzasPage portada con botón 🪖 RECUPERACIÓN.

---

## Reparaciones localizadas / Field Repair

Pendiente: tipos de reparación específicos por situación, no factura total.

**Ejemplo: Reparación de campo (mitad de campaña)**
- Tirada 1d6 → repara solo UNA localización (ej. brazo)
- Coste 0 ₡
- Se hace en el simulador sin pasar por Libro Mayor
- Restaura armor/IS/crits SOLO en la localización elegida/tirada

**Otros tipos posibles** (a definir):
- Reparación parcial por componente (ej. solo cabina)
- Reparación de munición sólo (rearm sin tocar armor)
- Reparación de cabin/sensors sin tocar limbs
- Triaje rápido entre escenarios (parcial, 1d6 hits restaurados)

**Implementación sugerida:**
- Modal `FieldRepairModal` en simulador (no en finanzas)
- Selector tipo: campo / triaje / rearm / parcial
- UI: lista localizaciones, checkbox "reparar esta"
- Aplica a MechSession sin cobrar al Libro Mayor
- Log en CombatLog del simulador

Archivos a tocar: nuevo `src/components/simulador/FieldRepairModal.tsx`,
hook `useSimulador.ts` para exponer función de reparación localizada.

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


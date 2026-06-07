# TELEGRAM_SPEC.md — Integración Bot Telegram

Última actualización: 2026-06-07

---

## Decisiones (16 respuestas usuario)

| Tema | Decisión |
|------|----------|
| Dirección | **Bidireccional** (out + in) |
| Stack | **Apps Script directo** (UrlFetchApp → Telegram Bot API) |
| Auth storage | **Sheet Configuracion** (TELEGRAM_*) |
| Destinatarios | **1 grupo único** (TELEGRAM_CHAT_ID) |
| Eventos out | Misión registrada · Compras/Taller · Crónicas/Parte (sin tesorería) |
| Comandos in | `/roster` · `/tesoreria` · `/cronica` · `/parte` |
| Media | Texto + imágenes + botones inline |
| Mapeo PJ↔TG | Tabla en Configuracion `PJ_TG_<NOMBRE> = <user_id>` |
| Filtro entrante | Admin + PJs autorizados |
| Log mensajes | No |
| Fallo envío | Drop silencioso (console.warn) |
| Rate limit | Confiar Telegram (30 msg/seg) |
| Confirmación | Toggle por evento UI |
| Entorno test | Mismo bot mismo grupo |
| Plantillas | Hardcoded en Apps Script |
| Umbral tesorería | >100k ₡ |

---

## Arquitectura

```
┌────────────────┐        ┌──────────────────┐         ┌──────────────┐
│ Web (React)    │        │ Apps Script (GS) │         │ Telegram API │
│                │        │                  │         │              │
│ Toggle UI ─────│──POST──│ action:'tgSend'  │──fetch─→│ sendMessage  │
│ "Notificar TG" │        │ + payload        │         │              │
└────────────────┘        └──────────────────┘         └──────────────┘
                                   ▲
                                   │ Webhook POST
                                   │ (Telegram → /exec?action=tgUpdate)
                          ┌──────────────────┐
                          │ Telegram chat    │
                          │ User /roster     │
                          └──────────────────┘
```

### Flujo saliente

1. UI muestra checkbox `📢 Notificar al grupo Telegram`
2. Si marcado en commit → cliente llama `sheets-service.sendTelegramNotif(event, data)`
3. Apps Script doPost recibe `action:'tgSend'`, lookup template, formatea, llama Bot API
4. Si fallo → console.warn, no rompe flujo principal

### Flujo entrante

1. Telegram envía update HTTPS POST a Webhook URL (= Apps Script /exec)
2. Apps Script doPost detecta `update_id` o `message` → enruta a handler comando
3. Handler valida user_id contra admin/PJs autorizados
4. Si autorizado → consulta sheets, formatea respuesta, llama Bot API
5. Si no autorizado → responde "🚫 No autorizado"

---

## Configuracion sheet — celdas requeridas

```
TELEGRAM_BOT_TOKEN     | 1234567890:AAExxxx...           | Token bot @KKKBot
TELEGRAM_CHAT_ID       | -1001234567890                  | Grupo destino (negativo = supergrupo)
TELEGRAM_ADMIN_ID      | 123456789                       | Tu user_id (comandos privilegiados)
TELEGRAM_ENABLED       | 1                                | 0 desactiva todo
TELEGRAM_UMBRAL        | 100000                           | Umbral ₡ tesorería
PJ_TG_CASTIGADOR       | 234567890                        | Mapeo PJ → user_id
PJ_TG_BOLA_DEMOLICION  | 345678901                        |
PJ_TG_VISTA_PALOMA     | 456789012                        |
```

---

## Apps Script — código

Ver `scripts/apps-script/telegram.gs` (committed).

Endpoints añadidos:
- `doPost({action:'tgSend', event:'mision', data:{...}})` → envía notif
- `doPost(telegram_update)` → procesa webhook entrante (detecta por `update_id`)

Funciones helpers:
- `tgFetchAPI(method, payload)` — UrlFetchApp wrapper
- `tgSendMessage(chatId, text, opts)` — envío texto
- `tgSendPhoto(chatId, photoUrl, caption)` — envío imagen
- `tgInlineKb(buttons)` — construye reply_markup
- `tgIsAuthorized(userId)` — check admin/PJ
- `tgPJNameFromUserId(userId)` — reverse lookup

---

## Templates eventos salientes

### `mision_cerrada`
```
🛡️ MISIÓN CERRADA · {fecha}
Tipo: {missionType}
Balance: {balance} ₡ {emoji_balance}
Destacado: {pjTopXP} (+{xp} XP)

[Ver Hoja de Servicio]
```

### `libro_mayor_relevante` (>10k ₡ Taller/Compras)
```
💰 {tipo emoji} {concepto}
Cantidad: {cantidad} ₡
Categoría: {categoria}
Saldo actual: {tesoreria} ₡
```

### `tesoreria_grande` (>100k ₡)
```
⚠️ MOVIMIENTO GRANDE
{concepto}
{tipo emoji} {cantidad} ₡
Saldo: {tesoreria} ₡
```

### `cronica_nueva`
```
📖 NUEVA CRÓNICA · {fechaCampaign}
{titulo}
— por {autorNombre}

{cuerpo[:200]}...

[Leer completo]
```

### `parte_nuevo`
```
📋 PARTE DEL DÍA · {fechaCampaign}
{autorNombre}: {resumen[:150]}
```

---

## Comandos entrantes

### `/roster`
Disponible: admin + PJs.
Output:
```
🪖 ROSTER · {fecha campaña}
• Castigador (Cpt) — Atlas AS7-D · HP 6/6 · XP 142
• Bola de Demolición (Sgt) — Marauder MAD-3R · HP 4/6 (-2 brazo) · XP 98
• Vista Paloma (Lt) — Phoenix Hawk · HP 6/6 · XP 86
```

### `/tesoreria`
Disponible: admin + PJs.
Output:
```
💰 TESORERÍA
Saldo: 2.345.678 ₡

Últimos 5 movimientos:
- 12/Jun -45.000 Munición LRM-20
- 11/Jun -120.000 Reparación Atlas
- 10/Jun +500.000 Contrato Hesperus
...
```

### `/cronica`
Disponible: admin + PJs.
Output: últimas 3 crónicas resumidas + botón "Leer más" link a web.

### `/parte <texto>`
Disponible: PJs autorizados.
Acción: guarda parte diario en sheet ParteDiario con autor = PJ_TG mapping.
Output: confirmación.

### `/help`
Lista comandos disponibles según permisos del user.

### Admin-only (admin_id):
- `/backup` — fuerza snapshot Fuerzas
- `/resetcampana` — confirma reset (con doble check)
- `/anuncio <texto>` — envía mensaje al grupo desde el bot (broadcast)

---

## Setup paso a paso

1. **Crear bot**: hablar a @BotFather, `/newbot`, copiar token
2. **Añadir bot al grupo** + dar permisos admin (lectura mensajes)
3. **Obtener CHAT_ID**: enviar `/start` al bot, fetch `https://api.telegram.org/bot<TOKEN>/getUpdates`, copiar `chat.id`
4. **Obtener tu USER_ID**: hablar a @userinfobot
5. **Rellenar Configuracion**: token, chat_id, admin_id, mapping PJs
6. **Pegar `telegram.gs`** en editor Apps Script
7. **Configurar webhook**: una vez, ejecutar función `tgSetWebhook()` desde editor → Telegram apuntará a tu /exec URL
8. **Desplegar**: New Deployment como Web app, anonymous access
9. **Probar**: enviar `/roster` al grupo → debe responder

---

## Toggle UI

Ubicaciones del checkbox `📢 Notificar Telegram`:
- **HojaServicioPage** botón "REGISTRAR MISIÓN" → checkbox arriba
- **FinanzasPage TallerModal** botón "CARGAR AL LIBRO MAYOR" → checkbox
- **FinanzasPage AcquisitionModal** botón final → checkbox
- **CronicasPage** "GUARDAR CRÓNICA" → checkbox
- **ParteDiario** "GUARDAR PARTE" → checkbox

Default: marcado si `TELEGRAM_ENABLED = 1`. Persiste última elección por modal en localStorage.

---

## Cliente — `src/lib/telegram-service.ts`

Wrapper minimal que invoca Apps Script `action:'tgSend'`:

```typescript
sendTelegramNotif(
  event: TelegramEvent,
  data: Record<string, any>,
): Promise<{success: boolean; error?: string}>
```

Eventos tipados:
- `'mision_cerrada'`
- `'libro_mayor_relevante'`
- `'tesoreria_grande'`
- `'cronica_nueva'`
- `'parte_nuevo'`

Drop silencioso si falla (no throw).
Skip si TELEGRAM_ENABLED=0.

---

## Seguridad

- Token Telegram: secret, solo en Configuracion sheet (acceso limitado)
- Webhook URL: pública pero Apps Script valida `update_id` y user_id
- No persistir tokens en localStorage / código repo
- Admin user_id valida comandos peligrosos (/backup, /resetcampana)
- PJs autorizados (PJ_TG_*) pueden ejecutar /parte (escritura)
- Resto de chat puede usar comandos read-only si así se decide (toggle TG_PUBLIC_COMMANDS)

---

## Limitaciones conocidas

- Apps Script tarda 1-3s en responder webhook → Telegram puede reintentar
- Solución: responder OK inmediato + procesar async via trigger
- Quota Apps Script: 6 min/ejecución, 20MB respuesta. Suficiente para uso campaña

---

## Estado implementación

- [x] Spec definida
- [x] Configuracion sheet schema
- [x] Cliente service wrapper
- [x] Apps Script source committed
- [x] UI toggle utility
- [ ] Setup bot @BotFather (manual, usuario)
- [ ] Rellenar celdas Configuracion (manual, usuario)
- [ ] Deploy Apps Script (manual, usuario)
- [ ] tgSetWebhook() ejecutar (manual, usuario)
- [ ] Pruebas live

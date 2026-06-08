# TELEGRAM_SETUP_GUIDE.md — Pasos detallados

---

## 1. Sacar CHAT_ID del grupo

Tienes tu USER_ID. Necesitas el CHAT_ID del grupo. Hay 3 vías. La 1 es la más rápida.

### Vía rápida — `getUpdates` desde navegador

**Requisito previo:** el bot ya tiene que estar AÑADIDO al grupo.

1. Abre Telegram desde móvil/desktop.
2. Entra al grupo donde quieres que el bot trabaje.
3. Añade el bot al grupo:
   - Info del grupo → Añadir miembro → busca `@TuBotName` → añadir
4. Da permisos admin al bot (importante para webhook leer mensajes):
   - Info del grupo → admins → añade el bot → permisos mínimos: read messages
5. En el grupo, envía un mensaje cualquiera. Ej: `hola bot`.
6. En el navegador abre esta URL (sustituye TOKEN por el tuyo):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   Ejemplo real:
   ```
   https://api.telegram.org/bot1234567890:AAExxxxxxxxxxxxxxxxxx/getUpdates
   ```
7. Verás JSON con esta forma:
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 42,
           "from": { "id": 99999, "first_name": "Tu" },
           "chat": {
             "id": -1001234567890,         <-- ESTE ES TU CHAT_ID
             "title": "King Karl's Kürassiers",
             "type": "supergroup"
           },
           "date": 1717800000,
           "text": "hola bot"
         }
       }
     ]
   }
   ```
8. El número de `chat.id` es el CHAT_ID.
   - Si es **grupo normal**: número negativo tipo `-987654321`
   - Si es **supergrupo**: empieza con `-100` y tiene 13 dígitos, ej `-1001234567890`
9. Cópialo entero **con el signo menos**.

### Si NO ves mensajes en getUpdates

Causa típica: el bot tiene "Privacy mode" ON (no ve mensajes que no le mencionan). Solución:
1. Habla con @BotFather
2. `/mybots` → selecciona tu bot → `Bot Settings` → `Group Privacy` → `Turn off`
3. Vuelve al paso 5 (envía mensaje al grupo y reabre getUpdates)

Alternativa: en el grupo, **menciona** al bot directamente: `@TuBotName test`. Eso siempre lo dispara, aunque privacy esté ON.

### Vía 2 — Bot helper

Habla con `@RawDataBot` en privado, añádelo al grupo, te muestra el chat.id automáticamente. Quítalo después.

### Vía 3 — Webhook ya configurado

Si ya ejecutaste `tgSetWebhook()`, `getUpdates` no devuelve nada (Telegram empuja a webhook en vez de cola). En ese caso:
1. Ejecuta `tgDeleteWebhook()` desde editor Apps Script
2. Haz la vía 1
3. Vuelve a ejecutar `tgSetWebhook()`

O lee CHAT_ID dentro del propio Apps Script viendo los logs (`console.log(update)` en `handleTelegramUpdate`).

---

## 2. Rellenar Configuracion

Abre la hoja Configuracion de tu Sheets. Estructura: **columna A = clave, columna B = valor**.

Añade estas filas (donde queden libres, el orden no importa):

| A (clave)                  | B (valor — ejemplo)                | Comentario                                        |
|----------------------------|------------------------------------|---------------------------------------------------|
| `TELEGRAM_ENABLED`         | `1`                                | `0` desactiva todo el sistema sin tocar código    |
| `TELEGRAM_BOT_TOKEN`       | `1234567890:AAExxxxxxxxxxx`        | El token de BotFather, formato `<id>:<hash>`      |
| `TELEGRAM_CHAT_ID`         | `-1001234567890`                   | CHAT_ID del paso 1, incluido el signo menos       |
| `TELEGRAM_ADMIN_ID`        | `99999999`                         | Tu USER_ID (admin para `/backup`, `/anuncio`)    |
| `TELEGRAM_UMBRAL`          | `100000`                           | Umbral ₡ para notif "tesorería grande"            |
| `PJ_TG_CASTIGADOR`         | `234567890`                        | user_id Telegram del jugador Castigador           |
| `PJ_TG_BOLA_DEMOLICION`    | `345678901`                        | user_id Telegram del jugador Bola de Demolición   |
| `PJ_TG_VISTA_PALOMA`       | `456789012`                        | user_id Telegram del jugador Vista Paloma         |

### Reglas de naming `PJ_TG_*`

- Formato: `PJ_TG_<NOMBRE_PJ>` con espacios → guiones bajos
- Ejemplos:
  - "Castigador" → `PJ_TG_CASTIGADOR`
  - "Bola de Demolición" → `PJ_TG_BOLA_DEMOLICION` (tildes se ignoran, sin caracteres especiales)
  - "Vista Paloma" → `PJ_TG_VISTA_PALOMA`
- El backend hace `key.substring("PJ_TG_".length).replace(/_/g, ' ')` para reconstruir el nombre.

### Cómo cada jugador saca su USER_ID

Cada PJ debe:
1. Abrir Telegram y buscar `@userinfobot`
2. Pulsar START
3. Copiar el `Id: 234567890` que aparece
4. Pasártelo
5. Tú lo metes en la celda correspondiente

### Verificación rápida

Después de rellenar, abre `https://api.telegram.org/bot<TOKEN>/getMe`. Si responde JSON con tu bot, el token es válido.

---

## 3. Apps Script completo

Crear o reemplazar el archivo en el editor Apps Script. Tienes 2 opciones:

### Opción A — Mantener tu código existente + añadir telegram

Si tienes tu propio `Code.gs` con todos los endpoints (registrarMision, getLibroMayor, etc.):

1. Crea un nuevo archivo en el editor: **Archivo → +→ Script** → nombre `telegram.gs`
2. Pega el contenido íntegro de `scripts/apps-script/telegram.gs` (del repo)
3. En tu `Code.gs` existente, dentro de `doPost(e)`, AÑADE este check **antes** de tu lógica actual:
   ```javascript
   function doPost(e) {
     try {
       const body = e.postData && e.postData.contents
         ? JSON.parse(e.postData.contents) : {};

       // ── Telegram webhook entrante (formato Update de Telegram)
       if (body.update_id) {
         handleTelegramUpdate(body);
         return ContentService.createTextOutput('OK');
       }

       // ── Telegram send saliente (desde cliente web)
       if (body.action === 'tgSend') {
         const r = handleTelegramSend(body);
         return ContentService
           .createTextOutput(JSON.stringify(r))
           .setMimeType(ContentService.MimeType.JSON);
       }

       // ── TU CÓDIGO EXISTENTE AQUÍ
       // switch (body.action) { case 'saveLibroMayor': ... etc }
     } catch (err) {
       return ContentService.createTextOutput('ERR ' + err);
     }
   }
   ```

### Opción B — Reemplazar por código canónico completo

He generado un `MECHWARRIOR_BACKEND.gs` ÚNICO que cubre TODOS los endpoints
que tu cliente usa, basado en `sheets-service.ts`. Si tu Code.gs existente
está desactualizado, puedes reemplazarlo entero por este.

Ver archivo: **`scripts/apps-script/MECHWARRIOR_BACKEND.gs`** en el repo.

⚠️ **Antes de reemplazar:** haz backup del Code.gs actual copiándolo a un
archivo .gs.old en el editor.

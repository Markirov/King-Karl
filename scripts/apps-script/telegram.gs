/**
 * ═══════════════════════════════════════════════════════════════
 *  TELEGRAM BOT — Apps Script source
 *
 *  Pegar este archivo en el editor Apps Script del proyecto Sheets.
 *  Endpoints añadidos: action:'tgSend', webhook entrante automático.
 *
 *  Setup:
 *   1. Crear bot en @BotFather → copiar TOKEN
 *   2. Configuracion: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
 *      TELEGRAM_ADMIN_ID, TELEGRAM_ENABLED=1, TELEGRAM_UMBRAL=100000
 *   3. Mapeo PJ → user_id en Configuracion: PJ_TG_CASTIGADOR,
 *      PJ_TG_BOLA_DEMOLICION, PJ_TG_VISTA_PALOMA
 *   4. Deploy → New deployment → Web app, anonymous
 *   5. Desde editor ejecutar tgSetWebhook() una vez
 * ═══════════════════════════════════════════════════════════════
 */

// ── Config readers ──────────────────────────────────────────────

function tgConfig() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Configuracion');
  if (!sh) return null;
  const range = sh.getRange('A1:B200').getValues();
  const cfg = {};
  for (let i = 0; i < range.length; i++) {
    const k = String(range[i][0] || '').trim();
    const v = String(range[i][1] || '').trim();
    if (k) cfg[k] = v;
  }
  return cfg;
}

function tgEnabled() {
  const c = tgConfig();
  return c && c.TELEGRAM_ENABLED === '1' && c.TELEGRAM_BOT_TOKEN;
}

function tgToken() {
  const c = tgConfig();
  return c ? c.TELEGRAM_BOT_TOKEN : '';
}

function tgChatId() {
  const c = tgConfig();
  return c ? c.TELEGRAM_CHAT_ID : '';
}

function tgAdminId() {
  const c = tgConfig();
  return c ? String(c.TELEGRAM_ADMIN_ID || '') : '';
}

function tgUmbral() {
  const c = tgConfig();
  const n = parseInt(c && c.TELEGRAM_UMBRAL, 10);
  return Number.isFinite(n) ? n : 100000;
}

/** Mapeo user_id → PJ nombre. Lee todas las claves PJ_TG_* */
function tgPJMap() {
  const c = tgConfig() || {};
  const out = {};
  Object.keys(c).forEach(function (k) {
    if (k.indexOf('PJ_TG_') === 0) {
      const uid = String(c[k]);
      const nombre = k.substring('PJ_TG_'.length).replace(/_/g, ' ');
      if (uid) out[uid] = nombre;
    }
  });
  return out;
}

function tgIsPJ(userId) {
  return !!tgPJMap()[String(userId)];
}

function tgIsAdmin(userId) {
  return String(userId) === tgAdminId();
}

function tgIsAuthorized(userId) {
  return tgIsAdmin(userId) || tgIsPJ(userId);
}

function tgPJNameFromUserId(userId) {
  return tgPJMap()[String(userId)] || null;
}

// ── Telegram API wrappers ───────────────────────────────────────

function tgFetchAPI(method, payload) {
  const token = tgToken();
  if (!token) return { ok: false, error: 'no_token' };
  const url = 'https://api.telegram.org/bot' + token + '/' + method;
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const body = JSON.parse(res.getContentText());
    if (code >= 200 && code < 300 && body.ok) return body;
    return { ok: false, error: body.description || 'http_' + code };
  } catch (e) {
    console.warn('tgFetchAPI fail:', method, e);
    return { ok: false, error: String(e) };
  }
}

function tgSendMessage(chatId, text, opts) {
  opts = opts || {};
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: opts.parse_mode || 'Markdown',
    disable_web_page_preview: opts.preview === false,
  };
  if (opts.reply_markup) payload.reply_markup = opts.reply_markup;
  return tgFetchAPI('sendMessage', payload);
}

function tgSendPhoto(chatId, photoUrl, caption) {
  return tgFetchAPI('sendPhoto', {
    chat_id: chatId, photo: photoUrl, caption: caption || '',
    parse_mode: 'Markdown',
  });
}

function tgInlineKb(buttons) {
  // buttons: [[{text,url}, ...], [{text,callback_data}, ...]]
  return { inline_keyboard: buttons };
}

function tgSetWebhook() {
  // Ejecutar una vez desde editor para registrar webhook
  const exec = ScriptApp.getService().getUrl(); // /exec URL del deployment activo
  if (!exec) { console.error('No deployment URL. Despliega primero.'); return; }
  const r = tgFetchAPI('setWebhook', { url: exec, allowed_updates: ['message'] });
  console.log('setWebhook:', r);
  return r;
}

function tgGetWebhookInfo() {
  return tgFetchAPI('getWebhookInfo', {});
}

function tgDeleteWebhook() {
  return tgFetchAPI('deleteWebhook', {});
}

// ── Templates ───────────────────────────────────────────────────

function tgEmojiBalance(n) { return n >= 0 ? '🟢' : '🔴'; }
function tgEmojiTipo(tipo) { return tipo === 'ingreso' ? '➕' : '➖'; }
function tgFmt(n)         { return Number(n).toLocaleString('es-ES') + ' ₡'; }

function tplMisionCerrada(data) {
  const txt =
    '🛡️ *MISIÓN CERRADA* · ' + (data.fecha || '') + '\n' +
    'Tipo: ' + (data.missionType || '—') + '\n' +
    'Balance: ' + tgFmt(data.balance || 0) + ' ' + tgEmojiBalance(data.balance || 0) + '\n' +
    (data.pjTopXP ? 'Destacado: ' + data.pjTopXP + ' (+' + (data.xp || 0) + ' XP)' : '');
  return { text: txt };
}

function tplLibroMayorRelevante(data) {
  const txt =
    tgEmojiTipo(data.tipo) + ' *' + (data.concepto || '') + '*\n' +
    'Cantidad: ' + tgFmt(data.cantidad || 0) + '\n' +
    'Categoría: ' + (data.categoria || '—') + '\n' +
    'Saldo: ' + tgFmt(data.tesoreria || 0);
  return { text: txt };
}

function tplTesoreriaGrande(data) {
  const txt =
    '⚠️ *MOVIMIENTO GRANDE*\n' +
    (data.concepto || '') + '\n' +
    tgEmojiTipo(data.tipo) + ' ' + tgFmt(data.cantidad || 0) + '\n' +
    'Saldo: ' + tgFmt(data.tesoreria || 0);
  return { text: txt };
}

function tplCronicaNueva(data) {
  const cuerpo = String(data.cuerpo || '').substring(0, 200);
  const txt =
    '📖 *NUEVA CRÓNICA* · ' + (data.fechaCampaign || '') + '\n' +
    '*' + (data.titulo || '') + '*\n' +
    '— por ' + (data.autorNombre || '') + '\n\n' +
    cuerpo + (data.cuerpo && data.cuerpo.length > 200 ? '...' : '');
  return { text: txt };
}

function tplParteNuevo(data) {
  const resumen = String(data.resumen || '').substring(0, 150);
  return {
    text: '📋 *PARTE DEL DÍA* · ' + (data.fechaCampaign || '') + '\n' +
          (data.autorNombre || '') + ': ' + resumen,
  };
}

// ── Handler salida (UI → bot → grupo) ───────────────────────────

function handleTelegramSend(params) {
  if (!tgEnabled()) return { success: false, error: 'tg_disabled' };
  const event = String(params.event || '');
  const data = params.data ? (typeof params.data === 'string' ? JSON.parse(params.data) : params.data) : {};
  const chatId = tgChatId();
  if (!chatId) return { success: false, error: 'no_chat_id' };

  let tpl = null;
  switch (event) {
    case 'mision_cerrada':       tpl = tplMisionCerrada(data); break;
    case 'libro_mayor_relevante':
      // Umbral aplicado en cliente; aquí solo formatea
      tpl = tplLibroMayorRelevante(data); break;
    case 'tesoreria_grande':     tpl = tplTesoreriaGrande(data); break;
    case 'cronica_nueva':        tpl = tplCronicaNueva(data); break;
    case 'parte_nuevo':          tpl = tplParteNuevo(data); break;
    default:
      return { success: false, error: 'unknown_event' };
  }

  const opts = {};
  if (data.linkUrl) {
    opts.reply_markup = tgInlineKb([[{ text: data.linkLabel || 'Ver más', url: data.linkUrl }]]);
  }
  const res = tgSendMessage(chatId, tpl.text, opts);
  return { success: !!res.ok, error: res.error };
}

// ── Handler entrada (Telegram webhook → bot) ────────────────────

function handleTelegramUpdate(update) {
  // update tiene formato Telegram Update
  if (!update || !update.message) return { ok: true };
  const msg = update.message;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = String(msg.text || '').trim();

  if (!text.startsWith('/')) return { ok: true }; // no comando, ignorar

  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@\w+$/, ''); // /roster@KKKBot → /roster
  const args = parts.slice(1).join(' ');

  // Autorización
  if (!tgIsAuthorized(userId)) {
    tgSendMessage(chatId, '🚫 No autorizado. Habla con el admin.');
    return { ok: true };
  }

  switch (cmd) {
    case '/roster':    return cmdRoster(chatId);
    case '/tesoreria': return cmdTesoreria(chatId);
    case '/cronica':   return cmdCronica(chatId);
    case '/parte':     return cmdParte(chatId, userId, args);
    case '/help':      return cmdHelp(chatId, userId);
    // Admin-only
    case '/backup':       if (tgIsAdmin(userId)) return cmdBackup(chatId);     break;
    case '/anuncio':      if (tgIsAdmin(userId)) return cmdAnuncio(chatId, args); break;
    case '/resetcampana': if (tgIsAdmin(userId)) return cmdResetConfirm(chatId); break;
    default:
      tgSendMessage(chatId, 'Comando desconocido. /help para lista.');
      return { ok: true };
  }
  tgSendMessage(chatId, '🚫 No tienes permisos para ese comando.');
  return { ok: true };
}

// ── Comandos ────────────────────────────────────────────────────

function cmdHelp(chatId, userId) {
  let txt =
    '*Comandos disponibles:*\n' +
    '/roster — estado pilotos\n' +
    '/tesoreria — saldo + últimos movimientos\n' +
    '/cronica — últimas crónicas\n' +
    '/parte <texto> — registrar parte diario';
  if (tgIsAdmin(userId)) {
    txt += '\n\n*Admin:*\n/backup · /anuncio <texto> · /resetcampana';
  }
  tgSendMessage(chatId, txt);
  return { ok: true };
}

function cmdRoster(chatId) {
  // Lee Personajes sheet (header-driven) y devuelve PJs activos
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Personajes');
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const idxName  = head.indexOf('Nombre');
    const idxApodo = head.indexOf('Apodo');
    const idxXP    = head.indexOf('XP');
    const idxRango = head.indexOf('Rango');
    const idxMech  = head.indexOf('Mech');
    const idxEstado = head.indexOf('Estado');

    const lines = ['🪖 *ROSTER*'];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (idxEstado >= 0 && String(r[idxEstado]).toLowerCase() !== 'activo') continue;
      const nombre = r[idxName] || '—';
      const apodo  = r[idxApodo] ? ' "' + r[idxApodo] + '"' : '';
      const xp     = r[idxXP] || 0;
      const mech   = r[idxMech] || '—';
      lines.push('• ' + nombre + apodo + ' — ' + mech + ' · XP ' + xp);
    }
    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error leyendo roster: ' + e);
  }
  return { ok: true };
}

function cmdTesoreria(chatId) {
  try {
    const cfg = tgConfig();
    const saldo = (cfg && cfg.CONTRATO_VALOR) || '—';
    // Últimos 5 mov: lee sheet LibroMayor
    let lastMovs = '';
    try {
      const sh = SpreadsheetApp.getActive().getSheetByName('LibroMayor');
      const data = sh.getDataRange().getValues();
      const head = data[0];
      const idxFecha = head.indexOf('fecha');
      const idxConc  = head.indexOf('concepto');
      const idxCant  = head.indexOf('cantidad');
      const idxTipo  = head.indexOf('tipo');
      const rows = data.slice(1).sort(function (a, b) {
        return String(b[idxFecha]).localeCompare(String(a[idxFecha]));
      }).slice(0, 5);
      lastMovs = rows.map(function (r) {
        const sign = r[idxTipo] === 'ingreso' ? '+' : '−';
        return '• ' + r[idxFecha] + ' ' + sign + tgFmt(r[idxCant]) + ' ' + r[idxConc];
      }).join('\n');
    } catch (_e) {}
    tgSendMessage(chatId,
      '💰 *TESORERÍA*\nSaldo: ' + saldo + ' ₡\n\n*Últimos movimientos:*\n' + (lastMovs || '—'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error tesorería: ' + e);
  }
  return { ok: true };
}

function cmdCronica(chatId) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Cronicas');
    if (!sh) { tgSendMessage(chatId, 'No hay sheet Cronicas'); return { ok: true }; }
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const idxTitulo = head.indexOf('titulo');
    const idxAutor  = head.indexOf('autorNombre');
    const idxTs     = head.indexOf('ts');
    const rows = data.slice(1).sort(function (a, b) {
      return Number(b[idxTs] || 0) - Number(a[idxTs] || 0);
    }).slice(0, 3);
    const lines = ['📖 *ÚLTIMAS CRÓNICAS*'];
    rows.forEach(function (r) {
      lines.push('• *' + (r[idxTitulo] || '—') + '*  — ' + (r[idxAutor] || '—'));
    });
    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error crónicas: ' + e);
  }
  return { ok: true };
}

function cmdParte(chatId, userId, texto) {
  if (!texto || texto.length < 3) {
    tgSendMessage(chatId, 'Uso: /parte <texto del parte>');
    return { ok: true };
  }
  const autor = tgPJNameFromUserId(userId) || 'Desconocido';
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('ParteDiario');
    if (!sh) { tgSendMessage(chatId, 'No hay sheet ParteDiario'); return { ok: true }; }
    sh.appendRow([
      Utilities.getUuid(),
      new Date().getTime(),
      autor,
      texto,
      'telegram',
    ]);
    tgSendMessage(chatId, '✅ Parte registrado para ' + autor);
  } catch (e) {
    tgSendMessage(chatId, '❌ Error guardando parte: ' + e);
  }
  return { ok: true };
}

function cmdBackup(chatId) {
  // Placeholder: dispara snapshot Fuerzas o similar
  tgSendMessage(chatId, '💾 Backup ejecutado (TODO: hook con tu sistema)');
  return { ok: true };
}

function cmdAnuncio(chatId, texto) {
  if (!texto) { tgSendMessage(chatId, 'Uso: /anuncio <texto>'); return { ok: true }; }
  tgSendMessage(tgChatId(), '📣 *ANUNCIO*\n' + texto);
  return { ok: true };
}

function cmdResetConfirm(chatId) {
  tgSendMessage(chatId,
    '⚠️ Reset campaña requiere confirmación.\nEnvía `/resetcampana CONFIRMAR` para proceder.');
  return { ok: true };
}

// ── doGet/doPost stubs (integrar con backend existente) ─────────
//
// Si ya tienes doGet/doPost: añade estos cases dentro del switch
// existente. Si no, este es el shell mínimo.

function doPost_telegram(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    // Si viene de Telegram webhook → tendrá update_id
    if (body.update_id) {
      handleTelegramUpdate(body);
      return ContentService.createTextOutput('OK');
    }
    // Si viene de la app cliente → action:'tgSend'
    if (body.action === 'tgSend') {
      const r = handleTelegramSend(body);
      return ContentService
        .createTextOutput(JSON.stringify(r))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput('IGNORED');
  } catch (err) {
    console.warn('doPost_telegram err:', err);
    return ContentService.createTextOutput('ERR ' + err);
  }
}

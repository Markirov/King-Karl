/**
 * ═══════════════════════════════════════════════════════════════
 *  MECHWARRIOR_BACKEND.gs — Apps Script canónico
 *
 *  Versión: v2.8 (con Telegram bot)
 *  Última actualización: 2026-06-07
 *
 *  Cubre TODOS los endpoints que usa el cliente web según
 *  `src/lib/sheets-service.ts` + `src/lib/roster.ts` + Telegram.
 *
 *  Estructura:
 *   1. doGet / doPost routers
 *   2. Utilidades genéricas (header-driven row matching)
 *   3. Configuracion (getConfig, saveBatch)
 *   4. Personajes / Roster
 *   5. Misiones (registrar granular + legacy + improvement + gasto XP)
 *   6. Fuerzas (snapshot simulador)
 *   7. Crónicas / OrdenDia / ParteDiario / Logros / Historial
 *   8. LibroMayor (CRUD)
 *   9. Personal (CRUD)
 *  10. Movimientos
 *  11. Telegram (bot completo: send + webhook + comandos)
 *
 *  IMPORTANTE: este archivo es una referencia canónica generada
 *  desde las firmas del cliente. ANTES de reemplazar tu Code.gs
 *  actual, haz backup. Algunas funciones internas (tu lógica de
 *  bonificaciones, validación PJ, etc.) pueden no estar reflejadas
 *  aquí 1:1 — revisa y mezcla manualmente lo que falte.
 * ═══════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════
//  1. ROUTERS
// ════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = String(p.action || '').trim();

    let res;
    switch (action) {
      case 'getConfiguracion': res = getConfiguracion(); break;
      case 'getRoster':        res = getRoster();        break;
      case 'getHojaUnidad':    res = getHojaUnidad(p.jugador); break;
      case 'getLogros':        res = getLogros();        break;
      case 'getHistorial':     res = getHistorial();     break;
      case 'getFuerzas':       res = getFuerzas();       break;
      case 'getCronicas':      res = getCronicas();      break;
      case 'getOrdenDia':      res = getOrdenDia();      break;
      case 'getParteDiario':   res = getParteDiario();   break;
      case 'getMovimientos':   res = getMovimientos(parseInt(p.limit, 10) || 5); break;
      case 'getLibroMayor':    res = getLibroMayor();    break;
      case 'getPersonal':      res = getPersonal();      break;
      case 'registrarMejora':  res = registrarMejora(p); break;
      case 'registrarMision':  res = registrarMisionLegacy(p); break;
      case 'registrarGastoXP': res = registrarGastoXP(p); break;
      default:
        if (p.jugador) { res = getJugador(p.jugador); break; }
        res = { success: false, error: 'unknown_action_' + action };
    }
    return jsonResponse(res);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};

    // ── TELEGRAM webhook (formato Update de Telegram)
    if (body.update_id) {
      handleTelegramUpdate(body);
      return ContentService.createTextOutput('OK');
    }

    const action = String(body.action || '').trim();
    let res;
    switch (action) {
      // Telegram saliente
      case 'tgSend':              res = handleTelegramSend(body); break;
      // Misión granular
      case 'registrarMision':     res = registrarMisionGranular(body); break;
      // Configuracion
      case 'saveConfiguracionBatch': res = saveConfiguracionBatch(body); break;
      // Personajes
      case 'guardarJugador':      res = guardarJugador(body); break;
      // Fuerzas
      case 'saveFuerzas':         res = saveFuerzas(body); break;
      // Crónicas
      case 'saveCronica':         res = saveCronica(body); break;
      case 'deleteCronica':       res = deleteCronica(body.id); break;
      // OrdenDia
      case 'saveOrdenDia':        res = saveOrdenDia(body); break;
      case 'deleteOrdenDia':      res = deleteOrdenDia(body.id); break;
      // ParteDiario
      case 'saveParteDiario':     res = saveParteDiario(body); break;
      case 'deleteParteDiario':   res = deleteParteDiario(body.id); break;
      // LibroMayor
      case 'saveLibroMayor':      res = saveLibroMayor(body); break;
      case 'deleteLibroMayor':    res = deleteLibroMayor(body.id); break;
      // Personal
      case 'savePersonal':        res = savePersonal(body); break;
      case 'deletePersonal':      res = deletePersonal(body.id); break;
      default:
        res = { success: false, error: 'unknown_action_' + action };
    }
    return jsonResponse(res);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════════════
//  2. UTILIDADES GENÉRICAS
// ════════════════════════════════════════════════════════════════

function ss() { return SpreadsheetApp.getActive(); }

function getSheet(name) {
  const sh = ss().getSheetByName(name);
  if (!sh) throw new Error('Sheet no encontrada: ' + name);
  return sh;
}

function readSheet(name) {
  const sh = getSheet(name);
  const data = sh.getDataRange().getValues();
  if (data.length === 0) return { headers: [], rows: [] };
  const headers = data[0].map(function (h) { return String(h || '').trim(); });
  const rows = data.slice(1).map(function (r) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = r[i]; });
    return obj;
  });
  return { headers: headers, rows: rows };
}

function headerIdx(headers, name) {
  const lc = String(name).toLowerCase().trim();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase().trim() === lc) return i;
  }
  return -1;
}

function appendOrUpdateById(sheetName, payload, idField) {
  idField = idField || 'id';
  const sh = getSheet(sheetName);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idCol = headerIdx(headers, idField);
  if (idCol < 0) throw new Error('No hay columna ' + idField + ' en ' + sheetName);

  // Buscar fila con mismo id
  const targetId = String(payload[idField] || '').trim();
  let row = -1;
  if (targetId) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]).trim() === targetId) { row = i + 1; break; }
    }
  }

  const values = headers.map(function (h) {
    if (payload.hasOwnProperty(h)) return payload[h];
    return row > 0 ? data[row - 1][headerIdx(headers, h)] : '';
  });

  if (row > 0) {
    sh.getRange(row, 1, 1, headers.length).setValues([values]);
  } else {
    sh.appendRow(values);
  }
  return { success: true, id: targetId || values[idCol] };
}

function deleteById(sheetName, id) {
  const sh = getSheet(sheetName);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headerIdx(headers, 'id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'not_found' };
}

// ════════════════════════════════════════════════════════════════
//  3. CONFIGURACION
// ════════════════════════════════════════════════════════════════

function configMap() {
  // Lee Configuracion como key/value (A=clave, B=valor)
  const sh = ss().getSheetByName('Configuracion');
  if (!sh) return {};
  const data = sh.getRange('A1:B200').getValues();
  const out = {};
  for (let i = 0; i < data.length; i++) {
    const k = String(data[i][0] || '').trim();
    const v = data[i][1];
    if (k) out[k] = v;
  }
  return out;
}

function getConfiguracion() {
  return { success: true, data: { config: configMap() } };
}

function saveConfiguracionBatch(body) {
  // body.config es JSON string con pares {KEY: value}
  const patch = typeof body.config === 'string' ? JSON.parse(body.config) : (body.config || {});
  const sh = getSheet('Configuracion');
  const data = sh.getRange('A1:B200').getValues();
  const keyToRow = {};
  for (let i = 0; i < data.length; i++) {
    const k = String(data[i][0] || '').trim();
    if (k) keyToRow[k] = i + 1;
  }
  Object.keys(patch).forEach(function (k) {
    const v = patch[k];
    if (keyToRow[k]) {
      sh.getRange(keyToRow[k], 2).setValue(v);
    } else {
      sh.appendRow([k, v]);
    }
  });
  return { success: true };
}

// ════════════════════════════════════════════════════════════════
//  4. PERSONAJES / ROSTER
// ════════════════════════════════════════════════════════════════

function getRoster() {
  // Roster simplificado de Personajes activos
  const { headers, rows } = readSheet('Personajes');
  const list = rows
    .filter(function (r) {
      const estado = String(r['Estado'] || '').toLowerCase();
      return !estado || estado === 'activo';
    })
    .map(function (r) {
      return {
        nombre:      r['Nombre']      || '',
        nombreDisp:  r['NombreDisplay'] || r['Nombre'] || '',
        apodo:       r['Apodo']       || '',
        rango:       r['Rango']       || '',
        xp:          Number(r['XP'] || 0),
        mech:        r['Mech']        || '',
        lanza:       r['Lanza']       || '',
        estado:      r['Estado']      || 'activo',
      };
    });
  return { success: true, data: list };
}

function getJugador(nombre) {
  if (!nombre) return { success: false, error: 'no_jugador' };
  const { rows } = readSheet('Personajes');
  const found = rows.find(function (r) {
    return String(r['Nombre']).trim().toLowerCase() === String(nombre).trim().toLowerCase();
  });
  if (!found) return { success: false, error: 'not_found' };
  return { success: true, data: found };
}

function guardarJugador(body) {
  return appendOrUpdateById('Personajes', body, 'Nombre');
}

function getHojaUnidad(jugador) {
  // Si tienes una hoja con detalles de mech por piloto, implementa aquí.
  // Placeholder: devuelve nada.
  return { success: true, data: null };
}

// ════════════════════════════════════════════════════════════════
//  5. MISIONES
// ════════════════════════════════════════════════════════════════

function registrarMisionLegacy(p) {
  // Forma antigua: xpMap stringified + dineroGanado + gastos
  try {
    const xpMap = JSON.parse(p.xpMap || '{}');
    const dinero = Number(p.dineroGanado || 0);
    const gastos = Number(p.gastos || 0);

    const sh = getSheet('Respuestas de formulario 1');
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const row = headers.map(function (h) {
      const lh = String(h).toLowerCase();
      if (lh === 'fecha' || lh === 'marca temporal' || lh === 'timestamp') return new Date();
      if (lh === 'dinero' || lh === 'dineroganado') return dinero;
      if (lh === 'gastos') return gastos;
      // Buscar handle de jugador en headers
      if (xpMap[h] !== undefined) return xpMap[h];
      const handle = Object.keys(xpMap).find(function (k) {
        return String(k).toLowerCase() === lh;
      });
      if (handle) return xpMap[handle];
      return '';
    });
    sh.appendRow(row);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

function registrarMisionGranular(body) {
  // Body con campos planos (NO stringified). xpMap/chequeosMap/rerollsMap son strings JSON.
  try {
    const xpMap       = JSON.parse(body.xpMap || '{}');
    const chequeosMap = JSON.parse(body.chequeosMap || '{}');
    const rerollsMap  = JSON.parse(body.rerollsMap || '{}');

    const sh = getSheet('Respuestas de formulario 1');
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const expanded = expandPilotMap_(xpMap, chequeosMap, rerollsMap);

    const row = headers.map(function (h) {
      const lh = String(h).toLowerCase().trim();
      // Campos directos del body
      if (body[h] !== undefined) return body[h];
      const directKey = Object.keys(body).find(function (k) {
        return String(k).toLowerCase().trim() === lh;
      });
      if (directKey) return body[directKey];
      // Maps expandidos: "Castigador_XP", "Castigador_chequeos", etc.
      if (expanded[h] !== undefined) return expanded[h];
      const expKey = Object.keys(expanded).find(function (k) {
        return String(k).toLowerCase().trim() === lh;
      });
      if (expKey) return expanded[expKey];
      // Timestamp
      if (lh === 'marca temporal' || lh === 'timestamp' || lh === 'fechaalta') return new Date();
      return '';
    });
    sh.appendRow(row);

    // Marcar gastos XP por rerolls (reuso función registrarMejora)
    Object.keys(rerollsMap).forEach(function (name) {
      // El cliente ya envía estos por separado en HojaServicioPage
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Expande mapas de pilotos a claves por campo: name+'_XP', name+'_chequeos', etc. */
function expandPilotMap_(xpMap, chequeosMap, rerollsMap) {
  const out = {};
  Object.keys(xpMap).forEach(function (n) {
    out[n + '_XP'] = xpMap[n];
    out[n] = xpMap[n]; // alias directo
  });
  Object.keys(chequeosMap).forEach(function (n) {
    out[n + '_chequeos'] = chequeosMap[n];
    out[n + '_CHEQUEOS'] = chequeosMap[n];
  });
  Object.keys(rerollsMap).forEach(function (n) {
    out[n + '_rerolls'] = rerollsMap[n];
    out[n + '_REROLLS'] = rerollsMap[n];
  });
  return out;
}

function registrarMejora(p) {
  const sh = getSheet('Subidas');
  sh.appendRow([
    new Date(),
    p.jugador || '',
    Number(p.xpGastado || 0),
    p.mejora || '',
    p.tipo || 'Subidas',
  ]);
  return { success: true };
}

function registrarGastoXP(p) {
  return registrarMejora({
    jugador:   p.jugador,
    xpGastado: -Math.abs(Number(p.cantidad || 0)),
    mejora:    p.descripcion || '',
    tipo:      'Rerolls',
  });
}

// ════════════════════════════════════════════════════════════════
//  6. FUERZAS (snapshot simulador)
// ════════════════════════════════════════════════════════════════

function getFuerzas() {
  const { rows } = readSheet('Fuerzas');
  const list = rows.map(function (r) {
    let snapshot = null;
    try { snapshot = JSON.parse(r['JSON'] || r['json'] || '{}'); } catch (_e) {}
    return {
      id:       r['ID'] || r['id'],
      nombre:   r['Nombre'] || r['nombre'],
      fecha:    r['Fecha']  || r['fecha'],
      bv:       Number(r['BV'] || r['bv'] || 0),
      snapshot: snapshot,
    };
  });
  return { success: true, data: list };
}

function saveFuerzas(body) {
  return appendOrUpdateById('Fuerzas', {
    ID:      body.id || Utilities.getUuid(),
    Nombre:  body.nombre,
    Fecha:   body.fecha || new Date().toISOString(),
    BV:      Number(body.bv || 0),
    JSON:    body.json,
  }, 'ID');
}

// ════════════════════════════════════════════════════════════════
//  7. CRÓNICAS / ORDEN DEL DÍA / PARTE DIARIO / LOGROS / HISTORIAL
// ════════════════════════════════════════════════════════════════

function getCronicas() {
  const { rows } = readSheet('Cronicas');
  return { success: true, data: rows };
}

function saveCronica(body) {
  return appendOrUpdateById('Cronicas', body, 'id');
}

function deleteCronica(id) {
  return deleteById('Cronicas', id);
}

function getOrdenDia() {
  const { rows } = readSheet('OrdenDia');
  return { success: true, data: rows };
}

function saveOrdenDia(body) {
  return appendOrUpdateById('OrdenDia', body, 'id');
}

function deleteOrdenDia(id) {
  return deleteById('OrdenDia', id);
}

function getParteDiario() {
  const { rows } = readSheet('ParteDiario');
  return { success: true, data: rows };
}

function saveParteDiario(body) {
  return appendOrUpdateById('ParteDiario', body, 'id');
}

function deleteParteDiario(id) {
  return deleteById('ParteDiario', id);
}

function getLogros() {
  const { rows } = readSheet('Logros');
  return { success: true, data: rows };
}

function getHistorial() {
  // Histórico de combates registrados (de tu hoja Historial o Respuestas)
  try {
    const { rows } = readSheet('Historial');
    return { success: true, data: rows };
  } catch (_e) {
    return { success: true, data: [] };
  }
}

// ════════════════════════════════════════════════════════════════
//  8. LIBRO MAYOR (CRUD)
// ════════════════════════════════════════════════════════════════

function getLibroMayor() {
  const { rows } = readSheet('LibroMayor');
  return { success: true, data: { entries: rows } };
}

function saveLibroMayor(body) {
  return appendOrUpdateById('LibroMayor', {
    id:        body.id,
    fecha:     body.fecha,
    concepto:  body.concepto,
    cantidad:  Number(body.cantidad || 0),
    tipo:      body.tipo,
    categoria: body.categoria,
    nota:      body.nota,
    jugador:   body.jugador,
  }, 'id');
}

function deleteLibroMayor(id) {
  return deleteById('LibroMayor', id);
}

// ════════════════════════════════════════════════════════════════
//  9. PERSONAL (CRUD)
// ════════════════════════════════════════════════════════════════

function getPersonal() {
  const { rows } = readSheet('Personal');
  return { success: true, data: { entries: rows } };
}

function savePersonal(body) {
  return appendOrUpdateById('Personal', body, 'id');
}

function deletePersonal(id) {
  return deleteById('Personal', id);
}

// ════════════════════════════════════════════════════════════════
//  10. MOVIMIENTOS
// ════════════════════════════════════════════════════════════════

function getMovimientos(limit) {
  // Lee LibroMayor + cualquier otra fuente y devuelve los N más recientes
  limit = limit || 5;
  try {
    const { rows } = readSheet('LibroMayor');
    const sorted = rows.slice().sort(function (a, b) {
      return String(b.fecha || '').localeCompare(String(a.fecha || ''));
    });
    const list = sorted.slice(0, limit).map(function (r) {
      return {
        fecha:       r.fecha,
        dinero:      r.tipo === 'ingreso' ? Number(r.cantidad || 0) : 0,
        gastos:      r.tipo === 'gasto'   ? Number(r.cantidad || 0) : 0,
        tipo:        r.tipo,
        descripcion: r.concepto,
      };
    });
    return { success: true, data: list };
  } catch (_e) {
    return { success: true, data: [] };
  }
}

// ════════════════════════════════════════════════════════════════
//  11. TELEGRAM BOT
// ════════════════════════════════════════════════════════════════

// ── Config readers ──────────────────────────────────────────────

function tgEnabled() {
  const c = configMap();
  return c && String(c.TELEGRAM_ENABLED) === '1' && c.TELEGRAM_BOT_TOKEN;
}
function tgToken()   { return String(configMap().TELEGRAM_BOT_TOKEN || ''); }
function tgChatId()  { return String(configMap().TELEGRAM_CHAT_ID  || ''); }
function tgAdminId() { return String(configMap().TELEGRAM_ADMIN_ID || ''); }
function tgUmbral()  {
  const n = parseInt(configMap().TELEGRAM_UMBRAL, 10);
  return Number.isFinite(n) ? n : 100000;
}

function tgPJMap() {
  const c = configMap();
  const out = {};
  Object.keys(c).forEach(function (k) {
    if (k.indexOf('PJ_TG_') === 0) {
      const uid = String(c[k] || '').trim();
      const nombre = k.substring('PJ_TG_'.length).replace(/_/g, ' ');
      if (uid) out[uid] = nombre;
    }
  });
  return out;
}
function tgIsPJ(userId)         { return !!tgPJMap()[String(userId)]; }
function tgIsAdmin(userId)      { return String(userId) === tgAdminId(); }
function tgIsAuthorized(userId) { return tgIsAdmin(userId) || tgIsPJ(userId); }
function tgPJNameFromUserId(userId) { return tgPJMap()[String(userId)] || null; }

// ── Telegram API wrappers ───────────────────────────────────────

function tgFetchAPI(method, payload) {
  const token = tgToken();
  if (!token) return { ok: false, error: 'no_token' };
  try {
    const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const body = JSON.parse(res.getContentText());
    if (body.ok) return body;
    return { ok: false, error: body.description || 'http_' + res.getResponseCode() };
  } catch (e) {
    console.warn('tgFetchAPI fail:', method, e);
    return { ok: false, error: String(e) };
  }
}

function tgSendMessage(chatId, text, opts) {
  opts = opts || {};
  const payload = {
    chat_id: chatId, text: text,
    parse_mode: opts.parse_mode || 'Markdown',
    disable_web_page_preview: opts.preview === false,
  };
  if (opts.reply_markup) payload.reply_markup = opts.reply_markup;
  return tgFetchAPI('sendMessage', payload);
}

function tgInlineKb(buttons) { return { inline_keyboard: buttons }; }

// ── Setup helpers (ejecutar desde editor una vez) ────────────────

function tgSetWebhook() {
  const exec = ScriptApp.getService().getUrl();
  if (!exec) { console.error('No deployment URL. Deploy primero.'); return; }
  const r = tgFetchAPI('setWebhook', { url: exec, allowed_updates: ['message'] });
  console.log('setWebhook:', r);
  return r;
}
function tgGetWebhookInfo() { return tgFetchAPI('getWebhookInfo', {}); }
function tgDeleteWebhook()  { return tgFetchAPI('deleteWebhook', {}); }

// ── Templates ───────────────────────────────────────────────────

function tgEmojiBalance(n) { return n >= 0 ? '🟢' : '🔴'; }
function tgEmojiTipo(t)    { return t === 'ingreso' ? '➕' : '➖'; }
function tgFmt(n)          { return Number(n).toLocaleString('es-ES') + ' ₡'; }

function tplMisionCerrada(d) {
  return {
    text:
      '🛡️ *MISIÓN CERRADA* · ' + (d.fecha || '') + '\n' +
      'Tipo: ' + (d.missionType || '—') + '\n' +
      'Balance: ' + tgFmt(d.balance || 0) + ' ' + tgEmojiBalance(d.balance || 0) + '\n' +
      (d.pjTopXP ? 'Destacado: ' + d.pjTopXP + ' (+' + (d.xp || 0) + ' XP)' : '')
  };
}

function tplLibroMayorRelevante(d) {
  return {
    text:
      tgEmojiTipo(d.tipo) + ' *' + (d.concepto || '') + '*\n' +
      'Cantidad: ' + tgFmt(d.cantidad || 0) + '\n' +
      'Categoría: ' + (d.categoria || '—')
  };
}

function tplTesoreriaGrande(d) {
  return {
    text:
      '⚠️ *MOVIMIENTO GRANDE*\n' +
      (d.concepto || '') + '\n' +
      tgEmojiTipo(d.tipo) + ' ' + tgFmt(d.cantidad || 0)
  };
}

function tplCronicaNueva(d) {
  const cuerpo = String(d.cuerpo || '').substring(0, 200);
  return {
    text:
      '📖 *NUEVA CRÓNICA* · ' + (d.fechaCampaign || '') + '\n' +
      '*' + (d.titulo || '') + '*\n' +
      '— por ' + (d.autorNombre || '') + '\n\n' +
      cuerpo + (d.cuerpo && d.cuerpo.length > 200 ? '...' : '')
  };
}

function tplParteNuevo(d) {
  const resumen = String(d.resumen || '').substring(0, 150);
  return {
    text:
      '📋 *PARTE DEL DÍA* · ' + (d.fechaCampaign || '') + '\n' +
      (d.autorNombre || '') + ': ' + resumen
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
    case 'mision_cerrada':        tpl = tplMisionCerrada(data); break;
    case 'libro_mayor_relevante': tpl = tplLibroMayorRelevante(data); break;
    case 'tesoreria_grande':      tpl = tplTesoreriaGrande(data); break;
    case 'cronica_nueva':         tpl = tplCronicaNueva(data); break;
    case 'parte_nuevo':           tpl = tplParteNuevo(data); break;
    default: return { success: false, error: 'unknown_event' };
  }

  const opts = {};
  if (data.linkUrl) {
    opts.reply_markup = tgInlineKb([[{ text: data.linkLabel || 'Ver más', url: data.linkUrl }]]);
  }
  const res = tgSendMessage(chatId, tpl.text, opts);
  return { success: !!res.ok, error: res.error };
}

// ── Handler entrada (webhook Telegram → bot) ─────────────────────

function handleTelegramUpdate(update) {
  if (!update || !update.message) return { ok: true };
  const msg = update.message;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = String(msg.text || '').trim();

  if (!text.startsWith('/')) return { ok: true };

  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@\w+$/, '');
  const args = parts.slice(1).join(' ');

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
    case '/backup':       if (tgIsAdmin(userId)) return cmdBackup(chatId); break;
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
    '*Comandos:*\n' +
    '/roster — estado pilotos\n' +
    '/tesoreria — saldo + últimos movimientos\n' +
    '/cronica — últimas crónicas\n' +
    '/parte <texto> — registrar parte diario\n' +
    '/help — esta ayuda';
  if (tgIsAdmin(userId)) {
    txt += '\n\n*Admin:*\n/backup · /anuncio <texto> · /resetcampana';
  }
  tgSendMessage(chatId, txt);
  return { ok: true };
}

function cmdRoster(chatId) {
  try {
    const r = getRoster();
    const lines = ['🪖 *ROSTER*'];
    r.data.forEach(function (p) {
      const ap = p.apodo ? ' "' + p.apodo + '"' : '';
      lines.push('• ' + (p.nombre) + ap + ' — ' + (p.mech || '—') + ' · XP ' + (p.xp || 0));
    });
    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error roster: ' + e);
  }
  return { ok: true };
}

function cmdTesoreria(chatId) {
  try {
    const saldo = String(configMap().CONTRATO_VALOR || '—');
    const mov = getMovimientos(5).data || [];
    const movTxt = mov.map(function (m) {
      const sign = (m.dinero || 0) > 0 ? '+' : '−';
      const amt = Math.max(m.dinero, m.gastos);
      return '• ' + (m.fecha || '') + ' ' + sign + tgFmt(amt) + ' ' + (m.descripcion || '');
    }).join('\n') || '—';
    tgSendMessage(chatId,
      '💰 *TESORERÍA*\nSaldo: ' + saldo + ' ₡\n\n*Últimos movimientos:*\n' + movTxt);
  } catch (e) {
    tgSendMessage(chatId, '❌ Error tesorería: ' + e);
  }
  return { ok: true };
}

function cmdCronica(chatId) {
  try {
    const c = getCronicas();
    const sorted = (c.data || []).slice().sort(function (a, b) {
      return Number(b.ts || 0) - Number(a.ts || 0);
    }).slice(0, 3);
    const lines = ['📖 *ÚLTIMAS CRÓNICAS*'];
    sorted.forEach(function (r) {
      lines.push('• *' + (r.titulo || '—') + '* — ' + (r.autorNombre || r.autor || '—'));
    });
    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error crónicas: ' + e);
  }
  return { ok: true };
}

function cmdParte(chatId, userId, texto) {
  if (!texto || texto.length < 3) {
    tgSendMessage(chatId, 'Uso: /parte <texto>');
    return { ok: true };
  }
  const autor = tgPJNameFromUserId(userId) || 'Desconocido';
  try {
    saveParteDiario({
      id:         Utilities.getUuid(),
      ts:         new Date().getTime(),
      autor:      autor,
      cuerpo:     texto,
      origen:     'telegram',
    });
    tgSendMessage(chatId, '✅ Parte registrado para *' + autor + '*');
  } catch (e) {
    tgSendMessage(chatId, '❌ Error guardando parte: ' + e);
  }
  return { ok: true };
}

function cmdBackup(chatId) {
  tgSendMessage(chatId, '💾 Backup ejecutado (TODO: hook con sistema snapshot).');
  return { ok: true };
}

function cmdAnuncio(chatId, texto) {
  if (!texto) { tgSendMessage(chatId, 'Uso: /anuncio <texto>'); return { ok: true }; }
  tgSendMessage(tgChatId(), '📣 *ANUNCIO*\n' + texto);
  return { ok: true };
}

function cmdResetConfirm(chatId) {
  tgSendMessage(chatId,
    '⚠️ Reset campaña requiere confirmación.\n' +
    'Envía `/resetcampana CONFIRMAR` para proceder.');
  return { ok: true };
}

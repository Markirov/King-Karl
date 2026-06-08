/**
 * ============================================================================
 * MECHWARRIOR — BACKEND v2.9 (Telegram + /subirxp restringido)
 * ============================================================================
 *
 * Base v2.7 + Telegram bot completo + comando /subirxp (flujo conversacional).
 *
 * COPIAR ESTE ARCHIVO ENTERO sobre el Código.gs existente.
 * Después: Deploy → Manage deployments → ✏️ → New version → Deploy.
 * Si es primera vez: copia /exec URL → pégala en TELEGRAM_WEBAPP_URL.
 * Ejecuta resetWebhookNuclear() una vez desde editor.
 *
 * Sheets esperadas:
 *   Personajes, Configuracion, Respuestas de formulario 1, Logros, Fuerzas,
 *   Cronicas, OrdenDia, ParteDiario, LibroMayor, Personal, Unidad,
 *   Historial_Combates, Listado de Mechs.
 *
 * Configuracion (clave/valor) — telegram:
 *   TELEGRAM_ENABLED       = 1
 *   TELEGRAM_BOT_TOKEN     = 1234567890:AAxxxxx
 *   TELEGRAM_CHAT_ID       = -1001234567890
 *   TELEGRAM_ADMIN_ID      = 99999999
 *   TELEGRAM_UMBRAL        = 100000
 *   TG_XP_USERS            = 99999999,88888888       <-- nuevo en v2.9
 *   PJ_TG_CASTIGADOR       = 234567890
 *   PJ_TG_BOLA_DEMOLICION  = 345678901
 *   PJ_TG_VISTA_PALOMA     = 456789012
 *
 * Cambios v2.9 sobre v2.8:
 *   - /subirxp con state machine (PropertiesService): pregunta XP de Marcos,
 *     Jaime, Joan secuencialmente. Escribe a Respuestas. Reporta total/disp.
 *   - /cancelar: aborta flujo activo del usuario
 *   - Restricción TG_XP_USERS: solo los user_ids de esa CSV pueden /subirxp
 * ============================================================================
 */

const SPREADSHEET_ID         = '1glFq6i2kUqfaSYsyH6vxlzfgWl4IrtnYJ97vpELeX7g';
const SHEET_PERSONAJES       = 'Personajes';
const SHEET_REGISTRO         = 'Respuestas de formulario 1';
const FUERZAS_SHEET_NAME     = 'Fuerzas';
const HISTORIAL_SHEET_NAME   = 'Historial_Combates';
const LOGROS_SHEET_NAME      = 'Logros';
const CONFIGURACION_SHEET_NAME = 'Configuracion';
const CRONICAS_SHEET_NAME    = 'Cronicas';
const ORDEN_DIA_SHEET_NAME   = 'OrdenDia';
const PARTE_DIARIO_SHEET_NAME = 'ParteDiario';
const LIBRO_MAYOR_SHEET_NAME = 'LibroMayor';
const PERSONAL_SHEET_NAME    = 'Personal';

const COL_PERSONAJES = {
  NOMBRE: 0, JUGADOR: 1, APODO: 2,
  STR: 3, DEX: 4, INT: 5, CHA: 6,
  ORIGEN: 7, AFILIACION: 8, ESTUDIOS: 9,
  DATOS_COMPLETOS: 10,
  XP_DISPONIBLE: 11, XP_TOTAL: 12, XP_NEGATIVO: 13,
  DISPARO: 14, PILOTAJE: 15,
  MECH: 16, SUELDO: 17, DINERO: 18,
  NOMBRE_DISPLAY: 19, ESTADO: 20, LANZA: 21
};

const CONFIG_DEFAULT_ROWS = [
  ['COMPANIA_NOMBRE', "King Karl's Kürassiers"],
  ['AÑO_CAMPANA', '3026'],
  ['MES_CAMPANA', '4'],
  ['SISTEMA_ACTUAL', 'Galatea'],
  ['FACCION_ACTUAL', 'Mercenarios Independientes']
];

const CAMPOS_EXPLICITOS = [
  'nombre','jugador','apodo','str','dex','int','cha',
  'origen','afiliacion','estudios','xpDisponible','xpTotal',
  'mech','estado','sueldo','dinero','lanza'
];

const CRONICAS_HEADERS = [
  'id','ts','campaignYear','campaignMonth','campaignDay',
  'autor','autorNombre','tag','titulo','cuerpo'
];
const ORDEN_DIA_HEADERS    = ['id', 'ts', 'pilot', 'tipo', 'desc'];
const PARTE_DIARIO_HEADERS = ['id', 'ts', 'text', 'tone'];
const LIBRO_MAYOR_HEADERS  = ['id', 'fecha', 'concepto', 'cantidad', 'tipo', 'categoria', 'nota', 'jugador'];
const PERSONAL_HEADERS     = ['id', 'rol', 'nombre', 'nivel', 'sueldoMes', 'fechaAlta', 'estado', 'nota', 'cantidad'];

// ⚠️ TRAS HACER NEW DEPLOYMENT, PEGA AQUÍ TU URL /exec ACTUAL
const TELEGRAM_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyIDYDFO2UyLJ7I6c0QadLU4O85gQWPoaaYo9HmObQaZloSq8bsy_ET_UevkLvDY61a9w/exec';

// Jugadores que se le preguntan en /subirxp (orden importa)
const TG_PLAYERS = ['Marcos', 'Jaime', 'Joan'];


// ============================================================================
// ROUTERS — únicos doGet/doPost del proyecto
// ============================================================================

function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'getFuerzas':              return handleGetFuerzas();
      case 'getHistorial':            return handleGetHistorial();
      case 'getLogros':               return handleGetLogros();
      case 'getRoster':               return handleGetRoster();
      case 'getMechPorJugador':       return handleGetMechPorJugador(e.parameter.jugador || '');
      case 'getConfiguracion':        return handleGetConfiguracion();
      case 'saveConfiguracion':       return handleSaveConfiguracion(e.parameter.clave || '', e.parameter.valor || '');
      case 'saveConfiguracionBatch':  return handleSaveConfiguracionBatch(JSON.parse(e.parameter.config || '{}'));
      case 'getCronicas':             return handleGetCronicas();
      case 'deleteCronica':           return handleDeleteCronica(e.parameter.id || '');
      case 'getOrdenDia':             return handleGetOrdenDia();
      case 'deleteOrdenDia':          return handleDeleteOrdenDia(e.parameter.id || '');
      case 'getParteDiario':          return handleGetParteDiario();
      case 'deleteParteDiario':       return handleDeleteParteDiario(e.parameter.id || '');
      case 'getMovimientos':          return handleGetMovimientos(e.parameter.limit);
      case 'getLibroMayor':           return handleGetLibroMayor();
      case 'getPersonal':             return handleGetPersonal();
      case 'registrarGastoXP':        return registrarGastoXP({
        jugador: e.parameter.jugador,
        cantidad: parseInt(e.parameter.cantidad) || 0,
        descripcion: e.parameter.descripcion || 'Gasto XP'
      });
      case 'registrarMejora':         return registrarMejora(e);
      case 'registrarMision':         return handleRegistrarMisionLegacy(e.parameter);
    }

    const jugador = e.parameter.jugador;
    if (!jugador) return jsonError('Falta parámetro: jugador');

    const personajes = buscarPersonajesPorJugador(jugador);
    if (personajes.length === 0) return jsonError('No se encontraron personajes');

    return jsonOk({ msg: 'Personajes encontrados', personajes });

  } catch (error) {
    return jsonError('Error: ' + error.message);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // === A. TELEGRAM webhook entrante (Update de Telegram) ===
    if (data.update_id) {
      handleTelegramUpdate(data);
      return ContentService.createTextOutput('OK');
    }

    // === B. TELEGRAM saliente desde la web ===
    if (data.action === 'tgSend') {
      return createJsonResponse(handleTelegramSend(data));
    }

    // === C. RESTO v2.7 ===
    if (data.action === 'saveFuerzas')        return handleSaveFuerzas(data);
    if (data.action === 'registrarGastoXP')   return registrarGastoXP(data);
    if (data.action === 'registrarMision')    return handleRegistrarMisionPost(data);
    if (data.action === 'saveCronica')        return handleSaveCronica(data);
    if (data.action === 'deleteCronica')      return handleDeleteCronica(data.id || '');
    if (data.action === 'saveOrdenDia')       return handleSaveOrdenDia(data);
    if (data.action === 'deleteOrdenDia')     return handleDeleteOrdenDia(data.id || '');
    if (data.action === 'saveParteDiario')    return handleSaveParteDiario(data);
    if (data.action === 'deleteParteDiario')  return handleDeleteParteDiario(data.id || '');
    if (data.action === 'saveLibroMayor')     return handleSaveLibroMayor(data);
    if (data.action === 'deleteLibroMayor')   return handleDeleteLibroMayor(data.id || '');
    if (data.action === 'savePersonal')       return handleSavePersonal(data);
    if (data.action === 'deletePersonal')     return handleDeletePersonal(data.id || '');

    if (!data.nombre || !data.jugador) return jsonError('Faltan campos requeridos');
    guardarPersonaje(data);
    return jsonOk({ msg: 'Personaje guardado' });

  } catch (error) {
    return jsonError('Error: ' + error.message);
  }
}


// ============================================================================
// HEADER-BASED COL MAP (genérico)
// ============================================================================

function getHeaderColMap(sheet) {
  const cols = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, cols).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const k = (h || '').toString().trim();
    if (k) map[k.toLowerCase()] = i;
  });
  return map;
}


// ============================================================================
// ROSTER
// ============================================================================

function handleGetRoster() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PERSONAJES);
    if (!sheet) return jsonError('No existe la hoja ' + SHEET_PERSONAJES, { roster: [] });

    const data = sheet.getDataRange().getValues();
    const roster = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nombre = (row[COL_PERSONAJES.NOMBRE] || '').toString().trim();
      const jugador = (row[COL_PERSONAJES.JUGADOR] || '').toString().trim();
      if (!nombre && !jugador) continue;

      const estado = (row[COL_PERSONAJES.ESTADO] || 'activo').toString().trim().toLowerCase() || 'activo';

      roster.push({
        order:         i,
        fila:          i + 1,
        nombre:        nombre,
        jugador:       jugador,
        apodo:         (row[COL_PERSONAJES.APODO]      || '').toString(),
        origen:        (row[COL_PERSONAJES.ORIGEN]     || '').toString(),
        afiliacion:    (row[COL_PERSONAJES.AFILIACION] || '').toString(),
        mech:          (row[COL_PERSONAJES.MECH]       || '').toString().trim(),
        xpTotal:       Number(row[COL_PERSONAJES.XP_TOTAL])      || 0,
        xpDisponible:  Number(row[COL_PERSONAJES.XP_DISPONIBLE]) || 0,
        sueldo:        row[COL_PERSONAJES.SUELDO] || '',
        dinero:        row[COL_PERSONAJES.DINERO] || '',
        estado:        estado,
        nombreDisplay: (row[COL_PERSONAJES.NOMBRE_DISPLAY] || '').toString().trim(),
        lanza:         (row[COL_PERSONAJES.LANZA] || '').toString().trim()
      });
    }

    return jsonOk({ roster });
  } catch (error) {
    return jsonError(error.message, { roster: [] });
  }
}


// ============================================================================
// CONFIGURACION
// ============================================================================

function getConfiguracionSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIGURACION_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIGURACION_SHEET_NAME);
    sheet.appendRow(['Clave', 'Valor']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    CONFIG_DEFAULT_ROWS.forEach(row => sheet.appendRow(row));
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 400);
  }
  return sheet;
}

function readConfiguracionMap(sheet) {
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    const [clave, valor] = data[i];
    if (clave) config[clave] = valor || '';
  }
  return config;
}

function handleGetConfiguracion() {
  try {
    const sheet = getConfiguracionSheet();
    const config = readConfiguracionMap(sheet);
    const githubJsonJ2 = sheet.getRange('J2').getDisplayValue().trim();
    if (githubJsonJ2) config.GITHUB_SYNC_JSON = githubJsonJ2;
    return jsonOk({ config });
  } catch (error) {
    return jsonError(error.message, { config: {} });
  }
}

function handleSaveConfiguracion(clave, valor) {
  try {
    if (!clave) return jsonError('Clave vacía');
    upsertConfigKeys(getConfiguracionSheet(), { [clave]: valor });
    return jsonOk({ msg: 'Configuración guardada' });
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleSaveConfiguracionBatch(configs) {
  try {
    upsertConfigKeys(getConfiguracionSheet(), configs);
    return jsonOk({ msg: 'Configuraciones guardadas' });
  } catch (error) {
    return jsonError(error.message);
  }
}

function upsertConfigKeys(sheet, configs) {
  const data = sheet.getDataRange().getValues();
  const claveToRow = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) claveToRow[data[i][0]] = i + 1;
  }
  for (const [clave, valor] of Object.entries(configs)) {
    const fila = claveToRow[clave];
    if (fila) sheet.getRange(fila, 2).setValue(valor);
    else sheet.appendRow([clave, valor]);
  }
}


// ============================================================================
// PERSONAJES — Barracones
// ============================================================================

function buscarPersonajesPorJugador(nombreJugador) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PERSONAJES);
  const data = sheet.getDataRange().getValues();
  const target = nombreJugador.toLowerCase();
  const personajes = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const jugador = row[COL_PERSONAJES.JUGADOR];
    if (jugador && jugador.toString().toLowerCase() === target) {
      personajes.push(crearObjetoPersonaje(row));
    }
  }
  return personajes;
}

function crearObjetoPersonaje(row) {
  let datosCompletos = {};
  try {
    const raw = row[COL_PERSONAJES.DATOS_COMPLETOS];
    if (raw) datosCompletos = JSON.parse(raw);
  } catch (e) { /* silent */ }

  return {
    nombre:        row[COL_PERSONAJES.NOMBRE]        || '',
    jugador:       row[COL_PERSONAJES.JUGADOR]       || '',
    str:           row[COL_PERSONAJES.STR]           || 0,
    dex:           row[COL_PERSONAJES.DEX]           || 0,
    int:           row[COL_PERSONAJES.INT]           || 0,
    cha:           row[COL_PERSONAJES.CHA]           || 0,
    origen:        row[COL_PERSONAJES.ORIGEN]        || '',
    afiliacion:    row[COL_PERSONAJES.AFILIACION]    || '',
    estudios:      row[COL_PERSONAJES.ESTUDIOS]      || '',
    xpDisponible:  row[COL_PERSONAJES.XP_DISPONIBLE] || 0,
    xpTotal:       row[COL_PERSONAJES.XP_TOTAL]      || 0,
    xpNegativo:    row[COL_PERSONAJES.XP_NEGATIVO]   || 0,
    disparo:       Number(row[COL_PERSONAJES.DISPARO])  || 0,
    pilotaje:      Number(row[COL_PERSONAJES.PILOTAJE]) || 0,
    ...datosCompletos,
    apodo:         row[COL_PERSONAJES.APODO]         || '',
    mech:          (row[COL_PERSONAJES.MECH]         || '').toString().trim(),
    estado:        (row[COL_PERSONAJES.ESTADO]       || 'activo').toString().trim().toLowerCase() || 'activo',
    lanza:         (row[COL_PERSONAJES.LANZA]        || '').toString().trim(),
    sueldo:        row[COL_PERSONAJES.SUELDO]        || '',
    dinero:        row[COL_PERSONAJES.DINERO]        || '',
    salary:        row[COL_PERSONAJES.SUELDO]        || '',
    cbills:        row[COL_PERSONAJES.DINERO]        || ''
  };
}

function guardarPersonaje(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PERSONAJES);
  const allData = sheet.getDataRange().getValues();

  let filaExistente = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][COL_PERSONAJES.NOMBRE] === data.nombre) { filaExistente = i; break; }
  }

  const datosCompletos = { ...data };
  CAMPOS_EXPLICITOS.forEach(k => delete datosCompletos[k]);

  if (filaExistente !== -1) {
    const apodoExistente = allData[filaExistente][COL_PERSONAJES.APODO] || '';
    const apodoFinal = (data.apodo && data.apodo.toString().trim()) || apodoExistente;
    escribirFilaPersonaje(sheet, filaExistente + 1, data, datosCompletos, apodoFinal);
  } else {
    escribirFilaPersonaje(sheet, sheet.getLastRow() + 1, data, datosCompletos, data.apodo || '');
  }
}

function escribirFilaPersonaje(sheet, fila, data, datosCompletos, apodo) {
  sheet.getRange(fila, 1, 1, 11).setValues([[
    data.nombre, data.jugador, apodo,
    data.str || 0, data.dex || 0, data.int || 0, data.cha || 0,
    data.origen || '', data.afiliacion || '', data.estudios || '',
    JSON.stringify(datosCompletos)
  ]]);
}


// ============================================================================
// MISIÓN — Legacy (GET) + Granular (POST)
// ============================================================================

function handleRegistrarMisionLegacy(params) {
  let xpMap = {};
  try { xpMap = JSON.parse(params.xpMap || '{}'); } catch (e) {}
  if (Object.keys(xpMap).length === 0) {
    if (params.xpMarcos) xpMap['Marcos'] = parseInt(params.xpMarcos) || 0;
    if (params.xpJaime)  xpMap['Jaime']  = parseInt(params.xpJaime)  || 0;
    if (params.xpJoan)   xpMap['Joan']   = parseInt(params.xpJoan)   || 0;
    if (params.xpJuan)   xpMap['Juan']   = parseInt(params.xpJuan)   || 0;
  }
  return registrarMisionCombate({
    xpMap,
    dinero: parseInt(params.dineroGanado) || 0,
    gastos: parseInt(params.gastos) || 0,
    descripcion: params.descripcion || 'Misión registrada',
    combatPersonaje:   params.combatPersonaje || null,
    combatJugador:     params.combatJugador   || null,
    combatDanos:       params.combatDanos     || null,
    combatDanosTotal:  parseInt(params.combatDanosTotal) || 0,
    combatMunicion:    params.combatMunicion  || null
  });
}

function handleRegistrarMisionPost(data) {
  try {
    let xpMap = {}, chequeosMap = {}, rerollsMap = {};
    try { xpMap       = JSON.parse(data.xpMap       || '{}'); } catch (e) {}
    try { chequeosMap = JSON.parse(data.chequeosMap || '{}'); } catch (e) {}
    try { rerollsMap  = JSON.parse(data.rerollsMap  || '{}'); } catch (e) {}

    const intOrZero = v => parseInt(v) || 0;

    const extras = {
      missionId:    data.missionId    || '',
      fechaPropia:  data.fechaPropia  || '',
      codUnidad:    data.codUnidad    || '',
      oficial:      data.oficial      || '',
      missionType:  data.missionType  || '',
      duration:     data.duration     || '',
      pago:         intOrZero(data.pago),
      salvamento:   intOrZero(data.salvamento),
      extrasHaber:  intOrZero(data.extrasHaber),
      reparacion:   intOrZero(data.reparacion),
      municion:     intOrZero(data.municion),
      blindaje:     intOrZero(data.blindaje),
      extrasDebe:   intOrZero(data.extrasDebe),
      totalHaber:   intOrZero(data.totalHaber),
      totalDebe:    intOrZero(data.totalDebe),
      balance:      intOrZero(data.balance),
      bitacoraNote: data.bitacoraNote || ''
    };

    appendRegistroRow({
      xpMap, chequeosMap, rerollsMap,
      dinero: intOrZero(data.dineroGanado || data.totalHaber),
      gastos: intOrZero(data.gastos       || data.totalDebe),
      tipo: 'Combate',
      descripcion: data.descripcion ||
        [extras.missionId, extras.missionType].filter(Boolean).join(' · '),
      extras
    });

    return jsonOk({ msg: 'Misión registrada (granular)' });
  } catch (error) {
    return jsonError('Error al registrar misión: ' + error.message);
  }
}

function registrarMisionCombate(data) {
  try {
    let descripcion = data.descripcion || 'Misión registrada';
    if (data.combatPersonaje) {
      descripcion += ` | ${data.combatPersonaje}`;
      if (data.combatDanos)    descripcion += ` | Daños: ${data.combatDanos}`;
      if (data.combatMunicion) descripcion += ` | Mun: ${data.combatMunicion}`;
    }

    appendRegistroRow({
      xpMap:    data.xpMap || {},
      dinero:   data.dinero,
      gastos:   data.gastos,
      tipo:     'Combate',
      descripcion
    });

    if (data.combatPersonaje && data.combatJugador) actualizarPersonajeCombate(data);
    return jsonOk({ msg: 'Misión registrada exitosamente' });
  } catch (error) {
    return jsonError('Error al registrar misión: ' + error.message);
  }
}

function actualizarPersonajeCombate(data) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PERSONAJES);
    const allData = sheet.getDataRange().getValues();

    let filaPersonaje = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][COL_PERSONAJES.NOMBRE] === data.combatPersonaje) { filaPersonaje = i; break; }
    }
    if (filaPersonaje === -1) return Logger.log('⚠️ Personaje no encontrado: ' + data.combatPersonaje);

    const fue = parseInt(allData[filaPersonaje][COL_PERSONAJES.STR]) || 5;

    let datosCompletos = {};
    try {
      const raw = allData[filaPersonaje][COL_PERSONAJES.DATOS_COMPLETOS];
      if (raw) datosCompletos = JSON.parse(raw);
    } catch (e) {}

    aplicarDanosCombate(datosCompletos, fue, data);
    aplicarMunicionCombate(datosCompletos, data.combatMunicion);

    sheet.getRange(filaPersonaje + 1, COL_PERSONAJES.DATOS_COMPLETOS + 1)
         .setValue(JSON.stringify(datosCompletos));

  } catch (error) {
    Logger.log('❌ Error actualizando personaje: ' + error.toString());
  }
}

function aplicarDanosCombate(datosCompletos, fue, data) {
  if (!data.combatDanos || !data.combatDanosTotal) return;
  const hpCabeza = fue;
  const hpBrazos = Math.floor(fue * 2);
  const hpTorso = fue * 3;
  const hpPiernas = Math.ceil(fue * 2);
  const totalHP = hpCabeza + hpTorso + hpBrazos * 2 + hpPiernas * 2;
  const indiceBase = {
    'CABEZA': 0,'Cab': 0,
    'B.IZQ': hpCabeza,'BIzq': hpCabeza,
    'TORSO': hpCabeza + hpBrazos,'Torso': hpCabeza + hpBrazos,
    'B.DER': hpCabeza + hpBrazos + hpTorso,'BDer': hpCabeza + hpBrazos + hpTorso,
    'P.IZQ': hpCabeza + hpBrazos + hpTorso + hpBrazos,'PIzq': hpCabeza + hpBrazos + hpTorso + hpBrazos,
    'P.DER': hpCabeza + hpBrazos + hpTorso + hpBrazos + hpPiernas,'PDer': hpCabeza + hpBrazos + hpTorso + hpBrazos + hpPiernas
  };
  if (!Array.isArray(datosCompletos.estadoFisico) || datosCompletos.estadoFisico.length === 0) {
    datosCompletos.estadoFisico = [];
    for (let i = 0; i < totalHP; i++) datosCompletos.estadoFisico.push({ index: i, damaged: false });
  }
  data.combatDanos.split(',').forEach(part => {
    const m = part.trim().match(/(\w+):(\d+)\/(\d+)/);
    if (!m) return;
    const baseIndex = indiceBase[m[1]];
    if (baseIndex === undefined) return;
    for (let i = 0; i < parseInt(m[2]); i++) {
      const idx = baseIndex + i;
      if (idx < datosCompletos.estadoFisico.length) datosCompletos.estadoFisico[idx].damaged = true;
    }
  });
}

function aplicarMunicionCombate(datosCompletos, combatMunicion) {
  if (!combatMunicion || !Array.isArray(datosCompletos.armas)) return;
  combatMunicion.split('; ').forEach(part => {
    const m = part.trim().match(/(.+):-(\d+)\((\d+)\/(\d+)\)/);
    if (!m) return;
    const restante = parseInt(m[3]);
    const maximo   = parseInt(m[4]);
    datosCompletos.armas.forEach(arma => {
      if (arma.munActual === undefined) return;
      if (parseInt(arma.munActual) === maximo || arma.munActual === maximo.toString()) {
        arma.munActual = restante.toString();
      }
    });
  });
}


// ============================================================================
// XP — Gastos y Mejoras (DINÁMICO por header)
// ============================================================================

function registrarGastoXP(data) {
  try {
    if (!data.jugador) return jsonError('Falta jugador');
    appendRegistroRow({
      xpMap: { [data.jugador]: -Math.abs(data.cantidad || 0) },
      tipo: 'Gasto',
      descripcion: data.descripcion || 'Gasto XP'
    });
    return jsonOk({ msg: 'Gasto registrado' });
  } catch (error) {
    return jsonError('Error al registrar gasto: ' + error.message);
  }
}

function registrarMejora(e) {
  try {
    const jugador = e.parameter.jugador || 'Desconocido';
    const xp = parseInt((e.parameter.xpGastado || '0').replace(/[^\d-]/g, '')) || 0;
    appendRegistroRow({
      xpMap: { [jugador]: xp },
      tipo: e.parameter.tipo || 'Subidas',
      descripcion: e.parameter.mejora || ''
    });
    return jsonOk({ msg: 'Mejora registrada: ' + (e.parameter.mejora || '') });
  } catch (error) {
    return jsonError('Error al registrar mejora: ' + error.message);
  }
}

function appendRegistroRow(opts) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REGISTRO);
  if (!sheet) throw new Error('No se encontró la hoja ' + SHEET_REGISTRO);

  const colMap = getHeaderColMap(sheet);
  const totalCols = sheet.getLastColumn();
  const fila = new Array(totalCols).fill('');

  const fechaIdx = colMap['fecha'] !== undefined ? colMap['fecha'] : 0;
  fila[fechaIdx] = new Date();

  const setIf = (key, val) => {
    if (val === undefined || val === null || val === '') return;
    const idx = colMap[String(key).toLowerCase()];
    if (idx !== undefined) fila[idx] = val;
  };

  const xpMap = opts.xpMap || {};
  Object.entries(xpMap).forEach(([jug, xp]) => setIf(jug, xp));

  expandPilotMap_(opts.chequeosMap, 'chequeos', setIf);
  expandPilotMap_(opts.rerollsMap,  'rerolls',  setIf);

  setIf('dinero', opts.dinero ?? 0);
  setIf('gastos', opts.gastos ?? 0);
  setIf('tipo', opts.tipo ?? '');
  setIf('descripcion', opts.descripcion ?? '');

  if (opts.extras && typeof opts.extras === 'object') {
    Object.entries(opts.extras).forEach(([k, v]) => setIf(k, v));
  }

  sheet.appendRow(fila);
}

function expandPilotMap_(map, suffix, setIf) {
  if (!map || typeof map !== 'object') return;
  Object.entries(map).forEach(([handle, val]) => {
    if (val === undefined || val === null || val === '') return;
    setIf(`${handle}_${suffix}`, val);
  });
}


// ============================================================================
// MOVIMIENTOS — últimas N filas de Respuestas (Dashboard Comisión, v2.6)
// ============================================================================

function handleGetMovimientos(limit) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REGISTRO);
    if (!sheet) return jsonError('No existe la hoja ' + SHEET_REGISTRO, { movimientos: [] });
    const colMap = getHeaderColMap(sheet);
    const data = sheet.getDataRange().getValues();
    const totalRows = data.length - 1;
    const n = Math.max(1, parseInt(limit) || 5);
    const start = Math.max(1, totalRows - n + 1);
    const idxFecha  = colMap['fecha']       !== undefined ? colMap['fecha']       : 0;
    const idxDinero = colMap['dinero']      !== undefined ? colMap['dinero']      : null;
    const idxGastos = colMap['gastos']      !== undefined ? colMap['gastos']      : null;
    const idxTipo   = colMap['tipo']        !== undefined ? colMap['tipo']        : null;
    const idxDesc   = colMap['descripcion'] !== undefined ? colMap['descripcion'] : null;
    const movs = [];
    for (let i = start; i <= totalRows; i++) {
      const row = data[i];
      if (!row[idxFecha]) continue;
      movs.push({
        fecha:       row[idxFecha] instanceof Date ? row[idxFecha].toISOString() : String(row[idxFecha]),
        dinero:      idxDinero !== null ? Number(row[idxDinero]) || 0 : 0,
        gastos:      idxGastos !== null ? Number(row[idxGastos]) || 0 : 0,
        tipo:        idxTipo   !== null ? String(row[idxTipo]   || '') : '',
        descripcion: idxDesc   !== null ? String(row[idxDesc]   || '') : '',
      });
    }
    movs.reverse();
    return jsonOk({ movimientos: movs });
  } catch (error) {
    return jsonError(error.message, { movimientos: [] });
  }
}


// ============================================================================
// FUERZAS
// ============================================================================

function getFuerzasSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(FUERZAS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(FUERZAS_SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Fecha', 'BV', 'JSON']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  return sheet;
}

function handleSaveFuerzas(data) {
  try {
    const sheet = getFuerzasSheet();
    const id     = (data.id || '').toString().trim() || ('f_' + Date.now());
    const nombre = (data.nombre || '').toString();
    const fecha  = (data.fecha  || new Date().toISOString()).toString();
    const bv     = parseInt(data.bv) || 0;
    const json   = (data.json || '').toString();

    const all = sheet.getDataRange().getValues();
    let filaIdx = -1;
    for (let i = 1; i < all.length; i++) {
      if ((all[i][0] || '').toString() === id) { filaIdx = i; break; }
    }

    if (filaIdx >= 0) {
      sheet.getRange(filaIdx + 1, 1, 1, 5).setValues([[id, nombre, fecha, bv, json]]);
      return jsonOk({ msg: 'Fuerza actualizada', id });
    } else {
      sheet.appendRow([id, nombre, fecha, bv, json]);
      return jsonOk({ msg: 'Fuerza creada', id });
    }
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleGetFuerzas() {
  try {
    const data = getFuerzasSheet().getDataRange().getValues();
    const fuerzas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      let snapshot = null;
      try { snapshot = JSON.parse(row[4] || 'null'); } catch (e) { snapshot = null; }
      fuerzas.push({
        id:       (row[0] || '').toString(),
        nombre:   (row[1] || '').toString(),
        fecha:    row[2] ? row[2].toString() : '',
        bv:       Number(row[3]) || 0,
        snapshot: snapshot,
        json:     (row[4] || '').toString()
      });
    }
    return jsonOk({ fuerzas });
  } catch (error) {
    return jsonError(error.message, { fuerzas: [] });
  }
}


// ============================================================================
// CRONICAS (v2.4)
// ============================================================================

function getCronicasSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CRONICAS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CRONICAS_SHEET_NAME);
    sheet.appendRow(CRONICAS_HEADERS);
    sheet.getRange(1, 1, 1, CRONICAS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function handleGetCronicas() {
  try {
    const sheet = getCronicasSheet();
    const data = sheet.getDataRange().getValues();
    const cronicas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      cronicas.push({
        id:            String(row[0]),
        ts:            Number(row[1]) || 0,
        campaignYear:  Number(row[2]) || 0,
        campaignMonth: Number(row[3]) || 0,
        campaignDay:   Number(row[4]) || 0,
        autor:         String(row[5] || 'mando'),
        autorNombre:   String(row[6] || ''),
        tag:           String(row[7] || 'aar'),
        titulo:        String(row[8] || ''),
        cuerpo:        String(row[9] || ''),
      });
    }
    return jsonOk({ cronicas });
  } catch (error) {
    return jsonError(error.message, { cronicas: [] });
  }
}

function handleSaveCronica(data) {
  try {
    const sheet = getCronicasSheet();
    const id = (data.id || '').toString().trim() || ('c_' + Date.now());
    const row = [
      id,
      Number(data.ts) || Date.now(),
      Number(data.campaignYear)  || 0,
      Number(data.campaignMonth) || 0,
      Number(data.campaignDay)   || 0,
      String(data.autor       || 'mando'),
      String(data.autorNombre || ''),
      String(data.tag         || 'aar'),
      String(data.titulo      || ''),
      String(data.cuerpo      || ''),
    ];

    const all = sheet.getDataRange().getValues();
    let filaIdx = -1;
    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]) === id) { filaIdx = i; break; }
    }

    if (filaIdx >= 0) {
      sheet.getRange(filaIdx + 1, 1, 1, CRONICAS_HEADERS.length).setValues([row]);
      return jsonOk({ msg: 'Crónica actualizada', id });
    } else {
      sheet.appendRow(row);
      return jsonOk({ msg: 'Crónica creada', id });
    }
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleDeleteCronica(id) {
  try {
    if (!id) return jsonError('Falta id');
    const sheet = getCronicasSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonOk({ msg: 'Crónica borrada', id });
      }
    }
    return jsonError('id no encontrado: ' + id);
  } catch (error) {
    return jsonError(error.message);
  }
}


// ============================================================================
// ORDEN DIA (v2.5)
// ============================================================================

function getOrdenDiaSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ORDEN_DIA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ORDEN_DIA_SHEET_NAME);
    sheet.appendRow(ORDEN_DIA_HEADERS);
    sheet.getRange(1, 1, 1, ORDEN_DIA_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function handleGetOrdenDia() {
  try {
    const data = getOrdenDiaSheet().getDataRange().getValues();
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      entries.push({
        id:    String(row[0]),
        ts:    Number(row[1]) || 0,
        pilot: String(row[2] || ''),
        tipo:  String(row[3] || ''),
        desc:  String(row[4] || ''),
      });
    }
    return jsonOk({ entries });
  } catch (error) {
    return jsonError(error.message, { entries: [] });
  }
}

function handleSaveOrdenDia(data) {
  try {
    const sheet = getOrdenDiaSheet();
    const id = (data.id || '').toString().trim() || ('o_' + Date.now());
    const row = [
      id,
      Number(data.ts) || Date.now(),
      String(data.pilot || ''),
      String(data.tipo  || ''),
      String(data.desc  || ''),
    ];
    const all = sheet.getDataRange().getValues();
    let filaIdx = -1;
    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]) === id) { filaIdx = i; break; }
    }
    if (filaIdx >= 0) {
      sheet.getRange(filaIdx + 1, 1, 1, ORDEN_DIA_HEADERS.length).setValues([row]);
      return jsonOk({ msg: 'OrdenDia actualizada', id });
    } else {
      sheet.appendRow(row);
      return jsonOk({ msg: 'OrdenDia creada', id });
    }
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleDeleteOrdenDia(id) {
  try {
    if (!id) return jsonError('Falta id');
    const sheet = getOrdenDiaSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonOk({ msg: 'OrdenDia borrada', id });
      }
    }
    return jsonError('id no encontrado: ' + id);
  } catch (error) {
    return jsonError(error.message);
  }
}


// ============================================================================
// PARTE DIARIO (v2.5)
// ============================================================================

function getParteDiarioSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PARTE_DIARIO_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PARTE_DIARIO_SHEET_NAME);
    sheet.appendRow(PARTE_DIARIO_HEADERS);
    sheet.getRange(1, 1, 1, PARTE_DIARIO_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function handleGetParteDiario() {
  try {
    const data = getParteDiarioSheet().getDataRange().getValues();
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      entries.push({
        id:   String(row[0]),
        ts:   Number(row[1]) || 0,
        text: String(row[2] || ''),
        tone: String(row[3] || 'info'),
      });
    }
    return jsonOk({ entries });
  } catch (error) {
    return jsonError(error.message, { entries: [] });
  }
}

function handleSaveParteDiario(data) {
  try {
    const sheet = getParteDiarioSheet();
    const id = (data.id || '').toString().trim() || ('p_' + Date.now());
    const row = [
      id,
      Number(data.ts) || Date.now(),
      String(data.text || ''),
      String(data.tone || 'info'),
    ];
    const all = sheet.getDataRange().getValues();
    let filaIdx = -1;
    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]) === id) { filaIdx = i; break; }
    }
    if (filaIdx >= 0) {
      sheet.getRange(filaIdx + 1, 1, 1, PARTE_DIARIO_HEADERS.length).setValues([row]);
      return jsonOk({ msg: 'ParteDiario actualizado', id });
    } else {
      sheet.appendRow(row);
      return jsonOk({ msg: 'ParteDiario creado', id });
    }
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleDeleteParteDiario(id) {
  try {
    if (!id) return jsonError('Falta id');
    const sheet = getParteDiarioSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonOk({ msg: 'ParteDiario borrado', id });
      }
    }
    return jsonError('id no encontrado: ' + id);
  } catch (error) {
    return jsonError(error.message);
  }
}


// ============================================================================
// LIBRO MAYOR — sheet dedicado, CRUD por id (v2.7)
// ============================================================================

function getLibroMayorSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LIBRO_MAYOR_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LIBRO_MAYOR_SHEET_NAME);
    sheet.appendRow(LIBRO_MAYOR_HEADERS);
    sheet.getRange(1, 1, 1, LIBRO_MAYOR_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function handleGetLibroMayor() {
  try {
    const data = getLibroMayorSheet().getDataRange().getValues();
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      entries.push({
        id:        String(row[0]),
        fecha:     row[1] instanceof Date ? row[1].toISOString().slice(0,10) : String(row[1] || ''),
        concepto:  String(row[2] || ''),
        cantidad:  Number(row[3]) || 0,
        tipo:      String(row[4] || 'gasto'),
        categoria: String(row[5] || 'gasto_misc'),
        nota:      String(row[6] || ''),
        jugador:   String(row[7] || ''),
      });
    }
    return jsonOk({ entries });
  } catch (error) {
    return jsonError(error.message, { entries: [] });
  }
}

function handleSaveLibroMayor(data) {
  try {
    const sheet = getLibroMayorSheet();
    const id = (data.id || '').toString().trim() || ('lm_' + Date.now());
    const row = [
      id,
      String(data.fecha     || new Date().toISOString().slice(0,10)),
      String(data.concepto  || ''),
      Number(data.cantidad) || 0,
      String(data.tipo      || 'gasto'),
      String(data.categoria || 'gasto_misc'),
      String(data.nota      || ''),
      String(data.jugador   || ''),
    ];
    const all = sheet.getDataRange().getValues();
    let filaIdx = -1;
    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]) === id) { filaIdx = i; break; }
    }
    if (filaIdx >= 0) {
      sheet.getRange(filaIdx + 1, 1, 1, LIBRO_MAYOR_HEADERS.length).setValues([row]);
      return jsonOk({ msg: 'LibroMayor actualizado', id });
    } else {
      sheet.appendRow(row);
      return jsonOk({ msg: 'LibroMayor creado', id });
    }
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleDeleteLibroMayor(id) {
  try {
    if (!id) return jsonError('Falta id');
    const sheet = getLibroMayorSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonOk({ msg: 'LibroMayor borrado', id });
      }
    }
    return jsonError('id no encontrado: ' + id);
  } catch (error) {
    return jsonError(error.message);
  }
}


// ============================================================================
// PERSONAL — sheet dedicado, CRUD por id (v2.7)
// ============================================================================

function getPersonalSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PERSONAL_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PERSONAL_SHEET_NAME);
    sheet.appendRow(PERSONAL_HEADERS);
    sheet.getRange(1, 1, 1, PERSONAL_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function handleGetPersonal() {
  try {
    const data = getPersonalSheet().getDataRange().getValues();
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      entries.push({
        id:        String(row[0]),
        rol:       String(row[1] || 'otros'),
        nombre:    String(row[2] || ''),
        nivel:     String(row[3] || 'regular'),
        sueldoMes: Number(row[4]) || 0,
        fechaAlta: row[5] instanceof Date ? row[5].toISOString().slice(0,10) : String(row[5] || ''),
        estado:    String(row[6] || 'activo'),
        nota:      String(row[7] || ''),
        cantidad:  Number(row[8]) || 1,
      });
    }
    return jsonOk({ entries });
  } catch (error) {
    return jsonError(error.message, { entries: [] });
  }
}

function handleSavePersonal(data) {
  try {
    const sheet = getPersonalSheet();
    const id = (data.id || '').toString().trim() || ('pers_' + Date.now());
    const row = [
      id,
      String(data.rol       || 'otros'),
      String(data.nombre    || ''),
      String(data.nivel     || 'regular'),
      Number(data.sueldoMes) || 0,
      String(data.fechaAlta || new Date().toISOString().slice(0,10)),
      String(data.estado    || 'activo'),
      String(data.nota      || ''),
      Number(data.cantidad) || 1,
    ];
    const all = sheet.getDataRange().getValues();
    let filaIdx = -1;
    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]) === id) { filaIdx = i; break; }
    }
    if (filaIdx >= 0) {
      sheet.getRange(filaIdx + 1, 1, 1, PERSONAL_HEADERS.length).setValues([row]);
      return jsonOk({ msg: 'Personal actualizado', id });
    } else {
      sheet.appendRow(row);
      return jsonOk({ msg: 'Personal creado', id });
    }
  } catch (error) {
    return jsonError(error.message);
  }
}

function handleDeletePersonal(id) {
  try {
    if (!id) return jsonError('Falta id');
    const sheet = getPersonalSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonOk({ msg: 'Personal borrado', id });
      }
    }
    return jsonError('id no encontrado: ' + id);
  } catch (error) {
    return jsonError(error.message);
  }
}


// ============================================================================
// MECH POR JUGADOR
// ============================================================================

function handleGetMechPorJugador(jugador) {
  try {
    if (!jugador) return jsonError('Falta jugador', { mech: '' });
    const target = jugador.trim().toLowerCase();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    try {
      const personajes = ss.getSheetByName(SHEET_PERSONAJES);
      if (personajes) {
        const data = personajes.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const jug = (row[COL_PERSONAJES.JUGADOR] || '').toString().trim().toLowerCase();
          if (jug === target) {
            const mech = (row[COL_PERSONAJES.MECH] || '').toString().trim();
            if (mech) return jsonOk({ mech, fuente: 'Personajes' });
            break;
          }
        }
      }
    } catch (e) { Logger.log('⚠️ Error leyendo Personajes: ' + e.message); }

    try {
      const unidad = ss.getSheetByName('Unidad');
      if (unidad) {
        const data = unidad.getRange('B3:C10').getValues();
        for (const [nombre, mech] of data) {
          if ((nombre || '').toString().trim().toLowerCase() === target && mech) {
            return jsonOk({ mech: mech.toString().trim(), fuente: 'Unidad' });
          }
        }
      }
    } catch (e) { Logger.log('⚠️ Error leyendo Unidad: ' + e.message); }

    return jsonOk({ mech: '', fuente: 'none' });
  } catch (error) {
    return jsonError(error.message, { mech: '' });
  }
}


// ============================================================================
// HISTORIAL / LOGROS
// ============================================================================

function handleGetHistorial() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(HISTORIAL_SHEET_NAME);
    if (!sheet) return jsonError('No existe la hoja ' + HISTORIAL_SHEET_NAME, { historial: [] });

    const data = sheet.getDataRange().getValues();
    const headers = data[0] || [];
    const historial = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const entry = { jugadores: {} };
      headers.forEach((h, j) => {
        const key = (h || '').toString().trim();
        if (!key) return;
        entry[key.toLowerCase()] = row[j];
        if (j >= 3 && key) entry.jugadores[key] = row[j];
      });
      historial.push(entry);
    }
    historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return jsonOk({ historial });
  } catch (error) {
    return jsonError(error.message, { historial: [] });
  }
}

function handleGetLogros() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOGROS_SHEET_NAME);
    if (!sheet) return jsonError('No existe la hoja ' + LOGROS_SHEET_NAME, { logros: [] });

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return jsonOk({ logros: [], jugadores: [] });

    const headers = data[0];
    const jugadores = [];
    for (let j = 3; j < headers.length; j++) {
      const h = (headers[j] || '').toString().trim();
      if (h) jugadores.push({ jugador: h, col: j });
    }

    const logros = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const jugadoresMap = {};
      jugadores.forEach(({ jugador, col }) => {
        const val = row[col];
        if (val !== '' && val !== null && val !== undefined) jugadoresMap[jugador] = val;
      });
      logros.push({
        logro: row[0],
        descripcion: row[1] || '',
        icono: row[2] || '🎖️',
        jugadores: jugadoresMap
      });
    }
    return jsonOk({ logros, jugadores: jugadores.map(j => j.jugador) });
  } catch (error) {
    return jsonError(error.message, { logros: [] });
  }
}


// ============================================================================
// AUXILIARES JSON
// ============================================================================

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

function jsonOk(extras) {
  return createJsonResponse({ result: 'success', success: true, ...extras });
}

function jsonError(msg, extras) {
  return createJsonResponse({ result: 'error', success: false, msg, error: msg, ...(extras || {}) });
}


// ============================================================================
// ============================================================================
//  TELEGRAM BOT
// ============================================================================
// ============================================================================

// ── Config readers ─────────────────────────────────────────────────

function getConfig(key) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONFIGURACION_SHEET_NAME);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) return data[i][1];
  }
  return null;
}

function tgEnabled()  { return String(getConfig('TELEGRAM_ENABLED')) === '1'; }
function tgToken()    { return String(getConfig('TELEGRAM_BOT_TOKEN') || ''); }
function tgChatId()   { return String(getConfig('TELEGRAM_CHAT_ID')   || ''); }
function tgAdminId()  { return String(getConfig('TELEGRAM_ADMIN_ID')  || ''); }
function tgUmbral()   {
  const n = parseInt(getConfig('TELEGRAM_UMBRAL'), 10);
  return Number.isFinite(n) ? n : 100000;
}

/** Devuelve objeto {user_id: nombre} leyendo todas las claves PJ_TG_*. */
function tgPJMap() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONFIGURACION_SHEET_NAME);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const out = {};
  for (let i = 0; i < data.length; i++) {
    const k = String(data[i][0] || '').trim();
    if (k.indexOf('PJ_TG_') === 0) {
      const uid = String(data[i][1] || '').trim();
      const nombre = k.substring('PJ_TG_'.length).replace(/_/g, ' ');
      if (uid) out[uid] = nombre;
    }
  }
  return out;
}

function tgIsPJ(userId)             { return !!tgPJMap()[String(userId)]; }
function tgIsAdmin(userId)          { return String(userId) === tgAdminId(); }
function tgIsAuthorized(userId)     { return tgIsAdmin(userId) || tgIsPJ(userId); }
function tgPJNameFromUserId(userId) { return tgPJMap()[String(userId)] || null; }

/** True si user_id está en TG_XP_USERS (CSV en Configuracion). */
function tgIsXPAuthorized(userId) {
  const raw = String(getConfig('TG_XP_USERS') || '');
  if (!raw) return false;
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(String(userId));
}

// ── Telegram API wrappers ──────────────────────────────────────────

function tgSendMessage(chatId, text, opts) {
  opts = opts || {};
  const token = tgToken();
  if (!token) return { success: false, error: 'no_token' };
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: opts.parse_mode || 'Markdown',
    disable_web_page_preview: opts.preview === false,
  };
  if (opts.reply_markup) payload.reply_markup = opts.reply_markup;
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const body = JSON.parse(res.getContentText());
    return { success: !!body.ok, response: body };
  } catch (e) {
    console.error('tgSendMessage err:', e);
    return { success: false, error: String(e) };
  }
}

function tgInlineKb(buttons) { return { inline_keyboard: buttons }; }

function fmtMoney(n) { return Number(n || 0).toLocaleString('es-ES') + ' ₡'; }

// ── Setup helpers (ejecutar manualmente desde el editor) ──────────

function tgSetWebhook() {
  const token = tgToken();
  if (!token) { console.error('No TELEGRAM_BOT_TOKEN en Configuracion'); return; }
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(TELEGRAM_WEBAPP_URL)}`;
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  console.log('setWebhook:', r.getContentText());
}

function tgGetWebhookInfo() {
  const token = tgToken();
  const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  console.log('webhookInfo:', r.getContentText());
}

function tgDeleteWebhook() {
  const token = tgToken();
  const url = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  console.log('deleteWebhook:', r.getContentText());
}

/** Reset completo: borra webhook + vacía cola + espera + setea de nuevo. */
function resetWebhookNuclear() {
  const token = tgToken();
  if (!token) { console.error('No token'); return; }

  const delUrl = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;
  UrlFetchApp.fetch(delUrl, { muteHttpExceptions: true });
  console.log('Webhook borrado y cola limpia.');

  Utilities.sleep(2000);

  const setUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(TELEGRAM_WEBAPP_URL)}`;
  const r = UrlFetchApp.fetch(setUrl, { muteHttpExceptions: true });
  console.log('Resultado final:', r.getContentText());
}

// ── Handler saliente (web → bot → grupo) ──────────────────────────

function handleTelegramSend(body) {
  if (!tgEnabled()) return { success: false, error: 'tg_disabled' };
  const chatId = tgChatId();
  if (!chatId) return { success: false, error: 'no_chat_id' };

  const data = typeof body.data === 'string' ? JSON.parse(body.data || '{}') : (body.data || {});
  let texto = '';

  switch (body.event) {
    case 'mision_cerrada':
      texto = `🛡️ *MISIÓN CERRADA* · ${data.fecha || ''}\n` +
              `Tipo: ${data.missionType || '—'}\n` +
              `Balance: ${fmtMoney(data.balance)} ${(data.balance || 0) >= 0 ? '🟢' : '🔴'}\n` +
              (data.pjTopXP ? `Destacado: ${data.pjTopXP} (+${data.xp || 0} XP)` : '');
      break;

    case 'libro_mayor_relevante':
      texto = `${data.tipo === 'ingreso' ? '➕' : '➖'} *${data.concepto || ''}*\n` +
              `Cantidad: ${fmtMoney(data.cantidad)}\n` +
              `Categoría: ${data.categoria || '—'}`;
      break;

    case 'tesoreria_grande':
      texto = `⚠️ *MOVIMIENTO GRANDE*\n${data.concepto || ''}\n` +
              `${data.tipo === 'ingreso' ? '➕' : '➖'} ${fmtMoney(data.cantidad)}`;
      break;

    case 'cronica_nueva': {
      const cuerpo = String(data.cuerpo || '').substring(0, 200);
      texto = `📖 *NUEVA CRÓNICA* · ${data.fechaCampaign || ''}\n` +
              `*${data.titulo || ''}*\n— por ${data.autorNombre || ''}\n\n` +
              cuerpo + (data.cuerpo && data.cuerpo.length > 200 ? '...' : '');
      break;
    }

    case 'parte_nuevo':
      texto = `📋 *PARTE DEL DÍA* · ${data.fechaCampaign || ''}\n` +
              `${data.autorNombre || ''}: ${String(data.resumen || '').substring(0, 150)}`;
      break;

    default:
      return { success: false, error: 'unknown_event' };
  }

  const opts = {};
  if (data.linkUrl) {
    opts.reply_markup = tgInlineKb([[{ text: data.linkLabel || 'Ver más', url: data.linkUrl }]]);
  }
  return tgSendMessage(chatId, texto, opts);
}

// ── Handler entrante (Telegram webhook → bot) ─────────────────────

function handleTelegramUpdate(update) {
  if (!update || !update.message || !update.message.text) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = String(msg.text).trim();

  // === FLUJO ACTIVO: si user está en medio de un flow, atrapar TODO ===
  if (tgGetState(userId)) {
    if (handleFlowMessage(chatId, userId, text)) return;
  }

  if (!text.startsWith('/')) return;

  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@\w+$/, '');
  const args = parts.slice(1).join(' ');

  if (!tgIsAuthorized(userId)) {
    tgSendMessage(chatId, '🚫 No autorizado. Habla con el admin.\nTu user_id: `' + userId + '`');
    return;
  }

  switch (cmd) {
    case '/help':         return cmdHelp(chatId, userId);
    case '/roster':       return cmdRoster(chatId);
    case '/tesoreria':    return cmdTesoreria(chatId);
    case '/cronica':      return cmdCronica(chatId);
    case '/parte':        return cmdParte(chatId, userId, args);
    case '/subirxp':      return cmdSubirXP(chatId, userId);
    case '/cancelar':     return cmdCancelar(chatId, userId);
    case '/backup':       if (tgIsAdmin(userId)) return cmdBackup(chatId); break;
    case '/anuncio':      if (tgIsAdmin(userId)) return cmdAnuncio(chatId, args); break;
    case '/resetcampana': if (tgIsAdmin(userId)) return cmdResetConfirm(chatId, args); break;
    default:
      tgSendMessage(chatId, 'Comando desconocido. /help para lista.');
      return;
  }
  tgSendMessage(chatId, '🚫 No tienes permisos para ese comando.');
}

// ── Comandos ──────────────────────────────────────────────────────

function cmdHelp(chatId, userId) {
  let txt =
    '*Comandos disponibles:*\n' +
    '/roster — estado pilotos\n' +
    '/tesoreria — saldo + últimos movimientos\n' +
    '/cronica — últimas crónicas\n' +
    '/parte <texto> — registrar parte diario\n' +
    '/cancelar — abortar flujo activo\n' +
    '/help — esta ayuda';
  if (tgIsXPAuthorized(userId)) {
    txt += '\n/subirxp — subir XP jugador a jugador';
  }
  if (tgIsAdmin(userId)) {
    txt += '\n\n*Admin:*\n/backup · /anuncio <texto> · /resetcampana CONFIRMAR';
  }
  tgSendMessage(chatId, txt);
}

function cmdRoster(chatId) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PERSONAJES);
    if (!sheet) { tgSendMessage(chatId, '❌ Hoja Personajes no encontrada'); return; }
    const data = sheet.getDataRange().getValues();
    const lines = ['🪖 *ROSTER*'];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nombre = (row[COL_PERSONAJES.NOMBRE] || '').toString().trim();
      if (!nombre) continue;
      const estado = (row[COL_PERSONAJES.ESTADO] || 'activo').toString().toLowerCase();
      if (estado && estado !== 'activo') continue;
      const apodo = (row[COL_PERSONAJES.APODO] || '').toString().trim();
      const mech = (row[COL_PERSONAJES.MECH] || '').toString().trim();
      const xp = Number(row[COL_PERSONAJES.XP_TOTAL]) || 0;
      lines.push(`• ${nombre}${apodo ? ' "' + apodo + '"' : ''} — ${mech || '—'} · XP ${xp}`);
    }
    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error: ' + e.message);
  }
}

function cmdTesoreria(chatId) {
  try {
    const saldo = String(getConfig('CONTRATO_VALOR') || '—');
    let lines = ['💰 *TESORERÍA*', `Saldo: ${saldo} ₡`, '', '*Últimos movimientos:*'];

    try {
      const sheet = getLibroMayorSheet();
      const data = sheet.getDataRange().getValues();
      const rows = data.slice(1).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, 5);
      if (rows.length === 0) {
        lines.push('— sin movimientos —');
      } else {
        rows.forEach(r => {
          const sign = String(r[4]) === 'ingreso' ? '+' : '−';
          lines.push(`• ${r[1]} ${sign}${fmtMoney(r[3])} ${r[2]}`);
        });
      }
    } catch (e) {
      lines.push('— error leyendo libro mayor —');
    }

    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error: ' + e.message);
  }
}

function cmdCronica(chatId) {
  try {
    const sheet = getCronicasSheet();
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1)
      .filter(r => r[0])
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, 3);
    const lines = ['📖 *ÚLTIMAS CRÓNICAS*'];
    if (rows.length === 0) lines.push('— sin entradas —');
    rows.forEach(r => {
      lines.push(`• *${r[8] || '—'}* — ${r[6] || r[5] || '—'}`);
    });
    tgSendMessage(chatId, lines.join('\n'));
  } catch (e) {
    tgSendMessage(chatId, '❌ Error: ' + e.message);
  }
}

function cmdParte(chatId, userId, texto) {
  if (!texto || texto.length < 3) {
    tgSendMessage(chatId, 'Uso: `/parte <texto del parte>`');
    return;
  }
  const autor = tgPJNameFromUserId(userId) || 'Desconocido';
  try {
    handleSaveParteDiario({
      id: '',
      ts: Date.now(),
      text: `[${autor} via Telegram] ${texto}`,
      tone: 'info',
    });
    tgSendMessage(chatId, `✅ Parte registrado para *${autor}*`);
  } catch (e) {
    tgSendMessage(chatId, '❌ Error guardando: ' + e.message);
  }
}

function cmdBackup(chatId) {
  tgSendMessage(chatId, '💾 Backup ejecutado (placeholder — hookear con sistema snapshot).');
}

function cmdAnuncio(chatId, texto) {
  if (!texto) { tgSendMessage(chatId, 'Uso: `/anuncio <texto>`'); return; }
  tgSendMessage(tgChatId(), `📣 *ANUNCIO*\n${texto}`);
}

function cmdResetConfirm(chatId, args) {
  if (String(args).trim() === 'CONFIRMAR') {
    tgSendMessage(chatId, '⚠️ Reset NO ejecutado (función no implementada por seguridad).');
  } else {
    tgSendMessage(chatId,
      '⚠️ Reset campaña requiere confirmación.\n' +
      'Envía: `/resetcampana CONFIRMAR`');
  }
}


// ════════════════════════════════════════════════════════════════
//  STATE MACHINE — flujos conversacionales por usuario (v2.9)
//  Usa PropertiesService.scriptProperties como storage (compartido).
//  Clave: tg_state_<userId>. Valor: JSON con flow/step/collected.
// ════════════════════════════════════════════════════════════════

function tgGetState(userId) {
  const raw = PropertiesService.getScriptProperties().getProperty('tg_state_' + userId);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function tgSetState(userId, state) {
  PropertiesService.getScriptProperties().setProperty('tg_state_' + userId, JSON.stringify(state));
}
function tgClearState(userId) {
  PropertiesService.getScriptProperties().deleteProperty('tg_state_' + userId);
}

/** Dispatcher: procesa msg si user está en flow. Devuelve true si consumió el msg. */
function handleFlowMessage(chatId, userId, text) {
  const state = tgGetState(userId);
  if (!state) return false;

  // Permitir /cancelar siempre dentro de un flow
  if (text.toLowerCase() === '/cancelar') {
    tgClearState(userId);
    tgSendMessage(chatId, '❌ Flujo cancelado.');
    return true;
  }

  // /help también escapa del flow
  if (text.toLowerCase() === '/help') {
    return false;
  }

  switch (state.flow) {
    case 'subirxp': return flowSubirXP(chatId, userId, text, state);
    default:
      tgClearState(userId);
      return false;
  }
}

// ── /subirxp — flujo conversacional (RESTRINGIDO a TG_XP_USERS) ──

function cmdSubirXP(chatId, userId) {
  if (!tgIsXPAuthorized(userId)) {
    tgSendMessage(chatId,
      '🚫 Solo el DM puede subir XP.\nTu user_id: `' + userId + '`');
    return;
  }
  tgSetState(userId, {
    flow: 'subirxp',
    step: 0,
    players: TG_PLAYERS,
    collected: {},
  });
  tgSendMessage(chatId,
    `📈 *Subir XP*\n\n¿Cuánto XP gana *${TG_PLAYERS[0]}*?\n\n` +
    `_Envía solo el número. /cancelar para abortar._`);
}

function cmdCancelar(chatId, userId) {
  if (tgGetState(userId)) {
    tgClearState(userId);
    tgSendMessage(chatId, '❌ Flujo cancelado.');
  } else {
    tgSendMessage(chatId, 'No hay flujo activo.');
  }
}

function flowSubirXP(chatId, userId, text, state) {
  const n = parseInt(text, 10);
  if (!Number.isFinite(n)) {
    tgSendMessage(chatId, '⚠️ Envía solo un número entero. /cancelar para abortar.');
    return true;
  }

  const currentPlayer = state.players[state.step];
  state.collected[currentPlayer] = n;
  state.step++;

  if (state.step < state.players.length) {
    tgSetState(userId, state);
    const next = state.players[state.step];
    tgSendMessage(chatId,
      `✅ *${currentPlayer}*: +${n} XP\n\n¿Cuánto XP gana *${next}*?`);
    return true;
  }

  // Finalizado: aplicar y reportar
  tgClearState(userId);
  const report = applyXPSubida(state.collected);
  tgSendMessage(chatId, report);
  return true;
}

/** Escribe XP en Respuestas de formulario 1 y lee Personajes para reporte. */
function applyXPSubida(xpMap) {
  try {
    appendRegistroRow({
      xpMap: xpMap,
      tipo: 'Telegram',
      descripcion: 'Subida XP vía Telegram'
    });
  } catch (e) {
    return '❌ Error escribiendo XP: ' + e.message;
  }

  // Esperar un instante para que recalculen fórmulas si las hay
  SpreadsheetApp.flush();
  Utilities.sleep(500);

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PERSONAJES);
  const data = sheet.getDataRange().getValues();
  const lines = ['✅ *XP REGISTRADO*'];

  Object.entries(xpMap).forEach(function (entry) {
    const jugador = entry[0];
    const ganado = entry[1];

    let pj = null;
    let pjNombre = '';
    for (let i = 1; i < data.length; i++) {
      const j = String(data[i][COL_PERSONAJES.JUGADOR] || '').trim();
      const estado = String(data[i][COL_PERSONAJES.ESTADO] || 'activo').toLowerCase();
      if (j.toLowerCase() === String(jugador).toLowerCase() && (estado === '' || estado === 'activo')) {
        pj = data[i];
        pjNombre = String(data[i][COL_PERSONAJES.NOMBRE] || jugador).trim();
        break;
      }
    }

    if (pj) {
      const total = Number(pj[COL_PERSONAJES.XP_TOTAL]) || 0;
      const disp  = Number(pj[COL_PERSONAJES.XP_DISPONIBLE]) || 0;
      lines.push(`\n*${jugador}* (${pjNombre})`);
      lines.push(`  Ganado: +${ganado} XP`);
      lines.push(`  Total:     ${total}`);
      lines.push(`  Disponible: ${disp}`);
    } else {
      lines.push(`\n*${jugador}*: +${ganado} XP _(no encontrado en Personajes)_`);
    }
  });

  return lines.join('\n');
}

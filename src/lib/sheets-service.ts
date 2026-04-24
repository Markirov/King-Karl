// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS SERVICE — Apps Script backend communication
// ═══════════════════════════════════════════════════════════════

function getUrl(): string {
  return localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM') ||
    'https://script.google.com/macros/s/AKfycbyAAh-lYB1L72hTH72lpYDD0mcaAyeERLjJp1e0Ar0hhuZK8TszJdu-qmlN_cwi4sEncQ/exec';
}

export async function sheetsGet(params: Record<string, string>) {
  const url = new URL(getUrl());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    return { success: true, data: await res.json() };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function sheetsPost(body: Record<string, any>) {
  try {
    // text/plain avoids CORS preflight — Apps Script reads e.postData.contents the same way
    const res = await fetch(getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    });
    return { success: true, data: await res.json() };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export const loadConfig      = ()              => sheetsGet({ action: 'getConfiguracion' });
export const loadPlayer      = (name: string)  => sheetsGet({ jugador: name });
export const savePlayer      = (data: any)     => sheetsPost({ action: 'guardarJugador', ...data });
export const loadUnitSheet   = (name: string)  => sheetsGet({ action: 'getHojaUnidad', jugador: name });
export const searchPilots    = (name: string)  => sheetsGet({ jugador: name });
export const savePilot       = (data: any)     => sheetsPost(data);
export const registerImprovement = (jugador: string, xpGastado: number, mejora: string) =>
  sheetsGet({
    action: 'registrarMejora',
    jugador,
    fechaHora: new Date().toLocaleString('es-ES'),
    xpGastado: String(-Math.abs(xpGastado)),
    mejora,
    tipo: 'Subidas',
  });

export const registerMission = (xp: Record<string, number>, dinero: number, gastos: number) =>
  sheetsGet({
    action: 'registrarMision',
    xpMarcos: String(xp['Marcos'] ?? 0),
    xpJaime:  String(xp['Jaime']  ?? 0),
    xpJoan:   String(xp['Joan']   ?? 0),
    xpJuan:   String(xp['Juan']   ?? 0),
    dineroGanado: String(dinero),
    gastos:       String(gastos),
  });

export const registerXPExpense = (jugador: string, cantidad: number, descripcion: string) =>
  sheetsGet({
    action: 'registrarGastoXP',
    jugador,
    cantidad: String(cantidad),
    descripcion,
  });

export const saveConfigBatch = (config: Record<string, string>) =>
  sheetsGet({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify(config),
  });

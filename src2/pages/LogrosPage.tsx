// ══════════════════════════════════════════════════════════════
//  LOGROS — Medallas otorgadas a pilotos
//  Fuente: pestaña "Logros" en Sheets via endpoint getLogros.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { loadLogros } from '@/lib/sheets-service';
import { pilotSlug, findByJugador } from '@/lib/roster';
import { Loader } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

interface Logro {
  logro:       string;
  descripcion: string;
  icono:       string;
  jugadores:   Record<string, any>;  // {Marcos: "X", Jaime: "✓"} u otro valor truthy
}

export function LogrosPage() {
  const { roster } = useAppStore();
  const [logros, setLogros] = useState<Logro[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLogros()
      .then(res => {
        if (cancelled) return;
        if (!res.success) {
          setErr(res.error ?? 'Error de red');
          setLogros([]);
          return;
        }
        const list = res.data?.logros;
        if (!Array.isArray(list)) {
          setErr(res.data?.msg ?? 'Respuesta inesperada');
          setLogros([]);
          return;
        }
        setLogros(list);
      })
      .catch(e => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mb-6">
          Logros
        </h1>
        <div className="flex items-center justify-center min-h-[40vh] gap-2 font-mono text-[11px] text-outline tracking-[2px] uppercase">
          <Loader size={14} className="animate-spin" /> Cargando logros…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mb-6">
          Logros
        </h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 opacity-60">
          <span className="text-4xl">⚠️</span>
          <span className="font-mono text-[10px] text-error tracking-[2px] uppercase">
            {err}
          </span>
        </div>
      </div>
    );
  }

  if (logros.length === 0) {
    return (
      <div className="p-6 animate-[fadeInUp_0.3s_ease]">
        <h1 className="font-headline text-xl font-black text-primary-container tracking-tighter uppercase mb-6">
          Logros
        </h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 opacity-60">
          <span className="text-5xl">🎖️</span>
          <span className="font-mono text-[11px] text-outline tracking-[2px] uppercase">
            Sin logros registrados — añade filas a Logros sheet
          </span>
        </div>
      </div>
    );
  }

  // Total por jugador
  const totalsByJugador: Record<string, number> = {};
  logros.forEach(l => {
    Object.entries(l.jugadores).forEach(([jug, val]) => {
      if (val !== '' && val !== null && val !== undefined && val !== 0 && val !== false) {
        totalsByJugador[jug] = (totalsByJugador[jug] ?? 0) + 1;
      }
    });
  });

  return (
    <div className="p-6 pb-20 animate-[fadeInUp_0.3s_ease]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 pb-4 border-b border-outline-variant/20">
          <h1 className="font-headline text-3xl font-black text-primary-container tracking-tighter uppercase">
            Logros & Medallas
          </h1>
          <p className="font-mono text-[10px] text-outline tracking-[2px] uppercase mt-1">
            {logros.length} {logros.length === 1 ? 'logro registrado' : 'logros registrados'}
          </p>
        </div>

        {/* Tabla resumen por piloto */}
        {Object.keys(totalsByJugador).length > 0 && (
          <div className="mb-8 bg-surface-container-low/60 border border-outline-variant/20 p-4">
            <div className="font-mono text-[10px] text-secondary tracking-[3px] uppercase mb-3">
              Distinciones por piloto
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(totalsByJugador)
                .sort((a, b) => b[1] - a[1])
                .map(([jug, count]) => {
                  const r = findByJugador(roster, jug);
                  const display = r?.apodo || r?.nombre || jug;
                  return (
                    <div key={jug}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-container/40 border border-outline-variant/20">
                      <img src={`${BASE}pilot-${pilotSlug(jug)}.png`} alt=""
                        className="w-8 h-8 object-cover object-top border border-outline-variant/30"
                        onError={e => { (e.currentTarget as HTMLImageElement).src = `${BASE}pilot-generic.png`; }}
                      />
                      <div>
                        <div className="font-headline text-[11px] font-bold uppercase tracking-widest text-primary-container">
                          {display}
                        </div>
                        <div className="font-mono text-[9px] text-outline">
                          {count} {count === 1 ? 'medalla' : 'medallas'}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Grid logros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {logros.map((l, i) => {
            const winners = Object.entries(l.jugadores).filter(
              ([, val]) => val !== '' && val !== null && val !== undefined && val !== 0 && val !== false
            );
            return (
              <div key={i}
                className="bg-surface-container-low/60 border border-outline-variant/20 hover:border-primary-container/40 transition-all p-4 flex flex-col gap-3">
                {/* Icono + título */}
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0 leading-none">{l.icono}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-sm font-bold text-primary-container uppercase tracking-wider leading-tight">
                      {l.logro}
                    </h3>
                    {l.descripcion && (
                      <p className="font-mono text-[10px] text-on-surface-variant/70 mt-1 leading-relaxed">
                        {l.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ganadores */}
                <div className="border-t border-outline-variant/10 pt-2">
                  {winners.length === 0 ? (
                    <span className="font-mono text-[9px] text-outline/50 tracking-widest uppercase">
                      Sin otorgar
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[8px] text-outline tracking-[2px] uppercase mr-1">
                        Otorgado:
                      </span>
                      {winners.map(([jug, val]) => {
                        const r = findByJugador(roster, jug);
                        const display = r?.apodo || r?.nombre || jug;
                        const valStr = String(val).trim();
                        const isNumeric = !isNaN(Number(valStr)) && valStr !== '';
                        return (
                          <div key={jug}
                            title={`${display} — ${valStr}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-container/60 border border-primary-container/30">
                            <img src={`${BASE}pilot-${pilotSlug(jug)}.png`} alt=""
                              className="w-5 h-5 object-cover object-top"
                              onError={e => { (e.currentTarget as HTMLImageElement).src = `${BASE}pilot-generic.png`; }}
                            />
                            <span className="font-mono text-[9px] text-on-surface-variant truncate max-w-20">
                              {display}
                            </span>
                            {isNumeric && Number(valStr) > 1 && (
                              <span className="font-headline text-[9px] font-bold text-primary-container">
                                ×{valStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PORTADA — Splash screen con scan laser + mech reveal
//  Basado en: index HTML.html (portada original King Karl)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { VERSION_DISPLAY } from '@/version';

const SCAN_CYCLE_MS = 14000;
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'] as const;

// ── Datos de los 5 mechs icónicos (del original index HTML.html) ──
const ICONIC_MECHS = [
  {
    key:       'marauder',
    fullName:  'GM MAD-3D MARAUDER',
    chassis:   'GM Marauder (Pesado)',
    mass:      '75 Toneladas',
    engine:    'Vlar 300 Fusión',
    speed:     '43.2 / 64.8 km/h',
    armor:     '11.5 Toneladas Valiant Lamellor',
    heatsinks: '20 Disipadores',
    weapons:   '2× PPC · 1× LL · 2× ML',
    desc:      'El MAD-3D es una plataforma de asalto pesado que destaca por su diseño de cero munición. Internamente reconfigurado para albergar un tercer gran láser en lugar del cañón automático tradicional. Francotirador de energía capaz de mantener cadencia de fuego constante mientras sus disipadores aguanten el castigo.',
    history:   'Respuesta directa de los Soles Federados a la escasez de repuestos durante las Guerras de Sucesión. Mientras el MAD-3R sufría por la vulnerabilidad de su depósito de munición, el 3D de GM se ganó reputación de inmortal. Ancestro espiritual del MAD-5D con ER PPCs durante la Invasión de los Clanes.',
  },
  {
    key:       'warhammer',
    fullName:  'STARCORPS WHM-6D WARHAMMER',
    chassis:   'StarCorps 100 (Pesado)',
    mass:      '70 Toneladas',
    engine:    'VOX 280 Fusión',
    speed:     '43.2 / 64.8 km/h',
    armor:     '13 Toneladas Leviathon Plus',
    heatsinks: '20 Disipadores',
    weapons:   '2× PPC · 2× ML · 2× SL',
    desc:      'El WHM-6D es la versión limpia y blindada del Warhammer. Al eliminar las ametralladoras y los SRM del modelo estándar, utiliza el tonelaje sobrante para maximizar protección y capacidad de enfriamiento. Mech de línea puro diseñado para plantar cara al enemigo.',
    history:   'Fabricado para la Mancomunidad de Lira, el 6D corrigió el mayor defecto del Warhammer original: su fragilidad ante el fuego concentrado. StarCorps logró un diseño tan robusto que muchos pilotos veteranos se negaron a actualizarse a modelos más modernos.',
  },
  {
    key:       'battlemaster',
    fullName:  'EARTHWERKS BLR-1G BATTLEMASTER',
    chassis:   'Hollis Hard Core (Asalto)',
    mass:      '85 Toneladas',
    engine:    'VOX 340 Fusión',
    speed:     '43.2 / 64.8 km/h',
    armor:     '14.5 Toneladas StarGuard IV',
    heatsinks: '18 Disipadores',
    weapons:   '1× PPC · 6× ML · 1× SRM-6 · 2× MG',
    desc:      'El BLR-1G es una fortaleza andante. Su armamento asimétrico y versátil le permite castigar a larga distancia con su PPC y devastar a corta distancia con seis láseres medios. Su cabina ofrece visibilidad y sistemas de mando superiores para coordinar batallones.',
    history:   'Originalmente una creación de Hollis Industries, la producción pasó a Earthwerks y se convirtió en el mech de asalto más distribuido de la Esfera Interior. Su eficiencia inspiró variantes regionales como el BLR-1D y el sofisticado BLR-3S. Rey de los campos de batalla en la era de LosTech.',
  },
  {
    key:       'locust',
    fullName:  'BERGAN LCT-1V LOCUST',
    chassis:   'Bergan VII (Ligero)',
    mass:      '20 Toneladas',
    engine:    'LTV 160 Fusión',
    speed:     '86.4 / 129.6 km/h',
    armor:     '4 Toneladas StarSlab/1',
    heatsinks: '10 Disipadores',
    weapons:   '1× ML · 2× MG',
    desc:      'El LCT-1V es la definición de velocidad sobre blindaje. Con piernas digitígradas diseñadas para estabilidad a altas velocidades, sacrifica protección por agilidad inigualable. Su armamento está optimizado para combate antipersonal y hostigamiento rápido.',
    history:   'Introducido en 2499, el Locust de Bergan se convirtió en el estándar de oro de los mechs ligeros. Su bajo coste lo hizo omnipresente en todas las Grandes Casas durante siglos. Variantes como el LCT-1E eliminan toda dependencia de munición.',
  },
  {
    key:       'wasp',
    fullName:  'GENERAL MECHANICS WSP-1A WASP',
    chassis:   '1A Type 3 (Ligero)',
    mass:      '20 Toneladas',
    engine:    'GM 120 Fusión',
    speed:     '64.8 / 97.2 km/h · Salto: 180m',
    armor:     '3 Toneladas Durallex Light',
    heatsinks: '10 Disipadores',
    weapons:   '1× ML · 1× SRM-2',
    desc:      'El WSP-1A es un mech ligero equilibrado que prioriza la movilidad vertical. A diferencia del Locust, cuenta con manos funcionales y chorros de salto integrados. Su armamento mixto lo hace útil en sabotaje y reconocimiento en terreno montañoso o urbano.',
    history:   'Como el primer BattleMech producido en masa con capacidad de salto, el Wasp cambió la guerra para siempre. Es, estadísticamente, el mech más común en la historia de la humanidad. Base de diseño para su hermano mayor, el Stinger, con quien comparte logística de piezas.',
  },
] as const;

// Imágenes por mech key — scan (centro) y sidebar (blueprint panel)
function mechScanImg(key: string, base: string): string {
  const known = ['marauder', 'warhammer', 'battlemaster', 'locust', 'wasp'];
  if (known.includes(key)) return `${base}assets/svg/${key}-scan.svg`;
  return `${base}mech-blueprint.png`;
}

function mechSidebarImg(key: string, base: string): string {
  const known = ['marauder', 'warhammer', 'battlemaster', 'locust', 'wasp'];
  if (known.includes(key)) return `${base}assets/svg/${key}-sidebar.svg`;
  return `${base}mech-blueprint.png`;
}

// ── Paleta ────────────────────────────────────────────────────
const C = {
  void:     '#000000',
  surface:  '#000000',
  outlineV: '#4e453a',
  gold:     '#ffd79b',
  creamHi:  '#fff1d6',
  bone:     '#d1c5b6',
  outline:  '#9a8f81',
  ice:      '#99cfda',
  green:    '#00ff41',
  greenDim: '#00aa28',
  greenBg:  '#000800',
};

// ── Componente principal ───────────────────────────────────────
export function PortadaPage() {
  const navigate  = useNavigate();
  const { campaign } = useAppStore();
  const BASE = import.meta.env.BASE_URL;

  const n = ICONIC_MECHS.length; // 5

  // Índices del mech actual y siguiente en el ciclo de escaneo
  const [scanIdx, setScanIdx] = useState({ current: 0, next: 1 });
  const [progress, setProgress] = useState(0);
  const rafRef   = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / SCAN_CYCLE_MS, 1);
      setProgress(p);
      if (p >= 1) {
        startRef.current = now;
        setScanIdx(prev => ({
          current: prev.next,
          next:    (prev.next + 1) % n,
        }));
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [n]);

  const curMech     = ICONIC_MECHS[scanIdx.current];
  const nextMech    = ICONIC_MECHS[scanIdx.next];
  const curScanImg  = mechScanImg(curMech.key,   BASE);
  const nextScanImg = mechScanImg(nextMech.key,  BASE);
  const nextSideImg = mechSidebarImg(nextMech.key, BASE);
  const laserPct = progress * 100;

  const mesStr = `${MESES[(campaign.campaignMonth || 1) - 1].toUpperCase()} ${campaign.campaignYear || 3026}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'grid', gridTemplateColumns: '1fr 300px',
      background: C.void, overflow: 'hidden',
      fontFamily: '"Share Tech Mono", monospace',
    }}>

      {/* ══ HERO (izquierda) ══════════════════════════════════ */}
      <div style={{ position: 'relative', overflow: 'hidden', background: C.void }}>


        {/* ── Capa actual (se borra de arriba hacia abajo) ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          clipPath: `inset(${laserPct.toFixed(2)}% 0 0 0)`,
        }}>
          <img src={curScanImg} alt={curMech.fullName} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '52%', height: '88%',
            objectFit: 'contain',
            opacity: 1,
          }} />
        </div>

        {/* ── Capa siguiente (se revela de arriba hacia abajo) ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 4,
          clipPath: `inset(0 0 ${(100 - laserPct).toFixed(2)}% 0)`,
        }}>
          <img src={nextScanImg} alt={nextMech.fullName} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '52%', height: '88%',
            objectFit: 'contain',
            opacity: 1,
          }} />
        </div>

        {/* ── Scan laser ── */}
        <div style={{
          position: 'absolute',
          top: `${laserPct}%`,
          left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 5%, ${C.ice} 50%, transparent 95%)`,
          boxShadow: `0 0 8px ${C.ice}, 0 0 20px ${C.ice}`,
          zIndex: 10,
          pointerEvents: 'none',
        }} />

        {/* ── Panel blueprint (lateral izquierdo centrado) ── */}
        <div style={{
          position: 'absolute',
          left: 28, top: '50%',
          transform: 'translateY(-50%)',
          height: '50vh', width: 'auto', aspectRatio: '3300 / 5100',
          background: '#0d3a60',
          border: '2px solid #c8dde8',
          boxShadow: '0 0 16px rgba(15,76,129,0.5), inset 0 0 30px rgba(0,0,0,0.3)',
          zIndex: 6, overflow: 'hidden',
          backgroundImage: [
            'linear-gradient(rgba(232,244,248,0.6) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(232,244,248,0.6) 1px, transparent 1px)',
            'linear-gradient(rgba(232,244,248,0.2) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(232,244,248,0.2) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url(${nextSideImg})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'invert(100%) brightness(1.2)',
            opacity: 0.85,
          }} />
          {/* Label blueprint */}
          <div style={{
            position: 'absolute', bottom: 4, left: 0, right: 0,
            textAlign: 'center', fontSize: 7, color: '#c8dde8',
            letterSpacing: 2, opacity: 0.75,
          }}>TECHNICAL SCHEMATIC</div>
        </div>

        {/* ── Nombre de la unidad (centro-superior) ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          zIndex: 15, padding: '28px 36px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 8, color: C.outline, letterSpacing: 4, marginBottom: 12 }}>
            COMISION DE REVISION Y FIANZA DE MERCENARIOS
          </div>
          <h1 style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 48, fontWeight: 900,
            color: C.creamHi, letterSpacing: -1.5,
            lineHeight: 0.92, margin: 0,
            textTransform: 'uppercase',
            textAlign: 'center',
            textShadow: '0 2px 24px rgba(10,14,20,0.95)',
          }}>
            King Karl's<br />
            <span style={{ color: C.gold }}>Kürassiers</span>
          </h1>
          <div style={{ fontSize: 9, color: C.outline, letterSpacing: 3, marginTop: 12 }}>
            UNIDAD MERCENARIA · {mesStr}
          </div>
        </div>

        {/* ── Botón Entrar (centro-inferior) ── */}
        <div style={{
          position: 'absolute', bottom: 32, left: 0, right: 0,
          zIndex: 15,
          display: 'flex', justifyContent: 'center',
        }}>
          <button
            onClick={() => navigate('/comision')}
            style={{
              background: 'transparent',
              border: `1px solid ${C.gold}`,
              color: C.gold,
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: 11, letterSpacing: 4,
              textTransform: 'uppercase',
              padding: '10px 36px',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = C.gold;
              (e.target as HTMLButtonElement).style.color = '#1a0e00';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
              (e.target as HTMLButtonElement).style.color = C.gold;
            }}
          >
            Entrar
          </button>
        </div>

        {/* ── Versión (esquina inferior derecha del hero) ── */}
        <div style={{
          position: 'absolute', bottom: 8, right: 16, zIndex: 15,
          fontSize: 7, color: C.outline, letterSpacing: 2, opacity: 0.4,
        }}>
          Comision Mercenaria · {VERSION_DISPLAY}
        </div>
      </div>

      {/* ══ PANEL MODERNO AMBER (derecha) ══════════════════════ */}
      <div style={{
        background: '#0a0e14',
        borderLeft: '1px solid #31353c',
        padding: '16px',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: 9, color: C.outline, letterSpacing: 2,
          textTransform: 'uppercase',
          paddingBottom: 10, borderBottom: '1px solid #31353c', marginBottom: 14,
        }}>
          Unit Specs
        </div>

        {/* Barra de progreso del ciclo */}
        <div style={{ height: 2, background: '#262a31', marginBottom: 14 }}>
          <div style={{ height: '100%', width: `${laserPct}%`, background: C.gold, transition: 'none' }} />
        </div>

        {/* Nombre del mech */}
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 16, fontWeight: 700,
          color: C.gold, letterSpacing: 0.5,
          marginBottom: 14, lineHeight: 1.2,
        }}>
          {nextMech.fullName}
        </div>

        {/* Specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
          {([
            ['CHASIS',    nextMech.chassis],
            ['MASA',      nextMech.mass],
            ['MOTOR',     nextMech.engine],
            ['VELOCIDAD', nextMech.speed],
            ['BLINDAJE',  nextMech.armor],
            ['DISIPACION',   nextMech.heatsinks],
            ['ARMAS',     nextMech.weapons],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: 11, color: '#d6c4ac',
              padding: '8px 10px', margin: '0 0 2px',
              borderLeft: '2px solid #514532',
              background: '#181c22', lineHeight: 1.4,
            }}>
              <span style={{ color: C.outline }}>{k}: </span>{v}
            </div>
          ))}
        </div>

        {/* Descripción */}
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12, color: C.bone, lineHeight: 1.6,
          marginBottom: 12,
        }}>
          {nextMech.desc}
        </div>

        {/* Historia */}
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11, color: C.outline, lineHeight: 1.6,
        }}>
          {nextMech.history}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 'auto', paddingTop: 12,
          borderTop: '1px solid #31353c',
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: 8, color: C.outline, letterSpacing: 2,
        }}>
          NEXT: {Math.ceil((1 - progress) * SCAN_CYCLE_MS / 1000)}s
        </div>
      </div>
    </div>
  );
}

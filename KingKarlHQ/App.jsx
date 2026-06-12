import React, { useState } from 'react';
import { 
  Crosshair, User, Wrench, Shield, Zap, TrendingUp, 
  Map, BarChart2, Activity, Settings, AlertTriangle, 
  Target, Cpu, Battery, Hexagon, ShoppingCart
} from 'lucide-react';

// --- MOCK DATA ---
const PILOTS = [
  { id: 'p1', name: 'Dayffid', callsign: 'Naismith', xp: 320, health: 100, status: 'OK' },
  { id: 'p2', name: 'Takeshi', callsign: 'Envoy', xp: 850, health: 80, status: 'OK' },
  { id: 'p3', name: 'Elena', callsign: 'Valkyrie', xp: 410, health: 100, status: 'OK' },
  { id: 'p4', name: 'Kell', callsign: 'Hound', xp: 950, health: 30, status: 'WOUNDED' },
];

const CONTRACTS = [
  { id: 'c1', faction: 'Casa Davion', type: 'Asalto', payout: '2,500,000', difficulty: 'Alta' },
  { id: 'c2', faction: 'Magistrado', type: 'Escolta', payout: '850,000', difficulty: 'Baja' },
  { id: 'c3', faction: 'ComStar', type: 'Recuperación', payout: '1,200,000', difficulty: 'Media' },
];

const MARKET_MECHS = [
  { name: 'Locust LCT-1V', weight: 20, price: '1,500K' },
  { name: 'Shadow Hawk', weight: 55, price: '4,200K' },
  { name: 'Warhammer', weight: 70, price: '6,100K' },
  { name: 'Atlas AS7-D', weight: 100, price: '14,000K' },
];

// --- COMPONENTES AUXILIARES ---

// Panel contenedor con el estilo ámbar/industrial
const Panel = ({ title, children, className = "", headerExtra }) => (
  <div className={`bg-[#0a0a0c] border border-orange-600/60 rounded-sm flex flex-col relative overflow-hidden shadow-[inset_0_0_15px_rgba(234,88,12,0.05)] ${className}`}>
    {/* Header del Panel */}
    <div className="bg-gradient-to-r from-orange-900/60 to-[#0a0a0c] border-b border-orange-600/60 px-3 py-1.5 flex justify-between items-center z-10">
      <span className="text-orange-500 font-bold text-[10px] sm:text-xs tracking-widest uppercase drop-shadow-[0_0_5px_rgba(234,88,12,0.8)]">
        {title}
      </span>
      {headerExtra && <span className="text-[10px] text-cyan-400 font-mono">{headerExtra}</span>}
    </div>
    {/* Contenido */}
    <div className="flex-1 overflow-auto p-2 custom-scrollbar relative z-0">
      {children}
    </div>
  </div>
);

// Mini gráfico de barras para Finanzas
const BarChartMock = () => {
  const bars = [40, 60, 30, 80, 50, 90, 45, 70, 85, 30, 55, 75];
  return (
    <div className="flex items-end gap-[2px] h-20 w-full mt-2 border-b border-l border-slate-700 pb-1 pl-1">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group">
          <div 
            className={`w-full transition-all duration-300 ${i % 3 === 0 ? 'bg-orange-500' : 'bg-cyan-600 group-hover:bg-cyan-400'}`} 
            style={{ height: `${h}%` }}
          />
        </div>
      ))}
    </div>
  );
};

// Esquema de armadura del Mech (Taller)
const MechWireframe = () => (
  <div className="flex flex-col items-center justify-center h-full scale-90">
    <div className="w-8 h-8 border border-cyan-500 bg-cyan-900/30 rounded-t-lg mb-1" /> {/* Cabeza */}
    <div className="flex gap-1 mb-1">
      <div className="w-8 h-20 border border-orange-500 bg-orange-900/30 rounded-l-lg" /> {/* Brazo I */}
      <div className="w-16 h-24 border-2 border-cyan-400 bg-cyan-900/20 relative">
        <div className="absolute inset-2 border border-cyan-500/50" />
      </div> {/* Torso */}
      <div className="w-8 h-20 border border-cyan-500 bg-cyan-900/30 rounded-r-lg" /> {/* Brazo D */}
    </div>
    <div className="flex gap-2">
      <div className="w-7 h-24 border border-cyan-500 bg-cyan-900/30" /> {/* Pierna I */}
      <div className="w-7 h-24 border border-cyan-500 bg-cyan-900/30" /> {/* Pierna D */}
    </div>
  </div>
);

export default function App() {
  const [selectedMech, setSelectedMech] = useState('Marauder MAD-3R');

  return (
    <div className="min-h-screen bg-black text-slate-300 font-sans p-2 flex flex-col overflow-hidden" 
         style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #111 0%, #000 100%)' }}>
      
      {/* Estilos globales para la barra de desplazamiento y grid */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-left: 1px solid rgba(234,88,12,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234,88,12,0.5); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234,88,12,0.8); }
        .scanlines { background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2)); background-size: 100% 4px; }
      `}} />

      {/* HEADER PRINCIPAL */}
      <header className="border-2 border-orange-600 bg-gradient-to-b from-[#1a0a00] to-black p-2 mb-2 flex flex-wrap justify-between items-center rounded-sm shadow-[0_0_20px_rgba(234,88,12,0.15)] relative">
        <div className="absolute top-0 left-0 w-full h-full scanlines pointer-events-none opacity-30"></div>
        <div className="flex items-center gap-3 z-10">
          <Shield className="text-orange-500 w-6 h-6" />
          <h1 className="text-orange-500 font-black text-lg md:text-xl tracking-widest drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">
            UNIDAD MERCENARIA: "King Karl Kurassiers" <span className="text-slate-400 font-normal">| CENTRO DE MANDO</span>
          </h1>
        </div>
        <div className="flex items-center gap-6 text-xs font-mono font-bold z-10">
          <span className="text-cyan-400 flex items-center gap-2"><Zap size={14}/> STARDATE: 12 OCT 3049</span>
          <span className="bg-green-900/50 text-green-400 border border-green-500 px-3 py-1 rounded-sm shadow-[0_0_10px_rgba(34,197,94,0.3)]">ESTADO: OPERATIVO</span>
        </div>
      </header>

      {/* GRID PRINCIPAL DE PANELES */}
      {/* 3 Columnas: Izquierda (25%), Centro (50%), Derecha (25%) */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 overflow-hidden">
        
        {/* ================= COLUMNA IZQUIERDA ================= */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-2 overflow-hidden">
          
          {/* 1. Barracones */}
          <Panel title="1. Barracones (Personal)" className="flex-[1.5]">
            <div className="grid grid-cols-2 gap-2">
              {PILOTS.map(pilot => (
                <div key={pilot.id} className="border border-slate-700 bg-slate-900/50 p-2 relative group hover:border-cyan-500/50 transition-colors cursor-pointer">
                  <div className="w-full h-12 bg-slate-800 border border-slate-600 mb-1 flex items-center justify-center overflow-hidden">
                    <User className="text-slate-500 w-8 h-8 group-hover:text-cyan-400" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-200">{pilot.name}</div>
                  <div className="text-[9px] text-orange-400 font-mono">XP: {pilot.xp}</div>
                  {pilot.status === 'WOUNDED' && (
                    <div className="absolute top-1 right-1">
                      <AlertTriangle className="text-red-500 w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* 2. Hoja de Servicio (Árbol de Habilidades) */}
          <Panel title="2. Hoja de Servicio" className="flex-[1.2]">
            <div className="flex flex-col gap-2 h-full justify-center px-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border border-orange-500 bg-orange-900/40 flex items-center justify-center text-[10px] text-orange-400">S1</div>
                <div className="h-px bg-orange-800 flex-1"></div>
                <div className="w-6 h-6 border border-cyan-500 bg-cyan-900/40 flex items-center justify-center text-[10px] text-cyan-400">S2</div>
                <div className="h-px bg-slate-800 flex-1"></div>
                <div className="w-6 h-6 border border-slate-700 flex items-center justify-center text-[10px] text-slate-600">S3</div>
              </div>
              <div className="flex items-center gap-2 pl-8">
                <div className="w-px h-6 bg-orange-800 ml-3"></div>
              </div>
              <div className="flex items-center gap-2 pl-8">
                <div className="w-6 h-6 border border-orange-500 bg-orange-900/40 flex items-center justify-center text-[10px] text-orange-400">G1</div>
                <div className="h-px bg-slate-800 w-4"></div>
                <div className="w-6 h-6 border border-slate-700 flex items-center justify-center text-[10px] text-slate-600">G2</div>
              </div>
            </div>
          </Panel>

          {/* 3. Simulador (Hex Grid) */}
          <Panel title="3. Simulador Táctico" className="flex-[1.5]">
             {/* Mockup de un grid hexagonal usando CSS */}
             <div className="relative w-full h-full bg-[#051010] overflow-hidden flex items-center justify-center border border-cyan-900/30">
               <div className="absolute inset-0 opacity-20" 
                    style={{ backgroundImage: 'radial-gradient(circle, #00ffff 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
               <div className="grid grid-cols-4 gap-1 transform rotate-6 scale-110">
                 {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-8 h-10 border ${i===5 ? 'border-orange-500 bg-orange-900/50' : i===8 ? 'border-red-500 bg-red-900/50' : 'border-cyan-800/50'} flex items-center justify-center`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'}}>
                      {(i === 5 || i === 8) && <Target className={`w-4 h-4 ${i===5 ? 'text-orange-400' : 'text-red-500'}`} />}
                    </div>
                 ))}
               </div>
             </div>
          </Panel>

        </div>

        {/* ================= COLUMNA CENTRAL ================= */}
        <div className="col-span-1 md:col-span-6 flex flex-col gap-2 overflow-hidden">
          
          {/* VIEWPORT PRINCIPAL DEL HANGAR */}
          <div className="flex-[2] bg-[#02050a] border border-cyan-800 relative rounded-sm overflow-hidden flex flex-col shadow-[inset_0_0_50px_rgba(8,145,178,0.15)]">
            {/* Overlays del HUD */}
            <div className="absolute top-4 left-4 border-l-2 border-cyan-500 pl-2 z-10">
              <div className="text-[10px] text-cyan-600 font-mono mb-1">FONDOS DISPONIBLES</div>
              <div className="text-xl font-bold text-cyan-300 tracking-widest drop-shadow-[0_0_8px_rgba(8,145,178,0.8)]">1,250,000 ₡</div>
            </div>
            
            <div className="absolute top-4 right-4 bg-black/60 border border-slate-700 p-2 z-10 text-right">
              <div className="text-[10px] text-slate-400 font-mono">MECHS ACTIVOS</div>
              <div className="text-lg font-bold text-green-400">4 / 4</div>
              <div className="text-[10px] text-slate-400 mt-1">BAJAS: <span className="text-red-500">0</span></div>
            </div>

            <div className="absolute bottom-4 left-4 z-10">
              <h2 className="text-4xl font-black text-slate-200/20 uppercase tracking-widest">{selectedMech}</h2>
            </div>

            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
               <div className="w-16 h-12 border border-cyan-800 bg-cyan-900/20"></div>
               <div className="w-16 h-12 border border-cyan-800 bg-cyan-900/20"></div>
            </div>

            {/* Representación Abstracta del Mech en el Hangar */}
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
              {/* Luces del hangar */}
              <div className="absolute top-0 w-3/4 h-32 bg-gradient-to-b from-cyan-900/20 to-transparent"></div>
              <div className="absolute bottom-0 w-full h-16 bg-cyan-900/10" style={{ transform: 'perspective(100px) rotateX(45deg)' }}></div>
              
              {/* Silueta del Mech construida con formas */}
              <div className="relative flex flex-col items-center mt-12 scale-125">
                 {/* Hombros/Lanzamisiles */}
                 <div className="flex gap-12 mb-[-10px] z-0">
                    <div className="w-12 h-16 bg-[#1a202c] border border-[#2d3748] rounded-sm flex items-center justify-center grid grid-cols-2 gap-1 p-1">
                      {[...Array(6)].map((_,i) => <div key={i} className="bg-black rounded-full w-full h-full border border-slate-700"></div>)}
                    </div>
                    <div className="w-12 h-16 bg-[#1a202c] border border-[#2d3748] rounded-sm flex items-center justify-center grid grid-cols-2 gap-1 p-1">
                      {[...Array(6)].map((_,i) => <div key={i} className="bg-black rounded-full w-full h-full border border-slate-700"></div>)}
                    </div>
                 </div>
                 {/* Torso/Cabina */}
                 <div className="w-24 h-20 bg-gradient-to-b from-[#2d3748] to-[#1a202c] border-2 border-[#4a5568] rounded-xl flex items-center justify-center z-10 relative shadow-2xl">
                    <div className="w-12 h-6 bg-cyan-900 border border-cyan-400 rounded-full shadow-[0_0_15px_rgba(8,145,178,0.5)]"></div>
                    <div className="absolute -left-6 top-8 w-8 h-4 bg-slate-700 rounded-l-md rotate-12"></div>
                    <div className="absolute -right-6 top-8 w-8 h-4 bg-slate-700 rounded-r-md -rotate-12"></div>
                 </div>
                 {/* Piernas */}
                 <div className="flex gap-8 mt-[-5px] z-0">
                    <div className="w-6 h-32 bg-gradient-to-b from-[#2d3748] to-[#11141a] border border-[#4a5568] flex flex-col items-center">
                       <div className="w-8 h-4 bg-slate-600 mt-12"></div>
                       <div className="w-10 h-4 bg-slate-700 mt-auto mb-[-2px] rounded-t-sm"></div>
                    </div>
                    <div className="w-6 h-32 bg-gradient-to-b from-[#2d3748] to-[#11141a] border border-[#4a5568] flex flex-col items-center">
                       <div className="w-8 h-4 bg-slate-600 mt-12"></div>
                       <div className="w-10 h-4 bg-slate-700 mt-auto mb-[-2px] rounded-t-sm"></div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Fila Inferior Central: Taller y HUD Táctico */}
          <div className="flex-1 flex gap-2 overflow-hidden">
            <Panel title="4. Taller (Estado)" className="flex-1">
              <div className="flex h-full gap-2 items-center">
                <div className="w-12 flex flex-col gap-2 border-r border-slate-800 pr-2">
                   <button className="bg-slate-800 p-2 border border-slate-600 hover:border-orange-500 rounded-sm"><Wrench size={16} /></button>
                   <button className="bg-slate-800 p-2 border border-slate-600 hover:border-cyan-500 rounded-sm"><Settings size={16} /></button>
                   <button className="bg-slate-800 p-2 border border-slate-600 rounded-sm"><Shield size={16} /></button>
                </div>
                <div className="flex-1 h-full flex items-center justify-center">
                   <MechWireframe />
                </div>
                <div className="w-16 flex flex-col gap-1 font-mono text-[8px]">
                   <div className="bg-orange-900/30 border border-orange-500/50 p-1 text-orange-400">RA: 24/24</div>
                   <div className="bg-orange-900/30 border border-orange-500/50 p-1 text-orange-400">LA: 12/24</div>
                   <div className="bg-red-900/30 border border-red-500/50 p-1 text-red-400">CT: 10/45</div>
                </div>
              </div>
            </Panel>
            
            <Panel title="5. HUD Táctico" className="flex-[1.5]" headerExtra="SYS OK">
              <div className="flex h-full gap-4 p-2 items-center">
                <div className="flex-1 relative h-full border border-slate-700 bg-[#050a0f] p-2">
                   {/* Gráfico de líneas cruzadas simulado */}
                   <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                     <path d="M0 40 L100 10" stroke="#0ea5e9" strokeWidth="1" fill="none" />
                     <path d="M0 20 L100 45" stroke="#ea580c" strokeWidth="1" fill="none" strokeDasharray="2,2" />
                     <circle cx="70" cy="19" r="2" fill="#ef4444" />
                     <circle cx="30" cy="28" r="1.5" fill="#22c55e" />
                   </svg>
                   <div className="absolute bottom-1 left-1 text-[8px] font-mono text-slate-500">Rx-80</div>
                </div>
                <div className="w-1/3 flex flex-col gap-2 font-mono">
                  <div>
                    <div className="text-[8px] text-cyan-600">PROBABILIDAD IMPACTO</div>
                    <div className="text-xs text-slate-200">SRM-6: <span className="text-cyan-400">68%</span></div>
                    <div className="text-xs text-slate-200">AC/10: <span className="text-orange-400">42%</span></div>
                  </div>
                  <div>
                    <div className="text-[8px] text-cyan-600">EFECTOS CLIMA</div>
                    <div className="text-[10px] text-slate-400 border border-slate-700 px-1 inline-block bg-slate-900">-2 Modos Ópticos</div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

        </div>

        {/* ================= COLUMNA DERECHA ================= */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-2 overflow-hidden">
          
          {/* 6. Contratos */}
          <Panel title="6. Contratos" className="flex-[1.5]">
            <div className="flex flex-col gap-2">
              {CONTRACTS.map(contract => (
                <div key={contract.id} className="bg-slate-900/60 border border-slate-700 p-2 hover:border-orange-500/50 cursor-pointer transition-colors group relative">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      {contract.faction === 'ComStar' ? <Activity size={12} className="text-cyan-400"/> : <Shield size={12} className="text-orange-500"/>}
                      {contract.faction}
                    </div>
                    <div className="text-[10px] font-mono text-green-400 bg-green-900/20 px-1">{contract.payout} ₡</div>
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase">Misión: {contract.type}</div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 7. Finanzas */}
          <Panel title="7. Finanzas" className="flex-[1.5]">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-end border-b border-slate-800 pb-1 mb-1">
                <div className="text-[10px] text-slate-400">Balance Anual</div>
                <div className="text-xs font-mono font-bold text-green-500">+350,000 ₡</div>
              </div>
              <BarChartMock />
              <div className="mt-auto grid grid-cols-2 gap-2 text-[8px] font-mono mt-2">
                <div className="bg-slate-900 p-1 border border-slate-800">
                  <span className="text-cyan-600 block">Gastos Op.</span>
                  <span className="text-slate-300">85,000 ₡</span>
                </div>
                <div className="bg-slate-900 p-1 border border-slate-800">
                  <span className="text-orange-600 block">Mantenimiento</span>
                  <span className="text-slate-300">120,000 ₡</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* 9. Mercado de Mechs */}
          <Panel title="9. Mercado de Chatarra" className="flex-[2]">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 border-b border-slate-800 pb-1 mb-2 font-bold">
              <span className="text-cyan-400">MECHS</span>
              <span>|</span>
              <span className="hover:text-slate-300 cursor-pointer">ARMAS</span>
              <span>|</span>
              <span className="hover:text-slate-300 cursor-pointer">MERCADO NEGRO</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MARKET_MECHS.map((mech, i) => (
                <div key={i} className="border border-slate-700 bg-black p-2 flex flex-col items-center hover:bg-slate-900 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-800/50 rounded-sm mb-2 flex items-center justify-center border border-slate-700 group-hover:border-cyan-500 relative">
                    <Cpu size={24} className="text-slate-600 group-hover:text-cyan-500" />
                    <div className="absolute bottom-0 right-0 bg-black text-[8px] font-mono px-1 border border-slate-700">{mech.weight}t</div>
                  </div>
                  <div className="text-[9px] font-bold text-center text-slate-300 leading-tight h-6">{mech.name}</div>
                  <div className="text-[10px] font-mono text-orange-400 mt-1 border-t border-slate-800 w-full text-center pt-1 flex items-center justify-center gap-1">
                    <ShoppingCart size={10} /> {mech.price}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

        </div>

      </main>
    </div>
  );
}
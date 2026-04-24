import type { JumpRoute } from '../types';
import { formatCBills } from '../lib/cost';
import { RECHARGE_DAYS_STANDARD } from '../constants';
import { AlertTriangle } from 'lucide-react';

interface Props {
  route: JumpRoute;
}

export function RouteSummary({ route }: Props) {
  const rechargeSteps = Math.max(0, route.totalJumps - 1);
  const visitSteps = route.steps.filter(s => s.planetVisit);

  return (
    <div className="border border-outline-variant/30 bg-surface-container-low p-4 space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-outline">
        Resumen de Ruta
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Distancia Total"  value={`${route.totalDistance.toFixed(1)} LY`} />
        <StatBox label="Saltos"           value={String(route.totalJumps)} highlight />
        <StatBox label="Tiempo Total"     value={`~${route.totalDays} días`} />
        <StatBox label="Coste Estimado"   value={formatCBills(route.estimatedCost)} />
      </div>

      {/* Desglose de tiempo */}
      <div className="border-t border-outline-variant/20 pt-3 space-y-1">
        <TimeRow
          label="Recarga KF:"
          value={`${route.rechargeDays} días (${rechargeSteps} × ${RECHARGE_DAYS_STANDARD})`}
        />
        <TimeRow
          label="Visitas planeta:"
          value={
            visitSteps.length === 0
              ? `0 días (sin escalas con visita)`
              : `${route.planetVisitDays} días (${visitSteps.length} escala${visitSteps.length > 1 ? 's' : ''} con visita)`
          }
        />
        {visitSteps.length > 0 && visitSteps.map((s, i) => (
          <div key={i} className="pl-6 flex items-center gap-1 font-mono text-[9px] text-outline/70">
            <span className="text-outline/40">└─</span>
            <span className="text-on-surface-variant/60">
              {s.toSystem.name}{s.visitReason ? `: ${s.visitReason}` : ''}
            </span>
          </div>
        ))}
        <TimeRow
          label="Destino final:"
          value={`${route.destinationDays} días (tránsito + operaciones)`}
        />
      </div>

      {/* Warnings */}
      {route.warnings.length > 0 && (
        <div className="border-t border-outline-variant/20 pt-3 space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-widest text-outline mb-1.5">
            Alertas
          </div>
          {route.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-primary-container/10 border border-primary-container/30 px-2.5 py-1.5 font-mono text-[10px] text-primary-container/90">
              <AlertTriangle size={11} className="text-primary-container/70 flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-surface-container px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-outline mb-1">{label}</div>
      <div className={`font-mono text-sm font-bold ${highlight ? 'text-primary-container' : 'text-on-surface'}`}>
        {value}
      </div>
    </div>
  );
}

function TimeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
      <span className="text-outline w-32 flex-shrink-0">{label}</span>
      <span className="text-primary-container/80">{value}</span>
    </div>
  );
}

/**
 * Revelación de gasto en el Hub: presencia · dirección · no conquistado.
 * Compacto. Sin anillo, sin pulso.
 */
import { TRIADA_META } from "@/lib/concienciaTriadaOperador";
import type { ProyectoRendicionTiempo } from "@/lib/gastoTiempo";

const PIZARRA = "#0a0a0a";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const NO_CONQUISTADO = "#94a3b8";

function formatMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

export function HubRendicionTiempo({
  model,
  tint,
}: {
  model: ProyectoRendicionTiempo;
  tint: string;
}) {
  const total = model.hasPlanVinculado
    ? Math.max(model.minutosPlanVinculado, 1)
    : Math.max(model.minutosGastados, 1);
  const pctPresencia = Math.round((model.minutosPresencia / total) * 100);
  const pctDireccion = Math.round((model.minutosDireccion / total) * 100);
  const pctNoConq = model.hasPlanVinculado
    ? Math.max(0, 100 - pctPresencia - pctDireccion)
    : 0;

  return (
    <div
      className="p-3 rounded-xl border space-y-3"
      style={{ backgroundColor: PIZARRA, borderColor: `${tint}35` }}
      data-testid="hub-rendicion-tiempo"
    >
      <div>
        <p
          className="text-[9px] font-bold uppercase tracking-widest mb-1"
          style={{ color: tint }}
        >
          Rendición de tiempo
        </p>
        <p className="text-[11px] font-semibold leading-snug" style={{ color: INK }}>
          {model.headline}
        </p>
      </div>

      <div
        className="h-2.5 w-full rounded-full overflow-hidden flex"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      >
        {pctNoConq > 0 ? (
          <div
            style={{ width: `${pctNoConq}%`, backgroundColor: NO_CONQUISTADO }}
            title={`No conquistado ${pctNoConq}%`}
          />
        ) : null}
        {pctPresencia > 0 ? (
          <div
            style={{
              width: `${pctPresencia}%`,
              backgroundColor: TRIADA_META.presencia.color,
            }}
            title={`Presencia ${pctPresencia}%`}
          />
        ) : null}
        {pctDireccion > 0 ? (
          <div
            style={{
              width: `${pctDireccion}%`,
              backgroundColor: TRIADA_META.direccion.color,
            }}
            title={`Dirección ${pctDireccion}%`}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p
            className="text-base font-black tabular-nums"
            style={{ color: NO_CONQUISTADO }}
          >
            {formatMin(model.minutosNoConquistado)}
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
            No conquistado
          </p>
        </div>
        <div className="text-center">
          <p
            className="text-base font-black tabular-nums"
            style={{ color: TRIADA_META.presencia.color }}
          >
            {formatMin(model.minutosPresencia)}
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
            Presencia
          </p>
        </div>
        <div className="text-center">
          <p
            className="text-base font-black tabular-nums"
            style={{ color: TRIADA_META.direccion.color }}
          >
            {formatMin(model.minutosDireccion)}
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
            Dirección
          </p>
        </div>
      </div>

      {model.minutosIdle > 0 ? (
        <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
          {formatMin(model.minutosIdle)} sin subs de medida (desglosador en espera o
          lista sin ring). Sigue siendo gasto del proyecto.
        </p>
      ) : (
        <p className="text-[8px] leading-relaxed" style={{ color: MUTED }}>
          Solo cuenta lo planificado. Lo no planificado no es deuda: está no
          conquistado. Presencia cubre el día; Dirección solo con oleada y foco.
        </p>
      )}
    </div>
  );
}

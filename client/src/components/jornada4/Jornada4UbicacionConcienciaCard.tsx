/**
 * Veredicto vivo: dónde está la conciencia hoy.
 * No es una barra de energía. Una frase + hechos + mandato.
 * Idle — Métricas (completo) y Plan (compacto).
 */
import { useEffect, useMemo } from "react";
import { useAuthContext } from "@/App";
import {
  computeUbicacionConcienciaDia,
  readPresenciaNombrarFechas,
  upsertPresenciaNombrarFecha,
  UBICACION_META,
  type UbicacionConcienciaDia,
} from "@/lib/ubicacionConciencia";
import { getJournalDateString } from "@/lib/segmentTime";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, MUTED, INK } = J4_COLORS;

export type Jornada4UbicacionConcienciaCardProps = {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
  compact?: boolean;
  /** Firma de tick de isla (Plan/Métricas). No es un timestamp. */
  tick?: number;
};

export function Jornada4UbicacionConcienciaCard({
  segmentos,
  vehicles,
  compact = false,
  tick,
}: Jornada4UbicacionConcienciaCardProps) {
  const { user } = useAuthContext();
  const userId = user?.uid;

  const model: UbicacionConcienciaDia = useMemo(() => {
    void tick;
    const fechas = userId ? readPresenciaNombrarFechas(userId) : [];
    return computeUbicacionConcienciaDia({
      segmentos,
      vehicles,
      fechasNombrar: fechas,
    });
  }, [segmentos, vehicles, tick, userId]);

  useEffect(() => {
    if (!userId) return;
    if (model.vehiculosPresenciaNombrada <= 0) return;
    upsertPresenciaNombrarFecha(userId, getJournalDateString(), true);
  }, [userId, model.vehiculosPresenciaNombrada]);

  const meta = UBICACION_META[model.ubicacion];

  return (
    <section
      className={compact ? "mx-3 mb-2 sm:mx-4 rounded-xl border px-3 py-2.5" : "mx-1 mb-2 rounded-xl border p-3 space-y-2"}
      style={{
        backgroundColor: PIZARRA,
        borderColor: `${meta.color}44`,
        boxShadow: `0 0 14px ${meta.color}14`,
      }}
      data-testid="jornada4-ubicacion-conciencia"
      data-ubicacion={model.ubicacion}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: MUTED }}
        >
          Ubicación de la conciencia
        </p>
        <p
          className="text-[10px] font-black uppercase tracking-widest shrink-0"
          style={{ color: meta.color }}
          data-testid="jornada4-ubicacion-label"
        >
          {meta.label}
        </p>
      </div>
      <p
        className={compact ? "text-[11px] font-semibold leading-snug mt-1" : "text-[12px] font-semibold leading-snug"}
        style={{ color: INK }}
        data-testid="jornada4-ubicacion-headline"
      >
        {model.headline}
      </p>
      {!compact ? (
        <>
          <ul className="space-y-0.5" data-testid="jornada4-ubicacion-hechos">
            {model.hechos.map(h => (
              <li key={h} className="text-[10px] leading-snug" style={{ color: MUTED }}>
                {h}
              </li>
            ))}
          </ul>
          <p
            className="text-[10px] leading-snug"
            style={{ color: meta.color }}
            data-testid="jornada4-ubicacion-mandato"
          >
            {model.mandato}
          </p>
        </>
      ) : (
        <p className="text-[9px] leading-snug mt-1" style={{ color: MUTED }}>
          {model.mandato}
        </p>
      )}
    </section>
  );
}

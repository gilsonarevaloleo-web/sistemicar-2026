import { useEffect, useMemo, useState } from "react";
import { segmentDurationMinutes } from "@/lib/segmentTime";

export interface SegmentoMiniRing {
  id: string;
  horaInicio: string;
  horaFin: string;
}

/** Progreso local del bloque activo (solo capa visual; no muta métricas globales). */
export function useMiniBlockConquest(
  segmento: SegmentoMiniRing | null,
  hayVehiculoActivo: boolean,
  tick: number
): number {
  const segId = segmento?.id ?? null;

  const duracionSeg = useMemo(() => {
    if (!segmento?.horaInicio || !segmento?.horaFin) return 0;
    return Math.max(1, Math.round(segmentDurationMinutes(segmento.horaInicio, segmento.horaFin) * 60));
  }, [segmento?.horaInicio, segmento?.horaFin]);

  const [conquistaSegLocal, setConquistaSegLocal] = useState(0);

  useEffect(() => {
    setConquistaSegLocal(0);
  }, [segId]);

  useEffect(() => {
    void tick;
    if (!hayVehiculoActivo || !segmento || duracionSeg <= 0) return;
    setConquistaSegLocal(prev => Math.min(duracionSeg, prev + 1));
  }, [tick, hayVehiculoActivo, segmento, duracionSeg]);

  if (duracionSeg <= 0) return 0;
  return Math.min(100, Math.round((conquistaSegLocal / duracionSeg) * 100));
}

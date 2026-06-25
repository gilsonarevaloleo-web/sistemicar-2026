import { useEffect, useMemo, useState } from "react";
import { segmentDurationMinutes } from "@/lib/segmentTime";
import { hardwareElapsedSec } from "@/lib/hardwareClock";

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
    try {
      return Math.max(1, Math.round(segmentDurationMinutes(segmento.horaInicio, segmento.horaFin) * 60));
    } catch {
      return 0;
    }
  }, [segmento?.horaInicio, segmento?.horaFin]);

  const [conquistaSegLocal, setConquistaSegLocal] = useState(0);
  const [blockStartedAt, setBlockStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!hayVehiculoActivo || !segId) {
      setBlockStartedAt(null);
      setConquistaSegLocal(0);
      return;
    }
    setBlockStartedAt(Date.now());
    setConquistaSegLocal(0);
  }, [hayVehiculoActivo, segId]);

  useEffect(() => {
    void tick;
    if (!blockStartedAt || !hayVehiculoActivo || !segId || duracionSeg <= 0) return;
    const elapsedSec = hardwareElapsedSec(blockStartedAt);
    setConquistaSegLocal(Math.min(duracionSeg, elapsedSec));
  }, [tick, blockStartedAt, hayVehiculoActivo, segId, duracionSeg]);

  if (duracionSeg <= 0) return 0;
  return Math.min(100, Math.round((conquistaSegLocal / duracionSeg) * 100));
}

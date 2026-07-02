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
  subTareaActivaId: string | null, // ◄─── El puente que destruye el bucle temporal lineal
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

  // Efecto 1: Reinicia el reloj a 00:00 cada vez que cambia la sub-tarea o el bloque horario
  useEffect(() => {
    if (!hayVehiculoActivo || !segId || !subTareaActivaId) {
      setBlockStartedAt(null);
      setConquistaSegLocal(0);
      return;
    }
    setBlockStartedAt(Date.now());
    setConquistaSegLocal(0);
  }, [hayVehiculoActivo, segId, subTareaActivaId]);

  // Efecto 2: Hace avanzar el segundero de forma fluida usando el reloj de hardware
  useEffect(() => {
    void tick;
    if (!blockStartedAt || !hayVehiculoActivo || !segId || !subTareaActivaId || duracionSeg <= 0) return;
    const elapsedSec = hardwareElapsedSec(blockStartedAt);
    setConquistaSegLocal(Math.min(duracionSeg, elapsedSec));
  }, [tick, blockStartedAt, hayVehiculoActivo, segId, subTareaActivaId, duracionSeg]);

  if (duracionSeg <= 0) return 0;
  return Math.min(100, Math.round((conquistaSegLocal / duracionSeg) * 100));
}
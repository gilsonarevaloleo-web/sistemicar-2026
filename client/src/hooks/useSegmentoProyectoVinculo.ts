import { useCallback, useEffect, useMemo } from "react";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { subscribeToProyectos } from "@/lib/proyectos";
import { syncJornadaProyectosFromRemote } from "@/lib/jornadaProyectosStore";
import {
  useJornadaProyectoIds,
  useJornadaProyectosHub,
} from "@/hooks/useModularStoreSelectors";
import { isInterModuleSyncBlocked } from "@/lib/viewTransitionShield";
import {
  ordenFlotaParaSegmento,
  resolverProyectoIdVehiculo,
  segmentoEsEjeSaludRecuperacion,
  volcarMetricasVehiculoAlHub,
} from "@/lib/segmentoProyectoHub";

/** Estado compartido: segmento activo ↔ Hub de Proyectos y orquestación de flota. */
export function useSegmentoProyectoVinculo(
  userId: string | undefined,
  segmentoActivo: SegmentoV5 | null
) {
  const proyectosHub = useJornadaProyectosHub();
  const proyectoIds = useJornadaProyectoIds();

  useEffect(() => {
    if (!userId) return;
    void syncJornadaProyectosFromRemote(userId, { force: true });
    return subscribeToProyectos(userId, () => {
      if (isInterModuleSyncBlocked()) return;
      void syncJornadaProyectosFromRemote(userId);
    });
  }, [userId]);

  const flotaOrden = useMemo(
    () => ordenFlotaParaSegmento(segmentoActivo),
    [segmentoActivo]
  );

  const proyectoVinculadoActivo = useMemo(() => {
    const id = segmentoActivo?.proyectoVinculadoId;
    if (!id) return null;
    return proyectosHub.find(p => p.id === id) ?? null;
  }, [segmentoActivo?.proyectoVinculadoId, proyectosHub]);

  const priorizaDescanso = useMemo(
    () => (segmentoActivo ? segmentoEsEjeSaludRecuperacion(segmentoActivo) : false),
    [segmentoActivo]
  );

  const resolverProyectoId = useCallback(
    (launchCtx: { proyectoId: string; peldanoId?: string } | null) =>
      resolverProyectoIdVehiculo(segmentoActivo, launchCtx),
    [segmentoActivo]
  );

  const volcarMetricasAlHub = useCallback(
    async (vehicle: Vehicle, opts: { ps?: number; minutos?: number } = {}) => {
      if (!userId) return;
      await volcarMetricasVehiculoAlHub(userId, vehicle, segmentoActivo, opts);
    },
    [userId, segmentoActivo]
  );

  return {
    proyectosHub,
    proyectoIds,
    flotaOrden,
    proyectoVinculadoActivo,
    priorizaDescanso,
    resolverProyectoId,
    volcarMetricasAlHub,
    segmentoEsEjeSaludRecuperacion,
  };
}

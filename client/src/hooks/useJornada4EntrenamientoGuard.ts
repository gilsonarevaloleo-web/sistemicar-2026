/**
 * Guard ligero de restricciones opt-in (Dual Kernel).
 * - Ring entrenamiento: pestaña oculta ≥ gracia → fallado por distracción.
 * - Desglosador anclado: cruce de segmento tras gracia → archivo.
 *
 * Sin voz, sin celebración, sin re-render del root cada segundo.
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import { toast } from "sonner";
import type { Planilla, Vehicle } from "@/lib/persistence";
import { getLimaDayStartMs } from "@/lib/segmentTime";
import { subscribeJornada4Tick } from "@/jornada4/jornada4Tick";
import {
  ENTRENAMIENTO_COPY,
  ENTRENAMIENTO_DISTRACCION_GRACE_SEC,
  evaluateAncladoSegmentoCruce,
  findActiveEntrenamientoRing,
} from "@/jornada4/entrenamientoRestricciones";

const PIZARRA = "#0a0a0a";
const NARANJA = "#F97316";
const ANCLAJE_GAP_MS = 10_000;

type Params = {
  enabled?: boolean;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  planilla: Planilla | null;
  failSituacionDistraccion: (vehicleId: string) => void | Promise<void>;
  archiveAncladoPorSegmento: (vehicleId: string) => void | Promise<void>;
};

export function useJornada4EntrenamientoGuard({
  enabled = true,
  vehiclesRef,
  planilla,
  failSituacionDistraccion,
  archiveAncladoPorSegmento,
}: Params) {
  const planillaRef = useRef(planilla);
  planillaRef.current = planilla;

  const hiddenSinceRef = useRef<number | null>(null);
  const distraccionInFlightRef = useRef(false);
  const warnedAncladoRef = useRef(new Set<string>());
  const lastAncladoRunRef = useRef(0);
  const ancladoRunningRef = useRef(false);

  const failRef = useRef(failSituacionDistraccion);
  failRef.current = failSituacionDistraccion;
  const archiveRef = useRef(archiveAncladoPorSegmento);
  archiveRef.current = archiveAncladoPorSegmento;

  // Distracción: solo document.hidden (no blur) + gracia.
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const onVisibility = () => {
      if (document.hidden) {
        if (hiddenSinceRef.current == null) {
          hiddenSinceRef.current = Date.now();
        }
        return;
      }
      hiddenSinceRef.current = null;
      distraccionInFlightRef.current = false;
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    return subscribeJornada4Tick(() => {
      // --- Distracción ring ---
      const hiddenSince = hiddenSinceRef.current;
      if (
        hiddenSince != null &&
        !distraccionInFlightRef.current &&
        document.hidden
      ) {
        const elapsedSec = (Date.now() - hiddenSince) / 1000;
        if (elapsedSec >= ENTRENAMIENTO_DISTRACCION_GRACE_SEC) {
          const ring = findActiveEntrenamientoRing(vehiclesRef.current);
          if (ring) {
            distraccionInFlightRef.current = true;
            void failRef.current(ring.id);
          }
        }
      }

      // --- Anclaje segmento ---
      const now = Date.now();
      if (ancladoRunningRef.current) return;
      if (now - lastAncladoRunRef.current < ANCLAJE_GAP_MS) return;
      const current = planillaRef.current;
      if (!current?.segmentos?.length) return;

      const hasAnclado = vehiclesRef.current.some(
        v => v.status === "activo" && v.ancladoAlSegmento === true
      );
      if (!hasAnclado) return;

      lastAncladoRunRef.current = now;
      ancladoRunningRef.current = true;
      try {
        const dayStart = getLimaDayStartMs(now);
        const events = evaluateAncladoSegmentoCruce({
          vehicles: vehiclesRef.current,
          segmentos: current.segmentos,
          nowMs: now,
          dayStartMs: dayStart,
          warnedVehicleIds: warnedAncladoRef.current,
        });

        for (const ev of events) {
          if (ev.type === "warning") {
            warnedAncladoRef.current.add(ev.vehicleId);
            toast.warning(ENTRENAMIENTO_COPY.ancladoBadge, {
              description: `${ev.titulo}: cierra o archiva en ~${ev.minutesLeft} min (origen «${ev.originNombre}»).`,
              duration: 5500,
              style: {
                backgroundColor: PIZARRA,
                border: `1px solid ${NARANJA}`,
                color: NARANJA,
              },
            });
          } else if (ev.type === "auto_close") {
            void archiveRef.current(ev.vehicleId);
          }
        }
      } finally {
        ancladoRunningRef.current = false;
      }
    });
  }, [enabled, vehiclesRef]);
}

/**
 * Tick wall-clock: timbre + vibración + toast + Notification.
 * Sin speechQueue / SegmentAttentionBackground / TTS.
 * Anti-miopía: el título lleva «Nª puerta de M del día».
 */
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { Planilla } from "@/lib/persistence";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import { deliverPuertaSensory } from "@/jornada4/puertaChime";
import {
  collectNewPuertaAlerts,
  collectOpenPuertaWindows,
  showJornada4PuertaNotification,
} from "@/jornada4/puertaWindowAlerts";

const PIZARRA = "#0a0a0a";
const EMERALD = "#00C851";
const GOLD = "#D4AF37";

export function useJornada4PuertaAlerts(planilla: Planilla | null, enabled = true) {
  const tick = useJornada4Tick(enabled && Boolean(planilla));
  const lastScanRef = useRef(0);

  const windows = useMemo(() => {
    void tick;
    if (!planilla?.segmentos?.length) {
      return { abrirIds: new Set<string>(), cerrarIds: new Set<string>() };
    }
    return collectOpenPuertaWindows(planilla.segmentos);
  }, [planilla, tick]);

  useEffect(() => {
    if (!enabled || !planilla?.segmentos?.length) return;
    const now = Date.now();
    // Evitar spam si el tick es muy frecuente: escanear cada ~8s
    if (now - lastScanRef.current < 8_000) return;
    lastScanRef.current = now;

    const alerts = collectNewPuertaAlerts(planilla.segmentos, now);
    for (const alert of alerts) {
      deliverPuertaSensory(alert.kind);
      toast.message(alert.title, {
        description: alert.body,
        duration: 12_000,
        style: {
          backgroundColor: PIZARRA,
          border: `1px solid ${alert.kind === "abrir" ? EMERALD : GOLD}`,
          color: alert.kind === "abrir" ? EMERALD : GOLD,
        },
      });
      showJornada4PuertaNotification(alert);
    }
  }, [enabled, planilla, tick]);

  return windows;
}

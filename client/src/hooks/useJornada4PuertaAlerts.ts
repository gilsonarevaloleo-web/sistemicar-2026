/**
 * Tick wall-clock: toast + Notification cuando entra la ventana ±5 min.
 * Sin speechQueue / SegmentAttentionBackground.
 *
 * Los toasts corren por subscribe (sin setState en el root de sesión).
 * El badge UI solo tickea cuando `tickUi` está activo (pestaña Plan).
 */
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { Planilla } from "@/lib/persistence";
import { subscribeJornada4Tick } from "@/jornada4/jornada4Tick";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  collectNewPuertaAlerts,
  collectOpenPuertaWindows,
  showJornada4PuertaNotification,
} from "@/jornada4/puertaWindowAlerts";

const PIZARRA = "#0a0a0a";
const EMERALD = "#00C851";
const GOLD = "#D4AF37";
const SCAN_GAP_MS = 8_000;

export function useJornada4PuertaAlerts(
  planilla: Planilla | null,
  enabled = true,
  /** Si false, no fuerza re-render del host cada segundo (solo toasts en sombra). */
  tickUi = true
) {
  const planillaRef = useRef(planilla);
  planillaRef.current = planilla;

  // Toasts / Notification: listener sin setState → no re-renderiza JornadaV4Session.
  useEffect(() => {
    if (!enabled) return;
    let lastScan = 0;
    return subscribeJornada4Tick(() => {
      const current = planillaRef.current;
      if (!current?.segmentos?.length) return;
      const now = Date.now();
      if (now - lastScan < SCAN_GAP_MS) return;
      lastScan = now;

      const alerts = collectNewPuertaAlerts(current.segmentos, now);
      for (const alert of alerts) {
        toast.message(alert.title, {
          description: alert.body,
          duration: 8_000,
          style: {
            backgroundColor: PIZARRA,
            border: `1px solid ${alert.kind === "abrir" ? EMERALD : GOLD}`,
            color: alert.kind === "abrir" ? EMERALD : GOLD,
          },
        });
        showJornada4PuertaNotification(alert);
      }
    });
  }, [enabled]);

  // Badges de ventana en el panel Plan — solo cuando la UI los muestra.
  const tick = useJornada4Tick(tickUi && enabled && Boolean(planilla));

  const windows = useMemo(() => {
    void tick;
    if (!planilla?.segmentos?.length) {
      return { abrirIds: new Set<string>(), cerrarIds: new Set<string>() };
    }
    return collectOpenPuertaWindows(planilla.segmentos);
  }, [planilla, tick]);

  return windows;
}

/**
 * Tick Dual Kernel: auto-apertura (−2), entropía y persistencia de puertas.
 * Sin voz / concienciaScheduler — solo toast + PS + savePlanilla.
 *
 * Usa subscribeJornada4Tick directo (sin setState) para no re-renderizar
 * toda la sesión Dual Kernel cada segundo.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  deductSovereigntyPoints,
  savePlanilla,
  type Planilla,
} from "@/lib/persistence";
import { setActiveSegmento } from "@/lib/evento-universal";
import { filterNewAttentionEvents } from "@/lib/segmentAttentionToastDedup";
import { getJournalDateString } from "@/lib/segmentTime";
import {
  applyJornada4AttentionCycle,
  formatJ4AttentionToast,
} from "@/jornada4/segmentAttentionJ4";
import { subscribeJornada4Tick } from "@/jornada4/jornada4Tick";
import { showJornada4PuertaNotification } from "@/jornada4/puertaWindowAlerts";

const PIZARRA = "#0a0a0a";
const BLOOD = "#DC2626";
const NARANJA = "#F97316";

/** Intervalo mínimo entre ciclos (el tick J4 es 1s). */
const ATTENTION_GAP_MS = 10_000;
/** Primer catch-up diferido para no bloquear montaje. */
const INITIAL_DEFER_MS = 2_500;

type Params = {
  userId: string | undefined;
  planilla: Planilla | null;
  busySegId?: string | null;
  enabled?: boolean;
};

export function useJornada4SegmentAttention({
  userId,
  planilla,
  busySegId = null,
  enabled = true,
}: Params) {
  const planillaRef = useRef(planilla);
  const busyRef = useRef(busySegId);
  const runningRef = useRef(false);
  const lastRunRef = useRef(0);
  const readyAtRef = useRef(0);

  planillaRef.current = planilla;
  busyRef.current = busySegId;

  useEffect(() => {
    if (!enabled || !userId) {
      readyAtRef.current = 0;
      return;
    }
    readyAtRef.current = Date.now() + INITIAL_DEFER_MS;
  }, [enabled, userId, planilla?.id]);

  useEffect(() => {
    if (!enabled || !userId) return;

    return subscribeJornada4Tick(() => {
      const now = Date.now();
      if (readyAtRef.current === 0 || now < readyAtRef.current) return;
      if (runningRef.current) return;
      if (busyRef.current) return;
      if (now - lastRunRef.current < ATTENTION_GAP_MS) return;

      const current = planillaRef.current;
      if (!current?.segmentos?.length) return;

      runningRef.current = true;
      lastRunRef.current = now;

      const run = async () => {
        try {
          const result = applyJornada4AttentionCycle(current, Date.now());
          if (!result.changed && result.events.length === 0) return;

          if (result.changed) {
            await savePlanilla(userId, result.planilla);
            planillaRef.current = result.planilla;
          }

          const fecha = getJournalDateString();
          const fresh = filterNewAttentionEvents(fecha, result.events);
          const entropyLike = fresh.filter(
            e =>
              e.type === "entropia" ||
              e.type === "auto_apertura" ||
              e.type === "day_rollover_entropia"
          );
          const batch = entropyLike.length > 1 || result.catchUpPending;

          if (batch && entropyLike.length > 0) {
            toast.error("Entropía acumulada", {
              description: `${entropyLike.length} puerta(s) sincronizadas con el horario. Revisa el plan del día.`,
              duration: 7000,
              style: {
                backgroundColor: "#1a0000",
                border: `2px solid ${BLOOD}`,
                color: BLOOD,
              },
            });
          }

          let autoCount = 0;
          for (const ev of fresh) {
            if (ev.type === "auto_apertura") {
              autoCount += 1;
              setActiveSegmento(userId, ev.segId);
              if (!batch) {
                const copy = formatJ4AttentionToast(ev);
                toast.error(copy.title, {
                  description: copy.description,
                  duration: 7000,
                  style: {
                    backgroundColor: "#1a0000",
                    border: `2px solid ${BLOOD}`,
                    color: BLOOD,
                  },
                });
                showJornada4PuertaNotification({
                  kind: "abrir",
                  segId: ev.segId,
                  nombre: ev.nombre,
                  horaRef: "",
                  title: copy.title,
                  body: copy.description,
                  key: `j4-sistema-${ev.segId}-${fecha}`,
                });
              }
            } else if (
              (ev.type === "entropia" || ev.type === "day_rollover_entropia") &&
              !batch
            ) {
              const copy = formatJ4AttentionToast(ev);
              toast.error(copy.title, {
                description: copy.description,
                duration: 6000,
                style: {
                  backgroundColor: PIZARRA,
                  border: `1px solid ${NARANJA}`,
                  color: NARANJA,
                },
              });
            }
          }

          if (autoCount > 0) {
            void deductSovereigntyPoints(
              userId,
              autoCount * 2,
              autoCount === 1
                ? `Puerta sistema (entropía): ${fresh.find(e => e.type === "auto_apertura")?.nombre ?? "segmento"}`
                : `Puerta sistema (entropía): ${autoCount} segmento(s)`
            ).catch(e => console.error("[j4.attention] deductPS", e));
          }
        } catch (e) {
          console.error("[j4.segmentAttention]", e);
        } finally {
          runningRef.current = false;
        }
      };

      void run();
    });
  }, [enabled, userId]);
}

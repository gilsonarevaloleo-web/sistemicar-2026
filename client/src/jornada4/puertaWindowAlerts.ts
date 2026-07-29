/**
 * Alertas de ventana de puerta Dual Kernel — sin voz ni speechQueue.
 * Sustituye el recordatorio TTS clásico por toast + Notification + pulso UI.
 */
import type { SegmentoV5 } from "@/lib/persistence";
import { isWithinPuertaWindow } from "@/lib/segmentAttentionEngine";
import {
  getJournalDateString,
  getSegmentCalendarDayStartMs,
  isWithinSegmentTimeMargin,
} from "@/lib/segmentTime";

export type PuertaAlertKind = "abrir" | "cerrar";

export type PuertaWindowAlert = {
  kind: PuertaAlertKind;
  segId: string;
  nombre: string;
  horaRef: string;
  title: string;
  body: string;
  key: string;
};

const deliveredAtByKey = new Map<string, number>();
/** Una alerta por ventana (abrir o cerrar) por segmento/día. */
const DEDUP_MS = 25 * 60_000;

export function shouldDeliverPuertaAlertOnce(key: string, nowMs = Date.now()): boolean {
  const tag = key.trim();
  if (!tag) return true;
  const prev = deliveredAtByKey.get(tag);
  if (prev != null && nowMs - prev < DEDUP_MS) return false;
  deliveredAtByKey.set(tag, nowMs);
  if (deliveredAtByKey.size > 64) {
    for (const [k, at] of Array.from(deliveredAtByKey.entries())) {
      if (nowMs - at > DEDUP_MS) deliveredAtByKey.delete(k);
    }
  }
  return true;
}

export function resetPuertaAlertDedup(): void {
  deliveredAtByKey.clear();
}

/** IDs de segmentos con ventana abierta ahora (para pulso UI). */
export function collectOpenPuertaWindows(
  segmentos: SegmentoV5[],
  nowMs = Date.now()
): { abrirIds: Set<string>; cerrarIds: Set<string> } {
  const dayStart = getSegmentCalendarDayStartMs(nowMs);
  const abrirIds = new Set<string>();
  const cerrarIds = new Set<string>();
  for (const seg of segmentos) {
    if (seg.estado === "pendiente" && isWithinPuertaWindow(nowMs, seg.horaInicio, dayStart)) {
      abrirIds.add(seg.id);
    }
    if (
      seg.estado === "activo" &&
      seg.horaFin &&
      isWithinSegmentTimeMargin(nowMs, seg.horaInicio, seg.horaFin, "fin", 5, dayStart)
    ) {
      cerrarIds.add(seg.id);
    }
  }
  return { abrirIds, cerrarIds };
}

/** Nuevas alertas a disparar (dedup incluido). */
export function collectNewPuertaAlerts(
  segmentos: SegmentoV5[],
  nowMs = Date.now()
): PuertaWindowAlert[] {
  const day = getJournalDateString(nowMs);
  const { abrirIds, cerrarIds } = collectOpenPuertaWindows(segmentos, nowMs);
  const out: PuertaWindowAlert[] = [];

  for (const seg of segmentos) {
    if (abrirIds.has(seg.id)) {
      const key = `j4-abrir:${day}:${seg.id}`;
      if (!shouldDeliverPuertaAlertOnce(key, nowMs)) continue;
      out.push({
        kind: "abrir",
        segId: seg.id,
        nombre: seg.nombre,
        horaRef: seg.horaInicio,
        title: "Abre la puerta de atención",
        body: `${seg.nombre} · ventana ±5 min de ${seg.horaInicio}. Toca Abrir puerta.`,
        key,
      });
    }
    if (cerrarIds.has(seg.id)) {
      const key = `j4-cerrar:${day}:${seg.id}`;
      if (!shouldDeliverPuertaAlertOnce(key, nowMs)) continue;
      out.push({
        kind: "cerrar",
        segId: seg.id,
        nombre: seg.nombre,
        horaRef: seg.horaFin,
        title: "Cierra el segmento con intención",
        body: `${seg.nombre} · ventana ±5 min de ${seg.horaFin}. Toca Cerrar puerta (+2 PS).`,
        key,
      });
    }
  }
  return out;
}

/** Notification API mínima — sin voice / scheduleSegmentNotifications. */
export function showJornada4PuertaNotification(alert: PuertaWindowAlert): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(alert.title, {
      body: alert.body,
      icon: "/favicon.ico",
      tag: alert.key,
    });
    n.onclick = () => {
      window.focus();
      if (!window.location.pathname.startsWith("/jornada-v4")) {
        window.location.href = "/jornada-v4";
      }
      n.close();
    };
  } catch {
    /* noop */
  }
}

export async function ensureJornada4NotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

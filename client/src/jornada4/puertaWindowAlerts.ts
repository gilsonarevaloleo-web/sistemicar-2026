/**
 * Alertas de ventana de puerta Dual Kernel — sin voz ni speechQueue.
 * Anti-miopía: ordinal/total del día («3ª puerta de 8») en texto + Notification.
 * Timbre: Web Audio one-shot (puertaChime) — no TTS.
 */
import type { SegmentoV5 } from "@/lib/persistence";
import {
  isWithinPuertaWindow,
  segmentOrdinalIndex,
} from "@/lib/segmentAttentionEngine";
import { buildPuertaEscalamientoLabel } from "@/lib/puertaAtencionVoice";
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
  ordinal: number;
  total: number;
  /** «tercera puerta de 8 del día» — conciencia del mapa diario. */
  escalamiento: string;
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

function buildAlertForSeg(
  seg: SegmentoV5,
  kind: PuertaAlertKind,
  segmentos: SegmentoV5[],
  day: string
): PuertaWindowAlert {
  const total = Math.max(1, segmentos.length);
  const ordinal = segmentOrdinalIndex(segmentos, seg.id);
  const escalamiento = buildPuertaEscalamientoLabel(ordinal, total);
  const horaRef = kind === "abrir" ? seg.horaInicio : seg.horaFin;
  const key = `j4-${kind}:${day}:${seg.id}`;

  if (kind === "abrir") {
    return {
      kind,
      segId: seg.id,
      nombre: seg.nombre,
      horaRef,
      ordinal,
      total,
      escalamiento,
      title: `${escalamiento}`,
      body: `${seg.nombre} · ventana ±5 min de ${seg.horaInicio}. Toca Abrir puerta.`,
      key,
    };
  }
  return {
    kind,
    segId: seg.id,
    nombre: seg.nombre,
    horaRef,
    ordinal,
    total,
    escalamiento,
    title: `${escalamiento} · cierra`,
    body: `${seg.nombre} · ventana ±5 min de ${seg.horaFin}. Toca Cerrar puerta (+2 PS).`,
    key,
  };
}

/** Nuevas alertas a disparar (dedup incluido). Incluye escalamiento anti-miopía. */
export function collectNewPuertaAlerts(
  segmentos: SegmentoV5[],
  nowMs = Date.now()
): PuertaWindowAlert[] {
  const day = getJournalDateString(nowMs);
  const { abrirIds, cerrarIds } = collectOpenPuertaWindows(segmentos, nowMs);
  const out: PuertaWindowAlert[] = [];

  for (const seg of segmentos) {
    if (abrirIds.has(seg.id)) {
      const draft = buildAlertForSeg(seg, "abrir", segmentos, day);
      if (!shouldDeliverPuertaAlertOnce(draft.key, nowMs)) continue;
      out.push(draft);
    }
    if (cerrarIds.has(seg.id)) {
      const draft = buildAlertForSeg(seg, "cerrar", segmentos, day);
      if (!shouldDeliverPuertaAlertOnce(draft.key, nowMs)) continue;
      out.push(draft);
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

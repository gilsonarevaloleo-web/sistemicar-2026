/**
 * Puente voz ↔ segundo plano.
 * speechSynthesis no habla fuera de la pestaña en móvil; usamos notificaciones
 * programadas + cola de frases pendientes al volver a la app.
 */

import { readNotificationState } from "./notificationState";
import { getCrossingVehiclesState } from "./segmentCrossEntropyEngine";
import { getLimaDayStartMs } from "./segmentTime";
import { type UbicacionVoiceSource } from "./speechQueue";
import { speakUbicacionVoiceReliable } from "./ubicacionVoiceReliable";
import { isPuertaVozEnabled } from "./tikSound";
import { puertaVoiceKeyFromPhrase, shouldDeliverPuertaVoiceOnce } from "./puertaVoiceDedup";

function postAttentionNotification(opts: {
  title: string;
  body: string;
  tag: string;
}): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: "/favicon.ico",
      tag: opts.tag,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = "/jornada-v4";
      n.close();
    };
  } catch {
    /* noop */
  }
}

const MISSED_VOICE_KEY = "sistemicar_missed_puerta_voice";
let memoryMissedQueue: MissedVoiceItem[] = [];

export type MissedVoiceItem = {
  text: string;
  source: UbicacionVoiceSource;
  at: number;
};

export function isAppInBackground(): boolean {
  if (typeof document === "undefined") return false;
  return document.hidden || !document.hasFocus();
}

function readMissedQueue(): MissedVoiceItem[] {
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(MISSED_VOICE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MissedVoiceItem[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* fallback memoria */
  }
  return [...memoryMissedQueue];
}

function writeMissedQueue(items: MissedVoiceItem[]): void {
  const cutoff = Date.now() - 6 * 3600_000;
  const trimmed = items.filter(i => i.at >= cutoff).slice(-12);
  memoryMissedQueue = trimmed;
  try {
    if (typeof sessionStorage === "undefined") return;
    if (trimmed.length === 0) {
      sessionStorage.removeItem(MISSED_VOICE_KEY);
      return;
    }
    sessionStorage.setItem(MISSED_VOICE_KEY, JSON.stringify(trimmed));
  } catch {
    /* noop */
  }
}

export function peekMissedPuertaVoiceQueue(): MissedVoiceItem[] {
  return readMissedQueue();
}

export function clearMissedPuertaVoiceQueue(): void {
  writeMissedQueue([]);
}

export function enqueueMissedPuertaVoice(text: string, source: UbicacionVoiceSource = "puerta"): void {
  const phrase = text.trim();
  if (!phrase) return;
  const queue = readMissedQueue();
  if (queue.some(q => q.text === phrase)) return;
  queue.push({ text: phrase, source, at: Date.now() });
  writeMissedQueue(queue);
}

export function filterStaleMissedPuertaVoices(items: MissedVoiceItem[]): MissedVoiceItem[] {
  const state = readNotificationState();
  if (!state) return items;

  const dayStart = getLimaDayStartMs();
  const crossingCtx = getCrossingVehiclesState(state.segmentos, state.vehicles, dayStart);
  const cruceGracePhrase = "Cierre por entropía-atención. Ordena tu jornada, operador.";

  const matchesSegment = (text: string, nombre: string): boolean => {
    if (!text.includes(nombre)) return false;
    return (
      text.includes("Abre la puerta de atención") ||
      text.includes("ventana de apertura cierra") ||
      text.includes("Cierra este segmento con intención") ||
      text.includes("Entropía inminente") ||
      text.includes("Puerta abierta por el sistema") ||
      text.includes("puerta de ") ||
      text.startsWith(`Puerta de ${nombre} cerrada`) ||
      text.startsWith(`Cierra ${nombre} con intención`) ||
      text.startsWith(`Entropía inminente en ${nombre}`) ||
      text.startsWith(`${nombre}.`)
    );
  };

  return items.filter(item => {
    if (item.text === cruceGracePhrase) {
      return crossingCtx != null;
    }
    if (item.text.includes("Cierra vehículos del bloque anterior")) {
      return crossingCtx != null;
    }

    const seg = state.segmentos.find(s => matchesSegment(item.text, s.nombre));
    if (!seg) return true;

    if (
      item.text.includes("Abre la puerta de atención") ||
      (item.text.startsWith(`${seg.nombre}.`) && item.text.includes("segmento de"))
    ) {
      return seg.estado === "pendiente" && seg.vozDisparadaAt == null;
    }
    if (
      item.text.includes("ventana de apertura cierra") ||
      item.text.startsWith(`Puerta de ${seg.nombre} cerrada`)
    ) {
      return seg.estado === "pendiente";
    }
    if (
      item.text.includes("Cierra este segmento con intención") ||
      item.text.startsWith(`Cierra ${seg.nombre} con intención`)
    ) {
      return seg.estado === "activo";
    }
    if (
      item.text.includes("Entropía inminente") ||
      item.text.startsWith(`Entropía inminente en ${seg.nombre}`)
    ) {
      return seg.estado !== "entropia" && seg.estado !== "cerrado_manual";
    }

    return true;
  });
}

/** Reproduce frases que no pudieron hablarse en segundo plano. */
export function flushMissedPuertaVoiceOnVisible(): number {
  if (isAppInBackground()) return 0;
  const queue = filterStaleMissedPuertaVoices(readMissedQueue());
  if (queue.length === 0) {
    writeMissedQueue([]);
    return 0;
  }
  writeMissedQueue([]);
  for (const item of queue) {
    deliverPuertaVoice(item.text, {
      source: item.source,
      notifyTag: puertaVoiceKeyFromPhrase(item.text),
    });
  }
  return queue.length;
}

export function deliverPuertaVoice(
  text: string,
  opts?: {
    source?: UbicacionVoiceSource;
    notifyTitle?: string;
    notifyBody?: string;
    notifyTag?: string;
  }
): void {
  const phrase = text.trim();
  if (!phrase || !isPuertaVozEnabled()) return;
  const source = opts?.source ?? "puerta";
  const dedupKey = opts?.notifyTag ?? puertaVoiceKeyFromPhrase(phrase);
  if (!shouldDeliverPuertaVoiceOnce(dedupKey)) return;

  if (isAppInBackground()) {
    enqueueMissedPuertaVoice(phrase, source);
    if (opts?.notifyTitle) {
      postAttentionNotification({
        title: opts.notifyTitle,
        body: opts.notifyBody ?? phrase,
        tag: dedupKey,
      });
    }
    return;
  }

  speakUbicacionVoiceReliable(dedupKey, [phrase], false, source);
}

export function deliverSegmentEntropiaAlert(params: {
  nombre: string;
  reason: string;
  voicePhrase?: string;
}): void {
  const title = `ENTROPÍA: ${params.nombre}`;
  const body =
    params.reason === "missed_puerta"
      ? "Puerta abierta por el sistema. −2 PS. Cierra la puerta para recuperar +2 PS."
      : params.reason === "past_end"
        ? "No cerraste a tiempo. El sistema no perdona la omisión."
        : params.reason === "cruce_sin_cierre"
          ? "Vehículo del segmento anterior sin cierre consciente."
          : "Ventana de segmento perdida sin puerta consciente.";
  const phrase = params.voicePhrase ?? `Entropía en ${params.nombre}. ${body}`;

  if (isPuertaVozEnabled()) {
    deliverPuertaVoice(phrase, {
      source: "puerta",
      notifyTitle: title,
      notifyBody: body,
      notifyTag: `entropia-${params.nombre}`,
    });
  } else {
    postAttentionNotification({
      title,
      body,
      tag: `entropia-${params.nombre}`,
    });
  }
}

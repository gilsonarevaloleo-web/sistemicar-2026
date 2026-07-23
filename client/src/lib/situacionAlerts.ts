import { notifySituacionAlert } from "./notifications";
import {
  playSituacion2MinBell,
  playSituacionCupoSiren,
  vibrateSituacion2Min,
  vibrateSituacionCupo,
} from "./situacionAlertSounds";
import { isSituacionAlertsEnabled } from "./tikSound";
import { ringBienvenidaParts, ringTiempoSobraParts } from "./ringEnfoqueReal";
import { speakSituacionVoiceReliable } from "./ubicacionVoiceReliable";
import { isTimerDrivenVoiceEnabled } from "./timerDrivenVoice";
import {
  playGpsClipIds,
  prefetchGpsClips,
  ringBienvenidaClipIds,
  unlockGpsVoice,
} from "./gpsVoice";

function trimSubText(text: string, max = 48): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function fireSituacion2MinAlert(params: {
  vehicleId: string;
  vehicleTitulo: string;
  subTexto: string;
  tagKey: string;
}): void {
  if (!isSituacionAlertsEnabled()) return;
  const fila = trimSubText(params.subTexto);
  void playSituacion2MinBell();
  vibrateSituacion2Min();
  notifySituacionAlert({
    title: `2 min — ${params.vehicleTitulo}`,
    body: `Quedan 2 minutos para la fila: «${fila}». Prepárate.`,
    tag: `situacion-2m-${params.vehicleId}-${params.tagKey}`,
    vehicleId: params.vehicleId,
  });
  // Voz por temporizador OFF: chime/vibración bastan durante medición.
  if (!isTimerDrivenVoiceEnabled()) return;
  speakSituacionVoiceReliable(
    `2m-${params.tagKey}`,
    [`Dos minutos para la fila: ${fila}`],
    false
  );
}

export function fireSituacionCupoAlert(params: {
  vehicleId: string;
  vehicleTitulo: string;
  subTexto: string;
  tagKey: string;
  escalation?: boolean;
}): void {
  if (!isSituacionAlertsEnabled()) return;
  const fila = trimSubText(params.subTexto);
  void playSituacionCupoSiren();
  vibrateSituacionCupo();
  notifySituacionAlert({
    title: params.escalation
      ? `Cupo — ${params.vehicleTitulo} (recordatorio)`
      : `Cupo — ${params.vehicleTitulo}`,
    body: params.escalation
      ? `Aún pendiente: «${fila}». Marca Cumplido o Incumplido.`
      : `Cupo alcanzado en «${fila}». Marca Cumplido o Incumplido.`,
    tag: `situacion-cupo-${params.vehicleId}-${params.tagKey}${params.escalation ? "-esc" : ""}`,
    requireInteraction: !params.escalation,
    vehicleId: params.vehicleId,
  });
  if (!isTimerDrivenVoiceEnabled()) return;
  const phrase = params.escalation
    ? `Aún pendiente en ${fila}. Marca cumplido o incumplido.`
    : `Cupo alcanzado. Marca cumplido o incumplido en ${fila}`;
  speakSituacionVoiceReliable(
    `cupo-${params.tagKey}${params.escalation ? "-esc" : ""}`,
    [phrase],
    false
  );
}

/**
 * Ritual de entrada al ring de enfoque real (situacional).
 * Preferencia GPS (Web Audio + mp3): no depende de speechSynthesis.
 * Si el pack falla → fallback TTS atado al gesto.
 */
export function speakRingBienvenida(retoNumero: number, key?: string): void {
  if (!isSituacionAlertsEnabled()) return;
  const clipIds = ringBienvenidaClipIds(retoNumero);
  const ttsKey = key ?? `ring-bienvenida-${retoNumero}-${Date.now()}`;
  unlockGpsVoice();
  prefetchGpsClips(clipIds);
  void playGpsClipIds(clipIds).then(result => {
    if (result.ok) return;
    speakSituacionVoiceReliable(ttsKey, ringBienvenidaParts(retoNumero), true);
  });
}

/** Invitación cuando la cola está vacía y sobra mucho tiempo en la meta. */
export function speakRingTiempoSobra(
  minutosSobra: number,
  key?: string,
  onSpoken?: () => void
): () => void {
  if (!isTimerDrivenVoiceEnabled()) {
    onSpoken?.();
    return () => {};
  }
  return speakSituacionVoiceReliable(
    key ?? `ring-sobra-${minutosSobra}`,
    ringTiempoSobraParts(minutosSobra),
    false,
    onSpoken
  );
}

/** Anuncia por voz la fila activa del ring situacional. */
export function speakSituacionFilaEnFoco(
  filaTexto: string,
  opts?: { intro?: boolean; key?: string; onSpoken?: () => void }
): () => void {
  // Auto-fila es el disparador típico post-medida → fuera hasta reactivar timer voice.
  if (!isTimerDrivenVoiceEnabled()) {
    opts?.onSpoken?.();
    return () => {};
  }
  const fila = trimSubText(filaTexto, 56);
  if (!fila) return () => {};
  const phrases = opts?.intro
    ? [fila, "Ring de enfoque real activo"]
    : [fila, "Fila en foco"];
  const voiceKey = opts?.key ?? `fila-${fila}-${Date.now()}`;
  return speakSituacionVoiceReliable(voiceKey, phrases, true, opts?.onSpoken);
}

export const SITUACION_CUPO_ESCALATION_MS = 60_000;
export const SITUACION_CUPO_ESCALATION_MAX = 5;

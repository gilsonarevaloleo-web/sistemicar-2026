/**
 * Despacho pasivo de voz desglosador — GPS (Web Audio) primero; TTS de respaldo.
 */
import { enqueueDesglosadorVoicePassive } from "@/lib/speechQueue";
import { cleanSubTitulo } from "@/components/flota/vehicleCardShared";
import { rutaVozFluidoParts, rutaVozPartsForBanda } from "@/lib/rutaEnfoqueVoz";
import type { RutaBandaId } from "@/lib/rutaEnfoque";
import type { SubVehiculo } from "@/lib/persistence";
import {
  buildDesglosadorDepthPhrases,
  buildDesglosadorSubClosePhrases,
  buildSituacionFilaClosePhrases,
} from "@/lib/desglosadorSubCloseVoice";
import { isTimerDrivenVoiceEnabled } from "@/lib/timerDrivenVoice";
import { isDesglosadorVoiceEnabled } from "@/lib/tikSound";
import {
  GPS_CLIP_PACKS,
  playGpsClipIds,
  prefetchGpsClips,
  unlockGpsVoice,
} from "@/lib/gpsVoice";

export function dispatchDesglosadorVoice(
  key: string,
  phrases: string[],
  opts?: { cancelPrevious?: boolean; onSpoken?: () => void; rutaBandUmbral?: boolean }
): void {
  enqueueDesglosadorVoicePassive(key, phrases, {
    cancelPrevious: opts?.cancelPrevious,
    onPhraseStarted: opts?.onSpoken,
    rutaBandUmbral: opts?.rutaBandUmbral,
  });
}

export function dispatchDesglosadorSubIntroVoice(
  vehicleId: string,
  subId: string,
  aperturaAt: number,
  titulo: string,
  onSpoken?: () => void
): void {
  if (!isDesglosadorVoiceEnabled()) {
    onSpoken?.();
    return;
  }
  const key = `${vehicleId}:intro-${subId}-${aperturaAt}`;
  const clipIds = [...GPS_CLIP_PACKS.conquistaIntro];
  unlockGpsVoice();
  prefetchGpsClips(clipIds);
  void playGpsClipIds(clipIds).then(result => {
    if (result.ok) {
      onSpoken?.();
      return;
    }
    // Fallback TTS (incluye título dinámico) si el pack GPS no cargó.
    dispatchDesglosadorVoice(key, rutaVozFluidoParts(cleanSubTitulo(titulo)), {
      cancelPrevious: true,
      onSpoken,
    });
  });
}

const introSpokenKeys = new Set<string>();

/**
 * Intro de sub una sola vez por apertura.
 * No exige rutaActiva: la ruta suele nacer DESPUÉS de la gracia post-lanzamiento
 * (~2.5 s) y el intro a 700 ms se perdía siempre.
 */
export function dispatchDesglosadorSubIntroVoiceOnce(
  vehicleId: string,
  subId: string,
  aperturaAt: number,
  titulo: string,
  _rutaActiva?: boolean
): void {
  if (!aperturaAt) return;
  const key = `${vehicleId}:intro-${subId}-${aperturaAt}`;
  if (introSpokenKeys.has(key)) return;
  introSpokenKeys.add(key);
  dispatchDesglosadorSubIntroVoice(vehicleId, subId, aperturaAt, titulo);
}

/** Solo tests. */
export function resetDesglosadorIntroVoiceKeysForTests(): void {
  introSpokenKeys.clear();
}

export function dispatchDesglosadorRutaBandVoice(
  vehicleId: string,
  subId: string,
  banda: Extract<RutaBandaId, "concentrado" | "limite">,
  onSpoken?: () => void
): void {
  if (!isDesglosadorVoiceEnabled()) {
    onSpoken?.();
    return;
  }
  // Umbrales: GPS clips (Web Audio) — no pelean con el hilo como speechSynthesis.
  const clipIds =
    banda === "concentrado"
      ? [...GPS_CLIP_PACKS.conquistaConcentrado]
      : [...GPS_CLIP_PACKS.conquistaLimite];
  unlockGpsVoice();
  void playGpsClipIds(clipIds).then(result => {
    if (result.ok) {
      onSpoken?.();
      return;
    }
    // Solo si el operador reactivó timer TTS y faltan clips.
    if (!isTimerDrivenVoiceEnabled()) {
      onSpoken?.();
      return;
    }
    const key = `${vehicleId}:ruta-${subId}-${banda}`;
    dispatchDesglosadorVoice(key, rutaVozPartsForBanda(banda), {
      cancelPrevious: false,
      onSpoken,
      rutaBandUmbral: true,
    });
  });
}

export function dispatchDesglosadorSubCloseVoice(
  vehicleId: string,
  sub: SubVehiculo,
  status: "cumplido" | "fallado"
): void {
  const key = `${vehicleId}:close-${sub.id}-${sub.cierreAt ?? Date.now()}`;
  dispatchDesglosadorVoice(key, buildDesglosadorSubClosePhrases(sub, status), {
    cancelPrevious: false,
  });
}

export function dispatchDesglosadorDepthVoice(
  vehicleId: string,
  delta: number,
  hoursDone?: number
): void {
  const phrases = buildDesglosadorDepthPhrases(delta, hoursDone);
  if (phrases.length === 0) return;
  const key = `${vehicleId}:depth-${hoursDone ?? 0}-${Date.now()}`;
  dispatchDesglosadorVoice(key, phrases, { cancelPrevious: false });
}

export function dispatchSituacionFilaCloseVoice(
  vehicleId: string,
  subTareaId: string,
  texto: string,
  status: "cumplido" | "fallado",
  opts?: { psBase?: number; depthDelta?: number; minutosGanados?: number; ts?: number }
): void {
  const key = `${vehicleId}:ring-${subTareaId}-${opts?.ts ?? Date.now()}`;
  dispatchDesglosadorVoice(
    key,
    buildSituacionFilaClosePhrases(texto, status, opts),
    { cancelPrevious: false }
  );
}

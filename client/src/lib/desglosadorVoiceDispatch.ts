/**
 * Despacho pasivo de voz desglosador — la tarjeta solo encola; TTS vive en speechQueue.
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

export function dispatchDesglosadorVoice(
  key: string,
  phrases: string[],
  opts?: { cancelPrevious?: boolean; onSpoken?: () => void }
): void {
  enqueueDesglosadorVoicePassive(key, phrases, {
    cancelPrevious: opts?.cancelPrevious,
    onPhraseStarted: opts?.onSpoken,
  });
}

export function dispatchDesglosadorSubIntroVoice(
  vehicleId: string,
  subId: string,
  aperturaAt: number,
  titulo: string,
  onSpoken?: () => void
): void {
  const key = `${vehicleId}:intro-${subId}-${aperturaAt}`;
  dispatchDesglosadorVoice(key, rutaVozFluidoParts(cleanSubTitulo(titulo)), {
    cancelPrevious: true,
    onSpoken,
  });
}

const introSpokenKeys = new Set<string>();

/** Intro de sub una sola vez por apertura — dedup fuera del ciclo de vida de la tarjeta. */
export function dispatchDesglosadorSubIntroVoiceOnce(
  vehicleId: string,
  subId: string,
  aperturaAt: number,
  titulo: string,
  rutaActiva: boolean
): void {
  if (!rutaActiva || !aperturaAt) return;
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
  const key = `${vehicleId}:ruta-${subId}-${banda}`;
  dispatchDesglosadorVoice(key, rutaVozPartsForBanda(banda), { cancelPrevious: false, onSpoken });
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

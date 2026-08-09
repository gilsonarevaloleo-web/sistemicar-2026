import { voiceEngine } from "@/lib/speechQueue";

const MISSED_PUERTA_VOICE_KEY = "sistemicar_missed_puerta_voice";

/** Purga residuo de estado de voz corrupto al montar Home o iniciar el día. */
export function resetVoicePlaybackCache(): void {
  try {
    localStorage.removeItem(MISSED_PUERTA_VOICE_KEY);
  } catch {
    /* noop */
  }
  // Claves legacy de Punto Cero (UI ya retirada).
  try {
    sessionStorage.removeItem("sistemicar_punto_cero_audio_muted");
    sessionStorage.removeItem("sistemicar_punto_cero_audio_volume");
  } catch {
    /* noop */
  }
  voiceEngine.stopAllPending();
}

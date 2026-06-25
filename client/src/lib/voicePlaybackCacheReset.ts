import { resetPuntoCeroVoiceQueue } from "@/lib/puntoCeroVoice";
import {
  clearPuntoCeroStepVoiceRemountPause,
  teardownPuntoCeroStepVoice,
} from "@/lib/puntoCeroStepVoice";
import { voiceEngine } from "@/lib/speechQueue";

const PC_AUDIO_MUTE_KEY = "sistemicar_punto_cero_audio_muted";
const PC_AUDIO_VOLUME_KEY = "sistemicar_punto_cero_audio_volume";
const MISSED_PUERTA_VOICE_KEY = "sistemicar_missed_puerta_voice";

/** Purga residuo de estado de voz corrupto al montar Home o iniciar el día. */
export function resetVoicePlaybackCache(): void {
  try {
    sessionStorage.removeItem(PC_AUDIO_MUTE_KEY);
    sessionStorage.removeItem(PC_AUDIO_VOLUME_KEY);
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(MISSED_PUERTA_VOICE_KEY);
  } catch {
    /* noop */
  }
  clearPuntoCeroStepVoiceRemountPause();
  teardownPuntoCeroStepVoice();
  resetPuntoCeroVoiceQueue();
  voiceEngine.stopAllPending();
}

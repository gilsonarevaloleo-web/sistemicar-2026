/** Re-export — voz robusta del desglosador conquista. */
export {
  speakDesglosadorVoiceReliable,
  speakDesglosadorVoiceReliableDeferred,
  cancelDesglosadorVoice,
  cancelUbicacionVoice,
  cancelUbicacionVoiceForVehicle,
  cancelAllUbicacionVoice,
  ensureUbicacionVoiceRetryHub,
  retryAllPendingUbicacionVoice,
} from "./ubicacionVoiceReliable";

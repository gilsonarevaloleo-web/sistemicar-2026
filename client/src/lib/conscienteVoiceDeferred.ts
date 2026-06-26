/**
 * Emisión de voz fuera del ciclo React/Zustand — macrotarea diferida (setTimeout 0).
 * Evita que speechSynthesis bloquee el hilo principal al inicializar el altavoz.
 */
export function emitConscienteVoiceDeferred(text: string): void {
  setTimeout(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, 0);
}

/** Diferir callback de voz (p. ej. speakUbicacionVoiceReliable) tras pintado local. */
export function runConscienteVoiceDeferred(fn: () => void | (() => void)): () => void {
  let innerCleanup: (() => void) | undefined;
  const timer = setTimeout(() => {
    const result = fn();
    if (typeof result === "function") innerCleanup = result;
  }, 0);
  return () => {
    clearTimeout(timer);
    innerCleanup?.();
  };
}

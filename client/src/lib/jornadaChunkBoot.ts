/** Diagnóstico de carga del chunk lazy de Jornada V3 (bloque 0 del estudio). */
export type JornadaChunkLoadPhase = "idle" | "loading" | "loaded" | "failed" | "timeout";

let phase: JornadaChunkLoadPhase = "idle";
let lastChunkError: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(fn => fn());
}

export function subscribeJornadaChunkBoot(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getJornadaChunkLoadPhase(): JornadaChunkLoadPhase {
  return phase;
}

export function getJornadaChunkLastError(): string | null {
  return lastChunkError;
}

export function setJornadaChunkLoadPhase(next: JornadaChunkLoadPhase): void {
  phase = next;
  emit();
}

export function reportJornadaChunkError(err: unknown): void {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "chunk-import-failed";
  lastChunkError = message;
  phase = "failed";
  console.error("[jornadaChunkBoot]", message, err);
  emit();
}

export function markJornadaChunkLoaded(): void {
  lastChunkError = null;
  phase = "loaded";
  emit();
}

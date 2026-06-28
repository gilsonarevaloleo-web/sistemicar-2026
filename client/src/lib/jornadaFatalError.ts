/** Estado compartido para forzar ErrorBoundary sin throw en useEffect. */
import { bumpPlaneacionCrashCount } from "@/lib/situacionRepair";

let fatalMessage: string | null = null;
const listeners = new Set<() => void>();

export function subscribeJornadaFatal(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getJornadaFatal(): string | null {
  return fatalMessage;
}

export function setJornadaFatalError(message: string): void {
  try {
    bumpPlaneacionCrashCount();
  } catch {
    /* noop */
  }
  fatalMessage = message;
  listeners.forEach(fn => fn());
}

export function clearJornadaFatalError(): void {
  if (!fatalMessage) return;
  fatalMessage = null;
  listeners.forEach(fn => fn());
}

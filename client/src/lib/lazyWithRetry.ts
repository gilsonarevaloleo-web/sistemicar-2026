import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { markJornadaChunkLoaded, reportJornadaChunkError } from "@/lib/jornadaChunkBoot";

/** Reintenta import() dinámico — útil en móvil tras pestaña colgada. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  retries = 2
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await importer();
        markJornadaChunkLoaded();
        return mod;
      } catch (err) {
        lastError = err;
        reportJornadaChunkError(err);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

/** Precarga chunks de Jornada (menú → transición más rápida). */
export function prefetchJornadaChunk(): void {
  void import("@/pages/planeacionV3");
  void import("@/pages/planeacion");
}

import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { reportJornadaChunkError } from "@/lib/jornadaChunkBoot";

/** Reintenta import() dinámico — útil en móvil tras pestaña colgada. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  retries = 2
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

/** Jornada V4: mismo retry + diagnóstico de chunk. */
export function lazyJornadaWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  retries = 2
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importer();
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

function prefetch(importer: () => Promise<unknown>): Promise<void> {
  return importer()
    .catch(() => null)
    .then(() => undefined);
}

/** Precarga chunk de Jornada V4 (menú → transición más rápida). */
export function prefetchJornadaChunk(): Promise<void> {
  return prefetch(() => import("@/pages/jornadaV4"));
}

/** Precarga Depósito V2 — el recinto de escritura no debe parsearse en el gesto. */
export function prefetchDepositoChunk(): Promise<void> {
  return prefetch(() => import("@/pages/esperanza"));
}

export function prefetchEspejoChunk(): Promise<void> {
  return prefetch(() => import("@/pages/espejo"));
}

export function prefetchUmbralV2Chunk(): Promise<void> {
  return prefetch(() => import("@/pages/umbral-v2"));
}

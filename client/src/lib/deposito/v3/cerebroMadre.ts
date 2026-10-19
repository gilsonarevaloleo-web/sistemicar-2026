/**
 * Persistencia local del Cerebro Madre.
 * Recinto de casa: no se escribe por usuario, no toca V2 ni volcados_v3.
 */

import {
  absorbPrincipioDesdeVolcado,
  cerebroVacio,
  enviarAFiltro,
  leyesDeCasa,
  normalizarCerebroMadre,
  promoverALey,
  rechazarPrincipio,
  type CerebroMadre,
  type DepotAnalysisResult,
  type DepotEntryPayload,
  type ExtraerPrincipioInput,
  type PrincipioAprendizaje,
} from "@shared/deposito/v3";

export const CEREBRO_MADRE_STORAGE_KEY = "sistemicar_cerebro_madre_v3";
export const CEREBRO_MADRE_UPDATED_EVENT = "cerebro-madre-v3-updated";

/** Solo para tests de aislamiento. */
export const DEPOSITO_V2_STORAGE_KEY_FORBIDDEN = "sistemicar_volcados";
export const DEPOSITO_V3_STORAGE_KEY_FORBIDDEN = "sistemicar_volcados_v3";
export const AXIOMAS_V2_KEY_FORBIDDEN = "sistemicar_metacognicion";

const memory = new Map<string, string>();

function readBucket(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return memory.get(key) ?? null;
}

function writeBucket(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* ignore */
  }
  memory.set(key, value);
}

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CEREBRO_MADRE_UPDATED_EVENT));
  }
}

export function loadCerebroMadre(): CerebroMadre {
  try {
    const data = readBucket(CEREBRO_MADRE_STORAGE_KEY);
    if (!data) return cerebroVacio();
    return normalizarCerebroMadre(JSON.parse(data));
  } catch {
    return cerebroVacio();
  }
}

export function saveCerebroMadre(cerebro: CerebroMadre): CerebroMadre {
  const limpio = normalizarCerebroMadre(cerebro);
  writeBucket(CEREBRO_MADRE_STORAGE_KEY, JSON.stringify(limpio));
  emitUpdated();
  return limpio;
}

export function leyesCasaLocal(): PrincipioAprendizaje[] {
  return leyesDeCasa(loadCerebroMadre());
}

export function registrarVolcadoEnCerebroMadre(
  input: ExtraerPrincipioInput,
): CerebroMadre {
  const actual = loadCerebroMadre();
  const siguiente = absorbPrincipioDesdeVolcado(actual, input).cerebro;
  return saveCerebroMadre(siguiente);
}

export function registrarAuditoriaEnCerebroMadre(
  payload: DepotEntryPayload,
  result: DepotAnalysisResult,
): CerebroMadre {
  return registrarVolcadoEnCerebroMadre({ payload, result });
}

export function enviarCandidatoAFiltro(id: string): CerebroMadre {
  return saveCerebroMadre(enviarAFiltro(loadCerebroMadre(), id));
}

export function promoverFiltroALey(id: string): CerebroMadre {
  return saveCerebroMadre(promoverALey(loadCerebroMadre(), id));
}

export function rechazarCandidatoOFiltro(id: string): CerebroMadre {
  return saveCerebroMadre(rechazarPrincipio(loadCerebroMadre(), id));
}

export function subscribeToCerebroMadre(
  onData: (cerebro: CerebroMadre) => void,
): () => void {
  const emit = () => onData(loadCerebroMadre());
  emit();
  if (typeof window === "undefined") return () => {};
  const handler = () => emit();
  window.addEventListener(CEREBRO_MADRE_UPDATED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CEREBRO_MADRE_UPDATED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

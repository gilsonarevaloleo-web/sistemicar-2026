/**
 * Acervo local del Criterio Vivo del Maestro.
 * Una sola ruta (`/esperanza`); la memoria vive en el perfil del alumno.
 * Local-first: el recinto no espera Firebase para tener criterio.
 */

import {
  normalizarAcervoCriterios,
  sellarCriterio,
  type CriterioVivo,
  type SelloCriterioInput,
} from "@shared/deposito/criterioMaestro";

const STORAGE_KEY = "sistemicar_deposito_criterios";

export interface AcervoUsuario {
  userId: string;
  criterios: CriterioVivo[];
  updatedAt: string;
}

function parseAll(): AcervoUsuario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AcervoUsuario[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => ({
      userId: String(p.userId ?? ""),
      criterios: normalizarAcervoCriterios(p.criterios),
      updatedAt: String(p.updatedAt ?? ""),
    }));
  } catch {
    return [];
  }
}

function saveAll(acervos: AcervoUsuario[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acervos));
}

function persist(userId: string, criterios: CriterioVivo[]): AcervoUsuario {
  const acervo: AcervoUsuario = {
    userId,
    criterios: normalizarAcervoCriterios(criterios),
    updatedAt: new Date().toISOString(),
  };
  const rest = parseAll().filter((p) => p.userId !== userId);
  saveAll([acervo, ...rest]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("deposito-criterios-updated"));
  }
  return acervo;
}

export function leerCriteriosVivos(userId?: string | null): CriterioVivo[] {
  if (!userId) return [];
  const found = parseAll().find((p) => p.userId === userId);
  return found ? found.criterios : [];
}

export function guardarCriteriosVivos(
  userId: string,
  criterios: CriterioVivo[],
): AcervoUsuario {
  return persist(userId, criterios);
}

export function sellarCriterioLocal(
  userId: string,
  input: SelloCriterioInput,
): CriterioVivo[] {
  const siguiente = sellarCriterio(leerCriteriosVivos(userId), input);
  persist(userId, siguiente);
  return siguiente;
}

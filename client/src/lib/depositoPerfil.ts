/**
 * Perfil local de La Universidad — Grado de Maestría Perceptiva.
 * Una sola ruta (`/esperanza`); el grado vive en el perfil/estado del alumno.
 */

import {
  GRADO_MAESTRIA_INICIAL,
  normalizarGradoMaestria,
  type GradoMaestria,
} from "@shared/deposito/engineConfig";

const STORAGE_KEY = "sistemicar_universidad_perfil";

export interface PerfilUniversidad {
  userId: string;
  gradoMaestria: GradoMaestria;
  updatedAt: string;
}

function parseAll(): PerfilUniversidad[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PerfilUniversidad[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => ({
      userId: String(p.userId ?? ""),
      gradoMaestria: normalizarGradoMaestria(p.gradoMaestria),
      updatedAt: String(p.updatedAt ?? ""),
    }));
  } catch {
    return [];
  }
}

function saveAll(perfiles: PerfilUniversidad[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perfiles));
}

export function leerGradoMaestria(userId?: string | null): GradoMaestria {
  if (!userId) return GRADO_MAESTRIA_INICIAL;
  const found = parseAll().find((p) => p.userId === userId);
  return found ? found.gradoMaestria : GRADO_MAESTRIA_INICIAL;
}

export function guardarGradoMaestria(
  userId: string,
  grado: GradoMaestria,
): PerfilUniversidad {
  const perfil: PerfilUniversidad = {
    userId,
    gradoMaestria: normalizarGradoMaestria(grado),
    updatedAt: new Date().toISOString(),
  };
  const rest = parseAll().filter((p) => p.userId !== userId);
  saveAll([perfil, ...rest]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("universidad-perfil-updated"));
  }
  return perfil;
}

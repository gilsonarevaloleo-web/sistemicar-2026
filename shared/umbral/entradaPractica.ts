/**
 * Oficio (Casa 5) — deep link a la práctica de 10 códigos.
 * La Arena (venta) y La Forja (habilidad) viven aquí, no en el planeta 8.
 */

import {
  CODIGOS_NUMERO,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";

export function modoUmbralDesdeParam(raw: string | null | undefined): ModoUmbral | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v === "ARENA" || v === "EXTERNO_VENTAS" || v === "VENTAS") {
    return "EXTERNO_VENTAS";
  }
  if (v === "FORJA" || v === "INTERNO_HABILIDAD" || v === "HABILIDAD") {
    return "INTERNO_HABILIDAD";
  }
  return null;
}

export interface OficioPracticaFijacion {
  modo: ModoUmbral;
  codigo?: CodigoNumero;
}

export function parseOficioPracticaSearch(
  search: string,
): OficioPracticaFijacion | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const modo = modoUmbralDesdeParam(params.get("modo"));
  const codigoN = Number(params.get("codigo") || "");
  const codigo = (CODIGOS_NUMERO as readonly number[]).includes(codigoN)
    ? (codigoN as CodigoNumero)
    : undefined;
  if (!modo && codigo == null) return null;
  return { modo: modo ?? "INTERNO_HABILIDAD", codigo };
}

export function buildOficioPracticaHref(
  modo: ModoUmbral,
  codigo?: CodigoNumero,
): string {
  const q = new URLSearchParams();
  q.set("modo", modo === "EXTERNO_VENTAS" ? "arena" : "forja");
  if (codigo) q.set("codigo", String(codigo));
  return `/umbral/v2?${q.toString()}`;
}

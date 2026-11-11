/**
 * Cliente del gimnasio (planeta 6). Se abre desde /limite.
 */

import type { LibroGimnasio, PreguntaViva } from "@shared/casas/gimnasio6";

export interface GimnasioPayload {
  success: true;
  libro: LibroGimnasio;
  pregunta: PreguntaViva | null;
  copia: string;
  topeDiario: boolean;
  ritualEntrada: string;
}

interface ErrorBody {
  success?: false;
  error?: string;
  codigo?: string | null;
}

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(res.ok ? "El gimnasio devolvió una respuesta ilegible." : `Error HTTP ${res.status}`);
  }
}

function throwIfNotOk(res: Response, body: GimnasioPayload | ErrorBody): asserts body is GimnasioPayload {
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(("error" in body && body.error) || "El gimnasio no respondió.");
  }
}

export async function abrirVendedorGimnasio(input: {
  userId: string;
  textoOficio?: string;
}): Promise<GimnasioPayload> {
  const res = await fetch("/api/casas/gimnasio6/abrir-vendedor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<GimnasioPayload | ErrorBody>(res);
  throwIfNotOk(res, body);
  return body;
}

export async function abrirGimnasio(input: {
  userId: string;
  sesionUmbral5Id: string;
}): Promise<GimnasioPayload> {
  const res = await fetch("/api/casas/gimnasio6/abrir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<GimnasioPayload | ErrorBody>(res);
  throwIfNotOk(res, body);
  return body;
}

export async function responderGimnasio(input: {
  userId: string;
  libroId: string;
  respuesta: string;
  libro?: LibroGimnasio;
}): Promise<GimnasioPayload> {
  const res = await fetch("/api/casas/gimnasio6/responder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<GimnasioPayload | ErrorBody>(res);
  throwIfNotOk(res, body);
  return body;
}

export async function continuarGimnasio(input: {
  userId: string;
  libroId: string;
  libro?: LibroGimnasio;
}): Promise<GimnasioPayload> {
  const res = await fetch("/api/casas/gimnasio6/continuar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<GimnasioPayload | ErrorBody>(res);
  throwIfNotOk(res, body);
  return body;
}

export async function listarLibrosGimnasio(userId: string): Promise<{ success: true; libros: LibroGimnasio[] }> {
  const res = await fetch(
    `/api/casas/gimnasio6/libros?userId=${encodeURIComponent(userId)}`,
  );
  const body = await parseJson<{ success: true; libros: LibroGimnasio[] } | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(("error" in body && body.error) || "No se pudieron listar los libros.");
  }
  return body;
}

export async function leerLibroGimnasio(input: {
  userId: string;
  libroId: string;
}): Promise<GimnasioPayload> {
  const res = await fetch(
    `/api/casas/gimnasio6/libro/${encodeURIComponent(input.libroId)}?userId=${encodeURIComponent(input.userId)}`,
  );
  const body = await parseJson<GimnasioPayload | ErrorBody>(res);
  throwIfNotOk(res, body);
  return body;
}

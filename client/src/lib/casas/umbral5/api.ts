/**
 * Cliente de La Casa 6: Umbral.
 * Volcado gratis. Lectura-mapa a 1 crédito del ledger del Juez.
 */

import type {
  FuenteLecturaUmbral5,
  SesionUmbral5,
  Umbral5Lectura,
} from "@shared/casas/umbral5";

export class Umbral5SaldoError extends Error {
  readonly status = 402;
  readonly codigo = "SALDO_INSUFICIENTE";
  readonly saldo: number | null;
  readonly requeridos: number | null;

  constructor(
    message: string,
    extra: { saldo?: number | null; requeridos?: number | null } = {},
  ) {
    super(message);
    this.name = "Umbral5SaldoError";
    this.saldo = extra.saldo ?? null;
    this.requeridos = extra.requeridos ?? null;
  }
}

export interface VolcadoResponse {
  success: true;
  sesionUmbral5Id: string;
  textoVolcado: string;
  lectura: Umbral5Lectura;
  source: FuenteLecturaUmbral5;
  creditosDescontados: 0;
  saldo: number;
  ritual: string;
  version: string;
}

export interface LecturaResponse {
  success: true;
  sesionUmbral5Id: string;
  lectura: Umbral5Lectura;
  creditosDescontados: number;
  saldo: number;
  source: "gemini" | "local_fallback";
  ritual: string;
  version: string;
}

export interface SaldoResponse {
  success: true;
  saldo: number;
  ilimitado?: boolean;
  creditos: { lectura: number; volcado: number };
}

export interface SesionesResponse {
  success: true;
  userId: string;
  sesiones: SesionUmbral5[];
}

export interface SesionResponse {
  success: true;
  sesion: SesionUmbral5;
}

interface ErrorBody {
  success?: false;
  error?: string;
  codigo?: string | null;
  requeridos?: number | null;
  saldo?: number | null;
}

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Umbral devolvió una respuesta ilegible."
        : `Error HTTP ${res.status}`,
    );
  }
}

function throwIfPagoRequerido(res: Response, body: ErrorBody): void {
  if (res.status !== 402 && body.codigo !== "SALDO_INSUFICIENTE") return;
  throw new Umbral5SaldoError(body.error || "Saldo insuficiente.", {
    saldo: body.saldo ?? null,
    requeridos: body.requeridos ?? null,
  });
}

function queryUsuario(userId: string, email?: string | null): string {
  const q = new URLSearchParams({ userId });
  if (email?.trim()) q.set("email", email.trim());
  return q.toString();
}

export async function leerSaldoUmbral5(
  userId: string,
  email?: string | null,
): Promise<SaldoResponse> {
  const res = await fetch(`/api/casas/umbral5/saldo?${queryUsuario(userId, email)}`);
  const body = await parseJson<SaldoResponse | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(
      ("error" in body && body.error) || "No se pudo leer el saldo.",
    );
  }
  return body;
}

export async function sellarVolcado(input: {
  userId: string;
  limiteConocido: string;
  email?: string | null;
}): Promise<VolcadoResponse> {
  const res = await fetch("/api/casas/umbral5/volcado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<VolcadoResponse | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(
      ("error" in body && body.error) || "No se pudo sellar el volcado.",
    );
  }
  return body;
}

export async function listarSesionesUmbral5(
  userId: string,
): Promise<SesionesResponse> {
  const res = await fetch(
    `/api/casas/umbral5/sesiones?userId=${encodeURIComponent(userId)}`,
  );
  const body = await parseJson<SesionesResponse | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(
      ("error" in body && body.error) || "No se pudieron listar los volcados.",
    );
  }
  return body;
}

export async function leerSesionUmbral5(input: {
  userId: string;
  sesionUmbral5Id: string;
}): Promise<SesionResponse> {
  const res = await fetch(
    `/api/casas/umbral5/sesion/${encodeURIComponent(input.sesionUmbral5Id)}?userId=${encodeURIComponent(input.userId)}`,
  );
  const body = await parseJson<SesionResponse | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(
      ("error" in body && body.error) || "No se pudo leer la sesión.",
    );
  }
  return body;
}

export async function leerMapa(input: {
  userId: string;
  sesionUmbral5Id: string;
  email?: string | null;
}): Promise<LecturaResponse> {
  const res = await fetch("/api/casas/umbral5/lectura", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<LecturaResponse | ErrorBody>(res);
  throwIfPagoRequerido(res, "error" in body ? body : {});
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(
      ("error" in body && body.error) || "No se pudo leer el mapa.",
    );
  }
  return body;
}

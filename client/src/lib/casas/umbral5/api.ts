/**
 * Cliente de La Casa 5: Umbral.
 * Volcado gratis. Lectura-mapa a 1 crédito del ledger del Juez.
 */

import type { Umbral5Lectura } from "@shared/casas/umbral5";

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
  creditos: { lectura: number; volcado: number };
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

export async function leerSaldoUmbral5(userId: string): Promise<SaldoResponse> {
  const res = await fetch(
    `/api/casas/umbral5/saldo?userId=${encodeURIComponent(userId)}`,
  );
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

export async function leerMapa(input: {
  userId: string;
  sesionUmbral5Id: string;
}): Promise<LecturaResponse> {
  const res = await fetch("/api/casas/umbral5/lectura", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<LecturaResponse | ErrorBody>(res);
  throwIfPagoRequerido(res, body);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(
      ("error" in body && body.error) || "No se pudo leer el mapa.",
    );
  }
  return body;
}

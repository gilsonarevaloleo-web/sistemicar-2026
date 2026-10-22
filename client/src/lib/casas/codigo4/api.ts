/**
 * Cliente del Juez Serio. Fase 1 oculta la directiva. Fase 2 la desbloquea.
 */

import type {
  HistorialJuezItem,
  JuezSerioFase1,
  JuezSerioFase2,
} from "@shared/casas/codigo4";

export class JuezSaldoError extends Error {
  readonly status = 402;
  readonly codigo = "SALDO_INSUFICIENTE";
  readonly fase: 1 | 2 | null;
  readonly saldo: number | null;
  readonly requeridos: number | null;

  constructor(message: string, extra: {
    fase?: 1 | 2 | null;
    saldo?: number | null;
    requeridos?: number | null;
  } = {}) {
    super(message);
    this.name = "JuezSaldoError";
    this.fase = extra.fase ?? null;
    this.saldo = extra.saldo ?? null;
    this.requeridos = extra.requeridos ?? null;
  }
}

export interface Fase1Response {
  success: true;
  sesionJuezId: string;
  fase1_lectura: JuezSerioFase1;
  requiereInversionCreditos: true;
  creditosDescontados: number;
  saldo: number;
  source: "gemini" | "local_fallback";
  ritual: string;
  version: string;
}

export interface Fase2Response {
  success: true;
  sesionJuezId: string;
  fase2_propuesta_solucion: JuezSerioFase2;
  creditosDescontados: number;
  saldo: number;
  version: string;
}

export interface SaldoResponse {
  success: true;
  saldo: number;
  creditos: { fase1: number; fase2: number };
}

export interface HistorialResponse {
  success: true;
  items: HistorialJuezItem[];
}

interface ErrorBody {
  success?: false;
  error?: string;
  codigo?: string | null;
  fase?: 1 | 2 | null;
  requeridos?: number | null;
  saldo?: number | null;
}

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      res.ok ? "El Juez devolvió una respuesta ilegible." : `Error HTTP ${res.status}`,
    );
  }
}

function throwIfPagoRequerido(res: Response, body: ErrorBody): void {
  if (res.status !== 402 && body.codigo !== "SALDO_INSUFICIENTE") return;
  throw new JuezSaldoError(
    body.error || "Saldo insuficiente.",
    {
      fase: body.fase ?? null,
      saldo: body.saldo ?? null,
      requeridos: body.requeridos ?? null,
    },
  );
}

export async function leerSaldoJuez(userId: string): Promise<SaldoResponse> {
  const res = await fetch(
    `/api/casas/codigo4/saldo?userId=${encodeURIComponent(userId)}`,
  );
  const body = await parseJson<SaldoResponse | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(("error" in body && body.error) || "No se pudo leer el saldo.");
  }
  return body;
}

export async function leerHistorialJuez(userId: string): Promise<HistorialResponse> {
  const res = await fetch(
    `/api/casas/codigo4/historial?userId=${encodeURIComponent(userId)}`,
  );
  const body = await parseJson<HistorialResponse | ErrorBody>(res);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(("error" in body && body.error) || "No se pudo leer el historial.");
  }
  return body;
}

export async function auditarFase1(input: {
  userId: string;
  friccionDiaria: string;
  codigoConquistadoMax?: number;
}): Promise<Fase1Response> {
  const res = await fetch("/api/casas/codigo4/fase1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<Fase1Response | ErrorBody>(res);
  throwIfPagoRequerido(res, body);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(("error" in body && body.error) || "No se pudo auditar el volcado.");
  }
  return body;
}

export async function desbloquearFase2(input: {
  userId: string;
  sesionJuezId: string;
}): Promise<Fase2Response> {
  const res = await fetch("/api/casas/codigo4/fase2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<Fase2Response | ErrorBody>(res);
  throwIfPagoRequerido(res, body);
  if (!res.ok || !("success" in body) || body.success !== true) {
    throw new Error(("error" in body && body.error) || "No se pudo desbloquear la directiva.");
  }
  return body;
}

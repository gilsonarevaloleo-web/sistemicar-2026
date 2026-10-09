/**
 * Cliente del auditor V3. No usa /api/deposito/volcado (Muro V2).
 */

import type {
  DepotAnalysisResult,
  DepotEntryInput,
  UserTier,
} from "@shared/deposito/v3";

export interface DepositoV3AuditSuccess {
  success: true;
  result: DepotAnalysisResult;
  source: "gemini" | "local_fallback";
  userTier: UserTier;
  ritual: string;
  version: string;
}

export interface DepositoV3AuditError {
  success: false;
  error: string;
  result: null;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const rawText = await res.text();
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(
      res.ok
        ? "El servidor devolvió una respuesta ilegible."
        : `Error HTTP ${res.status}`,
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("deposito-v3-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function auditarVolcadoV3(
  payload: DepotEntryInput,
): Promise<DepositoV3AuditSuccess> {
  let res: Response;
  try {
    res = await withTimeout(
      fetch("/api/deposito/v3/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      12000,
    );
  } catch {
    throw new Error(
      "No hay conexión con el laboratorio V3. Revisa tu red e inténtalo de nuevo.",
    );
  }

  const data = await parseJsonResponse<
    DepositoV3AuditSuccess | DepositoV3AuditError
  >(res);
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Error HTTP ${res.status} al auditar`);
  }
  return data;
}

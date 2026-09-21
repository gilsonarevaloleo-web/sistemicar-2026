import type {
  CapturaVolcadoInput,
  DiagnosticoVolcado,
  GradoMaestria,
} from "@shared/deposito/engineConfig";

export interface DepositoVolcadoSuccess {
  success: true;
  diagnostico: DiagnosticoVolcado;
  source: "gemini" | "local_fallback";
  ritual: string;
  gradoMaestria?: GradoMaestria;
}

export interface DepositoVolcadoError {
  success: false;
  error: string;
  diagnostico: DiagnosticoVolcado | null;
}

export type DepositoVolcadoResponse =
  | DepositoVolcadoSuccess
  | DepositoVolcadoError;

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
    const timer = setTimeout(() => reject(new Error("deposito-timeout")), ms);
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

/**
 * Envía el volcado al motor de La Universidad (Gemini + Muro de Dominancia).
 */
export async function procesarVolcadoRemoto(
  textoVolcado: string,
  captura?: CapturaVolcadoInput,
): Promise<DepositoVolcadoSuccess> {
  let res: Response;
  try {
    res = await withTimeout(
      fetch("/api/deposito/volcado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textoVolcado,
          ...captura,
          volcadoCrudo: captura?.volcadoCrudo ?? textoVolcado,
        }),
      }),
      12000,
    );
  } catch {
    throw new Error(
      "No hay conexión con La Universidad. Revisa tu red e inténtalo de nuevo.",
    );
  }

  const data = await parseJsonResponse<DepositoVolcadoResponse>(res);
  if (!res.ok || data.success === false) {
    const err = data as DepositoVolcadoError;
    throw new Error(err.error || `Error HTTP ${res.status} al procesar el volcado`);
  }
  return data;
}

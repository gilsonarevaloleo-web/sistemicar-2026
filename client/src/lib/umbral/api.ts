import type { CodigoNumero, ModoUmbral } from "@shared/umbral/engineConfig";

export interface UmbralHistorialItem {
  rol: "user" | "system";
  texto: string;
}

export interface UmbralEvaluarRequest {
  userId: string;
  modo: ModoUmbral;
  codigoActual: CodigoNumero;
  respuestaUsuario: string;
  historialPrevio?: UmbralHistorialItem[];
}

export interface UmbralEvaluarSuccess {
  success: true;
  modo: ModoUmbral;
  codigoEvaluado: CodigoNumero;
  aprobado: boolean;
  feedbackConfrontativo: string;
  codigoSiguiente: CodigoNumero | null;
  moduloCompletado: boolean;
  nombreCodigo: string;
  userId: string;
  source?: "gemini" | "local_fallback";
}

export interface UmbralEvaluarError {
  success: false;
  modo: ModoUmbral | null;
  codigoEvaluado: number | null;
  aprobado: false;
  feedbackConfrontativo: string;
  codigoSiguiente: number | null;
  error: string;
}

export type UmbralEvaluarResponse = UmbralEvaluarSuccess | UmbralEvaluarError;

export async function evaluarUmbral(
  body: UmbralEvaluarRequest,
): Promise<UmbralEvaluarResponse> {
  let res: Response;
  try {
    res = await fetch("/api/umbral/evaluar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "No hay conexión con el evaluador. Revisa tu red e inténtalo de nuevo.",
    );
  }

  const rawText = await res.text();
  let data: UmbralEvaluarResponse | null = null;
  try {
    data = JSON.parse(rawText) as UmbralEvaluarResponse;
  } catch {
    throw new Error(
      res.ok
        ? "El evaluador devolvió una respuesta ilegible."
        : `Error HTTP ${res.status} al evaluar Umbral`,
    );
  }

  if (!res.ok || data.success === false) {
    const err = data as UmbralEvaluarError;
    // Preferir el feedback confrontativo (útil) sobre el código técnico.
    throw new Error(
      err.feedbackConfrontativo ||
        err.error ||
        `Error HTTP ${res.status} al evaluar Umbral`,
    );
  }
  return data;
}

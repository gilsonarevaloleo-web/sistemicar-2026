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
  const res = await fetch("/api/umbral/evaluar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as UmbralEvaluarResponse;
  if (!res.ok || data.success === false) {
    const err = data as UmbralEvaluarError;
    throw new Error(
      err.error ||
        err.feedbackConfrontativo ||
        `Error HTTP ${res.status} al evaluar Umbral`,
    );
  }
  return data;
}

import type { CodigoNumero, ModoUmbral } from "@shared/umbral/engineConfig";
import type { MetricasDiagnosticasUmbral } from "@shared/umbral/metrics";
import type { ProgresoCarreraUmbral } from "@shared/umbral/progreso";
import type { SesionUmbral } from "@shared/umbral/sessionTypes";

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
  /** Sesión activa a continuar (si existe y está EN_PROGRESO). */
  sesionId?: string;
  /** PS reales otorgados en cliente tras aprobar (opcional). */
  psGanados?: number;
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
  sesionId: string;
  sesion: SesionUmbral;
  progreso?: ProgresoCarreraUmbral;
  codigoRecomendado?: CodigoNumero;
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

export interface UmbralSesionesResponse {
  success: true;
  userId: string;
  sesiones: SesionUmbral[];
  metricas: MetricasDiagnosticasUmbral;
  progreso?: ProgresoCarreraUmbral;
}

export interface UmbralSesionDetalleResponse {
  success: true;
  sesion: SesionUmbral;
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

export async function evaluarUmbral(
  body: UmbralEvaluarRequest,
): Promise<UmbralEvaluarSuccess> {
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

  const data = await parseJsonResponse<UmbralEvaluarResponse>(res);

  if (!res.ok || data.success === false) {
    const err = data as UmbralEvaluarError;
    throw new Error(
      err.feedbackConfrontativo ||
        err.error ||
        `Error HTTP ${res.status} al evaluar Umbral`,
    );
  }
  return data;
}

export async function listarSesionesUmbral(
  userId: string,
): Promise<UmbralSesionesResponse> {
  let res: Response;
  try {
    const q = new URLSearchParams({ userId });
    res = await fetch(`/api/umbral/sesiones?${q.toString()}`);
  } catch {
    throw new Error("No hay conexión para cargar sesiones Umbral.");
  }
  const data = await parseJsonResponse<
    UmbralSesionesResponse | { success: false; error?: string }
  >(res);
  if (!res.ok || !data || (data as { success: boolean }).success === false) {
    throw new Error(
      (data as { error?: string }).error ||
        `Error HTTP ${res.status} al listar sesiones`,
    );
  }
  return data as UmbralSesionesResponse;
}

export async function obtenerSesionUmbral(
  userId: string,
  sesionId: string,
): Promise<UmbralSesionDetalleResponse> {
  let res: Response;
  try {
    const q = new URLSearchParams({ userId });
    res = await fetch(
      `/api/umbral/sesion/${encodeURIComponent(sesionId)}?${q.toString()}`,
    );
  } catch {
    throw new Error("No hay conexión para cargar la sesión Umbral.");
  }
  const data = await parseJsonResponse<
    UmbralSesionDetalleResponse | { success: false; error?: string }
  >(res);
  if (!res.ok || !data || (data as { success: boolean }).success === false) {
    throw new Error(
      (data as { error?: string }).error ||
        `Error HTTP ${res.status} al obtener sesión`,
    );
  }
  return data as UmbralSesionDetalleResponse;
}

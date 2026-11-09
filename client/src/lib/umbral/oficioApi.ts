/**
 * Cliente de La Casa 5: Oficio.
 * Volcado de entrada gratis. Si la API falla, el motor local lee igual.
 */

import {
  diagnosticarOficioLocal,
  type OficioLectura,
} from "@shared/umbral/oficioMotor";
import {
  CASA_OFICIO_RITUAL_CORTO,
  CASA_OFICIO_VERSION,
} from "@shared/umbral/oficioCasa";
import { guardarSesionOficioLocal } from "./oficioLocal";

export interface VolcadoOficioResponse {
  success: true;
  sesionOficioId: string;
  textoVolcado: string;
  lectura: OficioLectura;
  creditosDescontados: 0;
  source: "local" | "local_fallback";
  ritual: string;
  version: string;
}

interface ErrorBody {
  success?: false;
  error?: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Oficio devolvió una respuesta ilegible."
        : `Error HTTP ${res.status}`,
    );
  }
}

export async function leerVolcadoOficio(input: {
  textoVolcado: string;
  userId?: string;
}): Promise<VolcadoOficioResponse> {
  const texto = input.textoVolcado.trim();
  const userId = input.userId?.trim() || "oficio-publico";
  try {
    const res = await fetch("/api/casas/oficio/volcado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, textoVolcado: texto }),
    });
    const body = await parseJson<VolcadoOficioResponse | ErrorBody>(res);
    if (res.ok && "success" in body && body.success === true) {
      guardarSesionOficioLocal({
        id: body.sesionOficioId,
        userId,
        textoVolcado: body.textoVolcado,
        lectura: body.lectura,
        createdAt: new Date().toISOString(),
      });
      return body;
    }
    throw new Error(
      ("error" in body && body.error) || "No se pudo leer el volcado.",
    );
  } catch {
    const lectura = diagnosticarOficioLocal(texto);
    const local: VolcadoOficioResponse = {
      success: true,
      sesionOficioId: `local-${Date.now()}`,
      textoVolcado: texto,
      lectura,
      creditosDescontados: 0,
      source: "local_fallback",
      ritual: CASA_OFICIO_RITUAL_CORTO,
      version: CASA_OFICIO_VERSION,
    };
    guardarSesionOficioLocal({
      id: local.sesionOficioId,
      userId,
      textoVolcado: texto,
      lectura,
      createdAt: new Date().toISOString(),
    });
    return local;
  }
}

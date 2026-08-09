/**
 * Umbral v2 — API de evaluación con Gemini.
 * Spec: umbral v2. segunda parte
 */

import type { Express, Request, Response } from "express";
import {
  DICCIONARIO_CODIGOS,
  evaluarUmbralLocal,
  isCodigoNumero,
  isModoUmbral,
  obtenerPromptEvaluacion,
  parseEvaluacionGemini,
  serializarPromptEvaluacion,
  type CodigoNumero,
  type EvaluacionGeminiJson,
  type HistorialUmbralItem,
  type ModoUmbral,
} from "../shared/umbral/engineConfig";

export type GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export type GeminiJsonParser = (raw: string) => any;

export interface UmbralV2RouteDeps {
  callGemini?: GeminiCaller;
  parseGeminiJSON?: GeminiJsonParser;
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
  source: "gemini" | "local_fallback";
}

export interface UmbralEvaluarErrorBody {
  success: false;
  modo: ModoUmbral | null;
  codigoEvaluado: number | null;
  aprobado: false;
  feedbackConfrontativo: string;
  codigoSiguiente: number | null;
  error: string;
}

function normalizeHistorial(raw: unknown): HistorialUmbralItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-16)
    .map((item) => {
      const rol = item?.rol === "system" ? "system" : "user";
      return {
        rol: rol as HistorialUmbralItem["rol"],
        texto: String(item?.texto ?? "").trim(),
      };
    })
    .filter((h) => h.texto.length > 0);
}

/**
 * Umbral v2 — POST /api/umbral/evaluar
 */
export function registerUmbralV2Routes(app: Express, deps: UmbralV2RouteDeps = {}) {
  const callGemini = deps.callGemini;

  app.get("/api/umbral/meta", (_req: Request, res: Response) => {
    res.json({
      version: "2.0.1-parte2-fix",
      endpoint: "POST /api/umbral/evaluar",
      modos: ["INTERNO_HABILIDAD", "EXTERNO_VENTAS"],
      codigos: Object.values(DICCIONARIO_CODIGOS).map((c) => ({
        numero: c.numero,
        nombre: c.nombre,
        conceptoClave: c.conceptoClave,
      })),
      gemini: Boolean(callGemini),
      fallbackLocal: true,
    });
  });

  app.post("/api/umbral/evaluar", async (req: Request, res: Response) => {
    const userId = String(req.body?.userId ?? "").trim();
    const modoRaw = req.body?.modo;
    const codigoRaw = Number(req.body?.codigoActual);
    const respuestaUsuario = String(req.body?.respuestaUsuario ?? "").trim();
    const historialPrevio = normalizeHistorial(req.body?.historialPrevio);

    const modo: ModoUmbral | null = isModoUmbral(modoRaw) ? modoRaw : null;
    const codigoActual: CodigoNumero | null = isCodigoNumero(codigoRaw)
      ? codigoRaw
      : null;

    const fallback = (
      status: number,
      error: string,
      extras: Partial<UmbralEvaluarErrorBody> = {},
    ) => {
      const body: UmbralEvaluarErrorBody = {
        success: false,
        modo,
        codigoEvaluado: codigoActual,
        aprobado: false,
        feedbackConfrontativo:
          extras.feedbackConfrontativo ??
          "No se pudo completar la evaluación. Reintenta sin romper el flujo.",
        codigoSiguiente: codigoActual,
        error,
        ...extras,
      };
      return res.status(status).json(body);
    };

    try {
      if (!userId) {
        return fallback(400, "userId es requerido");
      }
      if (!modo) {
        return fallback(
          400,
          "modo inválido (INTERNO_HABILIDAD | EXTERNO_VENTAS)",
        );
      }
      if (!codigoActual) {
        return fallback(400, "codigoActual inválido (entero 1–10)");
      }
      if (respuestaUsuario.length < 2) {
        return fallback(400, "respuestaUsuario es requerida");
      }

      const promptInput = {
        codigo: codigoActual,
        modo,
        respuestaUsuario,
        historialPrevio,
      };
      const prompt = obtenerPromptEvaluacion(promptInput);

      let evaluacion: EvaluacionGeminiJson | null = null;
      let source: "gemini" | "local_fallback" = "local_fallback";

      if (callGemini) {
        try {
          // 2.5 Flash usa tokens de pensamiento: 700 suele truncar el JSON.
          const raw = await callGemini(
            serializarPromptEvaluacion(prompt),
            2048,
            true,
          );
          try {
            evaluacion = parseEvaluacionGemini(raw, codigoActual);
            source = "gemini";
          } catch (parseErr) {
            // Reintento sin jsonMode estricto (a veces el MIME JSON llega vacío/truncado).
            console.warn(
              "[umbral/evaluar] parse JSON-mode falló, reintentando texto libre:",
              parseErr,
              "raw:",
              String(raw).slice(0, 240),
            );
            const raw2 = await callGemini(
              serializarPromptEvaluacion(prompt) +
                "\n\nIMPORTANTE: responde SOLO un objeto JSON con claves aprobado, feedbackConfrontativo, codigoSiguiente.",
              2048,
              false,
            );
            evaluacion = parseEvaluacionGemini(raw2, codigoActual);
            source = "gemini";
          }
        } catch (err: any) {
          console.error("[umbral/evaluar] Gemini error → fallback local:", err);
          evaluacion = null;
        }
      }

      if (!evaluacion) {
        evaluacion = evaluarUmbralLocal(promptInput);
        source = "local_fallback";
      }

      const moduloCompletado =
        evaluacion.aprobado === true && codigoActual === 10;

      const body: UmbralEvaluarSuccess = {
        success: true,
        modo,
        codigoEvaluado: codigoActual,
        aprobado: evaluacion.aprobado,
        feedbackConfrontativo: evaluacion.feedbackConfrontativo,
        codigoSiguiente: evaluacion.codigoSiguiente,
        moduloCompletado,
        nombreCodigo: prompt.nombreCodigo,
        userId,
        source,
      };

      return res.status(200).json(body);
    } catch (error) {
      console.error("[umbral/evaluar]", error);
      return fallback(500, "Error interno al evaluar Umbral");
    }
  });
}

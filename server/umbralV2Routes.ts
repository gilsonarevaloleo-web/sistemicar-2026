/**
 * Umbral v2 — API de evaluación con Gemini.
 * Spec: umbral v2. segunda parte
 */

import type { Express, Request, Response } from "express";
import {
  DICCIONARIO_CODIGOS,
  isCodigoNumero,
  isModoUmbral,
  obtenerPromptEvaluacion,
  resolverCodigoSiguiente,
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

function safeParseJson(raw: string): any {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Gemini response");
  return JSON.parse(match[0]);
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

function normalizeEvaluacion(
  parsed: any,
  codigoActual: CodigoNumero,
): EvaluacionGeminiJson {
  const aprobado = Boolean(parsed?.aprobado);
  const feedbackConfrontativo = String(
    parsed?.feedbackConfrontativo ?? "",
  ).trim();
  if (!feedbackConfrontativo) {
    throw new Error("Gemini omitió feedbackConfrontativo");
  }
  return {
    aprobado,
    feedbackConfrontativo: feedbackConfrontativo.slice(0, 1200),
    // La fuente de verdad del avance es la regla de servidor, no Gemini.
    codigoSiguiente: resolverCodigoSiguiente(aprobado, codigoActual),
  };
}

/**
 * Umbral v2 — POST /api/umbral/evaluar
 */
export function registerUmbralV2Routes(app: Express, deps: UmbralV2RouteDeps = {}) {
  const callGemini = deps.callGemini;
  const parseJson = deps.parseGeminiJSON ?? safeParseJson;

  app.get("/api/umbral/meta", (_req: Request, res: Response) => {
    res.json({
      version: "2.0.0-parte2",
      endpoint: "POST /api/umbral/evaluar",
      modos: ["INTERNO_HABILIDAD", "EXTERNO_VENTAS"],
      codigos: Object.values(DICCIONARIO_CODIGOS).map((c) => ({
        numero: c.numero,
        nombre: c.nombre,
        conceptoClave: c.conceptoClave,
      })),
      gemini: Boolean(callGemini),
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
      if (!callGemini) {
        return fallback(500, "Gemini no configurado en el servidor");
      }

      const prompt = obtenerPromptEvaluacion({
        codigo: codigoActual,
        modo,
        respuestaUsuario,
        historialPrevio,
      });

      let raw: string;
      try {
        raw = await callGemini(serializarPromptEvaluacion(prompt), 700, true);
      } catch (err: any) {
        console.error("[umbral/evaluar] Gemini error:", err);
        return fallback(
          500,
          err?.message?.includes("timeout")
            ? "Timeout al consultar Gemini"
            : "Error al consultar Gemini",
          {
            feedbackConfrontativo:
              "El evaluador no respondió a tiempo. Mantente en el código actual y vuelve a enviar tu respuesta.",
            codigoSiguiente: codigoActual,
          },
        );
      }

      let evaluacion: EvaluacionGeminiJson;
      try {
        evaluacion = normalizeEvaluacion(parseJson(raw), codigoActual);
      } catch (err: any) {
        console.error("[umbral/evaluar] parse error:", err, "raw:", String(raw).slice(0, 300));
        return fallback(500, "Error al parsear respuesta de Gemini", {
          feedbackConfrontativo:
            "La evaluación llegó corrupta. Permaneces en el mismo código; reintenta con una respuesta más clara.",
          codigoSiguiente: codigoActual,
        });
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
      };

      return res.status(200).json(body);
    } catch (error) {
      console.error("[umbral/evaluar]", error);
      return fallback(500, "Error interno al evaluar Umbral");
    }
  });
}

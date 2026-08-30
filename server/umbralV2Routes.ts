/**
 * Umbral v2 — API de evaluación con Gemini + persistencia de sesiones.
 * Spec: umbral v2. segunda parte + persistencia/métricas
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
import { calcularMetricasUmbral } from "../shared/umbral/metrics";
import {
  calcularProgresoDesdeSesiones,
  type ProgresoCarreraUmbral,
} from "../shared/umbral/progreso";
import {
  aplicarEvaluacionASesion,
  crearSesionUmbral,
} from "../shared/umbral/sessionLogic";
import type { SesionUmbral } from "../shared/umbral/sessionTypes";
import {
  createMemoryUmbralSessionStore,
  newSesionId,
  type UmbralSessionStore,
} from "./umbralSessionStore";

export type GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export type GeminiJsonParser = (raw: string) => any;

export interface UmbralV2RouteDeps {
  callGemini?: GeminiCaller;
  parseGeminiJSON?: GeminiJsonParser;
  sessionStore?: UmbralSessionStore;
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
  sesionId: string;
  sesion: SesionUmbral;
  progreso: ProgresoCarreraUmbral;
  codigoRecomendado: CodigoNumero;
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

async function resolverSesionActiva(
  store: UmbralSessionStore,
  input: {
    userId: string;
    modo: ModoUmbral;
    codigoActual: CodigoNumero;
    sesionId?: string;
  },
): Promise<SesionUmbral> {
  if (input.sesionId) {
    const existing = await store.getById(input.sesionId);
    if (
      existing &&
      existing.userId === input.userId &&
      existing.modo === input.modo &&
      existing.estado === "EN_PROGRESO"
    ) {
      return existing;
    }
  }

  const active = await store.findActive(input.userId, input.modo);
  if (active) return active;

  return crearSesionUmbral({
    id: newSesionId(),
    userId: input.userId,
    modo: input.modo,
    codigoActual: input.codigoActual,
  });
}

/**
 * Umbral v2 — POST /api/umbral/evaluar + GET sesiones
 */
export function registerUmbralV2Routes(
  app: Express,
  deps: UmbralV2RouteDeps = {},
) {
  const callGemini = deps.callGemini;
  const sessionStore = deps.sessionStore ?? createMemoryUmbralSessionStore();

  app.get("/api/umbral/meta", (_req: Request, res: Response) => {
    res.json({
      version: "2.2.0-historial-logros",
      endpoint: "POST /api/umbral/evaluar",
      sesiones: ["GET /api/umbral/sesiones", "GET /api/umbral/sesion/:id"],
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

  app.get("/api/umbral/sesiones", async (req: Request, res: Response) => {
    try {
      const userId = String(req.query.userId ?? "").trim();
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId es requerido",
        });
      }
      const sesiones = await sessionStore.listByUser(userId);
      const metricas = calcularMetricasUmbral(sesiones);
      const progreso = calcularProgresoDesdeSesiones(sesiones);
      return res.status(200).json({
        success: true,
        userId,
        sesiones,
        metricas,
        progreso,
      });
    } catch (error) {
      console.error("[umbral/sesiones]", error);
      return res.status(500).json({
        success: false,
        error: "Error al listar sesiones Umbral",
      });
    }
  });

  app.get("/api/umbral/sesion/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id ?? "").trim();
      const userId = String(req.query.userId ?? "").trim();
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "id de sesión es requerido",
        });
      }
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId es requerido",
        });
      }
      const sesion = await sessionStore.getById(id);
      if (!sesion || sesion.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: "Sesión no encontrada",
        });
      }
      return res.status(200).json({
        success: true,
        sesion,
      });
    } catch (error) {
      console.error("[umbral/sesion/:id]", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener sesión Umbral",
      });
    }
  });

  app.post("/api/umbral/evaluar", async (req: Request, res: Response) => {
    const userId = String(req.body?.userId ?? "").trim();
    const modoRaw = req.body?.modo;
    const codigoRaw = Number(req.body?.codigoActual);
    const respuestaUsuario = String(req.body?.respuestaUsuario ?? "").trim();
    const historialPrevio = normalizeHistorial(req.body?.historialPrevio);
    const sesionIdRaw = String(req.body?.sesionId ?? "").trim();
    const psOverrideRaw = req.body?.psGanados;
    const psGanadosOverride =
      typeof psOverrideRaw === "number" && Number.isFinite(psOverrideRaw)
        ? psOverrideRaw
        : undefined;

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

      let sesion = await resolverSesionActiva(sessionStore, {
        userId,
        modo,
        codigoActual,
        sesionId: sesionIdRaw || undefined,
      });

      const codigoSiguiente = isCodigoNumero(evaluacion.codigoSiguiente)
        ? evaluacion.codigoSiguiente
        : null;

      sesion = aplicarEvaluacionASesion(sesion, {
        codigo: codigoActual,
        aprobado: evaluacion.aprobado,
        respuestaUsuario,
        feedbackGemini: evaluacion.feedbackConfrontativo,
        codigoSiguiente,
        psGanadosOverride: evaluacion.aprobado
          ? psGanadosOverride
          : undefined,
      });
      sesion = await sessionStore.save(sesion);

      const sesionesUsuario = await sessionStore.listByUser(userId);
      const progreso = calcularProgresoDesdeSesiones(sesionesUsuario);
      const codigoRecomendado = progreso.porModo[modo].codigoPorDefecto;

      const body: UmbralEvaluarSuccess = {
        success: true,
        modo,
        codigoEvaluado: codigoActual,
        aprobado: evaluacion.aprobado,
        feedbackConfrontativo: evaluacion.feedbackConfrontativo,
        codigoSiguiente,
        moduloCompletado,
        nombreCodigo: prompt.nombreCodigo,
        userId,
        source,
        sesionId: sesion.id,
        sesion,
        progreso,
        codigoRecomendado,
      };

      return res.status(200).json(body);
    } catch (error) {
      console.error("[umbral/evaluar]", error);
      return fallback(500, "Error interno al evaluar Umbral");
    }
  });
}

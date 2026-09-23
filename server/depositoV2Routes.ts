/**
 * Depósito v2 — Universidad de Sistemicar
 * POST /api/deposito/volcado — diagnóstico de Volcado de Aprendizaje.
 * Polaridad M/F es capa interna del motor; el JSON no expone polo ni género.
 */

import type { Express, Request, Response } from "express";
import {
  DICCIONARIO_GRADOS,
  DICCIONARIO_OJOS,
  MATRIZ_TEMPERAMENTO,
  RITUAL_VOLCADO,
  type DepositoEngineResponse,
  type DiagnosticoVolcado,
  type GradoMaestria,
} from "../shared/deposito/engineConfig";
import { evaluarDepositoVolcado } from "../shared/deposito/evaluarVolcado";

export type GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface DepositoV2RouteDeps {
  callGemini?: GeminiCaller;
}

function jsonDeposito(
  resultado: Awaited<ReturnType<typeof evaluarDepositoVolcado>>,
): DepositoVolcadoSuccess | DepositoVolcadoErrorBody {
  if (!resultado.ok) {
    return { success: false, error: resultado.error, diagnostico: null };
  }
  return {
    success: true,
    diagnostico: resultado.diagnostico,
    engine: resultado.engine,
    source: resultado.source,
    ritual: RITUAL_VOLCADO,
    gradoMaestria: resultado.gradoUsuarioActual,
    gradoDetectado: resultado.engine.evaluacionGrado.gradoDetectado,
    meritoReconocido: resultado.engine.evaluacionGrado.meritoReconocido,
  };
}

export interface DepositoVolcadoSuccess {
  success: true;
  diagnostico: DiagnosticoVolcado;
  engine: DepositoEngineResponse;
  source: "gemini" | "local_fallback";
  ritual: string;
  gradoMaestria: GradoMaestria;
  gradoDetectado: GradoMaestria;
  meritoReconocido: boolean;
}

export interface DepositoVolcadoErrorBody {
  success: false;
  error: string;
  diagnostico: DiagnosticoVolcado | null;
}

/**
 * Depósito v2 — POST /api/deposito/volcado + POST /api/deposito/evaluar + GET meta
 */
export function registerDepositoV2Routes(
  app: Express,
  deps: DepositoV2RouteDeps = {},
) {
  const callGemini = deps.callGemini;

  app.get("/api/deposito/meta", (_req: Request, res: Response) => {
    res.json({
      version: "2.0.0-universidad",
      endpoint: "POST /api/deposito/volcado",
      evaluar: "POST /api/deposito/evaluar",
      ritual: RITUAL_VOLCADO,
      muroDeDominancia: "UN solo Código Dominante. Prohibido listar múltiples códigos.",
      grados: Object.values(DICCIONARIO_GRADOS).map((g) => ({
        grado: g.grado,
        nombre: g.nombre,
        titulo: g.titulo,
        camposVisibles: g.camposVisibles,
        temperamento: MATRIZ_TEMPERAMENTO[g.grado].nombre,
      })),
      placementTest: true,
      metricasMerito: [
        "densidadEstructural",
        "variedadRotacionCodigo",
        "metacognicionDetectada",
      ],
      temperamentos: Object.values(MATRIZ_TEMPERAMENTO).map((t) => ({
        grado: t.grado,
        codigo: t.codigo,
        nombre: t.nombre,
        friccion: t.friccion,
      })),
      ojos: Object.values(DICCIONARIO_OJOS).map((o) => ({
        numero: o.numero,
        nombreOjo: o.nombreOjo,
        focoAtencion: o.focoAtencion,
      })),
      gemini: Boolean(callGemini),
      fallbackLocal: true,
    });
  });

  const leerBody = (req: Request) => ({
    textoVolcado: req.body?.textoVolcado ?? req.body?.texto,
    volcadoCrudo: req.body?.volcadoCrudo,
    gradoUsuarioActual:
      req.body?.gradoUsuarioActual ?? req.body?.gradoMaestria ?? req.body?.grado,
    friccionDetectada: req.body?.friccionDetectada,
    sombraOmision: req.body?.sombraOmision,
    codigoHipotesis: req.body?.codigoHipotesis,
    ojosHistoricos: req.body?.ojosHistoricos ?? req.body?.historialCodigos,
    callGemini,
  });

  app.post("/api/deposito/volcado", async (req: Request, res: Response) => {
    try {
      const resultado = await evaluarDepositoVolcado(leerBody(req));
      if (!resultado.ok) {
        return res.status(resultado.status).json({
          success: false,
          error: resultado.error,
          diagnostico: null,
        } satisfies DepositoVolcadoErrorBody);
      }
      return res.status(200).json(jsonDeposito(resultado));
    } catch (error) {
      console.error("[deposito/volcado]", error);
      const body: DepositoVolcadoErrorBody = {
        success: false,
        error: "Error al procesar el volcado",
        diagnostico: null,
      };
      return res.status(500).json(body);
    }
  });

  app.post("/api/deposito/evaluar", async (req: Request, res: Response) => {
    try {
      const resultado = await evaluarDepositoVolcado(leerBody(req));
      if (!resultado.ok) {
        return res.status(resultado.status).json({ error: resultado.error });
      }
      return res.status(200).json({
        ...resultado.engine,
        perfilPromovido: resultado.perfilPromovido,
        gradoUsuarioActual: resultado.gradoUsuarioActual,
        source: resultado.source,
      });
    } catch (error) {
      console.error("[deposito/evaluar]", error);
      return res.status(500).json({
        error: "Error procesando el volcado perceptivo.",
      });
    }
  });
}

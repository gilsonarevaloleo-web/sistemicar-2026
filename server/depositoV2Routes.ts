/**
 * Depósito v2 — Universidad de Sistemicar
 * POST /api/deposito/volcado — diagnóstico de Volcado de Aprendizaje.
 */

import type { Express, Request, Response } from "express";
import {
  DICCIONARIO_GRADOS,
  DICCIONARIO_OJOS,
  RITUAL_VOLCADO,
  normalizarCapturaVolcado,
  procesarVolcadoAprendizajeConFuente,
  validarCapturaParaGrado,
  type DiagnosticoVolcado,
  type GradoMaestria,
} from "../shared/deposito/engineConfig";

export type GeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface DepositoV2RouteDeps {
  callGemini?: GeminiCaller;
}

export interface DepositoVolcadoSuccess {
  success: true;
  diagnostico: DiagnosticoVolcado;
  source: "gemini" | "local_fallback";
  ritual: string;
  gradoMaestria: GradoMaestria;
}

export interface DepositoVolcadoErrorBody {
  success: false;
  error: string;
  diagnostico: DiagnosticoVolcado | null;
}

/**
 * Depósito v2 — POST /api/deposito/volcado + GET meta
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
      ritual: RITUAL_VOLCADO,
      muroDeDominancia: "UN solo Código Dominante. Prohibido listar múltiples códigos.",
      grados: Object.values(DICCIONARIO_GRADOS).map((g) => ({
        grado: g.grado,
        nombre: g.nombre,
        titulo: g.titulo,
        camposVisibles: g.camposVisibles,
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

  app.post("/api/deposito/volcado", async (req: Request, res: Response) => {
    const captura = normalizarCapturaVolcado({
      textoVolcado: req.body?.textoVolcado ?? req.body?.texto,
      volcadoCrudo: req.body?.volcadoCrudo,
      gradoMaestria: req.body?.gradoMaestria ?? req.body?.grado,
      friccionDetectada: req.body?.friccionDetectada,
      sombraOmision: req.body?.sombraOmision,
      codigoHipotesis: req.body?.codigoHipotesis,
    });
    const errorCaptura = validarCapturaParaGrado(captura);

    if (errorCaptura) {
      const esVacio = errorCaptura.startsWith("volcadoCrudo");
      const body: DepositoVolcadoErrorBody = {
        success: false,
        error: esVacio ? "textoVolcado es requerido" : errorCaptura,
        diagnostico: null,
      };
      return res.status(400).json(body);
    }

    try {
      const resultado = await procesarVolcadoAprendizajeConFuente(
        captura.volcadoCrudo,
        { callGemini, captura, gradoMaestria: captura.gradoMaestria },
      );
      const body: DepositoVolcadoSuccess = {
        success: true,
        diagnostico: resultado.diagnostico,
        source: resultado.source,
        ritual: RITUAL_VOLCADO,
        gradoMaestria: captura.gradoMaestria,
      };
      return res.status(200).json(body);
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
}

/**
 * Depósito V3 — POST /api/deposito/v3/audit
 * Dictamen de Óptica-Sintaxis. V2 no se toca.
 */

import type { Express, Request, Response } from "express";
import {
  CANON_TEN_EYES,
  DEPOSITO_V3_RITUAL,
  DEPOSITO_V3_VERSION,
  DUAL_CARRERA_MIN_SAMPLE,
  DUAL_CARRERA_RATE,
  DUAL_TITULO_MIN_SAMPLE,
  DUAL_TITULO_RATE,
  DUAL_WINDOW_SIZE,
  EYE_CODES,
  TIER_MAX_EYE,
  GRADO_CARRERA_RATE,
  GRADO_TITULO_MIN_SAMPLE,
  GRADO_TITULO_RATE,
  GRADO_WINDOW_SIZE,
  evaluarDepositoV3,
  type DepotAnalysisResult,
  type GeminiAuditCaller,
  type UserTier,
} from "../shared/deposito/v3/index";

export interface DepositoV3RouteDeps {
  callGemini?: GeminiAuditCaller;
}

export interface DepositoV3AuditSuccess {
  success: true;
  result: DepotAnalysisResult;
  source: "gemini" | "local_fallback";
  userTier: UserTier;
  ritual: string;
  version: typeof DEPOSITO_V3_VERSION;
}

export interface DepositoV3AuditError {
  success: false;
  error: string;
  result: null;
}

export function registerDepositoV3Routes(
  app: Express,
  deps: DepositoV3RouteDeps = {},
) {
  const callGemini = deps.callGemini;

  app.get("/api/deposito/v3/meta", (_req: Request, res: Response) => {
    res.json({
      version: DEPOSITO_V3_VERSION,
      endpoint: "POST /api/deposito/v3/audit",
      ritual: DEPOSITO_V3_RITUAL,
      orden: "perceptionEye + characterSignedCode + deltaGap",
      muroDeDominancia: false,
      gemini: Boolean(callGemini),
      fallbackLocal: true,
      tiers: TIER_MAX_EYE,
      gradoConsistencia: {
        windowSize: GRADO_WINDOW_SIZE,
        tituloRate: GRADO_TITULO_RATE,
        tituloMinSample: GRADO_TITULO_MIN_SAMPLE,
        carreraRate: GRADO_CARRERA_RATE,
        estable: "isFullyGrounded && perceptionEye >= 7",
      },
      dobleCanal: {
        windowSize: DUAL_WINDOW_SIZE,
        tituloRate: DUAL_TITULO_RATE,
        tituloMinSample: DUAL_TITULO_MIN_SAMPLE,
        carreraRate: DUAL_CARRERA_RATE,
        carreraMinSample: DUAL_CARRERA_MIN_SAMPLE,
        opticaValida: "isFullyGrounded && deltaGap <= 4",
        sintaxisValida: "isCableadoConnected && syntacticVacios.length <= 4",
      },
      ojos: EYE_CODES.map((n) => {
        const o = CANON_TEN_EYES[n];
        return {
          id: o.id,
          canon: o.name,
          planeta: o.planeta,
          concept: o.concept,
          tierRequired: o.tierRequired,
          syntaxLabel: o.syntaxLabel,
        };
      }),
    });
  });

  app.post("/api/deposito/v3/audit", async (req: Request, res: Response) => {
    try {
      const resultado = await evaluarDepositoV3({
        ...req.body,
        callGemini,
      });
      if (!resultado.ok) {
        const body: DepositoV3AuditError = {
          success: false,
          error: resultado.error,
          result: null,
        };
        return res.status(resultado.status).json(body);
      }
      const ok: DepositoV3AuditSuccess = {
        success: true,
        result: resultado.result,
        source: resultado.source,
        userTier: resultado.userTier,
        ritual: DEPOSITO_V3_RITUAL,
        version: DEPOSITO_V3_VERSION,
      };
      return res.status(200).json(ok);
    } catch (error) {
      console.error("[deposito/v3/audit]", error);
      const body: DepositoV3AuditError = {
        success: false,
        error: "Error procesando la auditoría V3.",
        result: null,
      };
      return res.status(500).json(body);
    }
  });
}

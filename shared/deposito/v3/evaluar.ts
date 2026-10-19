/**
 * Orquestación V3: payload → validar → motor de firma → dictamen.
 * La usan Express (`/api/deposito/v3/audit`) y la Netlify Function.
 */

import {
  normalizarLeyesCasa,
  type PrincipioAprendizaje,
} from "./cerebroMadre.ts";
import { procesarAuditoriaV3, type GeminiAuditCaller } from "./motor.ts";
import { validarPayload } from "./validar.ts";
import type {
  DepotAnalysisResult,
  DepotEntryInput,
  DepotEntryPayload,
  UserTier,
} from "./types.ts";

export interface EvaluarDepositoV3Input extends DepotEntryInput {
  callGemini?: GeminiAuditCaller;
  /** Solo leyes selladas viajan al motor. Candidatos y filtro se descartan. */
  leyesCasa?: readonly PrincipioAprendizaje[] | unknown;
}

export interface EvaluarDepositoV3Ok {
  ok: true;
  result: DepotAnalysisResult;
  source: "gemini" | "local_fallback";
  userTier: UserTier;
  payload: DepotEntryPayload;
}

export interface EvaluarDepositoV3Err {
  ok: false;
  status: 400;
  error: string;
}

export type EvaluarDepositoV3Result =
  | EvaluarDepositoV3Ok
  | EvaluarDepositoV3Err;

export async function evaluarDepositoV3(
  input: EvaluarDepositoV3Input,
): Promise<EvaluarDepositoV3Result> {
  const chequeo = validarPayload(input);
  if (!chequeo.ok) {
    return { ok: false, status: 400, error: chequeo.error };
  }

  const leyesCasa = normalizarLeyesCasa(input.leyesCasa);
  const procesado = await procesarAuditoriaV3(
    chequeo.payload,
    input.callGemini,
    leyesCasa,
  );

  return {
    ok: true,
    result: procesado.result,
    source: procesado.source,
    userTier: chequeo.payload.userTier,
    payload: chequeo.payload,
  };
}

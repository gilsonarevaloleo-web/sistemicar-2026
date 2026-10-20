/**
 * Motor de auditoría V3: geometría sintáctica + Ley de la Cascada.
 * Gemini recibe las mismas reglas; el fallback local es la fuente de geometría.
 * Cero Óptica de verdad. Cero Δ. Cero juicio moral.
 */

import {
  masterToneDe,
  mensajeDiagnosticoCascada,
  pedagogicalFeedbackDe,
  primerPendienteCascada,
  estadoAlumnoDe,
} from "./cascada.ts";
import { auditarGeometriaSintactica, rutaGeometrica } from "./geometria.ts";
import {
  buildActiveCharacterMap,
  vaciosDesdeActiveMap,
} from "./ojos.ts";
import type { PrincipioAprendizaje } from "./cerebroMadre.ts";
import { serializarPromptAuditoria } from "./prompt.ts";
import {
  parseDepotAnalysisResult,
  scaffoldAnalysisResult,
} from "./validar.ts";
import {
  EYE_CODES,
  type DepotAnalysisResult,
  type DepotEntryPayload,
  type EyeCode,
} from "./types.ts";

export type GeminiAuditCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface ResultadoAuditoriaV3 {
  result: DepotAnalysisResult;
  source: "gemini" | "local_fallback";
}

function moralProhibida(texto: string): boolean {
  return /flojo moral|calidad de vida|debes ser|virtud|serm[oó]n|eficaz|ineficaz|bueno|malo moral/i.test(
    texto,
  );
}

/**
 * Fallback local: una sola vía — geometría de redacción + cascada.
 */
export function diagnosticarAuditoriaLocal(
  payload: DepotEntryPayload,
): DepotAnalysisResult {
  const geo = auditarGeometriaSintactica(payload);
  const activeCodes = EYE_CODES.filter((n) => geo.active[n]);
  const activeCharacterMap = buildActiveCharacterMap(activeCodes);
  const lowestMissingCascadeCode = primerPendienteCascada(activeCharacterMap);
  const estadoAlumno = estadoAlumnoDe(activeCharacterMap);
  const masterTone = masterToneDe(lowestMissingCascadeCode);
  const pedagogicalFeedback = pedagogicalFeedbackDe(lowestMissingCascadeCode);
  const focoRevelacionCode = (lowestMissingCascadeCode ?? 10) as EyeCode;
  const characterSignedCode = geo.characterSignedCode;
  const syntacticVacios = vaciosDesdeActiveMap(activeCharacterMap);
  const grounded = estadoAlumno === "ARQUITECTO_GROUNDED";

  const diagnosticMessage = mensajeDiagnosticoCascada({
    estado: estadoAlumno,
    lowest: lowestMissingCascadeCode,
    activeCodes,
    titleConnectedToClose: geo.titleConnectedToClose,
    characterSignedCode,
  });

  return sellarLocal(
    scaffoldAnalysisResult({
      characterSignedCode,
      focoRevelacionCode,
      activeCharacterMap,
      syntacticVacios,
      activeCodes,
      lowestMissingCascadeCode,
      titleConnectedToClose: geo.titleConnectedToClose,
      masterTone,
      pedagogicalFeedback,
      estadoAlumno,
      syntaxDiagnostic: {
        detectedSyntaxCode: characterSignedCode,
        focoCode: focoRevelacionCode,
        isCableadoConnected: geo.titleConnectedToClose,
        syntaxCharacteristics: rutaGeometrica(
          characterSignedCode,
          focoRevelacionCode,
        ),
      },
      groundingStatus: {
        isFullyGrounded: grounded,
        diagnosticMessage,
      },
      immediateAdjustment: pedagogicalFeedback,
    }),
  );
}

function sellarLocal(result: DepotAnalysisResult): DepotAnalysisResult {
  const activeCodes =
    result.activeCodes ??
    EYE_CODES.filter((n) => result.activeCharacterMap?.[n]);
  const activeCharacterMap = buildActiveCharacterMap(activeCodes);
  const titleConnectedToClose =
    result.titleConnectedToClose ??
    Boolean(result.syntaxDiagnostic.isCableadoConnected);
  if (titleConnectedToClose && activeCharacterMap[1]) {
    activeCharacterMap[10] = true;
  } else {
    activeCharacterMap[10] = false;
  }
  const lowestMissingCascadeCode =
    result.lowestMissingCascadeCode === undefined
      ? primerPendienteCascada(activeCharacterMap)
      : result.lowestMissingCascadeCode;
  const estadoAlumno = result.estadoAlumno ?? estadoAlumnoDe(activeCharacterMap);
  const masterTone = result.masterTone ?? masterToneDe(lowestMissingCascadeCode);
  const pedagogicalFeedback =
    result.pedagogicalFeedback ??
    pedagogicalFeedbackDe(lowestMissingCascadeCode);
  const focoRevelacionCode = (lowestMissingCascadeCode ?? 10) as EyeCode;
  const vacios = vaciosDesdeActiveMap(activeCharacterMap);

  return {
    ...result,
    characterSignedCode: result.characterSignedCode,
    focoRevelacionCode,
    activeCharacterMap,
    syntacticVacios: vacios,
    activeCodes: EYE_CODES.filter((n) => activeCharacterMap[n]),
    lowestMissingCascadeCode,
    titleConnectedToClose: Boolean(activeCharacterMap[10]),
    masterTone,
    pedagogicalFeedback,
    estadoAlumno,
    syntaxDiagnostic: {
      ...result.syntaxDiagnostic,
      detectedSyntaxCode:
        result.syntaxDiagnostic.detectedSyntaxCode || result.characterSignedCode,
      focoCode: focoRevelacionCode,
      isCableadoConnected: Boolean(activeCharacterMap[10]),
    },
    groundingStatus: {
      ...result.groundingStatus,
      isFullyGrounded: estadoAlumno === "ARQUITECTO_GROUNDED",
    },
    immediateAdjustment: pedagogicalFeedback,
  };
}

function fusionarGeminiConGeometria(
  gemini: DepotAnalysisResult,
  local: DepotAnalysisResult,
): DepotAnalysisResult {
  const diagnosticMessage =
    gemini.groundingStatus.diagnosticMessage &&
    !moralProhibida(gemini.groundingStatus.diagnosticMessage)
      ? `${local.groundingStatus.diagnosticMessage} ${gemini.groundingStatus.diagnosticMessage}`
      : local.groundingStatus.diagnosticMessage;
  const syntaxCharacteristics =
    gemini.syntaxDiagnostic.syntaxCharacteristics &&
    !moralProhibida(gemini.syntaxDiagnostic.syntaxCharacteristics)
      ? gemini.syntaxDiagnostic.syntaxCharacteristics
      : local.syntaxDiagnostic.syntaxCharacteristics;

  return {
    ...local,
    id: gemini.id || local.id,
    timestamp: gemini.timestamp || local.timestamp,
    syntaxDiagnostic: {
      ...local.syntaxDiagnostic,
      syntaxCharacteristics,
    },
    groundingStatus: {
      ...local.groundingStatus,
      diagnosticMessage,
    },
  };
}

export async function procesarAuditoriaV3(
  payload: DepotEntryPayload,
  callGemini?: GeminiAuditCaller,
  leyesCasa: readonly PrincipioAprendizaje[] = [],
): Promise<ResultadoAuditoriaV3> {
  const local = diagnosticarAuditoriaLocal(payload);
  const serialized = serializarPromptAuditoria(payload, leyesCasa);

  if (callGemini) {
    try {
      const raw = await callGemini(serialized, 2048, true);
      const parsed = parseDepotAnalysisResult(raw);
      if (parsed.ok) {
        return {
          result: fusionarGeminiConGeometria(parsed.result, local),
          source: "gemini",
        };
      }
    } catch {
      // reintento abajo
    }
    try {
      const raw2 = await callGemini(
        `${serialized}\n\nIMPORTANTE: responde SOLO el JSON con characterSignedCode, focoRevelacionCode, activeCharacterMap, syntacticVacios, activeCodes, lowestMissingCascadeCode, titleConnectedToClose, masterTone, pedagogicalFeedback, estadoAlumno, syntaxDiagnostic (incluye focoCode e isCableadoConnected), groundingStatus, immediateAdjustment. El Título es C1. C10 solo si C1 y el cierre abrocha el título. Enseñá el primer código pendiente de la cascada C1→C2→C4→C5→C7→C10 con el Tono del Maestro. Cero consejo de vida. Cero perceptionEye. Cero deltaGap.`,
        2048,
        false,
      );
      const parsed2 = parseDepotAnalysisResult(raw2);
      if (parsed2.ok) {
        return {
          result: fusionarGeminiConGeometria(parsed2.result, local),
          source: "gemini",
        };
      }
    } catch (err) {
      console.warn(
        "[deposito/v3] Gemini falló → fallback local:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return {
    result: local,
    source: "local_fallback",
  };
}

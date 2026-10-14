/**
 * Validación y normalización de contratos V3.
 * Sin motor LLM: solo forma, candados de tier y parseo de dictamen sintáctico.
 */

import {
  buildActiveCharacterMap,
  characterMapDe,
  isEyeCode,
  normalizarVaciosSintacticos,
  parseEyeCode,
  vaciosDesdeActiveMap,
} from "./ojos.ts";
import {
  camposObligatoriosPorTier,
  isAdvancedTier,
  normalizarUserTier,
} from "./tiers.ts";
import {
  EYE_CODES,
  type DepotAnalysisLlmShape,
  type DepotAnalysisParseResult,
  type DepotAnalysisResult,
  type DepotEntryInput,
  type DepotEntryPayload,
  type DepotPayloadResult,
  type EyeCode,
  type GroundingStatus,
} from "./types.ts";

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hipotesisDesdeCodigo(value: unknown): string {
  const codigo = parseEyeCode(value);
  return codigo ? `C${codigo}` : "";
}

export function normalizarPayload(input: DepotEntryInput | string): DepotEntryPayload {
  if (typeof input === "string") {
    return {
      rawFact: input.trim(),
      userTier: "FREE",
    };
  }

  const rawFact = trimText(
    input.rawFact ?? input.volcadoCrudo ?? input.textoVolcado ?? input.texto,
  );
  const detectedNoise = trimText(
    input.detectedNoise ?? input.friccionDetectada,
  );
  const omittedShadow = trimText(
    input.omittedShadow ?? input.sombraOmision,
  );
  const studentHypothesis =
    trimText(input.studentHypothesis) ||
    hipotesisDesdeCodigo(input.codigoHipotesis);

  const payload: DepotEntryPayload = {
    rawFact,
    userTier: normalizarUserTier(input.userTier ?? input.tier),
  };
  if (detectedNoise) payload.detectedNoise = detectedNoise;
  if (omittedShadow) payload.omittedShadow = omittedShadow;
  if (studentHypothesis) payload.studentHypothesis = studentHypothesis;
  return payload;
}

export function validarPayload(
  input: DepotEntryInput | string | DepotEntryPayload,
): DepotPayloadResult {
  const payload = normalizarPayload(input);
  const required = camposObligatoriosPorTier(payload.userTier);

  if (required.includes("rawFact") && !payload.rawFact) {
    return { ok: false, error: "rawFact es requerido" };
  }
  if (isAdvancedTier(payload.userTier)) {
    if (!payload.detectedNoise) {
      return {
        ok: false,
        error: "detectedNoise es requerido en CARRERA / TITULO",
      };
    }
    if (!payload.omittedShadow) {
      return {
        ok: false,
        error: "omittedShadow es requerido en CARRERA / TITULO",
      };
    }
  }

  return { ok: true, payload };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function parseBooleanLoose(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  return false;
}

function leerCharacterMap(raw: unknown): Record<EyeCode, boolean> {
  const map = buildActiveCharacterMap([]);
  const rec = asRecord(raw);
  if (!rec) return map;
  for (const n of EYE_CODES) {
    const hit = rec[String(n)] ?? rec[n];
    map[n] = parseBooleanLoose(hit);
  }
  return map;
}

function leerGrounding(raw: unknown): GroundingStatus | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const diagnosticMessage = pickString(rec, [
    "diagnosticMessage",
    "diagnostic_message",
    "mensaje",
  ]);
  if (!diagnosticMessage) return null;
  return {
    isFullyGrounded: parseBooleanLoose(rec.isFullyGrounded),
    diagnosticMessage,
  };
}

function extraerJsonObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "object" && raw && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

export function parseDepotAnalysisResult(
  raw: unknown,
  opts: { id?: string; timestamp?: number } = {},
): DepotAnalysisParseResult {
  const obj = extraerJsonObject(raw);
  if (!obj) {
    return { ok: false, error: "JSON de dictamen V3 inválido" };
  }

  const characterSignedCode = parseEyeCode(
    obj.characterSignedCode ??
      obj.character_signed_code ??
      asRecord(obj.syntaxDiagnostic ?? obj.syntax_diagnostic)?.detectedSyntaxCode,
  );
  if (!characterSignedCode) {
    return {
      ok: false,
      error: "characterSignedCode es requerido (1–10)",
    };
  }

  const syntaxRec = asRecord(obj.syntaxDiagnostic ?? obj.syntax_diagnostic);
  const detectedSyntaxCode =
    parseEyeCode(syntaxRec?.detectedSyntaxCode ?? syntaxRec?.detected_syntax_code) ??
    characterSignedCode;
  const syntaxCharacteristics = syntaxRec
    ? pickString(syntaxRec, [
        "syntaxCharacteristics",
        "syntax_characteristics",
        "caracteristicas",
      ])
    : "";
  if (!syntaxCharacteristics) {
    return { ok: false, error: "syntaxDiagnostic.syntaxCharacteristics es requerido" };
  }

  const grounding = leerGrounding(obj.groundingStatus ?? obj.grounding_status);
  if (!grounding) {
    return { ok: false, error: "groundingStatus.diagnosticMessage es requerido" };
  }

  const cableadoDeclarado =
    syntaxRec &&
    ("isCableadoConnected" in syntaxRec || "is_cableado_connected" in syntaxRec);
  const isCableadoConnected = cableadoDeclarado
    ? parseBooleanLoose(
        syntaxRec.isCableadoConnected ?? syntaxRec.is_cableado_connected,
      )
    : /impronta de madurez|cablea/i.test(grounding.diagnosticMessage);

  const immediateAdjustment = pickString(obj, [
    "immediateAdjustment",
    "immediate_adjustment",
    "ajuste",
  ]);
  if (!immediateAdjustment) {
    return { ok: false, error: "immediateAdjustment es requerido" };
  }

  const timestamp = opts.timestamp ?? Date.now();
  const activeCharacterMap = leerCharacterMap(
    obj.activeCharacterMap ??
      obj.active_character_map ??
      obj.activeEyeMap ??
      obj.active_eye_map,
  );
  if (!EYE_CODES.some((n) => activeCharacterMap[n])) {
    activeCharacterMap[characterSignedCode] = true;
  }
  const syntacticVacios = normalizarVaciosSintacticos(
    obj.syntacticVacios ?? obj.syntactic_vacios,
    activeCharacterMap,
  );
  const result: DepotAnalysisResult = {
    id: opts.id ?? `depot_${timestamp}`,
    timestamp,
    characterSignedCode,
    activeCharacterMap,
    syntacticVacios,
    syntaxDiagnostic: {
      detectedSyntaxCode,
      isCableadoConnected,
      syntaxCharacteristics,
    },
    groundingStatus: grounding,
    immediateAdjustment,
  };

  return { ok: true, result };
}

export function scaffoldAnalysisResult(
  partial: Partial<DepotAnalysisLlmShape> &
    Pick<DepotAnalysisLlmShape, "characterSignedCode">,
): DepotAnalysisResult {
  const timestamp = Date.now();
  const characterSignedCode = partial.characterSignedCode;
  const activeCharacterMap =
    partial.activeCharacterMap ??
    buildActiveCharacterMap([characterSignedCode]);
  const syntaxDiagnostic = {
    detectedSyntaxCode:
      partial.syntaxDiagnostic?.detectedSyntaxCode ?? characterSignedCode,
    isCableadoConnected:
      partial.syntaxDiagnostic?.isCableadoConnected ?? false,
    syntaxCharacteristics:
      partial.syntaxDiagnostic?.syntaxCharacteristics ??
      "Firma sintáctica pendiente de auditoría.",
  };
  return {
    id: `depot_${timestamp}`,
    timestamp,
    characterSignedCode,
    activeCharacterMap,
    syntacticVacios:
      partial.syntacticVacios ?? vaciosDesdeActiveMap(activeCharacterMap),
    syntaxDiagnostic,
    groundingStatus: partial.groundingStatus ?? {
      isFullyGrounded: false,
      diagnosticMessage: "Estabilidad de escritura pendiente de auditoría.",
    },
    immediateAdjustment:
      partial.immediateAdjustment ?? "Volvé a volcar el hecho crudo. Un solo gesto.",
  };
}

export function hidratarResultadoV3(value: unknown): DepotAnalysisResult | null {
  if (!isDepotAnalysisResult(value)) return null;
  const map = characterMapDe(value);
  return {
    id: value.id,
    timestamp: value.timestamp,
    characterSignedCode: value.characterSignedCode,
    activeCharacterMap: map,
    syntacticVacios:
      value.syntacticVacios ?? vaciosDesdeActiveMap(map),
    syntaxDiagnostic: {
      detectedSyntaxCode:
        value.syntaxDiagnostic.detectedSyntaxCode || value.characterSignedCode,
      isCableadoConnected: Boolean(value.syntaxDiagnostic.isCableadoConnected),
      syntaxCharacteristics: value.syntaxDiagnostic.syntaxCharacteristics,
    },
    groundingStatus: {
      isFullyGrounded: Boolean(value.groundingStatus.isFullyGrounded),
      diagnosticMessage: value.groundingStatus.diagnosticMessage,
    },
    immediateAdjustment: value.immediateAdjustment,
  };
}

export function isDepotAnalysisResult(
  value: unknown,
): value is DepotAnalysisResult {
  if (!value || typeof value !== "object") return false;
  const v = value as DepotAnalysisResult;
  return (
    typeof v.id === "string" &&
    typeof v.timestamp === "number" &&
    isEyeCode(v.characterSignedCode) &&
    typeof v.immediateAdjustment === "string" &&
    Boolean(v.syntaxDiagnostic?.syntaxCharacteristics) &&
    Boolean(v.groundingStatus?.diagnosticMessage)
  );
}

/**
 * Validación y normalización de contratos V3.
 * Sin motor LLM: solo forma, candados de tier y parseo de dictamen.
 */

import {
  buildActiveEyeMap,
  computeDeltaGap,
  emptyEyeAudits,
  isEyeCode,
  parseEyeCode,
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
  type EyeAudit,
  type EyeCode,
  type GroundingStatus,
  type SystemicAnalysis,
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

function leerEyeMap(raw: unknown): Record<EyeCode, boolean> {
  const map = buildActiveEyeMap([]);
  const rec = asRecord(raw);
  if (!rec) return map;
  for (const n of EYE_CODES) {
    const hit = rec[String(n)] ?? rec[n];
    map[n] = parseBooleanLoose(hit);
  }
  return map;
}

function leerEyeAudits(raw: unknown): Record<EyeCode, EyeAudit> {
  const audits = emptyEyeAudits();
  const rec = asRecord(raw);
  if (!rec) return audits;
  for (const n of EYE_CODES) {
    const piece = asRecord(rec[String(n)] ?? rec[n]);
    if (!piece) continue;
    audits[n] = {
      eyeId: n,
      hasIntention: parseBooleanLoose(piece.hasIntention),
      hasRealVision: parseBooleanLoose(piece.hasRealVision),
      isBlindSpot: parseBooleanLoose(piece.isBlindSpot),
    };
  }
  return audits;
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
  const grounding: GroundingStatus = {
    isFullyGrounded: parseBooleanLoose(rec.isFullyGrounded),
    diagnosticMessage,
  };
  const friction = parseEyeCode(rec.frictionPoint ?? rec.friction_point);
  if (friction) grounding.frictionPoint = friction;
  return grounding;
}

function leerSistemico(raw: unknown): SystemicAnalysis | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const realEngineeringCause = pickString(rec, [
    "realEngineeringCause",
    "real_engineering_cause",
    "causa",
  ]);
  if (!realEngineeringCause) return null;
  return {
    isLatencyEvent: parseBooleanLoose(rec.isLatencyEvent),
    isSystemicConflict: parseBooleanLoose(rec.isSystemicConflict),
    realEngineeringCause,
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

  const perceptionEye = parseEyeCode(
    obj.perceptionEye ?? obj.perception_eye,
  );
  const characterSignedCode = parseEyeCode(
    obj.characterSignedCode ?? obj.character_signed_code,
  );
  if (!perceptionEye || !characterSignedCode) {
    return {
      ok: false,
      error: "perceptionEye y characterSignedCode son requeridos (1–10)",
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

  const systemic = leerSistemico(obj.systemicAnalysis ?? obj.systemic_analysis);
  if (!systemic) {
    return { ok: false, error: "systemicAnalysis.realEngineeringCause es requerido" };
  }

  const immediateAdjustment = pickString(obj, [
    "immediateAdjustment",
    "immediate_adjustment",
    "ajuste",
  ]);
  if (!immediateAdjustment) {
    return { ok: false, error: "immediateAdjustment es requerido" };
  }

  const deltaRaw = obj.deltaGap ?? obj.delta_gap;
  const deltaParsed =
    typeof deltaRaw === "number"
      ? deltaRaw
      : typeof deltaRaw === "string"
        ? Number(deltaRaw)
        : NaN;
  const deltaGap = Number.isFinite(deltaParsed)
    ? Math.abs(Math.round(deltaParsed))
    : computeDeltaGap(perceptionEye, characterSignedCode);

  const timestamp = opts.timestamp ?? Date.now();
  const result: DepotAnalysisResult = {
    id: opts.id ?? `depot_${timestamp}`,
    timestamp,
    perceptionEye,
    characterSignedCode,
    activeEyeMap: leerEyeMap(obj.activeEyeMap ?? obj.active_eye_map),
    eyeAudits: leerEyeAudits(obj.eyeAudits ?? obj.eye_audits),
    deltaGap,
    syntaxDiagnostic: {
      detectedSyntaxCode,
      syntaxCharacteristics,
    },
    groundingStatus: grounding,
    systemicAnalysis: systemic,
    immediateAdjustment,
  };

  return { ok: true, result };
}

export function scaffoldAnalysisResult(
  partial: Partial<DepotAnalysisLlmShape> &
    Pick<DepotAnalysisLlmShape, "perceptionEye" | "characterSignedCode">,
): DepotAnalysisResult {
  const timestamp = Date.now();
  const perceptionEye = partial.perceptionEye;
  const characterSignedCode = partial.characterSignedCode;
  return {
    id: `depot_${timestamp}`,
    timestamp,
    perceptionEye,
    characterSignedCode,
    activeEyeMap: partial.activeEyeMap ?? buildActiveEyeMap([perceptionEye, characterSignedCode]),
    eyeAudits: partial.eyeAudits ?? emptyEyeAudits(),
    deltaGap:
      partial.deltaGap ?? computeDeltaGap(perceptionEye, characterSignedCode),
    syntaxDiagnostic: partial.syntaxDiagnostic ?? {
      detectedSyntaxCode: characterSignedCode,
      syntaxCharacteristics: "Firma sintáctica pendiente de auditoría.",
    },
    groundingStatus: partial.groundingStatus ?? {
      isFullyGrounded: false,
      diagnosticMessage: "Sustentación de chasis pendiente de auditoría.",
    },
    systemicAnalysis: partial.systemicAnalysis ?? {
      isLatencyEvent: false,
      isSystemicConflict: false,
      realEngineeringCause: "Causa de ingeniería pendiente de auditoría.",
    },
    immediateAdjustment:
      partial.immediateAdjustment ?? "Volvé a volcar el hecho crudo. Un solo gesto.",
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
    isEyeCode(v.perceptionEye) &&
    isEyeCode(v.characterSignedCode) &&
    typeof v.deltaGap === "number" &&
    typeof v.immediateAdjustment === "string" &&
    Boolean(v.syntaxDiagnostic?.syntaxCharacteristics) &&
    Boolean(v.groundingStatus?.diagnosticMessage) &&
    Boolean(v.systemicAnalysis?.realEngineeringCause)
  );
}

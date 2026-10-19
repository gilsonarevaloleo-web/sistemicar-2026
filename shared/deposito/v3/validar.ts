/**
 * Validación y normalización de contratos V3.
 * Sin motor LLM: solo forma, candados de tier y parseo de dictamen sintáctico.
 */

import {
  estadoAlumnoDe,
  masterToneDe,
  pedagogicalFeedbackDe,
  primerPendienteCascada,
} from "./cascada.ts";
import {
  buildActiveCharacterMap,
  characterMapDe,
  focoRevelacionDe,
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
  CASCADE_CODES,
  EYE_CODES,
  type CascadeCode,
  type DepotAnalysisLlmShape,
  type DepotAnalysisParseResult,
  type DepotAnalysisResult,
  type DepotEntryInput,
  type DepotEntryPayload,
  type DepotPayloadResult,
  type EstadoAlumnoCascada,
  type EyeCode,
  type GroundingStatus,
  type MasterToneCode,
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

function parseCascadeCode(value: unknown): CascadeCode | null {
  const code = parseEyeCode(value);
  if (!code) return null;
  return (CASCADE_CODES as readonly number[]).includes(code)
    ? (code as CascadeCode)
    : null;
}

function parseMasterTone(value: unknown): MasterToneCode | null {
  const code = parseEyeCode(value);
  if (code === 1 || code === 2 || code === 4 || code === 5 || code === 6 || code === 7 || code === 10) {
    return code;
  }
  return null;
}

function parseEstadoAlumno(value: unknown): EstadoAlumnoCascada | null {
  if (typeof value !== "string") return null;
  const norm = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (norm.includes("PRINCIPIANTE")) return "PRINCIPIANTE_SIN_ANCLA";
  if (norm.includes("EXPLORADOR")) return "EXPLORADOR_NARRATIVO";
  if (norm.includes("ENLACE") || norm.includes("TRANSMUT")) {
    return "ENLACE_EN_TRANSMUTACION";
  }
  if (norm.includes("ARQUITECTO")) return "ARQUITECTO_GROUNDED";
  return null;
}

function leerActiveCodes(raw: unknown, map: Record<EyeCode, boolean>): EyeCode[] {
  if (Array.isArray(raw)) {
    const seen = new Set<EyeCode>();
    for (const item of raw) {
      const code = parseEyeCode(item);
      if (code) seen.add(code);
    }
    if (seen.size > 0) return EYE_CODES.filter((n) => seen.has(n));
  }
  return EYE_CODES.filter((n) => map[n]);
}

function completarCamposCascada(
  result: DepotAnalysisResult,
  extras: {
    activeCodes?: EyeCode[];
    lowestMissingCascadeCode?: CascadeCode | null;
    titleConnectedToClose?: boolean;
    masterTone?: MasterToneCode;
    pedagogicalFeedback?: string;
    estadoAlumno?: EstadoAlumnoCascada;
  } = {},
): DepotAnalysisResult {
  const map = result.activeCharacterMap;
  const activeCodes =
    extras.activeCodes ??
    result.activeCodes ??
    EYE_CODES.filter((n) => map[n]);
  const titleConnectedToClose =
    extras.titleConnectedToClose ??
    result.titleConnectedToClose ??
    Boolean(result.syntaxDiagnostic.isCableadoConnected);
  const lowestMissingCascadeCode =
    extras.lowestMissingCascadeCode !== undefined
      ? extras.lowestMissingCascadeCode
      : result.lowestMissingCascadeCode !== undefined
        ? result.lowestMissingCascadeCode
        : primerPendienteCascada(map);
  const estadoAlumno =
    extras.estadoAlumno ?? result.estadoAlumno ?? estadoAlumnoDe(map);
  const masterTone =
    extras.masterTone ??
    result.masterTone ??
    masterToneDe(lowestMissingCascadeCode);
  const pedagogicalFeedback =
    extras.pedagogicalFeedback ??
    result.pedagogicalFeedback ??
    result.immediateAdjustment ??
    pedagogicalFeedbackDe(lowestMissingCascadeCode);

  return {
    ...result,
    activeCodes,
    lowestMissingCascadeCode,
    titleConnectedToClose,
    masterTone,
    pedagogicalFeedback,
    estadoAlumno,
  };
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
  const focoRevelacionCode =
    parseEyeCode(
      obj.focoRevelacionCode ??
        obj.foco_revelacion_code ??
        syntaxRec?.focoCode ??
        syntaxRec?.foco_code,
    ) ?? characterSignedCode;
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

  const cableadoDeclarado =
    syntaxRec &&
    ("isCableadoConnected" in syntaxRec || "is_cableado_connected" in syntaxRec);

  const immediateAdjustment = pickString(obj, [
    "immediateAdjustment",
    "immediate_adjustment",
    "ajuste",
  ]);
  if (!immediateAdjustment) {
    return { ok: false, error: "immediateAdjustment es requerido" };
  }

  const groundingLeido = leerGrounding(obj.groundingStatus ?? obj.grounding_status);
  const isCableadoConnected = cableadoDeclarado
    ? parseBooleanLoose(
        syntaxRec.isCableadoConnected ?? syntaxRec.is_cableado_connected,
      )
    : groundingLeido
      ? /impronta de madurez|cablea/i.test(groundingLeido.diagnosticMessage)
      : false;
  const grounding = groundingLeido ?? {
    isFullyGrounded: isCableadoConnected,
    diagnosticMessage: syntaxCharacteristics,
  };

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
  activeCharacterMap[focoRevelacionCode] = true;
  const syntacticVacios = normalizarVaciosSintacticos(
    obj.syntacticVacios ?? obj.syntactic_vacios,
    activeCharacterMap,
  );
  const pedagogicalFeedback =
    pickString(obj, ["pedagogicalFeedback", "pedagogical_feedback"]) ||
    immediateAdjustment;
  const titleConnectedToClose =
    "titleConnectedToClose" in obj || "title_connected_to_close" in obj
      ? parseBooleanLoose(
          obj.titleConnectedToClose ?? obj.title_connected_to_close,
        )
      : isCableadoConnected;
  const lowestDeclared =
    "lowestMissingCascadeCode" in obj || "lowest_missing_cascade_code" in obj
      ? parseCascadeCode(
          obj.lowestMissingCascadeCode ?? obj.lowest_missing_cascade_code,
        )
      : undefined;
  const result = completarCamposCascada(
    {
      id: opts.id ?? `depot_${timestamp}`,
      timestamp,
      characterSignedCode,
      focoRevelacionCode,
      activeCharacterMap,
      syntacticVacios,
      syntaxDiagnostic: {
        detectedSyntaxCode,
        focoCode: focoRevelacionCode,
        isCableadoConnected,
        syntaxCharacteristics,
      },
      groundingStatus: grounding,
      immediateAdjustment,
    },
    {
      activeCodes: leerActiveCodes(obj.activeCodes ?? obj.active_codes, activeCharacterMap),
      lowestMissingCascadeCode: lowestDeclared,
      titleConnectedToClose,
      masterTone: parseMasterTone(obj.masterTone ?? obj.master_tone) ?? undefined,
      pedagogicalFeedback,
      estadoAlumno: parseEstadoAlumno(obj.estadoAlumno ?? obj.estado_alumno) ?? undefined,
    },
  );

  return { ok: true, result };
}

export function scaffoldAnalysisResult(
  partial: Partial<DepotAnalysisLlmShape> &
    Pick<DepotAnalysisLlmShape, "characterSignedCode">,
): DepotAnalysisResult {
  const timestamp = Date.now();
  const characterSignedCode = partial.characterSignedCode;
  const focoRevelacionCode =
    partial.focoRevelacionCode ??
    partial.syntaxDiagnostic?.focoCode ??
    characterSignedCode;
  const activeCharacterMap =
    partial.activeCharacterMap ??
    buildActiveCharacterMap([characterSignedCode, focoRevelacionCode]);
  const syntaxDiagnostic = {
    detectedSyntaxCode:
      partial.syntaxDiagnostic?.detectedSyntaxCode ?? characterSignedCode,
    focoCode: partial.syntaxDiagnostic?.focoCode ?? focoRevelacionCode,
    isCableadoConnected:
      partial.syntaxDiagnostic?.isCableadoConnected ?? false,
    syntaxCharacteristics:
      partial.syntaxDiagnostic?.syntaxCharacteristics ??
      "Firma sintáctica pendiente de auditoría.",
  };
  return completarCamposCascada({
    id: `depot_${timestamp}`,
    timestamp,
    characterSignedCode,
    focoRevelacionCode,
    activeCharacterMap,
    syntacticVacios:
      partial.syntacticVacios ?? vaciosDesdeActiveMap(activeCharacterMap),
    syntaxDiagnostic,
    groundingStatus: partial.groundingStatus ?? {
      isFullyGrounded: false,
      diagnosticMessage: "Estabilidad de escritura pendiente de auditoría.",
    },
    immediateAdjustment:
      partial.immediateAdjustment ??
      partial.pedagogicalFeedback ??
      "Volvé a volcar el hecho crudo. Un solo gesto.",
  }, {
    activeCodes: partial.activeCodes,
    lowestMissingCascadeCode: partial.lowestMissingCascadeCode,
    titleConnectedToClose:
      partial.titleConnectedToClose ?? syntaxDiagnostic.isCableadoConnected,
    masterTone: partial.masterTone,
    pedagogicalFeedback:
      partial.pedagogicalFeedback ?? partial.immediateAdjustment,
    estadoAlumno: partial.estadoAlumno,
  });
}

export function hidratarResultadoV3(value: unknown): DepotAnalysisResult | null {
  if (!isDepotAnalysisResult(value)) return null;
  const map = characterMapDe(value);
  const focoRevelacionCode = value.focoRevelacionCode ?? focoRevelacionDe(value);
  return completarCamposCascada(
    {
      id: value.id,
      timestamp: value.timestamp,
      characterSignedCode: value.characterSignedCode,
      focoRevelacionCode,
      activeCharacterMap: map,
      syntacticVacios:
        value.syntacticVacios ?? vaciosDesdeActiveMap(map),
      syntaxDiagnostic: {
        detectedSyntaxCode:
          value.syntaxDiagnostic.detectedSyntaxCode || value.characterSignedCode,
        focoCode: value.syntaxDiagnostic.focoCode ?? focoRevelacionCode,
        isCableadoConnected: Boolean(value.syntaxDiagnostic.isCableadoConnected),
        syntaxCharacteristics: value.syntaxDiagnostic.syntaxCharacteristics,
      },
      groundingStatus: {
        isFullyGrounded: Boolean(value.groundingStatus.isFullyGrounded),
        diagnosticMessage: value.groundingStatus.diagnosticMessage,
      },
      immediateAdjustment: value.immediateAdjustment,
    },
    {
      activeCodes: value.activeCodes,
      lowestMissingCascadeCode: value.lowestMissingCascadeCode,
      titleConnectedToClose: value.titleConnectedToClose,
      masterTone: value.masterTone,
      pedagogicalFeedback: value.pedagogicalFeedback ?? value.immediateAdjustment,
      estadoAlumno: value.estadoAlumno,
    },
  );
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

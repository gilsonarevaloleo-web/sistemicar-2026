/**
 * Prompt del Auditor de Maestría V3.
 * Dictamen: geometría + vacíos + cableado + FOCO DE REVELACIÓN.
 * El ajuste apunta al código de síntesis, no a un vacío mecánico.
 */

import { CANON_TEN_EYES, etiquetaCodigoOjo } from "./ojos.ts";
import { TIER_MAX_EYE } from "./tiers.ts";
import { EYE_CODES, type DepotEntryPayload, type EyeCode } from "./types.ts";

export const DEPOSITO_V3_RITUAL = "¿Qué aprendí hoy?";

function diccionarioCanales(): string {
  return EYE_CODES.map((n) => {
    const o = CANON_TEN_EYES[n];
    return `C${n} ${o.name} / ${o.planeta} — ${o.concept}. ${o.description} Sintaxis ${o.syntaxLabel}: ${o.syntaxCharacteristics}`;
  }).join("\n");
}

function jsonSchemaEjemplo(): string {
  const active = EYE_CODES.map((n) => `    "${n}": ${n === 3 || n === 7 || n === 8 ? "true" : "false"}`).join(",\n");
  return `{
  "characterSignedCode": 3,
  "focoRevelacionCode": 8,
  "activeCharacterMap": {
${active}
  },
  "syntacticVacios": [1, 2, 4, 5, 6, 9, 10],
  "syntaxDiagnostic": {
    "detectedSyntaxCode": 3,
    "focoCode": 8,
    "isCableadoConnected": true,
    "syntaxCharacteristics": "Transición de la secuencia física C3 hacia la síntesis de polaridad C8."
  },
  "groundingStatus": {
    "isFullyGrounded": true,
    "diagnosticMessage": "La escritura sostiene título, secuencia y cierre. Estabilidad estructural, no juicio de verdad."
  },
  "immediateAdjustment": "Tu quiebre real ocurrió en la Ley de Polaridad (C8). Mañana, aplica este mismo criterio de inversión de polo a un escenario distinto fuera del taller para verificar la universalidad del patrón."
}`;
}

/**
 * Motor de maestría: forma + foco de revelación.
 * El ajuste es quirúrgico sobre el código de síntesis, no un consejo mecánico.
 */
export const DEPOT_V3_MASTER_PROMPT = `
You are the Syntax & Character Master Engine for Sistemicar's Depósito V3.
Your job is to evaluate the written geometry of the entry and provide a HIGHLY ACCURATE, MATURE adjustment instruction.

DO NOT evaluate moral truth, philosophical depth, or emotional validity.
DO NOT calculate "Perception Delta (Δ)" or judge if the user's theories are right or wrong.
Evaluate ONLY how the text is constructed, wired, and structured.

STEP 1: MAP THE 10 SYNTAX CODES (CARÁCTER)
- C1 (Cimiento): Topic/title grounding.
- C2 (Flujo): Connectors of causation.
- C3 (Trabajo): Antecedent -> Consequent sequential chain. Independent of clock time.
- C4 (Estructura): Interrogative break questions questioning the rule.
- C5 (Decisión/Corte): Definitive operational rules, limits, or polarity choices.
- C6 (Convivencia): Real physical scenes, friction, tools, raw facts.
- C7 (Visión): Axiomatic framing / Universal laws.
- C8 (Ciclos): Loop closures, movement between polarities, return cycles.
- C9 (Sistema): Multi-thread integration.
- C10 (Origen): Wiring/continuity between premise and conclusion.

STEP 2: IDENTIFY THE "FOCO DE REVELACIÓN" (CORE CODE OF VALUE)
- Do NOT just pick the code with the most words (e.g., C3).
- Identify WHERE the actual breakthrough or synthesis happened.
- Example: If the text uses C3 to describe a process, but concludes with a law of polarity, the FOCO IS C8 or C5, NOT C3.
- characterSignedCode = primary syntax used for storytelling.
- focoRevelacionCode = the highest-value code where the law or decision was forged.

STEP 3: GENERATE THE "AJUSTE TÉCNICO INMEDIATO"
- The advice MUST address the FOCO DE REVELACIÓN code, not just the mechanical structure.
- The advice must feel SOBER, INCISIVE, and DIRECTED at honing that specific law or decision.
- NEVER give generic advice like "repeat C3 with a number" if the user has reached a high-code realization (C5, C7, C8).
- NEVER fill a random syntactic void when a synthesis code is already present.

OUTPUT JSON STRUCTURE:
${jsonSchemaEjemplo()}
`.trim();

/** Alias: el motor de firma ahora es el prompt de maestría. */
export const DEPOT_V3_SYNTAX_ONLY_PROMPT = DEPOT_V3_MASTER_PROMPT;

export function buildDepositoV3SystemPrompt(): string {
  return `
${DEPOT_V3_MASTER_PROMPT}

Ritual: ${DEPOSITO_V3_RITUAL}
Cimiento y Claridad son el mismo canal. Trabajo y Ritmo son el mismo canal. La esencia es el número C1–C10.

═══ LEYES DE FIRMA ═══
0. SOLO FORMA. Medí geometría de redacción. Prohibido auditar verdad filosófica, moral o «profundidad» de la idea.
1. C3 NO EXIGE RELOJ. Si hay orden de ensamble A → B → C, C3 está ACTIVO.
2. C10 ES CABLEADO, NO TEMA. isCableadoConnected = true SOLO si título/hipótesis se conecta con el cuerpo y el cierre.
3. VACÍOS NO SON PECADO. Son puntos en blanco del armado. Van en syntacticVacios.
4. characterSignedCode es el código de sintaxis PRIMARIO del relato (el que narra).
5. focoRevelacionCode / syntaxDiagnostic.focoCode es el código de SÍNTESIS. No copies el canal con más palabras.
6. activeCharacterMap cubre "1"…"10" y alimenta el mapa de calor. Cero Óptica de verdad. Cero brecha Δ.
7. immediateAdjustment apunta al FOCO. Si hay C5/C7/C8/C9, profundizá o concretá ESE código. Prohibido «repetí C3 con un número».

═══ SALIDA ═══
Respondé SOLO un JSON válido (sin markdown) con la forma exacta de OUTPUT JSON STRUCTURE.
characterSignedCode, focoRevelacionCode, detectedSyntaxCode y focoCode son enteros 1–10.
activeCharacterMap cubre las claves "1"…"10".
syntacticVacios es un array de IDs 1–10 omitidos (puede ser []).
syntaxDiagnostic.isCableadoConnected es boolean.
syntaxCharacteristics, groundingStatus.diagnosticMessage e immediateAdjustment: español, cortos, estructurales.
immediateAdjustment: UNA instrucción quirúrgica sobre el FOCO. Cero sermón. Cero juicio de ideas. Cero consejo mecánico genérico.

LOS 10 CÓDIGOS DE CARÁCTER:
${diccionarioCanales()}
`.trim();
}

export function buildDepositoV3UserPrompt(payload: DepotEntryPayload): string {
  const techo = TIER_MAX_EYE[payload.userTier];
  const lines = [
    `Ritual: ${DEPOSITO_V3_RITUAL}`,
    `Tier del alumno: ${payload.userTier} (techo de candado UI: C${techo}; vos diagnosticás la geometría real, no el candado).`,
    "Volcado — texto crudo a auditar por FIRMA y FOCO (no por verdad):",
    "---",
    payload.rawFact || "(vacío)",
    "---",
  ];
  if (payload.detectedNoise) {
    lines.push(
      "Flor / excusa moral declarada (solo contexto de captura; NO juzgues su verdad):",
      "---",
      payload.detectedNoise,
      "---",
    );
  }
  if (payload.omittedShadow) {
    lines.push(
      "Sombra / lo no dicho (solo contexto de captura):",
      "---",
      payload.omittedShadow,
      "---",
    );
  }
  if (payload.studentHypothesis) {
    lines.push(
      "Título / hipótesis del alumno (úsalo para auditar C10 cableado y el foco de síntesis, no para puntuar filosofía):",
      "---",
      payload.studentHypothesis,
      "---",
    );
  }
  lines.push(
    "Auditar geometría, mapa de carácter, vacíos, cableado y FOCO DE REVELACIÓN.",
    "El ajuste inmediato apunta al foco, no a un vacío mecánico. Cero Óptica. Cero Δ. Respondé solo el JSON.",
  );
  return lines.join("\n");
}

export function serializarPromptAuditoria(payload: DepotEntryPayload): string {
  return `${buildDepositoV3SystemPrompt()}\n\n${buildDepositoV3UserPrompt(payload)}`;
}

export function etiquetaCanalPrompt(codigo: EyeCode, dialect: "canon" | "planeta" = "canon"): string {
  return etiquetaCodigoOjo(codigo, dialect);
}

/**
 * Prompt del Auditor Sintáctico de Firma V3.
 * No usa Óptica de verdad ni Δ: el dictamen es geometría + vacíos + cableado.
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
  "activeCharacterMap": {
${active}
  },
  "syntacticVacios": [1, 2, 4, 5, 6, 9, 10],
  "syntaxDiagnostic": {
    "detectedSyntaxCode": 3,
    "isCableadoConnected": true,
    "syntaxCharacteristics": "Ondas, loops, incubación; la secuencia C3 se estructura como ciclo C8."
  },
  "groundingStatus": {
    "isFullyGrounded": true,
    "diagnosticMessage": "La escritura sostiene título, secuencia y cierre. Estabilidad estructural, no juicio de verdad."
  },
  "immediateAdjustment": "Mañana, repetí el mismo canal C8 con un hecho medible. Cero inventario."
}`;
}

/**
 * Motor sintáctico de firma — texto del especialista.
 * Única vía: Forma (Sintaxis / Carácter) y lectura de Vacíos.
 */
export const DEPOT_V3_SYNTAX_ONLY_PROMPT = `
You are the Syntax Auditor Engine for Sistemicar's Depósito V3.
Your SOLE purpose is to evaluate the GEOMETRY, STRUCTURE, and CHARACTER SIGNATURE of the written text.

DO NOT evaluate moral truth, philosophical depth, or emotional validity.
DO NOT calculate "Perception Delta (Δ)" or judge if the user's theories are right or wrong.
Evaluate ONLY how the text is constructed, wired, and structured.

EVALUATION RULES (CARÁCTER / SINTAXIS):

1. CODES DECALOGUE (SYNTAX MARKERS):
   - C1 (Cimiento): Clear topic or title grounding.
   - C2 (Flujo): Connectors of cause/effect ("me llevó a", "entonces").
   - C3 (Trabajo/Secuencia Vectorial): Antecedent -> Consequent step-by-step chain (Independent of clock time).
   - C4 (Estructura): Interrogative break questions ("¿Por qué ocurre X?").
   - C5 (Decisión): Sharp, assertive, cutting language without ambiguity.
   - C6 (Convivencia): Reference to physical scene, tools, or friction points.
   - C7 (Visión): Axiomatic framing, hypotheses, or rule formulation.
   - C8 (Ciclos): Loop closure, return to initial premise, latency re-evaluation.
   - C9 (Sistema): Entwining multiple argument threads into a single flow.
   - C10 (Origen/Cableado): Structural cord continuity between Title, Hypothesis, and Conclusion.

2. VACÍOS TOPOGRÁFICOS (BLANK SPOTS):
   - Identify all codes (1..10) that are ABSENT in the text's structural geometry.
   - Return them in the "syntacticVacios" array.

3. CABLEADO AUDIT (C10 / CORDE):
   - Is there a clear connection between Title/Hypothesis and Conclusion? (boolean: isCableadoConnected).

OUTPUT JSON STRUCTURE:
${jsonSchemaEjemplo()}
`.trim();

export function buildDepositoV3SystemPrompt(): string {
  return `
${DEPOT_V3_SYNTAX_ONLY_PROMPT}

Ritual: ${DEPOSITO_V3_RITUAL}
Cimiento y Claridad son el mismo canal. Trabajo y Ritmo son el mismo canal. La esencia es el número C1–C10.

═══ LEYES DE FIRMA ═══
0. SOLO FORMA. Medí geometría de redacción. Prohibido auditar verdad filosófica, moral o «profundidad» de la idea.
1. C3 NO EXIGE RELOJ. Si hay orden de ensamble A → B → C, C3 está ACTIVO.
2. C10 ES CABLEADO, NO TEMA. isCableadoConnected = true SOLO si título/hipótesis se conecta con el cuerpo y el cierre.
3. VACÍOS NO SON PECADO. Son puntos en blanco del armado. Van en syntacticVacios.
4. characterSignedCode es el código de sintaxis PRIMARIO (más presente en la geometría).
5. activeCharacterMap cubre "1"…"10" y alimenta el mapa de calor. Cero Óptica de verdad. Cero brecha Δ.

═══ SALIDA ═══
Respondé SOLO un JSON válido (sin markdown) con la forma exacta de OUTPUT JSON STRUCTURE.
characterSignedCode y detectedSyntaxCode son enteros 1–10.
activeCharacterMap cubre las claves "1"…"10".
syntacticVacios es un array de IDs 1–10 omitidos (puede ser []).
syntaxDiagnostic.isCableadoConnected es boolean.
syntaxCharacteristics y groundingStatus.diagnosticMessage: español, cortos, estructurales.
immediateAdjustment: UNA instrucción de escritura para llenar un vacío mañana. Cero sermón. Cero juicio de ideas.

LOS 10 CÓDIGOS DE CARÁCTER:
${diccionarioCanales()}
`.trim();
}

export function buildDepositoV3UserPrompt(payload: DepotEntryPayload): string {
  const techo = TIER_MAX_EYE[payload.userTier];
  const lines = [
    `Ritual: ${DEPOSITO_V3_RITUAL}`,
    `Tier del alumno: ${payload.userTier} (techo de candado UI: C${techo}; vos diagnosticás la geometría real, no el candado).`,
    "Volcado — texto crudo a auditar por FIRMA (no por verdad):",
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
      "Título / hipótesis del alumno (úsalo para auditar C10 cableado, no para puntuar filosofía):",
      "---",
      payload.studentHypothesis,
      "---",
    );
  }
  lines.push(
    "Auditar SOLO geometría, mapa de carácter, vacíos y cableado. Cero Óptica. Cero Δ. Respondé solo el JSON.",
  );
  return lines.join("\n");
}

export function serializarPromptAuditoria(payload: DepotEntryPayload): string {
  return `${buildDepositoV3SystemPrompt()}\n\n${buildDepositoV3UserPrompt(payload)}`;
}

export function etiquetaCanalPrompt(codigo: EyeCode, dialect: "canon" | "planeta" = "canon"): string {
  return etiquetaCodigoOjo(codigo, dialect);
}

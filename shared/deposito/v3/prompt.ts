/**
 * Prompt del Auditor de Maestría V3.
 * Dictamen: geometría + vacíos + cableado + FOCO DE REVELACIÓN.
 * El ajuste apunta al código de síntesis, no a un vacío mecánico.
 * El motor se adapta al lenguaje natural: lee la INTENCIÓN, no conectores rígidos.
 * Telemetría fría: no fuerza C8/C9/C10 si el volcado no los construye en pantalla.
 */

import { CANON_TEN_EYES, etiquetaCodigoOjo } from "./ojos.ts";
import {
  bloquePuentesPrompt,
  bloqueTemperamentoPrompt,
  nucleoAjuste,
} from "./pedagogia.ts";
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
  "immediateAdjustment": "${nucleoAjuste(8)}"
}`;
}

/**
 * REAJUSTE DE ADAPTABILIDAD AL LENGUAJE NATURAL DEL USUARIO
 *
 * DIRECTIVA PRINCIPAL:
 * - El motor DEBE adaptarse a la forma natural, fluida y enriquecida de escribir del usuario.
 * - NO buscar únicamente conectores rígidos o palabras técnicas.
 * - Evaluar la INTENCIÓN SUBYACENTE de las acciones descritas en el texto.
 */
export const INTENT_AWARE_SYNTAX_PROMPT = `
You are the Deep Intent Syntax Auditor for Sistemicar's Depósito V3.

CRITICAL INSTRUCTION: ADAPT TO THE USER'S NATURAL LANGUAGE.
Do NOT force the user to write like a robot. The user writes in natural, narrative, or emotional Spanish. Your job is to translate their natural expression into its underlying structural INTENT.

HOW TO DETECT DEEP CODES IN NATURAL LANGUAGE:

1. C5 (DECISIÓN / CORTE / MARGEN):
   - Do NOT just look for technical words like "cortar" or "margen".
   - IF the user describes stopping an automatic behavior (e.g., "dejé el trabajo", "puse pausa al desglosador"), changing their focus on purpose to protect their body, or saying "NO" to an internal mandate ("el deber") -> THIS IS A C5 INTENT.

2. C8 (CICLOS / POLARIDAD / RETORNO):
   - IF the user describes switching to an opposite state (e.g., going from work to resting/Facebook/audio) to restore energy, and then returning to productivity refreshed -> THIS IS A C8 INTENT.
   - ONLY if that cycle is constructed in the wording. Do NOT infer C8 from implied rest, drama, or recharge that the sentence does not build.

3. C7 (VISIÓN / PATRÓN AXIOMÁTICO):
   - IF the user discovers a rule about how things work (e.g., "donde está tu atención está tu energía", "el deber es el enemigo instalado") -> THIS IS A C7 INTENT.

4. SEPARATION OF SURFACE vs INTENT:
   - Surface connectors ("entonces", "después", "luego") are just narrative vessels. Do NOT let superficial C2 markers blind you to the heavy structural decisions (C5, C7, C8) inside the story.
   - A pure C2 (Flujo) → C7 (Visión) transition is valid Firma + Foco. Do not invent C8/C9/C10 to "complete" the heatmap.

OUTPUT:
Identify the TRUE FOCO DE REVELACIÓN based on the USER'S REAL INTENT, not just word frequencies.
Give advice that validates their natural discovery and helps them sharpen that specific higher code.
Measure what the text constructs on screen. Do not simulate missing high codes.
`.trim();

/**
 * AVISO DE CALIBRACIÓN — telemetría fría del mapa de calor.
 * Mantiene Intent-Aware Syntax. No fuerza ni simula C8/C9/C10.
 */
export const UPDATED_DEPOT_ENGINE_PROMPT = `
You are the Cold Telemetry Auditor for Sistemicar's Depósito V3 heatmap.

CRITICAL INSTRUCTION: KEEP INTENT-AWARE SYNTAX.
Do NOT force or simulate activation of higher codes (C8, C9 or C10) in the Heatmap if the exact wording of the dump does not construct them explicitly in the text.

GOLDEN RULES FOR TELEMETRY:

1. PRIORITIZE REAL GEOMETRY:
   - If the text structure is a pure transition from Flujo (C2) to Axiomatic Vision (C7), mark that Firma and that Foco with precision.
   - Example: "entonces / después / al día siguiente" that forges a law → FIRMA C2, FOCO C7. Do not invent C8, C9 or C10 to fill the map.

2. RESPECT SYNTACTIC VOIDS:
   - If C8 or C9 remain in the background of the direct writing, mark them correctly as vacíos.
   - Do NOT guess implicit meanings or unwritten intentions.

3. NATURAL INTENT, COLD MIRROR:
   - Keep reading the user's natural, enriched language (no robotic jargon required).
   - Always measure what the text constructs and sustains ON SCREEN.
   - The Depot mirror is a cold telemetry instrument without distortion.

OUTPUT INTEGRITY:
- characterSignedCode = the syntax the writing actually uses (Firma).
- focoRevelacionCode = the synthesis the writing actually forges (Foco).
- activeCharacterMap / syntacticVacios must match codes constructed in the text, not inferred backstory.
- Provide immediate technical adjustments tailored specifically to the detected FOCO code.
`.trim();

/**
 * Motor de maestría: forma + foco de revelación.
 * El ajuste es quirúrgico sobre el código de síntesis, no un consejo mecánico.
 * Lee intención estructural en lenguaje natural; no exige jerga de códigos.
 */
export const DEPOT_V3_MASTER_PROMPT = `
You are the Syntax & Character Master Engine for Sistemicar's Depósito V3.
Your job is to evaluate the written geometry of the entry and provide a HIGHLY ACCURATE, MATURE adjustment instruction.

${INTENT_AWARE_SYNTAX_PROMPT}

${UPDATED_DEPOT_ENGINE_PROMPT}

DO NOT evaluate moral truth, philosophical depth, or emotional validity.
DO NOT calculate "Perception Delta (Δ)" or judge if the user's theories are right or wrong.
Intent is STRUCTURAL, not moral: detect the code the action embodies. Do not grade whether the insight is wise.
Evaluate how the text is constructed, wired, and structured — including the intent underneath natural Spanish, not only rigid connectors.

STEP 1: MAP THE 10 SYNTAX CODES (CARÁCTER)
- C1 (Cimiento): Topic/title grounding.
- C2 (Flujo): Connectors of causation. SURFACE ONLY — "entonces/después/luego" are narrative vessels, not the foco.
- C3 (Trabajo): Antecedent -> Consequent sequential chain. Independent of clock time.
- C4 (Estructura / Seriedad): Inflection question where the paradigm shifts. Without C4 there is no seriousness, therefore no depth. When the student asks themselves the question, C4 is acting. The soul of the code does not change; the arrangement follows the topic.
- C5 (Decisión/Corte): Stopping an automatic behavior, a deliberate NO, a margin that protects the body. Not only the words "cortar" or "margen".
- C6 (Convivencia): Real physical scenes, friction, tools, raw facts.
- C7 (Visión): A discovered rule / axiomatic framing. A sentence that names how things work.
- C8 (Ciclos): Switching to the opposite pole to restore energy and returning. Loop closures, polarity. Only if the wording constructs that cycle.
- C9 (Sistema): Multi-thread integration. Only if the wording constructs several threads / load balance. Do not simulate it.
- C10 (Origen): Wiring/continuity between premise and conclusion.

STEP 2: IDENTIFY THE "FOCO DE REVELACIÓN" (CORE CODE OF VALUE)
- Do NOT just pick the code with the most words (e.g., C3).
- Do NOT let C2 connector frequency blind you to C5/C7/C8 inside the story.
- Identify WHERE the actual breakthrough or synthesis happened — the USER'S REAL INTENT.
- Example: If the text uses C3 to describe a process, but concludes with a law of polarity, the FOCO IS C8 or C5, NOT C3.
- Example: Narrative Spanish with "entonces/después" that forges "el deber es el enemigo" → FIRMA may be C2, FOCO IS C7. Do not invent C8/C9.
- characterSignedCode = primary syntax used for storytelling (Firma).
- focoRevelacionCode = the highest-value code where the law or decision was forged.

STEP 3: GENERATE THE "AJUSTE DE PERCEPCIÓN" (immediateAdjustment)
- Structuring the text STIMULATES perception of the eyes. Do not give life-coaching ("apply this tomorrow in another scenario").
- Formula: "Para que tu percepción de C[n] se desarrolle, escribí [geometría del puente]."
- The soul of the code does not change. The arrangement follows the topic of the dump.
- C4 is the inflection question (paradigm shift). Without C4 there is no Seriedad, therefore no depth.
- C1 = attention in the title. Connecting that title with the close is C10. C2 develops by connecting the dots (C3).
- Match the TEMPERAMENTO of the student's grade (G1 nutritive → G4 dry).
- NEVER give generic advice like "repeat C3 with a number".
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
5. focoRevelacionCode / syntaxDiagnostic.focoCode es el código de SÍNTESIS. No copies el canal con más palabras. No copies conectores C2.
6. activeCharacterMap cubre "1"…"10" y alimenta el mapa de calor. Cero Óptica de verdad. Cero brecha Δ.
7. immediateAdjustment enseña el PRÓXIMO VOLCADO. Fórmula: percepción de C[n] → geometría a escribir. Cero consejo de vida. Prohibido «repetí C3 con un número».
8. LENGUAJE NATURAL. Adaptate a cómo escribe el usuario. «entonces/después/luego» son vasos narrativos. C5/C7/C8 viven en la INTENCIÓN de la acción, no en jerga técnica.
9. TELEMETRÍA FRÍA. No fuerces ni simules C8, C9 o C10 si la redacción exacta no los construye. Una transición pura C2→C7 se marca como Firma C2 y Foco C7. Los vacíos de C8/C9 se respetan.
10. C4 ES INFLEXIÓN. Pregunta donde ocurre el cambio de paradigma. Sin C4 no hay seriedad ni profundidad. El alma del código no cambia; el acomodo sigue el tema.
11. TEMPERAMENTO. G1 nutritivo, G2 fricción, G3 rigor, G4 matemática pura. El tono sigue al grado, no al código del mapa.

═══ SALIDA ═══
Respondé SOLO un JSON válido (sin markdown) con la forma exacta de OUTPUT JSON STRUCTURE.
characterSignedCode, focoRevelacionCode, detectedSyntaxCode y focoCode son enteros 1–10.
activeCharacterMap cubre las claves "1"…"10".
syntacticVacios es un array de IDs 1–10 omitidos (puede ser []).
syntaxDiagnostic.isCableadoConnected es boolean.
syntaxCharacteristics, groundingStatus.diagnosticMessage e immediateAdjustment: español, cortos, estructurales.
immediateAdjustment: UNA instrucción de escritura sobre el FOCO. Fórmula percepción→geometría. Cero sermón. Cero consejo de vida.

${bloquePuentesPrompt()}

LOS 10 CÓDIGOS DE CARÁCTER:
${diccionarioCanales()}
`.trim();
}

export function buildDepositoV3UserPrompt(payload: DepotEntryPayload): string {
  const techo = TIER_MAX_EYE[payload.userTier];
  const lines = [
    `Ritual: ${DEPOSITO_V3_RITUAL}`,
    `Tier del alumno: ${payload.userTier} (techo de candado UI: C${techo}; vos diagnosticás la geometría real, no el candado).`,
    bloqueTemperamentoPrompt(payload.userTier),
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
    "Adaptate al lenguaje natural: leé la INTENCIÓN de las acciones, no busques solo conectores rígidos.",
    "Telemetría fría: no fuerces C8/C9/C10 si el texto no los construye. Una transición C2→C7 se marca así. Respetá los vacíos.",
    "El ajuste enseña el próximo volcado: percepción del FOCO → geometría a escribir. Cero consejo de vida. Cero Óptica. Cero Δ. Respondé solo el JSON.",
  );
  return lines.join("\n");
}

export function serializarPromptAuditoria(payload: DepotEntryPayload): string {
  return `${buildDepositoV3SystemPrompt()}\n\n${buildDepositoV3UserPrompt(payload)}`;
}

export function etiquetaCanalPrompt(codigo: EyeCode, dialect: "canon" | "planeta" = "canon"): string {
  return etiquetaCodigoOjo(codigo, dialect);
}

/**
 * Prompt del Auditor Inclemente V3 (Óptica-Sintaxis).
 * No usa el Muro de Dominancia de V2: el dictamen es dos ejes + Δ.
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
  const audits = EYE_CODES.map((n) => {
    return `    "${n}": { "eyeId": ${n}, "hasIntention": false, "hasRealVision": false, "isBlindSpot": false }`;
  }).join(",\n");
  const active = EYE_CODES.map((n) => `    "${n}": false`).join(",\n");
  return `{
  "perceptionEye": 7,
  "characterSignedCode": 3,
  "activeEyeMap": {
${active}
  },
  "eyeAudits": {
${audits}
  },
  "deltaGap": 4,
  "syntaxDiagnostic": {
    "detectedSyntaxCode": 3,
    "syntaxCharacteristics": "Paso a paso, marcas de hora, orden de pistón."
  },
  "groundingStatus": {
    "isFullyGrounded": false,
    "frictionPoint": 3,
    "diagnosticMessage": "La visión opera en C7. El chasis fricciona en C3. No se invalida la óptica."
  },
  "systemicAnalysis": {
    "isLatencyEvent": false,
    "isSystemicConflict": false,
    "realEngineeringCause": "El corte se narra como patrón y se ejecuta como secuencia rota."
  },
  "immediateAdjustment": "Mañana, una secuencia de tres pasos con hora de corte. Cero sermón."
}`;
}

export function buildDepositoV3SystemPrompt(): string {
  return `
Eres el Auditor Inclemente de Sistemicar (Óptica-Código: Ley de los Diez Ojos).
Analizás un VOLCADO crudo. Extraés Óptica (qué canal lee) y Sintaxis de Carácter (cómo está escrita la acción).

Ritual: ${DEPOSITO_V3_RITUAL}
Cimiento y Claridad son el mismo canal. Trabajo y Ritmo son el mismo canal. La esencia es el número C1–C10.

═══ LEYES DE OPERACIÓN ═══
1. LA LUZ VIENE DE ARRIBA.
   Una percepción alta (C7–C10) NUNCA se invalida por una falla baja (C1–C4).
   El código inferior diagnostica capacidad / fricción de dominó, no autoridad de gobierno.
   Si el alumno ve el patrón (C7) y el pistón falla (C3), perceptionEye = 7 y characterSignedCode = 3.
   Prohibido bajar la óptica a C3 «porque no ejecutó». Eso rompe el orden.

2. DESINFECTAR LA MORAL.
   Sacá culpa, «debo», «debería», excusas de energía y virtud productiva.
   Traducí todo a ingeniería fría: secuencia (C3), estructura (C4), latencia de ciclo (C8) o balance de hilos (C9).
   Lo moral no elige código. La mecánica sí.

3. EFECTOS DIFERIDOS.
   Retrasos de 24/48h, ansiedad que vuelve, loops: son latencia C8, no flojera.
   systemicAnalysis.isLatencyEvent = true cuando el hecho llega con retraso de onda.

4. FIRMA SINTÁCTICA.
   Medí la ESTRUCTURA de la redacción, no el tema:
   C1 Disperso — frases sueltas, fatiga, materia prima.
   C2 Relacional — entradas/salidas, estímulo.
   C3 Secuencial — pasos, horas, pistón.
   C4 Reflexivo — pregunta reglas y muros.
   C5 Ejecutivo — corte, cero excusa.
   C6 Anecdótico — roce con terceros.
   C7 Axiomático — patrón, concepto.
   C8 Diferido — ondas, incubación.
   C9 Multihilo — balance de carga.
   C10 Matriz — causa raíz.

═══ EXTRACCIÓN EN 4 CAPAS ═══
1. Territorio: hechos físicos vs opinión/moral.
2. Hipótesis: ¿la conclusión del alumno es ingeniería o escudo moral?
3. Firma: ojo dominante de la SINTAXIS de las frases.
4. Esencia: ajuste frío, geométrico, ejecutable mañana.

═══ SALIDA ═══
Respondé SOLO un JSON válido (sin markdown) con esta forma exacta:
${jsonSchemaEjemplo()}

perceptionEye y characterSignedCode son enteros 1–10.
deltaGap DEBE ser |perceptionEye - characterSignedCode|.
activeEyeMap y eyeAudits cubren las claves "1"…"10".
frictionPoint es opcional (1–10) y nombra el chasis, no «desautoriza» la óptica.
immediateAdjustment: UNA instrucción técnica, sin sermón, sin comillas largas del alumno.
Cero New Age. Cero consuelo. Cero tercer ojo.

LOS 10 CANALES:
${diccionarioCanales()}
`.trim();
}

export function buildDepositoV3UserPrompt(payload: DepotEntryPayload): string {
  const techo = TIER_MAX_EYE[payload.userTier];
  const lines = [
    `Ritual: ${DEPOSITO_V3_RITUAL}`,
    `Tier del alumno: ${payload.userTier} (techo de candado UI: C${techo}; vos diagnosticás el orden real, no el candado).`,
    "Volcado — territorio crudo:",
    "---",
    payload.rawFact || "(vacío)",
    "---",
  ];
  if (payload.detectedNoise) {
    lines.push(
      "Flor / excusa moral declarada por el alumno:",
      "---",
      payload.detectedNoise,
      "---",
    );
  }
  if (payload.omittedShadow) {
    lines.push(
      "Sombra / lo no dicho:",
      "---",
      payload.omittedShadow,
      "---",
    );
  }
  if (payload.studentHypothesis) {
    lines.push(`Hipótesis del alumno: ${payload.studentHypothesis}`);
  }
  lines.push(
    "Diagnosticá óptica, sintaxis y Δ. Respondé solo el JSON.",
  );
  return lines.join("\n");
}

export function serializarPromptAuditoria(payload: DepotEntryPayload): string {
  return `${buildDepositoV3SystemPrompt()}\n\n${buildDepositoV3UserPrompt(payload)}`;
}

export function etiquetaCanalPrompt(codigo: EyeCode, dialect: "canon" | "planeta" = "canon"): string {
  return etiquetaCodigoOjo(codigo, dialect);
}

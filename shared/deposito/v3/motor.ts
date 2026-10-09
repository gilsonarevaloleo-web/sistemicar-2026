/**
 * Motor de auditoría V3: Gemini + fallback local.
 * El dictamen es óptica + carácter + Δ. No elige un solo ojo dominante.
 */

import {
  CANON_TEN_EYES,
  buildActiveEyeMap,
  computeDeltaGap,
  emptyEyeAudits,
} from "./ojos.ts";
import { serializarPromptAuditoria } from "./prompt.ts";
import {
  parseDepotAnalysisResult,
  scaffoldAnalysisResult,
} from "./validar.ts";
import {
  EYE_CODES,
  type DepotAnalysisResult,
  type DepotEntryPayload,
  type EyeAudit,
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

const PERCEPCION: Record<EyeCode, RegExp[]> = {
  1: [/territor/, /\bsuelo\b/, /\bcuerpo\b/, /fatiga/, /\bcama\b/, /\bcasa\b/, /espacio fisico/],
  2: [/caudal/, /\bentra\b/, /\bsale\b/, /estanc/, /rutina/, /inbox/, /flujo/],
  3: [/secuen/, /piston/, /pistón/, /paso a paso/, /\britmo\b/, /primero/, /segundo/, /tercer/],
  4: [/estructur/, /reten/, /limite/, /límite/, /muro/, /estandar/, /estándar/, /contenci/],
  5: [/decid/, /corte/, /cort[eé]/, /eleg/, /evad/, /disparo/, /no lo hice/],
  6: [/juntura/, /relacion/, /relación/, /roce/, /cliente/, /ella\b/, /esposa/, /tercero/],
  7: [/patron/, /patrón/, /modelo/, /\bley\b/, /vision/, /visión/, /lente/, /axioma/],
  8: [/ciclo/, /\bloop\b/, /48\s*h/, /24\s*h/, /incuba/, /volvi[oó]/, /retorno/, /latencia/],
  9: [/sistema/, /conjunto/, /arquitect/, /carga/, /hilos/, /escala/, /multihilo/],
  10: [/origen/, /fuente/, /matriz/, /por que existe/, /por qué existe/, /\beje\b/],
};

const SINTAXIS: Record<EyeCode, RegExp[]> = {
  1: [/cansad/, /fatiga/, /no conect/, /suelto/, /materia prima/],
  2: [/entonces/, /despues me/, /después me/, /entro y/, /sali[oó]/],
  3: [/\d{1,2}:\d{2}/, /a las \d/, /minutos/, /pasos?/, /secuencia/, /primero .+ segundo/s],
  4: [/¿[^?]{6,}\?/, /por que la regla/, /por qué la regla/, /el muro/, /la norma/],
  5: [/\bcort[eé]\b/, /\bno\.\b/, /cero excusa/, /dispar[eé]/, /decid[ií]/],
  6: [/"[^"]{4,}"/, /me dijo/, /le dije/, /con ella/, /con él/, /cliente/],
  7: [/la ley es/, /el patron/, /el patrón/, /se repite el modelo/, /en abstracto/],
  8: [/48\s*h/, /24\s*h/, /me volvi[oó]/, /dos dias/, /dos días/, /ansiedad/],
  9: [/al mismo tiempo/, /varios hilos/, /balance de carga/, /mientras .+ tambien/s],
  10: [/la fuente/, /de raiz/, /de raíz/, /el origen de este/],
};

const FLOR_MORAL =
  /culpa|debo|deber[ií]a|energ[ií]a|productiv|flojo|soy malo|virtud|ya ver[eé]/i;

const HECHO_FRIO =
  /\d{1,2}:\d{2}|\d+\s*(min|hora|d[ií]a)|hoy a las|ayer|anot[eé]|med[ií]|cort[eé] \d/i;

const LATENCIA = /48\s*h|24\s*h|me volvi[oó]|loop|ansiedad|incuba|dos d[ií]as/i;

const SISTEMICO =
  /virtud|productiv|balance de carga|varios hilos|trampa de|multihilo|escala/i;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hitsDe(norm: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) {
    if (p.test(norm)) n += 1;
  }
  return n;
}

function puntuar(
  norm: string,
  tabla: Record<EyeCode, RegExp[]>,
): Record<EyeCode, number> {
  const scores = {} as Record<EyeCode, number>;
  for (const n of EYE_CODES) {
    scores[n] = hitsDe(norm, tabla[n]);
  }
  return scores;
}

function elegirGanador(
  scores: Record<EyeCode, number>,
  prefer: "alto" | "bajo",
): EyeCode {
  let mejor: EyeCode = prefer === "alto" ? 10 : 1;
  let mejorHits = -1;
  const orden = prefer === "alto" ? [...EYE_CODES].reverse() : EYE_CODES;
  for (const n of orden) {
    if (scores[n] > mejorHits) {
      mejorHits = scores[n];
      mejor = n;
    }
  }
  if (mejorHits <= 0) return prefer === "alto" ? 1 : 1;
  return mejor;
}

function textoCompuesto(payload: DepotEntryPayload): string {
  return [
    payload.rawFact,
    payload.detectedNoise ? `Flor: ${payload.detectedNoise}` : "",
    payload.omittedShadow ? `Sombra: ${payload.omittedShadow}` : "",
    payload.studentHypothesis ? `Hipotesis: ${payload.studentHypothesis}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function hipotesisComoOjo(value?: string): EyeCode | null {
  if (!value) return null;
  const m = value.match(/C?\s*([1-9]|10)\b/i);
  if (!m) return null;
  return Number(m[1]) as EyeCode;
}

function auditarOjos(opts: {
  perc: Record<EyeCode, number>;
  syn: Record<EyeCode, number>;
  perceptionEye: EyeCode;
  characterSignedCode: EyeCode;
  hayFlor: boolean;
  hayHechoFrio: boolean;
}): Record<EyeCode, EyeAudit> {
  const audits = emptyEyeAudits();
  for (const n of EYE_CODES) {
    const intencion = opts.perc[n] > 0 || opts.syn[n] > 0;
    const vision =
      intencion && opts.hayHechoFrio && !(opts.hayFlor && n >= 7 && opts.characterSignedCode <= 4);
    const puntoCiego =
      (n === opts.perceptionEye &&
        opts.perceptionEye >= 7 &&
        opts.characterSignedCode <= 4 &&
        opts.hayFlor) ||
      (n === opts.characterSignedCode &&
        opts.perceptionEye >= 7 &&
        n <= 4);
    audits[n] = {
      eyeId: n,
      hasIntention: intencion || n === opts.perceptionEye || n === opts.characterSignedCode,
      hasRealVision: vision || (n === opts.perceptionEye && opts.hayHechoFrio && !opts.hayFlor),
      isBlindSpot: puntoCiego,
    };
  }
  return audits;
}

/**
 * Fallback local: dos ejes, no un muro.
 * Si hay señal alta (C7–C10) y fricción baja (C1–C4), la óptica se sostiene.
 */
export function diagnosticarAuditoriaLocal(
  payload: DepotEntryPayload,
): DepotAnalysisResult {
  const texto = textoCompuesto(payload);
  const norm = normalizar(texto);
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;

  if (palabras < 6) {
    return sellarLocal(
      scaffoldAnalysisResult({
        perceptionEye: 1,
        characterSignedCode: 1,
        groundingStatus: {
          isFullyGrounded: false,
          frictionPoint: 1,
          diagnosticMessage:
            "El volcado aún es clima. C1 Cimiento no tiene territorio nombrado. Sin óptica alta que sostener.",
        },
        systemicAnalysis: {
          isLatencyEvent: false,
          isSystemicConflict: false,
          realEngineeringCause:
            "No hay hecho frío. La moral no aplica: falta materia.",
        },
        immediateAdjustment:
          "Volcá UN hecho físico: hora, lugar, verbo. Cero clima.",
        syntaxDiagnostic: {
          detectedSyntaxCode: 1,
          syntaxCharacteristics: CANON_TEN_EYES[1].syntaxCharacteristics,
        },
      }),
    );
  }

  const perc = puntuar(norm, PERCEPCION);
  const syn = puntuar(norm, SINTAXIS);
  const hipotesis = hipotesisComoOjo(payload.studentHypothesis);

  let perceptionEye = elegirGanador(perc, "alto");
  let characterSignedCode = elegirGanador(syn, "bajo");

  if (hipotesis && hipotesis >= 7 && perc[hipotesis] >= 0) {
    if (perc[hipotesis] > 0 || /patron|patrón|ley|sistema|origen/.test(norm)) {
      perceptionEye = hipotesis;
    }
  }

  // Luz de arriba: si hay señal alta, no bajarla al código de fricción.
  const techoPerc = elegirGanador(perc, "alto");
  if (techoPerc >= 7 && perc[techoPerc] > 0 && perceptionEye < techoPerc) {
    perceptionEye = techoPerc;
  }
  if (perceptionEye >= 7 && characterSignedCode === perceptionEye && syn[3] > 0) {
    characterSignedCode = 3;
  }
  if (LATENCIA.test(norm) && syn[8] >= syn[characterSignedCode]) {
    characterSignedCode = 8;
  }
  if (palabras >= 12 && characterSignedCode === 1 && syn[3] > 0) {
    characterSignedCode = 3;
  }

  const hayFlor = FLOR_MORAL.test(texto) || Boolean(payload.detectedNoise);
  const hayHechoFrio = HECHO_FRIO.test(texto);
  const isLatencyEvent = LATENCIA.test(norm);
  const isSystemicConflict = SISTEMICO.test(norm) || perc[9] > 0 && syn[3] > 0;
  const deltaGap = computeDeltaGap(perceptionEye, characterSignedCode);
  const grounded = deltaGap === 0 && hayHechoFrio && !hayFlor;
  const frictionPoint =
    !grounded && characterSignedCode <= 4 ? characterSignedCode : undefined;

  const percepName = CANON_TEN_EYES[perceptionEye].name;
  const charName = CANON_TEN_EYES[characterSignedCode].name;
  const diagnosticMessage = grounded
    ? `Óptica y carácter coinciden en C${perceptionEye} ${percepName}. El chasis sostiene la visión.`
    : `La visión opera en C${perceptionEye} ${percepName}. El chasis fricciona en C${characterSignedCode} ${charName}. No se invalida la óptica.`;

  const causa = hayFlor
    ? `La flor moral tapa ingeniería: se narra ${percepName.toLowerCase()} y se ejecuta ${charName.toLowerCase()}.`
    : `El corte se lee como ${percepName.toLowerCase()} y se firma como ${charName.toLowerCase()}.`;

  const ajuste = frictionPoint
    ? `Mañana, un solo gesto de ${CANON_TEN_EYES[frictionPoint].concept.toLowerCase()} en la escena de hoy. Cero sermón.`
    : `Mañana, repetí el mismo canal C${perceptionEye} con un hecho medible. Cero inventario.`;

  return sellarLocal(
    scaffoldAnalysisResult({
      perceptionEye,
      characterSignedCode,
      activeEyeMap: buildActiveEyeMap(
        EYE_CODES.filter((n) => perc[n] > 0 || syn[n] > 0 || n === perceptionEye || n === characterSignedCode),
      ),
      eyeAudits: auditarOjos({
        perc,
        syn,
        perceptionEye,
        characterSignedCode,
        hayFlor,
        hayHechoFrio,
      }),
      deltaGap,
      syntaxDiagnostic: {
        detectedSyntaxCode: characterSignedCode,
        syntaxCharacteristics: CANON_TEN_EYES[characterSignedCode].syntaxCharacteristics,
      },
      groundingStatus: {
        isFullyGrounded: grounded,
        ...(frictionPoint ? { frictionPoint } : {}),
        diagnosticMessage,
      },
      systemicAnalysis: {
        isLatencyEvent,
        isSystemicConflict,
        realEngineeringCause: causa,
      },
      immediateAdjustment: ajuste,
    }),
  );
}

function sellarLocal(result: DepotAnalysisResult): DepotAnalysisResult {
  return {
    ...result,
    deltaGap: computeDeltaGap(result.perceptionEye, result.characterSignedCode),
    syntaxDiagnostic: {
      ...result.syntaxDiagnostic,
      detectedSyntaxCode:
        result.syntaxDiagnostic.detectedSyntaxCode || result.characterSignedCode,
    },
  };
}

function sellarGemini(result: DepotAnalysisResult): DepotAnalysisResult {
  return {
    ...result,
    deltaGap: computeDeltaGap(result.perceptionEye, result.characterSignedCode),
    activeEyeMap: {
      ...buildActiveEyeMap([]),
      ...result.activeEyeMap,
      [result.perceptionEye]: true,
      [result.characterSignedCode]: true,
    },
    eyeAudits: {
      ...emptyEyeAudits(),
      ...result.eyeAudits,
    },
  };
}

export async function procesarAuditoriaV3(
  payload: DepotEntryPayload,
  callGemini?: GeminiAuditCaller,
): Promise<ResultadoAuditoriaV3> {
  const serialized = serializarPromptAuditoria(payload);

  if (callGemini) {
    try {
      const raw = await callGemini(serialized, 2048, true);
      const parsed = parseDepotAnalysisResult(raw);
      if (parsed.ok) {
        return { result: sellarGemini(parsed.result), source: "gemini" };
      }
    } catch {
      // reintento abajo
    }
    try {
      const raw2 = await callGemini(
        `${serialized}\n\nIMPORTANTE: responde SOLO el JSON con perceptionEye, characterSignedCode, deltaGap, syntaxDiagnostic, groundingStatus, systemicAnalysis, immediateAdjustment.`,
        2048,
        false,
      );
      const parsed2 = parseDepotAnalysisResult(raw2);
      if (parsed2.ok) {
        return { result: sellarGemini(parsed2.result), source: "gemini" };
      }
    } catch (err) {
      console.warn(
        "[deposito/v3] Gemini falló → fallback local:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return {
    result: diagnosticarAuditoriaLocal(payload),
    source: "local_fallback",
  };
}

/**
 * Motor de auditoría V3: Gemini + fallback local.
 * El dictamen es firma de carácter + vacíos + cableado.
 * No evalúa Óptica de verdad ni calcula Δ.
 */

import {
  CANON_TEN_EYES,
  buildActiveCharacterMap,
  esCodigoFocoSintesis,
  vaciosDesdeActiveMap,
} from "./ojos.ts";
import { ajustePedagogico } from "./pedagogia.ts";
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

const SINTAXIS: Record<EyeCode, RegExp[]> = {
  1: [
    /cansad/,
    /fatiga/,
    /no conect/,
    /suelto/,
    /materia prima/,
    /territorio/,
    /\btitulo\b/,
    /\btítulo\b/,
  ],
  2: [
    /entonces/,
    /me llevo a/,
    /despues me/,
    /después me/,
    /al dia siguiente/,
    /entro y/,
    /sali[oó]/,
    /causa/,
    /efecto/,
  ],
  3: [
    /me llevo a/,
    /entonces ocurrio/,
    /entonces /,
    /antes [\s\S]+ despues/,
    /luego /,
    /a partir de/,
    /pasos?/,
    /secuencia/,
    /primero [\s\S]+ segundo/,
    /antecedente/,
    /consecuente/,
    /piston/,
    /pistón/,
  ],
  4: [/¿[^?]{6,}\?/, /por que /, /por qué /, /el muro/, /la norma/, /la regla/],
  5: [
    /\bcort[eé]\b/,
    /\bno\.\b/,
    /cero excusa/,
    /dispar[eé]/,
    /decid[ií]/,
    /deje (el trabajo|de trabajar|el desglosador|de hacer|de seguir|de empujar)/,
    /puse pausa/,
    /pause (el |al |la )/,
    /pausa (al |el |del )desglosador/,
    /dije (que )?no/,
    /no al deber/,
    /proteger (el |mi )?cuerpo/,
    /para no romper (el |mi )?cuerpo/,
    /el cuerpo pedia/,
    /el cuerpo pidio/,
    /cambie (el |mi )?foco/,
    /a proposito/,
  ],
  6: [
    /"[^"]{4,}"/,
    /me dijo/,
    /le dije/,
    /con ella/,
    /con él/,
    /cliente/,
    /\d{1,2}:\d{2}/,
    /herramient/,
    /taller/,
    /escritorio/,
    /escena/,
  ],
  7: [
    /la ley es/,
    /el patron/,
    /el patrón/,
    /se repite el modelo/,
    /el modelo se repite/,
    /en abstracto/,
    /hipotesis/,
    /hipótesis/,
    /axioma/,
    /el deber es/,
    /enemigo instalado/,
    /donde esta (tu |la )?atencion/,
    /atencion[\s\S]{0,48}energia/,
    /energia[\s\S]{0,48}atencion/,
    /me di cuenta (de )?que/,
    /asi funcion/,
    /la regla (es|que)/,
  ],
  8: [
    /48\s*h/,
    /24\s*h/,
    /me volvi[oó]/,
    /dos dias/,
    /dos días/,
    /ansiedad/,
    /\bloop\b/,
    /ciclo/,
    /retorno/,
    /incuba/,
    /polaridad/,
    /\bpolos?\b/,
    /inversion/,
    /inversión/,
  ],
  9: [
    /al mismo tiempo/,
    /varios hilos/,
    /balance de carga/,
    /mientras [\s\S]+ tambien/,
    /multihilo/,
  ],
  10: [/la fuente/, /de raiz/, /de raíz/, /el origen de este/, /cableado/, /matriz/],
};

const HECHO_FRIO =
  /\d{1,2}:\d{2}|\d+\s*(min|hora|d[ií]a)|hoy a las|ayer|anot[eé]|med[ií]|cort[eé] \d/i;

const LATENCIA = /48\s*h|24\s*h|me volvi[oó]|loop|ansiedad|incuba|dos d[ií]as/i;

/** C8 técnico: ciclo, polo, latencia. Gana al C7 en el cierre si está explícito. */
const C8_TECNICO =
  /48\s*h|24\s*h|\bloop\b|ciclo|retorno|polaridad|\bpolos?\b|incuba|inversion|ansiedad/;

/** Polo opuesto en lenguaje natural (ocio / red / audio / descanso). */
const C8_POLO_NATURAL =
  /facebook|instagram|whatsapp|tiktok|redes sociales|\baudio\b|descans|siesta|\bocio\b|me recost|a descansar/;

/** Retorno al polo de producción, con energía restaurada. */
const C8_RETORNO_NATURAL =
  /volvi( o| a | con )|regres|de vuelta|otra vez (al |a )?(trabajo|produc|desglos)|energia (estaba|volvio|cargo|de vuelta)|refresc/;

function tieneCicloNatural(norm: string): boolean {
  return C8_POLO_NATURAL.test(norm) && C8_RETORNO_NATURAL.test(norm);
}

function esC8Tecnico(norm: string): boolean {
  return C8_TECNICO.test(norm);
}

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

function elegirPrimario(scores: Record<EyeCode, number>): EyeCode {
  let mejor: EyeCode = 1;
  let mejorHits = -1;
  for (const n of EYE_CODES) {
    if (scores[n] > mejorHits) {
      mejorHits = scores[n];
      mejor = n;
    }
  }
  return mejorHits <= 0 ? 1 : mejor;
}

function textoCompuesto(payload: DepotEntryPayload): string {
  return [
    payload.rawFact,
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

const STOP_CABLE = new Set([
  "este",
  "esta",
  "esto",
  "estos",
  "estas",
  "para",
  "como",
  "cuando",
  "donde",
  "porque",
  "desde",
  "hasta",
  "entre",
  "sobre",
  "tiene",
  "cada",
  "vez",
  "los",
  "las",
  "del",
  "una",
  "uno",
  "con",
  "por",
  "sin",
  "muy",
  "mas",
  "hoy",
  "ayer",
  "todo",
  "toda",
  "solo",
  "mismo",
  "misma",
  "aqui",
  "alla",
  "entonces",
  "despues",
]);

const CONCEPTO_ESTRUCTURAL =
  /patron|ley|sistema|origen|ciclo|modelo|matriz|axioma|vision|carga|multihilo|piston|secuencia/;

function extraerTituloSistemico(payload: DepotEntryPayload): string {
  const hipotesis = payload.studentHypothesis?.trim() ?? "";
  if (hipotesis) return hipotesis;

  const first = (payload.rawFact.split(/\n/)[0] ?? "").trim();
  if (first.length < 8 || first.length > 90) return "";
  if (/\d{1,2}:\d{2}/.test(first)) return "";
  if (
    /^(c\s*(?:[1-9]|10)\b|ley\b|patron\b|t[ií]tulo\b|el patron\b|la ley\b|el sistema\b|el origen\b|el modelo\b)/i.test(
      first,
    )
  ) {
    return first;
  }
  return "";
}

function tokensCable(norm: string): string[] {
  return norm
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOP_CABLE.has(t));
}

function hipotesisCableada(
  payload: DepotEntryPayload,
  syn: Record<EyeCode, number>,
  norm: string,
): boolean {
  const cuerpoSostiene =
    syn[3] > 0 ||
    syn[4] > 0 ||
    syn[8] > 0 ||
    syn[9] > 0 ||
    HECHO_FRIO.test(payload.rawFact);

  const titulo = extraerTituloSistemico(payload);
  if (!titulo) {
    return Boolean(cuerpoSostiene && (syn[7] > 0 || syn[8] > 0 || syn[10] > 0));
  }

  const normTitulo = normalizar(titulo);
  const ojoTitulo = hipotesisComoOjo(titulo);
  if (ojoTitulo && cuerpoSostiene) return true;
  if (ojoTitulo && !cuerpoSostiene && !HECHO_FRIO.test(payload.rawFact)) {
    return false;
  }

  const tituloTokens = tokensCable(normTitulo);
  const hits = tituloTokens.filter((t) => norm.includes(t)).length;
  if (
    tituloTokens.length > 0 &&
    hits / tituloTokens.length >= 0.4 &&
    cuerpoSostiene
  ) {
    return true;
  }
  if (
    CONCEPTO_ESTRUCTURAL.test(normTitulo) &&
    CONCEPTO_ESTRUCTURAL.test(norm) &&
    cuerpoSostiene
  ) {
    return true;
  }
  return false;
}

function primerFocoEn(
  scores: Record<EyeCode, number>,
  sliceNorm: string,
): EyeCode | null {
  if (scores[10] > 0) return 10;
  if (scores[9] > 0) return 9;
  // Polo/ciclo técnico en el cierre gana. El C8 narrativo (Facebook → volver)
  // no le roba el axioma C7 si el usuario acaba de forjar una ley.
  if (scores[8] > 0 && esC8Tecnico(sliceNorm)) return 8;
  if (scores[7] > 0) return 7;
  if (scores[5] > 0) return 5;
  if (scores[8] > 0) return 8;
  return null;
}

function elegirFocoRevelacion(
  synCuerpo: Record<EyeCode, number>,
  synCierre: Record<EyeCode, number>,
  characterSignedCode: EyeCode,
  hipotesis: EyeCode | null,
  cableada: boolean,
  normCuerpo: string,
): EyeCode {
  const cut = Math.floor(normCuerpo.length * 0.55);
  const normCierre = normCuerpo.slice(Math.max(0, cut));
  const focoCierre = primerFocoEn(synCierre, normCierre);
  if (focoCierre) return focoCierre;
  const focoCuerpo = primerFocoEn(synCuerpo, normCuerpo);
  if (focoCuerpo) return focoCuerpo;
  if (cableada && hipotesis && esCodigoFocoSintesis(hipotesis)) {
    return hipotesis;
  }
  return characterSignedCode;
}

function rutaGeometrica(characterSignedCode: EyeCode, foco: EyeCode): string {
  if (characterSignedCode === foco) {
    return CANON_TEN_EYES[foco].syntaxCharacteristics;
  }
  return `Transición de ${CANON_TEN_EYES[characterSignedCode].name} C${characterSignedCode} hacia la síntesis de ${CANON_TEN_EYES[foco].name} C${foco}.`;
}

function ajustePorFoco(foco: EyeCode, tier: DepotEntryPayload["userTier"]): string {
  return ajustePedagogico(foco, tier);
}

function scoreCierre(norm: string): Record<EyeCode, number> {
  const cut = Math.floor(norm.length * 0.55);
  return puntuar(norm.slice(Math.max(0, cut)), SINTAXIS);
}

/**
 * Fallback local: una sola vía — geometría de redacción.
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
        characterSignedCode: 1,
        focoRevelacionCode: 1,
        groundingStatus: {
          isFullyGrounded: false,
          diagnosticMessage:
            "El volcado aún es clima. C1 Cimiento no tiene territorio nombrado. Falta geometría.",
        },
        immediateAdjustment: ajustePorFoco(1, payload.userTier),
        syntaxDiagnostic: {
          detectedSyntaxCode: 1,
          focoCode: 1,
          isCableadoConnected: false,
          syntaxCharacteristics: CANON_TEN_EYES[1].syntaxCharacteristics,
        },
        syntacticVacios: vaciosDesdeActiveMap(buildActiveCharacterMap([1])),
      }),
    );
  }

  const syn = puntuar(norm, SINTAXIS);
  const normCuerpo = normalizar(payload.rawFact);
  const synCuerpo = puntuar(normCuerpo, SINTAXIS);
  const hipotesis = hipotesisComoOjo(payload.studentHypothesis);
  const titulo = extraerTituloSistemico(payload);

  if (titulo || payload.studentHypothesis) {
    syn[1] += 1;
  }
  if (hipotesis && hipotesis >= 7) {
    syn[7] += 1;
  }
  if (LATENCIA.test(norm)) {
    syn[8] += 1;
    synCuerpo[8] += 1;
  }
  if (tieneCicloNatural(normCuerpo)) {
    syn[8] += 2;
    synCuerpo[8] += 2;
  }

  // La firma primaria sale del cuerpo. El título/hipótesis enciende el mapa, no se come el pistón.
  let characterSignedCode = elegirPrimario(synCuerpo);
  if (LATENCIA.test(normCuerpo) && synCuerpo[8] >= synCuerpo[characterSignedCode]) {
    characterSignedCode = 8;
  }
  if (palabras >= 12 && characterSignedCode === 1 && synCuerpo[3] > 0) {
    characterSignedCode = 3;
  }

  const cableada = hipotesisCableada(payload, synCuerpo, normCuerpo);
  if (cableada) syn[10] += 1;

  const synCierre = scoreCierre(normCuerpo);
  const cutCierre = Math.floor(normCuerpo.length * 0.55);
  if (tieneCicloNatural(normCuerpo.slice(Math.max(0, cutCierre)))) {
    synCierre[8] += 2;
  }
  const focoRevelacionCode = elegirFocoRevelacion(
    synCuerpo,
    synCierre,
    characterSignedCode,
    hipotesis,
    cableada,
    normCuerpo,
  );

  // Transición pura C2→C7: los conectores firman Flujo; la ley es el foco.
  // No recategorizar la Firma como C7 solo porque el cierre forja el axioma.
  if (
    characterSignedCode === 7 &&
    synCuerpo[2] > 0 &&
    synCuerpo[3] <= 1 &&
    !/secuencia|piston/.test(normCuerpo)
  ) {
    characterSignedCode = 2;
  }

  const activos = EYE_CODES.filter(
    (n) => syn[n] > 0 || n === characterSignedCode || n === focoRevelacionCode,
  );
  const activeCharacterMap = buildActiveCharacterMap(activos);
  const syntacticVacios = EYE_CODES.filter((n) => !activeCharacterMap[n]);
  const activeCount = activos.length;
  const grounded = cableada && activeCount >= 3;

  const charName = CANON_TEN_EYES[characterSignedCode].name;
  const focoName = CANON_TEN_EYES[focoRevelacionCode].name;
  const diagnosticMessage = grounded
    ? `Firma estable en C${characterSignedCode} ${charName}. Foco de revelación: C${focoRevelacionCode} ${focoName}. Título, cuerpo y cierre están cableados. ${activeCount} códigos activos.`
    : cableada
      ? `Hay cordón título↔cuerpo, pero la geometría aún es estrecha (${activeCount} códigos). Firma: C${characterSignedCode} ${charName}. Foco: C${focoRevelacionCode} ${focoName}.`
      : `La escritura no cablea título/hipótesis con el cierre. Firma: C${characterSignedCode} ${charName}. Foco: C${focoRevelacionCode} ${focoName}. Vacíos: ${syntacticVacios.length}.`;

  return sellarLocal(
    scaffoldAnalysisResult({
      characterSignedCode,
      focoRevelacionCode,
      activeCharacterMap,
      syntacticVacios,
      syntaxDiagnostic: {
        detectedSyntaxCode: characterSignedCode,
        focoCode: focoRevelacionCode,
        isCableadoConnected: cableada,
        syntaxCharacteristics: rutaGeometrica(
          characterSignedCode,
          focoRevelacionCode,
        ),
      },
      groundingStatus: {
        isFullyGrounded: grounded,
        diagnosticMessage,
      },
      immediateAdjustment: ajustePorFoco(focoRevelacionCode, payload.userTier),
    }),
  );
}

function sellarLocal(result: DepotAnalysisResult): DepotAnalysisResult {
  const focoRevelacionCode =
    result.focoRevelacionCode ?? result.syntaxDiagnostic.focoCode ?? result.characterSignedCode;
  const activeCharacterMap = {
    ...buildActiveCharacterMap([]),
    ...result.activeCharacterMap,
    [result.characterSignedCode]: true,
    [focoRevelacionCode]: true,
  };
  if (result.syntaxDiagnostic.isCableadoConnected) {
    activeCharacterMap[10] = true;
  }
  return {
    ...result,
    focoRevelacionCode,
    activeCharacterMap,
    syntacticVacios:
      result.syntacticVacios ?? vaciosDesdeActiveMap(activeCharacterMap),
    syntaxDiagnostic: {
      ...result.syntaxDiagnostic,
      detectedSyntaxCode:
        result.syntaxDiagnostic.detectedSyntaxCode || result.characterSignedCode,
      focoCode: result.syntaxDiagnostic.focoCode ?? focoRevelacionCode,
      isCableadoConnected: Boolean(result.syntaxDiagnostic.isCableadoConnected),
    },
  };
}

function sellarGemini(result: DepotAnalysisResult): DepotAnalysisResult {
  const focoRevelacionCode =
    result.focoRevelacionCode ?? result.syntaxDiagnostic.focoCode ?? result.characterSignedCode;
  const activeCharacterMap = {
    ...buildActiveCharacterMap([]),
    ...result.activeCharacterMap,
    [result.characterSignedCode]: true,
    [focoRevelacionCode]: true,
  };
  if (result.syntaxDiagnostic.isCableadoConnected) {
    activeCharacterMap[10] = true;
  }
  return {
    ...result,
    focoRevelacionCode,
    activeCharacterMap,
    syntacticVacios:
      result.syntacticVacios ?? vaciosDesdeActiveMap(activeCharacterMap),
    syntaxDiagnostic: {
      ...result.syntaxDiagnostic,
      focoCode: result.syntaxDiagnostic.focoCode ?? focoRevelacionCode,
      isCableadoConnected: Boolean(result.syntaxDiagnostic.isCableadoConnected),
    },
  };
}

export async function procesarAuditoriaV3(
  payload: DepotEntryPayload,
  callGemini?: GeminiAuditCaller,
  leyesCasa: readonly PrincipioAprendizaje[] = [],
): Promise<ResultadoAuditoriaV3> {
  const serialized = serializarPromptAuditoria(payload, leyesCasa);

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
        `${serialized}\n\nIMPORTANTE: responde SOLO el JSON con characterSignedCode, focoRevelacionCode, activeCharacterMap, syntacticVacios, syntaxDiagnostic (incluye focoCode e isCableadoConnected), groundingStatus, immediateAdjustment. El FOCO es la INTENCIÓN real (C5/C7/C8), no la frecuencia de «entonces/después». El ajuste enseña el próximo volcado: «Para que tu percepción de C[n] se desarrolle, escribí [geometría]». Cero consejo de vida. Cero perceptionEye. Cero deltaGap.`,
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

/**
 * Motor de auditoría V3: Gemini + fallback local.
 * El dictamen es firma de carácter + vacíos + cableado.
 * No evalúa Óptica de verdad ni calcula Δ.
 */

import {
  CANON_TEN_EYES,
  buildActiveCharacterMap,
  vaciosDesdeActiveMap,
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
  5: [/\bcort[eé]\b/, /\bno\.\b/, /cero excusa/, /dispar[eé]/, /decid[ií]/],
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

function ajustePorVacio(
  vacios: readonly EyeCode[],
  characterSignedCode: EyeCode,
  grounded: boolean,
): string {
  if (grounded) {
    return `Mañana, repetí el mismo canal C${characterSignedCode} con un hecho medible. Cero inventario.`;
  }
  const hueco = vacios.find((n) => n !== characterSignedCode) ?? characterSignedCode;
  const ojo = CANON_TEN_EYES[hueco];
  return `Mañana, escribí el mismo hecho con marca C${hueco} ${ojo.name}: ${ojo.syntaxCharacteristics} Cero inventario.`;
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
        groundingStatus: {
          isFullyGrounded: false,
          diagnosticMessage:
            "El volcado aún es clima. C1 Cimiento no tiene territorio nombrado. Falta geometría.",
        },
        immediateAdjustment:
          "Volcá UN hecho físico: hora, lugar, verbo. Cero clima.",
        syntaxDiagnostic: {
          detectedSyntaxCode: 1,
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
  }

  let characterSignedCode = elegirPrimario(syn);
  if (LATENCIA.test(norm) && syn[8] >= syn[characterSignedCode]) {
    characterSignedCode = 8;
  }
  if (palabras >= 12 && characterSignedCode === 1 && syn[3] > 0) {
    characterSignedCode = 3;
  }

  const cableada = hipotesisCableada(payload, synCuerpo, normCuerpo);
  if (cableada) syn[10] += 1;

  const activos = EYE_CODES.filter(
    (n) => syn[n] > 0 || n === characterSignedCode,
  );
  const activeCharacterMap = buildActiveCharacterMap(activos);
  const syntacticVacios = EYE_CODES.filter((n) => !activeCharacterMap[n]);
  const activeCount = activos.length;
  const grounded = cableada && activeCount >= 3;

  const charName = CANON_TEN_EYES[characterSignedCode].name;
  const diagnosticMessage = grounded
    ? `Firma estable en C${characterSignedCode} ${charName}. Título, cuerpo y cierre están cableados. ${activeCount} códigos activos.`
    : cableada
      ? `Hay cordón título↔cuerpo, pero la geometría aún es estrecha (${activeCount} códigos). Firma primaria: C${characterSignedCode} ${charName}.`
      : `La escritura no cablea título/hipótesis con el cierre. Firma primaria: C${characterSignedCode} ${charName}. Vacíos: ${syntacticVacios.length}.`;

  return sellarLocal(
    scaffoldAnalysisResult({
      characterSignedCode,
      activeCharacterMap,
      syntacticVacios,
      syntaxDiagnostic: {
        detectedSyntaxCode: characterSignedCode,
        isCableadoConnected: cableada,
        syntaxCharacteristics:
          CANON_TEN_EYES[characterSignedCode].syntaxCharacteristics,
      },
      groundingStatus: {
        isFullyGrounded: grounded,
        diagnosticMessage,
      },
      immediateAdjustment: ajustePorVacio(
        syntacticVacios,
        characterSignedCode,
        grounded,
      ),
    }),
  );
}

function sellarLocal(result: DepotAnalysisResult): DepotAnalysisResult {
  const activeCharacterMap = {
    ...buildActiveCharacterMap([]),
    ...result.activeCharacterMap,
    [result.characterSignedCode]: true,
  };
  if (result.syntaxDiagnostic.isCableadoConnected) {
    activeCharacterMap[10] = true;
  }
  return {
    ...result,
    activeCharacterMap,
    syntacticVacios:
      result.syntacticVacios ?? vaciosDesdeActiveMap(activeCharacterMap),
    syntaxDiagnostic: {
      ...result.syntaxDiagnostic,
      detectedSyntaxCode:
        result.syntaxDiagnostic.detectedSyntaxCode || result.characterSignedCode,
      isCableadoConnected: Boolean(result.syntaxDiagnostic.isCableadoConnected),
    },
  };
}

function sellarGemini(result: DepotAnalysisResult): DepotAnalysisResult {
  const activeCharacterMap = {
    ...buildActiveCharacterMap([]),
    ...result.activeCharacterMap,
    [result.characterSignedCode]: true,
  };
  if (result.syntaxDiagnostic.isCableadoConnected) {
    activeCharacterMap[10] = true;
  }
  return {
    ...result,
    activeCharacterMap,
    syntacticVacios:
      result.syntacticVacios ?? vaciosDesdeActiveMap(activeCharacterMap),
    syntaxDiagnostic: {
      ...result.syntaxDiagnostic,
      isCableadoConnected: Boolean(result.syntaxDiagnostic.isCableadoConnected),
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
        `${serialized}\n\nIMPORTANTE: responde SOLO el JSON con characterSignedCode, activeCharacterMap, syntacticVacios, syntaxDiagnostic (incluye isCableadoConnected), groundingStatus, immediateAdjustment. Cero perceptionEye. Cero deltaGap.`,
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

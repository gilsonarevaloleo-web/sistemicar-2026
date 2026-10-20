/**
 * Extracción sintáctica fría — mapa de calor C1–C10.
 *
 * Presencia o ausencia de marcadores de estructura en el papel.
 * Cero evaluación de bueno/malo, eficaz/ineficaz o calidad de vida.
 * El Título es C1 (Vector Cero). C10 solo se enciende si C1 existe
 * y la última oración abrocha ese vector.
 */

import { CANON_TEN_EYES } from "./ojos.ts";
import { EYE_CODES, type DepotEntryPayload, type EyeCode } from "./types.ts";

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
  "titulo",
  "cierre",
]);

export interface GeometriaSintactica {
  title: string;
  close: string;
  titleConnectedToClose: boolean;
  active: Record<EyeCode, boolean>;
  scores: Record<EyeCode, number>;
  characterSignedCode: EyeCode;
}

export function normalizarGeometria(texto: string): string {
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

function hipotesisComoOjo(value?: string): EyeCode | null {
  if (!value) return null;
  const m = value.match(/C?\s*([1-9]|10)\b/i);
  if (!m) return null;
  return Number(m[1]) as EyeCode;
}

function tokensCable(norm: string): string[] {
  return norm
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOP_CABLE.has(t));
}

function splitFrases(texto: string): string[] {
  return texto
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"«])|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function extraerTitulo(payload: DepotEntryPayload): string {
  const hipotesis = payload.studentHypothesis?.trim() ?? "";
  if (hipotesis) return hipotesis;

  const lineas = payload.rawFact
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const first = lineas[0] ?? "";
  const marcado = first.match(
    /^(t[ií]tulo|tema|territorio|cimiento|punto de partida|ancla|vector)\s*[:.\-–—]\s*(.+)$/i,
  );
  if (marcado?.[2]) return marcado[2].trim();

  if (
    lineas.length >= 2 &&
    first.length >= 3 &&
    first.length <= 90 &&
    !/\d{1,2}:\d{2}/.test(first)
  ) {
    return first.replace(/[.]+$/, "").trim();
  }
  return "";
}

const ANCLAJE_CATEGORICO =
  /\b(el |este )?(territorio|cimiento|punto de partida|ancla|vector) (es|de)\b|\bdefino (hoy |aqui |aquí )?\b|\besto (va|trata) de\b/;

function cuerpoSinTitulo(payload: DepotEntryPayload, titulo: string): string {
  if (!titulo) return payload.rawFact;
  if ((payload.studentHypothesis ?? "").trim() === titulo) return payload.rawFact;
  const raw = payload.rawFact.trim();
  const first = raw.split(/\n/)[0]?.trim() ?? "";
  const firstLimpio = first.replace(/[.]+$/, "").trim();
  if (first === titulo || firstLimpio === titulo) {
    const idx = raw.indexOf("\n");
    return idx >= 0 ? raw.slice(idx + 1) : raw;
  }
  return payload.rawFact;
}

export function extraerCierre(payload: DepotEntryPayload, titulo: string): string {
  const cuerpo = cuerpoSinTitulo(payload, titulo).trim();
  const frases = splitFrases(cuerpo);
  return frases[frases.length - 1] ?? "";
}

export function titleConnectedToClose(
  titulo: string,
  cierre: string,
): boolean {
  const t = titulo.trim();
  const c = cierre.trim();
  if (!t || !c) return false;

  const normTitulo = normalizarGeometria(t);
  const normCierre = normalizarGeometria(c);
  if (normCierre.includes(normTitulo) && normTitulo.length >= 8) return true;

  const tituloTokens = tokensCable(normTitulo);
  if (tituloTokens.length === 0) {
    const ojo = hipotesisComoOjo(t);
    return Boolean(ojo && new RegExp(`\\bc\\s*${ojo}\\b`).test(normCierre));
  }
  const closeTokens = new Set(tokensCable(normCierre));
  const hits = tituloTokens.filter((tok) => closeTokens.has(tok)).length;
  const umbral = tituloTokens.length === 1 ? 1 : 0.34;
  if (hits / tituloTokens.length >= umbral) return true;

  const ojo = hipotesisComoOjo(t);
  if (ojo && new RegExp(`\\bc\\s*${ojo}\\b`).test(normCierre)) return true;
  return false;
}

const C2_FLUJO = [
  /\bentonces\b/,
  /\bdespues\b/,
  /\bluego\b/,
  /al dia siguiente/,
  /\bcuando\b/,
  /me llevo a/,
  /\bme fui\b/,
  /\bsali[oó]\b/,
  /\bentr[oó]\b/,
  /\bcausa\b/,
  /\befecto\b/,
  /a continuacion/,
  /a partir de ahi/,
  /hilo relacional/,
  /y entonces/,
  /me llevo/,
];

const C3_SECUENCIA = [
  /primero[\s\S]{0,120}(luego|despues|entonces|segundo)/,
  /\bpasos?\b/,
  /\bsecuencia\b/,
  /\bpist[oó]n\b/,
  /\bantecedente\b/,
  /\bconsecuente\b/,
  /\d+\.\s+\S[\s\S]{0,80}\d+\.\s+/,
  /\d{1,2}:\d{2}[\s\S]{0,80}\d{1,2}:\d{2}/,
];

const C4_INFLEXION = [
  /¿[^?]{6,}\?/,
  /\bpor que\b/,
  /\bque pasa si\b/,
  /el problema es\s*:/,
  /\baca me doy cuenta\b/,
  /\bme doy cuenta\b/,
  /\bme di cuenta\b/,
  /\bel muro\b/,
  /\bla norma\b/,
  /\bquiebre\b/,
  /\bparadigma\b/,
];

const C5_DECISION = [
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
  /traza una linea/,
  /hasta aqui/,
  /\bbasta\b/,
  /no mas\b/,
  /(corte|limite|decision)\s*:/,
];

const C6_FUENTE = [
  /\btaller\b/,
  /\bhogar\b/,
  /\bcasa\b/,
  /\blibro\b/,
  /\bvideo\b/,
  /\byoutube\b/,
  /\bme dijo\b/,
  /\ble dije\b/,
  /con ella/,
  /con el\b/,
  /\bcliente\b/,
  /\bmaestro\b/,
  /\bfuente\b/,
  /\bexperiencia\b/,
  /\bescritorio\b/,
  /herramient/,
  /aprendi (de|en)/,
  /saque (de|del)/,
  /vi en /,
  /escuch[eé]/,
  /"[^"]{4,}"/,
];

const C7_VISION = [
  /la ley es/,
  /el patron/,
  /se repite el modelo/,
  /el modelo se repite/,
  /en abstracto/,
  /hipotesis/,
  /axioma/,
  /el deber es/,
  /enemigo instalado/,
  /donde esta (tu |la )?atencion/,
  /atencion[\s\S]{0,48}energia/,
  /energia[\s\S]{0,48}atencion/,
  /asi funcion/,
  /la regla (es|que)/,
  /\bsolucion\b/,
  /\bencaje\b/,
  /mi idea/,
  /planteo/,
  /idea propia/,
  /como encaj/,
];

const C8_CICLO = [
  /48\s*h/,
  /24\s*h/,
  /me volvi[oó]/,
  /dos dias/,
  /\bloop\b/,
  /\bciclo\b/,
  /\bretorno\b/,
  /incuba/,
  /polaridad/,
  /\bpolos?\b/,
  /inversion/,
  /ansiedad/,
];

const C8_POLO_NATURAL =
  /facebook|instagram|whatsapp|tiktok|redes sociales|\baudio\b|descans|siesta|\bocio\b|me recost|a descansar/;
const C8_RETORNO_NATURAL =
  /volvi( o| a | con )|regres|de vuelta|otra vez (al |a )?(trabajo|produc|desglos)|energia (estaba|volvio|cargo|de vuelta)|refresc/;

const C8_TECNICO =
  /48\s*h|24\s*h|\bloop\b|ciclo|retorno|polaridad|\bpolos?\b|incuba|inversion|ansiedad/;

const FISIO =
  /\bcuerpo\b|\bfatiga\b|\bsueno\b|\bhambre\b|\bdolor\b|\brespir|\bmusculo\b|\benergia fisica\b/;
const TRABAJO =
  /\btrabajo\b|\bpist[oó]n\b|\bdesglosador\b|\bproducc|\boficina\b|\bsecuencia\b/;
const ENTORNO =
  /\bcasa\b|\bhogar\b|\bentorno\b|\bambiente\b|\bfacebook\b|\bredes\b|\bcalle\b|\bcocina\b|\bescritorio\b|\btaller\b/;
const C9_ENLACE =
  /al mismo tiempo|varios hilos|balance de carga|mientras [\s\S]+ tambien|multihilo|y tambien|ademas de/;

function tieneCicloNatural(norm: string): boolean {
  return C8_POLO_NATURAL.test(norm) && C8_RETORNO_NATURAL.test(norm);
}

function esC8Tecnico(norm: string): boolean {
  return C8_TECNICO.test(norm);
}

function dimensionesC9(norm: string): number {
  return [FISIO, TRABAJO, ENTORNO].filter((re) => re.test(norm)).length;
}

function emptyScores(): Record<EyeCode, number> {
  const scores = {} as Record<EyeCode, number>;
  for (const n of EYE_CODES) scores[n] = 0;
  return scores;
}

function emptyActive(): Record<EyeCode, boolean> {
  const map = {} as Record<EyeCode, boolean>;
  for (const n of EYE_CODES) map[n] = false;
  return map;
}

function elegirFirma(
  active: Record<EyeCode, boolean>,
  scores: Record<EyeCode, number>,
  norm: string,
): EyeCode {
  if (
    active[8] &&
    esC8Tecnico(norm) &&
    scores[8] >= Math.max(scores[2], scores[3], scores[5], scores[7])
  ) {
    return 8;
  }
  if (active[3]) {
    if (
      active[2] &&
      scores[3] <= 1 &&
      !/secuencia|pist[oó]n/.test(norm) &&
      active[7]
    ) {
      return 2;
    }
    return 3;
  }
  if (active[2] && active[7] && scores[2] > 0) return 2;
  if (active[5] && scores[5] >= scores[7] && scores[5] >= scores[8]) return 5;
  if (active[8]) return 8;
  if (active[2]) return 2;
  if (active[7]) return 7;
  if (active[4]) return 4;
  if (active[6]) return 6;
  if (active[9]) return 9;
  if (active[1]) return 1;
  return 1;
}

/**
 * Auditor frío de la materia escrita. No puntúa verdad ni moral.
 */
export function auditarGeometriaSintactica(
  payload: DepotEntryPayload,
): GeometriaSintactica {
  const titulo = extraerTitulo(payload);
  const cierre = extraerCierre(payload, titulo);
  const texto = [titulo, payload.rawFact].filter(Boolean).join("\n");
  const norm = normalizarGeometria(texto);
  const normCuerpo = normalizarGeometria(payload.rawFact);

  const scores = emptyScores();
  const active = emptyActive();

  const c1Hits =
    (titulo ? 1 : 0) + hitsDe(normCuerpo, [ANCLAJE_CATEGORICO]);
  scores[1] = c1Hits;
  active[1] = Boolean(titulo) || ANCLAJE_CATEGORICO.test(normCuerpo);

  scores[2] = hitsDe(normCuerpo, C2_FLUJO);
  active[2] = scores[2] > 0;

  scores[3] = hitsDe(normCuerpo, C3_SECUENCIA);
  active[3] = scores[3] > 0;

  scores[4] = hitsDe(normCuerpo, C4_INFLEXION);
  active[4] = scores[4] > 0;

  scores[5] = hitsDe(normCuerpo, C5_DECISION);
  active[5] = scores[5] > 0;

  scores[6] = hitsDe(normCuerpo, C6_FUENTE);
  active[6] = scores[6] > 0;

  scores[7] = hitsDe(normCuerpo, C7_VISION);
  if (hipotesisComoOjo(titulo) === 7) scores[7] += 1;
  active[7] = scores[7] > 0;

  scores[8] = hitsDe(normCuerpo, C8_CICLO);
  if (tieneCicloNatural(normCuerpo)) scores[8] += 2;
  active[8] = scores[8] > 0;

  const dims = dimensionesC9(normCuerpo);
  scores[9] = hitsDe(normCuerpo, [C9_ENLACE]) + (dims >= 3 ? 1 : 0);
  active[9] = dims >= 3 && C9_ENLACE.test(normCuerpo);

  const abrocha = active[1] && titleConnectedToClose(titulo, cierre);
  scores[10] = abrocha ? 1 : 0;
  active[10] = abrocha;

  const characterSignedCode = elegirFirma(active, scores, normCuerpo);
  if (!EYE_CODES.some((n) => active[n])) {
    active[1] = false;
  }

  return {
    title: titulo,
    close: cierre,
    titleConnectedToClose: abrocha,
    active,
    scores,
    characterSignedCode,
  };
}

export function rutaGeometrica(characterSignedCode: EyeCode, foco: EyeCode): string {
  if (characterSignedCode === foco) {
    return CANON_TEN_EYES[foco].syntaxCharacteristics;
  }
  return `Transición de ${CANON_TEN_EYES[characterSignedCode].name} C${characterSignedCode} hacia el escalón C${foco} ${CANON_TEN_EYES[foco].name}.`;
}

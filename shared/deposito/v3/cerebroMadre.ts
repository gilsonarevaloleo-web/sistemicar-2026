/**
 * Cerebro Madre — recinto de casa de Depósito V3.
 *
 * Candidato → filtro → ley. No publica sola.
 * createdAt nace con el principio y no se toca: ni al reforzar, ni al filtrar, ni al promover.
 * La sabiduría privada del alumno (V2 axiomas / Criterio Vivo) no entra aquí.
 * El enunciado es pedagogía de escritura, no el diario del volcado.
 */

import { PUENTES_ESCRITURA } from "./pedagogia.ts";
import { isEyeCode } from "./ojos.ts";
import type {
  DepotAnalysisResult,
  DepotEntryPayload,
  EyeCode,
} from "./types.ts";

export const CEREBRO_MADRE_NOMBRE = "Cerebro Madre";
export const CEREBRO_MADRE_MARCA = "Recinto de casa";
export const CEREBRO_MADRE_FIRMA =
  "No publica sola. La ley de casa se sella a mano. La fecha de creación no se toca.";
export const CEREBRO_MADRE_NO_ES = [
  "No es el diario del alumno.",
  "No mezcla axiomas privados (V2) con ley de casa.",
  "No asciende un candidato a ley sin filtro.",
] as const;

export type EstadoPrincipio = "candidato" | "filtro" | "ley" | "rechazado";

export const ESTADOS_PRINCIPIO: readonly EstadoPrincipio[] = [
  "candidato",
  "filtro",
  "ley",
  "rechazado",
];

export interface PrincipioAprendizaje {
  id: string;
  /** Epoch ms. Intocable después del nacimiento. */
  createdAt: number;
  evaluatedAt?: number;
  promotedAt?: number;
  rejectedAt?: number;
  estado: EstadoPrincipio;
  foco: EyeCode;
  firma: EyeCode;
  percepcion: string;
  escritura: string;
  enunciado: string;
  anclas: string[];
  usos: number;
}

export interface CerebroMadre {
  principios: PrincipioAprendizaje[];
}

export type EvolucionPrincipio = "nuevo" | "reforzado" | "sin-cambio";

export interface AbsorbPrincipioResult {
  cerebro: CerebroMadre;
  evolucion: EvolucionPrincipio;
  principio?: PrincipioAprendizaje;
}

export interface ExtraerPrincipioInput {
  payload: DepotEntryPayload;
  result: DepotAnalysisResult;
  now?: number;
  id?: string;
}

const MIN_PALABRAS = 18;
const UMBRAL_CLIMA_CORTO = 40;
const MAX_ENUNCIADO = 280;
const MAX_ANCLAS = 6;
const UMBRAL_DEDUPE = 0.72;
const MAX_CANDIDATOS = 40;
const MAX_LEYES = 12;

const CLIMA_RE =
  /me sent[ií]|estoy (mal|cansad|triste|enojad|feliz|ansios)|fue feo|horrible|ansiedad/i;

const STOP = new Set([
  "este",
  "esta",
  "esto",
  "para",
  "porque",
  "como",
  "cuando",
  "donde",
  "tiene",
  "tengo",
  "hace",
  "desde",
  "entre",
  "sobre",
  "hasta",
  "pero",
  "solo",
  "tambien",
  "muy",
  "mas",
  "todo",
  "toda",
  "cada",
  "otro",
  "hoy",
  "ayer",
  "luego",
  "despues",
  "antes",
  "nada",
  "aqui",
  "fue",
  "era",
  "son",
  "ser",
  "hay",
  "sin",
  "con",
  "del",
  "los",
  "las",
  "una",
  "uno",
  "que",
  "por",
]);

export function cerebroVacio(): CerebroMadre {
  return { principios: [] };
}

export function contarPalabrasVolcado(texto: string): number {
  const t = texto.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function enunciadoPrincipio(foco: EyeCode, firma: EyeCode): string {
  const puente = PUENTES_ESCRITURA[foco];
  const nucleo = `Para que tu percepción de C${foco} (${puente.percepcion}) se desarrolle, ${puente.escritura}.`;
  if (firma === foco) return clampFrase(nucleo, MAX_ENUNCIADO);
  return clampFrase(
    `${nucleo} Geometría observada: firma C${firma} → foco C${foco}.`,
    MAX_ENUNCIADO,
  );
}

const MESES_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

export function formatFechaPrincipio(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MESES_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function clampFrase(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  const ultimo = corte.lastIndexOf(" ");
  return (ultimo > 40 ? corte.slice(0, ultimo) : corte).trim();
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensDe(texto: string): Set<string> {
  const out = new Set<string>();
  for (const t of normalizar(texto).split(" ")) {
    if (t.length >= 4 && !STOP.has(t)) out.add(t);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function esClimaCorto(texto: string): boolean {
  const palabras = contarPalabrasVolcado(texto);
  if (palabras < MIN_PALABRAS) return true;
  if (palabras < UMBRAL_CLIMA_CORTO && CLIMA_RE.test(texto)) return true;
  return false;
}

/**
 * Un volcado de clima corto no enseña a la casa.
 * El candidato nace de geometría de escritura, no del ánimo.
 */
export function extraerPrincipioAprendizaje(
  input: ExtraerPrincipioInput,
): PrincipioAprendizaje | null {
  const crudo = input.payload.rawFact ?? "";
  if (esClimaCorto(crudo)) return null;

  const grounded = Boolean(input.result.groundingStatus?.isFullyGrounded);
  const foco = (input.result.focoRevelacionCode ??
    input.result.syntaxDiagnostic?.focoCode ??
    input.result.characterSignedCode) as EyeCode;
  const firma = input.result.characterSignedCode;
  if (!isEyeCode(foco) || !isEyeCode(firma)) return null;

  if (
    !grounded &&
    firma === 1 &&
    foco === 1 &&
    contarPalabrasVolcado(crudo) < UMBRAL_CLIMA_CORTO
  ) {
    return null;
  }

  const puente = PUENTES_ESCRITURA[foco];
  const now = input.now ?? Date.now();
  return {
    id: input.id ?? `cm_${now}_C${foco}_C${firma}`,
    createdAt: now,
    estado: "candidato",
    foco,
    firma,
    percepcion: puente.percepcion,
    escritura: puente.escritura,
    enunciado: enunciadoPrincipio(foco, firma),
    anclas: extraerAnclasGeometricas(crudo),
    usos: 1,
  };
}

function extraerAnclasGeometricas(texto: string): string[] {
  const geometricas =
    /patron|patrn|ley|piston|secuencia|corte|inflexion|paradigma|ciclo|carga|titulo|cierre|firma|foco|axioma|modelo/i;
  const toks = [...tokensDe(texto)].filter((t) => geometricas.test(t));
  return toks.slice(0, MAX_ANCLAS);
}

function esDuplicado(a: PrincipioAprendizaje, b: PrincipioAprendizaje): boolean {
  if (a.foco !== b.foco) return false;
  if (a.firma === b.firma && a.enunciado === b.enunciado) return true;
  return jaccard(tokensDe(a.enunciado), tokensDe(b.enunciado)) >= UMBRAL_DEDUPE;
}

function preservarCreatedAt(
  existente: PrincipioAprendizaje,
  incoming: PrincipioAprendizaje,
): PrincipioAprendizaje {
  const anclas = [...existente.anclas];
  for (const a of incoming.anclas) {
    if (!anclas.includes(a) && anclas.length < MAX_ANCLAS) anclas.push(a);
  }
  return {
    ...existente,
    createdAt: existente.createdAt,
    evaluatedAt: existente.evaluatedAt,
    promotedAt: existente.promotedAt,
    rejectedAt: existente.rejectedAt,
    estado: existente.estado,
    enunciado: existente.enunciado,
    percepcion: existente.percepcion,
    escritura: existente.escritura,
    usos: existente.usos + 1,
    anclas,
  };
}

/**
 * Incorpora un candidato. Si ya existe (foco + enunciado), suma usos
 * y deja createdAt exactamente como nació.
 * Nunca asciende de bandeja. Nunca reescribe una ley.
 */
export function absorbPrincipio(
  cerebro: CerebroMadre,
  candidato: PrincipioAprendizaje | null,
): AbsorbPrincipioResult {
  const principios = [...(cerebro.principios ?? [])];
  if (!candidato) return { cerebro: { principios }, evolucion: "sin-cambio" };

  const gemelo = principios.find((p) => esDuplicado(p, candidato));
  if (gemelo) {
    const siguiente = principios.map((p) =>
      p.id === gemelo.id ? preservarCreatedAt(p, candidato) : p,
    );
    const actualizado = siguiente.find((p) => p.id === gemelo.id);
    return {
      cerebro: { principios: siguiente },
      evolucion: "reforzado",
      principio: actualizado,
    };
  }

  const nuevo: PrincipioAprendizaje = {
    ...candidato,
    estado: "candidato",
    usos: Math.max(1, candidato.usos || 1),
    evaluatedAt: undefined,
    promotedAt: undefined,
    rejectedAt: undefined,
  };
  let siguiente = [nuevo, ...principios];
  const candidatos = siguiente.filter((p) => p.estado === "candidato");
  if (candidatos.length > MAX_CANDIDATOS) {
    const masViejo = [...candidatos].sort((a, b) => a.createdAt - b.createdAt)[0];
    siguiente = siguiente.filter((p) => p.id !== masViejo.id);
  }
  return {
    cerebro: { principios: siguiente },
    evolucion: "nuevo",
    principio: nuevo,
  };
}

export function absorbPrincipioDesdeVolcado(
  cerebro: CerebroMadre,
  input: ExtraerPrincipioInput,
): AbsorbPrincipioResult {
  return absorbPrincipio(cerebro, extraerPrincipioAprendizaje(input));
}

function mapPrincipio(
  cerebro: CerebroMadre,
  id: string,
  fn: (p: PrincipioAprendizaje) => PrincipioAprendizaje,
): CerebroMadre {
  return {
    principios: cerebro.principios.map((p) => (p.id === id ? fn(p) : p)),
  };
}

/** Candidato → filtro. createdAt no se toca. */
export function enviarAFiltro(
  cerebro: CerebroMadre,
  id: string,
  now = Date.now(),
): CerebroMadre {
  return mapPrincipio(cerebro, id, (p) => {
    if (p.estado !== "candidato") return p;
    return {
      ...p,
      createdAt: p.createdAt,
      estado: "filtro",
      evaluatedAt: p.evaluatedAt ?? now,
    };
  });
}

/** Filtro → ley. createdAt no se toca. Prohibido saltar bandeja. */
export function promoverALey(
  cerebro: CerebroMadre,
  id: string,
  now = Date.now(),
): CerebroMadre {
  const leyes = cerebro.principios.filter((p) => p.estado === "ley").length;
  return mapPrincipio(cerebro, id, (p) => {
    if (p.estado !== "filtro") return p;
    if (leyes >= MAX_LEYES) return p;
    return {
      ...p,
      createdAt: p.createdAt,
      estado: "ley",
      evaluatedAt: p.evaluatedAt ?? now,
      promotedAt: p.promotedAt ?? now,
    };
  });
}

/** Candidato o filtro → rechazado. Una ley no se despublica desde aquí. */
export function rechazarPrincipio(
  cerebro: CerebroMadre,
  id: string,
  now = Date.now(),
): CerebroMadre {
  return mapPrincipio(cerebro, id, (p) => {
    if (p.estado === "ley") return p;
    return {
      ...p,
      createdAt: p.createdAt,
      estado: "rechazado",
      rejectedAt: p.rejectedAt ?? now,
    };
  });
}

export function principiosPorEstado(
  cerebro: CerebroMadre,
  estado: EstadoPrincipio,
): PrincipioAprendizaje[] {
  return cerebro.principios
    .filter((p) => p.estado === estado)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function leyesDeCasa(cerebro: CerebroMadre): PrincipioAprendizaje[] {
  return principiosPorEstado(cerebro, "ley");
}

export function resumenCerebroMadre(cerebro: CerebroMadre): string {
  const nC = principiosPorEstado(cerebro, "candidato").length;
  const nF = principiosPorEstado(cerebro, "filtro").length;
  const nL = principiosPorEstado(cerebro, "ley").length;
  if (nC + nF + nL === 0) return CEREBRO_MADRE_FIRMA;
  return `${nC} candidato${nC === 1 ? "" : "s"} · ${nF} en filtro · ${nL} ley${nL === 1 ? "" : "es"} de casa`;
}

/**
 * Solo leyes selladas. Candidatos y filtro no viajan al motor.
 */
export function bloqueLeyesCasaPrompt(
  leyes: readonly PrincipioAprendizaje[] = [],
): string {
  const selladas = leyes.filter((p) => p.estado === "ley");
  if (selladas.length === 0) return "";
  const lineas = [
    "═══ LEYES DE CASA (CEREBRO MADRE) ═══",
    "Solo leyes selladas a mano. Prohibido citar un candidato o un ítem de filtro.",
    "La sabiduría privada del alumno no está aquí.",
  ];
  for (const p of selladas.slice(0, MAX_LEYES)) {
    lineas.push(
      `- C${p.foco} ${p.percepcion} · creado ${formatFechaPrincipio(p.createdAt)}: ${p.enunciado}`,
    );
  }
  return lineas.join("\n");
}

export function isEstadoPrincipio(value: unknown): value is EstadoPrincipio {
  return (
    value === "candidato" ||
    value === "filtro" ||
    value === "ley" ||
    value === "rechazado"
  );
}

export function isPrincipioAprendizaje(
  value: unknown,
): value is PrincipioAprendizaje {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    Number.isFinite(Number(v.createdAt)) &&
    isEstadoPrincipio(v.estado) &&
    isEyeCode(v.foco) &&
    isEyeCode(v.firma ?? v.foco) &&
    typeof v.enunciado === "string" &&
    v.enunciado.trim().length >= 12
  );
}

export function normalizarPrincipio(
  raw: unknown,
): PrincipioAprendizaje | null {
  if (!isPrincipioAprendizaje(raw)) return null;
  const v = raw as Record<string, unknown>;
  const foco = v.foco as EyeCode;
  const firma = (isEyeCode(v.firma) ? v.firma : foco) as EyeCode;
  const puente = PUENTES_ESCRITURA[foco];
  const createdAt = Number(v.createdAt);
  const principio: PrincipioAprendizaje = {
    id: String(v.id),
    createdAt,
    estado: v.estado as EstadoPrincipio,
    foco,
    firma,
    percepcion:
      typeof v.percepcion === "string" && v.percepcion.trim()
        ? v.percepcion
        : puente.percepcion,
    escritura:
      typeof v.escritura === "string" && v.escritura.trim()
        ? v.escritura
        : puente.escritura,
    enunciado: clampFrase(String(v.enunciado), MAX_ENUNCIADO),
    anclas: Array.isArray(v.anclas)
      ? v.anclas.filter((a): a is string => typeof a === "string").slice(0, MAX_ANCLAS)
      : [],
    usos: Math.max(1, Number(v.usos) || 1),
  };
  if (Number.isFinite(Number(v.evaluatedAt))) {
    principio.evaluatedAt = Number(v.evaluatedAt);
  }
  if (Number.isFinite(Number(v.promotedAt))) {
    principio.promotedAt = Number(v.promotedAt);
  }
  if (Number.isFinite(Number(v.rejectedAt))) {
    principio.rejectedAt = Number(v.rejectedAt);
  }
  return principio;
}

export function normalizarCerebroMadre(raw: unknown): CerebroMadre {
  if (!raw) return cerebroVacio();
  const lista = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as CerebroMadre).principios)
      ? (raw as CerebroMadre).principios
      : [];
  const principios: PrincipioAprendizaje[] = [];
  for (const item of lista) {
    const p = normalizarPrincipio(item);
    if (p) principios.push(p);
  }
  return { principios };
}

export function normalizarLeyesCasa(
  raw: unknown,
): PrincipioAprendizaje[] {
  return leyesDeCasa(normalizarCerebroMadre(raw));
}

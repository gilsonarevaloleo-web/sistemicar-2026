/**
 * Cerebro Madre — recinto de casa de Depósito V3.
 *
 * Candidato → filtro → ley. No publica sola.
 * createdAt nace con el principio y no se toca.
 * El enunciado es el alma del código (puente). El acomodo es lo que ESTE
 * volcado enseñó sobre cómo escribir ese ojo — geometría, no diario.
 * El próximo volcado se mide: ¿construyó el C pedido?
 */

import { CANON_TEN_EYES, isEyeCode } from "./ojos.ts";
import { PUENTES_ESCRITURA } from "./pedagogia.ts";
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
  "El acomodo es geometría de escritura, no el episodio.",
] as const;

export type EstadoPrincipio = "candidato" | "filtro" | "ley" | "rechazado";

export const ESTADOS_PRINCIPIO: readonly EstadoPrincipio[] = [
  "candidato",
  "filtro",
  "ley",
  "rechazado",
];

export interface PedidoPercepcion {
  codigo: EyeCode;
  principioId: string;
  at: number;
}

export interface MedidaProximo {
  codigo: EyeCode;
  construyo: boolean;
  at: number;
}

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
  /** Alma del código: puente percepción → geometría. No cambia con el tema. */
  enunciado: string;
  /** Acomodo de ESTE volcado. Sigue el tema. No copia el diario. */
  acomodo: string;
  anclas: string[];
  usos: number;
  /** Veces que el siguiente volcado fue medido contra este pedido. */
  pedidos: number;
  /** Veces que ese siguiente volcado construyó el C pedido. */
  confirmados: number;
  ultimaMedida?: MedidaProximo;
}

export interface CerebroMadre {
  principios: PrincipioAprendizaje[];
  pedidoPendiente?: PedidoPercepcion;
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
const MAX_ACOMODO = 360;
const MAX_ANCLAS = 6;
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

/** Alma del código. El acomodo va aparte. */
export function enunciadoPrincipio(foco: EyeCode, _firma?: EyeCode): string {
  const puente = PUENTES_ESCRITURA[foco];
  return clampFrase(
    `Para que tu percepción de C${foco} (${puente.percepcion}) se desarrolle, ${puente.escritura}.`,
    MAX_ENUNCIADO,
  );
}

interface FormasEscritura {
  preguntaInflexion: boolean;
  frasePatron: boolean;
  cadena: boolean;
  corte: boolean;
  loop: boolean;
  escena: boolean;
  tituloPresente: boolean;
}

function detectarFormas(
  payload: DepotEntryPayload,
): FormasEscritura {
  const t = `${payload.rawFact ?? ""} ${payload.studentHypothesis ?? ""}`;
  return {
    preguntaInflexion: /¿[^?]{6,}\?/.test(t) || /por qu[eé] (el muro|la norma|la regla)/i.test(t),
    frasePatron:
      /el patr[oó]n|la ley es|el modelo se repite|c[oó]mo funciona/i.test(t),
    cadena:
      /entonces|despu[eé]s|luego |primero[\s\S]{0,40}segundo|pist[oó]n|secuencia|a partir de/i.test(
        t,
      ),
    corte:
      /\bno\.\b|cero excusa|decid[ií]|cort[eé]|puse pausa|dije (que )?no/i.test(t),
    loop: /volv[ií]|48\s*h|al d[ií]a siguiente|ciclo|ida y vuelta/i.test(t),
    escena: /"[^"]{4,}"|me dijo|herramient|taller|escritorio/i.test(t),
    tituloPresente: Boolean((payload.studentHypothesis ?? "").trim()),
  };
}

/**
 * Acomodo de este volcado: cómo se acomodó el alma del código en la geometría.
 * Prohibido copiar el diario, la hora o la pelea.
 */
export function destilarAcomodo(
  foco: EyeCode,
  firma: EyeCode,
  result: DepotAnalysisResult,
  payload: DepotEntryPayload,
): string {
  const puente = PUENTES_ESCRITURA[foco];
  const formas = detectarFormas(payload);
  const cableado = Boolean(result.syntaxDiagnostic?.isCableadoConnected);
  const vacios = result.syntacticVacios ?? [];
  const piezas: string[] = [];

  if (firma !== foco) {
    piezas.push(
      `Acomodo: el relato narra en C${firma} (${CANON_TEN_EYES[firma].name}) y la revelación se forja en C${foco} (${CANON_TEN_EYES[foco].name}).`,
    );
  } else {
    piezas.push(
      `Acomodo: firma y foco coinciden en C${foco} (${CANON_TEN_EYES[foco].name}). El tema ya está en el mismo canal.`,
    );
  }

  if (formas.preguntaInflexion) {
    piezas.push("Este tema se acomodó con pregunta de inflexión.");
  } else if (vacios.includes(4) && foco !== 4) {
    piezas.push("C4 sigue vacío: sin inflexión el tema no gana seriedad.");
  }

  if (formas.frasePatron) {
    piezas.push("El patrón quedó como frase, no como episodio.");
  }
  if (formas.cadena && (firma === 3 || foco === 3 || firma === 2)) {
    piezas.push("Hay cadena de pasos; el acomodo no es clima.");
  }
  if (formas.corte && (foco === 5 || firma === 5)) {
    piezas.push("El corte está escrito, no insinuado.");
  }
  if (formas.loop && (foco === 8 || firma === 8)) {
    piezas.push("El ir y el volver están en el texto.");
  }
  if (formas.escena && (foco === 6 || firma === 6)) {
    piezas.push("La escena física sostiene C6.");
  }

  if (cableado) {
    piezas.push("Título y cierre van por el mismo cordón (C10).");
  } else if (formas.tituloPresente) {
    piezas.push("Hay título, pero el cierre no lo cablea: C10 queda abierto.");
  }

  piezas.push(`Próximo volcado: construir C${foco} — ${puente.escritura}.`);
  return clampFrase(piezas.join(" "), MAX_ACOMODO);
}

export function volcadoConstruyeCodigo(
  result: DepotAnalysisResult,
  codigo: EyeCode,
): boolean {
  if (result.activeCodes?.includes(codigo)) return true;
  if (result.activeCharacterMap?.[codigo]) return true;
  if (result.characterSignedCode === codigo) return true;
  if (codigo === 10 && (result.titleConnectedToClose || result.syntaxDiagnostic?.isCableadoConnected)) {
    return true;
  }
  return false;
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
  const acomodo = destilarAcomodo(foco, firma, input.result, input.payload);
  return {
    id: input.id ?? `cm_${now}_C${foco}_C${firma}`,
    createdAt: now,
    estado: "candidato",
    foco,
    firma,
    percepcion: puente.percepcion,
    escritura: puente.escritura,
    enunciado: enunciadoPrincipio(foco),
    acomodo,
    anclas: extraerAnclasGeometricas(crudo),
    usos: 1,
    pedidos: 0,
    confirmados: 0,
  };
}

function extraerAnclasGeometricas(texto: string): string[] {
  const geometricas =
    /patron|patrn|ley|piston|secuencia|corte|inflexion|paradigma|ciclo|carga|titulo|cierre|firma|foco|axioma|modelo/i;
  const toks = [...tokensDe(texto)].filter((t) => geometricas.test(t));
  return toks.slice(0, MAX_ANCLAS);
}

function esDuplicado(a: PrincipioAprendizaje, b: PrincipioAprendizaje): boolean {
  return a.foco === b.foco && a.firma === b.firma;
}

function preservarCreatedAt(
  existente: PrincipioAprendizaje,
  incoming: PrincipioAprendizaje,
): PrincipioAprendizaje {
  const anclas = [...existente.anclas];
  for (const a of incoming.anclas) {
    if (!anclas.includes(a) && anclas.length < MAX_ANCLAS) anclas.push(a);
  }
  const acomodo =
    existente.estado === "ley"
      ? existente.acomodo
      : incoming.acomodo.length > existente.acomodo.length
        ? incoming.acomodo
        : existente.acomodo;
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
    acomodo,
    usos: existente.usos + 1,
    anclas,
  };
}

/**
 * Incorpora un candidato. Si ya existe (foco + firma), suma usos
 * y deja createdAt y el alma (enunciado) exactamente como nacieron.
 * El acomodo puede enriquecerse. Nunca asciende de bandeja.
 */
export function absorbPrincipio(
  cerebro: CerebroMadre,
  candidato: PrincipioAprendizaje | null,
): AbsorbPrincipioResult {
  const principios = [...(cerebro.principios ?? [])];
  const pedidoPendiente = cerebro.pedidoPendiente;
  if (!candidato) {
    return { cerebro: { principios, pedidoPendiente }, evolucion: "sin-cambio" };
  }

  const gemelo = principios.find((p) => esDuplicado(p, candidato));
  if (gemelo) {
    const siguiente = principios.map((p) =>
      p.id === gemelo.id ? preservarCreatedAt(p, candidato) : p,
    );
    const actualizado = siguiente.find((p) => p.id === gemelo.id);
    return {
      cerebro: { principios: siguiente, pedidoPendiente },
      evolucion: "reforzado",
      principio: actualizado,
    };
  }

  const nuevo: PrincipioAprendizaje = {
    ...candidato,
    estado: "candidato",
    usos: Math.max(1, candidato.usos || 1),
    pedidos: candidato.pedidos ?? 0,
    confirmados: candidato.confirmados ?? 0,
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
    cerebro: { principios: siguiente, pedidoPendiente },
    evolucion: "nuevo",
    principio: nuevo,
  };
}

export function medirPedidoPendiente(
  cerebro: CerebroMadre,
  result: DepotAnalysisResult,
  now = Date.now(),
): CerebroMadre {
  const pedido = cerebro.pedidoPendiente;
  if (!pedido) return cerebro;
  const construyo = volcadoConstruyeCodigo(result, pedido.codigo);
  return {
    principios: cerebro.principios.map((p) => {
      if (p.id !== pedido.principioId) return p;
      return {
        ...p,
        createdAt: p.createdAt,
        pedidos: (p.pedidos ?? 0) + 1,
        confirmados: (p.confirmados ?? 0) + (construyo ? 1 : 0),
        ultimaMedida: { codigo: pedido.codigo, construyo, at: now },
      };
    }),
  };
}

export function absorbPrincipioDesdeVolcado(
  cerebro: CerebroMadre,
  input: ExtraerPrincipioInput,
): AbsorbPrincipioResult {
  const now = input.now ?? Date.now();
  const medido = medirPedidoPendiente(cerebro, input.result, now);
  const absorbido = absorbPrincipio(medido, extraerPrincipioAprendizaje(input));
  if (!absorbido.principio) return absorbido;
  return {
    ...absorbido,
    cerebro: {
      principios: absorbido.cerebro.principios,
      pedidoPendiente: {
        codigo: absorbido.principio.foco,
        principioId: absorbido.principio.id,
        at: now,
      },
    },
  };
}

function mapPrincipio(
  cerebro: CerebroMadre,
  id: string,
  fn: (p: PrincipioAprendizaje) => PrincipioAprendizaje,
): CerebroMadre {
  return {
    principios: cerebro.principios.map((p) => (p.id === id ? fn(p) : p)),
    pedidoPendiente: cerebro.pedidoPendiente,
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
  const pedidos = cerebro.principios.reduce((s, p) => s + (p.pedidos ?? 0), 0);
  const ok = cerebro.principios.reduce((s, p) => s + (p.confirmados ?? 0), 0);
  const bandejas = `${nC} candidato${nC === 1 ? "" : "s"} · ${nF} en filtro · ${nL} ley${nL === 1 ? "" : "es"} de casa`;
  if (pedidos === 0) return bandejas;
  return `${bandejas} · próximo ${ok}/${pedidos}`;
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
    "La sabiduría privada del alumno no está aquí. El acomodo es geometría, no diario.",
  ];
  for (const p of selladas.slice(0, MAX_LEYES)) {
    const medida =
      (p.pedidos ?? 0) > 0
        ? ` Próximo: ${p.confirmados ?? 0}/${p.pedidos} construyeron C${p.foco}.`
        : "";
    const acomodo = p.acomodo ? ` Acomodo: ${p.acomodo}` : "";
    lineas.push(
      `- C${p.foco} ${p.percepcion} · creado ${formatFechaPrincipio(p.createdAt)}: ${p.enunciado}.${acomodo}${medida}`,
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
    acomodo:
      typeof v.acomodo === "string"
        ? clampFrase(v.acomodo, MAX_ACOMODO)
        : "",
    anclas: Array.isArray(v.anclas)
      ? v.anclas.filter((a): a is string => typeof a === "string").slice(0, MAX_ANCLAS)
      : [],
    usos: Math.max(1, Number(v.usos) || 1),
    pedidos: Math.max(0, Number(v.pedidos) || 0),
    confirmados: Math.max(0, Number(v.confirmados) || 0),
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
  if (v.ultimaMedida && typeof v.ultimaMedida === "object") {
    const m = v.ultimaMedida as Record<string, unknown>;
    if (isEyeCode(m.codigo)) {
      principio.ultimaMedida = {
        codigo: m.codigo as EyeCode,
        construyo: Boolean(m.construyo),
        at: Number(m.at) || createdAt,
      };
    }
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
  const cerebro: CerebroMadre = { principios };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const pend = (raw as CerebroMadre).pedidoPendiente;
    if (
      pend &&
      isEyeCode(pend.codigo) &&
      typeof pend.principioId === "string" &&
      pend.principioId
    ) {
      cerebro.pedidoPendiente = {
        codigo: pend.codigo,
        principioId: pend.principioId,
        at: Number(pend.at) || 0,
      };
    }
  }
  return cerebro;
}

export function normalizarLeyesCasa(
  raw: unknown,
): PrincipioAprendizaje[] {
  return leyesDeCasa(normalizarCerebroMadre(raw));
}

/**
 * CRITERIO VIVO DEL MAESTRO — memoria del Depósito.
 *
 * El código no nace con criterio. La ley (Óptica-Código) es el suelo
 * y no aprende. El criterio se gana cuando el operador sella sabiduría.
 *
 * No es un modelo que “se entrena”. Es un acervo determinista:
 * el alumno nombra lo que vio; el Maestro lo cita la próxima vez.
 */

import { LEY_OPTICA_CODIGO_OJOS } from "./leyOpticaCodigo.ts";
import type { CodigoObservador } from "./engineConfig.ts";

export const LEY_CRITERIO_VIVO_NOMBRE = "Ley del Criterio Vivo";
export const LEY_CRITERIO_VIVO_MARCA = "Criterio-Maestro";
export const LEY_CRITERIO_VIVO_FIRMA =
  "El código no nace con criterio. El criterio se gana cuando la sabiduría del operador queda sellada.";
export const LEY_CRITERIO_VIVO_UNIDAD = "criterio";
export const LEY_CRITERIO_VIVO_RITUAL = "Esto es lo que vi";

export const LEY_CRITERIO_VIVO_AXIOMAS = [
  {
    id: "ley-no-aprende",
    titulo: "La ley no aprende",
    texto:
      "Óptica-Código es el suelo. No se diluye, no se vota, no se reentrena. El Maestro usa el ojo; no inventa un undécimo.",
  },
  {
    id: "criterio-si",
    titulo: "El criterio sí aprende",
    texto:
      "Aprende solo de sabiduría sellada. El ruido, la flor y el dictamen del modelo no escriben criterio.",
  },
  {
    id: "sello",
    titulo: "Sellar es el ritual",
    texto:
      "El operador dice «esto es lo que vi» o corrige el ojo. Sin sello no hay memoria. Sin memoria el código solo recita la ley.",
  },
  {
    id: "cita",
    titulo: "El Maestro cita, no inventa",
    texto:
      "Si un criterio resuena, lo nombra. Prohibido fabricar un criterio nuevo en la devolución.",
  },
] as const;

export const LEY_CRITERIO_VIVO_NO_ES = [
  "No es fine-tuning ni un modelo que se entrena solo.",
  "No sustituye Óptica-Código.",
  "No es un diario de frases bonitas.",
] as const;

export const LEY_CRITERIO_VIVO_KERNEL = `
LEY DEL MAESTRO: ${LEY_CRITERIO_VIVO_NOMBRE} (${LEY_CRITERIO_VIVO_MARCA}).
${LEY_CRITERIO_VIVO_FIRMA}
Unidad: ${LEY_CRITERIO_VIVO_UNIDAD}. Ritual: ${LEY_CRITERIO_VIVO_RITUAL}
La ley no se diluye. El criterio se cita; no se inventa.
`.trim();

export type OrigenCriterio = "sello" | "correccion";

export interface CriterioVivo {
  id: string;
  codigo: CodigoObservador;
  enunciado: string;
  origen: OrigenCriterio;
  /** Palabras del volcado que enseñaron este criterio. */
  anclas: string[];
  createdAt: number;
  usos: number;
}

export interface CriterioAplicado {
  id: string;
  codigo: CodigoObservador;
  enunciado: string;
  origen: OrigenCriterio;
  resonancia: number;
}

export interface SelloCriterioInput {
  codigo: CodigoObservador;
  origen: OrigenCriterio;
  /** Frase del operador. Si falta, se formula desde el volcado. */
  sabiduria?: string;
  volcadoCrudo: string;
  /** Ojo que el motor nombró primero. Sirve a la corrección. */
  codigoMotor?: CodigoObservador;
  now?: number;
  id?: string;
}

export interface ConsultaCriterio {
  acervo: readonly CriterioVivo[];
  volcadoCrudo: string;
  /** Si se pasa, prioriza criterios de ese ojo y los que resuenan más. */
  codigoDominante?: CodigoObservador;
}

const MAX_CRITERIO_POR_OJO = 3;
const MAX_ACERVO = 20;
const MAX_ENUNCIADO = 180;
const MIN_ENUNCIADO = 12;
const MIN_PALABRAS_SELLO = 6;
const UMBRAL_RESONANCIA = 0.28;
const UMBRAL_OVERRIDE = 0.35;
const UMBRAL_DEDUPE = 0.7;

const STOP = new Set([
  "este",
  "esta",
  "esto",
  "esos",
  "esas",
  "para",
  "porque",
  "como",
  "cuando",
  "donde",
  "quien",
  "tiene",
  "tengo",
  "hacer",
  "hace",
  "hacia",
  "desde",
  "entre",
  "sobre",
  "hasta",
  "pero",
  "solo",
  "tambien",
  "muy",
  "mas",
  "menos",
  "todo",
  "toda",
  "cada",
  "otro",
  "otra",
  "unos",
  "unas",
  "hoy",
  "ayer",
  "luego",
  "despues",
  "antes",
  "nada",
  "algo",
  "aqui",
  "alli",
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

function overlap(a: Set<string>, b: Set<string>): number {
  if (b.size === 0) return 0;
  let hit = 0;
  for (const t of b) if (a.has(t)) hit += 1;
  return hit / b.size;
}

function clampFrase(texto: string, max = MAX_ENUNCIADO): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max);
  const ultimo = corte.lastIndexOf(" ");
  return (ultimo > 40 ? corte.slice(0, ultimo) : corte).trim();
}

function nombreOjo(codigo: CodigoObservador): string {
  return LEY_OPTICA_CODIGO_OJOS[codigo - 1]?.nombre ?? `C${codigo}`;
}

export function contarPalabrasVolcado(texto: string): number {
  return texto
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function puedeSellarCriterio(volcadoCrudo: string): boolean {
  return contarPalabrasVolcado(volcadoCrudo) >= MIN_PALABRAS_SELLO;
}

export function extraerAnclas(volcadoCrudo: string, tope = 8): string[] {
  const toks = [...tokensDe(volcadoCrudo)];
  return toks.slice(0, tope);
}

export function formularCriterio(input: SelloCriterioInput): string {
  const sabiduria = (input.sabiduria ?? "").trim();
  const ojo = `C${input.codigo} ${nombreOjo(input.codigo)}`;
  if (sabiduria.length >= MIN_ENUNCIADO) {
    const cuerpo = clampFrase(sabiduria, MAX_ENUNCIADO - ojo.length - 4);
    return clampFrase(`${ojo}: ${cuerpo}`);
  }
  const hecho = clampFrase(input.volcadoCrudo.replace(/\s+/g, " "), 90);
  if (input.origen === "correccion" && input.codigoMotor && input.codigoMotor !== input.codigo) {
    return clampFrase(
      `${ojo}: el corte no era C${input.codigoMotor}. ${hecho}`,
    );
  }
  return clampFrase(`En ${ojo} el operador selló: ${hecho}`);
}

export function crearCriterio(input: SelloCriterioInput): CriterioVivo {
  const enunciado = formularCriterio(input);
  const now = input.now ?? Date.now();
  return {
    id: input.id ?? `crit_${now}_${input.codigo}`,
    codigo: input.codigo,
    enunciado,
    origen: input.origen,
    anclas: extraerAnclas(input.volcadoCrudo),
    createdAt: now,
    usos: 0,
  };
}

function esDuplicado(a: CriterioVivo, b: CriterioVivo): boolean {
  if (a.codigo !== b.codigo) return false;
  return (
    jaccard(tokensDe(a.enunciado), tokensDe(b.enunciado)) >= UMBRAL_DEDUPE
  );
}

/**
 * Incorpora un criterio al acervo. Deduplica. Tope por ojo y global.
 * La ley no se toca: solo cabe memoria sellada.
 */
export function sellarCriterio(
  acervo: readonly CriterioVivo[],
  input: SelloCriterioInput,
): CriterioVivo[] {
  if (!puedeSellarCriterio(input.volcadoCrudo)) {
    return [...acervo];
  }
  const nuevo = crearCriterio(input);
  if (nuevo.enunciado.length < MIN_ENUNCIADO) return [...acervo];

  const gemelo = acervo.find((c) => esDuplicado(c, nuevo));
  if (gemelo) {
    return acervo.map((c) =>
      c.id === gemelo.id
        ? {
            ...c,
            anclas: [...new Set([...c.anclas, ...nuevo.anclas])].slice(0, 12),
          }
        : c,
    );
  }

  const delOjo = acervo.filter((c) => c.codigo === nuevo.codigo);
  let siguiente = [...acervo, nuevo];
  if (delOjo.length >= MAX_CRITERIO_POR_OJO) {
    const masFlojo = [...delOjo].sort(
      (a, b) => a.usos - b.usos || a.createdAt - b.createdAt,
    )[0];
    siguiente = siguiente.filter((c) => c.id !== masFlojo.id);
  }
  if (siguiente.length > MAX_ACERVO) {
    const masFlojo = [...siguiente]
      .filter((c) => c.id !== nuevo.id)
      .sort((a, b) => a.usos - b.usos || a.createdAt - b.createdAt)[0];
    siguiente = siguiente.filter((c) => c.id !== masFlojo.id);
  }
  return siguiente;
}

export function resonanciaCriterio(
  volcadoCrudo: string,
  criterio: CriterioVivo,
): number {
  const volc = tokensDe(volcadoCrudo);
  const memoria = tokensDe(`${criterio.enunciado} ${criterio.anclas.join(" ")}`);
  return overlap(volc, memoria);
}

export function consultarCriterios(
  consulta: ConsultaCriterio,
): CriterioAplicado[] {
  const aplicados: CriterioAplicado[] = [];
  for (const c of consulta.acervo) {
    const r = resonanciaCriterio(consulta.volcadoCrudo, c);
    if (r < UMBRAL_RESONANCIA) continue;
    aplicados.push({
      id: c.id,
      codigo: c.codigo,
      enunciado: c.enunciado,
      origen: c.origen,
      resonancia: Math.round(r * 100) / 100,
    });
  }
  return aplicados.sort((a, b) => {
    if (consulta.codigoDominante) {
      const pa = a.codigo === consulta.codigoDominante ? 1 : 0;
      const pb = b.codigo === consulta.codigoDominante ? 1 : 0;
      if (pa !== pb) return pb - pa;
    }
    return b.resonancia - a.resonancia;
  });
}

/**
 * El código elige ojo con la ley + el criterio sellado.
 * Un criterio de corrección puede desplazar el ojo local
 * si resuena; nunca inventa un código fuera de 1–10.
 */
export function sesgoCriterioPorOjo(
  acervo: readonly CriterioVivo[],
  volcadoCrudo: string,
): Partial<Record<CodigoObservador, number>> {
  const sesgo: Partial<Record<CodigoObservador, number>> = {};
  for (const c of acervo) {
    const r = resonanciaCriterio(volcadoCrudo, c);
    if (r < UMBRAL_RESONANCIA) continue;
    const extra =
      c.origen === "correccion" && r >= UMBRAL_OVERRIDE
        ? 3
        : r >= 0.5
          ? 2
          : 1;
    sesgo[c.codigo] = (sesgo[c.codigo] ?? 0) + extra;
  }
  return sesgo;
}

export function marcarUsoCriterios(
  acervo: readonly CriterioVivo[],
  ids: readonly string[],
): CriterioVivo[] {
  if (ids.length === 0) return [...acervo];
  const set = new Set(ids);
  return acervo.map((c) => (set.has(c.id) ? { ...c, usos: c.usos + 1 } : c));
}

export function bloqueCriterioVivo(
  acervo: readonly CriterioVivo[],
): string {
  if (acervo.length === 0) {
    return [
      "═══ CRITERIO VIVO DEL MAESTRO ═══",
      LEY_CRITERIO_VIVO_FIRMA,
      "Acervo vacío. Recitás la ley. No inventés criterio.",
    ].join("\n");
  }
  const lineas = acervo.slice(0, MAX_ACERVO).map((c) => {
    const marca = c.origen === "correccion" ? "corrección" : "sello";
    return `- C${c.codigo} ${nombreOjo(c.codigo)} (${marca}): ${c.enunciado}`;
  });
  return [
    "═══ CRITERIO VIVO DEL MAESTRO ═══",
    LEY_CRITERIO_VIVO_FIRMA,
    "Estos criterios los selló el operador. Si el volcado resuena con uno, CÍTALO en devolucionMaestro.",
    "Prohibido inventar un criterio nuevo. Prohibido un undécimo ojo. La ley no se diluye.",
    ...lineas,
  ].join("\n");
}

export function citarCriteriosEnDevolucion(
  devolucion: string,
  aplicados: readonly CriterioAplicado[],
  tope = 1200,
): string {
  if (aplicados.length === 0) return devolucion;
  if (/criterio vivo/i.test(devolucion)) return devolucion;
  const cita = aplicados
    .slice(0, 2)
    .map((c) => c.enunciado)
    .join(" ");
  const texto = `${devolucion} Criterio vivo: ${cita}`;
  if (texto.length <= tope) return texto;
  return texto.slice(0, tope).trim();
}

export function resumenCriterioVivo(acervo: readonly CriterioVivo[]): string {
  if (acervo.length === 0) {
    return `${LEY_CRITERIO_VIVO_NOMBRE} · acervo vacío. El Maestro aún recita la ley.`;
  }
  const ojos = new Set(acervo.map((c) => c.codigo)).size;
  return `${LEY_CRITERIO_VIVO_NOMBRE} · ${acervo.length} criterio${acervo.length === 1 ? "" : "s"} en ${ojos} ojo${ojos === 1 ? "" : "s"}.`;
}

export function isCriterioVivo(value: unknown): value is CriterioVivo {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const codigo = Number(v.codigo);
  return (
    typeof v.id === "string" &&
    codigo >= 1 &&
    codigo <= 10 &&
    typeof v.enunciado === "string" &&
    (v.origen === "sello" || v.origen === "correccion") &&
    Array.isArray(v.anclas)
  );
}

export function normalizarAcervoCriterios(raw: unknown): CriterioVivo[] {
  if (!Array.isArray(raw)) return [];
  const out: CriterioVivo[] = [];
  for (const item of raw) {
    if (!isCriterioVivo(item)) continue;
    const codigo = Number(item.codigo) as CodigoObservador;
    out.push({
      id: String(item.id),
      codigo,
      enunciado: String(item.enunciado).trim(),
      origen: item.origen,
      anclas: item.anclas.map((a) => String(a)).filter(Boolean).slice(0, 12),
      createdAt: Number(item.createdAt) || 0,
      usos: Math.max(0, Number(item.usos) || 0),
    });
  }
  return out.slice(0, MAX_ACERVO);
}

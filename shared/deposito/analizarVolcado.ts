/**
 * Motor del Depósito v2 — frente de observación por tema.
 *
 * El alumno no entra por C1. Entra por el volcado.
 * Un ojo técnico del 2–4 implica los inferiores de ESE tema.
 * El hueco no se salta. Un C6 sin C4 es asomo, no conquista.
 */

import { LEY_OPTICA_CODIGO_OJOS } from "./leyOpticaCodigo.ts";

export type CodigoOjo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CalidadVolcado = "tecnico" | "pose" | "ruido";

export interface PuntajeOjo {
  codigo: CodigoOjo;
  nombre: string;
  hits: number;
  abierto: boolean;
}

export interface DictamenOptico {
  calidad: CalidadVolcado;
  tema: string;
  palabras: number;
  puntajes: PuntajeOjo[];
  abiertos: CodigoOjo[];
  asomados: CodigoOjo[];
  /** 0 = aún no hay frente. */
  frente: number;
  yaVistos: CodigoOjo[];
  siguiente: CodigoOjo;
  dictamen: string;
  mecanica: string;
}

const MIN_PALABRAS = 6;
const UMBRAL_ABIERTO = 2;
/** Un ojo 2–4 abierto implica los inmediatamente inferiores de este tema. */
const IMPLICA_HASTA = 4;

const TEMAS: { id: string; pats: RegExp[] }[] = [
  { id: "costura", pats: [/costur/, /tela/, /hilo/, /prenda/, /coser/, /maquina/] },
  { id: "dinero", pats: [/dinero/, /\bplata\b/, /cobr/, /deuda/, /ingreso/, /sueldo/] },
  { id: "casa", pats: [/\bcasa\b/, /cuarto/, /hogar/, /habitacion/, /departamento/] },
  { id: "trabajo", pats: [/trabajo/, /oficina/, /cliente/, /empleo/, /taller/] },
  { id: "pareja", pats: [/pareja/, /espos/, /novi/, /relacion con/] },
  { id: "cuerpo", pats: [/cuerpo/, /dolor/, /salud/, /enfermedad/, /energia/] },
];

const PATRONES: Record<CodigoOjo, RegExp[]> = {
  1: [
    /territorio/,
    /suelo/,
    /espacio/,
    /\blugar\b/,
    /\bcasa\b/,
    /cuarto/,
    /\bmesa\b/,
    /taller/,
    /\bbase\b/,
    /ambiente/,
    /\bsitio\b/,
    /donde ocurre/,
    /ordenar/,
  ],
  2: [
    /flujo/,
    /caudal/,
    /rutina/,
    /\bentra\b/,
    /\bsale\b/,
    /estanc/,
    /atasco/,
    /se mueve/,
    /circul/,
    /\bgasto\b/,
    /se traba/,
    /lo que entra/,
    /lo que sale/,
  ],
  3: [
    /secuencia/,
    /paso a paso/,
    /en orden/,
    /primero/,
    /despues/,
    /\bluego\b/,
    /piston/,
    /ejecut/,
    /procedimiento/,
    /como se hace/,
    /orden de/,
    /hice esto/,
  ],
  4: [
    /estructura/,
    /sostiene/,
    /armado/,
    /no se cae/,
    /\bley\b/,
    /reten/,
    /regla/,
    /soporta/,
    /forma que/,
    /lo que sostiene/,
  ],
  5: [
    /decision/,
    /decidi/,
    /elegi/,
    /disparo/,
    /vertice/,
    /evite/,
    /elijo/,
    /donde se elige/,
    /tome la decision/,
  ],
  6: [
    /juntura/,
    /conjug/,
    /relacion/,
    /encuentro/,
    /pieza/,
    /convivencia/,
    /alianza/,
    /el otro/,
    /se encuentran/,
    /junto con/,
  ],
  7: [
    /patron/,
    /se distingue/,
    /apariencia/,
    /diferencia/,
    /lente/,
    /se parece/,
    /observo/,
    /veo que/,
    /lo que se distingue/,
  ],
  8: [
    /se repite/,
    /otra vez/,
    /ciclo/,
    /\bloop\b/,
    /interrupcion/,
    /preven/,
    /siempre pasa/,
    /retorno/,
    /cada vez/,
  ],
  9: [
    /sistema/,
    /conjunto/,
    /al escalar/,
    /se cae todo/,
    /arquitectura/,
    /si una parte/,
    /el todo/,
  ],
  10: [
    /origen/,
    /fuente/,
    /por que existe/,
    /para que/,
    /la causa/,
    /el sentido/,
    /eje que lo causa/,
  ],
};

export function normalizarVolcado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function contarPalabras(norm: string): number {
  if (!norm) return 0;
  return norm.split(" ").filter(Boolean).length;
}

function hitsDe(norm: string, pats: RegExp[]): number {
  let n = 0;
  for (const p of pats) {
    if (p.test(norm)) n += 1;
  }
  return n;
}

export function detectarTema(norm: string): string {
  for (const t of TEMAS) {
    if (t.pats.some((p) => p.test(norm))) return t.id;
  }
  return "este día";
}

function ojoNombre(codigo: number): string {
  return LEY_OPTICA_CODIGO_OJOS[codigo - 1]?.nombre ?? `C${codigo}`;
}

function etiqueta(codigo: number): string {
  return `C${codigo} ${ojoNombre(codigo)}`;
}

function mecanicaDe(codigo: CodigoOjo, tema: string): string {
  const ojo = LEY_OPTICA_CODIGO_OJOS[codigo - 1];
  return `En ${tema}, no repitas el ojo que ya viste. Mira con ${etiqueta(codigo)}: ${ojo.ve} Volcá eso.`;
}

function construirDictamen(d: Omit<DictamenOptico, "dictamen" | "mecanica">): Pick<
  DictamenOptico,
  "dictamen" | "mecanica"
> {
  const mecanica = mecanicaDe(d.siguiente, d.tema);

  if (d.calidad === "ruido") {
    return {
      dictamen:
        "Esto todavía es ruido. Reescribilo como lo que el día te enseñó a operar — una frase técnica, no emoción suelta.",
      mecanica:
        "El ritual sigue siendo el mismo: ¿qué aprendí hoy? El volcado tiene que poder nombrarse en un código.",
    };
  }

  if (d.calidad === "pose") {
    const asomo = d.asomados.map(etiqueta).join(" · ") || "un ojo alto";
    return {
      dictamen: `Asomó ${asomo}, pero el frente de este tema no está. No se entra por el ojo más glamuroso. El siguiente es ${etiqueta(d.siguiente)}.`,
      mecanica,
    };
  }

  const vistos =
    d.yaVistos.length > 0
      ? ` Ya vistos en este tema: ${d.yaVistos.map(etiqueta).join(" · ")}.`
      : "";
  const hueco =
    d.asomados.length > 0
      ? ` Asomó ${d.asomados.map(etiqueta).join(" · ")}; no se salta el hueco.`
      : "";
  const abierto =
    d.frente > 0 ? etiqueta(d.frente as CodigoOjo) : etiqueta(d.siguiente);

  return {
    dictamen: `En ${d.tema} el ojo abierto es ${abierto}.${vistos}${hueco} Siguiente observación: ${etiqueta(d.siguiente)}.`,
    mecanica,
  };
}

export function analizarVolcado(texto: string): DictamenOptico {
  const norm = normalizarVolcado(texto);
  const palabras = contarPalabras(norm);
  const tema = detectarTema(norm);

  const puntajes: PuntajeOjo[] = LEY_OPTICA_CODIGO_OJOS.map((ojo) => {
    const hits = hitsDe(norm, PATRONES[ojo.codigo as CodigoOjo]);
    return {
      codigo: ojo.codigo as CodigoOjo,
      nombre: ojo.nombre,
      hits,
      abierto: hits >= UMBRAL_ABIERTO,
    };
  });

  const abiertos = puntajes.filter((p) => p.abierto).map((p) => p.codigo);
  const implied = new Set<number>(abiertos);

  for (const k of abiertos) {
    if (k >= 2 && k <= IMPLICA_HASTA) {
      for (let i = 1; i < k; i++) implied.add(i);
    }
  }

  let frente = 0;
  for (let i = 1; i <= 10; i++) {
    if (implied.has(i)) frente = i;
    else break;
  }

  const asomados = abiertos.filter((n) => n > frente) as CodigoOjo[];
  const yaVistos = (frente >= 2 ? range(1, frente - 1) : []) as CodigoOjo[];
  const siguiente = (frente === 0 ? 1 : Math.min(frente + 1, 10)) as CodigoOjo;

  let calidad: CalidadVolcado = "tecnico";
  if (palabras < MIN_PALABRAS) calidad = "ruido";
  else if (frente === 0) calidad = asomados.length > 0 ? "pose" : "ruido";

  const base = {
    calidad,
    tema,
    palabras,
    puntajes,
    abiertos,
    asomados,
    frente,
    yaVistos,
    siguiente,
  };
  const textos = construirDictamen(base);

  return { ...base, ...textos };
}

function range(from: number, to: number): number[] {
  if (to < from) return [];
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

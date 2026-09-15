/**
 * Motor del Depósito v2 — un volcado, un ojo.
 *
 * El alumno no entra por C1. Entra por el volcado.
 * El prediseño es para público general: costura, cocina, ruta, ventas,
 * cuidado, oficina u otro oficio.
 *
 * Autarquía: no se mezclan canales en un dictamen. Cada dump nombra
 * el ojo con el que se está viendo. El lugar en la escala lo da el
 * historial (ojos ya habitados), no una implicación del mismo texto.
 * El hueco no se salta.
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
  /** Solo el ojo de este volcado. Nunca una lista mezclada. */
  abiertos: CodigoOjo[];
  /** Vacío: un dump no “asoma” otros canales. */
  asomados: CodigoOjo[];
  /**
   * Ojo con el que se está viendo este volcado.
   * 0 = ruido. Alias de `frente` para lecturas viejas.
   */
  viendoCon: number;
  /** Este dump habita el hueco (el siguiente ojo vacío de la escala). */
  tomaLugar: boolean;
  /** 0 = ruido. Igual a `viendoCon` para no romper JSON guardado. */
  frente: number;
  /** Ojos que ya tenían lugar en el historial — no los de este dump. */
  yaVistos: CodigoOjo[];
  siguiente: CodigoOjo;
  dictamen: string;
  mecanica: string;
}

export interface OpcionesAnalisis {
  /** Ojos que ya tienen lugar por volcados anteriores. Uno por dump. */
  ojosConLugar?: readonly number[];
}

const MIN_PALABRAS = 6;
/** Palabras de un volcado con materia: ya no es emoción suelta. */
const MIN_MATERIA = 18;
const UMBRAL_ABIERTO = 2;

const TEMAS: { id: string; etiqueta: string; pats: RegExp[] }[] = [
  { id: "costura", etiqueta: "costura", pats: [/costur/, /tela/, /hilo/, /prenda/, /coser/, /costurero/] },
  { id: "cocina", etiqueta: "cocina", pats: [/cocina/, /receta/, /sarten/, /fogon/, /platillo/, /restaurante/, /\bmozo\b/, /\bchef\b/, /hornear/, /salsa/] },
  { id: "ventas", etiqueta: "ventas", pats: [/vend/, /mostrador/, /tienda/, /pedido/, /promo/, /\bstock\b/, /cobrar/, /\bcliente/] },
  { id: "transporte", etiqueta: "la ruta", pats: [/manejar/, /condu/, /chofer/, /\bruta\b/, /pasajero/, /\btaxi\b/, /colectivo/, /\bcombi\b/, /trafico/, /paradero/] },
  { id: "salud", etiqueta: "el cuidado", pats: [/paciente/, /enfermer/, /\bdoctor\b/, /consulta/, /hospital/, /clinica/, /herida/, /cuidar/] },
  { id: "construccion", etiqueta: "la obra", pats: [/\bobra\b/, /ladrillo/, /cemento/, /andamio/, /albanil/, /construc/] },
  { id: "campo", etiqueta: "el campo", pats: [/chacra/, /siembra/, /cosecha/, /ganado/, /\bfinca\b/, /cultivo/, /parcela/] },
  { id: "oficina", etiqueta: "la oficina", pats: [/oficina/, /reunion/, /informe/, /\bjefe\b/, /escritorio/, /computadora/, /correo/] },
  { id: "familia", etiqueta: "familia", pats: [/hijo/, /hija/, /familia/, /\bpapa\b/, /\bmama\b/, /padre/, /madre/, /nino/, /esposa/, /esposo/] },
  { id: "escuela", etiqueta: "escuela", pats: [/preparator/, /escuela/, /colegio/, /\bclase\b/, /tarea/, /profesor/, /alumno/] },
  { id: "dinero", etiqueta: "el dinero", pats: [/dinero/, /\bplata\b/, /deuda/, /ingreso/, /sueldo/, /cobr/] },
  { id: "casa", etiqueta: "la casa", pats: [/\bcasa\b/, /cuarto/, /hogar/, /habitacion/, /departamento/] },
  { id: "pareja", etiqueta: "la pareja", pats: [/pareja/, /novi/, /relacion con/] },
  { id: "cuerpo", etiqueta: "el cuerpo", pats: [/cuerpo/, /dolor/, /salud/, /enfermedad/, /energia/] },
  { id: "oficio", etiqueta: "el oficio", pats: [/trabajo/, /empleo/, /oficio/, /\blabor\b/, /taller/] },
];

/** Marcas de que el alumno contestó el ritual — no es un suspiro. */
const MARCAS_MATERIA: RegExp[] = [
  /aprend/,
  /me di cuenta/,
  /entend/,
  /me ensen/,
  /por ejemplo/,
  /me hace pensar/,
  /vi que/,
  /note que/,
  /hoy cuando/,
  /le habl/,
  /me explic/,
  /me esplic/,
  /atendi/,
  /el cliente/,
  /el pedido/,
  /en la ruta/,
  /en la cocina/,
  /hoy en /,
  /trabaje/,
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
    /\bpuesto\b/,
    /\blocal\b/,
    /\bruta\b/,
    /cocina/,
    /\bobra\b/,
    /oficina/,
    /\bcalle\b/,
    /mostrador/,
    /consultorio/,
    /paradero/,
    /escritorio/,
    /hijo/,
    /hija/,
    /familia/,
    /preparator/,
    /escuela/,
    /colegio/,
    /cuando le/,
    /con mi /,
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
    /le habl/,
    /no entiende/,
    /me explic/,
    /me esplic/,
    /escuch/,
    /se pierde/,
    /\bcola\b/,
    /espera/,
    /\bturno\b/,
    /pedido/,
    /\bstock\b/,
    /se atrasa/,
    /se acumula/,
    /trafico/,
    /no llega/,
    /se quema/,
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
    /cuando /,
    /por ejemplo/,
    /pero cuando/,
    /al hablar/,
    /receta/,
    /protocolo/,
    /itinerario/,
    /hice /,
    /hago /,
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
    /moral/,
    /comport/,
    /actitud/,
    /madurez/,
    /madures/,
    /\bnorma\b/,
    /horario/,
    /precio/,
    /contrato/,
    /no se puede saltar/,
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
    /sin embargo/,
    /en cambio/,
    /dije que no/,
    /acepte/,
    /deje pasar/,
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
    /hijo/,
    /hija/,
    /le habl/,
    /me explic/,
    /me esplic/,
    /familia/,
    /con mi /,
    /cliente/,
    /\bjefe\b/,
    /companero/,
    /equipo/,
    /paciente/,
    /alumno/,
    /pasajero/,
    /proveedor/,
    /atendi/,
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
    /por ejemplo/,
    /me hace pensar/,
    /no entiende/,
    /aprendi/,
    /me di cuenta/,
    /sin embargo/,
    /mas rapida/,
    /no por /,
    /se nota/,
    /distinto/,
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
    /repetic/,
    /siempre /,
    /de nuevo/,
    /sabe por/,
    /todos los dias/,
    /el mismo error/,
  ],
  9: [
    /sistema/,
    /conjunto/,
    /al escalar/,
    /se cae todo/,
    /arquitectura/,
    /si una parte/,
    /el todo/,
    /todo el local/,
    /el equipo entero/,
  ],
  10: [
    /origen/,
    /fuente/,
    /por que existe/,
    /para que/,
    /la causa/,
    /el sentido/,
    /eje que lo causa/,
    /sabe por/,
    /no por /,
    /porque /,
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
  let mejor = { etiqueta: "este hecho", hits: 0 };
  for (const t of TEMAS) {
    const hits = t.pats.reduce((n, p) => n + (p.test(norm) ? 1 : 0), 0);
    if (hits > mejor.hits) mejor = { etiqueta: t.etiqueta, hits };
  }
  return mejor.hits > 0 ? mejor.etiqueta : "este hecho";
}

export function tieneMateriaDeAprendizaje(norm: string, palabras: number): boolean {
  if (palabras < MIN_MATERIA) return false;
  return MARCAS_MATERIA.some((p) => p.test(norm));
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
        "Esto todavía es ruido: muy corto o sin escena. Volcá el día crudo — qué pasó, con quién, qué aprendiste a operar.",
      mecanica:
        "El ritual sigue siendo el mismo: ¿qué aprendí hoy? El volcado tiene que poder nombrarse en un código.",
    };
  }

  const ojo = etiqueta(d.viendoCon as CodigoOjo);
  const sig = etiqueta(d.siguiente);

  if (d.calidad === "pose") {
    return {
      dictamen: `Estás viendo con ${ojo}. No se mezcla con otro canal ni se salta el hueco. Este volcado aún no le da lugar: el siguiente habita ${sig}.`,
      mecanica,
    };
  }

  const lugar = d.tomaLugar
    ? "Este volcado le da su lugar."
    : "Ese ojo ya tenía lugar; no se mezcla con otro.";

  return {
    dictamen: `Estás viendo con ${ojo}. ${lugar} En ${d.tema}, un volcado es un canal. Siguiente: ${sig}.`,
    mecanica,
  };
}

function sanitizarLugar(raw: readonly number[] | undefined): CodigoOjo[] {
  const set = new Set<CodigoOjo>();
  for (const n of raw ?? []) {
    if (n >= 1 && n <= 10 && Number.isInteger(n)) set.add(n as CodigoOjo);
  }
  return [...set].sort((a, b) => a - b);
}

function huecoDe(lugar: ReadonlySet<number>): CodigoOjo {
  for (let i = 1; i <= 10; i++) {
    if (!lugar.has(i)) return i as CodigoOjo;
  }
  return 10;
}

/** Tesis del día: el canal que se distingue, no cada palabra de la escena. */
function boostTesis(norm: string): Record<CodigoOjo, number> {
  const b = Object.fromEntries(
    LEY_OPTICA_CODIGO_OJOS.map((o) => [o.codigo, 0])
  ) as Record<CodigoOjo, number>;
  if (/sabe por repet/.test(norm) || /por repetic/.test(norm)) b[8] += 3;
  if (/no por madur/.test(norm)) b[7] += 3;
  if (/patron|se distingue|se nota que|diferencia de/.test(norm)) b[7] += 2;
  if (/se repite|cada vez|siempre pasa|el mismo error/.test(norm)) b[8] += 2;
  if (/secuencia|paso a paso|orden de ejecuc/.test(norm)) b[3] += 2;
  if (/primero.{0,80}despues/.test(norm)) b[3] += 2;
  return b;
}

function ojoDominante(puntajes: PuntajeOjo[]): CodigoOjo | 0 {
  let mejor: { codigo: CodigoOjo | 0; score: number } = { codigo: 0, score: 0 };
  for (const p of puntajes) {
    if (
      p.hits > mejor.score ||
      (p.hits === mejor.score && p.hits > 0 && p.codigo < (mejor.codigo || 11))
    ) {
      mejor = { codigo: p.codigo, score: p.hits };
    }
  }
  return mejor.score > 0 ? mejor.codigo : 0;
}

/**
 * Ojos que ya tienen lugar. Solo cuenta un dump que habitó el hueco.
 * Dictámenes viejos mezclados (sin `viendoCon` / `tomaLugar`) no cuentan
 * como siete ojos conquistados.
 */
export function ojosConLugarDe(
  historial: Array<{
    dictamen?: Pick<DictamenOptico, "calidad" | "viendoCon" | "tomaLugar"> | null;
  }>
): CodigoOjo[] {
  const set = new Set<CodigoOjo>();
  for (const v of historial) {
    const d = v.dictamen;
    if (!d || d.calidad === "ruido") continue;
    if (d.tomaLugar !== true) continue;
    const n = d.viendoCon;
    if (typeof n === "number" && n >= 1 && n <= 10) set.add(n as CodigoOjo);
  }
  return [...set].sort((a, b) => a - b);
}

export function analizarVolcado(
  texto: string,
  opts?: OpcionesAnalisis
): DictamenOptico {
  const norm = normalizarVolcado(texto);
  const palabras = contarPalabras(norm);
  const tema = detectarTema(norm);
  const yaVistos = sanitizarLugar(opts?.ojosConLugar);
  const lugar = new Set<number>(yaVistos);
  const hueco = huecoDe(lugar);
  const boosts = boostTesis(norm);

  const puntajes: PuntajeOjo[] = LEY_OPTICA_CODIGO_OJOS.map((ojo) => {
    const codigo = ojo.codigo as CodigoOjo;
    const hits = hitsDe(norm, PATRONES[codigo]) + (boosts[codigo] ?? 0);
    return {
      codigo,
      nombre: ojo.nombre,
      hits,
      abierto: hits >= UMBRAL_ABIERTO,
    };
  });

  let viendoCon = ojoDominante(puntajes);

  let calidad: CalidadVolcado = "tecnico";
  if (palabras < MIN_PALABRAS) {
    calidad = "ruido";
    viendoCon = 0;
  } else if (viendoCon === 0) {
    if (tieneMateriaDeAprendizaje(norm, palabras)) {
      viendoCon = 1;
      calidad = "tecnico";
    } else {
      calidad = "ruido";
    }
  } else if (viendoCon > hueco) {
    calidad = "pose";
  } else {
    calidad = "tecnico";
  }

  const tomaLugar = calidad === "tecnico" && viendoCon === hueco && viendoCon > 0;
  const siguiente = tomaLugar
    ? huecoDe(new Set([...lugar, viendoCon]))
    : hueco;
  const frente = viendoCon;
  const abiertos = (viendoCon > 0 ? [viendoCon as CodigoOjo] : []) as CodigoOjo[];
  const asomados: CodigoOjo[] = [];

  const base = {
    calidad,
    tema,
    palabras,
    puntajes,
    abiertos,
    asomados,
    viendoCon,
    tomaLugar,
    frente,
    yaVistos,
    siguiente,
  };
  const textos = construirDictamen(base);

  return { ...base, ...textos };
}

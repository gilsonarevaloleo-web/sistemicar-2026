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
/** Palabras de un volcado con materia: ya no es emoción suelta. */
const MIN_MATERIA = 18;
const UMBRAL_ABIERTO = 2;
/** Un ojo 2–4 abierto implica los inmediatamente inferiores de este tema. */
const IMPLICA_HASTA = 4;

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
  let yaVistos = (frente >= 2 ? range(1, frente - 1) : []) as CodigoOjo[];
  let siguiente = (frente === 0 ? 1 : Math.min(frente + 1, 10)) as CodigoOjo;

  let calidad: CalidadVolcado = "tecnico";
  if (palabras < MIN_PALABRAS) calidad = "ruido";
  else if (frente === 0) calidad = asomados.length > 0 ? "pose" : "ruido";

  // Volcado con materia (aprendí, escena, ejemplo) no es ruido:
  // el territorio del día ya está; el siguiente ojo se nombra.
  if (calidad === "ruido" && tieneMateriaDeAprendizaje(norm, palabras)) {
    implied.add(1);
    const c1 = puntajes.find((p) => p.codigo === 1);
    if (c1) c1.abierto = true;
    if (!abiertos.includes(1)) abiertos.unshift(1);
    frente = 1;
    yaVistos = [];
    siguiente = 2;
    calidad = "tecnico";
    for (const extra of abiertos) {
      if (extra > 1 && !asomados.includes(extra)) asomados.push(extra);
    }
    asomados.sort((a, b) => a - b);
  }

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

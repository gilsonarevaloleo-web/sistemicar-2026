/**
 * Motor del Depósito v2 — posición y jerarquía de mando.
 *
 * El alumno no entra por C1. Entra por el volcado.
 * El prediseño es para público general: costura, cocina, ruta, ventas,
 * cuidado, oficina u otro oficio.
 *
 * Presencia: varios ojos pueden abrirse a la vez. Eso no es error.
 * La mezcla se analiza, no se aplasta: se ordena con la Cascada.
 * El ojo más alto mencionado es la posición (ojo abierto).
 * Los huecos de mando no se saltan.
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
  /** Ojos que este volcado encendió. Varios a la vez no es error. */
  abiertos: CodigoOjo[];
  /** Mencionado (1 hit) pero aún no abierto. */
  asomados: CodigoOjo[];
  /** Cadena de mando de este dump: abiertos en orden de Cascada. */
  mando: CodigoOjo[];
  /** Huecos de mando entre C1 y la posición. */
  huecos: CodigoOjo[];
  /**
   * Posición: el ojo más alto abierto.
   * 0 = ruido. Alias de `frente`.
   */
  viendoCon: number;
  /** Cadena cerrada hasta la posición (sin hueco debajo). */
  tomaLugar: boolean;
  /** 0 = ruido. Igual a `viendoCon`: el ojo abierto / la posición. */
  frente: number;
  /** Ojos de mando debajo de la posición, más los ya habitados. */
  yaVistos: CodigoOjo[];
  siguiente: CodigoOjo;
  dictamen: string;
  mecanica: string;
}

export interface OpcionesAnalisis {
  /** Ojos ya habitados en volcados anteriores. Cierran huecos de la Cascada. */
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
  return `En ${tema}, la Cascada manda. Mira el hueco con ${etiqueta(codigo)}: ${ojo.ve} Volcá eso.`;
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

  const pos = etiqueta(d.frente as CodigoOjo);
  const sig = etiqueta(d.siguiente);
  const mando =
    d.mando.length > 1
      ? ` Jerarquía de mando: ${d.mando.map(etiqueta).join(" → ")}.`
      : "";
  const huecoTxt =
    d.huecos.length > 0
      ? ` Hueco de mando: ${d.huecos.map(etiqueta).join(" · ")}.`
      : " Cadena de mando cerrada hasta esa posición.";

  if (d.calidad === "pose") {
    return {
      dictamen: `Asomó ${pos}, pero aún no hay ojo abierto. La Cascada no se entra por el canal más alto. Siguiente: ${sig}.`,
      mecanica,
    };
  }

  return {
    dictamen: `Ojo abierto: ${pos} — esa es tu posición en ${d.tema}.${mando}${huecoTxt} Siguiente observación: ${sig}.`,
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

function huecosHasta(posicion: number, conocidos: ReadonlySet<number>): CodigoOjo[] {
  const out: CodigoOjo[] = [];
  for (let i = 1; i < posicion; i++) {
    if (!conocidos.has(i)) out.push(i as CodigoOjo);
  }
  return out;
}

function siguienteDe(posicion: number, huecos: readonly CodigoOjo[]): CodigoOjo {
  if (huecos.length > 0) return huecos[0];
  if (posicion < 10) return (posicion + 1) as CodigoOjo;
  return 10;
}

/** Tesis del día: refuerza el canal que se distingue, no apaga los demás. */
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

/**
 * Ojos ya habitados. Cada dump puede encender varios; se acumulan.
 * Un dictamen viejo sin `abiertos` aporta al menos su posición.
 */
export function ojosConLugarDe(
  historial: Array<{
    dictamen?: Pick<
      DictamenOptico,
      "calidad" | "viendoCon" | "frente" | "abiertos"
    > | null;
  }>
): CodigoOjo[] {
  const set = new Set<CodigoOjo>();
  for (const v of historial) {
    const d = v.dictamen;
    if (!d || d.calidad === "ruido") continue;
    if (Array.isArray(d.abiertos)) {
      for (const n of d.abiertos) {
        if (n >= 1 && n <= 10) set.add(n as CodigoOjo);
      }
    }
    const pos = d.viendoCon || d.frente;
    if (typeof pos === "number" && pos >= 1 && pos <= 10) set.add(pos as CodigoOjo);
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
  const yaHabitados = sanitizarLugar(opts?.ojosConLugar);
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

  const abiertos = puntajes.filter((p) => p.abierto).map((p) => p.codigo);
  const asomados = puntajes
    .filter((p) => !p.abierto && p.hits > 0)
    .map((p) => p.codigo);

  let calidad: CalidadVolcado = "tecnico";
  let posicion = 0;

  if (palabras < MIN_PALABRAS) {
    calidad = "ruido";
  } else if (abiertos.length > 0) {
    posicion = abiertos[abiertos.length - 1];
    calidad = "tecnico";
  } else if (tieneMateriaDeAprendizaje(norm, palabras)) {
    posicion = 1;
    if (!abiertos.includes(1)) abiertos.push(1);
    abiertos.sort((a, b) => a - b);
    const c1 = puntajes.find((p) => p.codigo === 1);
    if (c1) c1.abierto = true;
    calidad = "tecnico";
  } else if (asomados.length > 0) {
    posicion = asomados[asomados.length - 1];
    calidad = "pose";
  } else {
    calidad = "ruido";
  }

  const mando = (calidad === "ruido" ? [] : abiertos.length > 0 ? abiertos : []) as CodigoOjo[];
  const conocidos = new Set<number>([...yaHabitados, ...mando]);
  const huecos = posicion > 0 ? huecosHasta(posicion, conocidos) : [];
  const siguiente =
    calidad === "ruido" ? (1 as CodigoOjo) : siguienteDe(posicion, huecos);
  const tomaLugar = calidad === "tecnico" && posicion > 0 && huecos.length === 0;
  const yaVistos = [
    ...new Set<CodigoOjo>([
      ...yaHabitados,
      ...mando.filter((n) => n < posicion),
    ]),
  ].sort((a, b) => a - b);

  const base = {
    calidad,
    tema,
    palabras,
    puntajes,
    abiertos: calidad === "ruido" ? [] : mando,
    asomados: calidad === "ruido" ? [] : asomados,
    mando,
    huecos,
    viendoCon: calidad === "ruido" ? 0 : posicion,
    tomaLugar,
    frente: calidad === "ruido" ? 0 : posicion,
    yaVistos,
    siguiente,
  };
  const textos = construirDictamen(base);

  return { ...base, ...textos };
}

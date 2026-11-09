/**
 * Diccionario de límites C1–C10 del planeta 6 (Umbral).
 * El código es el canal del límite. No es intento. No es el cuerpo (salvo C6).
 */

import type { CodigoUsuario } from "./types.ts";

export type CodigoLimite = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type PoloLimite = "pro" | "contra";

export const CODIGOS_LIMITE: readonly CodigoLimite[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

export interface EntradaDiccionarioLimite {
  numero: CodigoLimite;
  nombre: string;
  pregunta: string;
  /** Polo que sostiene la ejecución. */
  pro: string;
  /** Polo que es el límite. */
  contra: string;
  marcasPro: readonly RegExp[];
  marcasContra: readonly RegExp[];
}

export const DICCIONARIO_LIMITES: Record<CodigoLimite, EntradaDiccionarioLimite> =
  {
    1: {
      numero: 1,
      nombre: "Identidad / Ego / Cimiento",
      pregunta: "¿Tiene identidad interna o no?",
      pro: "Tiene ego: hay cimiento.",
      contra: "No tiene ego: no hay cimiento.",
      marcasPro: [
        /\bse quien soy\b/,
        /\btengo identidad\b/,
        /\bhay cimiento\b/,
        /\bme paro como\b/,
        /\bmi ego\b/,
        /\byo soy el que\b/,
      ],
      marcasContra: [
        /\bno se quien soy\b/,
        /\bno tengo identidad\b/,
        /\bsin ego\b/,
        /\bno hay cimiento\b/,
        /\bno tengo con que pararme\b/,
        /\bno me paro\b/,
        /\bquien soy yo para\b/,
        /\bno soy nadie para\b/,
        /\bno hay suelo interno\b/,
        /\bpara poder ser\b/,
        /\bno soy [a-záéíóúñ]+\b/,
      ],
    },
    2: {
      numero: 2,
      nombre: "Exposición pública",
      pregunta: "¿Tiene miedo a la exposición pública-crítica o no?",
      pro: "No tiene ese miedo: puede ser visto.",
      contra: "Tiene miedo a la mirada / a la crítica.",
      marcasPro: [
        /\bno me importa que me vean\b/,
        /\bpuedo exponerme\b/,
        /\bno tengo miedo a la critica\b/,
        /\bsalgo a la luz\b/,
      ],
      marcasContra: [
        /\bmiedo a la exposicion\b/,
        /\bmiedo a la critica\b/,
        /\bexposicion publica\b/,
        /\bmiedo a que me vean\b/,
        /\bsi me ven\b/,
        /\bla mirada\b/,
        /\bme critican\b/,
        /\bno salgo a la luz\b/,
        /\bque diran\b/,
        /\bridicul[oa] en publico\b/,
        /\bno soporto ser visto\b/,
      ],
    },
    3: {
      numero: 3,
      nombre: "Trabajo / Pistón",
      pregunta: "¿Hay secuencia que mueve, o solo ocupación?",
      pro: "El esfuerzo modifica.",
      contra: "Trabaja y no se mueve.",
      marcasPro: [
        /\bel esfuerzo modifica\b/,
        /\bhay piston\b/,
        /\bsecuencia que mueve\b/,
      ],
      marcasContra: [
        /\btrabajo y no se mueve\b/,
        /\bno se modifica\b/,
        /\bno lo modifico\b/,
        /\bocupacion esteril\b/,
        /\bhoras sin traccion\b/,
        /\besfuerzo sin resultado\b/,
        /\btrabaj[eé] (en|el|mi).{0,40}no se\b/,
      ],
    },
    4: {
      numero: 4,
      nombre: "Estructura / Seriedad",
      pregunta: "¿Hay ley que sostenga, o hay flor?",
      pro: "Hay ruta / retén.",
      contra: "Ilusión, flor, no hay estructura.",
      marcasPro: [
        /\bhay ruta\b/,
        /\bhay reten\b/,
        /\bhay estructura\b/,
        /\bseriedad\b/,
      ],
      marcasContra: [
        /\bilusion\b/,
        /\bsin estructura\b/,
        /\bno hay estructura\b/,
        /\bno hay reten\b/,
        /\bno hay ruta\b/,
        /\bes flor\b/,
        /\bfloritura\b/,
      ],
    },
    5: {
      numero: 5,
      nombre: "Decisión / Corte",
      pregunta: "¿Corta o evade?",
      pro: "Dispara.",
      contra: "Parálisis: no elige.",
      marcasPro: [/\bdisparo\b/, /\bcorto\b/, /\bdecido\b/, /\bya elegi\b/],
      marcasContra: [
        /\bno elijo\b/,
        /\bparalisis\b/,
        /\bno es el momento\b/,
        /\bno es el mes\b/,
        /\blo dejo para despues\b/,
        /\bno corto\b/,
        /\bevado\b/,
      ],
    },
    6: {
      numero: 6,
      nombre: "Cuerpo / Roce",
      pregunta: "¿El chasis ejecuta o niega?",
      pro: "El cuerpo sostiene el roce.",
      contra: "El cuerpo niega (freeze, ansiedad).",
      marcasPro: [
        /\bel cuerpo sostiene\b/,
        /\bel chasis aguanta\b/,
        /\bel roce se aguanta\b/,
      ],
      marcasContra: [
        /\bel cuerpo niega\b/,
        /\bfreeze\b/,
        /\bse me traba el cuerpo\b/,
        /\bansiedad en el cuerpo\b/,
        /\bel chasis no\b/,
        /\bpanico en el cuerpo\b/,
        /\bel cuerpo no ejecuta\b/,
      ],
    },
    7: {
      numero: 7,
      nombre: "Justicia / Culpa",
      pregunta: "¿Sostiene el intercambio o lo frena la culpa?",
      pro: "Se para en el valor.",
      contra: "«No merezco», descuento moral.",
      marcasPro: [
        /\bme paro en el valor\b/,
        /\bintercambio justo\b/,
        /\bcobro sin culpa\b/,
      ],
      marcasContra: [
        /\bno merezco\b/,
        /\bculpa por cobrar\b/,
        /\bcobrar es malo\b/,
        /\bdescuento moral\b/,
        /\bpedir es soberbia\b/,
      ],
    },
    8: {
      numero: 8,
      nombre: "Persistencia / Ciclo",
      pregunta: "¿Atraviesa el desgaste o entra en loop?",
      pro: "Constancia estratégica.",
      contra: "Abandona / óxido / repetición inútil.",
      marcasPro: [
        /\bconstancia\b/,
        /\batravieso el desgaste\b/,
        /\bno abandono\b/,
      ],
      marcasContra: [
        /\babandono\b/,
        /\boxido\b/,
        /\brepeticion inutil\b/,
        /\bse me cae el ritmo\b/,
        /\bentro en loop\b/,
      ],
    },
    9: {
      numero: 9,
      nombre: "Sistema",
      pregunta: "¿Es circuito o evento heroico?",
      pro: "Rutina integrable.",
      contra: "Pico sin sistema: se cae.",
      marcasPro: [
        /\brutina integrable\b/,
        /\bes circuito\b/,
        /\bhay sistema\b/,
      ],
      marcasContra: [
        /\bevento heroico\b/,
        /\bse cae al mes\b/,
        /\bno hay sistema\b/,
        /\bpico sin rutina\b/,
        /\bse cae\b/,
      ],
    },
    10: {
      numero: 10,
      nombre: "Origen / Eje",
      pregunta: "¿Hay autoría del origen o vacío?",
      pro: "Habita el eje.",
      contra: "Extravío: desconexión de la fuente.",
      marcasPro: [/\bhabito el eje\b/, /\bhay autoria\b/, /\bhabito el origen\b/],
      marcasContra: [
        /\bextravio\b/,
        /\bdesconexion de la fuente\b/,
        /\bsin origen\b/,
        /\bvacio de eje\b/,
        /\bno habito el origen\b/,
      ],
    },
  };

export function entradaLimite(codigo: CodigoLimite): EntradaDiccionarioLimite {
  return DICCIONARIO_LIMITES[codigo];
}

/** C8–C10 se nombran. El asiento que se le dice es C1–C7. */
export function asientoDeCanal(canal: CodigoLimite): CodigoUsuario {
  if (canal >= 8) return 7;
  return canal as CodigoUsuario;
}

export function etiquetaPolo(polo: PoloLimite): string {
  return polo === "pro" ? "Pro" : "Contra";
}

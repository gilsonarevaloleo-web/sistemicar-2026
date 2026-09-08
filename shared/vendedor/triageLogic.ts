/**
 * Vendedor Capa 1 — Triage determinista (sin Gemini).
 * 2 preguntas → fija uno de los 3 códigos de Jornada Base → CTAs.
 * Este corte no diagnostica ni nombra Espejo ni Umbral.
 */

import {
  DICCIONARIO_CODIGOS,
  type CodigoNumero,
} from "../umbral/engineConfig.ts";
import {
  PLANETAS,
  PUERTA_COMERCIAL_VENDEDOR,
  puertaComercialVendedor,
  type PlanetaId,
} from "./planetasConfig.ts";

export const CODIGOS_JORNADA_BASE = [1, 2, 3] as const;
export type CodigoJornadaBase = (typeof CODIGOS_JORNADA_BASE)[number];

/** Códigos de este corte. Cualquier otro se recorta a 3 (día sin cierre). */
export function clampCodigoJornadaBase(n: number): CodigoJornadaBase {
  if (n === 1 || n === 2 || n === 3) return n;
  return 3;
}

export const RESUMEN_HUMANO_JORNADA: Record<CodigoJornadaBase, string> = {
  1: "Se te mezcla el día: no está claro qué unidad cerrar primero.",
  2: "Ya vas a tope. No es flojera — es saturación. Hay que sumar algo liviano, no otra carga.",
  3: "Trabajas, apagas incendios, y al final no hay un número. El día se evapora.",
};

export interface VendedorTriageOpcion {
  id: string;
  label: string;
  planeta: PlanetaId;
  codigo: CodigoNumero;
}

export interface VendedorTriagePregunta {
  id: string;
  pregunta: string;
  opciones: VendedorTriageOpcion[];
}

/**
 * Q1 = qué le está costando el día (código semilla 1 / 2 / 3).
 * Q2 = matiz del mismo trío, sin salir de Jornada Base.
 */
export const VENDEDOR_TRIAGE_PREGUNTAS: VendedorTriagePregunta[] = [
  {
    id: "grieta",
    pregunta: "¿Qué te está costando más el día?",
    opciones: [
      {
        id: "niebla_unidad",
        label: "No sé qué cerrar primero — todo se me mezcla",
        planeta: "JORNADA",
        codigo: 1,
      },
      {
        id: "saturacion",
        label: "Ya estoy a tope — no doy para una cosa más",
        planeta: "JORNADA",
        codigo: 2,
      },
      {
        id: "dia_sin_cierre",
        label: "El día se me va — no tengo tiempo / solo apago incendios",
        planeta: "JORNADA",
        codigo: 3,
      },
    ],
  },
  {
    id: "matiz",
    pregunta: "¿En qué se te nota más hoy?",
    opciones: [
      {
        id: "jornada_empiezo_mil",
        label: "Empiezo mil cosas y no termino ninguna",
        planeta: "JORNADA",
        codigo: 1,
      },
      {
        id: "jornada_cada_cosa_pesa",
        label: "Cada cosa nueva me pesa — ya voy lleno",
        planeta: "JORNADA",
        codigo: 2,
      },
      {
        id: "jornada_no_puedo_decir",
        label: "Trabajo todo el día y no puedo decir qué cerré",
        planeta: "JORNADA",
        codigo: 3,
      },
    ],
  },
];

export interface FijacionVendedor {
  codigo: CodigoJornadaBase;
  planeta: PlanetaId;
  nombreCodigo: string;
  planetaLabel: string;
  grieta: string;
  metodoEntrada: string;
  /** Lectura humana del código (para la pantalla, no jerga). */
  resumenHumano: string;
  /** Pregunta disparadora del código (uso interno). */
  preguntaDisparadora: string;
  arquetipoNombre: string | null;
  trialHref: string;
  trialLabel: string;
  checkoutHref: string;
  checkoutLabel: string;
  color: string;
  fijadoEn: string;
  /** Puerta de venta activa (hoy siempre JORNADA). */
  puertaComercial: PlanetaId;
}

export type VendedorTriagePick = Pick<
  VendedorTriageOpcion,
  "planeta" | "codigo"
>;

/** Q2: solo el trío de Jornada Base (este corte no tiene otros planetas). */
export function opcionesMatizParaPlaneta(
  _planeta?: PlanetaId,
): VendedorTriageOpcion[] {
  const matiz = VENDEDOR_TRIAGE_PREGUNTAS.find((p) => p.id === "matiz");
  return matiz?.opciones ?? [];
}

/**
 * Resuelve fijación. Siempre Jornada Base; el código lo marca Q2 si existe.
 */
export function resolverTriageVendedor(
  picks: VendedorTriagePick[],
): FijacionVendedor {
  const grieta = picks[0];
  const matiz = picks[1];
  const planeta: PlanetaId = "JORNADA";
  const codigo = clampCodigoJornadaBase(
    matiz?.codigo ?? grieta?.codigo ?? 3,
  );

  const cfg = DICCIONARIO_CODIGOS[codigo];
  const planetaCfg = PLANETAS[planeta];
  const puerta = puertaComercialVendedor();

  return {
    codigo,
    planeta,
    nombreCodigo: cfg.nombre,
    planetaLabel: planetaCfg.label,
    grieta: planetaCfg.grieta,
    metodoEntrada: puerta.metodoEntrada,
    resumenHumano: RESUMEN_HUMANO_JORNADA[codigo],
    preguntaDisparadora: cfg.modoInterno.preguntaDisparadora,
    arquetipoNombre: cfg.modoExterno.arquetipoNombre,
    trialHref: puerta.trialHref,
    trialLabel: puerta.trialLabel,
    checkoutHref: puerta.checkoutHref,
    checkoutLabel: puerta.checkoutLabel,
    color: puerta.color,
    fijadoEn: new Date().toISOString(),
    puertaComercial: PUERTA_COMERCIAL_VENDEDOR,
  };
}

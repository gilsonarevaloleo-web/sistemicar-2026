/**
 * Vendedor Capa 1 — Triage determinista (sin Gemini).
 * 2 preguntas → fija Código + Planeta → CTAs.
 */

import {
  DICCIONARIO_CODIGOS,
  type CodigoNumero,
} from "../umbral/engineConfig.ts";
import {
  PLANETAS,
  type PlanetaId,
  CODIGOS_POR_PLANETA,
} from "./planetasConfig.ts";

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
 * Q1 = grieta → planeta + código semilla.
 * Q2 = matiz dentro del mismo planeta (se filtra en UI/resolver).
 */
export const VENDEDOR_TRIAGE_PREGUNTAS: VendedorTriagePregunta[] = [
  {
    id: "grieta",
    pregunta: "¿Qué te frena más ahora mismo?",
    opciones: [
      {
        id: "carga_emocional",
        label: "Carga emocional, culpa o dolor — no puedo pensar claro",
        planeta: "ESPEJO",
        codigo: 6,
      },
      {
        id: "tiempo_dispersion",
        label: "No tengo tiempo / me disperso / solo apago incendios",
        planeta: "JORNADA",
        codigo: 3,
      },
      {
        id: "miedo_vender",
        label: "Me trabo al vender, cobrar o exponerme",
        planeta: "UMBRAL",
        codigo: 1,
      },
    ],
  },
  {
    id: "matiz",
    pregunta: "¿Cuál de estas te describe mejor hoy?",
    opciones: [
      // ESPEJO
      {
        id: "espejo_miedo",
        label: "Ansiedad o miedo que me paraliza",
        planeta: "ESPEJO",
        codigo: 6,
      },
      {
        id: "espejo_trauma",
        label: "Me han quemado antes; desconfío de todo lo «bonito»",
        planeta: "ESPEJO",
        codigo: 4,
      },
      {
        id: "espejo_niebla",
        label: "Estoy en niebla: no sé ni qué me está frenando",
        planeta: "ESPEJO",
        codigo: 1,
      },
      // JORNADA
      {
        id: "jornada_tiempo",
        label: "«Después lo veo» — el día se me va sin cierre",
        planeta: "JORNADA",
        codigo: 3,
      },
      {
        id: "jornada_sobrecarga",
        label: "Ya tengo demasiado; no doy para una cosa más",
        planeta: "JORNADA",
        codigo: 2,
      },
      {
        id: "jornada_claridad",
        label: "No sé qué unidad cerrar primero hoy",
        planeta: "JORNADA",
        codigo: 1,
      },
      // UMBRAL
      {
        id: "umbral_utilidad",
        label: "No sé explicar para qué sirve lo mío en una frase",
        planeta: "UMBRAL",
        codigo: 1,
      },
      {
        id: "umbral_miedo",
        label: "Miedo al rechazo cuando ofrezco",
        planeta: "UMBRAL",
        codigo: 6,
      },
      {
        id: "umbral_precio",
        label: "Me cuesta cobrar / justificar el precio",
        planeta: "UMBRAL",
        codigo: 7,
      },
      {
        id: "umbral_numeros",
        label: "Me piden ROI y me quedo sin marco",
        planeta: "UMBRAL",
        codigo: 5,
      },
    ],
  },
];

export interface FijacionVendedor {
  codigo: CodigoNumero;
  planeta: PlanetaId;
  nombreCodigo: string;
  planetaLabel: string;
  grieta: string;
  metodoEntrada: string;
  /** Pregunta disparadora del código (conciencia, no pitch). */
  preguntaDisparadora: string;
  arquetipoNombre: string | null;
  trialHref: string;
  trialLabel: string;
  checkoutHref: string;
  checkoutLabel: string;
  color: string;
  fijadoEn: string;
}

export type VendedorTriagePick = Pick<
  VendedorTriageOpcion,
  "planeta" | "codigo"
>;

/** Opciones de Q2 filtradas por planeta elegido en Q1. */
export function opcionesMatizParaPlaneta(
  planeta: PlanetaId,
): VendedorTriageOpcion[] {
  const matiz = VENDEDOR_TRIAGE_PREGUNTAS.find((p) => p.id === "matiz");
  if (!matiz) return [];
  const allowed = new Set(CODIGOS_POR_PLANETA[planeta]);
  return matiz.opciones.filter(
    (o) => o.planeta === planeta && allowed.has(o.codigo),
  );
}

/**
 * Resuelve fijación Código + Planeta.
 * Regla: el planeta lo marca Q1 (grieta); el código lo marca Q2 si existe, si no el de Q1.
 */
export function resolverTriageVendedor(
  picks: VendedorTriagePick[],
): FijacionVendedor {
  const grieta = picks[0];
  const matiz = picks[1];
  const planeta = grieta?.planeta ?? "JORNADA";
  const codigo = (matiz?.codigo ?? grieta?.codigo ?? 3) as CodigoNumero;

  const cfg = DICCIONARIO_CODIGOS[codigo];
  const planetaCfg = PLANETAS[planeta];

  return {
    codigo,
    planeta,
    nombreCodigo: cfg.nombre,
    planetaLabel: planetaCfg.label,
    grieta: planetaCfg.grieta,
    metodoEntrada: planetaCfg.metodoEntrada,
    preguntaDisparadora: cfg.modoInterno.preguntaDisparadora,
    arquetipoNombre:
      planeta === "UMBRAL" ? cfg.modoExterno.arquetipoNombre : null,
    trialHref: planetaCfg.trialHref,
    trialLabel: planetaCfg.trialLabel,
    checkoutHref: planetaCfg.checkoutHref,
    checkoutLabel: planetaCfg.checkoutLabel,
    color: planetaCfg.color,
    fijadoEn: new Date().toISOString(),
  };
}

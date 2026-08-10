/**
 * Umbral — Micro-diagnóstico de entrada (embudo).
 * 3 preguntas → código/arquetipo probable + CTA trial.
 */

import type { CodigoNumero, ModoUmbral } from "./engineConfig.ts";
import { DICCIONARIO_CODIGOS, MODOS_UMBRAL } from "./engineConfig.ts";

export type UmbralDiagnosticoOpcionId =
  | "apatia"
  | "tiempo"
  | "desconfianza"
  | "precio"
  | "numeros"
  | "miedo"
  | "claridad_interna"
  | "seriedad_interna"
  | "justicia_interna";

export interface UmbralDiagnosticoOpcion {
  id: UmbralDiagnosticoOpcionId;
  label: string;
  codigo: CodigoNumero;
  modo: ModoUmbral;
}

export interface UmbralDiagnosticoPregunta {
  id: string;
  pregunta: string;
  opciones: UmbralDiagnosticoOpcion[];
}

export const UMBRAL_DIAGNOSTICO_PREGUNTAS: UmbralDiagnosticoPregunta[] = [
  {
    id: "friccion",
    pregunta: "¿Dónde se te traba más la tracción hoy?",
    opciones: [
      {
        id: "apatia",
        label: "No logro enganchar atención / utilidad",
        codigo: 1,
        modo: "EXTERNO_VENTAS",
      },
      {
        id: "tiempo",
        label: "Todo se posterga: «después lo veo»",
        codigo: 3,
        modo: "EXTERNO_VENTAS",
      },
      {
        id: "desconfianza",
        label: "Me leen humo / ya los han engañado",
        codigo: 4,
        modo: "EXTERNO_VENTAS",
      },
    ],
  },
  {
    id: "objecion",
    pregunta: "¿Cuál objeción te saca más del marco?",
    opciones: [
      {
        id: "precio",
        label: "«Está caro / no es justo»",
        codigo: 7,
        modo: "EXTERNO_VENTAS",
      },
      {
        id: "numeros",
        label: "«Muéstreme ROI, no historias»",
        codigo: 5,
        modo: "EXTERNO_VENTAS",
      },
      {
        id: "miedo",
        label: "Ansiedad / «no quiero complicarme»",
        codigo: 6,
        modo: "EXTERNO_VENTAS",
      },
    ],
  },
  {
    id: "modo",
    pregunta: "¿Qué necesitas forjar primero?",
    opciones: [
      {
        id: "claridad_interna",
        label: "Claridad interna: cortar la excusa puntual",
        codigo: 1,
        modo: "INTERNO_HABILIDAD",
      },
      {
        id: "seriedad_interna",
        label: "Seriedad: cero flor, ruta mínima/máxima",
        codigo: 4,
        modo: "INTERNO_HABILIDAD",
      },
      {
        id: "justicia_interna",
        label: "Justicia de cobrar / marcar territorio",
        codigo: 7,
        modo: "INTERNO_HABILIDAD",
      },
    ],
  },
];

export interface ResultadoDiagnosticoUmbral {
  codigo: CodigoNumero;
  modo: ModoUmbral;
  nombreCodigo: string;
  arquetipoNombre: string | null;
  recomendacion: string;
  modoLabel: string;
}

export type UmbralDiagnosticoPick = Pick<
  UmbralDiagnosticoOpcion,
  "codigo" | "modo"
>;

/**
 * Agrega votos de las opciones elegidas (una por pregunta) y elige el dominante.
 * Empate → código más alto (más avanzado = más crítico).
 */
export function resolverDiagnosticoUmbral(
  picks: UmbralDiagnosticoPick[],
): ResultadoDiagnosticoUmbral {
  const votes = new Map<string, { codigo: CodigoNumero; modo: ModoUmbral; n: number }>();

  for (const pick of picks) {
    const key = `${pick.modo}:${pick.codigo}`;
    const prev = votes.get(key);
    if (prev) prev.n += 1;
    else votes.set(key, { codigo: pick.codigo, modo: pick.modo, n: 1 });
  }

  let best: { codigo: CodigoNumero; modo: ModoUmbral; n: number } | null = null;
  for (const v of votes.values()) {
    if (
      !best ||
      v.n > best.n ||
      (v.n === best.n && v.codigo > best.codigo)
    ) {
      best = v;
    }
  }

  const codigo = best?.codigo ?? 1;
  const modo = best?.modo ?? "EXTERNO_VENTAS";
  const cfg = DICCIONARIO_CODIGOS[codigo];

  if (modo === "EXTERNO_VENTAS") {
    return {
      codigo,
      modo,
      nombreCodigo: cfg.nombre,
      arquetipoNombre: cfg.modoExterno.arquetipoNombre,
      recomendacion: cfg.modoExterno.misionVendedor,
      modoLabel: MODOS_UMBRAL.EXTERNO_VENTAS.label,
    };
  }

  return {
    codigo,
    modo,
    nombreCodigo: cfg.nombre,
    arquetipoNombre: null,
    recomendacion: cfg.modoInterno.criterioAprobacion,
    modoLabel: MODOS_UMBRAL.INTERNO_HABILIDAD.label,
  };
}

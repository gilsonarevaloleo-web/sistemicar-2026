/**
 * Umbral v2 — Métricas diagnósticas derivadas de sesiones.
 */

import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  MODOS_UMBRAL,
  type CodigoNumero,
  type ModoUmbral,
} from "./engineConfig.ts";
import { intentosPorCodigoDeSesion } from "./sessionLogic.ts";
import type { SesionUmbral } from "./sessionTypes.ts";

export interface FriccionCodigo {
  codigo: CodigoNumero;
  intentos: number;
}

export interface CuelloBotellaUmbral {
  codigo: CodigoNumero;
  intentos: number;
  modo: ModoUmbral;
  nombreCodigo: string;
  arquetipoNombre: string | null;
  recomendacion: string;
}

export interface MetricasDiagnosticasUmbral {
  totalSesiones: number;
  sesionesCompletadas: number;
  intentosTotales: number;
  /** 0–100: % de códigos aprobados al primer intento. */
  tasaCorteLimpio: number;
  codigosAprobados: number;
  cortesLimpios: number;
  cuelloBotella: CuelloBotellaUmbral | null;
  friccionForja: FriccionCodigo[];
  friccionArena: FriccionCodigo[];
}

function emptyFriccion(): FriccionCodigo[] {
  return CODIGOS_NUMERO.map((codigo) => ({ codigo, intentos: 0 }));
}

function recomendacionParaCodigo(
  codigo: CodigoNumero,
  modo: ModoUmbral,
): { arquetipoNombre: string | null; recomendacion: string } {
  const cfg = DICCIONARIO_CODIGOS[codigo];
  if (modo === "EXTERNO_VENTAS") {
    return {
      arquetipoNombre: cfg.modoExterno.arquetipoNombre,
      recomendacion: `Ante ${cfg.modoExterno.arquetipoNombre}: ${cfg.modoExterno.misionVendedor}`,
    };
  }
  return {
    arquetipoNombre: null,
    recomendacion: `En ${MODOS_UMBRAL.INTERNO_HABILIDAD.label}: ${cfg.modoInterno.criterioAprobacion}`,
  };
}

/**
 * Calcula el panel diagnóstico a partir del historial de sesiones del usuario.
 */
export function calcularMetricasUmbral(
  sesiones: SesionUmbral[],
): MetricasDiagnosticasUmbral {
  const friccionForja = emptyFriccion();
  const friccionArena = emptyFriccion();
  let codigosAprobados = 0;
  let cortesLimpios = 0;
  let intentosTotales = 0;

  for (const sesion of sesiones) {
    intentosTotales += sesion.intentosTotales;
    const mapa = intentosPorCodigoDeSesion(sesion);
    const friccion =
      sesion.modo === "INTERNO_HABILIDAD" ? friccionForja : friccionArena;

    for (const n of CODIGOS_NUMERO) {
      const intentos = mapa[n] ?? 0;
      if (intentos <= 0) continue;
      friccion[n - 1].intentos += intentos;
    }

    for (const h of sesion.historialCodigos) {
      codigosAprobados += 1;
      if (h.intentos <= 1) cortesLimpios += 1;
    }
  }

  const tasaCorteLimpio =
    codigosAprobados === 0
      ? 0
      : Math.round((cortesLimpios / codigosAprobados) * 1000) / 10;

  type Acc = { codigo: CodigoNumero; intentos: number; modo: ModoUmbral };
  let peor: Acc | null = null;
  const candidatos: Acc[] = [
    ...friccionForja.map((f) => ({
      codigo: f.codigo,
      intentos: f.intentos,
      modo: "INTERNO_HABILIDAD" as const,
    })),
    ...friccionArena.map((f) => ({
      codigo: f.codigo,
      intentos: f.intentos,
      modo: "EXTERNO_VENTAS" as const,
    })),
  ];
  for (const c of candidatos) {
    if (c.intentos <= 0) continue;
    if (
      !peor ||
      c.intentos > peor.intentos ||
      (c.intentos === peor.intentos && c.codigo > peor.codigo)
    ) {
      peor = c;
    }
  }

  let cuelloBotella: CuelloBotellaUmbral | null = null;
  if (peor && peor.intentos > 0) {
    const tip = recomendacionParaCodigo(peor.codigo, peor.modo);
    cuelloBotella = {
      codigo: peor.codigo,
      intentos: peor.intentos,
      modo: peor.modo,
      nombreCodigo: DICCIONARIO_CODIGOS[peor.codigo].nombre,
      arquetipoNombre: tip.arquetipoNombre,
      recomendacion: tip.recomendacion,
    };
  }

  return {
    totalSesiones: sesiones.length,
    sesionesCompletadas: sesiones.filter((s) => s.estado === "COMPLETADO")
      .length,
    intentosTotales,
    tasaCorteLimpio,
    codigosAprobados,
    cortesLimpios,
    cuelloBotella,
    friccionForja,
    friccionArena,
  };
}

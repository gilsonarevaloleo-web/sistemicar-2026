/**
 * Flujo de guardado del volcado en /esperanza.
 * G1 no espera Gemini ni Firebase: registra, muestra feedback y sigue.
 */

import {
  DICCIONARIO_GRADOS,
  mensajeMeritoDetectado,
  validarCapturaParaGrado,
  type CapturaVolcadoExpansiva,
  type DiagnosticoVolcado,
  type GradoMaestria,
} from "@shared/deposito/engineConfig";

export { mensajeMeritoDetectado };

export interface PlanGuardadoVolcado {
  bloquearUi: boolean;
  esperarGemini: boolean;
  esperarFirebase: boolean;
  exigirSesion: boolean;
}

export function planGuardadoVolcado(grado: GradoMaestria): PlanGuardadoVolcado {
  const esG1 = grado === 1;
  return {
    bloquearUi: !esG1,
    esperarGemini: !esG1,
    esperarFirebase: !esG1,
    exigirSesion: !esG1,
  };
}

/** G1 solo rechaza volcado vacío. Nunca pide fricción/sombra/hipótesis. */
export function errorGuardadoVolcado(
  captura: CapturaVolcadoExpansiva | string,
  grado: GradoMaestria,
): string | null {
  if (grado === 1) {
    const crudo =
      typeof captura === "string" ? captura : captura.volcadoCrudo ?? "";
    return crudo.trim() ? null : "volcadoCrudo es requerido";
  }
  return validarCapturaParaGrado(captura, grado);
}

export function promocionPorMerito(opts: {
  meritoReconocido?: boolean;
  gradoDetectado?: GradoMaestria;
  gradoActual: GradoMaestria;
  inspeccionQuery?: boolean;
}): GradoMaestria | null {
  if (opts.inspeccionQuery) return null;
  if (!opts.meritoReconocido) return null;
  const detectado = opts.gradoDetectado;
  if (!detectado || detectado <= opts.gradoActual) return null;
  return detectado;
}

export function felicitacionMerito(gradoDetectado: GradoMaestria): {
  grado: GradoMaestria;
  nombre: string;
  mensaje: string;
} {
  const ficha = DICCIONARIO_GRADOS[gradoDetectado];
  return {
    grado: ficha.grado,
    nombre: ficha.nombre,
    mensaje: mensajeMeritoDetectado(ficha.grado),
  };
}

export function diagnosticoPromueve(
  diagnostico: DiagnosticoVolcado | null | undefined,
  gradoActual: GradoMaestria,
  inspeccionQuery = false,
): GradoMaestria | null {
  return promocionPorMerito({
    meritoReconocido: diagnostico?.evaluacionGrado?.meritoReconocido,
    gradoDetectado: diagnostico?.evaluacionGrado?.gradoDetectado,
    gradoActual,
    inspeccionQuery,
  });
}

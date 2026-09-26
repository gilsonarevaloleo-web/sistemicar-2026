/**
 * Orquestación del Depósito V2: captura → Gemini (o fallback) → contrato JSON.
 * La usa Express (`/api/deposito/volcado` y `/api/deposito/evaluar`) y la
 * Netlify Function `evaluar-deposito`.
 */

import {
  isCodigoObservador,
  normalizarCapturaVolcado,
  normalizarGradoMaestria,
  procesarVolcadoAprendizajeConFuente,
  toDepositoEngineResponse,
  validarCapturaParaGrado,
  type CodigoObservador,
  type DepositoEngineResponse,
  type DiagnosticoVolcado,
  type GeminiVolcadoCaller,
  type GradoMaestria,
} from "./engineConfig.ts";

export function parseOjosHistoricos(raw: unknown): CodigoObservador[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n) => (typeof n === "string" ? Number(n.replace(/^C/i, "")) : n))
    .filter(isCodigoObservador);
}

export interface EvaluarDepositoInput {
  textoVolcado?: string;
  texto?: string;
  volcadoCrudo?: string;
  gradoUsuarioActual?: unknown;
  gradoMaestria?: unknown;
  grado?: unknown;
  friccionDetectada?: string;
  sombraOmision?: string;
  codigoHipotesis?: unknown;
  ojosHistoricos?: unknown;
  historialCodigos?: unknown;
  callGemini?: GeminiVolcadoCaller;
}

export interface EvaluarDepositoOk {
  ok: true;
  engine: DepositoEngineResponse;
  diagnostico: DiagnosticoVolcado;
  source: "gemini" | "local_fallback";
  gradoUsuarioActual: GradoMaestria;
  perfilPromovido: boolean;
}

export interface EvaluarDepositoErr {
  ok: false;
  status: 400;
  error: string;
}

export type EvaluarDepositoResult = EvaluarDepositoOk | EvaluarDepositoErr;

export async function evaluarDepositoVolcado(
  input: EvaluarDepositoInput,
): Promise<EvaluarDepositoResult> {
  const gradoUsuarioActual = normalizarGradoMaestria(
    input.gradoUsuarioActual ?? input.gradoMaestria ?? input.grado,
  );
  const captura = normalizarCapturaVolcado({
    textoVolcado: input.textoVolcado ?? input.texto,
    volcadoCrudo: input.volcadoCrudo,
    gradoMaestria: gradoUsuarioActual,
    friccionDetectada: input.friccionDetectada,
    sombraOmision: input.sombraOmision,
    codigoHipotesis: input.codigoHipotesis,
  });
  const errorCaptura = validarCapturaParaGrado(captura);
  if (errorCaptura) {
    const esVacio = errorCaptura.startsWith("volcadoCrudo");
    return {
      ok: false,
      status: 400,
      error: esVacio ? "El volcado no puede estar vacío." : errorCaptura,
    };
  }

  const ojosHistoricos = parseOjosHistoricos(
    input.ojosHistoricos ?? input.historialCodigos,
  );
  const resultado = await procesarVolcadoAprendizajeConFuente(
    captura.volcadoCrudo,
    {
      callGemini: input.callGemini,
      captura,
      gradoMaestria: captura.gradoMaestria,
      ojosHistoricos,
    },
  );
  const engine = toDepositoEngineResponse(resultado.diagnostico);
  const perfilPromovido =
    engine.evaluacionGrado.meritoReconocido &&
    engine.evaluacionGrado.gradoDetectado > gradoUsuarioActual;

  return {
    ok: true,
    engine,
    diagnostico: resultado.diagnostico,
    source: resultado.source,
    gradoUsuarioActual,
    perfilPromovido,
  };
}

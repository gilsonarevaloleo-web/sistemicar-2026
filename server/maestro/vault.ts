/**
 * Vault de prompts de los Maestros.
 *
 * Cómo se consigue que ningún cliente vea el system prompt:
 *
 * 1. El kernel NO vive en `shared/` ni en `client/`. Vite no lo
 *    mete en el JS del navegador. DevTools no puede extraerlo.
 * 2. POST /api/umbral/evaluar solo devuelve el veredicto (aprobado,
 *    feedback). Nunca el system ni el user armados para Gemini.
 * 3. `afirmarCuerpoSinPrompt` aborta si el JSON hacia el cliente
 *    contiene una firma del kernel.
 * 4. Producción puede inyectar SISTEMICAR_MAESTRO_KERNEL desde un
 *    secret. El cliente sigue sin una ruta que lo lea.
 */

import type {
  CodigoNumero,
  ModoUmbral,
  PromptEvaluacionInput,
} from "../../shared/umbral/engineConfig.ts";
import { FIRMAS_KERNEL_MAESTRO } from "./kernel.ts";
import {
  obtenerPromptEvaluacion,
  serializarPromptEvaluacion,
} from "./promptEvaluacion.ts";

export { FIRMAS_KERNEL_MAESTRO };

/** Metadatos públicos. El texto para Gemini no se reexpone por HTTP. */
export interface PromptMaestroSellado {
  readonly paraGemini: string;
  readonly nombreCodigo: string;
  readonly codigo: CodigoNumero;
  readonly modo: ModoUmbral;
}

export function contieneKernelMaestro(value: unknown): boolean {
  const text =
    typeof value === "string" ? value : safeJson(value);
  return FIRMAS_KERNEL_MAESTRO.some((firma) => text.includes(firma));
}

export function afirmarCuerpoSinPrompt(value: unknown): void {
  if (contieneKernelMaestro(value)) {
    throw new Error(
      "Fuga de kernel Maestro: la respuesta no puede contener el system prompt",
    );
  }
}

/**
 * Único punto de salida del system prompt hacia el modelo.
 * El caller (ruta Umbral) usa `paraGemini` y descarta el resto.
 */
export function sellarPromptEvaluacion(
  input: PromptEvaluacionInput,
  env: NodeJS.ProcessEnv = process.env,
): PromptMaestroSellado {
  const prompt = obtenerPromptEvaluacion(input, env);
  return {
    paraGemini: serializarPromptEvaluacion(prompt),
    nombreCodigo: prompt.nombreCodigo,
    codigo: prompt.codigo,
    modo: prompt.modo,
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

/**
 * Backend del Juez Serio (planeta 4).
 * Consume la constante y la función principales de
 * `shared/casas/codigo4/prompt.ts`.
 */

import type { Express, Request, Response } from "express";
import {
  CASA_CODIGO4_FIRMA,
  CASA_CODIGO4_MARCA,
  CASA_CODIGO4_NOMBRE,
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_VERSION,
  PROMPT_JUEZ_SERIO,
  buildJuezSerioPrompt,
} from "../shared/casas/codigo4/prompt.ts";
import {
  diagnosticarJuezSerioLocal,
  parseEyeCode,
  parseJuezSerioResult,
} from "../shared/casas/codigo4/motor.ts";
import type {
  EyeCode,
  JuezSerioInput,
  JuezSerioResult,
} from "../shared/casas/codigo4/types.ts";

export type JuezGeminiCaller = (
  prompt: string,
  maxTokens?: number,
  jsonMode?: boolean,
) => Promise<string>;

export interface JuezEngineDeps {
  callGemini?: JuezGeminiCaller;
}

export interface JuezEngineOk {
  ok: true;
  result: JuezSerioResult;
  source: "gemini" | "local_fallback";
  ritual: typeof CASA_CODIGO4_RITUAL;
  version: typeof CASA_CODIGO4_VERSION;
}

export interface JuezEngineErr {
  ok: false;
  status: 400;
  error: string;
}

export type JuezEngineResult = JuezEngineOk | JuezEngineErr;

export function normalizarInputJuez(body: unknown): JuezSerioInput | JuezEngineErr {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const friccion = String(
    raw.friccionDiaria ?? raw.volcado ?? raw.texto ?? "",
  ).trim();
  if (friccion.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Falta friccionDiaria: volcá la fricción del día.",
    };
  }
  const input: JuezSerioInput = { friccionDiaria: friccion };
  const max = parseEyeCode(
    raw.codigoConquistadoMax ?? raw.perimetro ?? raw.chasis,
  );
  if (max) input.codigoConquistadoMax = max;
  return input;
}

/**
 * Orquesta el dictamen: prompt maestro → Gemini → perímetro.
 * Si el modelo falla o se escapa, cae al motor local.
 */
export async function ejecutarJuezEngine(
  input: JuezSerioInput,
  callGemini?: JuezGeminiCaller,
): Promise<Omit<JuezEngineOk, "ok">> {
  const prompt = buildJuezSerioPrompt(input);
  const local = diagnosticarJuezSerioLocal(input);

  if (callGemini) {
    try {
      const raw = await callGemini(prompt, 2048, true);
      const parsed = parseJuezSerioResult(raw);
      if (parsed.ok) {
        return { result: parsed.result, source: "gemini", ritual: CASA_CODIGO4_RITUAL, version: CASA_CODIGO4_VERSION };
      }
    } catch {
      // reintento abajo
    }
    try {
      const raw2 = await callGemini(
        `${prompt}\n\nIMPORTANTE: responde SOLO el JSON con fase1_lectura y fase2_propuesta_solucion. requiereInversionCreditos=true. La directiva no sube de C_conquistado.`,
        2048,
        false,
      );
      const parsed2 = parseJuezSerioResult(raw2);
      if (parsed2.ok) {
        return { result: parsed2.result, source: "gemini", ritual: CASA_CODIGO4_RITUAL, version: CASA_CODIGO4_VERSION };
      }
    } catch (err) {
      console.warn(
        "[juezEngine] Gemini falló → fallback local:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return {
    result: local,
    source: "local_fallback",
    ritual: CASA_CODIGO4_RITUAL,
    version: CASA_CODIGO4_VERSION,
  };
}

export async function evaluarJuezEngine(
  body: unknown,
  callGemini?: JuezGeminiCaller,
): Promise<JuezEngineResult> {
  const input = normalizarInputJuez(body);
  if ("ok" in input && input.ok === false) return input;
  const out = await ejecutarJuezEngine(input, callGemini);
  return { ok: true, ...out };
}

export function registerJuezRoutes(
  app: Express,
  deps: JuezEngineDeps = {},
): void {
  const callGemini = deps.callGemini;

  app.get("/api/juez/meta", (_req: Request, res: Response) => {
    res.json({
      version: CASA_CODIGO4_VERSION,
      planeta: 4,
      nombre: CASA_CODIGO4_NOMBRE,
      marca: CASA_CODIGO4_MARCA,
      firma: CASA_CODIGO4_FIRMA,
      ritual: CASA_CODIGO4_RITUAL,
      endpoint: "POST /api/juez/evaluar",
      promptExport: "PROMPT_JUEZ_SERIO",
      promptFn: "buildJuezSerioPrompt",
      promptChars: PROMPT_JUEZ_SERIO.length,
      gemini: Boolean(callGemini),
      fallbackLocal: true,
      requiereInversionCreditos: true,
    });
  });

  app.post("/api/juez/evaluar", async (req: Request, res: Response) => {
    try {
      const resultado = await evaluarJuezEngine(req.body, callGemini);
      if (!resultado.ok) {
        return res.status(resultado.status).json({
          success: false,
          error: resultado.error,
          result: null,
        });
      }
      return res.status(200).json({
        success: true,
        result: resultado.result,
        source: resultado.source,
        ritual: resultado.ritual,
        version: resultado.version,
      });
    } catch (error) {
      console.error("[juez/evaluar]", error);
      return res.status(500).json({
        success: false,
        error: "Error procesando el dictamen del Juez Serio.",
        result: null,
      });
    }
  });
}

export type { EyeCode, JuezSerioInput, JuezSerioResult };

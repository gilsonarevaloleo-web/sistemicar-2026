/**
 * Netlify Function — POST /.netlify/functions/evaluar-deposito
 * Alias de producción: POST /api/deposito/evaluar
 *
 * Procesa el volcado crudo con Gemini (JSON DepositoEngineResponse).
 * Si gradoDetectado > gradoUsuarioActual, meritoReconocido/perfilPromovido
 * marcan la promoción del perfil (el cliente o la BD la persisten).
 */

import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { GEMINI_MODELS, collectGeminiApiKeys } from "../../shared/geminiConfig.ts";
import { evaluarDepositoVolcado } from "../../shared/deposito/evaluarVolcado.ts";
import type { GeminiVolcadoCaller } from "../../shared/deposito/engineConfig.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

function geminiKeys(): string[] {
  return collectGeminiApiKeys();
}

const callGemini: GeminiVolcadoCaller = async (
  prompt,
  maxTokens = 2048,
  jsonMode = false,
) => {
  const keys = geminiKeys();
  if (keys.length === 0) {
    throw new Error("Gemini no disponible: configura GEMINI_API_KEY");
  }
  const errors: string[] = [];
  for (const apiKey of keys) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const generationConfig: GenerationConfig = {
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        };
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        });
        const text = result.response.text();
        if (!text || !String(text).trim()) {
          throw new Error("Gemini devolvió texto vacío");
        }
        return text;
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${modelName}:${errMsg.slice(0, 120)}`);
        continue;
      }
    }
  }
  throw new Error(`Gemini no disponible: ${errors.join(" | ")}`);
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(event.body || "{}") as Record<string, unknown>;
    } catch {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: "JSON inválido." }),
      };
    }

    const resultado = await evaluarDepositoVolcado({
      textoVolcado:
        typeof parsed.textoVolcado === "string"
          ? parsed.textoVolcado
          : typeof parsed.texto === "string"
            ? parsed.texto
            : undefined,
      volcadoCrudo:
        typeof parsed.volcadoCrudo === "string" ? parsed.volcadoCrudo : undefined,
      gradoUsuarioActual:
        parsed.gradoUsuarioActual ?? parsed.gradoMaestria ?? parsed.grado,
      friccionDetectada:
        typeof parsed.friccionDetectada === "string"
          ? parsed.friccionDetectada
          : undefined,
      sombraOmision:
        typeof parsed.sombraOmision === "string" ? parsed.sombraOmision : undefined,
      codigoHipotesis: parsed.codigoHipotesis,
      ojosHistoricos: parsed.ojosHistoricos ?? parsed.historialCodigos,
      metricasJornada: parsed.metricasJornada,
      callGemini: geminiKeys().length > 0 ? callGemini : undefined,
    });

    if (!resultado.ok) {
      return {
        statusCode: resultado.status,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: resultado.error }),
      };
    }

    // Si evaluacionGrado.gradoDetectado > gradoUsuarioActual, el cliente/BD
    // promueve el perfil. Aqui se expone el contrato + la bandera de promoción.
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ...resultado.engine,
        perfilPromovido: resultado.perfilPromovido,
        gradoUsuarioActual: resultado.gradoUsuarioActual,
        source: resultado.source,
      }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[evaluar-deposito] Netlify Function:", error);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        error: "Error procesando el volcado perceptivo.",
        details: message,
      }),
    };
  }
};

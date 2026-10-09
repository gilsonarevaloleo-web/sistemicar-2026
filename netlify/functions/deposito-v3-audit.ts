/**
 * Netlify Function — POST /.netlify/functions/deposito-v3-audit
 * Alias de producción: POST /api/deposito/v3/audit
 */

import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { GEMINI_MODELS, collectGeminiApiKeys } from "../../shared/geminiConfig.ts";
import { evaluarDepositoV3 } from "../../shared/deposito/v3/evaluar.ts";
import type { GeminiAuditCaller } from "../../shared/deposito/v3/motor.ts";
import { DEPOSITO_V3_RITUAL } from "../../shared/deposito/v3/prompt.ts";
import { DEPOSITO_V3_VERSION } from "../../shared/deposito/v3/types.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

const callGemini: GeminiAuditCaller = async (
  prompt,
  maxTokens = 2048,
  jsonMode = false,
) => {
  const keys = collectGeminiApiKeys();
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

    const resultado = await evaluarDepositoV3({
      ...parsed,
      callGemini: collectGeminiApiKeys().length > 0 ? callGemini : undefined,
    });

    if (!resultado.ok) {
      return {
        statusCode: resultado.status,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          success: false,
          error: resultado.error,
          result: null,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        success: true,
        result: resultado.result,
        source: resultado.source,
        userTier: resultado.userTier,
        ritual: DEPOSITO_V3_RITUAL,
        version: DEPOSITO_V3_VERSION,
      }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[deposito-v3-audit] Netlify Function:", error);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        success: false,
        error: "Error procesando la auditoría V3.",
        details: message,
        result: null,
      }),
    };
  }
};

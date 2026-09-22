import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectGeminiApiKeys,
  geminiApiKeyConfigured,
} from "./geminiConfig.ts";

describe("collectGeminiApiKeys — Netlify / Express", () => {
  it("prioriza GEMINI_API_KEY sobre alias y VITE_", () => {
    const keys = collectGeminiApiKeys({
      GEMINI_API_KEY: "AIzaSyCANONICA_1234567890",
      GOOGLE_API_KEY: "AIzaSyGOOGLE_ALIAS_1234567",
      VITE_GEMINI_API_KEY: "AIzaSyVITE_CLIENT_12345678",
      AI_INTEGRATIONS_GEMINI_API_KEY: "AIzaSyAI_INTEG_1234567890",
    });
    assert.equal(keys[0], "AIzaSyCANONICA_1234567890");
    assert.equal(keys.length, 4);
  });

  it("ignora vacías, cortas y _DUMMY", () => {
    const keys = collectGeminiApiKeys({
      GEMINI_API_KEY: "   ",
      GOOGLE_API_KEY: "corta",
      VITE_GEMINI_API_KEY: "_DUMMY_gemini",
      AI_INTEGRATIONS_GEMINI_API_KEY: "AIzaSyVALIDA_RUNTIME_KEY99",
    });
    assert.deepEqual(keys, ["AIzaSyVALIDA_RUNTIME_KEY99"]);
    assert.equal(geminiApiKeyConfigured({ GEMINI_API_KEY: "x" }), false);
    assert.equal(
      geminiApiKeyConfigured({ GEMINI_API_KEY: "AIzaSyVALIDA_RUNTIME_KEY99" }),
      true,
    );
  });

  it("lee GEMINI_API_KEY aunque el resto no esté (Netlify Site env)", () => {
    assert.deepEqual(
      collectGeminiApiKeys({ GEMINI_API_KEY: "AIzaSyNETLIFY_SITE_ENV_01" }),
      ["AIzaSyNETLIFY_SITE_ENV_01"],
    );
  });
});

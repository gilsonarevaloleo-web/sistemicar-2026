import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { registerDepositoV2Routes } from "./depositoV2Routes.ts";

async function withServer(
  callGemini:
    | ((prompt: string, maxTokens?: number, jsonMode?: boolean) => Promise<string>)
    | undefined,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  registerDepositoV2Routes(app, {
    ...(callGemini ? { callGemini } : {}),
  });
  const server = await new Promise<import("http").Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  const base = `http://127.0.0.1:${addr.port}`;
  try {
    await run(base);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

describe("Depósito v2 — POST /api/deposito/volcado", () => {
  it("GET /api/deposito/meta expone los 10 ojos y el ritual", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/meta`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ritual, "¿Qué aprendí hoy?");
      assert.equal(body.ojos.length, 10);
      assert.match(body.muroDeDominancia, /UN solo Código Dominante/);
      assert.equal(body.fallbackLocal, true);
      assert.equal(body.gemini, false);
    });
  });

  it("rechaza volcado vacío", async () => {
    await withServer(async () => "{}", async (base) => {
      const res = await fetch(`${base}/api/deposito/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.error, /textoVolcado/);
    });
  });

  it("devuelve un solo código dominante desde Gemini", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          codigoDominante: 5,
          nombreOjoDominante: "El Ojo del Cálculo",
          justificacionDominante: "El relato pide cifras, no clima.",
          puntoCiego: "Navega por sensación.",
          devolucionMaestro: "Espejo. R2. Veredicto.",
          mecanicaAbsorcion: "Mañana anotá tres cifras reales.",
          nivelCargaSugerido: "INTERMEDIO",
        }),
      async (base) => {
        const res = await fetch(`${base}/api/deposito/volcado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            textoVolcado:
              "Hoy sentí que iba bien pero no anoté ni una tasa ni un monto.",
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.source, "gemini");
        assert.equal(body.diagnostico.codigoDominante, 5);
        assert.equal(body.diagnostico.nombreOjoDominante, "El Ojo del Cálculo");
        assert.equal(typeof body.diagnostico.mecanicaAbsorcion, "string");
      },
    );
  });

  it("cae a local si Gemini rompe el JSON", async () => {
    await withServer(async () => "esto no es json", async (base) => {
      const res = await fetch(`${base}/api/deposito/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textoVolcado:
            "Hoy evité la puerta por miedo al rechazo y ensayé la llamada en la cabeza sin contacto.",
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.source, "local_fallback");
      assert.equal(body.diagnostico.codigoDominante, 6);
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { registerDepositoV3Routes } from "./depositoV3Routes.ts";

async function withServer(
  callGemini:
    | ((prompt: string, maxTokens?: number, jsonMode?: boolean) => Promise<string>)
    | undefined,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  registerDepositoV3Routes(app, {
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

const PATRON_PISTON =
  "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite.";

describe("Depósito V3 — GET /api/deposito/v3/meta", () => {
  it("expone versión, ritual, 10 ojos alias y que no hay muro", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/v3/meta`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.version, "3.0.0-optica-sintaxis");
      assert.equal(body.endpoint, "POST /api/deposito/v3/audit");
      assert.equal(body.ritual, "¿Qué aprendí hoy?");
      assert.equal(body.muroDeDominancia, false);
      assert.equal(body.fallbackLocal, true);
      assert.equal(body.gemini, false);
      assert.equal(body.ojos.length, 10);
      assert.equal(body.ojos[0].canon, "Cimiento");
      assert.equal(body.ojos[0].planeta, "Claridad");
      assert.equal(body.tiers.MATRICULA, 4);
    });
  });
});

describe("Depósito V3 — POST /api/deposito/v3/audit", () => {
  it("rechaza volcado vacío", async () => {
    await withServer(async () => "{}", async (base) => {
      const res = await fetch(`${base}/api/deposito/v3/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userTier: "FREE" }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.error, /rawFact/);
    });
  });

  it("devuelve óptica + carácter + Δ desde Gemini", async () => {
    await withServer(
      async (prompt) => {
        assert.match(String(prompt), /LUZ VIENE DE ARRIBA/);
        return JSON.stringify({
          perceptionEye: 7,
          characterSignedCode: 3,
          activeEyeMap: { "3": true, "7": true },
          eyeAudits: {
            "3": {
              eyeId: 3,
              hasIntention: true,
              hasRealVision: true,
              isBlindSpot: true,
            },
          },
          deltaGap: 4,
          syntaxDiagnostic: {
            detectedSyntaxCode: 3,
            syntaxCharacteristics: "Horas y pistón.",
          },
          groundingStatus: {
            isFullyGrounded: false,
            frictionPoint: 3,
            diagnosticMessage: "Óptica C7, chasis C3.",
          },
          systemicAnalysis: {
            isLatencyEvent: false,
            isSystemicConflict: false,
            realEngineeringCause: "Patrón narrado, secuencia rota.",
          },
          immediateAdjustment: "Tres pasos con hora de corte.",
        });
      },
      async (base) => {
        const res = await fetch(`${base}/api/deposito/v3/audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawFact: PATRON_PISTON,
            userTier: "MATRICULA",
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.source, "gemini");
        assert.equal(body.result.perceptionEye, 7);
        assert.equal(body.result.characterSignedCode, 3);
        assert.equal(body.result.deltaGap, 4);
        assert.equal(body.userTier, "MATRICULA");
        assert.equal(body.version, "3.0.0-optica-sintaxis");
      },
    );
  });

  it("cae a local si Gemini rompe el JSON", async () => {
    await withServer(async () => "esto no es json", async (base) => {
      const res = await fetch(`${base}/api/deposito/v3/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawFact: PATRON_PISTON }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.source, "local_fallback");
      assert.equal(body.result.perceptionEye, 7);
      assert.equal(body.result.characterSignedCode, 3);
    });
  });

  it("rechaza Carrera sin flor/sombra", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/v3/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawFact: PATRON_PISTON,
          userTier: "CARRERA",
        }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.error, /detectedNoise|omittedShadow/);
    });
  });
});

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
      assert.equal(body.version, "3.7.0-pedagogia-escritura");
      assert.equal(body.endpoint, "POST /api/deposito/v3/audit");
      assert.equal(body.ritual, "¿Qué aprendí hoy?");
      assert.equal(body.muroDeDominancia, false);
      assert.equal(body.viaUnica, "sintaxis");
      assert.equal(body.fallbackLocal, true);
      assert.equal(body.gradoConsistencia.windowSize, 10);
      assert.equal(body.gradoConsistencia.tituloRate, 0.7);
      assert.equal(body.firmaSintactica.windowSize, 10);
      assert.equal(body.firmaSintactica.tituloMinSample, 7);
      assert.match(body.firmaSintactica.sintaxisValida, /isCableadoConnected/);
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

  it("devuelve firma + mapa de carácter desde Gemini", async () => {
    await withServer(
      async (prompt) => {
        assert.match(String(prompt), /FOCO DE REVELACIÓN|focoRevelacionCode/);
        assert.match(String(prompt), /Syntax & Character Master Engine/);
        assert.match(String(prompt), /ADAPT TO THE USER'S NATURAL LANGUAGE/);
        assert.match(String(prompt), /Deep Intent Syntax Auditor/);
        assert.match(String(prompt), /Cold Telemetry Auditor/);
        assert.match(String(prompt), /Do NOT force or simulate activation of higher codes/);
        assert.doesNotMatch(String(prompt), /perceptionEye/);
        return JSON.stringify({
          characterSignedCode: 3,
          focoRevelacionCode: 7,
          activeCharacterMap: { "3": true, "7": true },
          syntacticVacios: [1, 2, 4, 5, 6, 8, 9, 10],
          syntaxDiagnostic: {
            detectedSyntaxCode: 3,
            focoCode: 7,
            isCableadoConnected: true,
            syntaxCharacteristics: "Transición de C3 hacia la ley C7.",
          },
          groundingStatus: {
            isFullyGrounded: true,
            diagnosticMessage: "Secuencia cableada al patrón.",
          },
          immediateAdjustment: "Tu quiebre real está en la Ley (C7).",
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
        assert.equal(body.result.characterSignedCode, 3);
        assert.equal(body.result.focoRevelacionCode, 7);
        assert.equal(body.result.activeCharacterMap[3], true);
        assert.equal(body.result.syntaxDiagnostic.isCableadoConnected, true);
        assert.equal(body.userTier, "MATRICULA");
        assert.equal(body.version, "3.7.0-pedagogia-escritura");
        assert.equal(body.result.perceptionEye, undefined);
        assert.equal(body.result.deltaGap, undefined);
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
      assert.equal(body.result.characterSignedCode, 3);
      assert.equal(body.result.activeCharacterMap[3], true);
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

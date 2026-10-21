import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import {
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_VERSION,
  PROMPT_JUEZ_SERIO,
  buildJuezSerioPrompt,
} from "../shared/casas/codigo4/prompt.ts";
import {
  ejecutarJuezEngine,
  evaluarJuezEngine,
  registerJuezRoutes,
} from "./juezEngine.ts";

const VOLCADO =
  "Hoy corrí el día en automático. Bloque, bloque, apagando incendios. El pistón no paró.";

async function withServer(
  callGemini:
    | ((prompt: string, maxTokens?: number, jsonMode?: boolean) => Promise<string>)
    | undefined,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  registerJuezRoutes(app, {
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

describe("juezEngine — consume prompt.ts", () => {
  it("buildJuezSerioPrompt incluye la constante principal", () => {
    const prompt = buildJuezSerioPrompt({ friccionDiaria: VOLCADO });
    assert.ok(prompt.startsWith(PROMPT_JUEZ_SERIO));
    assert.match(prompt, /LEY DEL PERÍMETRO DE RECURSOS/);
    assert.match(prompt, /hoy corrí el día en automático/i);
  });

  it("sin Gemini cae al fallback local y sella C4/C3", async () => {
    const out = await ejecutarJuezEngine({ friccionDiaria: VOLCADO });
    assert.equal(out.source, "local_fallback");
    assert.equal(out.version, CASA_CODIGO4_VERSION);
    assert.equal(out.ritual, CASA_CODIGO4_RITUAL);
    assert.equal(out.result.fase1_lectura.codigoProblemaDetectado, 4);
    assert.equal(out.result.fase1_lectura.codigoConquistadoMax, 3);
    assert.equal(out.result.fase2_propuesta_solucion.requiereInversionCreditos, true);
  });

  it("Gemini recibe el prompt maestro y el parse sella el perímetro", async () => {
    const out = await ejecutarJuezEngine(
      { friccionDiaria: VOLCADO, codigoConquistadoMax: 3 },
      async (prompt) => {
        assert.ok(String(prompt).includes(PROMPT_JUEZ_SERIO.slice(0, 80)));
        assert.match(String(prompt), /fase1_lectura/);
        return JSON.stringify({
          fase1_lectura: {
            codigoProblemaDetectado: 7,
            codigoConquistadoMax: 3,
            fugaInconsciente: "Nombra patrón sin sostenerlo.",
            lecturaPerimetroFrancia: "Problema C7. Chasis C3.",
          },
          fase2_propuesta_solucion: {
            requiereInversionCreditos: false,
            directivaOperacional: "Encontrá tu visión estratégica y rediseñá el sistema.",
          },
        });
      },
    );
    assert.equal(out.source, "gemini");
    assert.equal(out.result.fase2_propuesta_solucion.requiereInversionCreditos, true);
    assert.doesNotMatch(
      out.result.fase2_propuesta_solucion.directivaOperacional,
      /visión estratégica|sistema/i,
    );
  });

  it("rechaza volcado vacío", async () => {
    const bad = await evaluarJuezEngine({});
    assert.equal(bad.ok, false);
    if (bad.ok) return;
    assert.equal(bad.status, 400);
  });
});

describe("juezEngine — HTTP", () => {
  it("GET /api/juez/meta expone el export principal", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/juez/meta`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.version, CASA_CODIGO4_VERSION);
      assert.equal(body.planeta, 4);
      assert.equal(body.promptExport, "PROMPT_JUEZ_SERIO");
      assert.equal(body.promptFn, "buildJuezSerioPrompt");
      assert.equal(body.promptChars, PROMPT_JUEZ_SERIO.length);
      assert.equal(body.endpoint, "POST /api/juez/evaluar");
      assert.equal(body.gemini, false);
    });
  });

  it("POST /api/juez/evaluar dictamina el volcado", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/juez/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friccionDiaria: VOLCADO }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.source, "local_fallback");
      assert.equal(body.result.fase1_lectura.codigoProblemaDetectado, 4);
      assert.equal(body.result.fase2_propuesta_solucion.requiereInversionCreditos, true);
    });
  });
});

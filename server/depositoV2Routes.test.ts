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
      assert.equal(body.grados.length, 4);
      assert.equal(body.grados[0].nombre, "Aprendiz de Ojo");
      assert.equal(body.placementTest, true);
      assert.equal(body.temperamentos.length, 4);
      assert.equal(body.grados[0].temperamento, "Nutritivo / Inercia");
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
      assert.match(body.error, /vacío|textoVolcado/);
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
        assert.equal(body.gradoMaestria, 1);
        assert.equal(body.engine.ojoDominante.codigo, "C5");
        assert.equal(typeof body.gradoDetectado, "number");
        assert.equal(typeof body.meritoReconocido, "boolean");
        assert.ok(body.engine.evaluacionGrado);
        assert.ok(body.engine.metricasMerito);
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

  it("rechaza Grado 2 sin friccionDetectada", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textoVolcado: "Hoy aprendí una utilidad concreta.",
          gradoMaestria: 2,
        }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.error, /friccionDetectada/);
    });
  });

  it("acepta captura de Grado 2 y devuelve validacionGrado", async () => {
    await withServer(
      async (prompt) => {
        assert.match(String(prompt), /DETECTOR DE RUIDO/);
        return JSON.stringify({
          codigoDominante: 4,
          nombreOjoDominante: "El Ojo de la Seriedad",
          justificacionDominante: "Hay flor cubriendo el quiebre.",
          puntoCiego: "No nombra la interrupción.",
          devolucionMaestro: "Espejo. R2. Veredicto.",
          mecanicaAbsorcion: "Mañana nombrá el quiebre.",
          nivelCargaSugerido: "INTERMEDIO",
          validacionGrado: {
            gradoEvaluado: 2,
            ruidoDetectadoCorrectamente: true,
            comentarioMaestro: "Aisló la flor.",
          },
        });
      },
      async (base) => {
        const res = await fetch(`${base}/api/deposito/volcado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            textoVolcado: "Hoy cubrí el quiebre con «ya veré».",
            gradoMaestria: 2,
            friccionDetectada: "La flor fue «ya veré».",
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.gradoMaestria, 2);
        assert.equal(body.diagnostico.validacionGrado.gradoEvaluado, 2);
        assert.equal(
          body.diagnostico.validacionGrado.ruidoDetectadoCorrectamente,
          true,
        );
      },
    );
  });

  it("placement: lectura seca desde G1 devuelve gradoDetectado 3 y mérito", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textoVolcado:
            "Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.",
          gradoMaestria: 1,
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.source, "local_fallback");
      assert.equal(body.gradoMaestria, 1);
      assert.equal(body.gradoDetectado, 3);
      assert.equal(body.meritoReconocido, true);
      assert.equal(body.engine.evaluacionGrado.gradoDetectado, 3);
      assert.equal(body.diagnostico.evaluacionGrado.meritoReconocido, true);
      assert.equal(body.engine.metricasMerito.metacognicionDetectada, true);
    });
  });

  it("costura/botones no inyecta plantilla C6 de miedo social", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textoVolcado:
            "Hoy a las 8:10 aprendí que el botón no entra si la tensión no cierra el encaje. Usé la máquina de coser. Corté 12 botones. Ajusté la tensión del hilo a 4. Cosí el segundo. Armé la prenda. Medí el ojal. El sesgo: yo suelo forzar la pieza. No lo hice. Dijo: \"papá el botón no entra así\". No dije «después veo mañana». Cerré a las 8:40.",
          gradoMaestria: 1,
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      const blob = JSON.stringify(body);
      assert.doesNotMatch(blob, /miedo al rechazo/);
      assert.doesNotMatch(blob, /contacto social/);
      assert.doesNotMatch(blob, /cuerpo en la puerta/i);
      assert.ok(body.gradoDetectado >= 3 || body.engine.evaluacionGrado.gradoDetectado >= 3);
      assert.ok(body.engine.metricasMerito.densidadEstructural > 75);
      assert.doesNotMatch(body.diagnostico.devolucionMaestro, /reescrib/i);
      assert.doesNotMatch(body.diagnostico.devolucionMaestro, /todavía es ruido/i);
    });
  });
});

describe("Depósito v2 — POST /api/deposito/evaluar", () => {
  it("devuelve DepositoEngineResponse y promociona G1→G3 en lectura seca", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textoVolcado:
            "Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.",
          gradoUsuarioActual: 1,
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.match(body.ojoDominante.codigo, /^C\d+$/);
      assert.ok(Array.isArray(body.puntoCiego.florDetectada));
      assert.equal(typeof body.mecanicaAbsorcion.instruccionUnica, "string");
      assert.equal(body.evaluacionGrado.gradoDetectado, 3);
      assert.equal(body.evaluacionGrado.meritoReconocido, true);
      assert.equal(body.perfilPromovido, true);
      assert.equal(body.gradoUsuarioActual, 1);
    });
  });

  it("rechaza volcado vacío", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/deposito/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradoUsuarioActual: 1 }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /vacío/);
    });
  });
});

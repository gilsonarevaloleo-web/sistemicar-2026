import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { registerUmbralV2Routes } from "./umbralV2Routes.ts";
import { createMemoryUmbralSessionStore } from "./umbralSessionStore.ts";

async function withServer(
  callGemini:
    | ((prompt: string, maxTokens?: number, jsonMode?: boolean) => Promise<string>)
    | undefined,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  const sessionStore = createMemoryUmbralSessionStore();
  registerUmbralV2Routes(app, {
    ...(callGemini ? { callGemini } : {}),
    sessionStore,
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

describe("Umbral v2 — POST /api/umbral/evaluar", () => {
  it("rechaza payload incompleto con contrato JSON", async () => {
    await withServer(async () => "{}", async (base) => {
      const res = await fetch(`${base}/api/umbral/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "INTERNO_HABILIDAD" }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.aprobado, false);
      assert.ok(typeof body.feedbackConfrontativo === "string");
    });
  });

  it("aprueba y avanza al siguiente código", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          aprobado: true,
          feedbackConfrontativo: "Excusa puntual nombrada. Avanzas.",
          codigoSiguiente: 99,
        }),
      async (base) => {
        const res = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u1",
            modo: "INTERNO_HABILIDAD",
            codigoActual: 1,
            respuestaUsuario:
              "La excusa puntual es revisar el celular cada vez que voy a vender.",
            historialPrevio: [{ rol: "system", texto: "Código 1 activo" }],
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.aprobado, true);
        assert.equal(body.codigoEvaluado, 1);
        assert.equal(body.codigoSiguiente, 2);
        assert.equal(body.moduloCompletado, false);
        assert.equal(body.source, "gemini");
      },
    );
  });

  it("tolera alias feedback y aún aprueba/rechaza", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          aprobado: false,
          feedback: "Sigue siendo vago. Nombra UNA excusa.",
        }),
      async (base) => {
        const res = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u1",
            modo: "EXTERNO_VENTAS",
            codigoActual: 3,
            respuestaUsuario: "el cliente no quiere",
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.aprobado, false);
        assert.equal(body.codigoSiguiente, 3);
        assert.match(body.feedbackConfrontativo, /vago|excusa/i);
        assert.equal(body.source, "gemini");
      },
    );
  });

  it("código 10 aprobado completa el módulo", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          aprobado: true,
          feedbackConfrontativo: "Dominio asumido. Módulo cerrado.",
          codigoSiguiente: null,
        }),
      async (base) => {
        const res = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u1",
            modo: "INTERNO_HABILIDAD",
            codigoActual: 10,
            respuestaUsuario: "Asumo el rol. Yo marco el estándar.",
          }),
        });
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.aprobado, true);
        assert.equal(body.codigoSiguiente, null);
        assert.equal(body.moduloCompletado, true);
      },
    );
  });

  it("si Gemini falla, usa fallback local (200, no rompe UI)", async () => {
    await withServer(
      async () => {
        throw new Error("timeout from upstream");
      },
      async (base) => {
        const res = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u1",
            modo: "INTERNO_HABILIDAD",
            codigoActual: 2,
            respuestaUsuario:
              "Desglosé la limitación en tres piezas y hoy uso el apalancamiento de mi lista de contactos para una acción mínima.",
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.source, "local_fallback");
        assert.ok(body.feedbackConfrontativo.length > 0);
      },
    );
  });

  it("si Gemini devuelve basura, reintenta y cae a local si hace falta", async () => {
    let calls = 0;
    await withServer(
      async () => {
        calls += 1;
        return "no soy json valido";
      },
      async (base) => {
        const res = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u1",
            modo: "INTERNO_HABILIDAD",
            codigoActual: 1,
            respuestaUsuario: "intento corto sin densidad",
          }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.source, "local_fallback");
        assert.ok(calls >= 2, "debe reintentar sin jsonMode");
      },
    );
  });

  it("persiste intento en sesión y permite listar/detalle", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          aprobado: true,
          feedbackConfrontativo: "Excusa puntual. Avanzas.",
          codigoSiguiente: 2,
        }),
      async (base) => {
        const evalRes = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u-persist",
            modo: "INTERNO_HABILIDAD",
            codigoActual: 1,
            respuestaUsuario:
              "La excusa puntual es revisar el celular cada vez que voy a vender.",
          }),
        });
        assert.equal(evalRes.status, 200);
        const evalBody = await evalRes.json();
        assert.equal(evalBody.success, true);
        assert.ok(evalBody.sesionId);
        assert.equal(evalBody.sesion.estado, "EN_PROGRESO");
        assert.equal(evalBody.sesion.historialCodigos.length, 1);
        assert.equal(evalBody.sesion.codigoActual, 2);

        const listRes = await fetch(
          `${base}/api/umbral/sesiones?userId=u-persist`,
        );
        assert.equal(listRes.status, 200);
        const listBody = await listRes.json();
        assert.equal(listBody.success, true);
        assert.equal(listBody.sesiones.length, 1);
        assert.equal(listBody.metricas.codigosAprobados, 1);
        assert.equal(listBody.metricas.tasaCorteLimpio, 100);
        assert.deepEqual(listBody.progreso.porModo.INTERNO_HABILIDAD.superados, [
          1,
        ]);
        assert.equal(listBody.progreso.porModo.INTERNO_HABILIDAD.siguiente, 2);
        assert.equal(evalBody.codigoRecomendado, 2);
        assert.equal(evalBody.progreso.logros.length, 1);

        const detRes = await fetch(
          `${base}/api/umbral/sesion/${evalBody.sesionId}?userId=u-persist`,
        );
        assert.equal(detRes.status, 200);
        const detBody = await detRes.json();
        assert.equal(detBody.sesion.id, evalBody.sesionId);
        assert.match(
          detBody.sesion.historialCodigos[0].respuestaAprobada,
          /celular/i,
        );
      },
    );
  });

  it("GET sesiones exige userId", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/api/umbral/sesiones`);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });

  it("GET sesion/:id protege por userId", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          aprobado: false,
          feedbackConfrontativo: "Vago.",
          codigoSiguiente: 1,
        }),
      async (base) => {
        const evalRes = await fetch(`${base}/api/umbral/evaluar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "owner",
            modo: "EXTERNO_VENTAS",
            codigoActual: 1,
            respuestaUsuario: "respuesta corta",
          }),
        });
        const evalBody = await evalRes.json();
        const foreign = await fetch(
          `${base}/api/umbral/sesion/${evalBody.sesionId}?userId=otro`,
        );
        assert.equal(foreign.status, 404);
      },
    );
  });
});

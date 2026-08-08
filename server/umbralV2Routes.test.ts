import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { registerUmbralV2Routes } from "./umbralV2Routes.ts";

async function withServer(
  callGemini: (prompt: string, maxTokens?: number, jsonMode?: boolean) => Promise<string>,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  registerUmbralV2Routes(app, { callGemini });
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
        // Regla de servidor ignora el 99 de Gemini.
        assert.equal(body.codigoSiguiente, 2);
        assert.equal(body.moduloCompletado, false);
      },
    );
  });

  it("si no aprueba, permanece en codigoActual", async () => {
    await withServer(
      async () =>
        JSON.stringify({
          aprobado: false,
          feedbackConfrontativo: "Sigue siendo vago. Nombra UNA excusa.",
          codigoSiguiente: null,
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

  it("error de Gemini devuelve 500 con contrato JSON", async () => {
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
            respuestaUsuario: "desglosé la limitación en tres piezas",
          }),
        });
        assert.equal(res.status, 500);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.codigoSiguiente, 2);
        assert.ok(body.feedbackConfrontativo.length > 0);
      },
    );
  });
});

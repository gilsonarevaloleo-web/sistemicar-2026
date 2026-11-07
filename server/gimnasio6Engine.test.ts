import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { createMemoryJuezWallet } from "./services/juezCreditos.ts";
import { createMemoryUmbral5Store } from "./services/umbral5Store.ts";
import { createMemoryGimnasio6Store } from "./services/gimnasio6Store.ts";
import { registerUmbral5Routes } from "./umbral5Engine.ts";
import { registerGimnasio6Routes, type Gimnasio6EngineDeps } from "./gimnasio6Engine.ts";
import { CASA_UMBRAL5_RITUAL } from "../shared/casas/umbral5/prompt.ts";

const VOLCADO =
  "El Juez dijo que mi aumento está débil para poder ser vendedor. Ya sé cuál es mi límite. No hice nada.";

async function withServer(
  run: (base: string, userId: string) => Promise<void>,
  gymDeps: Partial<Gimnasio6EngineDeps> = {},
) {
  const app = express();
  app.use(express.json());
  const userId = "u-gym";
  const umbral5Store = createMemoryUmbral5Store();
  const gymStore = createMemoryGimnasio6Store();
  const wallet = createMemoryJuezWallet({ [userId]: 4 });
  registerUmbral5Routes(app, { wallet, store: umbral5Store });
  registerGimnasio6Routes(app, { store: gymStore, umbral5Store, ...gymDeps });
  const server = await new Promise<import("http").Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  const base = `http://127.0.0.1:${addr.port}`;
  try {
    await run(base, userId);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

describe("gimnasio6Engine — capa profunda del límite", () => {
  it("no abre sin mapa; con mapa de vendedor abre una pregunta; no cambia el ritual", async () => {
    await withServer(async (base, userId) => {
      const meta = await fetch(`${base}/api/casas/gimnasio6/meta`).then((r) => r.json());
      assert.equal(meta.ritualEntrada, CASA_UMBRAL5_RITUAL);
      assert.equal(meta.creditos.abrir, 0);

      const sinMapa = await fetch(`${base}/api/casas/gimnasio6/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sesionUmbral5Id: "no-existe" }),
      });
      assert.equal(sinMapa.status, 404);

      const volcado = await fetch(`${base}/api/casas/umbral5/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, limiteConocido: VOLCADO }),
      }).then((r) => r.json());
      const prematuro = await fetch(`${base}/api/casas/gimnasio6/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sesionUmbral5Id: volcado.sesionUmbral5Id }),
      });
      assert.equal(prematuro.status, 409);

      await fetch(`${base}/api/casas/umbral5/lectura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sesionUmbral5Id: volcado.sesionUmbral5Id }),
      });

      const abierto = await fetch(`${base}/api/casas/gimnasio6/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sesionUmbral5Id: volcado.sesionUmbral5Id }),
      }).then((r) => r.json());
      assert.equal(abierto.success, true);
      assert.equal(abierto.ritualEntrada, "¿Cuál es tu límite?");
      assert.match(abierto.pregunta.pregunta, /1 al 10/);
      assert.doesNotMatch(abierto.pregunta.pregunta, /conocimiento sobre tu producto/);

      const niebla = await fetch(`${base}/api/casas/gimnasio6/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          libroId: abierto.libro.id,
          respuesta: "más o menos",
        }),
      }).then((r) => r.json());
      assert.equal(niebla.libro.puntero.variante, 1);
      assert.equal(niebla.libro.puntero.indice, 1);
      assert.match(niebla.pregunta.escenario, /más o menos/);
      assert.doesNotMatch(JSON.stringify(niebla), /fallaste/);

      const pasa = await fetch(`${base}/api/casas/gimnasio6/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          libroId: abierto.libro.id,
          respuesta: "Me posiciono en un 7.",
        }),
      }).then((r) => r.json());
      assert.equal(pasa.libro.puntero.indice, 2);
      assert.match(pasa.copia, /Me posiciono en un 7/);
    });
  });

  it("Gemini no puede dejar al alumno en la misma pregunta si ya contestó con sustancia", async () => {
    await withServer(
      async (base, userId) => {
        const abierto = await abrirLibroListo(base, userId);
        const primero = await fetch(`${base}/api/casas/gimnasio6/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            libroId: abierto.libro.id,
            respuesta: "Me posiciono en un 7.",
          }),
        }).then((r) => r.json());
        assert.equal(primero.libro.puntero.indice, 1);
        assert.equal(primero.libro.puntero.variante, 1);
        assert.match(primero.pregunta.escenario, /Me posiciono en un 7/);

        const segundo = await fetch(`${base}/api/casas/gimnasio6/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            libroId: abierto.libro.id,
            respuesta: "Sigo en un 7, con el producto delante.",
          }),
        }).then((r) => r.json());
        assert.equal(segundo.libro.puntero.indice, 2);
        assert.equal(segundo.success, true);
      },
      {
        callGemini: async () => JSON.stringify({ pasa: false, motivo: "Sin roce." }),
      },
    );
  });

  it("si Gemini se cuelga, el turno se guarda con el motor local", async () => {
    await withServer(
      async (base, userId) => {
        const abierto = await abrirLibroListo(base, userId);
        const pasa = await fetch(`${base}/api/casas/gimnasio6/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            libroId: abierto.libro.id,
            respuesta: "Me posiciono en un 7.",
          }),
        }).then((r) => r.json());
        assert.equal(pasa.success, true);
        assert.equal(pasa.libro.puntero.indice, 2);
        assert.match(pasa.copia, /Me posiciono en un 7/);
      },
      {
        geminiTimeoutMs: 30,
        callGemini: () => new Promise(() => {}),
      },
    );
  });
});

async function abrirLibroListo(base: string, userId: string) {
  const volcado = await fetch(`${base}/api/casas/umbral5/volcado`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, limiteConocido: VOLCADO }),
  }).then((r) => r.json());
  await fetch(`${base}/api/casas/umbral5/lectura`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, sesionUmbral5Id: volcado.sesionUmbral5Id }),
  });
  return fetch(`${base}/api/casas/gimnasio6/abrir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, sesionUmbral5Id: volcado.sesionUmbral5Id }),
  }).then((r) => r.json());
}

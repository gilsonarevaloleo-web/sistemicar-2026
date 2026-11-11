import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { createMemoryJuezWallet } from "./services/juezCreditos.ts";
import { createMemoryUmbral5Store } from "./services/umbral5Store.ts";
import { createMemoryGimnasio6Store } from "./services/gimnasio6Store.ts";
import { registerUmbral5Routes } from "./umbral5Engine.ts";
import { registerGimnasio6Routes, abrirLibroVendedor, responderGimnasio, type Gimnasio6EngineDeps } from "./gimnasio6Engine.ts";
import { recursosVacios } from "../shared/casas/gimnasio6/motor.ts";
import type { LibroGimnasio } from "../shared/casas/gimnasio6/types.ts";
import { CASA_UMBRAL5_RITUAL } from "../shared/casas/umbral5/prompt.ts";

const VOLCADO =
  "El Juez dijo que mi aumento está débil para poder ser vendedor. Ya sé cuál es mi límite. No hice nada.";

const VOLCADO_C2 =
  "Si me ven vendiendo me critican. Miedo a la exposición pública. No salgo a la luz.";

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
  it("no abre sin peso; con cinco volcados de exposición abre una pregunta", async () => {
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

      const primero = await fetch(`${base}/api/casas/umbral5/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, limiteConocido: VOLCADO_C2 }),
      }).then((r) => r.json());
      const prematuro = await fetch(`${base}/api/casas/gimnasio6/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sesionUmbral5Id: primero.sesionUmbral5Id }),
      });
      assert.equal(prematuro.status, 409);
      const prematuroBody = await prematuro.json();
      assert.equal(prematuroBody.codigo, "SIN_PESO");

      let ultimo = primero;
      for (let i = 0; i < 4; i += 1) {
        ultimo = await fetch(`${base}/api/casas/umbral5/volcado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, limiteConocido: VOLCADO_C2 }),
        }).then((r) => r.json());
      }

      const abierto = await fetch(`${base}/api/casas/gimnasio6/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sesionUmbral5Id: ultimo.sesionUmbral5Id }),
      }).then((r) => r.json());
      assert.equal(abierto.success, true);
      assert.equal(abierto.ritualEntrada, "¿Cuál es tu límite?");
      assert.equal(abierto.libro.modulo, "limite");
      assert.equal(abierto.libro.puntero.capitulo, 2);
      assert.match(abierto.pregunta.pregunta, /quién te está mirando/i);
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
          respuesta: "Mi vecina Laura me está mirando desde el balcón.",
        }),
      }).then((r) => r.json());
      assert.equal(pasa.libro.puntero.indice, 2);
      assert.match(pasa.copia, /Laura/);
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
            respuesta: "Mi vecina Laura me está mirando desde el balcón.",
          }),
        }).then((r) => r.json());
        assert.equal(primero.libro.puntero.indice, 1);
        assert.equal(primero.libro.puntero.variante, 1);
        assert.match(primero.pregunta.escenario, /Laura/);

        const segundo = await fetch(`${base}/api/casas/gimnasio6/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            libroId: abierto.libro.id,
            respuesta: "Sigo: Laura me mira y no me voy del cuarto.",
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
            respuesta: "Mi vecina Laura me está mirando desde el balcón.",
          }),
        }).then((r) => r.json());
        assert.equal(pasa.success, true);
        assert.equal(pasa.libro.puntero.indice, 2);
        assert.match(pasa.copia, /Laura/);
      },
      {
        geminiTimeoutMs: 30,
        callGemini: () => new Promise(() => {}),
      },
    );
  });

  it("si el store perdió el libro, lo recupera del snapshot y avanza", async () => {
    const snapshot: LibroGimnasio = {
      id: "lib-perdido",
      userId: "u-gym",
      sesionUmbral5Id: "s1",
      modulo: "limite",
      limiteOrigen: VOLCADO,
      recursos: recursosVacios(),
      puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
      estado: "ABIERTO",
      capituloSelladoDia: null,
      capitulosSellados: [],
      turnos: [],
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    };
    const vacio = createMemoryGimnasio6Store();
    const sinSnapshot = await responderGimnasio(
      "u-gym",
      snapshot.id,
      "Me posiciono en un 2.",
      { store: vacio },
    );
    assert.equal(sinSnapshot.ok, false);
    if (!sinSnapshot.ok) assert.equal(sinSnapshot.codigo, "LIBRO_NO_ENCONTRADO");

    const conSnapshot = await responderGimnasio(
      "u-gym",
      snapshot.id,
      "Me posiciono en un 2.",
      { store: vacio },
      snapshot,
    );
    assert.equal(conSnapshot.ok, true);
    if (conSnapshot.ok) {
      assert.equal(conSnapshot.libro.puntero.indice, 2);
      assert.match(conSnapshot.copia, /Me posiciono en un 2/);
    }
  });

  it("la puerta B abre sin peso y con C1 Cortador, no cimiento", async () => {
    const store = createMemoryGimnasio6Store();
    const abierto = await abrirLibroVendedor("u-gym", "Tengo que vender y me trabo.", {
      store,
    });
    assert.equal(abierto.ok, true);
    if (!abierto.ok) return;
    assert.equal(abierto.libro.modulo, "vendedor");
    assert.equal(abierto.libro.puntero.capitulo, 1);
    assert.match(abierto.pregunta?.pregunta ?? "", /frase/i);
    assert.doesNotMatch(abierto.pregunta?.pregunta ?? "", /quién sos vos/i);

    const otra = await abrirLibroVendedor("u-gym", "otro texto", { store });
    assert.equal(otra.ok, true);
    if (otra.ok) assert.equal(otra.libro.id, abierto.libro.id);
  });
});

async function abrirLibroListo(base: string, userId: string) {
  let ultimo: { sesionUmbral5Id?: string } = {};
  for (let i = 0; i < 5; i += 1) {
    ultimo = await fetch(`${base}/api/casas/umbral5/volcado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, limiteConocido: VOLCADO_C2 }),
    }).then((r) => r.json());
  }
  return fetch(`${base}/api/casas/gimnasio6/abrir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, sesionUmbral5Id: ultimo.sesionUmbral5Id }),
  }).then((r) => r.json());
}

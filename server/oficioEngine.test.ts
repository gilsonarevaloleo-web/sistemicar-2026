import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import {
  CASA_OFICIO_RITUAL_CORTO,
  CASA_OFICIO_VERSION,
} from "../shared/umbral/oficioCasa.ts";
import {
  createMemoryOficioStore,
  normalizarInputOficio,
  registerOficioRoutes,
} from "./oficioEngine.ts";

async function withServer(run: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  registerOficioRoutes(app, { store: createMemoryOficioStore() });
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

describe("oficioEngine — volcado gratis", () => {
  it("rechaza volcado vacío", () => {
    const bad = normalizarInputOficio({});
    assert.equal(bad.ok, false);
    if (bad.ok === false) {
      assert.equal(bad.status, 400);
      assert.equal(bad.codigo, "VOLCADO_VACIO");
    }
  });

  it("GET /api/casas/oficio/meta expone la matriz del 5", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/casas/oficio/meta`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        ritual: string;
        matriz: { numero: number; marca: string }[];
        endpoints: { volcado: string };
        creditos: { volcado: number };
      };
      assert.equal(body.ritual, CASA_OFICIO_RITUAL_CORTO);
      assert.equal(body.matriz.length, 10);
      assert.equal(body.matriz[4]?.marca, "Cálculo");
      assert.equal(body.endpoints.volcado, "POST /api/casas/oficio/volcado");
      assert.equal(body.creditos.volcado, 0);
    });
  });

  it("POST /api/casas/oficio/volcado lee el oficio y no cobra", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/casas/oficio/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "u-oficio",
          textoVolcado:
            "Entrego el servicio de mi oficio. No tengo cuenta. No sé cuánto vale lo que hago.",
        }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        success: boolean;
        creditosDescontados: number;
        lectura: { codigo: number; marca: string; lecturaFria: string };
        ritual: string;
        version: string;
      };
      assert.equal(body.success, true);
      assert.equal(body.creditosDescontados, 0);
      assert.equal(body.lectura.codigo, 5);
      assert.equal(body.lectura.marca, "Cálculo");
      assert.match(body.lectura.lecturaFria, /C5 Oficio · Cálculo/);
      assert.doesNotMatch(body.lectura.lecturaFria, /\/limite/);
      assert.equal(body.ritual, CASA_OFICIO_RITUAL_CORTO);
      assert.equal(body.version, CASA_OFICIO_VERSION);
    });
  });
});

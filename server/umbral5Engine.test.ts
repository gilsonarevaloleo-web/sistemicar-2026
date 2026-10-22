import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import {
  CASA_UMBRAL5_RITUAL,
  CASA_UMBRAL5_VERSION,
  PROMPT_UMBRAL5,
  buildUmbral5Prompt,
} from "../shared/casas/umbral5/prompt.ts";
import { CREDITO_LECTURA_MAPA } from "../shared/casas/umbral5/creditos.ts";
import { createMemoryJuezWallet } from "./services/juezCreditos.ts";
import { createMemoryUmbral5Store } from "./services/umbral5Store.ts";
import {
  ejecutarLecturaMapa,
  ejecutarVolcadoGratis,
  normalizarInputUmbral5,
  registerUmbral5Routes,
} from "./umbral5Engine.ts";

const VOLCADO =
  "El Juez dijo que mi aumento está débil para poder ser vendedor. Ya sé cuál es mi límite. No hice nada.";

async function withServer(
  opts: {
    callGemini?: (
      prompt: string,
      maxTokens?: number,
      jsonMode?: boolean,
    ) => Promise<string>;
    saldo?: number;
    userId?: string;
  },
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  const userId = opts.userId ?? "u-test";
  const wallet = createMemoryJuezWallet(
    opts.saldo != null ? { [userId]: opts.saldo } : { [userId]: 4 },
  );
  registerUmbral5Routes(app, {
    ...(opts.callGemini ? { callGemini: opts.callGemini } : {}),
    wallet,
    store: createMemoryUmbral5Store(),
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

describe("umbral5Engine — consume prompt.ts", () => {
  it("buildUmbral5Prompt incluye la constante principal", () => {
    const prompt = buildUmbral5Prompt({ limiteConocido: VOLCADO });
    assert.ok(prompt.startsWith(PROMPT_UMBRAL5));
    assert.match(prompt, /EL LÍMITE YA ESTÁ NOMBRADO/);
    assert.match(prompt, /aumento está débil/);
  });

  it("rechaza volcado vacío", () => {
    const bad = normalizarInputUmbral5({});
    assert.equal("ok" in bad && bad.ok === false, true);
    if ("ok" in bad && bad.ok === false) {
      assert.equal(bad.status, 400);
      assert.equal(bad.codigo, "VOLCADO_VACIO");
    }
  });
});

describe("umbral5Engine — volcado gratis y lectura", () => {
  it("el volcado no cobra y no entrega mapa", async () => {
    const wallet = createMemoryJuezWallet({ u1: 3 });
    const store = createMemoryUmbral5Store();
    const out = await ejecutarVolcadoGratis("u1", VOLCADO, { wallet, store });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.creditosDescontados, 0);
    assert.equal(out.saldo, 3);
    assert.equal(out.ritual, CASA_UMBRAL5_RITUAL);
    assert.equal(out.version, CASA_UMBRAL5_VERSION);
    assert.equal("lectura" in out, false);
    const sesion = await store.getById(out.sesionUmbral5Id);
    assert.equal(sesion?.estado, "VOLCADO_GRATIS");
    assert.equal(sesion?.lectura, null);
  });

  it("la lectura cobra 1 crédito y sienta C1 en el caso del aumento", async () => {
    const wallet = createMemoryJuezWallet({ u1: 2 });
    const store = createMemoryUmbral5Store();
    const volcado = await ejecutarVolcadoGratis("u1", VOLCADO, { wallet, store });
    assert.equal(volcado.ok, true);
    if (!volcado.ok) return;
    const lectura = await ejecutarLecturaMapa("u1", volcado.sesionUmbral5Id, {
      wallet,
      store,
    });
    assert.equal(lectura.ok, true);
    if (!lectura.ok) return;
    assert.equal(lectura.creditosDescontados, CREDITO_LECTURA_MAPA);
    assert.equal(lectura.saldo, 1);
    assert.equal(lectura.lectura.codigoUsuario, 1);
    assert.equal(lectura.source, "local_fallback");
    const otra = await ejecutarLecturaMapa("u1", volcado.sesionUmbral5Id, {
      wallet,
      store,
    });
    assert.equal(otra.ok, true);
    if (!otra.ok) return;
    assert.equal(otra.creditosDescontados, 0);
    assert.equal(otra.saldo, 1);
  });

  it("sin saldo responde 402 y no sella el mapa", async () => {
    const wallet = createMemoryJuezWallet({ u1: 0 });
    const store = createMemoryUmbral5Store();
    const volcado = await ejecutarVolcadoGratis("u1", VOLCADO, { wallet, store });
    assert.equal(volcado.ok, true);
    if (!volcado.ok) return;
    const lectura = await ejecutarLecturaMapa("u1", volcado.sesionUmbral5Id, {
      wallet,
      store,
    });
    assert.equal(lectura.ok, false);
    if (lectura.ok) return;
    assert.equal(lectura.status, 402);
    assert.equal(lectura.codigo, "SALDO_INSUFICIENTE");
    const sesion = await store.getById(volcado.sesionUmbral5Id);
    assert.equal(sesion?.lectura, null);
    assert.equal(sesion?.estado, "VOLCADO_GRATIS");
  });

  it("Gemini C10 cae al fallback local", async () => {
    const wallet = createMemoryJuezWallet({ u1: 2 });
    const store = createMemoryUmbral5Store();
    const volcado = await ejecutarVolcadoGratis("u1", VOLCADO, { wallet, store });
    assert.equal(volcado.ok, true);
    if (!volcado.ok) return;
    const lectura = await ejecutarLecturaMapa("u1", volcado.sesionUmbral5Id, {
      wallet,
      store,
      callGemini: async (prompt) => {
        assert.ok(String(prompt).includes(PROMPT_UMBRAL5.slice(0, 80)));
        return JSON.stringify({
          codigoUsuario: 10,
          pisoIntento: 1,
          tipoLimite: "impronta",
          lecturaFria: "Origen.",
          porQueNoEjecuta: "C10.",
        });
      },
    });
    assert.equal(lectura.ok, true);
    if (!lectura.ok) return;
    assert.equal(lectura.source, "local_fallback");
    assert.notEqual(lectura.lectura.codigoUsuario, 10);
  });

  it("sesión ajena no se lee", async () => {
    const wallet = createMemoryJuezWallet({ u1: 2, u2: 2 });
    const store = createMemoryUmbral5Store();
    const volcado = await ejecutarVolcadoGratis("u1", VOLCADO, { wallet, store });
    assert.equal(volcado.ok, true);
    if (!volcado.ok) return;
    const lectura = await ejecutarLecturaMapa("u2", volcado.sesionUmbral5Id, {
      wallet,
      store,
    });
    assert.equal(lectura.ok, false);
    if (lectura.ok) return;
    assert.equal(lectura.status, 404);
    assert.equal(lectura.codigo, "SESION_AJENA");
  });
});

describe("umbral5Engine — HTTP", () => {
  it("GET /api/casas/umbral5/saldo y meta", async () => {
    await withServer({ saldo: 7, userId: "u-http" }, async (base) => {
      const saldo = await fetch(`${base}/api/casas/umbral5/saldo?userId=u-http`);
      assert.equal(saldo.status, 200);
      const saldoBody = await saldo.json();
      assert.equal(saldoBody.success, true);
      assert.equal(saldoBody.saldo, 7);

      const meta = await fetch(`${base}/api/casas/umbral5/meta`);
      assert.equal(meta.status, 200);
      const metaBody = await meta.json();
      assert.equal(metaBody.version, CASA_UMBRAL5_VERSION);
      assert.equal(metaBody.planeta, 5);
      assert.equal(metaBody.promptExport, "PROMPT_UMBRAL5");
      assert.equal(metaBody.endpoints.volcado, "POST /api/casas/umbral5/volcado");
      assert.equal(metaBody.creditos.lectura, CREDITO_LECTURA_MAPA);
      assert.equal(metaBody.creditos.volcado, 0);
      assert.deepEqual(metaBody.dominioUsuario, [1, 2, 3, 5, 6, 7]);
    });
  });

  it("POST volcado es gratis y lectura cobra", async () => {
    await withServer({ saldo: 2, userId: "u-http" }, async (base) => {
      const volcado = await fetch(`${base}/api/casas/umbral5/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "u-http", limiteConocido: VOLCADO }),
      });
      assert.equal(volcado.status, 200);
      const body1 = await volcado.json();
      assert.equal(body1.success, true);
      assert.equal(body1.creditosDescontados, 0);
      assert.equal(body1.saldo, 2);
      assert.equal(body1.lectura, undefined);

      const lectura = await fetch(`${base}/api/casas/umbral5/lectura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "u-http",
          sesionUmbral5Id: body1.sesionUmbral5Id,
        }),
      });
      assert.equal(lectura.status, 200);
      const body2 = await lectura.json();
      assert.equal(body2.success, true);
      assert.equal(body2.creditosDescontados, 1);
      assert.equal(body2.saldo, 1);
      assert.equal(body2.lectura.codigoUsuario, 1);
      assert.notEqual(body2.lectura.codigoUsuario, 10);
    });
  });

  it("POST lectura 402 si no hay saldo", async () => {
    await withServer({ saldo: 0, userId: "u-http" }, async (base) => {
      const volcado = await fetch(`${base}/api/casas/umbral5/volcado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "u-http", limiteConocido: VOLCADO }),
      });
      const body1 = await volcado.json();
      const lectura = await fetch(`${base}/api/casas/umbral5/lectura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "u-http",
          sesionUmbral5Id: body1.sesionUmbral5Id,
        }),
      });
      assert.equal(lectura.status, 402);
      const body2 = await lectura.json();
      assert.equal(body2.codigo, "SALDO_INSUFICIENTE");
    });
  });
});

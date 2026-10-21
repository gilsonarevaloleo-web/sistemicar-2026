import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import {
  CASA_CODIGO4_RITUAL,
  CASA_CODIGO4_VERSION,
  PROMPT_JUEZ_SERIO,
  buildJuezSerioPrompt,
} from "../shared/casas/codigo4/prompt.ts";
import { CREDITO_FASE1_LECTURA, CREDITO_FASE2_SOLUCION } from "../shared/casas/codigo4/creditos.ts";
import { createMemoryJuezWallet } from "./services/juezCreditos.ts";
import { createMemoryJuezStore } from "./services/juezStore.ts";
import {
  ejecutarFase1,
  ejecutarFase2,
  ejecutarJuezEngine,
  evaluarJuezEngine,
  registerJuezRoutes,
} from "./juezEngine.ts";

const VOLCADO =
  "Hoy corrí el día en automático. Bloque, bloque, apagando incendios. El pistón no paró.";

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
  registerJuezRoutes(app, {
    ...(opts.callGemini ? { callGemini: opts.callGemini } : {}),
    wallet,
    store: createMemoryJuezStore(),
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
            lecturaPerimetroFria: "Problema C7. Chasis C3.",
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

describe("juezEngine — fases y créditos", () => {
  it("Fase 1 cobra, oculta la directiva y persiste el diagnóstico", async () => {
    const wallet = createMemoryJuezWallet({ u1: 3 });
    const store = createMemoryJuezStore();
    const fase1 = await ejecutarFase1("u1", VOLCADO, { wallet, store });
    assert.equal(fase1.ok, true);
    if (!fase1.ok) return;
    assert.equal(fase1.creditosDescontados, CREDITO_FASE1_LECTURA);
    assert.equal(fase1.saldo, 3 - CREDITO_FASE1_LECTURA);
    assert.equal(fase1.fase1_lectura.codigoProblemaDetectado, 4);
    assert.equal("fase2_propuesta_solucion" in fase1, false);
    assert.equal("directivaOperacional" in fase1, false);
    const sesion = await store.getById(fase1.sesionJuezId);
    assert.ok(sesion);
    assert.ok(sesion?.fase2.directivaOperacional);
    assert.equal(sesion?.estado, "FASE1");
  });

  it("Fase 1 sin saldo responde 402", async () => {
    const wallet = createMemoryJuezWallet({ u1: 0 });
    const fase1 = await ejecutarFase1("u1", VOLCADO, {
      wallet,
      store: createMemoryJuezStore(),
    });
    assert.equal(fase1.ok, false);
    if (fase1.ok) return;
    assert.equal(fase1.status, 402);
    assert.equal(fase1.codigo, "SALDO_INSUFICIENTE");
    assert.equal(fase1.fase, 1);
  });

  it("Fase 2 cobra y desbloquea la directiva", async () => {
    const wallet = createMemoryJuezWallet({ u1: 2 });
    const store = createMemoryJuezStore();
    const fase1 = await ejecutarFase1("u1", VOLCADO, { wallet, store });
    assert.equal(fase1.ok, true);
    if (!fase1.ok) return;
    const fase2 = await ejecutarFase2("u1", fase1.sesionJuezId, { wallet, store });
    assert.equal(fase2.ok, true);
    if (!fase2.ok) return;
    assert.equal(fase2.creditosDescontados, CREDITO_FASE2_SOLUCION);
    assert.equal(fase2.fase2_propuesta_solucion.requiereInversionCreditos, true);
    assert.match(fase2.fase2_propuesta_solucion.directivaOperacional, /pistón|paso|caudal|postura/);
    const otra = await ejecutarFase2("u1", fase1.sesionJuezId, { wallet, store });
    assert.equal(otra.ok, true);
    if (!otra.ok) return;
    assert.equal(otra.creditosDescontados, 0);
  });

  it("Fase 2 sin saldo responde 402 y no filtra la directiva", async () => {
    const wallet = createMemoryJuezWallet({ u1: CREDITO_FASE1_LECTURA });
    const store = createMemoryJuezStore();
    const fase1 = await ejecutarFase1("u1", VOLCADO, { wallet, store });
    assert.equal(fase1.ok, true);
    if (!fase1.ok) return;
    const fase2 = await ejecutarFase2("u1", fase1.sesionJuezId, { wallet, store });
    assert.equal(fase2.ok, false);
    if (fase2.ok) return;
    assert.equal(fase2.status, 402);
    assert.equal(fase2.codigo, "SALDO_INSUFICIENTE");
    assert.equal("directivaOperacional" in fase2, false);
  });
});

describe("juezEngine — HTTP", () => {
  it("GET /api/casas/codigo4/meta expone fases y créditos", async () => {
    await withServer({}, async (base) => {
      const res = await fetch(`${base}/api/casas/codigo4/meta`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.version, CASA_CODIGO4_VERSION);
      assert.equal(body.planeta, 4);
      assert.equal(body.promptExport, "PROMPT_JUEZ_SERIO");
      assert.equal(body.endpoints.fase1, "POST /api/casas/codigo4/fase1");
      assert.equal(body.creditos.fase1, CREDITO_FASE1_LECTURA);
    });
  });

  it("POST /api/casas/codigo4/fase1 no entrega la directiva", async () => {
    await withServer({ saldo: 3, userId: "u-http" }, async (base) => {
      const res = await fetch(`${base}/api/casas/codigo4/fase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "u-http", friccionDiaria: VOLCADO }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.sesionJuezId);
      assert.equal(body.fase1_lectura.codigoProblemaDetectado, 4);
      assert.equal(body.fase2_propuesta_solucion, undefined);
      assert.ok(!JSON.stringify(body).includes("directivaOperacional"));
    });
  });

  it("POST fase2 desbloquea y 402 si no hay saldo", async () => {
    await withServer({ saldo: 1, userId: "u-http" }, async (base) => {
      const f1 = await fetch(`${base}/api/casas/codigo4/fase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "u-http", friccionDiaria: VOLCADO }),
      });
      const body1 = await f1.json();
      const f2 = await fetch(`${base}/api/casas/codigo4/fase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "u-http",
          sesionJuezId: body1.sesionJuezId,
        }),
      });
      assert.equal(f2.status, 402);
      const body2 = await f2.json();
      assert.equal(body2.codigo, "SALDO_INSUFICIENTE");
      assert.equal(body2.fase, 2);
    });
  });
});

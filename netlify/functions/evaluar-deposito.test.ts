import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HandlerEvent } from "@netlify/functions";
import { handler } from "./evaluar-deposito.ts";

function event(partial: Partial<HandlerEvent>): HandlerEvent {
  return {
    rawUrl: "http://localhost/.netlify/functions/evaluar-deposito",
    rawQuery: "",
    path: "/.netlify/functions/evaluar-deposito",
    httpMethod: "POST",
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    ...partial,
  };
}

describe("Netlify Function evaluar-deposito", () => {
  it("rechaza métodos que no son POST", async () => {
    const res = await handler(event({ httpMethod: "GET" }), {} as never);
    assert.ok(res);
    assert.equal(res.statusCode, 405);
  });

  it("rechaza volcado vacío", async () => {
    const res = await handler(
      event({ body: JSON.stringify({ gradoUsuarioActual: 1 }) }),
      {} as never,
    );
    assert.ok(res);
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(String(res.body));
    assert.match(body.error, /vacío/);
  });

  it("devuelve DepositoEngineResponse y promociona G1 seco a G3", async () => {
    const res = await handler(
      event({
        body: JSON.stringify({
          textoVolcado:
            "Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.",
          gradoUsuarioActual: 1,
        }),
      }),
      {} as never,
    );
    assert.ok(res);
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(String(res.body));
    assert.match(body.ojoDominante.codigo, /^C\d+$/);
    assert.ok(body.ojoDominante.nombre.startsWith("El Ojo"));
    assert.equal(typeof body.puntoCiego.loNoDicho, "string");
    assert.ok(Array.isArray(body.puntoCiego.florDetectada));
    assert.equal(typeof body.mecanicaAbsorcion.instruccionUnica, "string");
    assert.equal(body.evaluacionGrado.gradoDetectado, 3);
    assert.equal(body.evaluacionGrado.meritoReconocido, true);
    assert.equal(body.perfilPromovido, true);
    assert.equal(body.gradoUsuarioActual, 1);
    assert.equal(body.source, "local_fallback");
  });
});

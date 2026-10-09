import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HandlerEvent } from "@netlify/functions";
import { handler } from "../netlify/functions/deposito-v3-audit.ts";

function event(partial: Partial<HandlerEvent>): HandlerEvent {
  return {
    rawUrl: "http://localhost/.netlify/functions/deposito-v3-audit",
    rawQuery: "",
    path: "/.netlify/functions/deposito-v3-audit",
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

describe("Netlify Function deposito-v3-audit", () => {
  it("rechaza métodos que no son POST", async () => {
    const res = await handler(event({ httpMethod: "GET" }), {} as never);
    assert.ok(res);
    assert.equal(res.statusCode, 405);
  });

  it("rechaza volcado vacío", async () => {
    const res = await handler(
      event({ body: JSON.stringify({ userTier: "FREE" }) }),
      {} as never,
    );
    assert.ok(res);
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(String(res.body));
    assert.match(body.error, /rawFact/);
  });

  it("devuelve dictamen V3 por fallback local", async () => {
    const res = await handler(
      event({
        body: JSON.stringify({
          rawFact:
            "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite.",
          userTier: "MATRICULA",
        }),
      }),
      {} as never,
    );
    assert.ok(res);
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(String(res.body));
    assert.equal(body.success, true);
    assert.equal(body.result.perceptionEye, 7);
    assert.equal(body.result.characterSignedCode, 3);
    assert.equal(body.result.deltaGap, 4);
    assert.equal(body.version, "3.0.0-optica-sintaxis");
  });
});

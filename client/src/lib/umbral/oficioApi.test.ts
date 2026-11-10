import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("Casa 5 Oficio — cableado de entrada", () => {
  it("el cliente pega al volcado gratis y cae al motor local", () => {
    const src = readFileSync(join(here, "oficioApi.ts"), "utf8");
    assert.match(src, /\/api\/casas\/oficio\/volcado/);
    assert.match(src, /diagnosticarOficioLocal/);
    assert.match(src, /local_fallback/);
    assert.doesNotMatch(src, /\/limite|\/api\/casas\/umbral5/);
  });

  it("App y servidor registran Oficio sin mezclarlo con el 6", () => {
    const root = join(here, "../../../..");
    const app = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(app, /path="\/umbral\/entrada"/);
    assert.match(app, /path="\/oficio"/);
    const server = readFileSync(join(root, "server/index.ts"), "utf8");
    assert.match(server, /registerOficioRoutes/);
    assert.match(server, /registerUmbral5Routes/);
    const api = readFileSync(join(root, "api/index.ts"), "utf8");
    assert.match(api, /registerOficioRoutes/);
  });

  it("la Arena deja libre al dueño y no espera el ledger", () => {
    const root = join(here, "../../../..");
    const v2 = readFileSync(join(root, "client/src/pages/umbral-v2.tsx"), "utf8");
    assert.match(v2, /isOwner\(user\.email\)/);
    assert.match(v2, /hasPaidAccess=\{paid\}/);
    const entrada = readFileSync(join(root, "client/src/pages/umbral-entrada.tsx"), "utf8");
    assert.match(entrada, /isOwner/);
    assert.match(entrada, /LIBRE|dueno/);
  });
});

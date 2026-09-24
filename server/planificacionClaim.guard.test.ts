import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("activación de módulos — no hay cuenta hasta /acceso", () => {
  it("claim-module solo aplica compras pendientes del correo logueado", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /claimPlanificacionPurchasesHandler/);
    assert.match(src, /grantPendingModulesForEmail/);
    assert.doesNotMatch(
      src,
      /activateModulesForUserById\(\s*verified\.uid,\s*planId/,
    );
  });

  it("admin grant ya no falla si el cliente aún no está en Firebase", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /adminGrantPlanificacionModule/);
    assert.match(src, /clientWhatsapp/);
    assert.match(src, /sistemicar\.app\/acceso/);
  });
});

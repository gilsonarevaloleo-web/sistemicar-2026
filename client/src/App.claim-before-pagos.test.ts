import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, "App.tsx"), "utf8");

describe("ModuleRoute — no mandar a /pagos antes de reclamar el pago", () => {
  it("reclama compras pendientes antes de redirigir a pagos", () => {
    const routeStart = src.indexOf("function ModuleRoute");
    assert.ok(routeStart > 0);
    const moduleRoute = src.slice(routeStart);
    assert.match(moduleRoute, /claimedModulesRef/);
    assert.match(moduleRoute, /modulesGrantedByPlan/);
    const claimIdx = moduleRoute.indexOf("void claimPendingPurchases()");
    const denyIdx = moduleRoute.indexOf("navigate(pagosHrefForDeny(merged))");
    assert.ok(claimIdx > 0, "ModuleRoute debe reclamar el pago");
    assert.ok(denyIdx > claimIdx, "el deny a /pagos va después del claim");
  });
});

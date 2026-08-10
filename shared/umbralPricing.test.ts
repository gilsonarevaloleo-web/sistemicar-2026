import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UMBRAL_SKU,
  UMBRAL_TRIAL_MAX_CODIGO,
  esCodigoUmbralEnTrial,
  requierePagoUmbral,
} from "./umbralPricing.ts";
import { modulesGrantedByPlan, hasUmbralAccess } from "./moduleAccess.ts";

describe("Umbral pricing + acceso", () => {
  it("SKU mensual ancla en 24.99 USD", () => {
    assert.equal(UMBRAL_SKU.id, "umbral");
    assert.equal(UMBRAL_SKU.priceUsd, 24.99);
    assert.ok(UMBRAL_SKU.pricePen > 0);
    assert.equal(UMBRAL_SKU.checkoutHref, "/pagos?plan=umbral");
  });

  it("trial solo cubre Código 1", () => {
    assert.equal(UMBRAL_TRIAL_MAX_CODIGO, 1);
    assert.equal(esCodigoUmbralEnTrial(1), true);
    assert.equal(esCodigoUmbralEnTrial(2), false);
    assert.equal(requierePagoUmbral(1, false), false);
    assert.equal(requierePagoUmbral(2, false), true);
    assert.equal(requierePagoUmbral(10, true), false);
  });

  it("plan umbral otorga módulo umbral", () => {
    assert.deepEqual(modulesGrantedByPlan("umbral"), ["umbral"]);
    assert.equal(
      hasUmbralAccess({ activeModules: ["umbral"], email: "x@y.com" }),
      true,
    );
    assert.equal(
      hasUmbralAccess({ activeModules: ["planificacion_base"], email: "x@y.com" }),
      false,
    );
  });
});

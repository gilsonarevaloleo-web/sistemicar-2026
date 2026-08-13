import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ESPEJO_CHECKOUT_ORDER,
  ESPEJO_SKU_INICIO,
  ESPEJO_SKU_RECARGA,
  espejoCreditsForPlan,
  isEspejoSkuId,
} from "./espejoPricing.ts";
import { SUBSCRIPTION_PLANS, ESPEJO_CHECKOUT_PLANS } from "./mercadopagoPlans.ts";
import { sellerCommissionForPlan, isSellerPlanId } from "./sellerCommissions.ts";

describe("Espejo packs de créditos", () => {
  it("Inicio = $9.90 / 6 créditos; Recarga = $19.90 / 15", () => {
    assert.equal(ESPEJO_SKU_INICIO.priceUsd, 9.9);
    assert.equal(ESPEJO_SKU_INICIO.credits, 6);
    assert.equal(ESPEJO_SKU_RECARGA.priceUsd, 19.9);
    assert.equal(ESPEJO_SKU_RECARGA.credits, 15);
    assert.equal(ESPEJO_SKU_INICIO.isOneTime, true);
    assert.equal(ESPEJO_SKU_RECARGA.isOneTime, true);
  });

  it("recarga tiene mejor precio unitario que inicio", () => {
    const unitInicio = ESPEJO_SKU_INICIO.priceUsd / ESPEJO_SKU_INICIO.credits;
    const unitRecarga = ESPEJO_SKU_RECARGA.priceUsd / ESPEJO_SKU_RECARGA.credits;
    assert.ok(unitRecarga < unitInicio);
  });

  it("planes MP espejan créditos y son one-time", () => {
    assert.equal(SUBSCRIPTION_PLANS.espejo_inicio.espejoCredits, 6);
    assert.equal(SUBSCRIPTION_PLANS.espejo_recarga.espejoCredits, 15);
    assert.equal(SUBSCRIPTION_PLANS.espejo_inicio.isOneTime, true);
    assert.equal(SUBSCRIPTION_PLANS.espejo_recarga.isOneTime, true);
    assert.deepEqual([...ESPEJO_CHECKOUT_PLANS], [...ESPEJO_CHECKOUT_ORDER]);
  });

  it("corazon-sabio ya no existe en el catálogo", () => {
    assert.equal(
      Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, "corazon-sabio"),
      false,
    );
  });

  it("helpers de créditos y comisión vendedor 30%", () => {
    assert.equal(isEspejoSkuId("espejo_inicio"), true);
    assert.equal(isEspejoSkuId("corazon-sabio"), false);
    assert.equal(espejoCreditsForPlan("espejo_inicio"), 6);
    assert.equal(espejoCreditsForPlan("umbral"), null);
    assert.equal(isSellerPlanId("espejo_inicio"), true);
    assert.equal(isSellerPlanId("espejo_recarga"), true);
    assert.equal(sellerCommissionForPlan("espejo_inicio"), 2.97);
    assert.equal(sellerCommissionForPlan("espejo_recarga"), 5.97);
  });
});

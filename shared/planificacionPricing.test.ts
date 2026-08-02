import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLANIFICACION_CHECKOUT_ORDER,
  PLANIFICACION_FULL_MONTHLY_USD,
  PLANIFICACION_SKU_BY_ID,
  PLANIFICACION_STACKS,
  SKU_BASE,
  SKU_NORTE,
  SKU_RITMO,
} from "./planificacionPricing.ts";
import { SUBSCRIPTION_PLANS } from "./mercadopagoPlans.ts";

describe("planificacionPricing v2 Base→Ritmo→Norte", () => {
  it("precios apilados del comprometido", () => {
    assert.equal(SKU_BASE.priceUsd, 24.99);
    assert.equal(SKU_RITMO.priceUsd, 29.99);
    assert.equal(SKU_NORTE.priceUsd, 34.99);
    assert.equal(PLANIFICACION_FULL_MONTHLY_USD, 89.97);
  });

  it("orden psicológico: Base → Ritmo → Norte", () => {
    assert.deepEqual([...PLANIFICACION_CHECKOUT_ORDER], [
      "planificacion_base",
      "operativo",
      "soberania_dia",
    ]);
    assert.equal(PLANIFICACION_SKU_BY_ID.planificacion_base.shortName, "Base");
    assert.equal(PLANIFICACION_SKU_BY_ID.operativo.shortName, "Ritmo");
    assert.equal(PLANIFICACION_SKU_BY_ID.soberania_dia.shortName, "Norte");
  });

  it("MercadoPago refleja nombres y precios canónicos", () => {
    assert.equal(SUBSCRIPTION_PLANS.planificacion_base.price, 24.99);
    assert.equal(SUBSCRIPTION_PLANS.operativo.price, 29.99);
    assert.equal(SUBSCRIPTION_PLANS.soberania_dia.price, 34.99);
    assert.equal(SUBSCRIPTION_PLANS.planificacion_base.name, "Jornada Base");
    assert.equal(SUBSCRIPTION_PLANS.operativo.name, "Ritmo del día");
    assert.equal(SUBSCRIPTION_PLANS.soberania_dia.name, "Norte");
  });

  it("stacks Día con ritmo y Con norte", () => {
    const ritmo = PLANIFICACION_STACKS.find(s => s.id === "ritmo")!;
    const norte = PLANIFICACION_STACKS.find(s => s.id === "norte")!;
    assert.equal(ritmo.totalUsd, 54.98);
    assert.equal(norte.totalUsd, 89.97);
    assert.deepEqual([...norte.moduleIds], [
      "planificacion_base",
      "operativo",
      "soberania_dia",
    ]);
  });
});

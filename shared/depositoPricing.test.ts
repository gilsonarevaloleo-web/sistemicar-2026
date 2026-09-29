import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOSITO_CHECKOUT_ORDER,
  DEPOSITO_FULL_MONTHLY_USD,
  DEPOSITO_SKU_BY_ID,
  DEPOSITO_STACKS,
  DEPOSITO_TRIAL_MAX_VOLCADOS,
  SKU_CARRERA,
  SKU_MATRICULA,
  SKU_TITULO,
  esVolcadoDepositoEnTrial,
  gradoMaximoDeposito,
  isDepositoSkuId,
  requierePagoCarrera,
  requierePagoMatricula,
  requierePagoTitulo,
} from "./depositoPricing.ts";
import { SUBSCRIPTION_PLANS, DEPOSITO_CHECKOUT_PLANS } from "./mercadopagoPlans.ts";
import { modulesGrantedByPlan, hasDepositoMatriculaAccess } from "./moduleAccess.ts";
import { sellerCommissionForPlan, isSellerPlanId } from "./sellerCommissions.ts";

describe("Universidad pricing — Matrícula → Carrera → Título", () => {
  it("ancla los mismos peldaños psicológicos que Jornada", () => {
    assert.equal(SKU_MATRICULA.priceUsd, 24.99);
    assert.equal(SKU_CARRERA.priceUsd, 29.99);
    assert.equal(SKU_TITULO.priceUsd, 34.99);
    assert.equal(DEPOSITO_FULL_MONTHLY_USD, 89.97);
  });

  it("orden psicológico: Matrícula → Carrera → Título", () => {
    assert.deepEqual([...DEPOSITO_CHECKOUT_ORDER], [
      "deposito_matricula",
      "deposito_carrera",
      "deposito_titulo",
    ]);
    assert.equal(DEPOSITO_SKU_BY_ID.deposito_matricula.shortName, "Matrícula");
    assert.equal(DEPOSITO_SKU_BY_ID.deposito_carrera.shortName, "Carrera");
    assert.equal(DEPOSITO_SKU_BY_ID.deposito_titulo.shortName, "Título");
  });

  it("MercadoPago refleja nombres y precios canónicos", () => {
    assert.equal(SUBSCRIPTION_PLANS.deposito_matricula.price, 24.99);
    assert.equal(SUBSCRIPTION_PLANS.deposito_carrera.price, 29.99);
    assert.equal(SUBSCRIPTION_PLANS.deposito_titulo.price, 34.99);
    assert.equal(SUBSCRIPTION_PLANS.deposito_matricula.name, "Universidad Matrícula");
    assert.deepEqual([...DEPOSITO_CHECKOUT_PLANS], [...DEPOSITO_CHECKOUT_ORDER]);
  });

  it("stacks Carrera y Título", () => {
    const carrera = DEPOSITO_STACKS.find((s) => s.id === "carrera")!;
    const titulo = DEPOSITO_STACKS.find((s) => s.id === "titulo")!;
    assert.equal(carrera.totalUsd, 54.98);
    assert.equal(titulo.totalUsd, 89.97);
    assert.deepEqual([...titulo.moduleIds], [
      "deposito_matricula",
      "deposito_carrera",
      "deposito_titulo",
    ]);
  });

  it("trial cubre un solo volcado G1", () => {
    assert.equal(DEPOSITO_TRIAL_MAX_VOLCADOS, 1);
    assert.equal(esVolcadoDepositoEnTrial(0), true);
    assert.equal(esVolcadoDepositoEnTrial(1), false);
    assert.equal(requierePagoMatricula(0, false), false);
    assert.equal(requierePagoMatricula(1, false), true);
    assert.equal(requierePagoMatricula(8, true), false);
  });

  it("techo de grado: G1 / G3 / G4", () => {
    assert.equal(gradoMaximoDeposito({ hasCarrera: false, hasTitulo: false }), 1);
    assert.equal(gradoMaximoDeposito({ hasCarrera: true, hasTitulo: false }), 3);
    assert.equal(gradoMaximoDeposito({ hasCarrera: true, hasTitulo: true }), 4);
    assert.equal(requierePagoCarrera(2, false, false), true);
    assert.equal(requierePagoCarrera(2, true, false), false);
    assert.equal(requierePagoTitulo(4, false), true);
    assert.equal(requierePagoTitulo(4, true), false);
  });

  it("cada plan otorga su módulo y comisión 30%", () => {
    assert.deepEqual(modulesGrantedByPlan("deposito_matricula"), [
      "deposito_matricula",
    ]);
    assert.deepEqual(modulesGrantedByPlan("deposito_carrera"), [
      "deposito_carrera",
    ]);
    assert.deepEqual(modulesGrantedByPlan("deposito_titulo"), ["deposito_titulo"]);
    assert.equal(
      hasDepositoMatriculaAccess({
        activeModules: ["deposito_matricula"],
        email: "x@y.com",
      }),
      true,
    );
    assert.equal(
      hasDepositoMatriculaAccess({
        activeModules: ["umbral"],
        email: "x@y.com",
      }),
      false,
    );
    assert.equal(isDepositoSkuId("deposito_matricula"), true);
    assert.equal(isDepositoSkuId("umbral"), false);
    assert.equal(isSellerPlanId("deposito_matricula"), true);
    assert.equal(sellerCommissionForPlan("deposito_matricula"), 7.5);
    assert.equal(sellerCommissionForPlan("deposito_carrera"), 9);
    assert.equal(sellerCommissionForPlan("deposito_titulo"), 10.5);
  });
});

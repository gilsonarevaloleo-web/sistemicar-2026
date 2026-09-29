import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMercadoPagoPaymentId,
  resolveMetaPurchase,
} from "./metaPurchaseCatalog.ts";

describe("metaPurchaseCatalog", () => {
  it("Jornada Base Purchase lleva $24.99 y el SKU", () => {
    const p = resolveMetaPurchase("planificacion_base");
    assert.ok(p);
    assert.equal(p.content_name, "Jornada Base");
    assert.equal(p.value, 24.99);
    assert.deepEqual(p.content_ids, ["planificacion_base"]);
  });

  it("Ritmo, Norte, Umbral, Universidad y Espejo tienen precio propio", () => {
    assert.equal(resolveMetaPurchase("operativo")?.value, 29.99);
    assert.equal(resolveMetaPurchase("soberania_dia")?.value, 34.99);
    assert.equal(resolveMetaPurchase("umbral")?.value, 24.99);
    assert.equal(resolveMetaPurchase("deposito_matricula")?.value, 24.99);
    assert.equal(resolveMetaPurchase("deposito_carrera")?.value, 29.99);
    assert.equal(resolveMetaPurchase("deposito_titulo")?.value, 34.99);
    assert.equal(resolveMetaPurchase("espejo_inicio")?.value, 9.9);
    assert.equal(resolveMetaPurchase("espejo_recarga")?.value, 19.9);
  });

  it("plan vacío o desconocido no inventa un Purchase", () => {
    assert.equal(resolveMetaPurchase(""), null);
    assert.equal(resolveMetaPurchase("no-existe"), null);
  });

  it("lee payment_id de la vuelta de Mercado Pago", () => {
    assert.equal(
      extractMercadoPagoPaymentId(
        "?status=success&plan=planificacion_base&payment_id=123456789",
      ),
      "123456789",
    );
    assert.equal(extractMercadoPagoPaymentId("status=success&plan=planificacion_base"), null);
  });
});

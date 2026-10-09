import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARTA_CTA_BASE,
  CARTA_ESCALERA,
  CARTA_PRECIO_BASE_USD,
  CARTA_PRECIO_DIRECCION_USD,
  CARTA_PRECIO_RITMO_USD,
  CARTA_TITULAR,
  cartaVentaOfreceTrial,
  cartaVentaPublicText,
  escaleraTiersComprables,
} from "./jornadaCartaVenta.ts";
import {
  PLANIFICACION_FULL_MONTHLY_USD,
  PLANIFICACION_STACKS,
  SKU_BASE,
} from "./planificacionPricing.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("jornadaCartaVenta", () => {
  it("no ofrece trial ni 500 PS en el texto público", () => {
    assert.equal(cartaVentaOfreceTrial(), false);
    assert.doesNotMatch(cartaVentaPublicText(), /7\s*d[ií]as/i);
    assert.match(CARTA_TITULAR, /telemetr[ií]a/i);
    assert.match(CARTA_CTA_BASE, /Activar Jornada Base/i);
  });

  it("solo Base se compra; Ritmo y Dirección anclan", () => {
    assert.deepEqual(escaleraTiersComprables(), ["base"]);
    const ritmo = CARTA_ESCALERA.find((t) => t.id === "ritmo");
    const direccion = CARTA_ESCALERA.find((t) => t.id === "direccion");
    assert.equal(ritmo?.buyable, false);
    assert.equal(direccion?.buyable, false);
    assert.match(ritmo?.afterNote ?? "", /Después de Base/i);
    assert.match(direccion?.afterNote ?? "", /Después de Ritmo/i);
  });

  it("precios de la escalera siguen el stack canónico", () => {
    const stackRitmo = PLANIFICACION_STACKS.find((s) => s.id === "ritmo")!;
    assert.equal(CARTA_PRECIO_BASE_USD, SKU_BASE.priceUsd);
    assert.equal(CARTA_PRECIO_RITMO_USD, stackRitmo.totalUsd);
    assert.equal(CARTA_PRECIO_DIRECCION_USD, PLANIFICACION_FULL_MONTHLY_USD);
  });
});

describe("ventas-jornada carta", () => {
  const src = readFileSync(
    join(dir, "../client/src/pages/ventas-jornada.tsx"),
    "utf8",
  );

  it("vendedor y checkout no reabren el trial", () => {
    const vendedor = readFileSync(
      join(dir, "../client/src/pages/vendedor.tsx"),
      "utf8",
    );
    const pagos = readFileSync(
      join(dir, "../client/src/pages/pagos.tsx"),
      "utf8",
    );
    assert.match(vendedor, /offerTrial/);
    assert.doesNotMatch(pagos, /EMPEZAR 7 D[IÍ]AS GRATIS/i);
    assert.doesNotMatch(pagos, /pagos-empezar-trial/);
  });

  it("es carta de pago, no landing de trial", () => {
    assert.match(src, /jornadaCartaVenta/);
    assert.equal(src.includes("JORNADA_BASE_TRIAL"), false);
    assert.equal(src.includes("ventas-jornada-cta-trial"), false);
    assert.doesNotMatch(src, /7\s*d[ií]as\s+gratis/i);
    assert.doesNotMatch(src, /\/jornada-v4/);
    assert.equal(src.includes('from "wouter"'), false);
    assert.match(src, /<a\s+href=\{/);
    assert.match(src, /href=\{pagosHref\}/);
    assert.match(src, /href=\{vendedorHref\}/);
    assert.match(src, /touch-manipulation/);
  });
});

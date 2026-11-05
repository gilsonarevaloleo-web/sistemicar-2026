import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARTA_FRIA_CTA,
  CARTA_FRIA_PATH,
  CARTA_FRIA_PRECIO_USD,
  CARTA_FRIA_TITULAR,
  cartaFriaMencionaEscalera,
  cartaFriaOfreceTrial,
  cartaFriaPublicText,
} from "./jornadaCartaFria.ts";
import { SKU_BASE } from "./planificacionPricing.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("jornadaCartaFria", () => {
  it("es carta de entrada: un precio, sin trial ni escalera", () => {
    const text = cartaFriaPublicText();
    assert.equal(cartaFriaOfreceTrial(), false);
    assert.equal(cartaFriaMencionaEscalera(), false);
    assert.doesNotMatch(text, /7\s*d[ií]as/i);
    assert.doesNotMatch(text, /500\s*ps/i);
    assert.equal(CARTA_FRIA_PRECIO_USD, SKU_BASE.priceUsd);
    assert.match(text, /\$24\.99\/mes/);
    assert.match(CARTA_FRIA_TITULAR, /fuga invisible en tu tiempo/i);
    assert.doesNotMatch(CARTA_FRIA_TITULAR, /telemetr[ií]a/i);
    assert.match(CARTA_FRIA_CTA, /Activar mi Jornada ahora/i);
    assert.equal(CARTA_FRIA_PATH, "/jornada-base");
  });

  it("el guion de video vende Base y calla la escalera", () => {
    const text = cartaFriaPublicText();
    assert.match(text, /Jornada Base/);
    assert.match(text, /menos de un d[oó]lar al d[ií]a/i);
    assert.equal(cartaFriaMencionaEscalera(), false);
    assert.doesNotMatch(text, /Jornada\s+Ritmo|Ritmo\s+y\s+Direcci|Universidad/i);
  });
});

describe("jornada-base landing", () => {
  const src = readFileSync(
    join(dir, "../client/src/pages/jornada-base.tsx"),
    "utf8",
  );

  it("App monta /jornada-base fuera del shell", () => {
    const app = readFileSync(join(dir, "../client/src/App.tsx"), "utf8");
    assert.match(app, /pages\/jornada-base/);
    assert.match(app, /\/jornada-base/);
  });

  it("es landing de pago, no de trial, con un solo CTA", () => {
    assert.match(src, /jornadaCartaFria/);
    assert.equal(src.includes("JORNADA_BASE_TRIAL"), false);
    assert.equal(src.includes("jornada-base-cta-trial"), false);
    assert.doesNotMatch(src, /7\s*d[ií]as\s+gratis/i);
    assert.doesNotMatch(src, /\/jornada-v4/);
    assert.equal(src.includes('from "wouter"'), false);
    assert.match(src, /<a\s+href=\{/);
    assert.match(src, /href=\{pagosHref\}/);
    assert.match(src, /touch-manipulation/);
    assert.doesNotMatch(src, /vendedorHref|CARTA_CTA_VENDEDOR|Que me llame/i);
    assert.doesNotMatch(src, /CARTA_ESCALERA|Ritmo|Direcci[oó]n/);
  });
});

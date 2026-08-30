import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fijacionDesdeEntradaComercial,
  parseEntradaComercialSearch,
  withTrackedQuery,
  JORNADA_ADS_CODIGO_DEFAULT,
  PAGOS_JORNADA_BASE_HREF,
  VENDEDOR_JORNADA_ADS_HREF,
} from "./entradaComercial.ts";

describe("Entrada comercial Jornada (anuncios)", () => {
  it("parsea planeta + código desde la query", () => {
    const p = parseEntradaComercialSearch("?planeta=JORNADA&codigo=3");
    assert.ok(p);
    assert.equal(p.planeta, "JORNADA");
    assert.equal(p.codigo, 3);
  });

  it("sin código usa Código 3 (día sin cierre)", () => {
    const p = parseEntradaComercialSearch("planeta=jornada");
    assert.ok(p);
    assert.equal(p.planeta, "JORNADA");
    assert.equal(p.codigo, JORNADA_ADS_CODIGO_DEFAULT);
  });

  it("sin planeta válido no fija", () => {
    assert.equal(parseEntradaComercialSearch("?utm_source=facebook"), null);
    assert.equal(parseEntradaComercialSearch(""), null);
  });

  it("fijación de anuncio apunta a Jornada Base", () => {
    const f = fijacionDesdeEntradaComercial("JORNADA");
    assert.equal(f.planeta, "JORNADA");
    assert.equal(f.codigo, 3);
    assert.match(f.checkoutHref, /planificacion_base/);
  });

  it("arrastra ref y utm al siguiente href", () => {
    const next = withTrackedQuery(
      VENDEDOR_JORNADA_ADS_HREF,
      "?utm_source=facebook&utm_campaign=jornada_base&ref=GILSON",
    );
    assert.match(next, /planeta=JORNADA/);
    assert.match(next, /utm_source=facebook/);
    assert.match(next, /ref=GILSON/);
  });

  it("checkout Base conserva tracking", () => {
    const next = withTrackedQuery(
      PAGOS_JORNADA_BASE_HREF,
      "?utm_source=facebook&utm_campaign=jornada_base",
    );
    assert.match(next, /plan=planificacion_base/);
    assert.match(next, /utm_campaign=jornada_base/);
  });
});

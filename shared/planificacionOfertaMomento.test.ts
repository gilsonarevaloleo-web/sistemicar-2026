import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countClosedConquista,
  resolveOfertaMomento,
} from "./planificacionOfertaMomento.ts";

describe("planificacionOfertaMomento", () => {
  it("Base sin cierre no ofrece Ritmo ni Norte", () => {
    const m = resolveOfertaMomento({
      hasRitmo: false,
      hasNorte: false,
      closedConquistaCount: 0,
      segmentosCount: 0,
    });
    assert.equal(m.offerRitmo, false);
    assert.equal(m.offerNorte, false);
    assert.equal(m.nextPeldaño, null);
    assert.equal(m.reason, "base-sin-cierre");
  });

  it("Base con un cierre ofrece solo Ritmo", () => {
    const m = resolveOfertaMomento({
      hasRitmo: false,
      hasNorte: false,
      closedConquistaCount: 1,
      segmentosCount: 4,
    });
    assert.equal(m.offerRitmo, true);
    assert.equal(m.offerNorte, false);
    assert.equal(m.nextPeldaño, "ritmo");
  });

  it("Ritmo sin segmentos aún no ofrece Norte", () => {
    const m = resolveOfertaMomento({
      hasRitmo: true,
      hasNorte: false,
      closedConquistaCount: 8,
      segmentosCount: 0,
    });
    assert.equal(m.offerRitmo, false);
    assert.equal(m.offerNorte, false);
    assert.equal(m.nextPeldaño, null);
    assert.equal(m.reason, "ritmo-sin-estructura");
  });

  it("Ritmo con segmentos ofrece Norte", () => {
    const m = resolveOfertaMomento({
      hasRitmo: true,
      hasNorte: false,
      closedConquistaCount: 2,
      segmentosCount: 1,
    });
    assert.equal(m.offerNorte, true);
    assert.equal(m.nextPeldaño, "norte");
  });

  it("Norte completo no ofrece nada", () => {
    const m = resolveOfertaMomento({
      hasRitmo: true,
      hasNorte: true,
      closedConquistaCount: 9,
      segmentosCount: 3,
    });
    assert.equal(m.offerRitmo, false);
    assert.equal(m.offerNorte, false);
    assert.equal(m.nextPeldaño, null);
  });

  it("cuenta Conquista cerrada y ignora Situacional", () => {
    const n = countClosedConquista([
      { status: "cumplido", tipoFlota: "tiempo", cierreAt: 10 },
      { status: "cumplido", tipoFlota: "situacion", cierreAt: 10 },
      { status: "activo", tipoFlota: "tiempo", cierreAt: 0 },
    ]);
    assert.equal(n, 1);
  });
});

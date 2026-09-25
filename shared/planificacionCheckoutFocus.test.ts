import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCheckoutFocus } from "./planificacionCheckoutFocus.ts";

describe("planificacionCheckoutFocus", () => {
  it("anuncio jornada_base enfoca Base y esconde stacks/$89", () => {
    const f = resolveCheckoutFocus(
      "?utm_source=facebook&utm_campaign=jornada_base&plan=planificacion_base",
    );
    assert.equal(f.focusSkuId, "planificacion_base");
    assert.equal(f.hideStacks, true);
    assert.equal(f.collapseLaterPeldanos, true);
    assert.equal(f.hideOtherWorlds, true);
    assert.match(f.subline ?? "", /después/i);
  });

  it("campaña sin plan también enfoca Base", () => {
    const f = resolveCheckoutFocus("utm_campaign=jornada_base");
    assert.equal(f.focusSkuId, "planificacion_base");
    assert.equal(f.hideStacks, true);
  });

  it("upsell Ritmo no muestra Norte ni otros mundos", () => {
    const f = resolveCheckoutFocus("?plan=operativo");
    assert.equal(f.focusSkuId, "operativo");
    assert.equal(f.hideStacks, true);
    assert.equal(f.hideOtherWorlds, true);
    assert.match(f.subline ?? "", /Norte viene después/i);
  });

  it("/pagos sin query sigue siendo catálogo completo", () => {
    const f = resolveCheckoutFocus("");
    assert.equal(f.focusSkuId, null);
    assert.equal(f.hideStacks, false);
    assert.equal(f.hideOtherWorlds, false);
  });
});

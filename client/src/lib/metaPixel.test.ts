import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jornadaBasePixelPayload, META_PIXEL_ID, resolveMetaPurchase } from "./metaPixel.ts";

describe("metaPixel Jornada Base", () => {
  it("ID del pixel de prospectos está vigente en código", () => {
    assert.equal(META_PIXEL_ID, "1066497298319685");
  });

  it("payload de Jornada Base usa el SKU y el precio actuales", () => {
    const p = jornadaBasePixelPayload();
    assert.equal(p.content_name, "Jornada Base");
    assert.deepEqual(p.content_ids, ["planificacion_base"]);
    assert.equal(p.value, 24.99);
    assert.equal(p.currency, "USD");
  });

  it("marca VIDEO A o VIDEO B en el payload del Pixel", () => {
    const a = jornadaBasePixelPayload("video_a");
    const b = jornadaBasePixelPayload("video_b");
    assert.equal(a.content_name, "Jornada Base · VIDEO A");
    assert.equal(a.video, "VIDEO A");
    assert.equal(b.video, "VIDEO B");
  });


  it("Purchase de Base no se confunde con Espejo $17", () => {
    const paid = resolveMetaPurchase("planificacion_base");
    assert.ok(paid);
    assert.equal(paid.value, 24.99);
    assert.notEqual(paid.value, 17);
  });
});

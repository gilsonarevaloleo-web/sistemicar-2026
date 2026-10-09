import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FLOTA_BRAND,
  FLOTA_SELECTOR_DISCRIMINATOR,
  RING_BRAND,
  flotaLabelUpper,
  flotaLabelsRecord,
} from "./flotaBrand.ts";

describe("flotaBrand", () => {
  it("tiempo se muestra como CONQUISTA", () => {
    assert.equal(flotaLabelUpper("tiempo"), "CONQUISTA");
    assert.match(FLOTA_BRAND.tiempo.sublabel, /unidades/i);
  });

  it("situacion se muestra como ENFOQUE", () => {
    assert.equal(flotaLabelUpper("situacion"), "ENFOQUE");
    assert.match(FLOTA_BRAND.situacion.sublabel, /ring/i);
  });

  it("el par de rings queda nombrado en Conquista y Enfoque", () => {
    assert.equal(RING_BRAND.conquista, "Ring de conquista");
    assert.equal(RING_BRAND.enfoque, "Ring de enfoque");
    assert.match(FLOTA_BRAND.tiempo.sublabel, /Ring de conquista/);
    assert.match(FLOTA_BRAND.situacion.sublabel, /ring de enfoque/i);
  });

  it("discriminador orienta medir vs sellar", () => {
    assert.match(FLOTA_SELECTOR_DISCRIMINATOR, /unidades/i);
    assert.match(FLOTA_SELECTOR_DISCRIMINATOR, /decisiones/i);
  });

  it("flotaLabelsRecord cubre las cuatro flotas", () => {
    const labels = flotaLabelsRecord();
    assert.equal(Object.keys(labels).length, 4);
    assert.equal(labels.tiempo, "CONQUISTA");
    assert.equal(labels.situacion, "ENFOQUE");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DESTINO_CIERRE_COPY,
  DESTINO_CIERRE_DEFAULT,
  feedsProyectoHub,
  resolveDestinoCierre,
  resolveProyectoChipId,
} from "./destinoCierre.ts";

describe("destinoCierre", () => {
  it("default es presencia — no ensucia Hub", () => {
    assert.equal(DESTINO_CIERRE_DEFAULT, "presencia");
    assert.equal(resolveDestinoCierre(undefined), "presencia");
    assert.equal(feedsProyectoHub(resolveDestinoCierre(undefined)), false);
  });

  it("override gana sobre vehicle", () => {
    assert.equal(resolveDestinoCierre("presencia", "peldano"), "peldano");
    assert.equal(resolveDestinoCierre("peldano", "presencia"), "presencia");
  });

  it("solo peldano alimenta Hub", () => {
    assert.equal(feedsProyectoHub("peldano"), true);
    assert.equal(feedsProyectoHub("presencia"), false);
  });

  it("peldano en copy se llama Dirección — rumbo, no clic de ego", () => {
    assert.equal(DESTINO_CIERRE_COPY.peldano.label, "Dirección");
    assert.match(DESTINO_CIERRE_COPY.peldano.hint, /oleada/);
    assert.match(DESTINO_CIERRE_COPY.presencia.hint, /No toca el proyecto/);
  });

  it("resolveProyectoChipId pinta el toque antes que el vehículo", () => {
    assert.equal(resolveProyectoChipId("opt", "old", "fb"), "opt");
    assert.equal(resolveProyectoChipId(null, "veh", "fb"), "veh");
    assert.equal(resolveProyectoChipId("", "", "fb"), "fb");
  });
});

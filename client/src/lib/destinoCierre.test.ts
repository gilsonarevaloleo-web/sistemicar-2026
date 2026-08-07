import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DESTINO_CIERRE_DEFAULT,
  feedsProyectoHub,
  resolveDestinoCierre,
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
});

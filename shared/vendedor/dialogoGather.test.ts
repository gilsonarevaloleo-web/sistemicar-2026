import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDialogTurns,
  parseGatherChoice,
} from "./dialogoGather.ts";

describe("Vendedor diálogo Gather (nivel B)", () => {
  it("opener nombra código, arquetipo y pide 1/2", () => {
    const t = buildDialogTurns(2, "JORNADA", "ANA");
    assert.match(t.opener, /Código 2/);
    assert.match(t.opener, /Marca uno/i);
    assert.match(t.opener, /Marca dos/i);
    assert.match(t.mirrorSi, /Jornada/i);
    assert.match(t.mirrorSi, /referido ANA/);
    assert.match(t.ctaSi, /planificacion base|Jornada/i);
    assert.equal(t.puertaComercial, "JORNADA");
  });

  it("Umbral C1 diagnostica utilidad pero vende Jornada", () => {
    const t = buildDialogTurns(1, "UMBRAL");
    assert.match(t.opener, /no veo para qu[eé] me sirve|no es para m[ií]/i);
    assert.match(t.mirrorSi, /Jornada/i);
    assert.doesNotMatch(t.mirrorSi, /Forja|Umbral entrada/i);
    assert.equal(t.puertaComercial, "JORNADA");
  });

  it("parseGatherChoice lee dígitos y habla corta", () => {
    assert.equal(parseGatherChoice({ digits: "1" }), "1");
    assert.equal(parseGatherChoice({ digits: "2" }), "2");
    assert.equal(parseGatherChoice({ digits: "9" }), null);
    assert.equal(parseGatherChoice({ speech: "sí, claro" }), "1");
    assert.equal(parseGatherChoice({ speech: "no gracias" }), "2");
    assert.equal(parseGatherChoice({}), null);
  });
});

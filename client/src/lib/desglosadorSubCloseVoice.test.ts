import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo } from "@/lib/persistence";
import {
  buildDesglosadorSubClosePhrases,
  buildSituacionFilaClosePhrases,
  psCantidadEnPalabras,
} from "./desglosadorSubCloseVoice.ts";

describe("desglosadorSubCloseVoice", () => {
  it("cumplido incluye PS en palabras", () => {
    const sub: SubVehiculo = {
      id: "s1",
      titulo: "Escribir informe",
      status: "cumplido",
      cierreAt: 1000,
    };
    const phrases = buildDesglosadorSubClosePhrases(sub, "cumplido");
    assert.match(phrases.join(" "), /cumplida/i);
    assert.match(phrases.join(" "), /dos puntos de soberanía/i);
  });

  it("fallado no promete PS", () => {
    const phrases = buildDesglosadorSubClosePhrases(
      { id: "s1", titulo: "X", status: "fallado" },
      "fallado"
    );
    assert.match(phrases.join(" "), /fallada/i);
    assert.match(phrases.join(" "), /sin puntos/i);
  });

  it("ring cumplido usa cuatro PS por defecto", () => {
    const phrases = buildSituacionFilaClosePhrases("Revisar correo", "cumplido");
    assert.match(phrases.join(" "), /cuatro puntos de soberanía/i);
  });

  it("psCantidadEnPalabras cubre valores comunes", () => {
    assert.equal(psCantidadEnPalabras(4), "cuatro");
    assert.equal(psCantidadEnPalabras(99), "99");
  });
});

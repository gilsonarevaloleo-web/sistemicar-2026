import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APUNTE_MAX_LEN,
  adjuntarApunteAlCierre,
  cerrarApunte,
  cierreDesdeApunte,
  crearApunte,
  fraseValida,
  hechosDesdeCierre,
  isApuntado,
  isCerrado,
  normalizeFrase,
} from "./index.ts";

describe("jornadaApunte", () => {
  it("normaliza espacios y rechaza el vacío", () => {
    assert.equal(normalizeFrase("  cerrar  el  anillo  "), "cerrar el anillo");
    assert.equal(fraseValida("   "), false);
    assert.equal(fraseValida("x".repeat(APUNTE_MAX_LEN + 1)), false);
    assert.equal(fraseValida("cerrar el anillo"), true);
  });

  it("apuntar nombra el día; sin frase no hay apunte", () => {
    const a = crearApunte("2026-09-19", "  terminar el sello  ", 1000);
    assert.equal(a.blanco, "terminar el sello");
    assert.equal(a.fecha, "2026-09-19");
    assert.equal(a.apuntadoAt, 1000);
    assert.equal(isApuntado(a), true);
    assert.equal(isCerrado(a), false);
    assert.throws(() => crearApunte("2026-09-19", "   ", 1), /vacío/);
    assert.equal(isApuntado(null), false);
  });

  it("cerrar exige las dos frases y congela el contraste", () => {
    const a = crearApunte("2026-09-19", "terminar el sello", 1000);
    const cerrado = cerrarApunte(a, "  firmé el sello  ", "no planté el anillo", 2000);
    assert.equal(isCerrado(cerrado), true);
    assert.equal(cerrado.ocurrio, "firmé el sello");
    assert.equal(cerrado.noOcurrio, "no planté el anillo");
    assert.equal(cerrado.cerradoAt, 2000);
    assert.throws(() => cerrarApunte(a, "sí", "  "), /dos frases/);
    assert.throws(
      () => cerrarApunte({ fecha: "2026-09-19", blanco: "", apuntadoAt: 0 }, "a", "b", 1),
      /no se apuntó/i,
    );
  });

  it("el relato de cierre pone el testigo delante de los números", () => {
    const a = cerrarApunte(
      crearApunte("2026-09-19", "una hora de conquista", 1),
      "cerré dos unidades",
      "no abrí Situacional",
      2,
    );
    const cierre = cierreDesdeApunte(a);
    const hechos = hechosDesdeCierre(cierre);
    assert.deepEqual(hechos, [
      "Hoy apunté a: una hora de conquista",
      "Esto ocurrió: cerré dos unidades",
      "Esto no: no abrí Situacional",
    ]);
    const log = adjuntarApunteAlCierre({ evidenciaHechos: ["PS del día: 9"] }, cierre);
    assert.equal(log.apunteBlanco, "una hora de conquista");
    assert.equal(log.evidenciaHechos[0], "Hoy apunté a: una hora de conquista");
    assert.ok(log.evidenciaHechos.includes("PS del día: 9"));
  });
});

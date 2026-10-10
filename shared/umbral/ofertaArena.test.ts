import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  anclarTextoAOferta,
  aplicarSelloOferta,
  bloquePromptOferta,
  calcularProgresoOferta,
  claveNombreOferta,
  crearOfertaArena,
  normalizeOferta,
  resolverOfertaPorNombre,
  validarFraseUtilidad,
  validarNombreOferta,
} from "./ofertaArena.ts";
import { esCodigoElegible } from "./progreso.ts";

function ofertaBase() {
  return crearOfertaArena({
    id: "ofa-test",
    userId: "u1",
    nombre: "Corte Limpio",
    fraseUtilidad: "Nombra el crack y lo corta hoy, sin flor.",
    nowIso: "2026-10-10T00:00:00.000Z",
  });
}

describe("Umbral Arena — oferta nombrada", () => {
  it("rechaza nombres genéricos y acepta un nombre real", () => {
    assert.equal(validarNombreOferta("esto").ok, false);
    assert.equal(validarNombreOferta("Mi producto").ok, false);
    assert.equal(validarNombreOferta("x").ok, false);
    assert.equal(validarNombreOferta("123").ok, false);
    const ok = validarNombreOferta("  Corte   Limpio  ");
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value.nombre, "Corte Limpio");
      assert.equal(ok.value.clave, "corte limpio");
    }
  });

  it("la clave ignora mayúsculas, tildes y puntuación", () => {
    assert.equal(claveNombreOferta("Corté Limpio!"), "corte limpio");
    assert.equal(claveNombreOferta("CORTE-LIMPIO"), "corte limpio");
  });

  it("exige frase de utilidad usable", () => {
    assert.equal(validarFraseUtilidad("corto").ok, false);
    const ok = validarFraseUtilidad("  Corta la niebla en una frase.  ");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.value, "Corta la niebla en una frase.");
  });

  it("oferta nueva abre en C1 y solo ese sello es elegible", () => {
    const p = calcularProgresoOferta(ofertaBase());
    assert.deepEqual(p.superados, []);
    assert.equal(p.siguiente, 1);
    assert.equal(p.sellosCount, 0);
    assert.deepEqual(p.elegibles, [1]);
    assert.equal(esCodigoElegible(p, 1), true);
    assert.equal(esCodigoElegible(p, 2), false);
  });

  it("cada sello avanza la carrera de ESA oferta", () => {
    let o = ofertaBase();
    o = aplicarSelloOferta(o, {
      codigo: 1,
      respuestaAprobada: "Te sirve para cortar la niebla en 15 minutos.",
      feedbackGemini: "Cruza.",
      intentos: 1,
      fechaAprobacion: "2026-10-10T01:00:00.000Z",
      sesionId: "s1",
    });
    o = aplicarSelloOferta(o, {
      codigo: 2,
      respuestaAprobada: "Suma encima de lo que ya usas, sin otra carga.",
      feedbackGemini: "Ok.",
      intentos: 2,
      fechaAprobacion: "2026-10-10T01:10:00.000Z",
      sesionId: "s1",
    });
    const p = calcularProgresoOferta(o);
    assert.deepEqual(p.superados, [1, 2]);
    assert.equal(p.siguiente, 3);
    assert.equal(p.sellosCount, 2);
    assert.deepEqual(p.elegibles, [1, 2, 3]);
  });

  it("un nombre distinto no hereda sellos; el mismo clave reanuda", () => {
    let limpio = ofertaBase();
    limpio = aplicarSelloOferta(limpio, {
      codigo: 1,
      respuestaAprobada: "Utilidad de Corte Limpio en una frase.",
      feedbackGemini: "Cruza.",
      intentos: 1,
      fechaAprobacion: "2026-10-10T01:00:00.000Z",
      sesionId: "s1",
    });
    const otra = crearOfertaArena({
      userId: "u1",
      nombre: "Anillo Norte",
      fraseUtilidad: "Marca el rumbo del día en tres minutos.",
    });
    assert.equal(calcularProgresoOferta(otra).sellosCount, 0);
    assert.equal(calcularProgresoOferta(limpio).sellosCount, 1);

    const found = resolverOfertaPorNombre(
      [limpio, otra],
      "corte limpio",
    );
    assert.equal(found?.id, limpio.id);
    assert.equal(resolverOfertaPorNombre([limpio], "Anillo Norte"), null);
  });

  it("el repaso actualiza el copy y conserva la fecha del primer sello", () => {
    let o = ofertaBase();
    o = aplicarSelloOferta(o, {
      codigo: 1,
      respuestaAprobada: "Primera formulación.",
      feedbackGemini: "Cruza.",
      intentos: 1,
      fechaAprobacion: "2026-10-10T01:00:00.000Z",
      sesionId: "s1",
    });
    o = aplicarSelloOferta(o, {
      codigo: 1,
      respuestaAprobada: "Formulación más densa del mismo corte.",
      feedbackGemini: "Sigue.",
      intentos: 1,
      fechaAprobacion: "2026-10-11T01:00:00.000Z",
      sesionId: "s2",
    });
    assert.equal(
      o.sellos[1]?.respuestaAprobada,
      "Formulación más densa del mismo corte.",
    );
    assert.equal(o.sellos[1]?.fechaAprobacion, "2026-10-10T01:00:00.000Z");
    assert.equal(calcularProgresoOferta(o).sellosCount, 1);
  });

  it("ancla objeciones genéricas al nombre", () => {
    const t = anclarTextoAOferta(
      "Suena interesante… pero no veo para qué me sirve esto. Compra paz, no solo producto.",
      "Corte Limpio",
    );
    assert.match(t, /Corte Limpio/);
    assert.doesNotMatch(t, /\besto\b/i);
    assert.doesNotMatch(t, /\bproducto\b/i);
  });

  it("el bloque de prompt nombra la oferta y prohíbe el pitch genérico", () => {
    const bloque = bloquePromptOferta({
      nombre: "Corte Limpio",
      fraseUtilidad: "Corta la niebla hoy.",
    });
    assert.match(bloque, /OFERTA EN JUICIO/);
    assert.match(bloque, /Corte Limpio/);
    assert.match(bloque, /Corta la niebla hoy/);
    assert.match(bloque, /rechaza/i);
  });

  it("normalizeOferta descarta basura y conserva sellos válidos", () => {
    const o = normalizeOferta({
      id: "ofa-1",
      userId: "u1",
      nombre: "Corte Limpio",
      fraseUtilidad: "Nombra el crack y lo corta hoy.",
      sellos: {
        1: {
          codigo: 1,
          respuestaAprobada: "Utilidad anclada.",
          feedbackGemini: "Ok.",
          intentos: 1,
          fechaAprobacion: "2026-10-10T00:00:00.000Z",
          sesionId: "s1",
        },
        99: {
          codigo: 99 as never,
          respuestaAprobada: "basura",
          feedbackGemini: "",
          intentos: 1,
          fechaAprobacion: "",
          sesionId: "",
        },
      },
    });
    assert.ok(o);
    assert.equal(o && calcularProgresoOferta(o).sellosCount, 1);
    assert.equal(normalizeOferta({ nombre: "esto" }), null);
  });
});

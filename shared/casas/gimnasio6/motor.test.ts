import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preguntaCanon, siguientePuntero } from "./canon.ts";
import {
  aplicarRespuesta,
  diaLima,
  evaluarRespuestaLocal,
  extraerEscala,
  fluidezVariante,
  parseEvaluacion,
  puedeAbrirCapitulo,
  preguntaVivaDe,
  recursosVacios,
} from "./motor.ts";
import { copiarLibro } from "./prompt.ts";
import type { LibroGimnasio } from "./types.ts";

function libroBase(over: Partial<LibroGimnasio> = {}): LibroGimnasio {
  const now = "2026-11-05T15:00:00.000Z";
  return {
    id: "lib-1",
    userId: "u1",
    sesionUmbral5Id: "s1",
    modulo: "social_producto",
    limiteOrigen: "No puedo vender. El cuerpo se niega ante el producto.",
    recursos: recursosVacios(),
    puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
    estado: "ABIERTO",
    capituloSelladoDia: null,
    capitulosSellados: [],
    turnos: [],
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe("Gimnasio 6 — motor", () => {
  it("una pregunta a la vez: el puntero no suelta las tres", () => {
    const viva = preguntaVivaDe(libroBase());
    assert.ok(viva);
    assert.match(viva!.pregunta, /1 al 10/);
    assert.equal(viva!.indice, 1);
    const nextSlot = siguientePuntero(1, 1, 1);
    assert.notEqual(nextSlot, "sellar");
    if (nextSlot !== "sellar") assert.equal(nextSlot.indice, 2);
  });

  it("sin número en la escala no pasa y planta variante", () => {
    const p = preguntaCanon(1, 1, 1)!;
    const ev = evaluarRespuestaLocal(p, "más o menos bien");
    assert.equal(ev.pasa, false);
    const next = aplicarRespuesta(libroBase(), "más o menos bien", ev);
    assert.equal(next.puntero.variante, 1);
    assert.equal(next.puntero.indice, 1);
    assert.equal(next.estado, "ABIERTO");
    const v = preguntaVivaDe(next);
    assert.match(v!.escenario, /más o menos bien/i);
    assert.doesNotMatch(v!.escenario, /fallaste/i);
  });

  it("un 7 pasa a la pregunta 2 del mismo subcódigo", () => {
    assert.equal(extraerEscala("Me pongo en un 7."), 7);
    const ev = evaluarRespuestaLocal(preguntaCanon(1, 1, 1)!, "Me pongo en un 7.");
    assert.equal(ev.pasa, true);
    const next = aplicarRespuesta(libroBase(), "Me pongo en un 7.", ev);
    assert.equal(next.puntero.indice, 2);
    assert.equal(next.puntero.variante, 0);
  });

  it("el conocimiento vacío no pasa; el concreto sí", () => {
    const p = preguntaCanon(1, 1, 2)!;
    assert.equal(evaluarRespuestaLocal(p, "más o menos").pasa, false);
    assert.equal(
      evaluarRespuestaLocal(p, "Conozco el origen del cacao y cómo se tuesta el grano.").pasa,
      true,
    );
  });

  it("sella el capítulo 1 y aplica tope diario", () => {
    let libro = libroBase({
      puntero: { capitulo: 1, subcodigo: 4, indice: 3, variante: 0 },
    });
    const p = preguntaCanon(1, 4, 3)!;
    const cierre = "El 10 sería sostener el hecho, sin flor, con el chasis caliente.";
    const ev = evaluarRespuestaLocal(p, cierre);
    assert.equal(ev.pasa, true);
    const now = "2026-11-05T20:00:00.000Z";
    libro = aplicarRespuesta(libro, cierre, ev, now);
    assert.deepEqual(libro.capitulosSellados, [1]);
    assert.equal(libro.estado, "TOPE_DIARIO");
    assert.equal(libro.capituloSelladoDia, diaLima(now));
    assert.equal(libro.puntero.capitulo, 2);
    assert.equal(puedeAbrirCapitulo(libro, now), false);
    assert.equal(puedeAbrirCapitulo(libro, "2026-11-06T13:00:00.000Z"), true);
  });

  it("en el 2, «la gente» no pasa; un nombre sí", () => {
    const p = preguntaCanon(2, 1, 1)!;
    assert.equal(evaluarRespuestaLocal(p, "La gente de mi barrio.").pasa, false);
    assert.equal(evaluarRespuestaLocal(p, "Mi hermano Carlos.").pasa, true);
  });

  it("el libro se copia sin decir fallaste", () => {
    const ev = evaluarRespuestaLocal(preguntaCanon(1, 1, 1)!, "Un 6.");
    const libro = aplicarRespuesta(libroBase(), "Un 6.", ev);
    const copia = copiarLibro(libro);
    assert.match(copia, /# Libro del gimnasio/);
    assert.match(copia, /Un 6/);
    assert.doesNotMatch(copia, /fallaste/);
  });

  it("parse de evaluación Gemini", () => {
    const ok = parseEvaluacion('{"pasa": false, "motivo": "Niebla."}');
    assert.equal(ok?.pasa, false);
    assert.equal(parseEvaluacion("no-json"), null);
  });

  it("la variante usa fluidez, no un formulario nuevo", () => {
    const p = preguntaCanon(1, 1, 1)!;
    const esc = fluidezVariante(p, "estoy más o menos", 1);
    assert.match(esc, /más o menos/);
    assert.match(esc, /mismo cuarto/);
  });
});

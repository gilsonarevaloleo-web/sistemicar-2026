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
  resolverEvaluacion,
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
    const cierre =
      "El lunes a las 7, antes del depósito, grabo el video del producto con la misma casa desordenada.";
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

  it("la situación del 10 no se traba por un «no sé» dentro de una respuesta concreta", () => {
    const p = preguntaCanon(1, 2, 3)!;
    const niebla = evaluarRespuestaLocal(p, "no sé");
    assert.equal(niebla.pasa, false);
    const concreta = evaluarRespuestaLocal(
      p,
      "No sé si la diferencia sería chica o enorme, pero el 10 sería vender antes del depósito y grabar el video el mismo día, con la prioridad puesta ahí.",
    );
    assert.equal(concreta.pasa, true);
  });

  it("en 1.4.1 el tajo pasa; el slogan y la niebla no", () => {
    const p = preguntaCanon(1, 4, 1)!;
    assert.equal(evaluarRespuestaLocal(p, "Seguiría.").pasa, false);
    assert.equal(evaluarRespuestaLocal(p, "Seguiría porque soy persistente.").pasa, false);
    assert.equal(
      evaluarRespuestaLocal(
        p,
        "Seguiría porque el producto ya está en la casa y no tengo otro oficio que pague la semana.",
      ).pasa,
      true,
    );
    assert.equal(
      evaluarRespuestaLocal(
        p,
        "Me detendría. Sin clientes en el barrio el cuerpo ya no entra al cuarto.",
      ).pasa,
      true,
    );
  });

  it("en 1.4.2 el valor pide número; la agenda de deberes no pasa", () => {
    const p = preguntaCanon(1, 4, 2)!;
    assert.equal(evaluarRespuestaLocal(p, "Es lo más importante.").pasa, false);
    assert.equal(
      evaluarRespuestaLocal(p, "Un 8 entre todos los deberes y tareas de la semana.").pasa,
      false,
    );
    assert.equal(
      evaluarRespuestaLocal(
        p,
        "Un 8. Es el único propósito que, si lo suelto, me deja sin quién soy frente al producto.",
      ).pasa,
      true,
    );
  });

  it("en 1.4.3 la flor no sella; una escena sí", () => {
    const p = preguntaCanon(1, 4, 3)!;
    assert.equal(evaluarRespuestaLocal(p, "Todo va a estar bien y confío en mí.").pasa, false);
    assert.equal(
      evaluarRespuestaLocal(
        p,
        "El lunes a las 7, antes del depósito, grabo el video con la casa igual de desordenada.",
      ).pasa,
      true,
    );
  });

  it("Gemini no retiene una respuesta con sustancia más de una variante", () => {
    const local = { pasa: true, motivo: "Roce." };
    const remota = { pasa: false, motivo: "Sin roce." };
    assert.equal(resolverEvaluacion(local, remota, 0).pasa, false);
    assert.equal(resolverEvaluacion(local, remota, 1).pasa, true);
    assert.equal(resolverEvaluacion(local, null, 0).pasa, true);
    assert.equal(resolverEvaluacion({ pasa: false, motivo: "Niebla." }, remota, 0).pasa, false);
    assert.equal(
      resolverEvaluacion({ pasa: false, motivo: "Niebla." }, { pasa: true, motivo: "Roce." }, 0)
        .pasa,
      true,
    );
  });
});

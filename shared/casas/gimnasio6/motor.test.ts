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
    modulo: "limite",
    limiteOrigen: "No sé quién soy para enamorar. No hay cimiento.",
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

describe("Gimnasio 6 — motor de tres tiempos", () => {
  it("una pregunta a la vez: el puntero no suelta las tres", () => {
    const viva = preguntaVivaDe(libroBase());
    assert.ok(viva);
    assert.match(viva!.pregunta, /quién sos/i);
    assert.equal(viva!.indice, 1);
    const nextSlot = siguientePuntero(1, 1, 1);
    assert.notEqual(nextSlot, "sellar");
    if (nextSlot !== "sellar") assert.equal(nextSlot.indice, 2);
  });

  it("niebla no pasa y planta variante del mismo tiempo", () => {
    const p = preguntaCanon(1, 1, 1)!;
    const ev = evaluarRespuestaLocal(p, "más o menos");
    assert.equal(ev.pasa, false);
    const next = aplicarRespuesta(libroBase(), "más o menos", ev);
    assert.equal(next.puntero.variante, 1);
    assert.equal(next.puntero.indice, 1);
    assert.equal(next.estado, "ABIERTO");
    const v = preguntaVivaDe(next);
    assert.match(v!.escenario, /más o menos/i);
    assert.doesNotMatch(v!.escenario, /fallaste/i);
  });

  it("un yo concreto pasa a rozar, no sella el código", () => {
    const ev = evaluarRespuestaLocal(
      preguntaCanon(1, 1, 1)!,
      "Yo soy el que se para acá. Hay cimiento.",
    );
    assert.equal(ev.pasa, true);
    const next = aplicarRespuesta(
      libroBase(),
      "Yo soy el que se para acá. Hay cimiento.",
      ev,
    );
    assert.equal(next.puntero.indice, 2);
    assert.equal(next.puntero.capitulo, 1);
    assert.equal(next.puntero.variante, 0);
    assert.equal(next.estado, "ABIERTO");
  });

  it("quién soy yo para no planta C1", () => {
    const p = preguntaCanon(1, 1, 1)!;
    assert.equal(
      evaluarRespuestaLocal(p, "Quién soy yo para enamorar a esa chica.").pasa,
      false,
    );
  });

  it("sella el código 1 al tercer tiempo y aplica tope diario", () => {
    let libro = libroBase({
      puntero: { capitulo: 1, subcodigo: 1, indice: 3, variante: 0 },
    });
    const p = preguntaCanon(1, 1, 3)!;
    const cierre = "Queda parado el que cobra. No pido permiso. Hay suelo.";
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

  it("en C2 plantar, «la gente» no pasa; un nombre sí", () => {
    const p = preguntaCanon(2, 1, 1)!;
    assert.equal(evaluarRespuestaLocal(p, "La gente de mi barrio.").pasa, false);
    assert.equal(evaluarRespuestaLocal(p, "Mi hermano Carlos me está mirando.").pasa, true);
  });

  it("el libro se copia sin decir fallaste", () => {
    const ev = evaluarRespuestaLocal(
      preguntaCanon(1, 1, 1)!,
      "Yo soy el que se para. Hay cimiento.",
    );
    const libro = aplicarRespuesta(
      libroBase(),
      "Yo soy el que se para. Hay cimiento.",
      ev,
    );
    const copia = copiarLibro(libro);
    assert.match(copia, /# Libro del gimnasio/);
    assert.match(copia, /Puerta: A/);
    assert.match(copia, /cimiento/i);
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
    assert.match(esc, /mismo/i);
  });

  it("extraerEscala sigue existiendo como utilidad", () => {
    assert.equal(extraerEscala("Me pongo en un 7."), 7);
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

  it("la puerta B usa el Cortador, no el cimiento", () => {
    const viva = preguntaVivaDe(
      libroBase({
        modulo: "vendedor",
        limiteOrigen: "Tengo que vender y me trabo en la primera frase.",
      }),
    );
    assert.ok(viva);
    assert.match(viva!.pregunta, /frase/i);
    assert.match(viva!.etiquetaCapitulo, /Cortador/);
  });
});

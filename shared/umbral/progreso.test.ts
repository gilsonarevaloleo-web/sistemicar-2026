import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aplicarEvaluacionASesion,
  crearSesionUmbral,
} from "./sessionLogic.ts";
import {
  calcularProgresoCarrera,
  calcularProgresoDesdeSesiones,
  codigoTrasAprobar,
  esCodigoElegible,
  extraerLogrosDeSesiones,
  mergeLogros,
  primerCodigoPendiente,
} from "./progreso.ts";

describe("Umbral v2 — progreso de carrera", () => {
  it("sin logros: abre en código 1 y solo ese es elegible", () => {
    const p = calcularProgresoCarrera([]);
    const forja = p.porModo.INTERNO_HABILIDAD;
    assert.deepEqual(forja.superados, []);
    assert.equal(forja.siguiente, 1);
    assert.equal(forja.codigoPorDefecto, 1);
    assert.deepEqual(forja.elegibles, [1]);
    assert.equal(esCodigoElegible(forja, 1), true);
    assert.equal(esCodigoElegible(forja, 2), false);
  });

  it("tras superar 1 y 2, abre en 3 y 1–3 son elegibles", () => {
    let s = crearSesionUmbral({
      id: "s1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 1,
      aprobado: true,
      respuestaUsuario: "Excusa puntual: abrir WhatsApp al sentarme a vender.",
      feedbackGemini: "Avanzas.",
      codigoSiguiente: 2,
      nowIso: "2026-08-01T10:00:00.000Z",
    });
    s = aplicarEvaluacionASesion(s, {
      codigo: 2,
      aprobado: true,
      respuestaUsuario: "Acción mínima: una llamada de 3 minutos a las 9.",
      feedbackGemini: "Ok.",
      codigoSiguiente: 3,
      nowIso: "2026-08-01T10:10:00.000Z",
    });
    const p = calcularProgresoDesdeSesiones([s]);
    const forja = p.porModo.INTERNO_HABILIDAD;
    assert.deepEqual(forja.superados, [1, 2]);
    assert.equal(forja.siguiente, 3);
    assert.equal(forja.codigoPorDefecto, 3);
    assert.deepEqual(forja.elegibles, [1, 2, 3]);
    assert.equal(esCodigoElegible(forja, 2), true);
    assert.equal(esCodigoElegible(forja, 4), false);
    assert.equal(p.logros.length, 2);
    assert.match(p.logros[0].respuestaAprobada, /WhatsApp/);
  });

  it("modos no se mezclan: Arena no hereda Forja", () => {
    let forja = crearSesionUmbral({
      id: "f1",
      userId: "u1",
      modo: "INTERNO_HABILIDAD",
    });
    forja = aplicarEvaluacionASesion(forja, {
      codigo: 1,
      aprobado: true,
      respuestaUsuario: "Excusa puntual nombrada con densidad suficiente.",
      feedbackGemini: "Ok.",
      codigoSiguiente: 2,
    });
    const p = calcularProgresoDesdeSesiones([forja]);
    assert.deepEqual(p.porModo.INTERNO_HABILIDAD.superados, [1]);
    assert.deepEqual(p.porModo.EXTERNO_VENTAS.superados, []);
    assert.equal(p.porModo.EXTERNO_VENTAS.codigoPorDefecto, 1);
  });

  it("si los 10 están superados, todos son elegibles y abre en 1", () => {
    const superados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
    assert.equal(primerCodigoPendiente(superados), null);
    const logros = superados.map((codigo) => ({
      modo: "EXTERNO_VENTAS" as const,
      codigo,
      nombreCodigo: `C${codigo}`,
      intentos: 1,
      respuestaAprobada: `pase del código ${codigo} con densidad`,
      feedbackGemini: "ok",
      psGanados: 3,
      fechaAprobacion: `2026-08-0${Math.min(codigo, 9)}T00:00:00.000Z`,
      sesionId: "full",
    }));
    const arena = calcularProgresoCarrera(logros).porModo.EXTERNO_VENTAS;
    assert.equal(arena.siguiente, null);
    assert.equal(arena.codigoPorDefecto, 1);
    assert.equal(arena.elegibles.length, 10);
    assert.equal(esCodigoElegible(arena, 7), true);
  });

  it("tras aprobar, el siguiente es el primer pendiente (no vuelve a 1)", () => {
    assert.equal(codigoTrasAprobar([1, 2], 3), 4);
    assert.equal(codigoTrasAprobar([1, 2, 3], 2), 4);
    assert.equal(codigoTrasAprobar([1, 2, 3, 4, 5, 6, 7, 8, 9], 10), 1);
  });

  it("mergeLogros deduplica y conserva el historial de días distintos", () => {
    const a = extraerLogrosDeSesiones([]);
    const l1 = {
      modo: "INTERNO_HABILIDAD" as const,
      codigo: 1 as const,
      nombreCodigo: "C1",
      intentos: 2,
      respuestaAprobada: "Día 1: excusa puntual del celular.",
      feedbackGemini: "Avanzas.",
      psGanados: 3,
      fechaAprobacion: "2026-08-01T12:00:00.000Z",
      sesionId: "s1",
    };
    const l2 = {
      ...l1,
      fechaAprobacion: "2026-08-03T12:00:00.000Z",
      respuestaAprobada: "Día 3: otra formulación del mismo corte.",
      sesionId: "s2",
    };
    const merged = mergeLogros(a, [l1, l1, l2]);
    assert.equal(merged.length, 2);
    assert.match(merged[0].respuestaAprobada, /Día 1/);
    assert.match(merged[1].respuestaAprobada, /Día 3/);
  });
});

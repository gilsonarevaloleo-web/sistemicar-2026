import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recursosVacios } from "./motor.ts";
import type { LibroGimnasio } from "./types.ts";
import {
  esLibroContinuable,
  etiquetaLibro,
  formatearCopiaLibroNumerado,
  numeroLibro,
  ordenarLibrosPorCreacion,
} from "./historial.ts";

function libro(
  over: Partial<LibroGimnasio> & Pick<LibroGimnasio, "id" | "createdAt">,
): LibroGimnasio {
  return {
    userId: "u1",
    sesionUmbral5Id: "s1",
    modulo: "social_producto",
    limiteOrigen: "No puedo vender mi producto.",
    recursos: recursosVacios(),
    puntero: { capitulo: 1, subcodigo: 1, indice: 1, variante: 0 },
    estado: "ABIERTO",
    capituloSelladoDia: null,
    capitulosSellados: [],
    turnos: [],
    updatedAt: over.updatedAt ?? over.createdAt,
    ...over,
  };
}

describe("Gimnasio 6 — orden y copia de libros", () => {
  it("numera por createdAt aunque el turno actualice updatedAt", () => {
    const primero = libro({
      id: "l1",
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-04T10:00:00.000Z",
    });
    const segundo = libro({
      id: "l2",
      createdAt: "2026-01-02T10:00:00.000Z",
      updatedAt: "2026-01-02T10:00:00.000Z",
    });
    const orden = ordenarLibrosPorCreacion([primero, segundo]);
    assert.equal(orden[0]?.id, "l2");
    assert.equal(numeroLibro([primero, segundo], "l1"), 1);
    assert.equal(numeroLibro([primero, segundo], "l2"), 2);
  });

  it("marca práctica continuable y copia el libro entero", () => {
    const abierto = libro({
      id: "l1",
      createdAt: "2026-01-01T00:00:00.000Z",
      turnos: [
        {
          id: "t1",
          capitulo: 1,
          subcodigo: 1,
          indice: 1,
          variante: 0,
          escenario: "Ahora tienes tu propósito: vender.",
          pregunta: "¿En qué número te posicionas?",
          respuesta: "Estoy en un 4. Lo sé y no lo muestro.",
          pasa: true,
          creadoAt: "2026-01-01T00:10:00.000Z",
        },
      ],
    });
    assert.equal(esLibroContinuable(abierto), true);
    assert.match(etiquetaLibro(abierto), /Capítulo 1/);
    const copia = formatearCopiaLibroNumerado(abierto, 1);
    assert.match(copia, /GIMNASIO — Libro 1/);
    assert.match(copia, /Estoy en un 4/);
    assert.match(copia, /No puedo vender mi producto/);
    assert.equal(
      esLibroContinuable({ ...abierto, estado: "LIBRO_CERRADO" }),
      false,
    );
  });
});

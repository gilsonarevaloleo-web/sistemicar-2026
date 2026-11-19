import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aplicarRespuesta, recursosVacios } from "./motor.ts";
import { bloqueoPildora, elegirPildora, estadoPildora, puedeElegirPildora } from "./pildoras.ts";
import type { LibroGimnasio } from "./types.ts";

function libro(over: Partial<LibroGimnasio> = {}): LibroGimnasio {
  const now = "2026-11-19T15:00:00.000Z";
  return {
    id: "l1",
    userId: "u1",
    sesionUmbral5Id: "s1",
    modulo: "social_producto",
    limiteOrigen: "x",
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

describe("farmacia — píldoras", () => {
  it("sin progreso se puede elegir cualquiera y el puntero salta al inicio", () => {
    const l = elegirPildora(libro(), 2);
    assert.deepEqual(l.puntero, { capitulo: 2, subcodigo: 1, indice: 1, variante: 0 });
  });

  it("con una píldora en curso, las demás quedan bloqueadas", () => {
    const l = libro({ puntero: { capitulo: 1, subcodigo: 2, indice: 1, variante: 0 } });
    assert.equal(estadoPildora(l, 1), "en_curso");
    assert.equal(bloqueoPildora(l, 2), "en_curso_otra");
    assert.equal(puedeElegirPildora(l, 2), false);
    assert.equal(elegirPildora(l, 2), l);
  });

  it("sellada hoy bloquea por tope diario; mañana permite repetirla", () => {
    const l = libro({
      estado: "LIBRO_CERRADO",
      capitulosSellados: [1, 2],
      capituloSelladoDia: "2026-11-19",
    });
    const hoy = "2026-11-19T20:00:00.000Z";
    const manana = "2026-11-20T20:00:00.000Z";
    assert.equal(bloqueoPildora(l, 1, hoy), "tope_diario");
    assert.equal(estadoPildora(l, 1), "completada");
    const repetida = elegirPildora(l, 1, manana);
    assert.equal(repetida.estado, "ABIERTO");
    assert.equal(repetida.puntero.capitulo, 1);
  });

  it("no existen píldoras no preparadas", () => {
    assert.equal(puedeElegirPildora(libro(), 3), false);
  });

  it("al repetir una píldora sellada pasa al final de los sellados", () => {
    let l = libro({
      puntero: { capitulo: 1, subcodigo: 4, indice: 3, variante: 0 },
      capitulosSellados: [1, 2],
    });
    l = aplicarRespuesta(l, "una escena concreta de mi vida", { pasa: true, motivo: "" });
    assert.deepEqual(l.capitulosSellados, [2, 1]);
  });
});

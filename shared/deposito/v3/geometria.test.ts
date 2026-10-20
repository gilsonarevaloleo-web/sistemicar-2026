import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoAlumnoDe,
  primerPendienteCascada,
} from "./cascada.ts";
import {
  auditarGeometriaSintactica,
  extraerTitulo,
  titleConnectedToClose,
} from "./geometria.ts";
import { buildActiveCharacterMap } from "./ojos.ts";

describe("Geometría sintáctica fría", () => {
  it("el título es C1, nunca C10 por sí solo", () => {
    const geo = auditarGeometriaSintactica({
      rawFact: "Hoy no hice nada. Ya veré.",
      studentHypothesis: "C10 La matriz de mi abundancia cuántica",
      userTier: "MATRICULA",
    });
    assert.equal(extraerTitulo({
      rawFact: "Hoy no hice nada. Ya veré.",
      studentHypothesis: "C10 La matriz de mi abundancia cuántica",
      userTier: "MATRICULA",
    }), "C10 La matriz de mi abundancia cuántica");
    assert.equal(geo.active[1], true);
    assert.equal(geo.active[10], false);
    assert.equal(geo.titleConnectedToClose, false);
  });

  it("sin título C10 es vacío por imposibilidad de retorno", () => {
    const geo = auditarGeometriaSintactica({
      rawFact: "Vi el patrón. El modelo se repite. El origen de este hecho es la matriz.",
      userTier: "MATRICULA",
    });
    assert.equal(geo.active[1], false);
    assert.equal(geo.active[10], false);
    assert.equal(titleConnectedToClose("", "El origen de este hecho es la matriz."), false);
  });

  it("el cierre abrocha solo si responde al vector del título", () => {
    assert.equal(
      titleConnectedToClose("El pistón del martes", "Así el pistón del martes vuelve."),
      true,
    );
    assert.equal(
      titleConnectedToClose("El pistón del martes", "Ya veré mañana."),
      false,
    );
  });

  it("C6 nombra fuente sin juzgar validez", () => {
    const geo = auditarGeometriaSintactica({
      rawFact: "Lo saqué del libro de banco y de la experiencia en el taller.",
      studentHypothesis: "Fuente",
      userTier: "MATRICULA",
    });
    assert.equal(geo.active[6], true);
  });

  it("C9 exige tres dimensiones conectadas, no un solo hilo", () => {
    const soloTrabajo = auditarGeometriaSintactica({
      rawFact: "El pistón del trabajo se trabó en la secuencia.",
      studentHypothesis: "Trabajo",
      userTier: "MATRICULA",
    });
    assert.equal(soloTrabajo.active[9], false);

    const triple = auditarGeometriaSintactica({
      rawFact:
        "El cuerpo pedía parar al mismo tiempo que el trabajo del desglosador y el entorno de la casa se cargaban.",
      studentHypothesis: "Carga triple",
      userTier: "MATRICULA",
    });
    assert.equal(triple.active[9], true);
  });
});

describe("Ley de la Cascada", () => {
  it("el primer pendiente sigue C1→C2→C4→C5→C7→C10", () => {
    const vacio = buildActiveCharacterMap([]);
    assert.equal(primerPendienteCascada(vacio), 1);
    assert.equal(estadoAlumnoDe(vacio), "PRINCIPIANTE_SIN_ANCLA");

    const conC1 = buildActiveCharacterMap([1, 3, 7]);
    assert.equal(primerPendienteCascada(conC1), 2);
    assert.equal(estadoAlumnoDe(conC1), "EXPLORADOR_NARRATIVO");

    const conC4 = buildActiveCharacterMap([1, 2, 4]);
    assert.equal(primerPendienteCascada(conC4), 5);
    assert.equal(estadoAlumnoDe(conC4), "ENLACE_EN_TRANSMUTACION");

    const cerrado = buildActiveCharacterMap([1, 2, 4, 5, 7, 10]);
    assert.equal(primerPendienteCascada(cerrado), null);
    assert.equal(estadoAlumnoDe(cerrado), "ARQUITECTO_GROUNDED");
  });
});

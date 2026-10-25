import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoAlumnoDe,
  primerPendienteCascada,
  reconciliarCascada,
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

  it("C5 enciende con conectores ejecutivos de decisión", () => {
    for (const rawFact of [
      "Mi decisión es cortar el paso.",
      "Decido parar ahora.",
      "Voy a trazar una línea.",
      "Mi atención lo saco del trabajo y cambio de enfoque.",
      "Elegimos ignorarlo. Ahí está el daño.",
    ]) {
      const geo = auditarGeometriaSintactica({
        rawFact,
        userTier: "MATRICULA",
      });
      assert.equal(geo.active[5], true, rawFact);
    }
  });

  it("C7 enciende con solución o patrón propio", () => {
    const geo = auditarGeometriaSintactica({
      rawFact: "Mi solución es encajar esto en una idea mía. Concluyo que el patrón es el salteo.",
      studentHypothesis: "Encaje",
      userTier: "MATRICULA",
    });
    assert.equal(geo.active[7], true);
  });

  it("C7 enciende con aprendí que / conclusión / ley con ciclo de vida", () => {
    const geo = auditarGeometriaSintactica({
      rawFact:
        "Hoy aprendí que la atención tiene ciclo de vida. Esto me lleva a la conclusión que la ley tiene un tope.",
      studentHypothesis: "La ley",
      userTier: "MATRICULA",
    });
    assert.equal(geo.active[7], true);
  });

  it("C3 enciende con cadena entonces → en ese momento → empiezo / logro", () => {
    const geo = auditarGeometriaSintactica({
      rawFact:
        "Entonces saqué la atención. En ese momento empiezo a escuchar audio; con ese cambio logro que no salte la alerta.",
      userTier: "MATRICULA",
    });
    assert.equal(geo.active[3], true);
    assert.equal(geo.active[5], true);
  });

  it("C10 abrocha con sello explícito que vuelve al título", () => {
    const geo = auditarGeometriaSintactica({
      rawFact:
        "El pistón del martes. Primero el aceite. Esto cierra el pistón del martes.",
      studentHypothesis: "El pistón del martes",
      userTier: "TITULO",
    });
    assert.equal(geo.active[1], true);
    assert.equal(geo.active[10], true);
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

    const hastaC6 = buildActiveCharacterMap([1, 2, 3, 4, 5, 6]);
    assert.equal(primerPendienteCascada(hastaC6), 7);
    assert.notEqual(primerPendienteCascada(hastaC6), 5);
  });

  it("reconciliar no deja FOCO C5 si C5 ya está activo", () => {
    const sync = reconciliarCascada({
      map: buildActiveCharacterMap([1, 2, 3, 4, 5, 6]),
      lowestMissingCascadeCode: 5,
      focoRevelacionCode: 5,
      syntacticVacios: [5, 7, 8, 9, 10],
    });
    assert.ok(sync.activeCodes.includes(5));
    assert.ok(sync.activeCodes.includes(6));
    assert.equal(sync.syntacticVacios.includes(5), false);
    assert.equal(sync.lowestMissingCascadeCode, 7);
    assert.equal(sync.focoRevelacionCode, 7);
    assert.equal(sync.syntacticVacios.includes(7), true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoAlumnoDe,
  mensajeDiagnosticoCascada,
  peldañoPendienteEnlace,
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
    assert.equal(
      titleConnectedToClose(
        "El desarrollo de habilidades tienen límite",
        "En conclusión, el siguiente nivel de desarrollo con nuestra habilidad va a otro plano mental.",
      ),
      true,
    );
    assert.equal(
      titleConnectedToClose(
        "Ley del ciclo, código 8",
        "En conclusión ya veré mañana.",
      ),
      false,
    );
    assert.equal(
      titleConnectedToClose(
        "Acá pareció el código 7, la vision",
        "La conclusión es crear la vista neuronal con visión planeta 7.",
      ),
      true,
    );
  });

  it("C5 enciende con conectores ejecutivos de decisión", () => {
    for (const rawFact of [
      "Mi decisión es cortar el paso.",
      "Decido parar ahora.",
      "Voy a trazar una línea.",
      "Mi atención lo saco del trabajo y cambio de enfoque.",
      "Elegimos ignorarlo. Ahí está el daño.",
      "Hasta la desición que debería ejecutar. El cuerpo no quería ejecutar una desición.",
      "El problema no es falta de desición sino falta de visión.",
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

  it("ley del ciclo + bucle firma C8; en conclusión vuelve al límite de la habilidad y abrocha C10", () => {
    const geo = auditarGeometriaSintactica({
      rawFact: `Hoy aprendí que el desarrollo de habilidades tienen límite.
Hasta 3 días incrementé. Al cuarto día la habilidad funciona en bucle. Entonces ¿en qué estado se pudiera llevarlo al otro nivel?
En conclusión si se quiere pasar al siguiente nivel de desarrollo con nuestra habilidad, se tiene que llevar a otro plano mental.`,
      studentHypothesis:
        "Acá pareció la ley del ciclo, código 8 porque es como funciona la nayuraleza",
      userTier: "CARRERA",
    });
    assert.equal(geo.characterSignedCode, 8);
    assert.equal(geo.active[8], true);
    assert.equal(geo.active[10], true);
    assert.equal(geo.titleConnectedToClose, true);
  });

  it("código 7 / desición en el papel: firma C7, C5 activo, C10 abrocha la visión", () => {
    const geo = auditarGeometriaSintactica({
      rawFact: `Hoy aprendi que los problemas no solamente son por falta de desición sino por falta de visión.
Hasta la desición que debería ejecutar. La solución es visión estructurada.
La conclusión es que si el cuerpo no quiere ejecutar una desición, lo sabio es crear la vista neuronal con visión planeta 7.`,
      studentHypothesis: "Acá pareció el código 7, la vision",
      userTier: "CARRERA",
    });
    assert.equal(geo.active[5], true);
    assert.equal(geo.active[7], true);
    assert.equal(geo.characterSignedCode, 7);
    assert.equal(geo.active[10], true);
    assert.equal(geo.titleConnectedToClose, true);
  });

  it("C8 enciende con batería de atención / onda de sierra, no con C10", () => {
    const geo = auditarGeometriaSintactica({
      rawFact:
        "Hoy aprendí que la atención tiene límite. Todo enfoque es como una batería que se acaba. Después que se ha acabado la batería de la atención, si insistimos con deber, ocurre el desgaste multiplicado. Otra identidad se quedó de hambre.",
      studentHypothesis:
        "Código 1. La atención tiene límite y la batería está en su límite más bajo",
      userTier: "MATRICULA",
    });
    assert.equal(geo.active[8], true);
    assert.equal(geo.active[10], false);
    assert.equal(geo.titleConnectedToClose, false);
    assert.equal(geo.characterSignedCode, 8);
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

  it("el dictamen de enlace no llama tijera a un C10 vacío", () => {
    assert.equal(
      peldañoPendienteEnlace(10),
      "Falta C10 para abrochar el título con la última oración.",
    );
    assert.equal(peldañoPendienteEnlace(5), "Falta C5 para ejecutar la tijera.");
    assert.equal(
      peldañoPendienteEnlace(7),
      "Falta C7 para ejecutar la idea propia.",
    );
    const mensaje = mensajeDiagnosticoCascada({
      estado: "ENLACE_EN_TRANSMUTACION",
      lowest: 10,
      activeCodes: [1, 2, 3, 4, 5, 6, 7, 8],
      titleConnectedToClose: false,
      characterSignedCode: 8,
    });
    assert.match(mensaje, /Falta C10 para abrochar/);
    assert.doesNotMatch(mensaje, /tijera|idea propia/);
    assert.match(mensaje, /Cableado título↔cierre: no/);
    assert.match(mensaje, /Firma C8/);
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

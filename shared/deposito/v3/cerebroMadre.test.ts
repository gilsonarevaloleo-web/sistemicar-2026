import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scaffoldAnalysisResult } from "./validar.ts";
import {
  absorbPrincipio,
  absorbPrincipioDesdeVolcado,
  bloqueLeyesCasaPrompt,
  cerebroVacio,
  enviarAFiltro,
  extraerPrincipioAprendizaje,
  formatFechaPrincipio,
  leyesDeCasa,
  promoverALey,
  rechazarPrincipio,
  resumenCerebroMadre,
} from "./cerebroMadre.ts";
import type { DepotEntryPayload } from "./types.ts";

const NACIMIENTO = Date.UTC(2026, 9, 18, 12, 0, 0);

const VOLCADO_LARGO =
  "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite. No es clima.";

function payload(rawFact: string): DepotEntryPayload {
  return { rawFact, userTier: "MATRICULA" };
}

function resultC2C7() {
  return scaffoldAnalysisResult({
    characterSignedCode: 2,
    focoRevelacionCode: 7,
    groundingStatus: {
      isFullyGrounded: true,
      diagnosticMessage: "Firma C2 con axioma de cierre C7.",
    },
  });
}

describe("Depósito V3 — Cerebro Madre", () => {
  it("un clima corto no deja candidato", () => {
    const corto = extraerPrincipioAprendizaje({
      payload: payload("Estoy cansado y me sentí mal."),
      result: scaffoldAnalysisResult({ characterSignedCode: 1 }),
      now: NACIMIENTO,
    });
    assert.equal(corto, null);

    const absorbido = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: payload("Hoy fue feo."),
      result: scaffoldAnalysisResult({ characterSignedCode: 1 }),
      now: NACIMIENTO,
    });
    assert.equal(absorbido.evolucion, "sin-cambio");
    assert.equal(absorbido.cerebro.principios.length, 0);
  });

  it("extrae pedagogía de escritura, no el diario del alumno", () => {
    const p = extraerPrincipioAprendizaje({
      payload: {
        rawFact: VOLCADO_LARGO,
        studentHypothesis: "Mi pelea con el cliente es culpa de nadie.",
        userTier: "MATRICULA",
      },
      result: resultC2C7(),
      now: NACIMIENTO,
    });
    assert.ok(p);
    assert.equal(p.estado, "candidato");
    assert.equal(p.foco, 7);
    assert.equal(p.firma, 2);
    assert.equal(p.createdAt, NACIMIENTO);
    assert.match(p.enunciado, /percepción de C7/i);
    assert.match(p.enunciado, /patrón|frase/i);
    assert.doesNotMatch(p.enunciado, /firma C2/i);
    assert.match(p.acomodo, /firma C2|narra en C2/i);
    assert.match(p.acomodo, /C7/);
    assert.doesNotMatch(p.enunciado, /pelea con el cliente|culpa de nadie/i);
    assert.doesNotMatch(p.acomodo, /pelea con el cliente|culpa de nadie/i);
    assert.doesNotMatch(p.enunciado, /9:00|pistón se atasca/i);
    assert.doesNotMatch(p.acomodo, /9:00|pistón se atasca/i);
  });

  it("createdAt no se toca al reforzar, filtrar ni promover", () => {
    const primero = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: payload(VOLCADO_LARGO),
      result: resultC2C7(),
      now: NACIMIENTO,
    });
    assert.equal(primero.evolucion, "nuevo");
    const id = primero.principio!.id;
    assert.equal(primero.principio!.createdAt, NACIMIENTO);

    const reforzado = absorbPrincipioDesdeVolcado(primero.cerebro, {
      payload: payload(
        `${VOLCADO_LARGO} Otra vez el modelo se repite en la secuencia del pistón.`,
      ),
      result: resultC2C7(),
      now: NACIMIENTO + 86_400_000,
    });
    assert.equal(reforzado.evolucion, "reforzado");
    assert.equal(reforzado.cerebro.principios.length, 1);
    assert.equal(reforzado.principio!.createdAt, NACIMIENTO);
    assert.equal(reforzado.principio!.usos, 2);
    assert.equal(reforzado.principio!.estado, "candidato");

    const filtrado = enviarAFiltro(
      reforzado.cerebro,
      id,
      NACIMIENTO + 2 * 86_400_000,
    );
    const enFiltro = filtrado.principios[0];
    assert.equal(enFiltro.estado, "filtro");
    assert.equal(enFiltro.createdAt, NACIMIENTO);
    assert.equal(enFiltro.evaluatedAt, NACIMIENTO + 2 * 86_400_000);

    const ley = promoverALey(filtrado, id, NACIMIENTO + 3 * 86_400_000);
    const sellada = leyesDeCasa(ley)[0];
    assert.equal(sellada.estado, "ley");
    assert.equal(sellada.createdAt, NACIMIENTO);
    assert.equal(sellada.promotedAt, NACIMIENTO + 3 * 86_400_000);
    assert.equal(sellada.usos, 2);
  });

  it("no salta de candidato a ley y no despublica una ley", () => {
    const nacido = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: payload(VOLCADO_LARGO),
      result: resultC2C7(),
      now: NACIMIENTO,
    });
    const id = nacido.principio!.id;
    const salto = promoverALey(nacido.cerebro, id, NACIMIENTO + 1);
    assert.equal(salto.principios[0].estado, "candidato");
    assert.equal(leyesDeCasa(salto).length, 0);

    const filtrado = enviarAFiltro(nacido.cerebro, id, NACIMIENTO + 2);
    const casa = promoverALey(filtrado, id, NACIMIENTO + 3);
    const despublicar = rechazarPrincipio(casa, id, NACIMIENTO + 4);
    assert.equal(despublicar.principios[0].estado, "ley");
    assert.equal(despublicar.principios[0].createdAt, NACIMIENTO);
  });

  it("el bloque de prompt cita solo leyes y muestra la fecha de creación", () => {
    assert.equal(bloqueLeyesCasaPrompt([]), "");
    const nacido = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: payload(VOLCADO_LARGO),
      result: resultC2C7(),
      now: NACIMIENTO,
    });
    assert.equal(bloqueLeyesCasaPrompt(nacido.cerebro.principios), "");
    const id = nacido.principio!.id;
    const casa = promoverALey(
      enviarAFiltro(nacido.cerebro, id, NACIMIENTO + 1),
      id,
      NACIMIENTO + 2,
    );
    const bloque = bloqueLeyesCasaPrompt(casa.principios);
    assert.match(bloque, /LEYES DE CASA/);
    assert.match(bloque, /C7/);
    assert.match(bloque, /18 oct 2026/);
    assert.ok(bloque.includes(formatFechaPrincipio(NACIMIENTO)));
    assert.match(bloque, /Prohibido citar un candidato/);
    assert.doesNotMatch(bloque, /estado: candidato/);
  });

  it("el resumen nombra bandejas y no mezcla V2", () => {
    assert.match(resumenCerebroMadre(cerebroVacio()), /No publica sola/);
    const p = extraerPrincipioAprendizaje({
      payload: payload(VOLCADO_LARGO),
      result: resultC2C7(),
      now: NACIMIENTO,
    });
    const cerebro = absorbPrincipio(cerebroVacio(), p).cerebro;
    assert.match(resumenCerebroMadre(cerebro), /1 candidato/);
    assert.doesNotMatch(resumenCerebroMadre(cerebro), /axioma del operador|Criterio Vivo/i);
  });

  it("el próximo volcado se mide: ¿construyó el C pedido?", () => {
    const primero = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: payload(VOLCADO_LARGO),
      result: resultC2C7(),
      now: NACIMIENTO,
    });
    assert.equal(primero.principio!.pedidos, 0);
    assert.equal(primero.cerebro.pedidoPendiente?.codigo, 7);

    const confirma = absorbPrincipioDesdeVolcado(primero.cerebro, {
      payload: payload(
        `${VOLCADO_LARGO} Otra vez el modelo se repite: el patrón se nombra en una frase.`,
      ),
      result: resultC2C7(),
      now: NACIMIENTO + 86_400_000,
    });
    assert.equal(confirma.evolucion, "reforzado");
    assert.equal(confirma.principio!.createdAt, NACIMIENTO);
    assert.equal(confirma.principio!.pedidos, 1);
    assert.equal(confirma.principio!.confirmados, 1);
    assert.equal(confirma.principio!.ultimaMedida?.construyo, true);
    assert.equal(confirma.principio!.ultimaMedida?.codigo, 7);
    assert.match(resumenCerebroMadre(confirma.cerebro), /próximo 1\/1/);

    const falla = absorbPrincipioDesdeVolcado(confirma.cerebro, {
      payload: payload(
        "Primero abrí el taller. Después armé el pistón. Luego salió el primer turno. La secuencia A B C se sostiene y no nombra ninguna ley.",
      ),
      result: scaffoldAnalysisResult({
        characterSignedCode: 3,
        focoRevelacionCode: 3,
        groundingStatus: {
          isFullyGrounded: true,
          diagnosticMessage: "Secuencia C3 sin axioma.",
        },
      }),
      now: NACIMIENTO + 2 * 86_400_000,
    });
    const c7 = falla.cerebro.principios.find((p) => p.foco === 7);
    assert.ok(c7);
    assert.equal(c7.pedidos, 2);
    assert.equal(c7.confirmados, 1);
    assert.equal(c7.ultimaMedida?.construyo, false);
    assert.equal(c7.createdAt, NACIMIENTO);
    assert.equal(falla.cerebro.pedidoPendiente?.codigo, 3);
  });
});

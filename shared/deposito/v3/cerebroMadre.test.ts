import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scaffoldAnalysisResult } from "./validar.ts";
import {
  absorbPrincipio,
  absorbPrincipioDesdeVolcado,
  bloqueLeyesCasaPrompt,
  categoriaDe,
  cerebroVacio,
  enviarAFiltro,
  escribirAplicacion,
  extraerPrincipioAprendizaje,
  formatFechaPrincipio,
  leyesDeCasa,
  promoverALey,
  rechazarPrincipio,
  resumenCerebroMadre,
} from "./cerebroMadre.ts";
import { diagnosticarAuditoriaLocal } from "./motor.ts";
import type { DepotEntryPayload } from "./types.ts";

const NACIMIENTO = Date.UTC(2026, 9, 18, 12, 0, 0);

const VOLCADO_C4_C7: DepotEntryPayload = {
  rawFact:
    "Vi el patrón: cada vez que salteo la secuencia a las 9:00, 9:20, 9:40 el pistón se atasca. El modelo se repite. No es clima.",
  studentHypothesis: "El pistón se atasca cuando salto el orden",
  userTier: "MATRICULA",
};

const VOLCADO_08: DepotEntryPayload = {
  rawFact: `Hoy aprendi que el valor interno se siente más de que puede gritar el ego exterior.
Por eso dado este aprendisaje a partir de hoy en adelante lo primero que debo hacer es si soy.
Por eso razón el valor personal no se expresa hablando de nuestro valor, sino nuestro valor se expresa crusando el valor de importancia en los demás.`,
  studentHypothesis: "Acá apareció el código 1  la ley del valor en los demas",
  detectedNoise: "No hay",
  omittedShadow: "La boca habla de lo que nos falta",
  userTier: "CARRERA",
};

const VOLCADO_09: DepotEntryPayload = {
  rawFact: `Hoy aprendi que el cansancio es el enfoque el polo positivo a más de 90 minutos.
Hace como un mes atrás estaba trabajando en otro taller. El sueño me dominaba. Cambié el enfoque al polo contrario, los puentes, sin cambiar el movimiento.
Por eso digo que el cansancio solo es enfoque en lo mismo a mayor de 90 minutos si cambiamos de enfoque al polo contrario- los puentes sin cambiar la mecánica de movimiento.`,
  studentHypothesis: "Acá pareció la ley de la economía de energía código 7",
  detectedNoise: "No hay",
  omittedShadow: "El cuerpo sigue a la atención",
  userTier: "CARRERA",
};

const VOLCADO_11: DepotEntryPayload = {
  rawFact: `Hoy aprendi que la necesidad de un cliente puede que no exista, hasta que se lo haga conciente.
Habeces me encuentro aburrido y me voy a Facebook, ahí encuentro publicidad y esa publicidad crea una necesidad.
Por eso digo que la necesidad no existe hasta que un vendedor lo haga conciente de la necesidad del cliente.`,
  studentHypothesis: "La ley de si no lo ve, no existe. Código 1",
  detectedNoise: "No hay",
  omittedShadow: "Mostrar la necesidad no es forsarlo",
  userTier: "CARRERA",
};

function payload(rawFact: string): DepotEntryPayload {
  return { rawFact, userTier: "MATRICULA" };
}

function sellar(cerebro: ReturnType<typeof cerebroVacio>, id: string, now: number) {
  return promoverALey(enviarAFiltro(cerebro, id, now), id, now + 1);
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

  it("un dump C4+C7 sin C9 no entra como candidato de ley", () => {
    const result = diagnosticarAuditoriaLocal(VOLCADO_C4_C7);
    const p = extraerPrincipioAprendizaje({
      payload: VOLCADO_C4_C7,
      result,
      now: NACIMIENTO,
    });
    assert.equal(p, null);
    assert.equal(result.activeCharacterMap[9], false);
  });

  it("C9 principio sistémico entra al Cerebro Madre, no el ego C1 ni el diario", () => {
    const result = diagnosticarAuditoriaLocal(VOLCADO_08);
    const p = extraerPrincipioAprendizaje({
      payload: VOLCADO_08,
      result,
      now: NACIMIENTO,
    });
    assert.ok(p);
    assert.equal(p.estado, "candidato");
    assert.equal(p.foco, 9);
    assert.equal(p.firma, 9);
    assert.equal(p.aplicacion, "");
    assert.equal(categoriaDe(p.foco), "Soberanía");
    assert.match(p.enunciado, /valor personal|importancia en los demás/i);
    assert.doesNotMatch(p.enunciado, /esposa|reclamo|costura|ego exterior/i);
    assert.match(p.acomodo, /principio sistémico|afirmación sin duda/i);
    assert.doesNotMatch(p.escritura, /tres dimensiones|fisiología/i);
  });

  it("el volcado 11/11 C9 entra; dos C9 distintos no se fusionan", () => {
    const r11 = diagnosticarAuditoriaLocal(VOLCADO_11);
    const p11 = extraerPrincipioAprendizaje({
      payload: VOLCADO_11,
      result: r11,
      now: NACIMIENTO,
    });
    assert.ok(p11);
    assert.equal(p11.foco, 9);
    assert.match(p11.enunciado, /necesidad no existe/i);

    const primero = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: VOLCADO_08,
      result: diagnosticarAuditoriaLocal(VOLCADO_08),
      now: NACIMIENTO,
    });
    const segundo = absorbPrincipioDesdeVolcado(primero.cerebro, {
      payload: VOLCADO_11,
      result: r11,
      now: NACIMIENTO + 86_400_000,
    });
    assert.equal(segundo.evolucion, "nuevo");
    assert.equal(segundo.cerebro.principios.length, 2);
    const enunciados = segundo.cerebro.principios.map((p) => p.enunciado).join(" ");
    assert.match(enunciados, /valor personal/i);
    assert.match(enunciados, /necesidad no existe/i);
  });

  it("el mismo enunciado C9 se refuerza y conserva createdAt", () => {
    const result = diagnosticarAuditoriaLocal(VOLCADO_09);
    const primero = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: VOLCADO_09,
      result,
      now: NACIMIENTO,
    });
    assert.equal(primero.evolucion, "nuevo");
    const id = primero.principio!.id;
    assert.equal(primero.principio!.createdAt, NACIMIENTO);
    assert.equal(primero.principio!.aplicacion, "");

    const reforzado = absorbPrincipioDesdeVolcado(primero.cerebro, {
      payload: VOLCADO_09,
      result,
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
    const conApp = escribirAplicacion(
      filtrado,
      id,
      "Cambia de polo (puentes) sin cambiar el movimiento.",
    );
    assert.equal(
      conApp.principios[0].aplicacion,
      "Cambia de polo (puentes) sin cambiar el movimiento.",
    );
    assert.equal(conApp.principios[0].createdAt, NACIMIENTO);

    const ley = promoverALey(conApp, id, NACIMIENTO + 3 * 86_400_000);
    const sellada = leyesDeCasa(ley)[0];
    assert.equal(sellada.estado, "ley");
    assert.equal(sellada.createdAt, NACIMIENTO);
    assert.equal(sellada.promotedAt, NACIMIENTO + 3 * 86_400_000);
    assert.equal(sellada.usos, 2);
    assert.match(sellada.aplicacion, /polo/);
  });

  it("no salta de candidato a ley y no despublica una ley", () => {
    const nacido = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: VOLCADO_08,
      result: diagnosticarAuditoriaLocal(VOLCADO_08),
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
    const reescribir = escribirAplicacion(despublicar, id, "no debe entrar");
    assert.equal(reescribir.principios[0].aplicacion, "");
  });

  it("el bloque de prompt cita solo leyes y muestra la fecha de creación", () => {
    assert.equal(bloqueLeyesCasaPrompt([]), "");
    const nacido = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: VOLCADO_08,
      result: diagnosticarAuditoriaLocal(VOLCADO_08),
      now: NACIMIENTO,
    });
    assert.equal(bloqueLeyesCasaPrompt(nacido.cerebro.principios), "");
    const id = nacido.principio!.id;
    const casa = sellar(nacido.cerebro, id, NACIMIENTO + 1);
    const bloque = bloqueLeyesCasaPrompt(casa.principios);
    assert.match(bloque, /LEYES DE CASA/);
    assert.match(bloque, /C9/);
    assert.match(bloque, /Soberanía/);
    assert.match(bloque, /18 oct 2026/);
    assert.ok(bloque.includes(formatFechaPrincipio(NACIMIENTO)));
    assert.match(bloque, /Prohibido citar un candidato/);
    assert.doesNotMatch(bloque, /estado: candidato/);
  });

  it("el resumen nombra bandejas y no mezcla V2", () => {
    assert.match(resumenCerebroMadre(cerebroVacio()), /No publica sola/);
    const p = extraerPrincipioAprendizaje({
      payload: VOLCADO_08,
      result: diagnosticarAuditoriaLocal(VOLCADO_08),
      now: NACIMIENTO,
    });
    const cerebro = absorbPrincipio(cerebroVacio(), p).cerebro;
    assert.match(resumenCerebroMadre(cerebro), /1 candidato/);
    assert.doesNotMatch(resumenCerebroMadre(cerebro), /axioma del operador|Criterio Vivo/i);
  });

  it("el próximo volcado se mide: ¿construyó el C pedido?", () => {
    const primero = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: VOLCADO_09,
      result: diagnosticarAuditoriaLocal(VOLCADO_09),
      now: NACIMIENTO,
    });
    assert.equal(primero.principio!.pedidos, 0);
    assert.equal(primero.cerebro.pedidoPendiente?.codigo, 9);

    const confirma = absorbPrincipioDesdeVolcado(primero.cerebro, {
      payload: VOLCADO_09,
      result: diagnosticarAuditoriaLocal(VOLCADO_09),
      now: NACIMIENTO + 86_400_000,
    });
    assert.equal(confirma.evolucion, "reforzado");
    assert.equal(confirma.principio!.createdAt, NACIMIENTO);
    assert.equal(confirma.principio!.pedidos, 1);
    assert.equal(confirma.principio!.confirmados, 1);
    assert.equal(confirma.principio!.ultimaMedida?.construyo, true);
    assert.equal(confirma.principio!.ultimaMedida?.codigo, 9);
    assert.match(resumenCerebroMadre(confirma.cerebro), /próximo 1\/1/);

    const falla = absorbPrincipioDesdeVolcado(confirma.cerebro, {
      payload: VOLCADO_C4_C7,
      result: diagnosticarAuditoriaLocal(VOLCADO_C4_C7),
      now: NACIMIENTO + 2 * 86_400_000,
    });
    assert.equal(falla.evolucion, "sin-cambio");
    const c9 = falla.cerebro.principios.find((p) => p.foco === 9);
    assert.ok(c9);
    assert.equal(c9.pedidos, 2);
    assert.equal(c9.confirmados, 1);
    assert.equal(c9.ultimaMedida?.construyo, false);
    assert.equal(c9.createdAt, NACIMIENTO);
    assert.equal(falla.cerebro.principios.length, 1);
  });
});

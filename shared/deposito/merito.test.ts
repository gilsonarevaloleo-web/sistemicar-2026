import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticarVolcadoLocal } from "./engineConfig.ts";
import {
  MATRIZ_TEMPERAMENTO,
  TEMPERAMENTO_MODO_OPERATIVO,
  buildDepositoSystemPrompt,
  calcularDensidadEstructural,
  detectarFlorMerito,
  evaluarMeritoVolcado,
  sugerirRotacionCodigo,
  toDepositoEngineResponse,
} from "./merito.ts";
import { normalizarCapturaVolcado } from "./engineConfig.ts";

const HIJA = `Ayer aprendí que mí hija de 4 años entiende de una manera sorpréndete. Sobre lo que los mayores hablan a su alrededor. Yo creí los niños de 4 años son cero comprension sobre procesos supuestamente complejo ¿Porque digo eso? Ayer mí esposa estaba mandándole a juntar sus cosas a mí hija diciendole: tienes que juntar tus cosas, una niña que no es ordenada, le hacía comparaciones con otras niñas además le adicionada promesa de castigo y entonces mí hija empezó a llorar. Le estás amontonando carga cognitiva a una niña de 4 años. Después de unos 5 minutos mí hija vino ¿Cómo se llama eso lo que mí mamá hace papí? y dijo: "papá yo soy una niña, no puedo hacer eso"`;

const SECO = `Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.`;

describe("Depósito v2 — mérito, placement y temperamento", () => {
  it("la matriz cubre G1–G4 con los cuatro temperamentos", () => {
    assert.equal(MATRIZ_TEMPERAMENTO[1].codigo, "NUTRITIVO_INERCIA");
    assert.equal(MATRIZ_TEMPERAMENTO[2].codigo, "FRICCION_MODERADA");
    assert.equal(MATRIZ_TEMPERAMENTO[3].codigo, "RIGOR_QUIRURGICO");
    assert.equal(MATRIZ_TEMPERAMENTO[4].codigo, "MATEMATICA_PURA");
    assert.equal(
      MATRIZ_TEMPERAMENTO[1].instruccionPrompt,
      TEMPERAMENTO_MODO_OPERATIVO[1],
    );
    assert.match(buildDepositoSystemPrompt(2), /FRICCIÓN MODERADA/);
    assert.match(buildDepositoSystemPrompt(2), /adjetivos y comparaciones/);
  });

  it("clima corto se queda en G1 sin mérito", () => {
    const captura = normalizarCapturaVolcado("hoy fue feo");
    const r = evaluarMeritoVolcado({ captura });
    assert.equal(r.evaluacion.gradoDetectado, 1);
    assert.equal(r.evaluacion.meritoReconocido, false);
    assert.ok(r.metricas.densidadEstructural < 35);
    assert.ok(r.florDetectada.includes("clima"));
  });

  it("lectura seca sin flor reconoce G3 desde G1 (entrada por mérito)", () => {
    const captura = normalizarCapturaVolcado({
      gradoMaestria: 1,
      volcadoCrudo: SECO,
    });
    const r = evaluarMeritoVolcado({ captura, codigoDominante: 7 });
    assert.equal(r.evaluacion.gradoDetectado, 3);
    assert.equal(r.evaluacion.meritoReconocido, true);
    assert.equal(r.metricas.metacognicionDetectada, true);
    assert.ok(r.metricas.densidadEstructural >= 40);
    assert.match(r.evaluacion.mensajeEncuadre, /Mérito reconocido/);
    assert.match(r.evaluacion.mensajeEncuadre, /G3/);
  });

  it("el volcado de la hija merece G3 por densidad aunque haya flor en la escena", () => {
    const captura = normalizarCapturaVolcado(HIJA);
    const r = evaluarMeritoVolcado({ captura, codigoDominante: 9 });
    assert.equal(r.evaluacion.gradoDetectado, 3);
    assert.equal(r.evaluacion.meritoReconocido, true);
    assert.ok(r.metricas.densidadEstructural >= 50);
    assert.ok(r.florDetectada.length > 0);
  });

  it("un solo volcado no otorga G4: hace falta rotación 1/10", () => {
    const captura = normalizarCapturaVolcado({
      gradoMaestria: 3,
      volcadoCrudo: SECO,
      friccionDetectada: "El sesgo: disculparme para no sostener el precio.",
      sombraOmision: "No dije que evité nombrar el monto en voz alta.",
    });
    const r = evaluarMeritoVolcado({
      captura,
      codigoDominante: 7,
      ojosHistoricos: [7],
    });
    assert.equal(r.evaluacion.gradoDetectado, 3);
    assert.equal(r.evaluacion.meritoReconocido, false);
  });

  it("G4 exige mapa de calor balanceado (rango ≥ 6, sin atasco)", () => {
    const captura = normalizarCapturaVolcado({
      gradoMaestria: 3,
      volcadoCrudo: SECO,
      friccionDetectada: "El sesgo: disculparme para no sostener el precio.",
      sombraOmision: "No dije que evité nombrar el monto en voz alta.",
    });
    const r = evaluarMeritoVolcado({
      captura,
      codigoDominante: 7,
      ojosHistoricos: [1, 2, 3, 4, 5, 6, 7, 8],
    });
    assert.equal(r.evaluacion.gradoDetectado, 4);
    assert.equal(r.evaluacion.meritoReconocido, true);
  });

  it("variedadRotacionCodigo sugiere el hueco del mapa", () => {
    assert.equal(sugerirRotacionCodigo([9, 9, 3]), "C1");
    assert.equal(sugerirRotacionCodigo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), "C1");
  });

  it("toDepositoEngineResponse proyecta el contrato V2", () => {
    const d = diagnosticarVolcadoLocal(SECO);
    const engine = toDepositoEngineResponse(d);
    assert.match(engine.ojoDominante.codigo, /^C\d+$/);
    assert.ok(engine.ojoDominante.nombre.startsWith("El Ojo"));
    assert.ok(engine.puntoCiego.loNoDicho.length > 0);
    assert.equal(engine.evaluacionGrado.gradoDetectado, 3);
    assert.equal(engine.evaluacionGrado.meritoReconocido, true);
    assert.equal(typeof engine.metricasMerito.densidadEstructural, "number");
    assert.match(engine.metricasMerito.variedadRotacionCodigo, /^C\d+$/);
    assert.equal(engine.mecanicaAbsorcion.instruccionUnica, d.mecanicaAbsorcion);
  });

  it("densidad penaliza flor y premia hechos", () => {
    const seca = calcularDensidadEstructural(
      normalizarCapturaVolcado(SECO),
      detectarFlorMerito(SECO),
    );
    const clima = calcularDensidadEstructural(
      normalizarCapturaVolcado("hoy fue feo"),
      detectarFlorMerito("hoy fue feo"),
    );
    assert.ok(seca > clima);
  });
});

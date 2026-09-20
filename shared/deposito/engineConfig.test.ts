import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CODIGOS_OBSERVADOR,
  DICCIONARIO_OJOS,
  RITUAL_VOLCADO,
  diagnosticarVolcadoLocal,
  isCodigoObservador,
  obtenerOjo,
  obtenerPromptVolcado,
  parseDiagnosticoVolcado,
  procesarVolcadoAprendizaje,
  procesarVolcadoAprendizajeConFuente,
  serializarPromptVolcado,
  type CodigoObservador,
} from "./engineConfig.ts";

describe("Depósito v2 — Universidad / engineConfig", () => {
  it("DICCIONARIO_OJOS cubre 1–10 con nombre, foco y voz", () => {
    assert.equal(CODIGOS_OBSERVADOR.length, 10);
    const focos: Record<CodigoObservador, string> = {
      1: "utilidad",
      2: "combinaciones",
      3: "secuencias",
      4: "prevención",
      5: "métricas",
      6: "fricción",
      7: "balanza",
      8: "estrategia",
      9: "sistema",
      10: "soberanía",
    };
    for (const n of CODIGOS_OBSERVADOR) {
      const o = DICCIONARIO_OJOS[n];
      assert.equal(o.numero, n);
      assert.ok(o.nombreOjo.startsWith("El Ojo"));
      assert.equal(o.focoAtencion, focos[n]);
      assert.ok(o.voz.length > 0);
      assert.ok(o.cegueraActiva.length > 0);
      assert.ok(o.gestoAbsorcion.length > 0);
    }
  });

  it("nombres canónicos del especialista", () => {
    assert.equal(obtenerOjo(1).nombreOjo, "El Ojo de la Claridad");
    assert.equal(obtenerOjo(3).nombreOjo, "El Ojo del Ritmo y la Repetición");
    assert.equal(obtenerOjo(6).nombreOjo, "El Ojo del Roce");
    assert.equal(obtenerOjo(10).nombreOjo, "El Ojo del Dominio");
    assert.equal(RITUAL_VOLCADO, "¿Qué aprendí hoy?");
  });

  it("el prompt fuerza el Muro de Dominancia y el JSON estricto", () => {
    const prompt = obtenerPromptVolcado(
      "Hoy corrí todo el día y sentí que avanzaba, pero no repetí ninguna secuencia.",
    );
    assert.match(prompt.system, /MURO DE DOMINANCIA/);
    assert.match(prompt.system, /UN SOLO Código Dominante/i);
    assert.match(prompt.system, /prohibido listar múltiples códigos/i);
    assert.match(prompt.system, /codigoDominante/);
    assert.match(prompt.system, /puntoCiego/);
    assert.match(prompt.system, /mecanicaAbsorcion/);
    assert.match(prompt.system, /nivelCargaSugerido/);
    assert.match(prompt.system, /El Ojo de la Claridad/);
    assert.match(prompt.user, /¿Qué aprendí hoy\?/);
    assert.match(prompt.user, /no repetí ninguna secuencia/);
    assert.doesNotMatch(prompt.system, /listá los códigos abiertos/i);
    const serial = serializarPromptVolcado(prompt);
    assert.ok(serial.includes(prompt.system));
    assert.ok(serial.includes(prompt.user));
  });

  it("parseDiagnosticoVolcado acepta JSON canónico y fuerza el nombre del diccionario", () => {
    const raw = JSON.stringify({
      codigoDominante: 3,
      nombreOjoDominante: "un alias cualquiera",
      justificacionDominante: "El relato mide velocidad, no absorción.",
      puntoCiego: "Confundir velocidad con absorción.",
      devolucionMaestro: "Espejo. Resistencia. Veredicto.",
      mecanicaAbsorcion: "Mañana, tres pasos con hora de corte.",
      nivelCargaSugerido: "INTERMEDIO",
    });
    const d = parseDiagnosticoVolcado(raw);
    assert.equal(d.codigoDominante, 3);
    assert.equal(d.nombreOjoDominante, "El Ojo del Ritmo y la Repetición");
    assert.match(d.puntoCiego, /velocidad/);
    assert.equal(d.nivelCargaSugerido, "INTERMEDIO");
  });

  it("parseDiagnosticoVolcado tolera markdown, alias y codigo string", () => {
    const d = parseDiagnosticoVolcado(
      '```json\n{"codigo_dominante":"6","punto_ciego":"Evita la puerta.","devolucion":"Espejo. R2. Corte.","mecanica":"Una llamada mañana.","justificacion":"Hay miedo al rechazo.","nivelCarga":"basico"}\n```',
    );
    assert.equal(d.codigoDominante, 6);
    assert.equal(d.nombreOjoDominante, "El Ojo del Roce");
    assert.equal(d.nivelCargaSugerido, "BASICO");
    assert.match(d.mecanicaAbsorcion, /llamada/);
  });

  it("parseDiagnosticoVolcado rechaza código fuera de 1–10", () => {
    assert.throws(
      () =>
        parseDiagnosticoVolcado(
          JSON.stringify({
            codigoDominante: 11,
            justificacionDominante: "x",
            puntoCiego: "x",
            devolucionMaestro: "x",
            mecanicaAbsorcion: "x",
            nivelCargaSugerido: "INTERMEDIO",
          }),
        ),
      /codigoDominante/,
    );
  });

  it("diagnosticarVolcadoLocal aplica el Muro: un solo código", () => {
    const ritmo = diagnosticarVolcadoLocal(
      "Hoy repetí la secuencia tres veces: primero el corte, después el orden, luego el ritmo. Confundí velocidad con avance y no medí minutos.",
    );
    assert.ok(isCodigoObservador(ritmo.codigoDominante));
    assert.equal(ritmo.codigoDominante, 3);
    assert.equal(
      ritmo.nombreOjoDominante,
      DICCIONARIO_OJOS[ritmo.codigoDominante].nombreOjo,
    );
    assert.match(ritmo.mecanicaAbsorcion, /Mañana/);
    assert.doesNotMatch(ritmo.justificacionDominante, /C1 y C2/);

    const ruido = diagnosticarVolcadoLocal("feo");
    assert.equal(ruido.codigoDominante, 1);
    assert.equal(ruido.nivelCargaSugerido, "BASICO");
  });

  it("procesarVolcadoAprendizaje usa Gemini cuando hay caller", async () => {
    const d = await procesarVolcadoAprendizaje("Hoy cobré con culpa.", {
      callGemini: async () =>
        JSON.stringify({
          codigoDominante: 7,
          nombreOjoDominante: "El Ojo de la Justicia",
          justificacionDominante: "La balanza de valor está rota por culpa.",
          puntoCiego: "No observa el intercambio justo.",
          devolucionMaestro: "Espejo de la culpa. R2: descuenta. Veredicto: sostén el precio.",
          mecanicaAbsorcion: "Mañana cobrá el precio sin bajarlo.",
          nivelCargaSugerido: "INTERMEDIO",
        }),
    });
    assert.equal(d.codigoDominante, 7);
    assert.equal(d.nombreOjoDominante, "El Ojo de la Justicia");
    assert.match(d.mecanicaAbsorcion, /precio/);
  });

  it("procesarVolcadoAprendizaje cae a local si Gemini falla", async () => {
    const resultado = await procesarVolcadoAprendizajeConFuente(
      "Hoy evité la puerta por miedo al rechazo y ensayé la llamada en la cabeza.",
      {
        callGemini: async () => {
          throw new Error("quota");
        },
      },
    );
    assert.equal(resultado.source, "local_fallback");
    assert.equal(resultado.diagnostico.codigoDominante, 6);
    assert.equal(
      resultado.diagnostico.nombreOjoDominante,
      "El Ojo del Roce",
    );
  });
});

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
    assert.match(prompt.system, /ANCLAJE AL VOLCADO/);
    assert.match(prompt.system, /FILTRO DE DESCOMPOSICIÓN/);
    assert.match(prompt.system, /lo no dicho revela la falla real/);
    assert.match(prompt.system, /lo que el alumno APRENDIÓ/);
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
    assert.doesNotMatch(
      ritmo.devolucionMaestro,
      /Ayer aprendí que mí hija/,
    );

    const ruido = diagnosticarVolcadoLocal("feo");
    assert.equal(ruido.codigoDominante, 1);
    assert.equal(ruido.nivelCargaSugerido, "BASICO");
  });

  it("el volcado de la hija no se etiqueta Ritmo por «después» o «minutos»", () => {
    const texto = `Ayer aprendí que mí hija de 4 años entiende de una manera sorpréndete. Sobre lo que los mayores hablan a su alrededor. Yo creí los niños de 4 años son cero comprension sobre procesos supuestamente complejo ¿Porque digo eso? Ayer mí esposa estaba mandándole a juntar sus cosas a mí hija diciendole:  tienes que juntar tus cosas, una niña que no es ordenada, haciada no sirve u le hacía comparaciones con otras niñas además le adicionada promesa de castigo y entonces mí hija empezó a llorar. Yo viendo eso inmediatamente le dije: un deber no se enseña a si, tienes que estarlo moviéndolo emocionalmente, haciéndole ver qué la tarea es divertida, haciendo la tarea pero jugando.  Le estás amontonando carga cognitiva a una niña de 4 años.  Después de unos 5 minutos mí hija vino a mí pr guntandome ¿Cómo se llama eso lo  que mí mamá hace papí? Despues más tardé me tocaba demostrarle a mí esposa como se lo hace disfrutar en la tarea a mí hija, en el momento último del juego- tarea, mí hija me dijo una frace que me demostró a un más su capacidad de aprendisaje de la lección que habia observado y dijo a si:  "papá yo soy una niña, no puedo hacer eso" ya se defendía con seguridad`;
    const d = diagnosticarVolcadoLocal(texto);
    assert.equal(d.codigoDominante, 9);
    assert.equal(d.nombreOjoDominante, "El Ojo del Sistema");
    assert.equal(d.nivelCargaSugerido, "SUPERIOR");
    assert.match(d.puntoCiego, /c[oó]mo se llama/i);
    assert.match(d.devolucionMaestro, /niña|alrededor|aprend/i);
    assert.match(d.mecanicaAbsorcion, /nombre|ley/i);
    assert.doesNotMatch(d.nombreOjoDominante, /Ritmo/);
    assert.doesNotMatch(d.puntoCiego, /velocidad con absorción/);
    assert.doesNotMatch(d.mecanicaAbsorcion, /hora de inicio y de corte/);
    assert.doesNotMatch(
      d.devolucionMaestro,
      /Ayer aprendí que mí hija de 4 años entiende de una manera sorpréndete\. Sobre lo que los mayores/,
    );
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

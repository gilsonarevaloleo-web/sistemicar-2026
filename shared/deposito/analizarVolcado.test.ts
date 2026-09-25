import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analizarVolcado,
  coherenciaDictamenConPlacement,
} from "./analizarVolcado.ts";

describe("analizarVolcado — frente de observación", () => {
  it("un volcado corto es ruido y ofrece C1", () => {
    const d = analizarVolcado("hoy fue feo");
    assert.equal(d.calidad, "ruido");
    assert.equal(d.frente, 0);
    assert.equal(d.siguiente, 1);
  });

  it("secuencia técnica de costura abre C3, implica C1–C2 y ofrece C4", () => {
    const d = analizarVolcado(
      "En la costura aprendí la secuencia: primero el corte de la tela, después el orden de ejecución, luego cómo se hace el armado paso a paso en la mesa del taller."
    );
    assert.equal(d.tema, "costura");
    assert.ok(d.abiertos.includes(3));
    assert.equal(d.frente, 3);
    assert.deepEqual(d.yaVistos, [1, 2]);
    assert.equal(d.siguiente, 4);
    assert.equal(d.calidad, "tecnico");
    assert.ok(!d.asomados.includes(5), "corte de tela no es C5");
    assert.match(d.mecanica, /C4/);
  });

  it("un C6 y C7 sin cadena desde C1 es pose: no se salta el hueco", () => {
    const d = analizarVolcado(
      "Hoy vi el patrón y las diferencias de apariencia. También las junturas, la relación entre piezas y cómo se encuentran en convivencia con el otro."
    );
    assert.ok(d.asomados.includes(6) || d.abiertos.includes(6) || d.abiertos.includes(7));
    assert.ok(d.frente < 6);
    assert.equal(d.siguiente, d.frente === 0 ? 1 : (d.frente + 1) as 1);
    assert.ok(d.calidad === "pose" || d.calidad === "tecnico");
    if (d.frente === 0) assert.equal(d.calidad, "pose");
  });

  it("C3 técnico más asomo de C6 ofrece el hueco C4, no C7", () => {
    const d = analizarVolcado(
      "En la costura vi la secuencia y el orden de ejecución paso a paso, primero y después. También las junturas entre piezas y la relación de convivencia cuando se encuentran."
    );
    assert.equal(d.frente, 3);
    assert.equal(d.siguiente, 4);
    assert.ok(d.asomados.includes(6) || d.abiertos.includes(6));
    assert.match(d.dictamen, /hueco|C4|Estructura/i);
  });

  it("máquina de coser y botones no se dictaminan como ruido suelto", () => {
    const d = analizarVolcado(
      "Hoy a las 8:10 usé la máquina de coser. Corté 12 botones. Ajusté la tensión del hilo y repetí el pase en el taller.",
    );
    assert.equal(d.tema, "costura");
    assert.notEqual(d.calidad, "ruido");
    assert.doesNotMatch(d.dictamen, /reescrib/i);
  });

  it("Placement G3 + Estructura > 75 anula dictamen de ruido", () => {
    const ruido = analizarVolcado("hoy fue feo");
    assert.equal(ruido.calidad, "ruido");
    const coherente = coherenciaDictamenConPlacement(ruido, {
      gradoDetectado: 3,
      densidadEstructural: 82,
      mensajeEncuadre: "Mérito reconocido: opera en Grado 3.",
    });
    assert.notEqual(coherente.calidad, "ruido");
    assert.doesNotMatch(coherente.dictamen, /reescrib/i);
    assert.match(coherente.dictamen, /Grado 3|Mérito/);
  });
});

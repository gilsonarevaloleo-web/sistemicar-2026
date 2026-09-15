import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analizarVolcado } from "./analizarVolcado.ts";

describe("analizarVolcado — frente de observación", () => {
  it("un volcado corto es ruido y ofrece C1", () => {
    const d = analizarVolcado("hoy fue feo");
    assert.equal(d.calidad, "ruido");
    assert.equal(d.frente, 0);
    assert.equal(d.siguiente, 1);
  });

  it("un volcado de padre e hijo no es ruido: nombra familia y abre ojos", () => {
    const d = analizarVolcado(
      "Hoy aprendí que uno sabe por repetición, no por madures. Por ejemplo: yo cuando le hablo a mí hijo temas de moral comportamiento, actitudes; q el lo siento que no entiende y me hace pensar que tengo la mente más rápida: pero sin embargo cuando el me esplicada que es lo que va ser en su preparatoria."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "familia");
    assert.ok(d.palabras > 40);
    assert.ok(d.frente >= 1);
    assert.ok(d.siguiente >= 2);
    assert.match(d.dictamen, /C\d/);
  });

  it("un suspiro corto sigue siendo ruido", () => {
    const d = analizarVolcado("estoy cansado y triste");
    assert.equal(d.calidad, "ruido");
  });

  it("un vendedor en el mostrador no es ruido ni se lee como costura", () => {
    const d = analizarVolcado(
      "Hoy aprendí que si tardo en el mostrador el cliente se va. Primero saludo, después cobro el pedido; el orden importa y se nota cuando la cola se acumula."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "ventas");
    assert.ok(d.frente >= 1);
    assert.match(d.dictamen, /C\d/);
  });

  it("un chofer en la ruta abre oficio de transporte, no costura", () => {
    const d = analizarVolcado(
      "Hoy en la ruta aprendí que si salgo tarde el tráfico me come y el pasajero se queja. Primero reviso el paradero, después arranco; cada vez se repite si no salgo a tiempo."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "la ruta");
    assert.ok(d.frente >= 1);
  });

  it("una cocina con receta y fuego se nombra cocina", () => {
    const d = analizarVolcado(
      "Hoy en la cocina aprendí que si no miro el fuego la salsa se quema. Primero pongo el aceite, después la cebolla: el orden no se puede saltar."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "cocina");
    assert.ok(d.frente >= 1);
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
});

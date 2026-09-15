import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analizarVolcado, ojosConLugarDe } from "./analizarVolcado.ts";

const PADRE_HIJO =
  "Hoy aprendí que uno sabe por repetición, no por madures. Por ejemplo: yo cuando le hablo a mí hijo temas de moral comportamiento, actitudes; q el lo siento que no entiende y me hace pensar que tengo la mente más rápida: pero sin embargo cuando el me esplicada que es lo que va ser en su preparatoria.";

const COSTURA_SECUENCIA =
  "En la costura aprendí la secuencia: primero el corte de la tela, después el orden de ejecución, luego cómo se hace el armado paso a paso en la mesa del taller.";

describe("analizarVolcado — un volcado, un ojo", () => {
  it("un volcado corto es ruido y ofrece C1", () => {
    const d = analizarVolcado("hoy fue feo");
    assert.equal(d.calidad, "ruido");
    assert.equal(d.viendoCon, 0);
    assert.equal(d.frente, 0);
    assert.equal(d.siguiente, 1);
    assert.equal(d.tomaLugar, false);
  });

  it("el volcado de padre e hijo ve con un solo ojo y no mezcla la escala", () => {
    const d = analizarVolcado(PADRE_HIJO);
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "familia");
    assert.ok(d.palabras > 40);
    assert.equal(d.viendoCon, 7);
    assert.equal(d.abiertos.length, 1);
    assert.deepEqual(d.abiertos, [7]);
    assert.deepEqual(d.asomados, []);
    assert.deepEqual(d.yaVistos, []);
    assert.equal(d.calidad, "pose");
    assert.equal(d.tomaLugar, false);
    assert.equal(d.siguiente, 1);
    assert.match(d.dictamen, /Estás viendo con C7 Visión/);
    assert.doesNotMatch(d.dictamen, /Ya vistos/);
    assert.doesNotMatch(d.dictamen, /Asomó/);
    assert.doesNotMatch(d.dictamen, /C4 Estructura/);
    assert.doesNotMatch(d.dictamen, /C5 Decisión/);
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
    assert.ok(d.viendoCon >= 1);
    assert.equal(d.abiertos.length, 1);
    assert.match(d.dictamen, /Estás viendo con C/);
  });

  it("un chofer en la ruta abre oficio de transporte, no costura", () => {
    const d = analizarVolcado(
      "Hoy en la ruta aprendí que si salgo tarde el tráfico me come y el pasajero se queja. Primero reviso el paradero, después arranco; cada vez se repite si no salgo a tiempo."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "la ruta");
    assert.ok(d.viendoCon >= 1);
    assert.equal(d.abiertos.length, 1);
  });

  it("una cocina con receta y fuego se nombra cocina", () => {
    const d = analizarVolcado(
      "Hoy en la cocina aprendí que si no miro el fuego la salsa se quema. Primero pongo el aceite, después la cebolla: el orden no se puede saltar."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "cocina");
    assert.ok(d.viendoCon >= 1);
  });

  it("secuencia de costura sin historial nombra C3 y no implica C1–C2", () => {
    const d = analizarVolcado(COSTURA_SECUENCIA);
    assert.equal(d.tema, "costura");
    assert.equal(d.viendoCon, 3);
    assert.deepEqual(d.abiertos, [3]);
    assert.deepEqual(d.yaVistos, []);
    assert.equal(d.calidad, "pose");
    assert.equal(d.tomaLugar, false);
    assert.equal(d.siguiente, 1);
    assert.match(d.dictamen, /Estás viendo con C3 Trabajo/);
    assert.match(d.mecanica, /C1/);
  });

  it("con C1 y C2 ya habitados, el mismo dump de costura le da lugar a C3", () => {
    const d = analizarVolcado(COSTURA_SECUENCIA, { ojosConLugar: [1, 2] });
    assert.equal(d.viendoCon, 3);
    assert.equal(d.calidad, "tecnico");
    assert.equal(d.tomaLugar, true);
    assert.deepEqual(d.yaVistos, [1, 2]);
    assert.equal(d.siguiente, 4);
    assert.match(d.mecanica, /C4/);
    assert.doesNotMatch(d.dictamen, /Asomó/);
  });

  it("un C6/C7 sin hueco habitado es pose: nombra el ojo y manda a C1", () => {
    const d = analizarVolcado(
      "Hoy vi el patrón y las diferencias de apariencia. También las junturas, la relación entre piezas y cómo se encuentran en convivencia con el otro."
    );
    assert.ok(d.viendoCon === 6 || d.viendoCon === 7);
    assert.equal(d.calidad, "pose");
    assert.equal(d.siguiente, 1);
    assert.equal(d.abiertos.length, 1);
    assert.deepEqual(d.asomados, []);
  });

  it("C3 más escena de C6 no mezcla: un ojo, y el hueco sigue siendo el vacío", () => {
    const d = analizarVolcado(
      "En la costura vi la secuencia y el orden de ejecución paso a paso, primero y después. También las junturas entre piezas y la relación de convivencia cuando se encuentran."
    );
    assert.equal(d.viendoCon, 3);
    assert.equal(d.abiertos.length, 1);
    assert.equal(d.siguiente, 1);
    assert.doesNotMatch(d.dictamen, /C6/);
    assert.match(d.dictamen, /C3 Trabajo/);
  });

  it("volcados sucesivos dan lugar a cada ojo sin mezclarlos", () => {
    const c1 = analizarVolcado(
      "Hoy aprendí el territorio del taller: el suelo, la mesa, el espacio y el lugar donde ocurre el corte."
    );
    assert.equal(c1.viendoCon, 1);
    assert.equal(c1.calidad, "tecnico");
    assert.equal(c1.tomaLugar, true);
    assert.equal(c1.siguiente, 2);

    const lugar1 = ojosConLugarDe([{ dictamen: c1 }]);
    assert.deepEqual(lugar1, [1]);

    const c3temprano = analizarVolcado(COSTURA_SECUENCIA, { ojosConLugar: lugar1 });
    assert.equal(c3temprano.viendoCon, 3);
    assert.equal(c3temprano.calidad, "pose");
    assert.equal(c3temprano.tomaLugar, false);
    assert.equal(c3temprano.siguiente, 2);

    const c2 = analizarVolcado(
      "Hoy aprendí el caudal de la rutina: lo que entra y lo que sale se estanca, el flujo se traba y hay atasco en el pedido.",
      { ojosConLugar: lugar1 }
    );
    assert.equal(c2.viendoCon, 2);
    assert.equal(c2.tomaLugar, true);

    const lugar2 = ojosConLugarDe([{ dictamen: c1 }, { dictamen: c2 }]);
    assert.deepEqual(lugar2, [1, 2]);

    const c3 = analizarVolcado(COSTURA_SECUENCIA, { ojosConLugar: lugar2 });
    assert.equal(c3.viendoCon, 3);
    assert.equal(c3.tomaLugar, true);
    assert.equal(c3.siguiente, 4);
  });

  it("un dictamen viejo mezclado no conquista siete ojos", () => {
    const lugar = ojosConLugarDe([
      {
        dictamen: {
          calidad: "tecnico",
          viendoCon: undefined as unknown as number,
          tomaLugar: undefined as unknown as boolean,
        },
      },
    ]);
    assert.deepEqual(lugar, []);
  });
});

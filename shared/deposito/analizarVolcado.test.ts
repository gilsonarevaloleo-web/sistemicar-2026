import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analizarVolcado, ojosConLugarDe } from "./analizarVolcado.ts";

const PADRE_HIJO =
  "Hoy aprendí que uno sabe por repetición, no por madures. Por ejemplo: yo cuando le hablo a mí hijo temas de moral comportamiento, actitudes; q el lo siento que no entiende y me hace pensar que tengo la mente más rápida: pero sin embargo cuando el me esplicada que es lo que va ser en su preparatoria.";

const COSTURA_SECUENCIA =
  "En la costura aprendí la secuencia: primero el corte de la tela, después el orden de ejecución, luego cómo se hace el armado paso a paso en la mesa del taller.";

describe("analizarVolcado — posición y jerarquía de mando", () => {
  it("un volcado corto es ruido y ofrece C1", () => {
    const d = analizarVolcado("hoy fue feo");
    assert.equal(d.calidad, "ruido");
    assert.equal(d.viendoCon, 0);
    assert.equal(d.frente, 0);
    assert.equal(d.siguiente, 1);
    assert.equal(d.tomaLugar, false);
  });

  it("varios ojos abiertos no es error: el más alto es la posición", () => {
    const d = analizarVolcado(PADRE_HIJO);
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "familia");
    assert.ok(d.palabras > 40);
    assert.ok(d.abiertos.length >= 2, "la mezcla del volcado enciende varios canales");
    assert.equal(d.frente, Math.max(...d.abiertos));
    assert.equal(d.viendoCon, d.frente);
    assert.deepEqual(d.mando, d.abiertos);
    assert.equal(d.calidad, "tecnico");
    assert.match(d.dictamen, /Ojo abierto: C\d+/);
    assert.match(d.dictamen, /Jerarquía de mando/);
    assert.doesNotMatch(d.dictamen, /el ojo abierto es C4 Estructura/);
    assert.ok(
      d.frente > 4,
      "la posición no se aplasta al prefijo C4 cuando hay ojos más altos"
    );
  });

  it("la mezcla se ordena como mando; C5 callado en reflexión es orden de planeta", () => {
    const d = analizarVolcado(PADRE_HIJO);
    for (let i = 1; i < d.abiertos.length; i++) {
      assert.ok(d.abiertos[i] > d.abiertos[i - 1], "mando en orden de Cascada");
    }
    assert.equal(d.planeta, 2);
    assert.equal(d.situacion, "reflexion");
    assert.ok(d.ausencias.includes(5), "C5 no se prioriza sin urgencia");
    assert.ok(!d.huecos.includes(5), "C5 no es hueco de esta casa");
    assert.ok(!d.dictamen.includes("Hueco de mando: C5"));
    assert.match(d.dictamen, /Orden de planeta: 2 Depósito/);
    assert.match(d.dictamen, /Ausencia de condición: C5 Decisión/);
    assert.match(d.dictamen, /Espejo \(planeta 1\)/);
    assert.equal(d.siguiente, d.frente);
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
    assert.equal(d.frente, Math.max(...d.abiertos));
    assert.match(d.dictamen, /Ojo abierto: C/);
  });

  it("un chofer en la ruta abre oficio de transporte, no costura", () => {
    const d = analizarVolcado(
      "Hoy en la ruta aprendí que si salgo tarde el tráfico me come y el pasajero se queja. Primero reviso el paradero, después arranco; cada vez se repite si no salgo a tiempo."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "la ruta");
    assert.ok(d.viendoCon >= 1);
  });

  it("una cocina con receta y fuego se nombra cocina", () => {
    const d = analizarVolcado(
      "Hoy en la cocina aprendí que si no miro el fuego la salsa se quema. Primero pongo el aceite, después la cebolla: el orden no se puede saltar."
    );
    assert.notEqual(d.calidad, "ruido");
    assert.equal(d.tema, "cocina");
    assert.ok(d.viendoCon >= 1);
  });

  it("secuencia de costura nombra el más alto abierto, no implica inferiores fantasma", () => {
    const d = analizarVolcado(COSTURA_SECUENCIA);
    assert.equal(d.tema, "costura");
    assert.ok(d.abiertos.includes(3));
    assert.equal(d.frente, Math.max(...d.abiertos));
    assert.equal(d.calidad, "tecnico");
    assert.match(d.dictamen, /Ojo abierto: C/);
    if (d.huecos.length > 0) {
      assert.equal(d.siguiente, d.huecos[0]);
    }
  });

  it("ojos ya habitados cierran huecos: costura con C1–C2 ofrece el siguiente real", () => {
    const d = analizarVolcado(COSTURA_SECUENCIA, { ojosConLugar: [1, 2] });
    assert.ok(d.abiertos.includes(3));
    assert.equal(d.frente, Math.max(...d.abiertos));
    assert.equal(d.calidad, "tecnico");
    assert.ok(!d.huecos.includes(1));
    assert.ok(!d.huecos.includes(2));
    assert.match(d.dictamen, /Ojo abierto: C/);
  });

  it("C6 y C7 abiertos: la posición es el más alto, no se esconde como asomo", () => {
    const d = analizarVolcado(
      "Hoy vi el patrón y las diferencias de apariencia. También las junturas, la relación entre piezas y cómo se encuentran en convivencia con el otro."
    );
    assert.ok(d.abiertos.includes(6) || d.abiertos.includes(7));
    assert.equal(d.frente, Math.max(...d.abiertos));
    assert.equal(d.calidad, "tecnico");
    assert.ok(!d.asomados.includes(d.frente as 1));
    assert.match(d.dictamen, /Ojo abierto: C/);
    assert.equal(d.siguiente, d.huecos[0] ?? d.frente);
  });

  it("C3 más C6: ambos entran al mando; la posición es el más alto", () => {
    const d = analizarVolcado(
      "En la costura vi la secuencia y el orden de ejecución paso a paso, primero y después. También las junturas entre piezas y la relación de convivencia cuando se encuentran."
    );
    assert.ok(d.abiertos.includes(3));
    assert.ok(d.abiertos.includes(6));
    assert.equal(d.frente, Math.max(...d.abiertos));
    assert.ok(d.frente >= 6);
    assert.match(d.dictamen, /Jerarquía de mando/);
    assert.match(d.dictamen, /C3/);
    assert.match(d.dictamen, /C6/);
  });

  it("el historial acumula todos los ojos que un dump encendió", () => {
    const d = analizarVolcado(PADRE_HIJO);
    const lugar = ojosConLugarDe([{ dictamen: d }]);
    for (const n of d.abiertos) {
      assert.ok(lugar.includes(n));
    }
    assert.ok(lugar.includes(d.frente as 1));
  });

  it("con urgencia, C5 sí puede ser hueco o ojo abierto", () => {
    const d = analizarVolcado(
      "Hoy aprendí que tuve que decidir ya: el cliente me apuraba con urgencia y dije que no. Evité el corte hasta el final y después elegí. Me preocupaba perder el pedido."
    );
    assert.ok(d.situacion === "urgencia" || d.situacion === "mixta");
    assert.ok(!d.ausencias.includes(5));
    assert.ok(
      d.abiertos.includes(5) || d.huecos.includes(5),
      "el corte habla cuando hay urgencia"
    );
  });
});

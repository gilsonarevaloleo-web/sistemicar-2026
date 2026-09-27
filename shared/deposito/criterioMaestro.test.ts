import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEY_CRITERIO_VIVO_AXIOMAS,
  LEY_CRITERIO_VIVO_FIRMA,
  LEY_CRITERIO_VIVO_KERNEL,
  LEY_CRITERIO_VIVO_MARCA,
  LEY_CRITERIO_VIVO_NOMBRE,
  LEY_CRITERIO_VIVO_NO_ES,
  LEY_CRITERIO_VIVO_RITUAL,
  bloqueCriterioVivo,
  citarCriteriosEnDevolucion,
  consultarCriterios,
  crearCriterio,
  formularCriterio,
  marcarUsoCriterios,
  normalizarAcervoCriterios,
  puedeSellarCriterio,
  resonanciaCriterio,
  resumenCriterioVivo,
  sellarCriterio,
  sesgoCriterioPorOjo,
  type CriterioVivo,
} from "./criterioMaestro.ts";

const PELEA = `Hoy la pelea con el cliente empezó por el precio. Yo no respondí. Corté la llamada a las 9:14. Anoté el rechazo. No dije después veo.`;

const PELEA_2 = `Otra pelea por el precio. El cliente insistió. Yo corté. No respondí el ataque. Cerré a las 10:02 y anoté el rechazo.`;

const RUIDO = "mal día";

function selloPeleaC5(overrides: Partial<CriterioVivo> = {}): CriterioVivo {
  return {
    ...crearCriterio({
      codigo: 5,
      origen: "correccion",
      sabiduria: "Cuando nombro el corte y no la pelea, el ojo es Decisión, no roce.",
      volcadoCrudo: PELEA,
      codigoMotor: 6,
      now: 1_700_000_000_000,
      id: "crit_c5_corte",
    }),
    ...overrides,
  };
}

describe("Ley del Criterio Vivo", () => {
  it("nombra la ley y la separa del entrenamiento de modelos", () => {
    assert.equal(LEY_CRITERIO_VIVO_NOMBRE, "Ley del Criterio Vivo");
    assert.equal(LEY_CRITERIO_VIVO_MARCA, "Criterio-Maestro");
    assert.equal(LEY_CRITERIO_VIVO_RITUAL, "Esto es lo que vi");
    assert.match(LEY_CRITERIO_VIVO_FIRMA, /sellada/);
    assert.equal(LEY_CRITERIO_VIVO_AXIOMAS.length, 4);
    assert.ok(LEY_CRITERIO_VIVO_NO_ES.some((l) => /fine-tuning/i.test(l)));
    assert.match(LEY_CRITERIO_VIVO_KERNEL, /no se inventa/);
  });

  it("el ruido no sella criterio", () => {
    assert.equal(puedeSellarCriterio(RUIDO), false);
    const acervo = sellarCriterio([], {
      codigo: 1,
      origen: "sello",
      volcadoCrudo: RUIDO,
      sabiduria: "vi algo",
    });
    assert.equal(acervo.length, 0);
  });

  it("sellar sabiduría crea un criterio del ojo nombrado", () => {
    const acervo = sellarCriterio([], {
      codigo: 3,
      origen: "sello",
      sabiduria: "La secuencia de tres pasos es el aprendizaje, no la prisa.",
      volcadoCrudo:
        "Hoy repetí la secuencia tres veces: corte, orden, ritmo. Confundí velocidad con avance.",
    });
    assert.equal(acervo.length, 1);
    assert.equal(acervo[0].codigo, 3);
    assert.match(acervo[0].enunciado, /C3/);
    assert.match(acervo[0].enunciado, /secuencia/i);
    assert.ok(acervo[0].anclas.length > 0);
  });

  it("corregir el ojo formula el criterio contra el motor", () => {
    const frase = formularCriterio({
      codigo: 5,
      origen: "correccion",
      volcadoCrudo: PELEA,
      codigoMotor: 6,
    });
    assert.match(frase, /C5/);
    assert.match(frase, /C6/);
  });

  it("un duplicado no infla el acervo", () => {
    const input = {
      codigo: 5 as const,
      origen: "correccion" as const,
      sabiduria: "Cuando nombro el corte y no la pelea, el ojo es Decisión.",
      volcadoCrudo: PELEA,
      codigoMotor: 6 as const,
    };
    const uno = sellarCriterio([], input);
    const dos = sellarCriterio(uno, input);
    assert.equal(dos.length, 1);
    assert.ok(dos[0].anclas.length >= uno[0].anclas.length);
  });

  it("el acervo recuerda y resuena en un volcado hermano", () => {
    const acervo = [selloPeleaC5()];
    const r = resonanciaCriterio(PELEA_2, acervo[0]);
    assert.ok(r >= 0.28, `resonancia ${r}`);
    const aplicados = consultarCriterios({
      acervo,
      volcadoCrudo: PELEA_2,
      codigoDominante: 5,
    });
    assert.equal(aplicados[0]?.id, "crit_c5_corte");
    assert.equal(aplicados[0]?.codigo, 5);
  });

  it("la corrección sesga el ojo local hacia lo que el operador enseñó", () => {
    const sesgo = sesgoCriterioPorOjo([selloPeleaC5()], PELEA_2);
    assert.ok((sesgo[5] ?? 0) >= 1);
  });

  it("el Maestro cita el criterio y no inventa uno nuevo", () => {
    const aplicados = consultarCriterios({
      acervo: [selloPeleaC5()],
      volcadoCrudo: PELEA_2,
    });
    const cita = citarCriteriosEnDevolucion(
      "Espejo: trajiste el día. Veredicto: un corte.",
      aplicados,
    );
    assert.match(cita, /Criterio vivo/);
    assert.match(cita, /Decisión|corte/);
    const otra = citarCriteriosEnDevolucion(cita, aplicados);
    assert.equal(otra, cita);
  });

  it("usar un criterio incrementa usos", () => {
    const usado = marcarUsoCriterios([selloPeleaC5()], ["crit_c5_corte"]);
    assert.equal(usado[0].usos, 1);
  });

  it("el prompt nombra el acervo o declara vacío", () => {
    const vacio = bloqueCriterioVivo([]);
    assert.match(vacio, /Acervo vacío/);
    assert.doesNotMatch(vacio, /C5 /);
    const lleno = bloqueCriterioVivo([selloPeleaC5()]);
    assert.match(lleno, /C5/);
    assert.match(lleno, /CÍTALO/);
    assert.match(lleno, /undécimo/);
  });

  it("tope de tres por ojo: se queda el más usado", () => {
    const sellos = [
      {
        sabiduria: "Junté la máquina con el hábito de medir antes de cortar.",
        volcadoCrudo:
          "Hoy medí el hilo, encendí la máquina y corté una sola pieza. No agregué carga.",
      },
      {
        sabiduria: "Usé la agenda vieja junto con la llamada del cliente.",
        volcadoCrudo:
          "Llamé al cliente con la lista de ayer. Dos recursos, un movimiento. Cerré a las 11.",
      },
      {
        sabiduria: "El apalancamiento fue pedirle a Ana el molde que ya existía.",
        volcadoCrudo:
          "Ana tenía el molde. Yo lo pedí. Cosimos sin dibujar de nuevo. Combinación, no heroísmo.",
      },
      {
        sabiduria: "Sumé el cupo de la jornada con el recorte del taller.",
        volcadoCrudo:
          "El cupo del ring y el recorte del taller se usaron juntos. Una sola pasada. Cero pieza extra.",
      },
    ];
    let acervo: CriterioVivo[] = [];
    sellos.forEach((s, i) => {
      acervo = sellarCriterio(acervo, {
        codigo: 2,
        origen: "sello",
        sabiduria: s.sabiduria,
        volcadoCrudo: s.volcadoCrudo,
        now: 1_700_000_000_000 + i,
        id: `crit_c2_${i}`,
      });
    });
    assert.equal(acervo.filter((c) => c.codigo === 2).length, 3);
  });

  it("normaliza acervo sucio y resume", () => {
    const limpio = normalizarAcervoCriterios([
      selloPeleaC5(),
      { id: "x" },
      null,
    ]);
    assert.equal(limpio.length, 1);
    assert.match(resumenCriterioVivo([]), /acervo vacío/);
    assert.match(resumenCriterioVivo(limpio), /1 criterio/);
  });
});

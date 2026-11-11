import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hayPesoParaGimnasio, pesoDeVolcados } from "./peso.ts";
import type { Umbral5Lectura } from "./types.ts";

function lectura(canal: 1 | 2 | 3): Umbral5Lectura {
  return {
    codigoLimite: canal,
    polo: "contra",
    codigoUsuario: canal,
    pisoIntento: 1,
    tipoLimite: null,
    lecturaFria: `C${canal}`,
    porQueNoEjecuta: "x",
    moduloGimnasio: canal === 2 ? "social_producto" : null,
  };
}

describe("Peso del límite", () => {
  it("un volcado no abre gimnasio", () => {
    const p = pesoDeVolcados([{ lectura: lectura(2) }]);
    assert.equal(p.hayPeso, false);
    assert.equal(p.total, 1);
    assert.equal(hayPesoParaGimnasio([{ lectura: lectura(2) }]), false);
  });

  it("cinco volcados con un canal que se repite sí tienen peso", () => {
    const sesiones = [
      { lectura: lectura(2) },
      { lectura: lectura(2) },
      { lectura: lectura(1) },
      { lectura: lectura(2) },
      { lectura: lectura(3) },
    ];
    const p = pesoDeVolcados(sesiones);
    assert.equal(p.hayPeso, true);
    assert.equal(p.canal, 2);
    assert.equal(p.repeticiones, 3);
    assert.equal(hayPesoParaGimnasio(sesiones), true);
  });
});

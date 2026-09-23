import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizarTituloPaso,
  sintetizarPasosCrisol,
} from "./sintetizarPasosCrisol.ts";
import type { ProyectoPasoEjecutado } from "./proyectos.ts";

function paso(
  partial: Partial<ProyectoPasoEjecutado> & { texto: string; status: "cumplido" | "fallado" | "avance" }
): ProyectoPasoEjecutado {
  return {
    n: partial.n ?? 1,
    key: partial.key ?? `k_${partial.texto}_${partial.ts ?? 0}`,
    kind: "sub_situacion",
    vehicleId: "v1",
    ...partial,
  };
}

describe("sintetizarPasosCrisol", () => {
  it("agrupa el mismo título aunque se repita cientos de veces", () => {
    const pasos = [
      ...Array.from({ length: 80 }, (_, i) =>
        paso({ texto: "Bolsillo", status: "cumplido", n: i + 1, ts: 1_000 + i })
      ),
      paso({ texto: "Armar cuerpo", status: "avance", n: 81, ts: 2_000 }),
      paso({ texto: "bolsillo", status: "cumplido", n: 82, ts: 3_000 }),
    ];

    const s = sintetizarPasosCrisol(pasos);
    assert.equal(s.total, 82);
    assert.equal(s.unicos, 2);
    assert.equal(s.repetidos, 80);
    assert.equal(s.familias[0]!.texto, "bolsillo");
    assert.equal(s.familias[0]!.count, 81);
    assert.equal(s.familias[1]!.texto, "Armar cuerpo");
    assert.equal(s.familias[1]!.count, 1);
  });

  it("ignora títulos vacíos y conserva el último status", () => {
    const s = sintetizarPasosCrisol([
      paso({ texto: "   ", status: "cumplido", n: 1, ts: 10 }),
      paso({ texto: "Primera face", status: "avance", n: 2, ts: 20 }),
      paso({ texto: "Primera face", status: "cumplido", n: 3, ts: 30 }),
    ]);
    assert.equal(s.unicos, 1);
    assert.equal(s.familias[0]!.lastStatus, "cumplido");
    assert.equal(s.familias[0]!.count, 2);
  });

  it("normaliza espacios y mayúsculas", () => {
    assert.equal(normalizarTituloPaso("  Bolsillo   interior "), "bolsillo interior");
  });
});

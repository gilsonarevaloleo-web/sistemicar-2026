/**
 * Reglas de producto: dirección vs peso vs restricciones.
 * Lista libre ≠ ring entrenamiento. El select de dirección no aplica peso.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSituacionLibreSeed, isSituacionListaLibre } from "./situacionLibreSeed.ts";
import type { Vehicle } from "../lib/persistence.ts";

describe("dirección / lista libre / restricciones", () => {
  it("lista libre no lleva ring ni presión (sigue liviana)", () => {
    const seed = buildSituacionLibreSeed({
      filas: ["llamar", "pagar"],
      proyectoEnfoqueId: "proy_a",
    });
    assert.ok(seed);
    assert.equal(seed!.situacionCronometro, null);
    assert.equal(seed!.situacionCupoAnchor, null);
    assert.equal(seed!.subTareas.every(s => s.proyectoId === "proy_a"), true);

    const v = {
      id: "v1",
      tipoFlota: "situacion",
      status: "activo",
      subTareas: seed!.subTareas,
      situacionCronometro: null,
    } as Vehicle;
    assert.equal(isSituacionListaLibre(v), true);
  });

  it("dirección por fila no activa ring ni cupos (no es restricción de peso)", () => {
    const seed = buildSituacionLibreSeed({
      filas: ["a", "b"],
      filasProyectoIds: ["proy_x", undefined],
      proyectoEnfoqueId: "proy_default",
    });
    assert.ok(seed);
    assert.equal(seed!.subTareas[0]!.proyectoId, "proy_x");
    assert.equal(seed!.subTareas[1]!.proyectoId, "proy_default");
    assert.equal(seed!.situacionCronometro, null);
  });
});

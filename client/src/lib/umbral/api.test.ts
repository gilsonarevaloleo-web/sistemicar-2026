import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UmbralEvaluarSuccess } from "./api.ts";

describe("umbral api types contract", () => {
  it("success payload shape matches parte 2/3", () => {
    const sample: UmbralEvaluarSuccess = {
      success: true,
      modo: "INTERNO_HABILIDAD",
      codigoEvaluado: 1,
      aprobado: false,
      feedbackConfrontativo: "Nombra la excusa puntual.",
      codigoSiguiente: 1,
      moduloCompletado: false,
      nombreCodigo: "Código 1: La Claridad / La Atención / Utilidad",
      userId: "u1",
      sesionId: "ses-1",
      sesion: {
        id: "ses-1",
        userId: "u1",
        modo: "INTERNO_HABILIDAD",
        estado: "EN_PROGRESO",
        codigoActual: 1,
        intentosTotales: 1,
        historialCodigos: [],
        intentosCodigoActual: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    assert.equal(sample.success, true);
    assert.equal(sample.codigoSiguiente, 1);
    assert.equal(sample.sesionId, "ses-1");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scaffoldAnalysisResult } from "@shared/deposito/v3";
import { formatearAuditoriaDepositoV3 } from "./formatear.ts";

describe("formatear auditoría Depósito V3", () => {
  it("incluye fecha, hecho crudo, firma y ajuste", () => {
    const texto = formatearAuditoriaDepositoV3({
      createdAt: new Date("2026-10-21T20:05:00"),
      rawFact: "Vi el patrón a las 9:00. El pistón se atasca.",
      studentHypothesis: "C3",
      result: scaffoldAnalysisResult({
        characterSignedCode: 3,
        immediateAdjustment: "Nombrá un paso y cerrá.",
        pedagogicalFeedback: "Nombrá un paso y cerrá.",
      }),
    });
    assert.match(texto, /DEPÓSITO V3 — AUDITORÍA/);
    assert.match(texto, /Vi el patrón a las 9:00/);
    assert.match(texto, /C3 Trabajo/);
    assert.match(texto, /Nombrá un paso y cerrá/);
    assert.match(texto, /Hipótesis/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scaffoldAnalysisResult } from "./validar.ts";
import {
  esVolcadoEstableAlto,
  evaluateDualTrackPromotion,
  evaluateStudentTierPromotion,
  medirGradoConsistencia,
  medirGradoConsistenciaDesdeVolcados,
} from "./grados.ts";
import type { DepotAnalysisResult } from "./types.ts";

function entry(
  opts: {
    characterSignedCode: DepotAnalysisResult["characterSignedCode"];
    grounded?: boolean;
    timestamp?: number;
    cableado?: boolean;
    vacios?: DepotAnalysisResult["syntacticVacios"];
  },
): DepotAnalysisResult {
  const result = scaffoldAnalysisResult({
    characterSignedCode: opts.characterSignedCode,
    syntacticVacios: opts.vacios,
    syntaxDiagnostic: {
      detectedSyntaxCode: opts.characterSignedCode,
      focoCode: opts.characterSignedCode,
      isCableadoConnected: opts.cableado ?? false,
      syntaxCharacteristics: "Firma de prueba.",
    },
    groundingStatus: {
      isFullyGrounded: opts.grounded ?? Boolean(opts.cableado),
      diagnosticMessage: opts.cableado
        ? "Firma cableada."
        : "Geometría abierta.",
    },
  });
  if (opts.timestamp != null) result.timestamp = opts.timestamp;
  return result;
}

function repeat(n: number, factory: (i: number) => DepotAnalysisResult) {
  return Array.from({ length: n }, (_, i) => factory(i));
}

describe("Depósito V3 — grado por consistencia de firma", () => {
  it("sin volcados → FREE", () => {
    assert.equal(evaluateStudentTierPromotion([]), "FREE");
    assert.equal(medirGradoConsistencia([]).sampleSize, 0);
    assert.equal(medirGradoConsistencia(undefined).recommendedTier, "FREE");
  });

  it("7 de 10 con cableado y vacíos contenidos → TITULO", () => {
    const sample = [
      ...repeat(7, (i) =>
        entry({
          characterSignedCode: 3,
          cableado: true,
          vacios: [2, 4, 9],
          timestamp: i + 1,
        }),
      ),
      ...repeat(3, (i) =>
        entry({
          characterSignedCode: 1,
          cableado: false,
          vacios: [4, 5, 6, 7, 8, 9, 10],
          timestamp: i + 20,
        }),
      ),
    ];
    const medido = medirGradoConsistencia(sample);
    assert.equal(medido.stableCount, 7);
    assert.equal(medido.sampleSize, 10);
    assert.equal(medido.consistencyRate, 0.7);
    assert.equal(medido.recommendedTier, "TITULO");
    assert.equal(evaluateStudentTierPromotion(sample), "TITULO");
  });

  it("5 de 10 estables → CARRERA; 2 de 10 → MATRICULA", () => {
    const mitad = [
      ...repeat(5, (i) =>
        entry({
          characterSignedCode: 8,
          cableado: true,
          vacios: [1, 2],
          timestamp: i,
        }),
      ),
      ...repeat(5, (i) =>
        entry({
          characterSignedCode: 1,
          cableado: false,
          vacios: [3, 4, 5, 6, 7, 8, 9, 10],
          timestamp: i + 50,
        }),
      ),
    ];
    assert.equal(evaluateStudentTierPromotion(mitad), "CARRERA");

    const baja = [
      ...repeat(2, (i) =>
        entry({
          characterSignedCode: 3,
          cableado: true,
          vacios: [1, 2],
          timestamp: i,
        }),
      ),
      ...repeat(8, (i) =>
        entry({
          characterSignedCode: 1,
          cableado: false,
          vacios: [3, 4, 5, 6, 7, 8, 9, 10],
          timestamp: i + 10,
        }),
      ),
    ];
    assert.equal(evaluateStudentTierPromotion(baja), "MATRICULA");
  });

  it("Título exige muestra mínima de 5 aunque la tasa sea 100%", () => {
    const cuatro = repeat(4, (i) =>
      entry({
        characterSignedCode: 3,
        cableado: true,
        vacios: [1, 2],
        timestamp: i,
      }),
    );
    assert.equal(evaluateStudentTierPromotion(cuatro), "CARRERA");

    const cinco = repeat(5, (i) =>
      entry({
        characterSignedCode: 3,
        cableado: true,
        vacios: [1, 2],
        timestamp: i,
      }),
    );
    assert.equal(evaluateStudentTierPromotion(cinco), "TITULO");
  });

  it("firma alta sin cableado no cuenta como estable", () => {
    assert.equal(
      esVolcadoEstableAlto(
        entry({
          characterSignedCode: 7,
          cableado: false,
          vacios: [1, 2, 3, 4, 5, 6, 8, 9, 10],
        }),
      ),
      false,
    );
    const soloTema = repeat(10, (i) =>
      entry({
        characterSignedCode: 7,
        cableado: false,
        vacios: [1, 2, 3, 4, 5, 6, 8, 9, 10],
        timestamp: i,
      }),
    );
    assert.equal(evaluateStudentTierPromotion(soloTema), "MATRICULA");
  });

  it("la ventana toma los 10 más recientes aunque el array venga más-nuevo-primero", () => {
    const viejosInestables = repeat(8, (i) =>
      entry({
        characterSignedCode: 1,
        cableado: false,
        timestamp: i + 1,
      }),
    );
    const recientesEstables = repeat(10, (i) =>
      entry({
        characterSignedCode: 3,
        cableado: true,
        vacios: [1, 2],
        timestamp: 100 + i,
      }),
    );
    const newestFirst = [...recientesEstables, ...viejosInestables].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    const medido = medirGradoConsistencia(newestFirst);
    assert.equal(medido.sampleSize, 10);
    assert.equal(medido.stableCount, 10);
    assert.equal(medido.recommendedTier, "TITULO");
  });

  it("desde volcados usa createdAt para la ventana", () => {
    const entries = [
      {
        createdAt: new Date("2026-01-01"),
        result: entry({
          characterSignedCode: 1,
          cableado: false,
          timestamp: 999,
        }),
      },
      {
        createdAt: new Date("2026-02-01"),
        result: entry({
          characterSignedCode: 3,
          cableado: true,
          vacios: [1, 2],
          timestamp: 1,
        }),
      },
    ];
    const medido = medirGradoConsistenciaDesdeVolcados(entries);
    assert.equal(medido.sampleSize, 2);
    assert.equal(medido.stableCount, 1);
    assert.equal(medido.recommendedTier, "CARRERA");
  });
});

describe("Depósito V3 — promoción por firma (API dual reutilizada)", () => {
  it("sin volcados no pisa el peldaño de partida y no promociona", () => {
    const r = evaluateDualTrackPromotion([], "MATRICULA");
    assert.equal(r.currentTier, "MATRICULA");
    assert.equal(r.recommendedTier, "FREE");
    assert.equal(r.promotionStatus, "MAINTAINED");
    assert.equal(r.sintaxisConsistencyRate, 0);
    assert.match(r.message, /sin registros/i);
  });

  it("7/10 de firma estable → TITULO", () => {
    const sample = [
      ...repeat(7, (i) =>
        entry({
          characterSignedCode: 3,
          cableado: true,
          vacios: [2, 4, 9],
          timestamp: i + 1,
        }),
      ),
      ...repeat(3, (i) =>
        entry({
          characterSignedCode: 1,
          cableado: false,
          vacios: [4, 5, 6, 7, 8, 9, 10],
          timestamp: i + 20,
        }),
      ),
    ];
    const dual = evaluateDualTrackPromotion(sample, "CARRERA");
    assert.equal(dual.currentTier, "CARRERA");
    assert.equal(dual.recommendedTier, "TITULO");
    assert.equal(dual.promotionStatus, "PROMOTED");
    assert.equal(dual.sintaxisConsistencyRate, 70);
    assert.equal(evaluateStudentTierPromotion(sample), "TITULO");
  });

  it("código alto sin cableado no promociona", () => {
    const soloTema = repeat(10, (i) =>
      entry({
        characterSignedCode: 7,
        cableado: false,
        vacios: [1, 2, 3, 4, 5, 6, 8, 9, 10],
        timestamp: i,
      }),
    );
    const dual = evaluateDualTrackPromotion(soloTema);
    assert.equal(dual.recommendedTier, "MATRICULA");
    assert.equal(dual.promotionStatus, "NEEDS_GROUNDING");
    assert.equal(dual.sintaxisConsistencyRate, 0);
    assert.equal(evaluateStudentTierPromotion(soloTema), "MATRICULA");
  });

  it("5/10 de firma estable → CARRERA", () => {
    const mitad = [
      ...repeat(5, (i) =>
        entry({
          characterSignedCode: 8,
          cableado: true,
          vacios: [1, 2],
          timestamp: i,
        }),
      ),
      ...repeat(5, (i) =>
        entry({
          characterSignedCode: 1,
          cableado: false,
          vacios: [3, 4, 5, 6, 7, 8, 9, 10],
          timestamp: i + 50,
        }),
      ),
    ];
    const dual = evaluateDualTrackPromotion(mitad);
    assert.equal(dual.recommendedTier, "CARRERA");
    assert.equal(dual.promotionStatus, "PROMOTED");
  });
});

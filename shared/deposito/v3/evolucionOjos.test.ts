import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildActiveCharacterMap } from "./ojos.ts";
import { scaffoldAnalysisResult } from "./validar.ts";
import {
  etiquetaPeldano,
  indiceCascada,
  medirEvolucionOjos,
  mensajeEvolucion,
  peldanoAlcanzado,
  puntoDesdeVolcado,
} from "./evolucionOjos.ts";
import type { DepotAnalysisResult, EyeCode } from "./types.ts";

function volcado(
  activos: readonly EyeCode[],
  timestamp: number,
  cableado = false,
): { result: DepotAnalysisResult } {
  const result = scaffoldAnalysisResult({
    characterSignedCode: activos[0] ?? 1,
    activeCharacterMap: buildActiveCharacterMap(activos),
    syntaxDiagnostic: {
      detectedSyntaxCode: activos[0] ?? 1,
      focoCode: activos[0] ?? 1,
      isCableadoConnected: cableado,
      syntaxCharacteristics: "Firma de prueba.",
    },
  });
  result.timestamp = timestamp;
  return { result };
}

describe("Depósito — evolución por Ley de Cascada", () => {
  it("el índice exige continuidad C1→C2→C4→C5→C7→C10", () => {
    assert.equal(indiceCascada(buildActiveCharacterMap([])), 0);
    assert.equal(indiceCascada(buildActiveCharacterMap([10, 8, 3])), 0);
    assert.equal(peldanoAlcanzado(buildActiveCharacterMap([10, 8, 3])), 0);
    assert.equal(indiceCascada(buildActiveCharacterMap([1])), 1);
    assert.equal(peldanoAlcanzado(buildActiveCharacterMap([1])), 1);
    assert.equal(indiceCascada(buildActiveCharacterMap([1, 2, 5, 10])), 2);
    assert.equal(peldanoAlcanzado(buildActiveCharacterMap([1, 2, 5, 10])), 2);
    assert.equal(indiceCascada(buildActiveCharacterMap([1, 2, 4])), 3);
    assert.equal(
      indiceCascada(buildActiveCharacterMap([1, 2, 4, 5, 7, 10])),
      6,
    );
    assert.equal(
      peldanoAlcanzado(buildActiveCharacterMap([1, 2, 4, 5, 7, 10])),
      10,
    );
    assert.equal(etiquetaPeldano(0), "sin ancla");
    assert.equal(etiquetaPeldano(4), "C4");
  });

  it("C3 C6 C8 C9 no abren peldaño aunque llenen el mapa de calor", () => {
    const mapa = buildActiveCharacterMap([1, 2, 3, 6, 8, 9]);
    assert.equal(indiceCascada(mapa), 2);
    assert.equal(peldanoAlcanzado(mapa), 2);
    const punto = puntoDesdeVolcado(
      volcado([1, 2, 3, 6, 8, 9], Date.UTC(2026, 10, 1, 15, 0, 0)),
    );
    assert.equal(punto.indice, 2);
    assert.deepEqual(punto.presencia, [1, 2, 3, 6, 8, 9]);
    assert.equal(punto.pendiente, 4);
    assert.equal(punto.fecha, "2026-11-01");
  });

  it("cantidad de volcados no sube la evolución si el peldaño no escala", () => {
    const muchosSinAncla = [
      volcado([3, 8, 9], 1),
      volcado([3, 6, 8], 2),
      volcado([8, 9, 10], 3),
      volcado([3, 8], 4),
    ];
    const evo = medirEvolucionOjos(muchosSinAncla);
    assert.equal(evo.sampleSize, 4);
    assert.equal(evo.indiceActual, 0);
    assert.equal(evo.peldanoActual, 0);
    assert.equal(evo.tendencia, "sostiene");
    assert.ok(evo.presenciaPorOjo[8] >= 3);
    assert.match(evo.mensaje, /cantidad no es evolución|Sostenés sin ancla/);
  });

  it("la cascada sube cuando el índice reciente avanza", () => {
    const serie = [
      volcado([1], 1),
      volcado([1, 2], 2),
      volcado([1, 2], 3),
      volcado([1, 2, 4], 4),
      volcado([1, 2, 4, 5], 5),
      volcado([1, 2, 4, 5, 7], 6),
    ];
    const evo = medirEvolucionOjos(serie);
    assert.equal(evo.indiceActual, 5);
    assert.equal(evo.peldanoActual, 7);
    assert.equal(evo.pendienteActual, 10);
    assert.equal(evo.tendencia, "sube");
    assert.match(evo.mensaje, /cascada sube/);
    assert.match(evo.mensaje, /cantidad de volcados no es esta subida/);
  });

  it("baja si los últimos volcados pierden el ancla", () => {
    const serie = [
      volcado([1, 2, 4, 5, 7, 10], 1, true),
      volcado([1, 2, 4, 5, 7, 10], 2, true),
      volcado([1, 2, 4], 3),
      volcado([3, 8], 4),
      volcado([8], 5),
    ];
    const evo = medirEvolucionOjos(serie);
    assert.equal(evo.tendencia, "baja");
    assert.equal(evo.indiceActual, 0);
    assert.match(evo.mensaje, /más volcados, no más peldaño/);
  });

  it("vacío explica la escalera, no un conteo", () => {
    const evo = medirEvolucionOjos([]);
    assert.equal(evo.sampleSize, 0);
    assert.equal(evo.tendencia, "sin_muestra");
    assert.equal(evo.pendienteActual, 1);
    assert.match(evo.mensaje, /C1 → C2 → C4 → C5 → C7 → C10/);
    assert.equal(
      mensajeEvolucion({
        sampleSize: 0,
        tendencia: "sin_muestra",
        peldanoActual: 0,
        pendienteActual: 1,
      }).includes("se escala"),
      true,
    );
  });
});

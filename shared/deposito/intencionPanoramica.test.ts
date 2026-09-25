import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INTENCION_PANORAMICA_NOMBRE,
  bloqueDirectivaIntencionPanoramica,
  bloqueUserMetricasJornada,
  formatPuertasIntencionPanoramica,
  normalizarMetricasJornada,
  resumenIntencionPanoramica,
  veredictoIntencionPanoramica,
} from "./intencionPanoramica.ts";

describe("Intención Panorámica", () => {
  it("reemplaza Secuencia de Jornada en la directiva del evaluador", () => {
    const bloque = bloqueDirectivaIntencionPanoramica();
    assert.match(bloque, /Intención Panorámica \(Presencia de Terreno en 0ms\)/);
    assert.match(bloque, /prohibido evaluar La Jornada como una «Secuencia de Jornada»/);
    assert.match(bloque, /sensor de vigilia/);
    assert.equal(INTENCION_PANORAMICA_NOMBRE.includes("Secuencia de Jornada"), false);
  });

  it("formatea el contador X/Y sin cambiar la lógica numérica", () => {
    assert.equal(
      formatPuertasIntencionPanoramica(2, 5),
      "2/5 Puertas de Intención Panorámica",
    );
    assert.equal(
      formatPuertasIntencionPanoramica(0, 0),
      "Sin Puertas de Intención Panorámica",
    );
  });

  it("normaliza métricas y distingue conquista de pérdida", () => {
    const ok = normalizarMetricasJornada({
      puertas_conquistadas: "3",
      puertas_totales: 4,
      perdidas: 1,
    });
    assert.deepEqual(ok, {
      puertasConquistadas: 3,
      puertasTotales: 4,
      puertasPerdidas: 1,
    });
    assert.equal(resumenIntencionPanoramica(ok!).conquistada, false);
    assert.match(veredictoIntencionPanoramica(ok!), /perdiste/);
    assert.match(bloqueUserMetricasJornada(ok!), /PÉRDIDA/);

    const full = normalizarMetricasJornada({
      puertasConquistadas: 2,
      puertasTotales: 2,
      puertasPerdidas: 0,
    });
    assert.equal(resumenIntencionPanoramica(full!).conquistada, true);
    assert.match(veredictoIntencionPanoramica(full!), /conquistaste/);
  });
});

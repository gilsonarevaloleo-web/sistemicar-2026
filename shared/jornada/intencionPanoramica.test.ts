import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INTENCION_PANORAMICA_NOMBRE,
  formatPuertasIntencionPanoramica,
  normalizarMetricasJornada,
  resumenIntencionPanoramica,
} from "./intencionPanoramica.ts";

describe("Intención Panorámica — Jornada", () => {
  it("nombra el sensor de vigilia, no una secuencia de tareas", () => {
    assert.match(INTENCION_PANORAMICA_NOMBRE, /Presencia de Terreno en 0ms/);
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

    const full = normalizarMetricasJornada({
      puertasConquistadas: 2,
      puertasTotales: 2,
      puertasPerdidas: 0,
    });
    assert.equal(resumenIntencionPanoramica(full!).conquistada, true);
  });
});

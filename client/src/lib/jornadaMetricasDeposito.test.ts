import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { metricasIntencionFromSegmentos } from "./jornadaMetricasDeposito.ts";

describe("jornadaMetricasDeposito", () => {
  it("cuenta puertas conscientes vs sistema/entropía sin escribir persistencia", () => {
    const metricas = metricasIntencionFromSegmentos([
      { estado: "cerrado_manual" },
      { estado: "activo", puertaSistema: false },
      { estado: "activo", puertaSistema: true },
      { estado: "entropia" },
      { estado: "pendiente" },
    ]);
    assert.deepEqual(metricas, {
      puertasConquistadas: 2,
      puertasTotales: 5,
      puertasPerdidas: 2,
    });
  });

  it("sin segmentos no inventa métricas", () => {
    assert.equal(metricasIntencionFromSegmentos([]), undefined);
  });
});

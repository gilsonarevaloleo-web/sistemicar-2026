import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  idleSecondsContenedor,
  isContenedorDesglose,
  measuredWorkSeconds,
  trabajoMinutosDeVehiculo,
} from "./vehiculoMinutos.ts";

describe("vehiculoMinutos — reporte en minutos de vehículo", () => {
  it("ring Enfoque y desglosador Conquista son contenedores; la interrupción no", () => {
    assert.equal(isContenedorDesglose({ tipoReloj: "desglosador" }), true);
    assert.equal(
      isContenedorDesglose({
        tipoFlota: "situacion",
        situacionCronometro: { activo: true },
      }),
      true
    );
    assert.equal(
      isContenedorDesglose({
        tipoFlota: "situacion",
        vehiculoPadreDesglosadorId: "padre",
      }),
      false
    );
    assert.equal(
      isContenedorDesglose({ tipoFlota: "situacion" }),
      false
    );
  });

  it("desglosador vacío no hereda la pared: 0 minutos de vehículo", () => {
    const v = {
      status: "archivado",
      tipoReloj: "desglosador",
      subVehiculos: [{ id: "s1", status: "pendiente" as const }],
    };
    assert.equal(measuredWorkSeconds(v), 0);
    assert.equal(trabajoMinutosDeVehiculo(v), 0);
    assert.equal(idleSecondsContenedor(v, 20 * 60), 20 * 60);
  });

  it("Enfoque: Σ duracionRealSec de filas, no la pared del ring", () => {
    const v = {
      status: "cumplido",
      tipoFlota: "situacion",
      situacionCronometro: { activo: false },
      subTareas: [
        { id: "a", enDesgloseCronometro: true, duracionRealSec: 30 * 60 },
        { id: "b", enDesgloseCronometro: true, duracionRealSec: 15 * 60 },
      ],
    };
    assert.equal(measuredWorkSeconds(v), 45 * 60);
    assert.equal(trabajoMinutosDeVehiculo(v), 45);
    assert.equal(idleSecondsContenedor(v, 60 * 60), 15 * 60);
  });

  it("Conquista: Σ unidades cerradas + tramo vivo", () => {
    const now = 1_000_000 + 10 * 60_000;
    const v = {
      status: "activo",
      tipoReloj: "desglosador",
      subVehiculos: [
        { id: "u1", status: "cumplido" as const, duracionFinal: 8 * 60 },
        { id: "u2", status: "activo" as const, aperturaAt: 1_000_000 },
      ],
    };
    assert.equal(measuredWorkSeconds(v, now), 8 * 60 + 10 * 60);
    assert.equal(trabajoMinutosDeVehiculo(v, now), 18);
  });

  it("interrupción congela el tramo vivo: snapshot, no pared hasta ahora", () => {
    const now = 1_000_000 + 40 * 60_000;
    const v = {
      status: "activo",
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      desglosadorPausa: {
        pausadoAt: 1_000_000 + 12 * 60_000,
        subActivoId: "u1",
        elapsedSecSnapshot: 12 * 60,
      },
      subVehiculos: [
        {
          id: "u1",
          status: "nested_paused" as const,
          aperturaAt: 1_000_000,
        },
      ],
    };
    assert.equal(measuredWorkSeconds(v, now), 12 * 60);
    assert.equal(trabajoMinutosDeVehiculo(v, now), 12);
    assert.equal(idleSecondsContenedor(v, 40 * 60, now), 28 * 60);
  });

  it("ring sin fila en foco: idle = pared, trabajo 0", () => {
    const now = 2_000_000;
    const v = {
      status: "activo",
      tipoFlota: "situacion" as const,
      situacionCronometro: { activo: true },
      subTareas: [
        { id: "f1", enDesgloseCronometro: true, resultadoSituacion: "cumplido" as const, duracionRealSec: 5 * 60 },
      ],
    };
    assert.equal(measuredWorkSeconds(v, now), 5 * 60);
    assert.equal(idleSecondsContenedor(v, 20 * 60, now), 15 * 60);
  });
});

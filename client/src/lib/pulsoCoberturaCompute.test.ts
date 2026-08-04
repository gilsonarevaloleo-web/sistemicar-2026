import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetLiveEntropyMonotonic } from "../engines/ConcienciaEngine.ts";
import type { Vehicle } from "./persistence.ts";
import {
  buildPulsoInputSig,
  computePulsoCobertura,
} from "./pulsoCoberturaCompute.ts";

/** Hora civil en Lima (UTC-5) como timestamp UTC. */
function limaAt(y: number, mo: number, d: number, h: number, min = 0): number {
  return Date.UTC(y, mo, d, h + 5, min);
}

function baseVehicle(partial: Partial<Vehicle> & { id: string }): Vehicle {
  const aperturaAt = partial.aperturaAt ?? Date.now();
  return {
    titulo: partial.titulo ?? "Misión",
    criterioFin: "manual",
    criterioDetalle: "",
    tiempoInicio: new Date(aperturaAt),
    ejes: {
      enfoque: { text: "", trifecta: "pendiente" },
      conflicto: { text: "", trifecta: "pendiente" },
      pasos: { text: "", trifecta: "pendiente" },
      limite: { text: "", trifecta: "pendiente" },
    },
    status: "activo",
    userId: "u1",
    // createdAt alineado a apertura — si queda "en el futuro" vs now simulado, no cubre.
    createdAt: new Date(aperturaAt),
    tipoFlota: "tiempo",
    tipoReloj: "desglosador",
    ...partial,
    aperturaAt,
  } as Vehicle;
}

describe("pulsoCoberturaCompute", () => {
  it("sin planificación no hay pulso (ruido, no información)", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 6, 26, 10, 30);
    const model = computePulsoCobertura({
      segmentos: [],
      vehicles: [],
      now,
      applyMonotonic: false,
    });
    assert.equal(model.hasPlanificacion, false);
    assert.equal(model.entropiaMin, 0);
    assert.equal(model.conquistaMin, 0);
    assert.equal(model.needsLaunch, false);
  });

  it("sin vehículos marca needsLaunch si hay segmento activo", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 6, 26, 10, 30);
    const model = computePulsoCobertura({
      segmentos: [
        {
          id: "s1",
          nombre: "Bloque mañana",
          horaInicio: "08:00",
          horaFin: "12:00",
          estado: "activo",
        },
      ],
      vehicles: [],
      segmentoActivoId: "s1",
      now,
      applyMonotonic: false,
    });
    assert.equal(model.hasPlanificacion, true);
    assert.equal(model.needsLaunch, true);
    assert.equal(model.consciousNow, false);
    assert.ok(model.entropiaMin > 0, "debe acumular inconsciente en ventana vivida");
    assert.equal(model.segmentoActivoNombre, "Bloque mañana");
  });

  it("inconsciente no supera el plan no conquistado (techo de planificación)", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 6, 26, 20, 0);
    // Tres bloques solapados 05:30–21:00 — sin merge el reloj inventaba ~47h.
    const segs = [
      { id: "a", horaInicio: "05:30", horaFin: "21:00", estado: "activo" },
      { id: "b", horaInicio: "05:30", horaFin: "21:00", estado: "cerrado" },
      { id: "c", horaInicio: "05:30", horaFin: "21:00", estado: "cerrado" },
    ];
    const model = computePulsoCobertura({
      segmentos: segs,
      vehicles: [],
      segmentoActivoId: "a",
      now,
      applyMonotonic: false,
    });
    const plannedUniqueMin = 15.5 * 60; // 05:30–21:00
    assert.ok(model.hasPlanificacion);
    assert.ok(
      model.entropiaMin <= plannedUniqueMin + 0.5,
      `entropía ${model.entropiaMin} no debe superar plan único ~${plannedUniqueMin}`
    );
    assert.ok(
      model.conquistaMin + model.entropiaMin <= plannedUniqueMin + 0.5,
      "consciente+inconsciente acotados al plan"
    );
  });

  it("vehículo consciente activo apaga needsLaunch", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 6, 26, 10, 30);
    const v = baseVehicle({
      id: "v1",
      aperturaAt: limaAt(2026, 6, 26, 10, 0),
      status: "activo",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
    });
    const model = computePulsoCobertura({
      segmentos: [
        {
          id: "s1",
          nombre: "Bloque",
          horaInicio: "08:00",
          horaFin: "12:00",
          estado: "activo",
        },
      ],
      vehicles: [v],
      segmentoActivoId: "s1",
      now,
      applyMonotonic: false,
    });
    assert.equal(model.consciousNow, true);
    assert.equal(model.needsLaunch, false);
    assert.ok(model.conquistaMin > 0);
  });

  it("firma cambia al lanzar vehículo activo", () => {
    const segs = [
      { id: "s1", estado: "activo", horaInicio: "08:00", horaFin: "12:00" },
    ];
    const a = buildPulsoInputSig(segs, [], "s1");
    const b = buildPulsoInputSig(
      segs,
      [
        baseVehicle({
          id: "v1",
          aperturaAt: Date.now(),
          status: "activo",
        }),
      ],
      "s1"
    );
    assert.notEqual(a, b);
  });

  it("coberturaPct coherente con conquista/(conquista+entropía)", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 6, 26, 11, 0);
    const model = computePulsoCobertura({
      segmentos: [
        {
          id: "s1",
          horaInicio: "08:00",
          horaFin: "12:00",
          estado: "activo",
        },
      ],
      vehicles: [
        baseVehicle({
          id: "v1",
          aperturaAt: limaAt(2026, 6, 26, 8, 0),
          cierreAt: limaAt(2026, 6, 26, 9, 0),
          status: "cumplido",
          tipoFlota: "tiempo",
        }),
      ],
      segmentoActivoId: "s1",
      now,
      applyMonotonic: false,
    });
    const fought = model.conquistaMin + model.entropiaMin;
    if (fought > 0) {
      assert.ok(model.coberturaPct >= 0 && model.coberturaPct <= 100);
      assert.equal(
        model.coberturaPct,
        Math.min(100, Math.round((model.conquistaMin / fought) * 100))
      );
    }
  });
});

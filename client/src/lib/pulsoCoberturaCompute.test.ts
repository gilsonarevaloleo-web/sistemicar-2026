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
  return {
    titulo: partial.titulo ?? "Misión",
    criterioFin: "manual",
    criterioDetalle: "",
    tiempoInicio: new Date(partial.aperturaAt ?? Date.now()),
    ejes: {
      enfoque: { text: "", trifecta: "pendiente" },
      conflicto: { text: "", trifecta: "pendiente" },
      pasos: { text: "", trifecta: "pendiente" },
      limite: { text: "", trifecta: "pendiente" },
    },
    status: "activo",
    userId: "u1",
    createdAt: new Date(),
    tipoFlota: "tiempo",
    tipoReloj: "desglosador",
    ...partial,
  } as Vehicle;
}

describe("pulsoCoberturaCompute", () => {
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
    assert.equal(model.needsLaunch, true);
    assert.equal(model.consciousNow, false);
    assert.ok(model.entropiaMin > 0, "debe acumular inconsciente en ventana vivida");
    assert.equal(model.segmentoActivoNombre, "Bloque mañana");
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "@/lib/persistence";
import {
  areVehicleCardPropsEqual,
  desglosadorSubUiSignature,
  vehicleCardNeedsLiveTick,
} from "./vehicleCardMemo";

function baseVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    titulo: "Test",
    status: "activo",
    tipoFlota: "operativa",
    subTareas: [],
    ...overrides,
  } as Vehicle;
}

describe("vehicleCardNeedsLiveTick", () => {
  it("no tick si no está activo", () => {
    assert.equal(
      vehicleCardNeedsLiveTick(baseVehicle({ status: "cumplido" }), false),
      false
    );
  });

  it("tick si está expandido", () => {
    assert.equal(vehicleCardNeedsLiveTick(baseVehicle(), true), true);
  });

  it("tick colapsado desglosador (panel compacto en header)", () => {
    assert.equal(
      vehicleCardNeedsLiveTick(
        baseVehicle({ tipoReloj: "desglosador", aperturaAt: Date.now() - 60_000 }),
        false
      ),
      true
    );
  });

  it("sin tick colapsado operativa sin reloj visible", () => {
    assert.equal(vehicleCardNeedsLiveTick(baseVehicle(), false), false);
  });
});

describe("areVehicleCardPropsEqual", () => {
  it("ignora callbacks y compara datos visibles", () => {
    const vehicle = baseVehicle();
    assert.equal(
      areVehicleCardPropsEqual(
        { vehicle, expanded: false, onToggleVehicle: () => {} },
        { vehicle, expanded: false, onToggleVehicle: () => {} }
      ),
      true
    );
  });

  it("detecta cambio de expanded", () => {
    const vehicle = baseVehicle();
    assert.equal(
      areVehicleCardPropsEqual(
        { vehicle, expanded: false },
        { vehicle, expanded: true }
      ),
      false
    );
  });

  it("detecta cumplido/fallado en filas del ring", () => {
    const base = baseVehicle({
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: 1000 },
      subTareas: [
        {
          id: "st1",
          texto: "Bolsillo",
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 24,
        },
      ],
    } as Partial<Vehicle>);
    const cumplido = {
      ...base,
      subTareas: [{ ...base.subTareas![0]!, resultadoSituacion: "cumplido" as const, cerradaAt: 2000 }],
    };
    assert.equal(
      areVehicleCardPropsEqual({ vehicle: base, expanded: true }, { vehicle: cumplido, expanded: true }),
      false
    );
  });

  it("detecta cierre de sub desglosador aunque siga habiendo 1 activo", () => {
    const base = baseVehicle({
      tipoReloj: "desglosador",
      subVehiculos: [
        { id: "s1", titulo: "A", status: "cumplido" },
        { id: "s2", titulo: "B", status: "activo", aperturaAt: 100 },
        { id: "s3", titulo: "C", status: "pendiente" },
      ],
    } as Partial<Vehicle>);
    const afterClose = {
      ...base,
      subVehiculos: [
        { id: "s1", titulo: "A", status: "cumplido" },
        { id: "s2", titulo: "B", status: "cumplido", cierreAt: 200 },
        { id: "s3", titulo: "C", status: "activo", aperturaAt: 200 },
      ],
    };
    assert.notEqual(desglosadorSubUiSignature(base), desglosadorSubUiSignature(afterClose));
    assert.equal(
      areVehicleCardPropsEqual({ vehicle: base, expanded: true }, { vehicle: afterClose, expanded: true }),
      false
    );
  });
});

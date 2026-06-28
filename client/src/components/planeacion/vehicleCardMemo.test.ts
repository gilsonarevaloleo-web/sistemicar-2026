import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "@/lib/persistence";
import {
  areVehicleCardPropsEqual,
  desglosadorAllSubsClosed,
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
  it("siempre false — islands suscriben concienciaClock internamente", () => {
    assert.equal(
      vehicleCardNeedsLiveTick(baseVehicle({ status: "cumplido" }), false),
      false
    );
    assert.equal(vehicleCardNeedsLiveTick(baseVehicle(), true), false);
    assert.equal(vehicleCardNeedsLiveTick(baseVehicle(), false), false);
  });

  it("sin tick desglosador ni situación expandida", () => {
    const desglosador = baseVehicle({ tipoReloj: "desglosador", aperturaAt: Date.now() - 60_000 });
    assert.equal(vehicleCardNeedsLiveTick(desglosador, false), false);
    assert.equal(vehicleCardNeedsLiveTick(desglosador, true), false);

    const situacion = baseVehicle({
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: Date.now() },
    } as Partial<Vehicle>);
    assert.equal(vehicleCardNeedsLiveTick(situacion, true), false);
  });

  it("sin tick desglosador cuando todos los subs están cerrados", () => {
    const allDone = baseVehicle({
      tipoReloj: "desglosador",
      subVehiculos: [
        { id: "s1", titulo: "A", status: "cumplido" },
        { id: "s2", titulo: "B", status: "cumplido" },
        { id: "s3", titulo: "C", status: "fallado" },
      ],
    } as Partial<Vehicle>);
    assert.equal(desglosadorAllSubsClosed(allDone), true);
    assert.equal(vehicleCardNeedsLiveTick(allDone, true), false);
    assert.equal(vehicleCardNeedsLiveTick(allDone, false), false);
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import { vehiclesReactiveSignature } from "./situacionRepair.ts";

function veh(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "t",
    userId: "u",
    status: "activo",
    createdAt: new Date(0),
    ...partial,
  } as Vehicle;
}

describe("vehiclesReactiveSignature", () => {
  it("cambia al Cumplido: ancla startedAt y resultadoSituacion (no skip de React)", () => {
    const base = veh({
      id: "s1",
      status: "activo",
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: 1, depthBlockPsGranted: 0 } as never,
      situacionCupoAnchor: { subTareaId: "a", startedAt: 1000 },
      subTareas: [
        {
          id: "a",
          texto: "A",
          completada: false,
          creadaAt: 0,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 10,
        },
        {
          id: "b",
          texto: "B",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 10,
        },
      ],
    });
    const afterCumplido = {
      ...base,
      situacionCupoAnchor: { subTareaId: "b", startedAt: 2000 },
      subTareas: [
        { ...base.subTareas![0]!, resultadoSituacion: "cumplido" as const, cerradaAt: 2000 },
        base.subTareas![1]!,
      ],
    } as Vehicle;
    assert.notEqual(
      vehiclesReactiveSignature([base]),
      vehiclesReactiveSignature([afterCumplido]),
      "sin este cambio useFlotaVehiclesShallow salta setState y la UI queda en deuda / Fila foco #1"
    );
  });

  it("cambia solo al reset de startedAt en handoff (misma fila id distinta)", () => {
    const before = veh({
      id: "s1",
      tipoFlota: "situacion",
      situacionCupoAnchor: { subTareaId: "b", startedAt: 1000 },
      subTareas: [
        {
          id: "b",
          texto: "Probar ring",
          completada: false,
          creadaAt: 0,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 5,
        },
      ],
    });
    const after = {
      ...before,
      situacionCupoAnchor: { subTareaId: "b", startedAt: 999_000 },
    } as Vehicle;
    assert.notEqual(
      vehiclesReactiveSignature([before]),
      vehiclesReactiveSignature([after]),
      "startedAt fresco debe invalidar firma o el island conserva DEUDA ACUMULADA"
    );
  });

  it("cambia al Fallado de la misma forma", () => {
    const base = veh({
      id: "s2",
      status: "activo",
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: 1, depthBlockPsGranted: 0 } as never,
      situacionCupoAnchor: { subTareaId: "a", startedAt: 1000 },
      subTareas: [
        {
          id: "a",
          texto: "A",
          completada: false,
          creadaAt: 0,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 13,
        },
        {
          id: "b",
          texto: "B",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 12,
        },
      ],
    });
    const afterFallado = {
      ...base,
      situacionCupoAnchor: { subTareaId: "b", startedAt: 2500 },
      subTareas: [
        { ...base.subTareas![0]!, resultadoSituacion: "fallado" as const, cerradaAt: 2500 },
        base.subTareas![1]!,
      ],
    } as Vehicle;
    assert.notEqual(
      vehiclesReactiveSignature([base]),
      vehiclesReactiveSignature([afterFallado])
    );
  });
});

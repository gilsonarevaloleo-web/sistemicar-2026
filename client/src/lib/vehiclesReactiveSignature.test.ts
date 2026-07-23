import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import { vehiclesReactiveSignature } from "./vehiclesReactiveSignature.ts";

function veh(partial: Partial<Vehicle> & Pick<Vehicle, "id" | "status">): Vehicle {
  return {
    titulo: "t",
    criterioFin: "tiempo",
    criterioDetalle: "1",
    userId: "u",
    tipoReloj: "cronometro",
    createdAt: new Date(),
    tiempoInicio: new Date(),
    ...partial,
  } as Vehicle;
}

describe("vehiclesReactiveSignature", () => {
  it("es estable ante reorden de lista", () => {
    const a = veh({ id: "a", status: "activo" });
    const b = veh({ id: "b", status: "cumplido" });
    assert.equal(vehiclesReactiveSignature([a, b]), vehiclesReactiveSignature([b, a]));
  });

  it("cambia cuando el ring situacional muta", () => {
    const base = veh({
      id: "s1",
      status: "activo",
      situacionCronometro: { activo: true, bloqueInicioAt: 1, depthBlockPsGranted: 0 } as never,
    });
    const next = {
      ...base,
      situacionCronometro: { activo: false, bloqueInicioAt: 1, depthBlockPsGranted: 3 },
    } as Vehicle;
    assert.notEqual(vehiclesReactiveSignature([base]), vehiclesReactiveSignature([next]));
  });

  it("cambia al Cumplido: ancla startedAt y resultadoSituacion (no skip de disco/React)", () => {
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
      "sin este cambio el flush a disco se saltaba y la UI podía quedar en 0/3"
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

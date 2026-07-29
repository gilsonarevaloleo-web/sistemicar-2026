import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterJornada4Vehicles,
  isJornada4Vehicle,
  isConquistaRapido,
  isExpressSituacion,
  isSituacionDesglosador,
  isSituacionListaLibre,
  isSituacionRing,
} from "./filters.ts";
import type { Vehicle } from "../lib/persistence.ts";

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "x",
    status: "activo",
    userId: "u",
    ...partial,
  } as Vehicle;
}

describe("jornada4 filters", () => {
  it("acepta desglosador, ring, independientes y lista libre", () => {
    const list = [
      v({ id: "1", tipoFlota: "tiempo", tipoReloj: "desglosador" }),
      v({
        id: "2",
        tipoFlota: "situacion",
        situacionCronometro: { activo: true, bloqueInicioAt: 1 },
      }),
      v({ id: "3", tipoFlota: "tiempo", tipoReloj: "manual" }),
      v({ id: "4", tipoFlota: "descanso" }),
      v({ id: "5", tipoFlota: "verdad" }),
      v({ id: "6", tipoFlota: "situacion", status: "cumplido" }),
      v({
        id: "7",
        tipoFlota: "tiempo",
        tipoReloj: "produccion",
        cantidadObjetivo: 5,
      }),
      v({
        id: "8",
        tipoFlota: "situacion",
        subTareas: [
          {
            id: "a",
            texto: "Fila",
            completada: false,
            creadaAt: 1,
            enDesgloseCronometro: false,
          },
        ],
      }),
    ];
    const dual = filterJornada4Vehicles(list);
    assert.deepEqual(
      dual.map(x => x.id),
      ["1", "2", "7", "8"]
    );
    assert.equal(isJornada4Vehicle(list[0]), true);
    assert.equal(isJornada4Vehicle(list[3]), false);
    assert.equal(isConquistaRapido(list[6]!), true);
    assert.equal(isSituacionListaLibre(list[7]!), true);
    assert.equal(isSituacionDesglosador(list[1]!), true);
    assert.equal(isSituacionDesglosador(list[7]!), false);
  });

  it("distingue ring situacional de interrupción express", () => {
    const ring = v({
      id: "ring",
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: 1 },
      subTareas: [
        {
          id: "f1",
          texto: "Fila",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
        },
      ],
    });
    const interrupt = v({
      id: "int",
      tipoFlota: "situacion",
      tipoTerminoRapido: "situacion",
      vehiculoPadreDesglosadorId: "parent-conquista",
      excluirDeHistorial: true,
    });
    const libre = v({
      id: "libre",
      tipoFlota: "situacion",
      subTareas: [
        {
          id: "a",
          texto: "Fila",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: false,
        },
      ],
    });
    assert.equal(isSituacionRing(ring), true);
    assert.equal(isExpressSituacion(ring), false);
    assert.equal(isSituacionRing(interrupt), false);
    assert.equal(isExpressSituacion(interrupt), true);
    assert.equal(isSituacionListaLibre(libre), true);
    assert.equal(isExpressSituacion(libre), false);
  });
});

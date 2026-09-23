import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
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
import { resetGhostSessionCache } from "../lib/ghostVehicleEngine.ts";

const NOW = Date.now();

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "x",
    status: "activo",
    userId: "u",
    aperturaAt: NOW,
    ...partial,
  } as Vehicle;
}

describe("jornada4 filters", () => {
  beforeEach(() => {
    resetGhostSessionCache();
  });

  it("acepta desglosador, ring, independientes y lista libre", () => {
    const list = [
      v({ id: "1", tipoFlota: "tiempo", tipoReloj: "desglosador" }),
      v({
        id: "2",
        tipoFlota: "situacion",
        situacionCronometro: { activo: true, bloqueInicioAt: NOW },
        subTareas: [
          {
            id: "f1",
            texto: "Fila",
            completada: false,
            creadaAt: NOW,
            enDesgloseCronometro: true,
            resultadoSituacion: "pendiente",
          },
        ],
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

  it("ring pausado con filas pendientes sigue siendo ring (no lista libre)", () => {
    const paused = v({
      id: "paused",
      tipoFlota: "situacion",
      situacionCronometro: { activo: false, bloqueInicioAt: 1 },
      subTareas: [
        {
          id: "f1",
          texto: "Fila",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
        },
      ],
    });
    assert.equal(isSituacionRing(paused), true);
    assert.equal(isSituacionDesglosador(paused), true);
    assert.equal(isSituacionListaLibre(paused), false);
    assert.equal(isExpressSituacion(paused), false);
  });

  it("no lista un ring sin filas ni una avalancha de conquistas viejas", () => {
    const zombieRing = v({
      id: "zombie",
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: NOW },
      subTareas: [
        {
          id: "f1",
          texto: "Hecha",
          completada: true,
          creadaAt: NOW,
          enDesgloseCronometro: true,
          resultadoSituacion: "cumplido",
        },
      ],
    });
    const live = v({
      id: "live",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      subVehiculos: [{ id: "s1", titulo: "Ahora", status: "activo", aperturaAt: NOW }],
    });
    const flood = Array.from({ length: 20 }, (_, i) =>
      v({
        id: `old-${i}`,
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        aperturaAt: NOW - (i + 1) * 60_000,
        subVehiculos: [
          {
            id: `s-${i}`,
            titulo: "Pendiente",
            status: "pendiente",
          },
        ],
      })
    );
    const dual = filterJornada4Vehicles([zombieRing, live, ...flood]);
    assert.equal(dual.some(x => x.id === "zombie"), true, "cascarón visible para poder cerrarlo");
    assert.equal(dual.some(x => x.id === "live"), true);
    assert.ok(dual.filter(x => x.id.startsWith("old-")).length <= 4);
    assert.ok(dual.length <= 6);
  });

  it("desglosador en pausa sigue listado para reanudar o cerrar", () => {
    const paused = v({
      id: "paused-conq",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      desglosadorPausa: { pausadoAt: NOW, subActivoId: "s1" },
      subVehiculos: [{ id: "s1", titulo: "Corte", status: "nested_paused" }],
    });
    const flood = Array.from({ length: 8 }, (_, i) =>
      v({
        id: `run-${i}`,
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        aperturaAt: NOW - i * 60_000,
        subVehiculos: [{ id: `s-${i}`, titulo: "U", status: "activo", aperturaAt: NOW }],
      })
    );
    const dual = filterJornada4Vehicles([paused, ...flood]);
    assert.equal(dual.some(x => x.id === "paused-conq"), true);
  });
});

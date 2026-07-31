import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import {
  diskSessionRicherThanMemory,
  rehydrateFlotaFromDiskSources,
} from "./flotaResume.ts";

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "x",
    status: "activo",
    userId: "u",
    tipoFlota: "situacion",
    tiempoInicio: new Date(1),
    createdAt: new Date(1),
    ...partial,
  } as Vehicle;
}

describe("flotaResume", () => {
  it("detecta shell en memoria vs ring en disco", () => {
    const memory = v({ id: "r1" });
    const disk = v({
      id: "r1",
      situacionCronometro: { activo: true, bloqueInicioAt: 10, horaFinMs: 100 },
      situacionCupoAnchor: { subTareaId: "a", startedAt: 10 },
      subTareas: [
        {
          id: "a",
          texto: "Fila 1",
          completada: false,
          creadaAt: 10,
          enDesgloseCronometro: true,
          minutosCupo: 5,
        },
        {
          id: "b",
          texto: "Fila 2",
          completada: false,
          creadaAt: 10,
          enDesgloseCronometro: true,
          minutosCupo: 5,
        },
      ],
    });
    assert.equal(diskSessionRicherThanMemory(memory, disk), true);
    assert.equal(diskSessionRicherThanMemory(disk, memory), false);
  });

  it("rehydrate actualiza shell en memoria con ring de disco", () => {
    const memory = [v({ id: "r1", titulo: "Ring shell" })];
    const local = [
      v({
        id: "r1",
        titulo: "Ring shell",
        situacionCronometro: {
          activo: true,
          bloqueInicioAt: 50,
          horaFinMs: 50 + 20 * 60_000,
          horaFinContratoMs: 50 + 20 * 60_000,
        },
        situacionCupoAnchor: { subTareaId: "st1", startedAt: 50 },
        subTareas: [
          {
            id: "st1",
            texto: "A",
            completada: false,
            creadaAt: 50,
            enDesgloseCronometro: true,
            minutosCupo: 10,
          },
          {
            id: "st2",
            texto: "B",
            completada: false,
            creadaAt: 50,
            enDesgloseCronometro: true,
            minutosCupo: 10,
          },
        ],
      }),
    ];
    const result = rehydrateFlotaFromDiskSources({
      memory,
      local,
      parked: [],
      nowMs: 60,
      dayStartMs: 0,
      wasRecentlyClosed: () => false,
    });
    assert.equal(result.changed, true);
    assert.deepEqual(result.upgradedIds, ["r1"]);
    assert.equal(result.next[0]!.situacionCronometro?.activo, true);
    assert.equal(result.next[0]!.subTareas?.length, 2);
  });

  it("rehydrate reincorpora activo ausente en memoria desde parked", () => {
    const now = Date.now();
    const parked = [
      v({
        id: "r2",
        aperturaAt: now - 60_000,
        createdAt: new Date(now - 60_000),
        situacionCronometro: { activo: true, bloqueInicioAt: now - 60_000 },
        subTareas: [
          {
            id: "f",
            texto: "Fila",
            completada: false,
            creadaAt: now - 60_000,
            enDesgloseCronometro: true,
          },
        ],
      }),
    ];
    const result = rehydrateFlotaFromDiskSources({
      memory: [],
      local: [],
      parked,
      nowMs: now,
      dayStartMs: now - 8 * 3600_000,
      wasRecentlyClosed: () => false,
    });
    assert.equal(result.changed, true);
    assert.deepEqual(result.addedIds, ["r2"]);
    assert.equal(result.next.length, 1);
  });

  it("no toca memoria si disco no es más rico", () => {
    const rich = v({
      id: "r1",
      situacionCronometro: { activo: true, bloqueInicioAt: 1 },
      subTareas: [
        {
          id: "a",
          texto: "x",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
        },
      ],
    });
    const result = rehydrateFlotaFromDiskSources({
      memory: [rich],
      local: [rich],
      parked: [],
      nowMs: Date.now(),
      dayStartMs: 0,
    });
    assert.equal(result.changed, false);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import {
  diskSessionRicherThanMemory,
  mergeParkedActivesForResume,
  pickRicherActiveVehicle,
  rehydrateFlotaFromDiskSources,
  upgradeActiveSessionsFromSources,
} from "./flotaResume.ts";
import {
  resetVehicleSessionSealsForTests,
  sealVehicleSessionClose,
} from "./vehicleSessionSeal.ts";

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
  beforeEach(() => {
    resetVehicleSessionSealsForTests();
  });
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

  it("detecta shell conquista vs desglosador con unidades", () => {
    const memory = v({
      id: "c1",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
    });
    const disk = v({
      id: "c1",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      subVehiculos: [
        {
          id: "u1",
          titulo: "Unidad 1",
          status: "activo",
          aperturaAt: 100,
        },
        {
          id: "u2",
          titulo: "Unidad 2",
          status: "pendiente",
        },
      ] as Vehicle["subVehiculos"],
    });
    assert.equal(diskSessionRicherThanMemory(memory, disk), true);
  });

  it("upgradeActiveSessionsFromSources no deja shell lean pisar ring", () => {
    const lean = [v({ id: "r1", titulo: "Ring shell" })];
    const rich = [
      v({
        id: "r1",
        titulo: "Ring shell",
        situacionCronometro: {
          activo: true,
          bloqueInicioAt: 50,
          horaFinMs: 50 + 20 * 60_000,
        },
        subTareas: [
          {
            id: "st1",
            texto: "A",
            completada: false,
            creadaAt: 50,
            enDesgloseCronometro: true,
            minutosCupo: 10,
          },
        ],
      }),
    ];
    const upgraded = upgradeActiveSessionsFromSources(lean, rich);
    assert.equal(upgraded[0]!.situacionCronometro?.activo, true);
    assert.equal(upgraded[0]!.subTareas?.length, 1);
  });

  it("pickRicherActiveVehicle prefiere memoria con progreso conquista", () => {
    const lean = v({
      id: "c1",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      subVehiculos: [
        { id: "u1", titulo: "A", status: "pendiente" },
        { id: "u2", titulo: "B", status: "pendiente" },
      ] as Vehicle["subVehiculos"],
    });
    const progress = v({
      id: "c1",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      subVehiculos: [
        { id: "u1", titulo: "A", status: "cumplido", cierreAt: 200 },
        { id: "u2", titulo: "B", status: "activo", aperturaAt: 200 },
      ] as Vehicle["subVehiculos"],
    });
    const picked = pickRicherActiveVehicle(lean, progress);
    assert.equal(picked.subVehiculos?.[0]?.status, "cumplido");
    assert.equal(picked.subVehiculos?.[1]?.status, "activo");
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

  it("rehydrate recupera conquista desde parked cuando local es shell", () => {
    const now = Date.now();
    const memory = [
      v({
        id: "c1",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        titulo: "Conquista shell",
      }),
    ];
    const parked = [
      v({
        id: "c1",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        titulo: "Conquista",
        aperturaAt: now - 30_000,
        createdAt: new Date(now - 30_000),
        subVehiculos: [
          {
            id: "u1",
            titulo: "U1",
            status: "activo",
            aperturaAt: now - 30_000,
          },
          { id: "u2", titulo: "U2", status: "pendiente" },
        ] as Vehicle["subVehiculos"],
      }),
    ];
    const result = rehydrateFlotaFromDiskSources({
      memory,
      local: memory,
      parked,
      nowMs: now,
      dayStartMs: now - 8 * 3600_000,
      wasRecentlyClosed: () => false,
    });
    assert.equal(result.changed, true);
    assert.equal(result.next[0]!.subVehiculos?.length, 2);
    assert.equal(result.next[0]!.subVehiculos?.[0]?.status, "activo");
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

  it("park no conserva el vehículo cerrado si el hermano sigue activo", () => {
    const now = Date.now();
    const familia = v({
      id: "familia",
      clientRequestId: "crq_fam",
      aperturaAt: now - 60_000,
      situacionCronometro: { activo: true, bloqueInicioAt: now - 60_000 },
    });
    const otro = v({ id: "otro", aperturaAt: now - 30_000 });
    const prevParked = [familia, otro];
    const incoming = [
      v({
        id: "familia",
        clientRequestId: "crq_fam",
        status: "cumplido",
        cierreAt: now,
        aperturaAt: now - 60_000,
      }),
      otro,
    ];
    const parked = mergeParkedActivesForResume(incoming, prevParked, () => false);
    assert.equal(parked.some(p => p.id === "familia"), false);
    assert.equal(parked.some(p => p.id === "otro"), true);
  });

  it("rehydrate no resucita parked sellado ni cubre huecos posteriores", () => {
    const now = Date.now();
    const cierreAt = now - 10 * 60_000;
    sealVehicleSessionClose("familia", {
      cierreAt,
      status: "cumplido",
      clientRequestId: "crq_fam",
    });
    const parked = [
      v({
        id: "familia",
        clientRequestId: "crq_fam",
        aperturaAt: now - 40 * 60_000,
        createdAt: new Date(now - 40 * 60_000),
        situacionCronometro: { activo: true, bloqueInicioAt: now - 40 * 60_000 },
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
    assert.equal(result.addedIds.includes("familia"), false);
    assert.equal(result.next.filter(x => x.status === "activo").length, 0);
  });
});

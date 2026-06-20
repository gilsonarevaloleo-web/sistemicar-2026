import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubTarea, Vehicle } from "./persistence.ts";
import type { SubVehiculo } from "./persistence.ts";
import {
  archiveOrphanDesglosadorInterrupts,
  clearStuckDesglosadorPause,
  isOrphanDesglosadorInterrupt,
  mergeActiveVehicleSessionState,
  mergeSubTareasById,
  mergeSubVehiculosById,
  pickMergedAperturaAt,
  preferLocalSubTareasInVehicleList,
  shouldPreferLocalSubTareas,
  shouldPreferLocalSubVehiculos,
} from "./situacionSessionMerge.ts";

function st(
  id: string,
  extra: Partial<SubTarea> = {}
): SubTarea {
  return { id, texto: id, completada: false, creadaAt: 1, ...extra };
}

describe("archiveOrphanDesglosadorInterrupts", () => {
  it("archiva interrupciones huérfanas (job diferido, no hot path de snapshot)", () => {
    const parent: Vehicle = {
      id: "p1",
      titulo: "Desglose",
      status: "activo",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      interrupcionActiva: false,
    } as Vehicle;
    const orphan: Vehicle = {
      id: "i1",
      titulo: "Interrupción",
      status: "activo",
      tipoFlota: "situacion",
      vehiculoPadreDesglosadorId: "missing-parent",
      excluirDeHistorial: true,
    } as Vehicle;
    const next = archiveOrphanDesglosadorInterrupts([parent, orphan], Date.now());
    assert.equal(next.find(v => v.id === "i1")?.status, "archivado");
  });
});

describe("isOrphanDesglosadorInterrupt", () => {
  const parent = (status: Vehicle["status"], interrupcionActiva = false): Vehicle =>
    ({
      id: "p1",
      titulo: "Desglose",
      status,
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      interrupcionActiva,
      criterioFin: "tiempo",
      criterioDetalle: "",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    }) as Vehicle;

  const interrupt = (): Vehicle =>
    ({
      id: "i1",
      titulo: "Llamada",
      status: "activo",
      tipoFlota: "situacion",
      vehiculoPadreDesglosadorId: "p1",
      criterioFin: "circunstancia",
      criterioDetalle: "Interrupción",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
      aperturaAt: Date.now(),
    }) as Vehicle;

  it("huérfana cuando el desglosador padre ya está cumplido", () => {
    const byId = new Map([
      ["p1", parent("cumplido")],
      ["i1", interrupt()],
    ]);
    assert.equal(isOrphanDesglosadorInterrupt(interrupt(), byId), true);
  });

  it("huérfana cuando el padre activo ya no está en pausa de interrupción", () => {
    const byId = new Map([
      ["p1", parent("activo", false)],
      ["i1", interrupt()],
    ]);
    assert.equal(isOrphanDesglosadorInterrupt(interrupt(), byId), true);
  });

  it("no huérfana mientras el padre espera la interrupción", () => {
    const byId = new Map([
      ["p1", parent("activo", true)],
      ["i1", interrupt()],
    ]);
    assert.equal(isOrphanDesglosadorInterrupt(interrupt(), byId), false);
  });
});

describe("archiveOrphanDesglosadorInterrupts", () => {
  it("archiva huérfanas en lugar de quitarlas del listado", () => {
    const parent = {
      id: "p1",
      titulo: "Desglose",
      status: "activo",
      tipoReloj: "desglosador",
      interrupcionActiva: false,
      criterioFin: "tiempo",
      criterioDetalle: "",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    } as Vehicle;
    const interrupt = {
      id: "i1",
      titulo: "Llamada",
      status: "activo",
      vehiculoPadreDesglosadorId: "p1",
      aperturaAt: Date.now() - 120_000,
      criterioFin: "circunstancia",
      criterioDetalle: "Interrupción",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    } as Vehicle;
    const out = archiveOrphanDesglosadorInterrupts([parent, interrupt], 9_999_999_999);
    assert.equal(out.length, 2);
    assert.equal(out.find(v => v.id === "i1")?.status, "archivado");
    assert.ok(out.find(v => v.id === "i1")?.cierreAt);
  });
});

describe("clearStuckDesglosadorPause", () => {
  it("conserva pausa válida tras cerrar interrupción (reanudación manual)", () => {
    const parent = {
      id: "p1",
      titulo: "Desglose",
      status: "activo",
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      desglosadorPausa: { pausadoAt: 1, subActivoId: "s1", elapsedSecSnapshot: 10 },
      criterioFin: "tiempo",
      criterioDetalle: "",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    } as Vehicle;
    const out = clearStuckDesglosadorPause([parent], () => false);
    assert.equal(out[0].interrupcionActiva, true);
    assert.equal(out[0].desglosadorPausa?.subActivoId, "s1");
  });

  it("libera pausa corrupta sin snapshot ni interrupción visible", () => {
    const parent = {
      id: "p1",
      titulo: "Desglose",
      status: "activo",
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      criterioFin: "tiempo",
      criterioDetalle: "",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    } as Vehicle;
    const out = clearStuckDesglosadorPause([parent], () => false);
    assert.equal(out[0].interrupcionActiva, false);
    assert.equal(out[0].desglosadorPausa, undefined);
  });
});

describe("mergeSubTareasById", () => {
  it("keeps local detalles when firebase row lacks them", () => {
    const fb = [st("a", { enDesgloseCronometro: true, minutosCupo: 10 })];
    const local = [
      st("a", {
        enDesgloseCronometro: true,
        minutosCupo: 10,
        detalles: [{ id: "d1", texto: "paso 1", entregado: false, creadaAt: 1 }],
      }),
    ];
    const merged = mergeSubTareasById(fb, local);
    assert.equal(merged[0].detalles?.length, 1);
    assert.equal(merged[0].detalles![0].texto, "paso 1");
  });

  it("preserves firebase order and merges ids from both sides", () => {
    const fb = [st("a"), st("b")];
    const local = [st("a", { detalles: [{ id: "d1", texto: "x", entregado: false, creadaAt: 1 }] }), st("c")];
    const merged = mergeSubTareasById(fb, local);
    assert.deepEqual(merged.map(s => s.id), ["a", "b", "c"]);
    assert.equal(merged[0].detalles?.length, 1);
  });
});

describe("mergeActiveVehicleSessionState situacion", () => {
  const baseVehicle = (): Vehicle =>
    ({
      id: "v1",
      titulo: "Test",
      status: "activo",
      tipoFlota: "situacion",
      criterioFin: "tiempo",
      criterioDetalle: "x",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    }) as Vehicle;

  it("merges detalles when both sides have active cron desglose", () => {
    const fb: Vehicle = {
      ...baseVehicle(),
      subTareas: [st("c1", { enDesgloseCronometro: true, resultadoSituacion: "pendiente", minutosCupo: 10 })],
      situacionCronometro: { activo: true, bloqueInicioAt: 1000, horaFinMs: 2000, depthBlockPsGranted: 0 },
    };
    const local: Vehicle = {
      ...baseVehicle(),
      subTareas: [
        st("c1", {
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 10,
          detalles: [{ id: "d1", texto: "detalle", entregado: false, creadaAt: 1 }],
        }),
      ],
      situacionCronometro: { activo: true, bloqueInicioAt: 1000, horaFinMs: 2000, depthBlockPsGranted: 0 },
      situacionCupoAnchor: { subTareaId: "c1", startedAt: 5000 },
    };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.subTareas?.[0].detalles?.length, 1);
    assert.equal(merged.situacionCupoAnchor?.subTareaId, "c1");
    assert.equal(merged.situacionCronometro?.activo, true);
  });

  it("clears desglosador pause when local resumed but firebase still paused", () => {
    const fb: Vehicle = {
      ...(baseVehicle() as Vehicle),
      id: "d1",
      tipoReloj: "desglosador",
      interrupcionActiva: true,
      desglosadorPausa: {
        pausadoAt: 1000,
        subActivoId: "sub1",
        elapsedSecSnapshot: 120,
      },
    };
    const local: Vehicle = {
      ...fb,
      interrupcionActiva: false,
      desglosadorPausa: undefined,
    };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.interrupcionActiva, false);
    assert.equal(merged.desglosadorPausa, undefined);
  });

  it("mergeSubVehiculosById keeps local active sub when firebase still has first pending", () => {
    const fb: SubVehiculo[] = [
      { id: "s0", titulo: "A", status: "cumplido", cierreAt: 1000 },
      { id: "s1", titulo: "B", status: "pendiente" },
    ];
    const local: SubVehiculo[] = [
      { id: "s0", titulo: "A", status: "cumplido", cierreAt: 1000 },
      { id: "s1", titulo: "B", status: "activo", aperturaAt: 2000 },
    ];
    const merged = mergeSubVehiculosById(fb, local);
    assert.equal(merged[1].status, "activo");
    assert.equal(merged[1].aperturaAt, 2000);
  });

  it("shouldPreferLocalSubVehiculos when active sub differs from firebase", () => {
    const fb = {
      id: "d1",
      tipoReloj: "desglosador",
      status: "activo",
      subVehiculos: [
        { id: "s0", titulo: "A", status: "cumplido" },
        { id: "s1", titulo: "B", status: "pendiente" },
      ],
    } as Vehicle;
    const local = {
      ...fb,
      subVehiculos: [
        { id: "s0", titulo: "A", status: "cumplido" },
        { id: "s1", titulo: "B", status: "activo", aperturaAt: 99 },
      ],
    } as Vehicle;
    assert.equal(shouldPreferLocalSubVehiculos(fb, local), true);
  });

  it("shouldPreferLocalSubVehiculos when firebase lost subs array", () => {
    const subs = (n: number): SubVehiculo[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `s${i}`,
        titulo: `Sub ${i}`,
        status: "cumplido" as const,
        cierreAt: Date.now(),
      }));
    const fb = { id: "d1", tipoReloj: "desglosador", status: "cumplido", subVehiculos: [] } as Vehicle;
    const local = { ...fb, subVehiculos: subs(8) } as Vehicle;
    assert.equal(shouldPreferLocalSubVehiculos(fb, local), true);
  });

  it("preserves local subs on closed desglosador when firebase has none", () => {
    const now = Date.now();
    const localSubs: SubVehiculo[] = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      titulo: `Bloque ${i}`,
      status: "cumplido",
      cierreAt: now,
      rutaDeclarada: ["fluido"],
    }));
    const fb: Vehicle = {
      id: "d1",
      titulo: "Costura",
      status: "cumplido",
      tipoReloj: "desglosador",
      cierreAt: now,
      criterioFin: "cantidad",
      criterioDetalle: "",
      ejes: {},
      tiempoInicio: new Date(),
      createdAt: new Date(),
    } as Vehicle;
    const local: Vehicle = { ...fb, subVehiculos: localSubs };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.subVehiculos?.length, 6);
    assert.equal(merged.subVehiculos?.filter(s => s.status === "cumplido").length, 6);
  });

  it("merges free-list subtasks when firebase snapshot lacks them", () => {
    const fb: Vehicle = {
      ...baseVehicle(),
      subTareas: undefined,
    };
    const local: Vehicle = {
      ...baseVehicle(),
      subTareas: [
        st("a", { texto: "Comprar leche" }),
        st("b", { texto: "Llamar al banco", completada: true }),
      ],
    };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.subTareas?.length, 2);
    assert.equal(merged.subTareas![0].texto, "Comprar leche");
    assert.equal(merged.subTareas![1].completada, true);
  });

  it("shouldPreferLocalSubTareas when firebase lost cron rows", () => {
    const fb: Vehicle = {
      ...baseVehicle(),
      subTareas: [st("c1", { enDesgloseCronometro: true, minutosCupo: 10 })],
    };
    const local: Vehicle = {
      ...baseVehicle(),
      subTareas: [
        st("c1", { enDesgloseCronometro: true, minutosCupo: 10 }),
        st("c2", { enDesgloseCronometro: true, minutosCupo: 8 }),
        st("c3", { enDesgloseCronometro: true, minutosCupo: 6 }),
      ],
    };
    assert.equal(shouldPreferLocalSubTareas(fb, local), true);
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.subTareas?.length, 3);
  });

  it("prefers local cron closed over stale firebase active cron", () => {
    const fb: Vehicle = {
      ...baseVehicle(),
      subTareas: [st("c1", { enDesgloseCronometro: true, resultadoSituacion: "cumplido", minutosCupo: 10 })],
      situacionCronometro: { activo: true, bloqueInicioAt: 1000, horaFinMs: 5000, depthBlockPsGranted: 0 },
    };
    const local: Vehicle = {
      ...baseVehicle(),
      subTareas: [st("c1", { enDesgloseCronometro: true, resultadoSituacion: "cumplido", minutosCupo: 10 })],
      situacionCronometro: {
        activo: false,
        bloqueInicioAt: 1000,
        horaFinMs: 5000,
        depthBlockPsGranted: 2,
        retosCompletados: 1,
        bolsaSegundoRetoMin: 12,
      },
    };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.situacionCronometro?.activo, false);
    assert.equal(merged.situacionCronometro?.retosCompletados, 1);
  });

  it("prefers local ring pausado (mismo bloque) aunque firebase siga activo", () => {
    const fb: Vehicle = {
      ...baseVehicle(),
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: 5000,
        horaFinMs: 8000,
        depthBlockPsGranted: 0,
        retosCompletados: 0,
      },
    };
    const local: Vehicle = {
      ...baseVehicle(),
      situacionCronometro: {
        activo: false,
        bloqueInicioAt: 5000,
        horaFinMs: 8000,
        depthBlockPsGranted: 0,
        retosCompletados: 0,
      },
    };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.situacionCronometro?.activo, false);
  });

  it("preserves local subTareas on closed situacion vehicle", () => {
    const now = Date.now();
    const localSubs = [
      st("a", { completada: true, cerradaAt: now }),
      st("b", { enDesgloseCronometro: true, resultadoSituacion: "cumplido", cerradaAt: now }),
    ];
    const fb: Vehicle = {
      ...baseVehicle(),
      status: "cumplido",
      cierreAt: now,
      subTareas: [localSubs[0]],
    };
    const local: Vehicle = {
      ...baseVehicle(),
      status: "cumplido",
      cierreAt: now,
      subTareas: localSubs,
    };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.subTareas?.length, 2);
  });

  it("prefiere aperturaAt local más reciente sobre Firebase retroactivo", () => {
    const early = 1_000_000;
    const late = 1_003_600_000;
    const fb: Vehicle = { ...baseVehicle(), aperturaAt: early };
    const local: Vehicle = { ...baseVehicle(), aperturaAt: late };
    const merged = mergeActiveVehicleSessionState(fb, local);
    assert.equal(merged.aperturaAt, late);
  });
});

describe("pickMergedAperturaAt", () => {
  it("toma el máximo cuando ambos existen", () => {
    assert.equal(pickMergedAperturaAt({ aperturaAt: 100 } as Vehicle, { aperturaAt: 200 } as Vehicle), 200);
    assert.equal(pickMergedAperturaAt({ aperturaAt: 300 } as Vehicle, { aperturaAt: 200 } as Vehicle), 300);
  });

  it("usa el disponible si falta uno", () => {
    assert.equal(pickMergedAperturaAt({} as Vehicle, { aperturaAt: 200 } as Vehicle), 200);
    assert.equal(pickMergedAperturaAt({ aperturaAt: 100 } as Vehicle, {} as Vehicle), 100);
  });
});

describe("preferLocalSubTareasInVehicleList", () => {
  it("fusiona subtareas locales cuando Firebase va atrás", () => {
    const local: Vehicle = {
      id: "v1",
      tipoFlota: "situacion",
      status: "activo",
      subTareas: [st("a"), st("b")],
    } as Vehicle;
    const merged: Vehicle[] = [
      {
        id: "v1",
        tipoFlota: "situacion",
        status: "activo",
        subTareas: [st("a")],
      } as Vehicle,
    ];
    const out = preferLocalSubTareasInVehicleList(merged, [local]);
    assert.equal(out[0]?.subTareas?.length, 2);
    assert.ok(out[0]?.subTareas?.some(s => s.id === "b"));
  });
});

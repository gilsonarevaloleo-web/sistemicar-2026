import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo, Vehicle } from "./persistence.ts";
import {
  applyDesglosadorClockOps,
  computeActiveSubClocks,
  computeDesglosadorClocks,
  computeSubCloseVerdict,
  desglosadorPauseAccumSec,
  desglosadorSubClockKey,
  desglosadorSubTimerUiFromClocks,
  isDesglosadorClockPaused,
  resolveConquistaTopeMs,
  suggestedSec,
  sumDesglosadorUnitCycle,
  validateSubCloseCantidad,
} from "./desglosadorClock.ts";

function sub(partial: Partial<SubVehiculo> & Pick<SubVehiculo, "id">): SubVehiculo {
  return {
    titulo: "Test",
    status: "cumplido",
    ...partial,
  };
}

describe("computeSubCloseVerdict", () => {
  it("gain when faster than suggested", () => {
    const s = sub({
      id: "1",
      tiempoSugeridoSeg: 600,
      duracionFinal: 300,
    });
    const v = computeSubCloseVerdict(s);
    assert.equal(v.verdict, "gain");
    assert.equal(v.deltaSec, -300);
  });

  it("loss when slower than suggested", () => {
    const s = sub({
      id: "1",
      tiempoSugeridoSeg: 600,
      duracionFinal: 900,
    });
    const v = computeSubCloseVerdict(s);
    assert.equal(v.verdict, "loss");
    assert.equal(v.deltaSec, 300);
  });

  it("neutral within 5s threshold", () => {
    const s = sub({
      id: "1",
      tiempoSugeridoSeg: 600,
      duracionFinal: 603,
    });
    assert.equal(computeSubCloseVerdict(s).verdict, "neutral");
  });

  it("noRef without reference", () => {
    const s = sub({ id: "1", duracionFinal: 100 });
    assert.equal(computeSubCloseVerdict(s).verdict, "noRef");
  });

  it("suggestedSec from cantidad and record", () => {
    const s = sub({
      id: "1",
      cantidadObjetivo: 2,
      tiempoRecordMinPerUnit: 5,
    });
    assert.equal(suggestedSec(s), 600);
  });
});

describe("validateSubCloseCantidad", () => {
  const withObj = sub({ id: "o", cantidadObjetivo: 3 });

  it("permite cierre sin cantidad si no hay objetivo", () => {
    const r = validateSubCloseCantidad(sub({ id: "n" }), "", "cumplido");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cantidad, 0);
  });

  it("bloquea cierre con objetivo y récord si cantidad vacía", () => {
    const conRecord = sub({ id: "o", cantidadObjetivo: 3, tiempoRecordMinPerUnit: 2 });
    const r = validateSubCloseCantidad(conRecord, "", "fallado");
    assert.equal(r.ok, false);
  });

  it("primer ciclo sin récord: cumplido infiere objetivo y fallado infiere 0", () => {
    const sinRecord = sub({ id: "sr", cantidadObjetivo: 4 });
    const cumplido = validateSubCloseCantidad(sinRecord, "", "cumplido");
    assert.equal(cumplido.ok, true);
    if (cumplido.ok) assert.equal(cumplido.cantidad, 4);
    const fallado = validateSubCloseCantidad(sinRecord, "", "fallado");
    assert.equal(fallado.ok, true);
    if (fallado.ok) assert.equal(fallado.cantidad, 0);
  });

  it("con récord sigue exigiendo cantidad explícita", () => {
    const conRecord = sub({ id: "cr", cantidadObjetivo: 4, tiempoRecordMinPerUnit: 2 });
    assert.equal(validateSubCloseCantidad(conRecord, "", "cumplido").ok, false);
    assert.equal(validateSubCloseCantidad(conRecord, "", "fallado").ok, false);
  });

  it("permite fallado con cantidad 0 explícita", () => {
    const r = validateSubCloseCantidad(withObj, "0", "fallado");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cantidad, 0);
  });

  it("bloquea cumplido con cantidad 0", () => {
    const r = validateSubCloseCantidad(withObj, "0", "cumplido");
    assert.equal(r.ok, false);
  });

  it("acepta cumplido con cantidad positiva", () => {
    const r = validateSubCloseCantidad(withObj, "2", "cumplido");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.cantidad, 2);
  });
});

describe("desglosadorSubTimerUiFromClocks", () => {
  it("sub sin medición en t=0 muestra elapsed y avanza tras tick simulado", () => {
    const sub: SubVehiculo = {
      id: "u1",
      titulo: "Libre",
      status: "activo",
      aperturaAt: 1_000_000,
    };
    const clocks0 = computeDesglosadorClocks(1_000_000, {
      subVehiculos: [sub],
    } as Vehicle);
    const ui0 = desglosadorSubTimerUiFromClocks(clocks0, suggestedSec(sub));
    assert.equal(ui0.display, "00:00:00");
    assert.equal(ui0.isCountdown, false);

    const clocks1 = computeDesglosadorClocks(1_002_500, {
      subVehiculos: [sub],
    } as Vehicle);
    const ui1 = desglosadorSubTimerUiFromClocks(clocks1, suggestedSec(sub));
    assert.equal(ui1.display, "00:00:02");
  });

  it("sub medido en countdown muestra tiempo restante", () => {
    const sub: SubVehiculo = {
      id: "m1",
      titulo: "Medido",
      status: "activo",
      aperturaAt: 1_000_000,
      cantidadObjetivo: 2,
      tiempoRecordMinPerUnit: 5,
    };
    const obj = suggestedSec(sub);
    assert.equal(obj, 600);
    const clocks = computeDesglosadorClocks(1_000_000, { subVehiculos: [sub] } as Vehicle);
    const ui = desglosadorSubTimerUiFromClocks(clocks, obj);
    assert.equal(ui.isCountdown, true);
    assert.equal(ui.expired, false);
    assert.equal(ui.display, "10:00");
  });

  it("countdown vencido muestra overtime no 00:00 congelado", () => {
    const sub: SubVehiculo = {
      id: "m2",
      titulo: "Medido",
      status: "activo",
      aperturaAt: 1_000_000,
      cantidadObjetivo: 1,
      tiempoRecordMinPerUnit: 1,
    };
    const obj = suggestedSec(sub)!;
    const clocks = computeDesglosadorClocks(1_000_000 + (obj + 30) * 1000, {
      subVehiculos: [sub],
    } as Vehicle);
    const ui = desglosadorSubTimerUiFromClocks(clocks, obj);
    assert.equal(ui.expired, true);
    assert.equal(ui.display, "00:30");
  });
});

describe("desglosadorSubClockKey", () => {
  it("cambia al transicionar sub con nuevo aperturaAt", () => {
    const sub1: SubVehiculo = { id: "s1", titulo: "A", status: "activo", aperturaAt: 100 };
    const sub2: SubVehiculo = { id: "s2", titulo: "B", status: "activo", aperturaAt: 200 };
    assert.notEqual(desglosadorSubClockKey(sub1), desglosadorSubClockKey(sub2));
    assert.equal(desglosadorSubClockKey(sub1), "s1:100");
  });
});

describe("computeActiveSubClocks", () => {
  it("reinicia elapsed al pasar sub explícito con aperturaAt nuevo", () => {
    const now = 2_000_000;
    const nextSub: SubVehiculo = {
      id: "s2",
      titulo: "B",
      status: "activo",
      aperturaAt: now,
    };
    const v = {
      subVehiculos: [
        { id: "s1", titulo: "A", status: "cumplido" },
        nextSub,
      ],
    } as Vehicle;
    const clocks = computeActiveSubClocks(now + 3000, v, nextSub);
    assert.equal(clocks.subElapsedSec, 3);
  });
});

describe("computeDesglosadorClocks nested_paused", () => {
  it("sub nested_paused visible durante interrupcion con elapsed congelado", () => {
    const sub: SubVehiculo = {
      id: "s1",
      titulo: "A",
      status: "nested_paused",
      aperturaAt: 1_000_000,
      tiempoSugeridoSeg: 60,
    };
    const v = {
      interrupcionActiva: true,
      desglosadorPausa: {
        subActivoId: "s1",
        elapsedSecSnapshot: 120,
        pausadoAt: 1_002_000,
      },
      subVehiculos: [sub],
    } as Vehicle;
    const clocks = computeDesglosadorClocks(1_010_000, v);
    assert.equal(clocks.subElapsedSec, 120);
    const later = computeDesglosadorClocks(1_040_000, v);
    assert.equal(later.subElapsedSec, 120);
    assert.equal(later.liveAccumDeltaSec, clocks.liveAccumDeltaSec);
  });

  it("interrupcionActiva huérfana no congela el reloj", () => {
    const orphan = {
      interrupcionActiva: true,
      subVehiculos: [
        { id: "s1", titulo: "A", status: "activo", aperturaAt: 1_000_000 },
      ],
    } as Vehicle;
    assert.equal(isDesglosadorClockPaused(orphan), false);
    const clocks = computeDesglosadorClocks(1_010_000, orphan);
    assert.equal(clocks.subElapsedSec, 10);

    const realPause = {
      interrupcionActiva: true,
      desglosadorPausa: {
        subActivoId: "s1",
        elapsedSecSnapshot: 4,
        pausadoAt: 1_004_000,
      },
      subVehiculos: [
        { id: "s1", titulo: "A", status: "nested_paused", aperturaAt: 1_000_000 },
      ],
    } as Vehicle;
    assert.equal(isDesglosadorClockPaused(realPause), true);
  });
});

describe("computeDesglosadorClocks mixed subs", () => {
  it("transición sub medido a sub sin medición conserva aperturaAt", () => {
    const now = 2_000_000;
    const subs: SubVehiculo[] = [
      { id: "s1", titulo: "A", status: "cumplido", cierreAt: now - 1000 },
      {
        id: "s2",
        titulo: "B",
        status: "activo",
        aperturaAt: now,
      },
      { id: "s3", titulo: "C", status: "pendiente" },
    ];
    const clocks = computeDesglosadorClocks(now + 2000, { subVehiculos: subs } as Vehicle);
    assert.equal(clocks.subElapsedSec, 2);
    const active = subs.find(s => s.status === "activo")!;
    const ui = desglosadorSubTimerUiFromClocks(clocks, suggestedSec(active));
    assert.equal(ui.display, "00:00:02");
    assert.equal(ui.isCountdown, false);
  });
});

describe("sumDesglosadorUnitCycle", () => {
  it("suma seg/unidad medidos de cada sub (= 1 producto)", () => {
    const subs: SubVehiculo[] = [
      sub({ id: "pegar", titulo: "Pegar", duracionFinal: 300, cantidadLograda: 10 }), // 30s/u
      sub({ id: "cortar", titulo: "Cortar", duracionFinal: 200, cantidadLograda: 10 }), // 20s/u
      sub({ id: "marco", titulo: "Marco", duracionFinal: 400, cantidadLograda: 10 }), // 40s/u
      sub({ id: "bandas", titulo: "Bandas", duracionFinal: 100, cantidadLograda: 10 }), // 10s/u
    ];
    const cycle = sumDesglosadorUnitCycle(subs);
    assert.equal(cycle.totalSec, 100);
    assert.equal(cycle.stepsCounted, 4);
    assert.equal(cycle.hasMeasured, true);
    assert.equal(cycle.allRef, false);
  });

  it("usa récord cuando aún no hay medido", () => {
    const subs: SubVehiculo[] = [
      sub({ id: "a", status: "pendiente", tiempoRecordMinPerUnit: 0.5 }), // 30s
      sub({ id: "b", status: "pendiente", tiempoRecordMinPerUnit: 1 }), // 60s
    ];
    const cycle = sumDesglosadorUnitCycle(subs);
    assert.equal(cycle.totalSec, 90);
    assert.equal(cycle.allRef, true);
  });
});

describe("resolveConquistaTopeMs / holgura al siguiente sub", () => {
  it("tope implícito = apertura + Σ sugeridos", () => {
    const start = 1_700_000_000_000;
    const subs: SubVehiculo[] = [
      sub({ id: "a", tiempoSugeridoSeg: 600, status: "cumplido", duracionFinal: 300 }),
      sub({ id: "b", tiempoSugeridoSeg: 600, status: "activo", aperturaAt: start + 300_000 }),
      sub({ id: "c", tiempoSugeridoSeg: 600, status: "pendiente" }),
    ];
    const tope = resolveConquistaTopeMs({ aperturaAt: start, criterioDetalle: "" }, subs, start + 300_000);
    assert.equal(tope, start + 1800_000);
  });

  it("tras cerrar con ganancia, el siguiente sub absorbe holgura hasta el tope", () => {
    const start = 1_700_000_000_000;
    const now = start + 300_000; // A cerró 5 min antes de su cupo de 10
    const subs: SubVehiculo[] = [
      sub({
        id: "a",
        tiempoSugeridoSeg: 600,
        status: "cumplido",
        duracionFinal: 300,
        cierreAt: now,
      }),
      sub({ id: "b", tiempoSugeridoSeg: 600, status: "activo", aperturaAt: now }),
      sub({ id: "c", tiempoSugeridoSeg: 600, status: "pendiente" }),
    ];
    const clocks = computeDesglosadorClocks(now, {
      aperturaAt: start,
      criterioDetalle: "",
      subVehiculos: subs,
    } as Vehicle);
    // Tope original 30 min; quedan 25. C sigue con 10 → B recibe 15, no 10 fijados.
    assert.equal(clocks.subRemainingSec, 900);
    assert.equal(clocks.cycleRemainSec, 1500);
  });
});

describe("applyDesglosadorClockOps — motor suma/resta/pausa", () => {
  it("resta ganancia del tope, no del trabajo restante", () => {
    const start = 1_000_000;
    const ops = applyDesglosadorClockOps({
      remainActiveSec: 3500,
      pendingSec: 0,
      completedDeltaSec: -6000,
      liveOvertimeSec: 0,
      pauseAccumSec: 0,
      baseTopeMs: start + 10_800_000,
      nowMs: start + 1_300_000,
      hasActiveSuggested: true,
    });
    assert.equal(ops.remainWorkSec, 3500);
    assert.equal(ops.liveAccumDeltaSec, -6000);
    assert.equal(ops.topeRemainSec, 9500);
    assert.equal(ops.slackSec, 6000);
    assert.equal(ops.cycleRemainSec, 9500);
  });

  it("suma pérdida y overtime a la ganancia visible, no al trabajo restante", () => {
    const ops = applyDesglosadorClockOps({
      remainActiveSec: 120,
      pendingSec: 600,
      completedDeltaSec: 300,
      liveOvertimeSec: 40,
      pauseAccumSec: 0,
      baseTopeMs: null,
      nowMs: 1,
      hasActiveSuggested: true,
    });
    assert.equal(ops.remainWorkSec, 720);
    assert.equal(ops.liveAccumDeltaSec, 340);
    assert.equal(ops.cycleRemainSec, 720);
  });

  it("suma pausa al tope y congela el restante vs tope", () => {
    const baseTope = 1_000_000 + 3600_000;
    const now0 = 1_000_000 + 1800_000;
    const withoutPause = applyDesglosadorClockOps({
      remainActiveSec: 600,
      pendingSec: 600,
      completedDeltaSec: 0,
      liveOvertimeSec: 0,
      pauseAccumSec: 0,
      baseTopeMs: baseTope,
      nowMs: now0,
      hasActiveSuggested: true,
    });
    const withPause = applyDesglosadorClockOps({
      remainActiveSec: 600,
      pendingSec: 600,
      completedDeltaSec: 0,
      liveOvertimeSec: 0,
      pauseAccumSec: 900,
      baseTopeMs: baseTope,
      nowMs: now0 + 900_000,
      hasActiveSuggested: true,
    });
    assert.equal(withPause.effectiveTopeMs, baseTope + 900_000);
    assert.equal(withPause.topeRemainSec, withoutPause.topeRemainSec);
    assert.equal(withPause.cycleRemainSec, withoutPause.cycleRemainSec);
  });
});

describe("reloj global — operaciones finales de todo el día", () => {
  it("no cuenta el sugerido del sub activo como ganancia al arrancar", () => {
    const start = 1_700_000_000_000;
    const now = start + 300_000;
    const clocks = computeDesglosadorClocks(now, {
      aperturaAt: start,
      subVehiculos: [
        sub({
          id: "a",
          tiempoSugeridoSeg: 600,
          status: "cumplido",
          duracionFinal: 300,
        }),
        sub({ id: "b", tiempoSugeridoSeg: 600, status: "activo", aperturaAt: now }),
      ],
    } as Vehicle);
    // Ganancia real = −300 s. No −300 − 600 del sub que recién abre.
    assert.equal(clocks.liveAccumDeltaSec, -300);
  });

  it("en la última unidad, ganancia grande no pone el ciclo en 0", () => {
    const start = 1_700_000_000_000;
    const now = start + 1300_000; // 10+10 min de trabajo + ~1.7 min del último
    const clocks = computeDesglosadorClocks(now, {
      aperturaAt: start,
      subVehiculos: [
        sub({
          id: "a",
          tiempoSugeridoSeg: 3600,
          status: "cumplido",
          duracionFinal: 600,
        }),
        sub({
          id: "b",
          tiempoSugeridoSeg: 3600,
          status: "cumplido",
          duracionFinal: 600,
        }),
        sub({
          id: "c",
          tiempoSugeridoSeg: 3600,
          status: "activo",
          aperturaAt: now - 100_000,
        }),
      ],
    } as Vehicle);
    assert.equal(clocks.subElapsedSec, 100);
    assert.ok((clocks.cycleRemainSec ?? 0) >= 3500);
    assert.notEqual(clocks.cycleRemainSec, 0);
    assert.equal(clocks.liveAccumDeltaSec, -6000);
  });

  it("pausa de horas corre el tope: el restante vs global no se quema", () => {
    const start = 1_700_000_000_000;
    const pauseAt = start + 1300_000; // A 10m + B 10m + C 1.7m
    const now = pauseAt + 7200_000; // 2 h de pausa
    const clocks = computeDesglosadorClocks(now, {
      aperturaAt: start,
      interrupcionActiva: true,
      desglosadorPausa: {
        subActivoId: "c",
        elapsedSecSnapshot: 100,
        pausadoAt: pauseAt,
      },
      subVehiculos: [
        sub({
          id: "a",
          tiempoSugeridoSeg: 3600,
          status: "cumplido",
          duracionFinal: 600,
        }),
        sub({
          id: "b",
          tiempoSugeridoSeg: 3600,
          status: "cumplido",
          duracionFinal: 600,
        }),
        sub({
          id: "c",
          tiempoSugeridoSeg: 3600,
          status: "nested_paused",
          aperturaAt: pauseAt - 100_000,
        }),
      ],
    } as Vehicle);
    const workSec = 600 + 600 + 100;
    const pauseAccum = desglosadorPauseAccumSec({ aperturaAt: start }, now, workSec);
    assert.equal(pauseAccum, 7200);
    assert.equal(clocks.subElapsedSec, 100);
    assert.ok((clocks.cycleRemainSec ?? 0) >= 3500);
    assert.notEqual(clocks.cycleRemainSec, 0);
    assert.equal(clocks.pauseAccumSec, pauseAccum);
  });

  it("pérdida empuja el fin proyectado = trabajo restante, sin sumar el delta otra vez", () => {
    const start = 1_700_000_000_000;
    const now = start + 900_000; // A tardó 15 min de 10
    const clocks = computeDesglosadorClocks(now, {
      aperturaAt: start,
      subVehiculos: [
        sub({
          id: "a",
          tiempoSugeridoSeg: 600,
          status: "cumplido",
          duracionFinal: 900,
        }),
        sub({ id: "b", tiempoSugeridoSeg: 600, status: "activo", aperturaAt: now }),
        sub({ id: "c", tiempoSugeridoSeg: 600, status: "pendiente" }),
      ],
    } as Vehicle);
    // Trabajo restante 10+10; no 10+10+5 de la pérdida ya realizada.
    assert.equal(clocks.liveAccumDeltaSec, 300);
    assert.equal(clocks.cycleRemainSec, 1200);
  });

  it("meta HH:mm no salta +24 h al pasar la hora durante la sesión", () => {
    const start = new Date(2026, 8, 10, 8, 0, 0).getTime();
    const now = new Date(2026, 8, 10, 21, 0, 0).getTime();
    const tope = resolveConquistaTopeMs(
      { aperturaAt: start, criterioDetalle: "20:00" },
      [sub({ id: "a", tiempoSugeridoSeg: 3600, status: "activo", aperturaAt: start })],
      now
    );
    assert.equal(tope, new Date(2026, 8, 10, 20, 0, 0).getTime());
  });
});

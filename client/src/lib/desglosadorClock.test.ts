import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubVehiculo, Vehicle } from "./persistence.ts";
import {
  computeActiveSubClocks,
  computeDesglosadorClocks,
  computeSubCloseVerdict,
  desglosadorSubClockKey,
  desglosadorSubTimerUiFromClocks,
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

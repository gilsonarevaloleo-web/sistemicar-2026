import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubTarea } from "./persistence.ts";
import {
  aplicarTiempoGanadoAlCumplir,
  applyCupoManualYRedistribuir,
  capSituacionProyeccionFinMs,
  cerrarCronometroDeGolpe,
  computeSituacionCronometroHorarios,
  computeSituacionProyeccionFinMs,
  situacionGananciaVsContratoMin,
  descontarMinutosDeFlexiblesPosteriores,
  extraerSubTareaAReserva,
  quitarMinutosHaciaFoco,
  reacomodarColaCronometroAMeta,
  redistribuirMinutosSituacionCronometro,
  situacionRelojDebeMostrarse,
  situacionTargetMsReloj,
  remainingCronometroBudgetMin,
  sumBonusPreviewEnColaPendiente,
  sumMinutosCronometroPendientes,
  repartirDeltaMinutosEnCola,
  registrarCierreFalladoCronometro,
  resolveCronometroCupoAnchor,
  vehicleNeedsCupoAnchorSync,
  buildSellarDirectoEnRingState,
} from "./situacionCupoDistrib.ts";

function st(id: string, minutosCupo: number, cupoFijo?: boolean): SubTarea {
  return {
    id,
    texto: id,
    completada: false,
    creadaAt: 0,
    enDesgloseCronometro: true,
    resultadoSituacion: "pendiente",
    minutosCupo,
    ...(cupoFijo ? { cupoFijo: true } : {}),
  };
}

describe("redistribuirMinutosSituacionCronometro", () => {
  it("reparte en partes iguales si ninguna está fija", () => {
    const subs = [st("a", 10), st("b", 10), st("c", 10)];
    const out = redistribuirMinutosSituacionCronometro(subs, 30);
    assert.equal(sumMinutosCronometroPendientes(out), 30);
    assert.equal(out.find(s => s.id === "a")!.minutosCupo, 10);
    assert.equal(out.find(s => s.id === "b")!.minutosCupo, 10);
    assert.equal(out.find(s => s.id === "c")!.minutosCupo, 10);
  });

  it("conserva cupos fijos y reparte el sobrante entre flexibles", () => {
    const subs = [st("a", 15, true), st("b", 10), st("c", 10), st("d", 10)];
    const out = redistribuirMinutosSituacionCronometro(subs, 60);
    const a = out.find(s => s.id === "a")!;
    assert.equal(a.minutosCupo, 15);
    assert.equal(a.cupoFijo, true);
    const flexSum = out.filter(s => s.id !== "a").reduce((acc, s) => acc + (s.minutosCupo ?? 0), 0);
    assert.equal(15 + flexSum, 60);
    assert.ok((out.find(s => s.id === "b")!.minutosCupo ?? 0) >= 1);
  });

  it("applyCupoManual marca fijo y redistribuye", () => {
    const subs = [st("a", 10), st("b", 10), st("c", 10)];
    const out = applyCupoManualYRedistribuir(subs, "a", 20, 60);
    const a = out.find(s => s.id === "a")!;
    assert.equal(a.minutosCupo, 20);
    assert.equal(a.cupoFijo, true);
    assert.equal(sumMinutosCronometroPendientes(out), 60);
  });
});

describe("remainingCronometroBudgetMin", () => {
  it("usa solo tiempo de pared hasta meta (no infla por cupo acumulado)", () => {
    const now = 1_000_000;
    const sc = {
      activo: true,
      horaFinContratoMs: now + 25 * 60000,
      saldoAdelantoMin: 4,
    };
    const subs = [st("a", 10), st("b", 20), st("c", 10)];
    assert.equal(remainingCronometroBudgetMin(sc, subs, now), 25);
    assert.equal(remainingCronometroBudgetMin(sc, undefined, now), 25);
  });
});

describe("descontarMinutosDeFlexiblesPosteriores", () => {
  it("descuenta de filas flexibles posteriores en orden", () => {
    const subs = [st("a", 10, true), st("b", 15), st("c", 10)];
    const r = descontarMinutosDeFlexiblesPosteriores(subs, "a", 8);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.descontado, 8);
    assert.equal(r.subTareas.find(s => s.id === "b")!.minutosCupo, 7);
    assert.equal(sumMinutosCronometroPendientes(r.subTareas), 27);
  });

  it("no toca filas con cupo fijo", () => {
    const subs = [st("a", 10), st("b", 20, true), st("c", 10)];
    const r = descontarMinutosDeFlexiblesPosteriores(subs, "a", 5);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.subTareas.find(s => s.id === "b")!.minutosCupo, 20);
    assert.equal(r.subTareas.find(s => s.id === "c")!.minutosCupo, 5);
  });
});

describe("quitarMinutosHaciaFoco", () => {
  it("transfiere minutos a foco sin cambiar suma total", () => {
    const subs = [st("a", 10), st("b", 15), st("c", 10)];
    const sumBefore = sumMinutosCronometroPendientes(subs);
    const r = quitarMinutosHaciaFoco(subs, "a", "a", 8);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.focoGanado, 8);
    assert.equal(r.subTareas.find(s => s.id === "a")!.minutosCupo, 18);
    assert.equal(r.subTareas.find(s => s.id === "b")!.minutosCupo, 7);
    assert.equal(sumMinutosCronometroPendientes(r.subTareas), sumBefore);
  });

  it("foco distinto del origen recibe minutos", () => {
    const subs = [st("a", 10), st("b", 15), st("c", 10)];
    const r = quitarMinutosHaciaFoco(subs, "a", "b", 5);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.subTareas.find(s => s.id === "b")!.minutosCupo, 15);
    assert.equal(r.subTareas.find(s => s.id === "c")!.minutosCupo, 10);
  });
});

describe("computeSituacionCronometroHorarios", () => {
  const base = 1_700_000_000_000;

  it("proyecta fin acumulativo para 3 filas pendientes", () => {
    const subs = [st("a", 10), st("b", 10), st("c", 10)];
    const horarios = computeSituacionCronometroHorarios(subs, {
      bloqueInicioAt: base,
      anchor: { subTareaId: "a", startedAt: base },
      now: base,
    });
    assert.equal(horarios.length, 3);
    assert.equal(horarios[0]!.finMs, base + 10 * 60000);
    assert.equal(horarios[0]!.enFoco, true);
  });

  it("preview adelanta cursor en foco sin extender filas posteriores más allá de meta", () => {
    const subs = [st("a", 15), st("b", 10), st("c", 10)];
    const anchorAt = base;
    const now = base + 5 * 60000;
    const meta = base + 25 * 60000;
    const sinPreview = computeSituacionCronometroHorarios(subs, {
      bloqueInicioAt: base,
      anchor: { subTareaId: "a", startedAt: anchorAt },
      now,
      previewTiempoGanado: false,
      horaFinContratoMs: meta,
    });
    const conPreview = computeSituacionCronometroHorarios(subs, {
      bloqueInicioAt: base,
      anchor: { subTareaId: "a", startedAt: anchorAt },
      now,
      previewTiempoGanado: true,
      horaFinContratoMs: meta,
    });
    const finSin = sinPreview[sinPreview.length - 1]!.finMs;
    const finCon = conPreview[conPreview.length - 1]!.finMs;
    assert.ok(finCon <= finSin, "preview no alarga el fin proyectado");
    assert.ok(finCon <= meta);
  });

  it("sumBonusPreviewEnColaPendiente cuenta minutos virtuales repartidos", () => {
    const subs = [st("a", 15), st("b", 10), st("c", 10)];
    const now = base + 5 * 60000;
    const bonus = sumBonusPreviewEnColaPendiente(subs, { subTareaId: "a", startedAt: base }, now);
    assert.equal(bonus, 10);
  });
});

describe("contrato vs proyección", () => {
  it("situacionGananciaVsContratoMin positivo cuando proyección termina antes", () => {
    const contrato = 1_000_000;
    const proy = contrato - 8 * 60000;
    assert.equal(situacionGananciaVsContratoMin(contrato, proy), 8);
  });

  it("computeSituacionProyeccionFinMs no supera meta sellada", () => {
    const base = 1_700_000_000_000;
    const meta = base + 20 * 60000;
    const subs = [st("a", 15), st("b", 10)];
    const now = base + 8 * 60000;
    const proy = computeSituacionProyeccionFinMs(subs, {
      bloqueInicioAt: base,
      anchor: { subTareaId: "a", startedAt: base },
      now,
      horaFinContratoMs: meta,
    });
    assert.ok(proy != null);
    assert.ok(proy! <= meta);
  });

  it("capSituacionProyeccionFinMs limita al contrato", () => {
    assert.equal(capSituacionProyeccionFinMs(9000, 8000), 8000);
    assert.equal(capSituacionProyeccionFinMs(7000, 8000), 7000);
  });
});

describe("situacionRelojDebeMostrarse", () => {
  it("muestra reloj con cronómetro activo", () => {
    const subs = [st("a", 10)];
    const ok = situacionRelojDebeMostrarse({
      tipoFlota: "situacion",
      status: "activo",
      subTareas: subs,
      situacionCronometro: { activo: true, bloqueInicioAt: 1000, horaFinMs: 1000 + 10 * 60000 },
      situacionCupoAnchor: null,
    });
    assert.equal(ok, true);
  });
});

describe("aplicarTiempoGanadoAlCumplir", () => {
  const base = 1_700_000_000_000;

  it("reparte minutos ganados en cola proporcional al cupo objetivo", () => {
    const subs = [st("a", 15), st("b", 10), st("c", 30, true)];
    const now = base + 10 * 60000;
    const { subTareas: out, minutosGanados } = aplicarTiempoGanadoAlCumplir(
      subs,
      "a",
      { subTareaId: "a", startedAt: base },
      now,
      base
    );
    assert.equal(minutosGanados, 5);
    const b = out.find(s => s.id === "b")!;
    assert.equal(b.minutosCupo, 12);
    assert.equal(out.find(s => s.id === "c")!.minutosCupo, 33);
  });

  it("reparte ganancia entre toda la cola pendiente (incluye foco activo)", () => {
    const subs = [st("a", 10), st("b", 15), st("c", 10)];
    const now = base + 12 * 60000;
    const { subTareas: out, minutosGanados } = aplicarTiempoGanadoAlCumplir(
      subs,
      "c",
      { subTareaId: "a", startedAt: base },
      now,
      base
    );
    assert.equal(minutosGanados, 10);
    assert.equal(out.find(s => s.id === "a")!.minutosCupo, 14);
    assert.equal(out.find(s => s.id === "b")!.minutosCupo, 21);
    assert.equal(out.find(s => s.id === "c")!.resultadoSituacion, "cumplido");
  });

  it("sin cola flexible recibe ganancia en cupo fijo", () => {
    const subs = [st("a", 15), st("b", 10, true)];
    const now = base + 5 * 60000;
    const { subTareas: out, minutosGanados, saldoAdelantoMin } = aplicarTiempoGanadoAlCumplir(
      subs,
      "a",
      { subTareaId: "a", startedAt: base },
      now,
      base
    );
    assert.equal(minutosGanados, 10);
    assert.equal(saldoAdelantoMin, 0);
    assert.equal(out.find(s => s.id === "b")!.minutosCupo, 20);
    assert.equal(sumMinutosCronometroPendientes(out), 20);
  });

  it("ganancia reparte en cola sin comprimir proyección al cerrar", () => {
    const meta = base + 12 * 60000;
    const subs = [st("a", 15), st("b", 10), st("c", 10)];
    const now = base + 10 * 60000;
    const { subTareas: out, minutosGanados, saldoAdelantoMin } = aplicarTiempoGanadoAlCumplir(
      subs,
      "a",
      { subTareaId: "a", startedAt: base },
      now,
      base,
      meta
    );
    assert.equal(minutosGanados, 5);
    assert.equal(saldoAdelantoMin, 0);
    assert.equal(sumMinutosCronometroPendientes(out), 25);
    const proyAntes = computeSituacionProyeccionFinMs(subs, {
      bloqueInicioAt: base,
      anchor: { subTareaId: "a", startedAt: base },
      now,
      horaFinContratoMs: meta,
    });
    const proy = computeSituacionProyeccionFinMs(out, {
      bloqueInicioAt: base,
      anchor: { subTareaId: "b", startedAt: now },
      now,
      horaFinContratoMs: meta,
    });
    assert.ok(proy != null && proy <= meta);
    assert.ok(proyAntes != null && proy != null && proy >= proyAntes - 60000);
  });
});

describe("repartirDeltaMinutosEnCola", () => {
  it("reparte pérdida entre flexibles de toda la cola", () => {
    const subs = [st("a", 10), st("b", 20), st("c", 10, true)];
    const { subTareas: out, repartido } = repartirDeltaMinutosEnCola(subs, -8);
    assert.equal(repartido, -8);
    assert.equal(out.find(s => s.id === "a")!.minutosCupo, 7);
    assert.equal(out.find(s => s.id === "b")!.minutosCupo, 15);
    assert.equal(out.find(s => s.id === "c")!.minutosCupo, 10);
  });
});

describe("registrarCierreFalladoCronometro", () => {
  const base = 1_700_000_000_000;

  it("reparte pérdida vs meta al fallar tarde", () => {
    const subs = [st("a", 10), st("b", 15)];
    const now = base + 12 * 60000;
    const { subTareas: out, minutosPerdidos } = registrarCierreFalladoCronometro(
      subs,
      "a",
      { subTareaId: "a", startedAt: base },
      now,
      base
    );
    assert.equal(minutosPerdidos, 2);
    assert.equal(out.find(s => s.id === "b")!.minutosCupo, 13);
    assert.equal(out.find(s => s.id === "a")!.resultadoSituacion, "fallado");
  });
});

describe("reacomodarColaCronometroAMeta", () => {
  const base = 1_700_000_000_000;

  it("comprime cupos cuando exceden tiempo hasta meta", () => {
    const meta = base + 15 * 60000;
    const subs = [st("a", 10), st("b", 20), st("c", 10)];
    const out = reacomodarColaCronometroAMeta(subs, meta, base);
    assert.equal(sumMinutosCronometroPendientes(out), 15);
  });
});

describe("cerrarCronometroDeGolpe", () => {
  const base = 1_700_000_000_000;

  it("marca todas las pendientes como falladas", () => {
    const subs = [st("a", 10), st("b", 15)];
    const out = cerrarCronometroDeGolpe(
      subs,
      { subTareaId: "a", startedAt: base },
      base + 5 * 60000,
      base
    );
    assert.equal(out.filter(s => s.resultadoSituacion === "fallado").length, 2);
    assert.equal(out.find(s => s.id === "a")!.duracionRealSec, 300);
  });
});

describe("extraerSubTareaAReserva", () => {
  it("saca fila pendiente del cronómetro y reduce Σ cupos", () => {
    const subs = [st("a", 10), st("b", 15), st("c", 5)];
    const { subTareas: out, extraido } = extraerSubTareaAReserva(subs, "b");
    assert.ok(extraido);
    assert.equal(extraido!.texto, "b");
    assert.equal(extraido!.minutosCupo, 15);
    assert.equal(out.length, 2);
    assert.equal(sumMinutosCronometroPendientes(out), 15);
    assert.equal(out.find(s => s.id === "b"), undefined);
  });

  it("ignora filas ya cerradas", () => {
    const subs = [{ ...st("a", 10), resultadoSituacion: "cumplido" as const }];
    const { subTareas: out, extraido } = extraerSubTareaAReserva(subs, "a");
    assert.equal(extraido, null);
    assert.equal(out.length, 1);
  });
});

describe("resolveCronometroCupoAnchor", () => {
  it("avanza a la siguiente fila cuando la actual agotó cupo", () => {
    const now = 1_000_000;
    const subs = [st("a", 5), st("b", 10), st("c", 10)];
    const cur = { subTareaId: "a", startedAt: now - 5 * 60000 - 1 };
    const next = resolveCronometroCupoAnchor(subs, cur, { now });
    assert.notEqual(next, "unchanged");
    assert.equal((next as { subTareaId: string }).subTareaId, "b");
  });

  it("forceResetSameRow salta a fila 2 tras cerrar fila 1", () => {
    const now = 2_000_000;
    const subs = [
      { ...st("a", 10), enDesgloseCronometro: true, resultadoSituacion: "cumplido" as const },
      { ...st("b", 10), enDesgloseCronometro: true },
    ];
    const cur = { subTareaId: "a", startedAt: now - 60_000 };
    const next = resolveCronometroCupoAnchor(subs, cur, { forceResetSameRow: true, now });
    assert.notEqual(next, "unchanged");
    assert.equal((next as { subTareaId: string }).subTareaId, "b");
    assert.equal((next as { startedAt: number }).startedAt, now);
  });

  it("forceResetSameRow tras deuda: startedAt=now (no hereda ancla vencida)", () => {
    const now = 3_000_000;
    const debtStartedAt = now - 7 * 60_000 - 56_000; // ~7:56 sobre cupo 5 → deuda
    const subs = [
      {
        ...st("a", 5),
        enDesgloseCronometro: true,
        resultadoSituacion: "cumplido" as const,
        cerradaAt: now,
      },
      { ...st("b", 5), enDesgloseCronometro: true, resultadoSituacion: "pendiente" as const },
    ];
    const cur = { subTareaId: "a", startedAt: debtStartedAt };
    const next = resolveCronometroCupoAnchor(subs, cur, { forceResetSameRow: true, now });
    assert.ok(next && next !== "unchanged");
    assert.equal(next.subTareaId, "b");
    assert.equal(next.startedAt, now);
    assert.ok(
      next.startedAt > debtStartedAt,
      "handoff debe mintar startedAt fresco; si falla el island muestra DEUDA ACUMULADA"
    );
  });

  it("no cambia si la fila actual aún tiene cupo", () => {
    const now = 1_000_000;
    const subs = [st("a", 5), st("b", 10)];
    const cur = { subTareaId: "a", startedAt: now - 2 * 60000 };
    assert.equal(resolveCronometroCupoAnchor(subs, cur, { now }), "unchanged");
  });
});

describe("vehicleNeedsCupoAnchorSync", () => {
  it("false para subtarea libre sin ring ni minutos", () => {
    const v = {
      id: "v1",
      tipoFlota: "situacion",
      status: "activo",
      subTareas: [{ id: "s1", texto: "t", completada: false, creadaAt: 1 }],
    } as import("./persistence.ts").Vehicle;
    assert.equal(vehicleNeedsCupoAnchorSync(v), false);
  });

  it("true con ring activo", () => {
    const v = {
      id: "v1",
      tipoFlota: "situacion",
      status: "activo",
      situacionCronometro: { activo: true, bloqueInicioAt: 1, horaFinMs: 2 },
      subTareas: [],
    } as import("./persistence.ts").Vehicle;
    assert.equal(vehicleNeedsCupoAnchorSync(v), true);
  });
});

describe("buildSellarDirectoEnRingState", () => {
  const now = 1_500_000;

  function situacionVehicle(
    overrides?: Partial<import("./persistence.ts").Vehicle>
  ): import("./persistence.ts").Vehicle {
    return {
      id: "v1",
      titulo: "Situación test",
      status: "activo",
      tipoFlota: "situacion",
      subTareas: [],
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: 1_000_000,
        horaFinContratoMs: now + 30 * 60_000,
      },
      ...overrides,
    } as import("./persistence.ts").Vehicle;
  }

  it("rechaza texto vacío", () => {
    const r = buildSellarDirectoEnRingState(situacionVehicle(), "   ");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "empty_text");
  });

  it("rechaza ring inactivo", () => {
    const r = buildSellarDirectoEnRingState(
      situacionVehicle({ situacionCronometro: { activo: false } }),
      "Tarea"
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "ring_inactive");
  });

  it("crea subtarea sellada en ring con cupo y anchor", () => {
    const r = buildSellarDirectoEnRingState(situacionVehicle(), "Urgente", {
      nowMs: now,
      newSubId: "st_ring",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.newSubId, "st_ring");
    assert.equal(r.subTareas.length, 1);
    const sub = r.subTareas[0];
    assert.equal(sub.texto, "Urgente");
    assert.equal(sub.enDesgloseCronometro, true);
    assert.equal(sub.resultadoSituacion, "pendiente");
    assert.ok((sub.minutosCupo ?? 0) >= 1);
    assert.equal(r.situacionCupoAnchor?.subTareaId, "st_ring");
    assert.equal(r.situacionCupoAnchor?.startedAt, now);
  });

  it("conserva anchor si la fila foco sigue válida", () => {
    const existing = st("foco", 10);
    const v = situacionVehicle({
      subTareas: [existing],
      situacionCupoAnchor: { subTareaId: "foco", startedAt: 1_100_000 },
    });
    const r = buildSellarDirectoEnRingState(v, "Nueva", { nowMs: now, newSubId: "st_n" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.subTareas.length, 2);
    assert.equal(r.situacionCupoAnchor?.subTareaId, "foco");
    assert.equal(r.anchorStillValid, true);
  });
});

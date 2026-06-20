import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  buildConcienciaTimeline,
  calcularBalanceConquistaJornada,
  clockMinutesToDeg,
  computeAnilloEstado,
  computeLiveEntropy,
  computeSegmentBattleArcs,
  computeSegmentClockArcs,
  armEntropyGapOnConsciousClose,
  computeTimelineClockArcs,
  computeTimelineDayStats,
  getUmbralConcienciaMin,
  limaNowToClockDeg,
  msToClockDeg,
  listRetroactiveCentinelaGapsToPersist,
  resetLiveEntropyMonotonic,
  resolveConsciousSessionStart,
  UMBRAL_CONTINGENCIA_MIN,
} from "./ConcienciaEngine.ts";
import { getJournalDayStartMs } from "../lib/segmentTime.ts";
import { computeHorizonProjection, msToHorizonDeg } from "./ConcienciaHorizonEngine.ts";
import { filterVehiclesForAnilloCoverage } from "../lib/ghostVehicleEngine.ts";
import type { Vehicle } from "../lib/persistence.ts";

/** Hora civil en Lima (UTC-5) como timestamp UTC. */
function limaAt(y: number, mo: number, d: number, h: number, min = 0): number {
  return Date.UTC(y, mo, d, h + 5, min);
}

/** requestIdleCallback síncrono para tests (Node no dispara idle de forma fiable). */
function withImmediateIdleCallback<T>(fn: () => T | Promise<T>): Promise<T> {
  const prev = globalThis.requestIdleCallback;
  globalThis.requestIdleCallback = cb => {
    cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    return 0;
  };
  return Promise.resolve(fn()).finally(() => {
    if (prev) globalThis.requestIdleCallback = prev;
    else delete (globalThis as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
  });
}

/** Sesión centinela sellada (autoVerdad) para tests de puntero y persistencia. */
function sesionCentinela(
  apertura: number,
  opts?: { cierreAt?: number; status?: "activo" | "archivado" }
) {
  return {
    autoVerdad: true,
    status: opts?.status ?? (opts?.cierreAt != null ? "archivado" : "activo"),
    aperturaAt: apertura,
    ...(opts?.cierreAt != null ? { cierreAt: opts.cierreAt } : {}),
  };
}

describe("clockMinutesToDeg / puntero 12h", () => {
  it("00:00 arriba (0°)", () => {
    assert.equal(clockMinutesToDeg(0), 0);
  });

  it("07:00 = 210° (7×30)", () => {
    assert.equal(clockMinutesToDeg(7 * 60), 210);
  });

  it("12:00 vuelve arriba (0°)", () => {
    assert.equal(clockMinutesToDeg(12 * 60), 0);
  });

  it("limaNowToClockDeg usa hora Lima", () => {
    const now = limaAt(2026, 4, 18, 9, 30);
    assert.equal(limaNowToClockDeg(now), clockMinutesToDeg(9 * 60 + 30));
  });

  it("msToClockDeg alinea sesiones al reloj 12h del día civil del instante", () => {
    const tenAm = limaAt(2026, 4, 18, 10, 0);
    assert.equal(msToClockDeg(tenAm), clockMinutesToDeg(10 * 60));
    assert.equal(msToClockDeg(tenAm), limaNowToClockDeg(tenAm));
  });
});

describe("Umbral de Conciencia", () => {
  it("sin segmentos usa 06:00", () => {
    assert.equal(getUmbralConcienciaMin([]), UMBRAL_CONTINGENCIA_MIN);
  });

  it("toma la hora de inicio más temprana", () => {
    assert.equal(
      getUmbralConcienciaMin([
        { horaInicio: "09:00", horaFin: "12:00" },
        { horaInicio: "07:30", horaFin: "09:00" },
      ]),
      7 * 60 + 30
    );
  });
});

describe("computeSegmentClockArcs", () => {
  it("segmento matutino y puntero 09:00 comparten ángulo AM", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const arcs = computeSegmentClockArcs(
      [{ horaInicio: "08:00", horaFin: "10:00", estado: "activo", nombre: "Mañana" }],
      now
    );
    assert.equal(arcs.length, 1);
    assert.equal(arcs[0]!.lap, 0);
    const ptr = limaNowToClockDeg(now);
    assert.ok(ptr >= arcs[0]!.startDeg && ptr <= arcs[0]!.endDeg);
    assert.equal(arcs[0]!.startDeg, clockMinutesToDeg(8 * 60));
    assert.equal(arcs[0]!.endDeg, clockMinutesToDeg(10 * 60));
  });

  it("segmento vespertino cae en vuelta PM", () => {
    const now = limaAt(2026, 4, 18, 15, 0);
    const arcs = computeSegmentClockArcs(
      [{ horaInicio: "14:00", horaFin: "16:00", estado: "pendiente" }],
      now
    );
    assert.equal(arcs.length, 1);
    assert.equal(arcs[0]!.lap, 1);
    const ptr = limaNowToClockDeg(now);
    assert.ok(ptr >= arcs[0]!.startDeg && ptr <= arcs[0]!.endDeg);
  });

  it("segmento que cruza mediodía se parte en AM y PM", () => {
    const now = limaAt(2026, 4, 18, 13, 0);
    const arcs = computeSegmentClockArcs(
      [{ horaInicio: "11:00", horaFin: "13:00", estado: "activo" }],
      now
    );
    assert.equal(arcs.length, 2);
    assert.deepEqual(
      arcs.map(a => a.lap).sort(),
      [0, 1]
    );
    assert.equal(arcs[1]!.isActive, true);
    assert.equal(arcs[1]!.isNowInside, true);
  });

  it("marca isNowInside solo en la vuelta que contiene now", () => {
    const now = limaAt(2026, 4, 18, 11, 30);
    const arcs = computeSegmentClockArcs(
      [{ horaInicio: "11:00", horaFin: "13:00", estado: "activo" }],
      now
    );
    const am = arcs.find(a => a.lap === 0)!;
    const pm = arcs.find(a => a.lap === 1)!;
    assert.equal(am.isNowInside, true);
    assert.equal(pm.isNowInside, false);
  });
});

describe("computeSegmentBattleArcs", () => {
  it("entropía dentro del segmento planificado genera arco en el mismo lap", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00", estado: "pendiente" }];
    const battle = computeSegmentBattleArcs({ segmentos, vehiculos: [], now });
    const seg = computeSegmentClockArcs(segmentos, now)[0]!;
    const ent = battle.filter(a => a.kind === "entropia");
    assert.ok(ent.length > 0);
    assert.equal(ent[0]!.lap, seg.lap);
    assert.ok(ent[0]!.startDeg >= seg.startDeg - 0.01);
    assert.ok(ent[0]!.endDeg <= seg.endDeg + 0.01);
  });

  it("vehículo activo genera conquista dentro del arco del segmento", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const journalStart = getJournalDayStartMs(now);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00", estado: "activo" }];
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: journalStart,
    }];
    const battle = computeSegmentBattleArcs({ segmentos, vehiculos, now });
    assert.ok(battle.some(a => a.kind === "conquista"));
    assert.equal(battle.filter(a => a.kind === "entropia").length, 0);
  });
});

describe("ConcienciaHorizonEngine", () => {
  it("msToHorizonDeg: ahora = 0°, pasado negativo", () => {
    const half = 4 * 60 * 60000;
    assert.equal(msToHorizonDeg(0, half), 0);
    assert.ok(msToHorizonDeg(-half, half) < 0);
    assert.ok(msToHorizonDeg(half, half) > 0);
  });

  it("computeHorizonProjection incluye segmento futuro cerca de now", () => {
    const now = limaAt(2026, 4, 18, 10, 0);
    const proj = computeHorizonProjection({
      segmentos: [{ horaInicio: "10:30", horaFin: "12:00", estado: "pendiente", nombre: "Tarde" }],
      vehiculos: [],
      now,
    });
    assert.ok(proj.arcs.some(a => a.kind === "segmento"));
    assert.equal(proj.pointerDeg, 0);
  });
});

describe("computeTimelineClockArcs", () => {
  it("incluye fondo para 2 vueltas (AM/PM)", () => {
    const arcs = computeTimelineClockArcs({
      vehiculos: [],
      segmentos: [],
      now: limaAt(2026, 4, 18, 10, 0),
    });
    assert.ok(arcs.filter(a => a.kind === "fondo").length >= 2);
  });

  it("antes del umbral sin entropía roja", () => {
    const now = limaAt(2026, 4, 18, 5, 0);
    const arcs = computeTimelineClockArcs({
      vehiculos: [],
      segmentos: [{ horaInicio: "08:00", horaFin: "10:00" }],
      now,
    });
    assert.equal(arcs.filter(a => a.kind === "entropia").length, 0);
  });

  it("sin segmentos tras 06:00 genera entropía en ventana vivida", () => {
    const now = limaAt(2026, 4, 18, 8, 0);
    const arcs = computeTimelineClockArcs({ vehiculos: [], segmentos: [], now });
    assert.ok(arcs.some(a => a.kind === "entropia"));
    const stats = computeTimelineDayStats({ vehiculos: [], segmentos: [], now });
    assert.ok(stats.entropiaMin > 0);
  });

  it("sin segmentos descanso activo cubre ventana sin entropía", () => {
    const apertura = limaAt(2026, 4, 18, 6, 0);
    const now = limaAt(2026, 4, 18, 8, 0);
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "descanso",
      status: "activo",
      aperturaAt: apertura,
    }];
    const arcs = computeTimelineClockArcs({ vehiculos, segmentos: [], now });
    assert.equal(arcs.filter(a => a.kind === "entropia").length, 0);
    const st = computeAnilloEstado({ segmentos: [], vehiculos, now });
    assert.equal(st.mode, "conquista");
    assert.equal(st.centerGuide, "Recarga consciente activa");
  });

  it("hueco planificado sin vehículo genera entropía roja", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const arcs = computeTimelineClockArcs({
      vehiculos: [],
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      now,
    });
    assert.ok(arcs.some(a => a.kind === "entropia"));
  });

  it("vehículo activo cubre hueco sin entropía ni puntero rojo", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const journalStart = getJournalDayStartMs(now);
    const arcs = computeTimelineClockArcs({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [{
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "activo",
        aperturaAt: journalStart,
      }],
      now,
    });
    assert.equal(arcs.filter(a => a.kind === "entropia").length, 0);
    assert.ok(arcs.some(a => a.kind === "conquista"));
    const st = computeAnilloEstado({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [{
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "activo",
        aperturaAt: journalStart,
      }],
      now,
    });
    assert.equal(st.mode, "conquista");
  });

  it("1 min sin actividad no pinta bloque entero si hubo cobertura previa", () => {
    const apertura = limaAt(2026, 4, 18, 8, 15);
    const cierre = limaAt(2026, 4, 18, 9, 0);
    const now = limaAt(2026, 4, 18, 9, 1);
    const arcs = computeTimelineClockArcs({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [{
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "cumplido",
        aperturaAt: apertura,
        cierreAt: cierre,
        duracionFinal: 45,
      }],
      now,
    });
    const entropiaArcs = arcs.filter(a => a.kind === "entropia");
    assert.ok(entropiaArcs.length > 0);
    const entropiaDeg = entropiaArcs.reduce((acc, a) => acc + (a.endDeg - a.startDeg), 0);
    assert.ok(entropiaDeg < 15, "solo el hueco reciente, no 3h enteras");
  });

  it("vehículo voluntario genera arco morado", () => {
    const apertura = limaAt(2026, 4, 18, 8, 15);
    const cierre = limaAt(2026, 4, 18, 9, 0);
    const arcs = computeTimelineClockArcs({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [{
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "cumplido",
        aperturaAt: apertura,
        cierreAt: cierre,
        duracionFinal: 45,
      }],
      now: limaAt(2026, 4, 18, 10, 0),
    });
    assert.ok(arcs.some(a => a.kind === "conquista"));
  });

  it("descanso activo cubre hueco sin entropía y puntero morado", () => {
    const apertura = limaAt(2026, 4, 18, 8, 0);
    const now = limaAt(2026, 4, 18, 8, 30);
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "descanso",
      status: "activo",
      aperturaAt: apertura,
    }];
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const arcs = computeTimelineClockArcs({ segmentos, vehiculos, now });
    assert.equal(arcs.filter(a => a.kind === "entropia").length, 0);
    assert.ok(arcs.some(a => a.kind === "conquista"));
    const st = computeAnilloEstado({ segmentos, vehiculos, now });
    assert.equal(st.mode, "conquista");
    assert.equal(st.centerGuide, "Recarga consciente activa");
  });

  it("a las 09:00 trabajo desde 05:00 cubre segmento sin entropía roja", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const journalStart = getJournalDayStartMs(now);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: journalStart,
    }];
    const arcs = computeTimelineClockArcs({ segmentos, vehiculos, now });
    assert.equal(arcs.filter(a => a.kind === "entropia").length, 0);
    const st = computeAnilloEstado({ segmentos, vehiculos, now });
    assert.equal(st.mode, "conquista");
  });

  it("activo desde antes de 05:00 no infla entropía de horas previas al umbral", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const journalStart = getJournalDayStartMs(now);
    const stats = computeTimelineDayStats({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [{
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "activo",
        aperturaAt: journalStart - 3600_000,
      }],
      now,
    });
    assert.equal(stats.entropiaMin, 0);
  });

  it("a las 5:40 segmento 5-10 sin vehículo en jornada: rojo, sin morado", () => {
    const now = limaAt(2026, 4, 18, 5, 40);
    const arcs = computeTimelineClockArcs({
      vehiculos: [],
      segmentos: [{ horaInicio: "05:00", horaFin: "10:00" }],
      now,
    });
    assert.ok(arcs.some(a => a.kind === "entropia"));
    assert.equal(arcs.filter(a => a.kind === "conquista").length, 0);
  });

  it("apertura tardía (6:00) muestra ~60 min entropía antes de conquista", () => {
    const now = limaAt(2026, 4, 18, 7, 0);
    const apertura = limaAt(2026, 4, 18, 6, 0);
    const segmentos = [{ horaInicio: "05:00", horaFin: "10:00" }];
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: apertura,
    }];
    const stats = computeTimelineDayStats({ segmentos, vehiculos, now });
    assert.ok(stats.entropiaMin >= 55 && stats.entropiaMin <= 65, "~60 min entropía");
    assert.ok(stats.conquistaMin >= 55 && stats.conquistaMin <= 65, "~60 min conquista");
    const arcs = computeTimelineClockArcs({ segmentos, vehiculos, now });
    assert.ok(arcs.some(a => a.kind === "entropia"));
    assert.ok(arcs.some(a => a.kind === "conquista"));
    const st = computeAnilloEstado({ segmentos, vehiculos, now });
    assert.equal(st.mode, "conquista");
  });

  it("aperturaAt retroactivo se corrige con createdAt posterior", () => {
    const now = limaAt(2026, 4, 18, 7, 0);
    const journalStart = getJournalDayStartMs(now);
    const realOpen = limaAt(2026, 4, 18, 6, 0);
    const segmentos = [{ horaInicio: "05:00", horaFin: "10:00" }];
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: journalStart,
      createdAt: realOpen,
    }];
    assert.equal(resolveConsciousSessionStart(vehiculos[0], now), realOpen);
    const stats = computeTimelineDayStats({ segmentos, vehiculos, now });
    assert.ok(stats.entropiaMin >= 55 && stats.entropiaMin <= 65);
  });

  it("activo arrastrado desde 04:00 no pinta morado tras filtro de anillo", () => {
    const now = limaAt(2026, 4, 18, 5, 40);
    const journalStart = getJournalDayStartMs(now);
    const stale = {
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: journalStart - 3600_000,
    };
    const centinela = sesionCentinela(limaAt(2026, 4, 18, 5, 2));
    const vehiculos = filterVehiclesForAnilloCoverage([stale as any, centinela as any], now);
    assert.equal(vehiculos.length, 1);
    assert.equal(vehiculos[0].autoVerdad, true);
    const arcs = computeTimelineClockArcs({
      vehiculos,
      segmentos: [{ horaInicio: "05:00", horaFin: "10:00" }],
      now,
    });
    assert.ok(arcs.some(a => a.kind === "entropia"));
    assert.equal(arcs.filter(a => a.kind === "conquista").length, 0);
    const st = computeAnilloEstado({
      segmentos: [{ horaInicio: "05:00", horaFin: "10:00" }],
      vehiculos,
      now,
    });
    assert.equal(st.mode, "entropia");
  });

  it("conquista solo dentro del segmento planificado, no antes del umbral", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const journalStart = getJournalDayStartMs(now);
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: journalStart,
    }];
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const arcs = computeTimelineClockArcs({ segmentos, vehiculos, now });
    const conquista = arcs.filter(a => a.kind === "conquista");
    assert.ok(conquista.length > 0);
    const minDeg = Math.min(...conquista.map(a => a.startDeg));
    assert.ok(minDeg >= clockMinutesToDeg(8 * 60) - 1, "morado no antes de 08:00");
  });
});

describe("computeAnilloEstado", () => {
  it("modo entropía sin segmentos después de 06:00 sin flota activa", () => {
    const now = limaAt(2026, 4, 18, 7, 0);
    const st = computeAnilloEstado({
      segmentos: [],
      vehiculos: [sesionCentinela(limaAt(2026, 4, 18, 6, 2))],
      now,
    });
    assert.equal(st.mode, "entropia");
    assert.equal(st.sinSegmentos, true);
  });

  it("modo libre antes del primer segmento", () => {
    const now = limaAt(2026, 4, 18, 6, 0);
    const st = computeAnilloEstado({
      segmentos: [{ horaInicio: "08:00", horaFin: "10:00" }],
      vehiculos: [],
      now,
    });
    assert.equal(st.mode, "libre");
  });

  it("modo entropía en segmento planificado sin cobertura", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const st = computeAnilloEstado({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [sesionCentinela(limaAt(2026, 4, 18, 8, 2))],
      now,
    });
    assert.equal(st.mode, "entropia");
  });

  it("varios segmentos acumulan entropía en todos los huecos planificados", () => {
    const now = limaAt(2026, 4, 18, 15, 0);
    const segmentos = [
      { horaInicio: "08:00", horaFin: "10:00" },
      { horaInicio: "11:00", horaFin: "12:00" },
      { horaInicio: "14:00", horaFin: "16:00" },
    ];
    const stats = computeTimelineDayStats({ vehiculos: [], segmentos, now });
    assert.equal(stats.entropiaMin, 240, "2h + 1h + 1h de huecos planificados");
    const st = computeAnilloEstado({
      segmentos,
      vehiculos: [sesionCentinela(limaAt(2026, 4, 18, 8, 2))],
      now,
    });
    assert.equal(st.mode, "entropia");
  });

  it("desglosador pausado no bloquea entropía ni puntero rojo", () => {
    const now = limaAt(2026, 4, 18, 9, 30);
    const journalStart = getJournalDayStartMs(now);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const paused = {
      autoVerdad: false,
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      status: "activo",
      aperturaAt: journalStart,
      interrupcionActiva: true,
      desglosadorPausa: { motivo: "test" },
    };
    const centinela = sesionCentinela(limaAt(2026, 4, 18, 8, 2));
    const stats = computeTimelineDayStats({ segmentos, vehiculos: [paused, centinela], now });
    assert.ok(stats.entropiaMin >= 88, "casi todo el segmento vivido cuenta como entropía");
    const st = computeAnilloEstado({ segmentos, vehiculos: [paused, centinela], now });
    assert.equal(st.mode, "entropia");
  });

  it("sin centinela activo aún, puntero libre durante los primeros 2 min de hueco", () => {
    const now = limaAt(2026, 4, 18, 8, 1);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const stats = computeTimelineDayStats({ segmentos, vehiculos: [], now });
    assert.ok(stats.entropiaMin >= 0.5, "el hueco ya cuenta en arcos/stats");
    const st = computeAnilloEstado({ segmentos, vehiculos: [], now });
    assert.equal(st.mode, "libre", "puntero no rojo antes de que el centinela materialice la sesión");
  });

  it("centinela activo enciende puntero rojo tras el delay de 2 min", () => {
    const now = limaAt(2026, 4, 18, 9, 4);
    const journalStart = getJournalDayStartMs(now);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const vehiculos = [
      {
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "cumplido",
        aperturaAt: journalStart,
        cierreAt: limaAt(2026, 4, 18, 9, 0),
        duracionFinal: 240,
      },
      sesionCentinela(limaAt(2026, 4, 18, 9, 2)),
    ];
    const stats = computeTimelineDayStats({ segmentos, vehiculos, now });
    assert.ok(stats.entropiaMin >= 3.5, "hueco 9:00–9:04 más sesión centinela sellada");
    const st = computeAnilloEstado({ segmentos, vehiculos, now });
    assert.equal(st.mode, "entropia", "centinela activo mantiene puntero rojo");
  });

  it("entropía sellada persiste al abrir vehículo consciente", () => {
    const now = limaAt(2026, 4, 18, 10, 0);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const entropiaSellada = sesionCentinela(limaAt(2026, 4, 18, 8, 0), {
      cierreAt: limaAt(2026, 4, 18, 9, 0),
      status: "archivado",
    });
    const consciente = {
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo" as const,
      aperturaAt: limaAt(2026, 4, 18, 9, 5),
    };
    const vehiculos = [entropiaSellada, consciente];
    const stats = computeTimelineDayStats({ segmentos, vehiculos, now });
    assert.ok(stats.entropiaMin >= 58, "60 min sellados menos solape mínimo con conquista");
    assert.ok(stats.conquistaMin >= 50 && stats.conquistaMin <= 60, "conquista solo desde 9:05");
    const arcs = computeTimelineClockArcs({ segmentos, vehiculos, now });
    const entropiaArcs = arcs.filter(a => a.kind === "entropia");
    const conquistaArcs = arcs.filter(a => a.kind === "conquista");
    assert.ok(entropiaArcs.length > 0, "arcos rojos históricos permanecen");
    assert.ok(conquistaArcs.length > 0, "arco morado desde apertura consciente");
    const st = computeAnilloEstado({ segmentos, vehiculos, now });
    assert.equal(st.mode, "conquista", "vehículo consciente activo domina el puntero");
  });

  it("aperturaAt retroactivo no borra entropía sellada previa", () => {
    const now = limaAt(2026, 4, 18, 10, 0);
    const journalStart = getJournalDayStartMs(now);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const entropiaSellada = sesionCentinela(limaAt(2026, 4, 18, 8, 0), {
      cierreAt: limaAt(2026, 4, 18, 9, 0),
      status: "archivado",
    });
    const conscienteRetro = {
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo" as const,
      aperturaAt: journalStart,
      createdAt: limaAt(2026, 4, 18, 9, 0),
    };
    const stats = computeTimelineDayStats({
      segmentos,
      vehiculos: [entropiaSellada, conscienteRetro],
      now,
    });
    assert.ok(stats.entropiaMin >= 55, "entropía 8:00–9:00 no se borra por cobertura retroactiva");
  });

  it("modo entropía implica minutos inconscientes > 0", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const vehiculos = [sesionCentinela(limaAt(2026, 4, 18, 8, 2))];
    const st = computeAnilloEstado({ segmentos, vehiculos, now });
    const stats = computeTimelineDayStats({ segmentos, vehiculos, now });
    assert.equal(st.mode, "entropia");
    assert.ok(stats.entropiaMin > 0);
  });

  it("entropiaMin acumulada no decrece: hueco, centinela y apertura consciente", () => {
    resetLiveEntropyMonotonic();
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const consciente: Vehicle = {
      id: "v-conscious",
      titulo: "Enfoque test",
      criterioFin: "manual",
      criterioDetalle: "",
      tiempoInicio: new Date(limaAt(2026, 4, 18, 8, 35)),
      ejes: {
        enfoque: { text: "", trifecta: "pendiente" },
        conflicto: { text: "", trifecta: "pendiente" },
        pasos: { text: "", trifecta: "pendiente" },
        limite: { text: "", trifecta: "pendiente" },
      },
      status: "activo",
      userId: "u1",
      createdAt: new Date(limaAt(2026, 4, 18, 8, 35)),
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      aperturaAt: limaAt(2026, 4, 18, 8, 35),
    };

    const steps: { now: number; vehiculos: Vehicle[] }[] = [
      { now: limaAt(2026, 4, 18, 8, 5), vehiculos: [] },
      { now: limaAt(2026, 4, 18, 8, 7), vehiculos: [sesionCentinela(limaAt(2026, 4, 18, 8, 5)) as Vehicle] },
      { now: limaAt(2026, 4, 18, 8, 35), vehiculos: [sesionCentinela(limaAt(2026, 4, 18, 8, 5), { cierreAt: limaAt(2026, 4, 18, 8, 35), status: "archivado" }) as Vehicle, consciente] },
      { now: limaAt(2026, 4, 18, 9, 0), vehiculos: [sesionCentinela(limaAt(2026, 4, 18, 8, 5), { cierreAt: limaAt(2026, 4, 18, 8, 35), status: "archivado" }) as Vehicle, consciente] },
    ];

    let prev = 0;
    for (const step of steps) {
      const stats = computeLiveEntropy({
        segmentos,
        vehiculos: step.vehiculos,
        now: step.now,
      }).dayStats;
      assert.ok(
        stats.entropiaMin + 0.05 >= prev,
        `entropiaMin no debe decrecer (${prev} → ${stats.entropiaMin})`
      );
      prev = stats.entropiaMin;
    }
  });

  it("vehículo fantasma stale no reduce entropiaMin en computeLiveEntropy", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 4, 18, 8, 10);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const baseline = computeLiveEntropy({ segmentos, vehiculos: [], now }).dayStats.entropiaMin;
    const staleGhost: Vehicle = {
      id: "ghost-stale",
      titulo: "Fantasma nocturno arrastrado",
      criterioFin: "manual",
      criterioDetalle: "",
      tiempoInicio: new Date(limaAt(2026, 4, 17, 21, 0)),
      ejes: {
        enfoque: { text: "", trifecta: "pendiente" },
        conflicto: { text: "", trifecta: "pendiente" },
        pasos: { text: "", trifecta: "pendiente" },
        limite: { text: "", trifecta: "pendiente" },
      },
      status: "activo",
      userId: "u1",
      createdAt: new Date(limaAt(2026, 4, 17, 21, 0)),
      tipoFlota: "tiempo",
      aperturaAt: limaAt(2026, 4, 17, 21, 0),
    };
    const withGhost = computeLiveEntropy({ segmentos, vehiculos: [staleGhost], now }).dayStats.entropiaMin;
    assert.equal(withGhost, baseline, "fantasma filtrado no debe cubrir el hueco");
  });

  it("monotonic mantiene pico si el motor crudo baja sin cobertura consciente en now", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 4, 18, 8, 10);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const peak = computeLiveEntropy({ segmentos, vehiculos: [], now }).dayStats.entropiaMin;
    const archivedCover: Vehicle = {
      id: "v-archived",
      titulo: "Sesión cerrada",
      criterioFin: "manual",
      criterioDetalle: "",
      tiempoInicio: new Date(limaAt(2026, 4, 18, 8, 0)),
      ejes: {
        enfoque: { text: "", trifecta: "pendiente" },
        conflicto: { text: "", trifecta: "pendiente" },
        pasos: { text: "", trifecta: "pendiente" },
        limite: { text: "", trifecta: "pendiente" },
      },
      status: "cumplido",
      userId: "u1",
      createdAt: new Date(limaAt(2026, 4, 18, 8, 0)),
      tipoFlota: "tiempo",
      aperturaAt: limaAt(2026, 4, 18, 8, 0),
      cierreAt: limaAt(2026, 4, 18, 8, 5),
      duracionFinal: 5,
    };
    const raw = computeLiveEntropy({
      segmentos,
      vehiculos: [archivedCover],
      now,
      applyMonotonic: false,
    }).dayStats.entropiaMin;
    assert.ok(raw < peak, "histórico cubierto reduce entropía en motor crudo");
    const clamped = computeLiveEntropy({
      segmentos,
      vehiculos: [archivedCover],
      now,
    }).dayStats.entropiaMin;
    assert.ok(clamped + 0.05 >= peak, "sin coverNow el acumulado visible no debe caer bajo el pico");
  });

  it("armEntropyGapOnConsciousClose no ejecuta antes de 300 ms", () => {
    resetLiveEntropyMonotonic();
    mock.timers.enable({ apis: ["setTimeout"] });
    let idleScheduled = false;
    const prevRic = globalThis.requestIdleCallback;
    globalThis.requestIdleCallback = cb => {
      idleScheduled = true;
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 0;
    };
    try {
      const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
      const gapStart = limaAt(2026, 4, 18, 8, 0);
      armEntropyGapOnConsciousClose({
        segmentos,
        vehiculosAfterClose: [],
        cierreAt: gapStart,
      });
      mock.timers.tick(299);
      assert.equal(idleScheduled, false);
      mock.timers.tick(1);
      assert.equal(idleScheduled, true);
    } finally {
      if (prevRic) globalThis.requestIdleCallback = prevRic;
      else delete (globalThis as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
      mock.timers.reset();
    }
  });

  it("reloj por timestamp mantiene entropia estable si vehículos parpadean en Firebase", async () => {
    resetLiveEntropyMonotonic();
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const gapStart = limaAt(2026, 4, 18, 8, 0);
    const t1 = limaAt(2026, 4, 18, 8, 3);
    const t2 = limaAt(2026, 4, 18, 8, 6);
    await withImmediateIdleCallback(async () => {
      armEntropyGapOnConsciousClose({
        segmentos,
        vehiculosAfterClose: [],
        cierreAt: gapStart,
      });
      await new Promise<void>(resolve => setTimeout(resolve, 350));
    });
    const a = computeLiveEntropy({ segmentos, vehiculos: [], now: t1 }).dayStats.entropiaMin;
    const ghostCover: Vehicle = {
      id: "ghost-cover",
      titulo: "Desglosador zombie",
      criterioFin: "manual",
      criterioDetalle: "",
      tiempoInicio: new Date(gapStart),
      ejes: {
        enfoque: { text: "", trifecta: "pendiente" },
        conflicto: { text: "", trifecta: "pendiente" },
        pasos: { text: "", trifecta: "pendiente" },
        limite: { text: "", trifecta: "pendiente" },
      },
      status: "activo",
      userId: "u1",
      createdAt: new Date(gapStart),
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      aperturaAt: gapStart,
      subVehiculos: [{ id: "s1", titulo: "A", status: "cumplido" }],
    };
    const b = computeLiveEntropy({ segmentos, vehiculos: [ghostCover], now: t2 }).dayStats.entropiaMin;
    const c = computeLiveEntropy({ segmentos, vehiculos: [], now: t2 }).dayStats.entropiaMin;
    assert.ok(b + 0.05 >= a, "fantasma no debe reducir entropía");
    assert.equal(b, c, "mismo instante debe dar mismo valor con o sin fantasma");
  });

  it("freeze impide reset a cero si el motor crudo parpadea en hueco", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 4, 18, 8, 15);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00" }];
    const peak = computeLiveEntropy({ segmentos, vehiculos: [], now }).dayStats.entropiaMin;
    assert.ok(peak > 1, "baseline con hueco");
    const archivedCover: Vehicle = {
      id: "v-archived-flicker",
      titulo: "Sesión cerrada",
      criterioFin: "manual",
      criterioDetalle: "",
      tiempoInicio: new Date(limaAt(2026, 4, 18, 8, 0)),
      ejes: {
        enfoque: { text: "", trifecta: "pendiente" },
        conflicto: { text: "", trifecta: "pendiente" },
        pasos: { text: "", trifecta: "pendiente" },
        limite: { text: "", trifecta: "pendiente" },
      },
      status: "cumplido",
      userId: "u1",
      createdAt: new Date(limaAt(2026, 4, 18, 8, 0)),
      tipoFlota: "tiempo",
      aperturaAt: limaAt(2026, 4, 18, 8, 0),
      cierreAt: limaAt(2026, 4, 18, 8, 5),
      duracionFinal: 5,
    };
    const afterStale = computeLiveEntropy({
      segmentos,
      vehiculos: [archivedCover],
      now,
    }).dayStats.entropiaMin;
    assert.ok(
      afterStale + 0.05 >= peak,
      `entropía visible no debe resetear (${peak} → ${afterStale})`
    );
  });

  it("activo cruzando 05:00 sin filtro de anillo aún muestra conquista en motor", () => {
    const now = limaAt(2026, 4, 18, 9, 0);
    const journalStart = getJournalDayStartMs(now);
    const st = computeAnilloEstado({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [{
        autoVerdad: false,
        tipoFlota: "tiempo",
        status: "activo",
        aperturaAt: journalStart - 3600_000,
      }],
      now,
    });
    assert.equal(st.mode, "conquista");
  });
});

describe("inner ring battle metrics", () => {
  it("inicio: terreno restante = plan completo (118 min)", () => {
    const now = limaAt(2026, 4, 18, 21, 2);
    const segmentos = [{ horaInicio: "21:02", horaFin: "23:00" }];
    const tl = buildConcienciaTimeline({ segmentos, vehiculos: [], now });
    assert.equal(tl.metricas.jornadaMin, 118);
    assert.equal(tl.metricas.conquistaArcPct, 0);
    assert.equal(tl.metricas.entropiaArcPct, 100);
    assert.equal(tl.metricas.terrenoRestanteMin, 118);
    assert.equal(tl.metricas.fillPct, 100);
    assert.ok(tl.dayStats.entropiaMin >= 0, "entropía contable independiente del arco");
  });

  it("2 min conquista: morado crece y terreno restante baja", () => {
    const now = limaAt(2026, 4, 18, 21, 4);
    const segStart = limaAt(2026, 4, 18, 21, 2);
    const segmentos = [{ horaInicio: "21:02", horaFin: "23:00" }];
    const vehiculos = [{
      autoVerdad: false,
      tipoFlota: "tiempo",
      status: "activo",
      aperturaAt: segStart,
    }];
    const tl = buildConcienciaTimeline({ segmentos, vehiculos, now });
    assert.ok(tl.metricas.conquistaMin >= 1.9 && tl.metricas.conquistaMin <= 2.1);
    assert.equal(
      tl.metricas.terrenoRestanteMin,
      Math.round((118 - tl.metricas.conquistaMin) * 10) / 10
    );
    assert.ok(tl.metricas.conquistaArcPct >= 1.6 && tl.metricas.conquistaArcPct <= 1.8);
    assert.ok(tl.metricas.entropiaArcPct >= 98.2 && tl.metricas.entropiaArcPct <= 98.4);
  });

  it("patchTimelineEntropy no infla arco interior en modo batalla", () => {
    resetLiveEntropyMonotonic();
    const now = limaAt(2026, 4, 18, 21, 16);
    const segmentos = [{ horaInicio: "21:02", horaFin: "23:00" }];
    const base = buildConcienciaTimeline({ segmentos, vehiculos: [], now });
    const live = computeLiveEntropy({ segmentos, vehiculos: [], now });
    assert.equal(live.metricas.entropiaArcPct, base.metricas.entropiaArcPct);
    assert.ok(live.dayStats.entropiaMin > 0, "entropía contable sigue creciendo en gaps");
  });
});

describe("calcularBalanceConquistaJornada", () => {
  it("entrada tarde: entropía en cierre resta 2 min de gracia por hueco (≠ puntero en vivo)", () => {
    const now = limaAt(2026, 4, 18, 10, 0);
    const segmentos = [{ horaInicio: "08:00", horaFin: "12:00", nombre: "Mañana" }];
    const balance = calcularBalanceConquistaJornada({ segmentos, vehiculos: [], now });
    assert.ok(balance.entropiaMin >= 117 && balance.entropiaMin <= 119, "~118 min (120 − 2 de gracia)");
    assert.equal(balance.conquistaMin, 0);
    assert.equal(
      Math.round((balance.conquistaMin + balance.entropiaMin + balance.vacioMin) * 10) / 10,
      balance.jornadaMin,
      "conquista + entropía + vacío = jornada planificada"
    );
    const st = computeAnilloEstado({ segmentos, vehiculos: [], now });
    assert.equal(st.mode, "entropia", "puntero usa centinela retroactivo sellado");
  });

  it("listRetroactiveCentinelaGapsToPersist propone huecos post-gracia en segmentos", () => {
    const now = limaAt(2026, 4, 18, 10, 0);
    const gaps = listRetroactiveCentinelaGapsToPersist({
      segmentos: [{ horaInicio: "08:00", horaFin: "12:00" }],
      vehiculos: [],
      now,
    });
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].aperturaAt, limaAt(2026, 4, 18, 8, 2));
    assert.equal(gaps[0].cierreAt, now);
  });
});

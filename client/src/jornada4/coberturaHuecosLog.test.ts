import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  appendUnjustifiedPausasToHuecos,
  buildCoberturaHuecoIntervals,
  buildMetricaHuecoIntervals,
  clearCoberturaHuecosLog,
  clipHuecoIntervalsToPlan,
  formatHuecoDuration,
  formatCoberturaHuecosSummary,
  reconcileCoberturaHuecos,
  readCoberturaHuecosEvents,
  resolveHuecoPlanWindows,
  sumCoberturaHuecosMinutes,
  COBERTURA_HUECOS_KEY,
} from "./coberturaHuecosLog.ts";
import { plannedWindowsMs } from "../lib/concienciaTriadaLinea.ts";
import { hasActiveConsciousCoverage } from "../lib/entropyTimePolicy.ts";
import type { Vehicle } from "../lib/persistence.ts";
import { getLimaDayStartMs, getSegmentCalendarDayStartMs } from "../lib/segmentTime.ts";

/** Plan de 24 h del día-jornada: cubre `Date.now()` para tests de transición. */
const PLAN_DIA = [{ horaInicio: "05:00", horaFin: "05:00" }];

function memStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

function vehicle(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return {
    titulo: "x",
    status: "activo",
    userId: "u",
    tipoFlota: "tiempo",
    ...partial,
  } as Vehicle;
}

const prevStorage = (globalThis as { localStorage?: Storage }).localStorage;

describe("coberturaHuecosLog", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: ReturnType<typeof memStorage> }).localStorage =
      memStorage();
    clearCoberturaHuecosLog();
  });

  afterEach(() => {
    if (prevStorage) {
      (globalThis as { localStorage?: Storage }).localStorage = prevStorage;
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  it("abre hueco cuando no hay cobertura y cierra al lanzar", () => {
    const t0 = Date.now();
    const open = reconcileCoberturaHuecos({
      vehicles: [],
      now: t0,
      segmentos: PLAN_DIA,
    });
    assert.equal(open?.kind, "gap_open");

    const covered = [
      vehicle({ id: "v1", titulo: "Prueba", aperturaAt: t0 + 1000 }),
    ];
    const close = reconcileCoberturaHuecos({
      vehicles: covered,
      now: t0 + 60_000,
      coverTitulo: "Prueba",
      segmentos: PLAN_DIA,
    });
    assert.equal(close?.kind, "gap_close");
    assert.equal(close?.titulo, "Prueba");

    const events = readCoberturaHuecosEvents();
    assert.equal(events.length, 2);

    const intervals = buildCoberturaHuecoIntervals(events, t0 + 60_000);
    assert.equal(intervals.length, 1);
    assert.equal(intervals[0]!.open, false);
    assert.equal(intervals[0]!.closedByTitulo, "Prueba");
  });

  it("no duplica gap_open si ya está abierto", () => {
    const t0 = Date.now();
    reconcileCoberturaHuecos({ vehicles: [], now: t0, segmentos: PLAN_DIA });
    const again = reconcileCoberturaHuecos({
      vehicles: [],
      now: t0 + 5000,
      segmentos: PLAN_DIA,
    });
    assert.equal(again, null);
    assert.equal(readCoberturaHuecosEvents().length, 1);
  });

  it("intervalo abierto queda sin end", () => {
    const dayKey = String(getLimaDayStartMs());
    const events = [
      { t: Date.now() - 10_000, kind: "gap_open" as const, dayKey },
    ];
    localStorage.setItem(COBERTURA_HUECOS_KEY, JSON.stringify(events));
    const intervals = buildCoberturaHuecoIntervals(readCoberturaHuecosEvents());
    assert.equal(intervals.length, 1);
    assert.equal(intervals[0]!.open, true);
    assert.equal(intervals[0]!.endMs, null);
  });

  it("formatea duración", () => {
    assert.equal(formatHuecoDuration(0, 5 * 60_000), "5 min");
    assert.equal(formatHuecoDuration(0, 90 * 60_000), "1h 30min");
  });

  it("suma los cortes con la misma regla de cada fila", () => {
    const t0 = Date.now();
    const intervals = [
      { startMs: t0, endMs: t0 + 5 * 60_000, open: false as const },
      { startMs: t0 + 5 * 60_000, endMs: t0 + 21 * 60_000, open: false as const },
      { startMs: t0 + 21 * 60_000, endMs: t0 + 24 * 60_000, open: false as const },
      { startMs: t0 + 24 * 60_000, endMs: t0 + 25 * 60_000, open: false as const },
    ];
    assert.equal(sumCoberturaHuecosMinutes(intervals, t0), 25);
  });

  it("solapes de log + idle no suman 38 h: minutos únicos", () => {
    const t0 = Date.parse("2026-08-19T05:00:00-05:00");
    const overlapping = [
      { startMs: t0, endMs: t0 + 18 * 60 * 60_000, open: false as const },
      { startMs: t0 + 60 * 60_000, endMs: t0 + 20 * 60 * 60_000, open: false as const },
    ];
    assert.equal(sumCoberturaHuecosMinutes(overlapping, t0 + 20 * 60 * 60_000), 20 * 60);
  });

  it("summary habla de cortes sin vehículo, no de impuntualidad", () => {
    assert.equal(formatCoberturaHuecosSummary([]), "Sin cortes de cobertura hoy");
    const closed = [
      { startMs: 1, endMs: 2, open: false as const },
      { startMs: 3, endMs: 4, open: false as const },
    ];
    assert.equal(formatCoberturaHuecosSummary(closed), "2 cortes sin vehículo");
    const open = [{ startMs: 1, endMs: null, open: true as const }];
    assert.match(formatCoberturaHuecosSummary(open), /sin vehículo/);
    assert.doesNotMatch(formatCoberturaHuecosSummary(closed), /hueco|puntual/i);
    const withMinutes = [
      { startMs: 0, endMs: 25 * 60_000, open: false as const },
    ];
    assert.match(formatCoberturaHuecosSummary(withMinutes), /25 min/);
  });

  it("padre pausado sin hijo no cubre: abre hueco", () => {
    const t0 = Date.now();
    const paused = [
      vehicle({
        id: "p1",
        titulo: "Costura",
        aperturaAt: t0 - 60_000,
        interrupcionActiva: true,
        desglosadorPausa: { pausadoAt: t0, subActivoId: "s1" },
      }),
    ];
    assert.equal(hasActiveConsciousCoverage(paused, t0), false);
    const open = reconcileCoberturaHuecos({
      vehicles: paused,
      now: t0,
      segmentos: PLAN_DIA,
    });
    assert.equal(open?.kind, "gap_open");
  });

  it("interrupt hijo sí cubre: no abre hueco", () => {
    const t0 = Date.now();
    const covered = [
      vehicle({
        id: "p1",
        titulo: "Costura",
        aperturaAt: t0 - 60_000,
        interrupcionActiva: true,
        desglosadorPausa: { pausadoAt: t0, subActivoId: "s1" },
      }),
      vehicle({
        id: "c1",
        titulo: "Llamada",
        tipoFlota: "situacion",
        aperturaAt: t0,
        vehiculoPadreDesglosadorId: "p1",
      }),
    ];
    assert.equal(hasActiveConsciousCoverage(covered, t0), true);
    const open = reconcileCoberturaHuecos({
      vehicles: covered,
      now: t0,
      segmentos: PLAN_DIA,
    });
    assert.equal(open, null);
  });

  it("desglosador sin unidad activa no cubre", () => {
    const t0 = Date.now();
    const idle = [
      vehicle({
        id: "p1",
        titulo: "Costura",
        tipoReloj: "desglosador",
        aperturaAt: t0 - 8 * 60 * 60_000,
        subVehiculos: [
          { id: "s1", titulo: "A", status: "cumplido", duracionFinal: 10 * 60 },
          { id: "s2", titulo: "B", status: "pendiente" },
        ],
      }),
    ];
    assert.equal(hasActiveConsciousCoverage(idle, t0), false);
    const open = reconcileCoberturaHuecos({
      vehicles: idle,
      now: t0,
      segmentos: PLAN_DIA,
    });
    assert.equal(open?.kind, "gap_open");
  });

  it("pausa no justificada entra al total de huecos como inconsciente", () => {
    const t0 = Date.parse("2026-08-19T10:00:00-05:00");
    const pauseStart = t0;
    const pauseEnd = t0 + 20 * 60_000;
    const vehicles = [
      vehicle({
        id: "costura",
        status: "archivado",
        aperturaAt: t0 - 60 * 60_000,
        cierreAt: pauseEnd + 60 * 60_000,
        pausas: [{ pausadoAt: pauseStart, reanudadoAt: pauseEnd }],
      }),
    ];
    const merged = appendUnjustifiedPausasToHuecos([], vehicles, pauseEnd + 1000);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.reason, "pausa_no_justificada");
    assert.equal(sumCoberturaHuecosMinutes(merged, pauseEnd), 20);

    const withLog = appendUnjustifiedPausasToHuecos(
      [{ startMs: pauseStart, endMs: pauseEnd, open: false, closedByTitulo: "Ya" }],
      vehicles,
      pauseEnd + 1000
    );
    assert.equal(withLog.length, 1);
    assert.equal(withLog[0]?.closedByTitulo, "Ya");
    assert.equal(sumCoberturaHuecosMinutes(withLog, pauseEnd), 20);
  });

  it("buildMetricaHuecoIntervals une cortes y pausas no justificadas", () => {
    const t0 = Date.parse("2026-08-19T10:00:00-05:00");
    const dayKey = String(getLimaDayStartMs(t0));
    const segs = [{ horaInicio: "09:30", horaFin: "10:12" }];
    const events = [
      { t: t0 - 30 * 60_000, kind: "gap_open" as const, dayKey },
      { t: t0 - 25 * 60_000, kind: "gap_close" as const, dayKey, titulo: "Prueba" },
    ];
    localStorage.setItem(COBERTURA_HUECOS_KEY, JSON.stringify(events));
    const vehicles = [
      vehicle({
        id: "v1",
        status: "archivado",
        aperturaAt: t0 - 2 * 60 * 60_000,
        cierreAt: t0 + 60 * 60_000,
        pausas: [{ pausadoAt: t0, reanudadoAt: t0 + 12 * 60_000 }],
      }),
    ];
    const intervals = buildMetricaHuecoIntervals({
      vehicles,
      now: t0 + 60 * 60_000,
      segmentos: segs,
    });
    assert.equal(sumCoberturaHuecosMinutes(intervals, t0 + 60 * 60_000), 17);
    assert.ok(intervals.some(it => it.closedByTitulo === "Prueba"));
    assert.ok(intervals.some(it => it.reason === "pausa_no_justificada"));
  });

  it("idle del desglosador conquista entra como hueco, recortado al plan", () => {
    const t0 = Date.parse("2026-08-19T05:00:00-05:00");
    const now = Date.parse("2026-08-19T23:00:00-05:00");
    const vehicles = [
      vehicle({
        id: "costura",
        status: "activo",
        tipoReloj: "desglosador",
        tipoFlota: "tiempo",
        aperturaAt: t0,
        subVehiculos: [
          {
            id: "u1",
            titulo: "Corte",
            status: "cumplido",
            aperturaAt: t0 + 2 * 60 * 60_000,
            cierreAt: t0 + 2 * 60 * 60_000 + 20 * 60_000,
            duracionFinal: 20 * 60,
          },
          {
            id: "u2",
            titulo: "Vivo",
            status: "activo",
            aperturaAt: now - 10 * 60_000,
          },
        ],
      }),
    ];
    const intervals = buildMetricaHuecoIntervals({
      vehicles,
      now,
      events: [],
      segmentos: [{ horaInicio: "05:00", horaFin: "23:00" }],
    });
    const total = sumCoberturaHuecosMinutes(intervals, now);
    assert.ok(total >= 17 * 60, `idle ~17.5 h dentro del plan, no 30 min: ${total}`);
    assert.ok(total <= 18 * 60);
  });

  it("antes de que empiece el plan no abre hueco", () => {
    const before = Date.parse("2026-08-19T07:00:00-05:00");
    const open = reconcileCoberturaHuecos({
      vehicles: [],
      now: before,
      segmentos: [{ horaInicio: "09:00", horaFin: "18:00" }],
    });
    assert.equal(open, null);
    assert.equal(readCoberturaHuecosEvents().length, 0);
  });

  it("sin plan no hay hueco, aunque la jornada esté abierta", () => {
    const t0 = Date.parse("2026-08-19T05:00:00-05:00");
    const now = Date.parse("2026-08-19T23:00:00-05:00");
    const open = reconcileCoberturaHuecos({
      vehicles: [],
      now: t0,
      segmentos: [],
    });
    assert.equal(open, null);
    const intervals = buildMetricaHuecoIntervals({
      vehicles: [
        vehicle({
          id: "costura",
          status: "activo",
          tipoReloj: "desglosador",
          aperturaAt: t0,
        }),
      ],
      now,
      events: [],
      segmentos: [],
    });
    assert.equal(intervals.length, 0);
    assert.equal(sumCoberturaHuecosMinutes(intervals, now), 0);
  });

  it("el hueco nace en el horario del plan, no al abrir la jornada", () => {
    const jornadaOpen = Date.parse("2026-08-19T05:00:00-05:00");
    const planStart = Date.parse("2026-08-19T09:00:00-05:00");
    const now = Date.parse("2026-08-19T11:00:00-05:00");
    const dayKey = String(getLimaDayStartMs(now));
    const segs = [{ horaInicio: "09:00", horaFin: "18:00" }];
    localStorage.setItem(
      COBERTURA_HUECOS_KEY,
      JSON.stringify([{ t: jornadaOpen, kind: "gap_open", dayKey }])
    );
    const intervals = buildMetricaHuecoIntervals({
      vehicles: [],
      now,
      segmentos: segs,
    });
    assert.ok(intervals.length >= 1);
    const start = Math.min(...intervals.map(it => it.startMs));
    assert.equal(start, planStart);
    const total = sumCoberturaHuecosMinutes(intervals, now);
    assert.equal(total, 2 * 60);
  });

  it("fuera del plan no se mide, aunque la jornada siga abierta", () => {
    const jornadaOpen = Date.parse("2026-08-19T05:00:00-05:00");
    const planEnd = Date.parse("2026-08-19T18:00:00-05:00");
    const now = Date.parse("2026-08-19T23:00:00-05:00");
    const dayKey = String(getLimaDayStartMs(now));
    const segs = [{ horaInicio: "09:00", horaFin: "18:00" }];
    localStorage.setItem(
      COBERTURA_HUECOS_KEY,
      JSON.stringify([{ t: jornadaOpen, kind: "gap_open", dayKey }])
    );
    const intervals = buildMetricaHuecoIntervals({
      vehicles: [],
      now,
      segmentos: segs,
    });
    const total = sumCoberturaHuecosMinutes(intervals, now);
    assert.equal(total, 9 * 60);
    assert.ok(intervals.every(it => !it.open || (it.endMs != null && it.endMs <= planEnd)));
    const end = Math.max(
      ...intervals.map(it => (it.open ? now : (it.endMs ?? now)))
    );
    assert.ok(end <= planEnd);
    const afterPlan = reconcileCoberturaHuecos({
      vehicles: [],
      now,
      segmentos: segs,
    });
    assert.ok(afterPlan == null || afterPlan.kind === "gap_close");
    if (afterPlan?.kind === "gap_close") {
      assert.ok(afterPlan.t <= planEnd);
    }
  });

  it("plan corto no deja pintar 38 h de hueco", () => {
    const t0 = Date.parse("2026-08-19T05:00:00-05:00");
    const now = Date.parse("2026-08-19T23:00:00-05:00");
    const segs = [{ horaInicio: "09:00", horaFin: "12:00" }];
    const dayKey = String(getLimaDayStartMs(now));
    localStorage.setItem(
      COBERTURA_HUECOS_KEY,
      JSON.stringify([{ t: t0, kind: "gap_open", dayKey }])
    );
    const intervals = buildMetricaHuecoIntervals({
      vehicles: [
        vehicle({
          id: "costura",
          status: "activo",
          tipoReloj: "desglosador",
          aperturaAt: t0,
          subVehiculos: [
            {
              id: "u1",
              status: "cumplido",
              aperturaAt: t0 + 2 * 60 * 60_000,
              cierreAt: t0 + 2 * 60 * 60_000 + 20 * 60_000,
              duracionFinal: 20 * 60,
            },
          ],
        }),
      ],
      now,
      segmentos: segs,
    });
    const total = sumCoberturaHuecosMinutes(intervals, now);
    assert.ok(total <= 3 * 60, `hueco ≤ plan 3 h, no 38 h: ${total}`);
    const plan = resolveHuecoPlanWindows({ segmentos: segs, now });
    const midnight = getSegmentCalendarDayStartMs(now);
    assert.equal(plannedWindowsMs(segs, midnight).length, plan.length);
    const clipped = clipHuecoIntervalsToPlan(
      [
        { startMs: t0, endMs: now, open: true },
        { startMs: t0, endMs: now, open: false, reason: "pausa_no_justificada" },
      ],
      plan,
      now
    );
    assert.equal(sumCoberturaHuecosMinutes(clipped, now), 3 * 60);
  });
});

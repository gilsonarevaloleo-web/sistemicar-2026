import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  buildCoberturaHuecoIntervals,
  clearCoberturaHuecosLog,
  formatHuecoDuration,
  formatCoberturaHuecosSummary,
  reconcileCoberturaHuecos,
  readCoberturaHuecosEvents,
  sumCoberturaHuecosMinutes,
  COBERTURA_HUECOS_KEY,
} from "./coberturaHuecosLog.ts";
import type { Vehicle } from "../lib/persistence.ts";
import { getLimaDayStartMs } from "../lib/segmentTime.ts";

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
    const open = reconcileCoberturaHuecos({ vehicles: [], now: t0 });
    assert.equal(open?.kind, "gap_open");

    const covered = [
      vehicle({ id: "v1", titulo: "Prueba", aperturaAt: t0 + 1000 }),
    ];
    const close = reconcileCoberturaHuecos({
      vehicles: covered,
      now: t0 + 60_000,
      coverTitulo: "Prueba",
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
    reconcileCoberturaHuecos({ vehicles: [], now: t0 });
    const again = reconcileCoberturaHuecos({ vehicles: [], now: t0 + 5000 });
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
      { startMs: t0, endMs: t0 + 16 * 60_000, open: false as const },
      { startMs: t0, endMs: t0 + 3 * 60_000, open: false as const },
      { startMs: t0, endMs: t0 + 1 * 60_000, open: false as const },
    ];
    assert.equal(sumCoberturaHuecosMinutes(intervals, t0), 25);
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
});

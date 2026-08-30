import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Vehicle } from "../lib/persistence.ts";
import {
  buildRevelacionPlanDia,
  formatMinutosHoras,
  formatPlanEndLabel,
  isPlanTerminado,
  readRevelacionPlanDia,
  resolveLastSegmentWindowMs,
  resolvePlanWindowMs,
  sealRevelacionPlanDia,
} from "./revelacionPlanDia.ts";

const FECHA = "2026-08-19";
const SEGS = [
  { horaInicio: "09:00", horaFin: "12:00" },
  { horaInicio: "20:00", horaFin: "23:00" },
];

function lima(hhmm: string): number {
  return Date.parse(`2026-08-19T${hhmm}:00-05:00`);
}

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

function installLocalStorage() {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear();
    return;
  }
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, val: string) => {
      store.set(k, val);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("revelacionPlanDia", () => {
  beforeEach(() => installLocalStorage());

  it("formatMinutosHoras pinta horas del sello", () => {
    assert.equal(formatMinutosHoras(0), "0 min");
    assert.equal(formatMinutosHoras(27), "27 min");
    assert.equal(formatMinutosHoras(258), "4 h 18 min");
    assert.equal(formatMinutosHoras(180), "3 h");
  });

  it("el término del plan es horaFin del último segmento (23:00 Lima)", () => {
    const win = resolvePlanWindowMs(SEGS, lima("22:00"));
    assert.ok(win);
    assert.equal(win.endMs, lima("23:00"));
    assert.equal(formatPlanEndLabel(win.endMs), "23:00");
    assert.equal(isPlanTerminado(SEGS, lima("22:59")), false);
    assert.equal(isPlanTerminado(SEGS, lima("23:00")), true);
  });

  it("la última franja es la de horaFin más tarde", () => {
    const last = resolveLastSegmentWindowMs(SEGS, lima("10:00"));
    assert.ok(last);
    assert.equal(last.startMs, lima("20:00"));
    assert.equal(last.endMs, lima("23:00"));
  });

  it("tras el término: inconsciente = huecos, por conquistar = 0", () => {
    const vehicles = [
      v({
        id: "dir",
        status: "archivado",
        aperturaAt: lima("20:00"),
        cierreAt: lima("21:00"),
        destinoCierre: "peldano",
      }),
      v({
        id: "pre",
        status: "archivado",
        aperturaAt: lima("09:00"),
        cierreAt: lima("10:00"),
        destinoCierre: "presencia",
      }),
    ];
    const r = buildRevelacionPlanDia({
      fecha: FECHA,
      segmentos: SEGS,
      vehicles,
      now: lima("23:05"),
    });
    assert.ok(r);
    assert.equal(r.minutosPlan, 360);
    assert.equal(r.minutosDireccion, 60);
    assert.equal(r.minutosPresencia, 60);
    assert.equal(r.minutosPorConquistar, 0);
    assert.equal(r.minutosInconsciente, 240);
    assert.match(r.headline, /inconsciencia|Dirección|Presencia/);
    assert.equal(r.planEndLabel, "23:00");
  });

  it("sella una sola vez por fecha", () => {
    const params = {
      fecha: FECHA,
      segmentos: SEGS,
      vehicles: [] as Vehicle[],
      now: lima("23:01"),
    };
    const a = sealRevelacionPlanDia("u1", params);
    const b = sealRevelacionPlanDia("u1", {
      ...params,
      vehicles: [
        v({
          id: "late",
          status: "archivado",
          aperturaAt: lima("20:00"),
          cierreAt: lima("23:00"),
          destinoCierre: "peldano",
        }),
      ],
    });
    assert.ok(a);
    assert.equal(a.minutosDireccion, 0);
    assert.equal(b?.minutosDireccion, 0);
    assert.equal(readRevelacionPlanDia("u1", FECHA)?.sealedAt, a.sealedAt);
  });

  it("no sella si el plan aún no terminó", () => {
    const r = sealRevelacionPlanDia("u1", {
      fecha: FECHA,
      segmentos: SEGS,
      vehicles: [],
      now: lima("22:00"),
    });
    assert.equal(r, null);
  });
});

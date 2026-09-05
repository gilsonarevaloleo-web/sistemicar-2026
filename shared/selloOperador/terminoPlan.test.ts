import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  debeRecordarSello,
  formatTerminoLabel,
  resolveTerminoPlanMs,
} from "./terminoPlan.ts";

/** 2026-09-05 23:00 Lima = 2026-09-06 04:00 UTC */
const FIN_23 = Date.UTC(2026, 8, 6, 4, 0, 0);
/** 2026-09-05 17:00 Lima */
const FIN_17 = Date.UTC(2026, 8, 5, 22, 0, 0);

describe("resolveTerminoPlanMs", () => {
  it("el término es la última horaFin, no las 21:00", () => {
    const now = Date.UTC(2026, 8, 5, 18, 0, 0); // 13:00 Lima
    const end = resolveTerminoPlanMs(
      [
        { horaInicio: "08:00", horaFin: "20:00" },
        { horaInicio: "20:00", horaFin: "23:00" },
      ],
      now,
    );
    assert.equal(end, FIN_23);
    assert.equal(formatTerminoLabel(end!), "23:00");
  });

  it("si el plan termina a las 17:00, ese es el término", () => {
    const now = Date.UTC(2026, 8, 5, 18, 0, 0);
    const end = resolveTerminoPlanMs(
      [{ horaInicio: "09:00", horaFin: "17:00" }],
      now,
    );
    assert.equal(end, FIN_17);
    assert.equal(formatTerminoLabel(end!), "17:00");
  });

  it("sin anillo no hay término", () => {
    assert.equal(resolveTerminoPlanMs([], Date.now()), null);
  });
});

describe("debeRecordarSello", () => {
  it("no recuerda si ya está sellado", () => {
    assert.equal(debeRecordarSello(FIN_23 + 1, true, FIN_23), false);
  });

  it("sin plan no recuerda — no inventa las 21:00", () => {
    const las21 = Date.UTC(2026, 8, 6, 2, 0, 0);
    assert.equal(debeRecordarSello(las21, false, null), false);
  });

  it("recuerda al terminar el plan, no antes", () => {
    assert.equal(debeRecordarSello(FIN_23 - 60_000, false, FIN_23), false);
    assert.equal(debeRecordarSello(FIN_23, false, FIN_23), true);
    assert.equal(debeRecordarSello(FIN_17, false, FIN_17), true);
    assert.equal(debeRecordarSello(FIN_17 - 1, false, FIN_17), false);
  });
});

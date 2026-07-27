import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectNewPuertaAlerts,
  collectOpenPuertaWindows,
  resetPuertaAlertDedup,
  shouldDeliverPuertaAlertOnce,
} from "./puertaWindowAlerts";
import { getLimaMinutesFromMidnight, getSegmentCalendarDayStartMs } from "../lib/segmentTime";
import type { SegmentoV5 } from "../lib/persistence";

function seg(
  partial: Partial<SegmentoV5> &
    Pick<SegmentoV5, "id" | "nombre" | "horaInicio" | "horaFin" | "estado">
): SegmentoV5 {
  return {
    color: "#3b82f6",
    icono: "layers",
    eventos: [],
    psGanados: 0,
    ...partial,
  };
}

function limaHHmm(nowMs: number): string {
  const mins = getLimaMinutesFromMidnight(nowMs);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

describe("puertaWindowAlerts", () => {
  it("dedup evita repetir la misma alerta", () => {
    resetPuertaAlertDedup();
    assert.equal(shouldDeliverPuertaAlertOnce("k1", 1000), true);
    assert.equal(shouldDeliverPuertaAlertOnce("k1", 2000), false);
    assert.equal(shouldDeliverPuertaAlertOnce("k1", 1000 + 26 * 60_000), true);
  });

  it("detecta ventana de apertura ±5 min (hora Lima)", () => {
    resetPuertaAlertDedup();
    const now = Date.now();
    void getSegmentCalendarDayStartMs(now);
    const hora = limaHHmm(now);
    const segments = [
      seg({
        id: "s1",
        nombre: "Bloque test",
        horaInicio: hora,
        horaFin: "23:59",
        estado: "pendiente",
      }),
    ];
    const { abrirIds } = collectOpenPuertaWindows(segments, now);
    assert.equal(abrirIds.has("s1"), true);
    const alerts = collectNewPuertaAlerts(segments, now);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]!.kind, "abrir");
    assert.equal(collectNewPuertaAlerts(segments, now).length, 0);
  });

  it("incluye escalamiento anti-miopía (ordinal/total del día)", () => {
    resetPuertaAlertDedup();
    const now = Date.now();
    const hora = limaHHmm(now);
    const segments = [
      seg({
        id: "a",
        nombre: "Mañana",
        horaInicio: "06:00",
        horaFin: "08:00",
        estado: "cerrado_manual",
      }),
      seg({
        id: "b",
        nombre: "Bloque vivo",
        horaInicio: hora,
        horaFin: "23:59",
        estado: "pendiente",
      }),
      seg({
        id: "c",
        nombre: "Tarde",
        horaInicio: "18:00",
        horaFin: "20:00",
        estado: "pendiente",
      }),
    ];
    const alerts = collectNewPuertaAlerts(segments, now);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]!.ordinal, 2);
    assert.equal(alerts[0]!.total, 3);
    assert.match(alerts[0]!.escalamiento, /segunda puerta de 3 del día/);
    assert.match(alerts[0]!.title, /segunda puerta de 3 del día/);
  });
});

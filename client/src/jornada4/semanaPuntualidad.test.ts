import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSegmentCalendarDayStartMs } from "../lib/segmentTime.ts";
import type { SegmentoV5 } from "../lib/persistence.ts";
import { buildDiaPuntualidad, summarizeSemanaPuntualidad } from "./semanaPuntualidad.ts";

const H = 3_600_000;

function seg(id: string, ini: string, fin: string, activadoAt?: number): SegmentoV5 {
  return {
    id,
    nombre: id,
    horaInicio: ini,
    horaFin: fin,
    color: "#fff",
    icono: "sun",
    estado: activadoAt != null ? "cerrado_manual" : "pendiente",
    eventos: [],
    psGanados: 0,
    activadoAt,
  };
}

describe("summarizeSemanaPuntualidad", () => {
  it("agrega puntualidad, racha y mejor/peor día", () => {
    const d0 = getSegmentCalendarDayStartMs();
    const end = d0 + 23 * H;
    const buenDia = buildDiaPuntualidad(
      "2026-01-01",
      [seg("a", "06:00", "08:00", d0 + 6 * H), seg("b", "08:00", "10:00", d0 + 8 * H)],
      end,
      d0
    );
    const malDia = buildDiaPuntualidad(
      "2026-01-02",
      [seg("a", "06:00", "08:00", d0 + 6 * H + 30 * 60_000), seg("b", "08:00", "10:00")],
      end,
      d0
    );
    const vacio = buildDiaPuntualidad("2026-01-03", [], end, d0);
    const r = summarizeSemanaPuntualidad([buenDia, malDia, vacio]);
    assert.equal(r.diasConPlan, 2);
    assert.equal(r.evaluadas, 4);
    assert.equal(r.aTiempo, 2);
    assert.equal(r.puntualidadPct, 50);
    assert.equal(r.mejorRacha, 2);
    assert.equal(r.mejorDia?.fecha, "2026-01-01");
    assert.equal(r.peorDia?.fecha, "2026-01-02");
  });

  it("sin días con plan devuelve nulos", () => {
    const r = summarizeSemanaPuntualidad([buildDiaPuntualidad("2026-01-01", [], 0, 0)]);
    assert.equal(r.puntualidadPct, null);
    assert.equal(r.disciplinaMediaPct, null);
  });
});

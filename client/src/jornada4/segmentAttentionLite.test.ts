import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Planilla, SegmentoV5 } from "../lib/persistence.ts";
import {
  applyJornada4SegmentAttention,
  collectAutoAperturaSegIds,
} from "./segmentAttentionLite.ts";

function seg(partial: Partial<SegmentoV5> & Pick<SegmentoV5, "id">): SegmentoV5 {
  return {
    nombre: "Seg",
    horaInicio: "06:13",
    horaFin: "07:00",
    color: "#0f0",
    icono: "layers",
    estado: "pendiente",
    eventos: [],
    psGanados: 0,
    ...partial,
  };
}

function planillaOf(segmentos: SegmentoV5[], fecha = "2026-07-25"): Planilla {
  return {
    id: "p1",
    fecha,
    segmentos,
    createdAt: "2026-07-25T05:00:00.000Z",
    updatedAt: "2026-07-25T05:00:00.000Z",
  };
}

/** 2026-07-25 13:26 Lima = 18:26 UTC */
const AFTERNOON_MS = Date.parse("2026-07-25T18:26:00.000Z");
/** 2026-07-25 06:15 Lima = 11:15 UTC (dentro de ventana inicio 06:13 ±5 → 06:08–06:18) */
const OPEN_WINDOW_MS = Date.parse("2026-07-25T11:15:00.000Z");
/** 2026-07-25 06:25 Lima = past open window, before end */
const PAST_OPEN_MS = Date.parse("2026-07-25T11:25:00.000Z");

describe("applyJornada4SegmentAttention", () => {
  it("marca entropía un segmento activo cuyo fin ya pasó (bug barra/ACTIVO eterno)", () => {
    const p = planillaOf([
      seg({
        id: "s1",
        nombre: "Desarrollo matinal",
        estado: "activo",
        activadoAt: OPEN_WINDOW_MS,
        psGanados: 2,
      }),
    ]);
    const r = applyJornada4SegmentAttention(p, AFTERNOON_MS);
    assert.equal(r.changed, true);
    assert.equal(r.planilla.segmentos[0].estado, "entropia");
    assert.ok(r.events.some(e => e.type === "entropia" && e.segId === "s1"));
  });

  it("auto-abre pendiente si se perdió la ventana de puerta", () => {
    const p = planillaOf([
      seg({
        id: "s2",
        nombre: "Bloque",
        horaInicio: "06:13",
        horaFin: "10:00",
        estado: "pendiente",
      }),
    ]);
    const r = applyJornada4SegmentAttention(p, PAST_OPEN_MS);
    assert.equal(r.changed, true);
    assert.equal(r.planilla.segmentos[0].estado, "activo");
    assert.equal(r.planilla.segmentos[0].puertaSistema, true);
    assert.deepEqual(collectAutoAperturaSegIds(r.events), ["s2"]);
  });

  it("no muta si el segmento está dentro de ventana y pendiente", () => {
    const p = planillaOf([
      seg({
        id: "s3",
        estado: "pendiente",
        horaInicio: "06:13",
        horaFin: "07:00",
      }),
    ]);
    const r = applyJornada4SegmentAttention(p, OPEN_WINDOW_MS);
    assert.equal(r.changed, false);
    assert.equal(r.planilla.segmentos[0].estado, "pendiente");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Planilla, SegmentoV5 } from "../lib/persistence.ts";
import { getJournalDateString, segmentWindowMs } from "../lib/segmentTime.ts";
import {
  applyJornada4AttentionCycle,
  canCerrarPuertaJ4,
  computePuertaPanorama,
  formatJ4AttentionToast,
  J4_PUERTA_MANTRA,
} from "./segmentAttentionJ4.ts";

function seg(
  partial: Partial<SegmentoV5> &
    Pick<SegmentoV5, "id" | "nombre" | "horaInicio" | "horaFin">
): SegmentoV5 {
  return {
    color: "#fff",
    icono: "o",
    estado: "pendiente",
    eventos: [],
    psGanados: 0,
    ...partial,
  };
}

describe("segmentAttentionJ4", () => {
  const dayStart = new Date("2026-05-18T00:00:00-05:00").getTime();

  it("auto-abre pendiente pasado de ventana con −2 y puertaSistema", () => {
    const { start } = segmentWindowMs("13:00", "14:30", dayStart);
    const nowMs = start + 6 * 60000;
    const planilla: Planilla = {
      id: "p1",
      fecha: getJournalDateString(nowMs),
      segmentos: [seg({ id: "a", nombre: "Almuerzo", horaInicio: "13:00", horaFin: "14:30" })],
      createdAt: "",
      updatedAt: "",
    };
    const result = applyJornada4AttentionCycle(planilla, nowMs, { maxTransitions: 8 });
    assert.equal(result.changed, true);
    assert.equal(result.planilla.segmentos[0]!.estado, "activo");
    assert.equal(result.planilla.segmentos[0]!.puertaSistema, true);
    assert.equal(result.planilla.segmentos[0]!.psGanados, -2);
    assert.equal(result.events[0]!.type, "auto_apertura");
    const toast = formatJ4AttentionToast(result.events[0]!);
    assert.match(toast.description, /−2/);
    assert.match(toast.description, new RegExp(J4_PUERTA_MANTRA));
  });

  it("marca entropía si el segmento ya terminó sin abrir", () => {
    const { end } = segmentWindowMs("07:30", "08:30", dayStart);
    const nowMs = end + 10 * 60000;
    const planilla: Planilla = {
      id: "p1",
      fecha: getJournalDateString(nowMs),
      segmentos: [seg({ id: "a", nombre: "Familia", horaInicio: "07:30", horaFin: "08:30" })],
      createdAt: "",
      updatedAt: "",
    };
    const result = applyJornada4AttentionCycle(planilla, nowMs, { maxTransitions: 8 });
    assert.equal(result.planilla.segmentos[0]!.estado, "entropia");
    assert.equal(result.events[0]!.type, "entropia");
  });

  it("panorama resume conscientes / sistema / saldo", () => {
    const panorama = computePuertaPanorama([
      seg({
        id: "1",
        nombre: "A",
        horaInicio: "07:00",
        horaFin: "08:00",
        estado: "cerrado_manual",
        psGanados: 4,
      }),
      seg({
        id: "2",
        nombre: "B",
        horaInicio: "09:00",
        horaFin: "10:00",
        estado: "activo",
        puertaSistema: true,
        psGanados: -2,
      }),
      seg({
        id: "3",
        nombre: "C",
        horaInicio: "11:00",
        horaFin: "12:00",
        estado: "pendiente",
      }),
    ]);
    assert.equal(panorama.total, 3);
    assert.equal(panorama.conscientes, 1);
    assert.equal(panorama.activasSistema, 1);
    assert.equal(panorama.pendientes, 1);
    assert.equal(panorama.saldoPs, 2);
    assert.match(panorama.headline, /1\/3/);
    assert.equal(panorama.mantra, J4_PUERTA_MANTRA);
  });

  it("permite cerrar puerta de sistema fuera de ventana de fin", () => {
    const sistema = seg({
      id: "s",
      nombre: "X",
      horaInicio: "13:00",
      horaFin: "14:30",
      estado: "activo",
      puertaSistema: true,
    });
    assert.equal(canCerrarPuertaJ4(sistema, Date.now(), false), true);
    const consciente = { ...sistema, puertaSistema: false };
    assert.equal(canCerrarPuertaJ4(consciente, Date.now(), false), false);
    assert.equal(canCerrarPuertaJ4(consciente, Date.now(), true), true);
  });
});

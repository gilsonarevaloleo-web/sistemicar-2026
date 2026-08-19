import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SegmentoV5 } from "../lib/persistence.ts";
import { getLimaDayStartMs, segmentWindowMs } from "../lib/segmentTime.ts";
import {
  computeDisciplinaPlanDia,
  formatTardanzaPuertaLabel,
  pesoEntradaPct,
  puntualidadDesdeTardanzaMin,
  puntualidadPuertaKind,
  summarizePuntualidadPuertas,
} from "./disciplinaPlanDia.ts";

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

describe("disciplinaPlanDia", () => {
  const dayStart = getLimaDayStartMs(Date.UTC(2026, 4, 18, 15, 0, 0));

  it("peso: 5 segmentos → 20% cada uno", () => {
    assert.equal(pesoEntradaPct(5), 20);
    assert.equal(pesoEntradaPct(4), 25);
    assert.equal(pesoEntradaPct(1), 100);
  });

  it("tardanza en minutos resta del 100 (20 min → 80, 30 → 70)", () => {
    assert.equal(puntualidadDesdeTardanzaMin(0), 100);
    assert.equal(puntualidadDesdeTardanzaMin(20), 80);
    assert.equal(puntualidadDesdeTardanzaMin(30), 70);
    assert.equal(puntualidadDesdeTardanzaMin(120), 0);
  });

  it("5 segmentos: 1ª tardía 20 min + 2ª puntual → 36% del día", () => {
    const s1 = segmentWindowMs("08:00", "10:00", dayStart);
    const s2 = segmentWindowMs("10:00", "12:00", dayStart);
    const segmentos = [
      seg({
        id: "a",
        nombre: "Uno",
        horaInicio: "08:00",
        horaFin: "10:00",
        estado: "cerrado_manual",
        activadoAt: s1.start + 20 * 60_000,
      }),
      seg({
        id: "b",
        nombre: "Dos",
        horaInicio: "10:00",
        horaFin: "12:00",
        estado: "activo",
        activadoAt: s2.start,
      }),
      seg({ id: "c", nombre: "Tres", horaInicio: "13:00", horaFin: "14:00" }),
      seg({ id: "d", nombre: "Cuatro", horaInicio: "15:00", horaFin: "16:00" }),
      seg({ id: "e", nombre: "Cinco", horaInicio: "17:00", horaFin: "18:00" }),
    ];
    const r = computeDisciplinaPlanDia({
      segmentos,
      dayStartMs: dayStart,
      nowMs: s2.start + 5 * 60_000,
    });
    assert.equal(r.pesoPorEntrada, 20);
    assert.equal(r.entradas[0]!.puntualidadPct, 80);
    assert.equal(r.entradas[0]!.contribucionPct, 16);
    assert.equal(r.entradas[1]!.puntualidadPct, 100);
    assert.equal(r.entradas[1]!.contribucionPct, 20);
    assert.equal(r.porcentajeDia, 36);
    assert.equal(r.entradasContabilizadas, 2);
    assert.equal(r.fase, "en_curso");
  });

  it("ventana perdida sin puerta → cupo a 0 y suma", () => {
    const s1 = segmentWindowMs("08:00", "10:00", dayStart);
    const segmentos = [
      seg({ id: "a", nombre: "Uno", horaInicio: "08:00", horaFin: "10:00" }),
      seg({ id: "b", nombre: "Dos", horaInicio: "14:00", horaFin: "16:00" }),
    ];
    // Pasada la ventana ±5 de las 08:00, aún dentro del segmento
    const r = computeDisciplinaPlanDia({
      segmentos,
      dayStartMs: dayStart,
      nowMs: s1.start + 10 * 60_000,
    });
    assert.equal(r.pesoPorEntrada, 50);
    assert.equal(r.entradas[0]!.estado, "contabilizada");
    assert.equal(r.entradas[0]!.contribucionPct, 0);
    assert.equal(r.porcentajeDia, 0);
    assert.equal(r.entradas[1]!.estado, "pendiente");
  });

  it("puerta de sistema no suma puntualidad", () => {
    const s1 = segmentWindowMs("08:00", "10:00", dayStart);
    const segmentos = [
      seg({
        id: "a",
        nombre: "Uno",
        horaInicio: "08:00",
        horaFin: "10:00",
        estado: "entropia",
        activadoAt: s1.start + 15 * 60_000,
        puertaSistema: true,
      }),
    ];
    const r = computeDisciplinaPlanDia({
      segmentos,
      dayStartMs: dayStart,
      nowMs: s1.end + 1000,
    });
    assert.equal(r.porcentajeDia, 0);
    assert.equal(r.entradas[0]!.tieneEntrada, false);
  });

  it("puntualidad de puerta: a tiempo / tarde / sin entrada, no es hueco de cobertura", () => {
    const s1 = segmentWindowMs("08:00", "10:00", dayStart);
    const s2 = segmentWindowMs("10:00", "12:00", dayStart);
    const segmentos = [
      seg({
        id: "a",
        nombre: "Uno",
        horaInicio: "08:00",
        horaFin: "10:00",
        estado: "cerrado_manual",
        activadoAt: s1.start,
      }),
      seg({
        id: "b",
        nombre: "Dos",
        horaInicio: "10:00",
        horaFin: "12:00",
        estado: "cerrado_manual",
        activadoAt: s2.start + 12 * 60_000,
      }),
      seg({ id: "c", nombre: "Tres", horaInicio: "13:00", horaFin: "14:00" }),
    ];
    const s3 = segmentWindowMs("13:00", "14:00", dayStart);
    const r = computeDisciplinaPlanDia({
      segmentos,
      dayStartMs: dayStart,
      nowMs: s3.end + 1000,
    });
    assert.equal(puntualidadPuertaKind(r.entradas[0]!), "a_tiempo");
    assert.equal(formatTardanzaPuertaLabel(r.entradas[0]!), "a tiempo");
    assert.equal(puntualidadPuertaKind(r.entradas[1]!), "tardia");
    assert.equal(formatTardanzaPuertaLabel(r.entradas[1]!), "+12′");
    assert.equal(puntualidadPuertaKind(r.entradas[2]!), "sin_entrada");
    assert.equal(formatTardanzaPuertaLabel(r.entradas[2]!), "sin entrada");
    const sum = summarizePuntualidadPuertas(r.entradas);
    assert.equal(sum.aTiempo, 1);
    assert.equal(sum.tardias, 1);
    assert.equal(sum.sinEntrada, 1);
    assert.equal(sum.tardanzaMediaMin, 12);
    assert.match(sum.headline, /Puntualidad de puertas/);
    assert.match(sum.headline, /a tiempo/);
    assert.doesNotMatch(sum.headline, /cobertura|sin vehículo/i);
  });
});

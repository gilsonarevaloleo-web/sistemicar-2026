import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SegmentoV5, Vehicle } from "./persistence.ts";
import {
  computeDisciplinaDia,
  formatDisciplinaValorPrincipal,
  isTrabajoConsciente,
} from "./disciplinaEngine.ts";
import { getLimaDayStartMs, segmentWindowMs } from "./segmentTime.ts";

function seg(
  partial: Partial<SegmentoV5> & Pick<SegmentoV5, "id" | "nombre" | "horaInicio" | "horaFin">
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

function veh(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: "Test",
    criterioFin: "circunstancia",
    criterioDetalle: "",
    tiempoInicio: new Date(),
    ejes: {
      enfoque: { text: "", trifecta: "omitir" },
      conflicto: { text: "", trifecta: "omitir" },
      pasos: { text: "", trifecta: "omitir" },
      limite: { text: "", trifecta: "omitir" },
    },
    status: "activo",
    userId: "u1",
    createdAt: new Date(),
    ...partial,
  };
}

describe("isTrabajoConsciente", () => {
  it("excluye centinela y descanso", () => {
    assert.equal(isTrabajoConsciente(veh({ id: "a", autoVerdad: true })), false);
    assert.equal(isTrabajoConsciente(veh({ id: "b", tipoFlota: "descanso" })), false);
    assert.equal(isTrabajoConsciente(veh({ id: "c", tipoFlota: "tiempo" })), true);
  });
});

describe("computeDisciplinaDia", () => {
  const limaDayStart = getLimaDayStartMs(Date.UTC(2026, 4, 18, 15, 0, 0));

  it("delta 60 min desde inicio: puntualidad 40 (100−60) y peso 100%", () => {
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00", activadoAt: start + 2 * 60000, estado: "activo" })];
    const apertura = start + 60 * 60000;
    const nowMs = end + 60000;
    const vehicles = [
      veh({
        id: "v1",
        tipoFlota: "tiempo",
        tipoReloj: "produccion",
        segmentoOrigen: "Otro",
        aperturaAt: apertura,
      }),
    ];
    const r = computeDisciplinaDia({ segmentos, vehicles, dayStartMs: limaDayStart, nowMs });
    // Entrada del plan = puerta (activadoAt +2 min), no el vehículo a +60.
    assert.equal(r.segmentos[0]?.deltaDesdeInicioMin, 2);
    assert.equal(r.segmentos[0]?.scoreSegmento, 98);
    assert.equal(r.segmentos[0]?.sinEntrada, false);
    assert.equal(r.cobertura.conEntrada, 1);
    assert.equal(r.cobertura.base, 1);
    assert.equal(r.puntualidad.pct, 98);
    assert.equal(r.indiceDisciplina, 98);
    assert.equal(r.faseJornada, "cierre");
  });

  it("sin puerta: tardanza del vehículo 20 min → score 80 e índice 80 (1 seg)", () => {
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00" })];
    const vehicles = [
      veh({
        id: "v1",
        tipoFlota: "tiempo",
        aperturaAt: start + 20 * 60_000,
      }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: end + 60000,
    });
    assert.equal(r.segmentos[0]?.deltaDesdeInicioMin, 20);
    assert.equal(r.segmentos[0]?.scoreSegmento, 80);
    assert.equal(r.indiceDisciplina, 80);
  });

  it("5 segmentos: 1ª +20 min (80) + 2ª puntual → índice 36", () => {
    const s1 = segmentWindowMs("08:00", "09:00", limaDayStart);
    const s2 = segmentWindowMs("09:00", "10:00", limaDayStart);
    const s3 = segmentWindowMs("10:00", "11:00", limaDayStart);
    const segmentos = [
      seg({
        id: "a",
        nombre: "A",
        horaInicio: "08:00",
        horaFin: "09:00",
        estado: "cerrado_manual",
        activadoAt: s1.start + 20 * 60_000,
      }),
      seg({
        id: "b",
        nombre: "B",
        horaInicio: "09:00",
        horaFin: "10:00",
        estado: "activo",
        activadoAt: s2.start,
      }),
      seg({ id: "c", nombre: "C", horaInicio: "11:00", horaFin: "12:00" }),
      seg({ id: "d", nombre: "D", horaInicio: "13:00", horaFin: "14:00" }),
      seg({ id: "e", nombre: "E", horaInicio: "15:00", horaFin: "16:00" }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles: [],
      dayStartMs: limaDayStart,
      nowMs: s2.start + 5 * 60_000,
    });
    assert.equal(r.segmentos[0]?.scoreSegmento, 80);
    assert.equal(r.segmentos[1]?.scoreSegmento, 100);
    assert.equal(r.indiceDisciplina, 36);
  });

  it("cuenta entrada temporal aunque segmentoOrigen sea otro", () => {
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00" })];
    const vehicles = [
      veh({
        id: "v1",
        tipoFlota: "tiempo",
        segmentoOrigen: "Manana",
        aperturaAt: start + 30 * 60000,
      }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: end + 60000,
    });
    assert.equal(r.segmentos[0]?.primerEntradaAt, start + 30 * 60000);
  });

  it("delta desde puerta cuando activadoAt manual", () => {
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const puerta = start + 2 * 60000;
    const segmentos = [
      seg({
        id: "s1",
        nombre: "Costura",
        horaInicio: "08:00",
        horaFin: "10:00",
        activadoAt: puerta,
        estado: "activo",
      }),
    ];
    const entrada = start + 60 * 60000;
    const vehicles = [veh({ id: "v1", tipoFlota: "tiempo", aperturaAt: entrada })];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: end + 60000,
    });
    assert.equal(r.segmentos[0]?.deltaDesdePuertaMin, 58);
    assert.equal(r.segmentos[0]?.puertaManual, true);
  });

  it("sinEntrada cuando ventana cerrada sin vehiculos", () => {
    const { end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00" })];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles: [],
      dayStartMs: limaDayStart,
      nowMs: end + 60000,
    });
    assert.equal(r.segmentos[0]?.sinEntrada, true);
    assert.equal(r.segmentos[0]?.scoreSegmento, 0);
    assert.equal(r.sinEntrada, 1);
  });

  it("centinela no cuenta", () => {
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00" })];
    const vehicles = [veh({ id: "v1", autoVerdad: true, aperturaAt: start + 60000 })];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: end + 60000,
    });
    assert.equal(r.segmentos[0]?.sinEntrada, true);
  });

  it("montaje situacional detectado", () => {
    const costuraStart = segmentWindowMs("10:00", "12:00", limaDayStart).start;
    const segmentos = [
      seg({ id: "s2", nombre: "Costura", horaInicio: "10:00", horaFin: "12:00" }),
    ];
    const vehicles = [
      veh({
        id: "v1",
        tipoFlota: "situacion",
        segmentoOrigen: "Manana",
        aperturaAt: costuraStart - 30 * 60000,
        status: "activo",
      }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: costuraStart + 5 * 60000,
    });
    assert.equal(r.segmentos[0]?.montaje, true);
    assert.equal(r.montajes, 1);
  });

  it("estudioTipos agrega conteos por tipo", () => {
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00" })];
    const vehicles = [
      veh({ id: "v1", tipoFlota: "tiempo", tipoReloj: "desglosador", aperturaAt: start + 60000 }),
      veh({ id: "v2", tipoFlota: "tiempo", tipoReloj: "desglosador", aperturaAt: start + 120000 }),
      veh({ id: "v3", tipoFlota: "situacion", aperturaAt: start + 180000 }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: end + 60000,
    });
    const desg = r.estudioTipos.find(e => e.tipoReloj === "desglosador");
    assert.equal(desg?.count, 2);
  });

  it("pre_jornada antes del primer segmento", () => {
    const { start } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const segmentos = [
      seg({ id: "s1", nombre: "Costura", horaInicio: "08:00", horaFin: "10:00" }),
      seg({ id: "s2", nombre: "Tarde", horaInicio: "14:00", horaFin: "16:00" }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles: [],
      dayStartMs: limaDayStart,
      nowMs: start - 60_000,
    });
    assert.equal(r.faseJornada, "pre_jornada");
    assert.equal(r.indiceDisciplina, 0);
    assert.equal(r.cobertura.pct, null);
    assert.equal(formatDisciplinaValorPrincipal(r), "2 seg · 08:00");
  });

  it("cobertura acumulada 2/3 segmentos evaluados", () => {
    const s1 = segmentWindowMs("08:00", "10:00", limaDayStart);
    const s2 = segmentWindowMs("10:00", "12:00", limaDayStart);
    const s3 = segmentWindowMs("14:00", "16:00", limaDayStart);
    const segmentos = [
      seg({ id: "s1", nombre: "A", horaInicio: "08:00", horaFin: "10:00" }),
      seg({ id: "s2", nombre: "B", horaInicio: "10:00", horaFin: "12:00" }),
      seg({ id: "s3", nombre: "C", horaInicio: "14:00", horaFin: "16:00" }),
    ];
    const vehicles = [
      veh({ id: "v1", tipoFlota: "tiempo", aperturaAt: s1.start + 60000 }),
      veh({ id: "v2", tipoFlota: "tiempo", aperturaAt: s2.start + 60000 }),
    ];
    const r = computeDisciplinaDia({
      segmentos,
      vehicles,
      dayStartMs: limaDayStart,
      nowMs: s3.end + 60000,
    });
    assert.equal(r.cobertura.conEntrada, 2);
    assert.equal(r.cobertura.base, 3);
    assert.equal(r.cobertura.pct, 67);
    assert.equal(r.sinEntrada, 1);
    assert.equal(r.faseJornada, "cierre");
  });
});

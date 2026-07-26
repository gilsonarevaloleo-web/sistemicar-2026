import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SegmentoV5, Vehicle } from "./persistence.ts";
import { getLimaDayStartMs, segmentWindowMs } from "./segmentTime.ts";
import {
  buildDisciplinaLiteInputSig,
  computeDisciplinaLite,
} from "./disciplinaLiteCompute.ts";

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

describe("disciplinaLiteCompute", () => {
  it("sin segmentos: hint de crear plan", () => {
    const model = computeDisciplinaLite({
      segmentos: [],
      vehicles: [],
      now: Date.UTC(2026, 4, 18, 15, 0, 0),
    });
    assert.equal(model.sinSegmentos, true);
    assert.equal(model.needsEntrada, false);
    assert.match(model.subheadline, /Crea un segmento/);
  });

  it("bloque en curso sin vehículo → needsEntrada", () => {
    const limaDayStart = getLimaDayStartMs(Date.UTC(2026, 4, 18, 15, 0, 0));
    const { start } = segmentWindowMs("08:00", "12:00", limaDayStart);
    const now = start + 30 * 60000;
    const model = computeDisciplinaLite({
      segmentos: [
        seg({
          id: "s1",
          nombre: "Mañana",
          horaInicio: "08:00",
          horaFin: "12:00",
          estado: "activo",
          activadoAt: start,
        }),
      ],
      vehicles: [],
      segmentoActivoId: "s1",
      now,
    });
    assert.equal(model.needsEntrada, true);
    assert.equal(model.segmentoActivoNombre, "Mañana");
    assert.ok(model.segmentoHint);
  });

  it("entrada consciente apaga needsEntrada y sube índice", () => {
    const limaDayStart = getLimaDayStartMs(Date.UTC(2026, 4, 18, 15, 0, 0));
    const { start, end } = segmentWindowMs("08:00", "10:00", limaDayStart);
    const apertura = start + 10 * 60000;
    const model = computeDisciplinaLite({
      segmentos: [
        seg({
          id: "s1",
          nombre: "Costura",
          horaInicio: "08:00",
          horaFin: "10:00",
          estado: "cerrado_manual",
          activadoAt: start,
          cerradoAt: end,
        }),
      ],
      vehicles: [
        veh({
          id: "v1",
          tipoFlota: "tiempo",
          tipoReloj: "desglosador",
          aperturaAt: apertura,
          status: "cumplido",
        }),
      ],
      segmentoActivoId: "s1",
      now: end + 60000,
    });
    assert.equal(model.needsEntrada, false);
    assert.ok(model.indice > 0);
    assert.ok(model.coberturaPct != null && model.coberturaPct > 0);
  });

  it("firma cambia al abrir puerta o lanzar", () => {
    const segs = [
      seg({ id: "s1", nombre: "A", horaInicio: "08:00", horaFin: "10:00" }),
    ];
    const a = buildDisciplinaLiteInputSig(segs, [], "s1");
    const b = buildDisciplinaLiteInputSig(
      [
        seg({
          id: "s1",
          nombre: "A",
          horaInicio: "08:00",
          horaFin: "10:00",
          estado: "activo",
          activadoAt: 1,
        }),
      ],
      [],
      "s1"
    );
    const c = buildDisciplinaLiteInputSig(
      segs,
      [veh({ id: "v1", aperturaAt: 123, tipoFlota: "tiempo" })],
      "s1"
    );
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });
});

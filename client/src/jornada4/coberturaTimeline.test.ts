import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCoberturaTimeline,
  resolveCoberturaKind,
} from "./coberturaTimeline.ts";
import type { SegmentoV5, Vehicle } from "../lib/persistence.ts";

function seg(
  partial: Partial<SegmentoV5> & Pick<SegmentoV5, "id" | "nombre" | "horaInicio" | "horaFin">
): SegmentoV5 {
  return {
    color: "#fff",
    icono: "sun",
    estado: "pendiente",
    eventos: [],
    psGanados: 0,
    ...partial,
  };
}

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: "Unidad",
    status: "activo",
    tipoFlota: "tiempo",
    ...partial,
  } as Vehicle;
}

describe("resolveCoberturaKind", () => {
  it("activo cubierto → ahora", () => {
    assert.equal(resolveCoberturaKind({ estado: "activo" }, true, true), "activo");
  });

  it("activo sin vehículo → hueco", () => {
    assert.equal(resolveCoberturaKind({ estado: "activo" }, false, false), "hueco");
  });

  it("entropía / puerta sistema → hueco", () => {
    assert.equal(resolveCoberturaKind({ estado: "entropia" }, false, false), "hueco");
    assert.equal(
      resolveCoberturaKind({ estado: "pendiente", puertaSistema: true }, false, false),
      "hueco"
    );
  });

  it("cerrado con rastro → cubierto", () => {
    assert.equal(
      resolveCoberturaKind({ estado: "cerrado_manual" }, true, false),
      "cubierto"
    );
  });

  it("pendiente → pendiente", () => {
    assert.equal(resolveCoberturaKind({ estado: "pendiente" }, false, false), "pendiente");
  });
});

describe("buildCoberturaTimeline", () => {
  it("ordena por hora y marca el activo cubierto", () => {
    const nodes = buildCoberturaTimeline({
      segmentos: [
        seg({ id: "b", nombre: "Tarde", horaInicio: "14:00", horaFin: "18:00" }),
        seg({
          id: "a",
          nombre: "Mañana",
          horaInicio: "06:00",
          horaFin: "12:00",
          estado: "activo",
        }),
      ],
      vehicles: [vehicle({ id: "v1", titulo: "Desglose", segmentoId: "a" })],
    });
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0]!.title, "Mañana");
    assert.equal(nodes[0]!.kind, "activo");
    assert.equal(nodes[0]!.detail, "Desglose");
    assert.equal(nodes[0]!.timeLabel, "06:00–12:00");
    assert.equal(nodes[1]!.kind, "pendiente");
  });

  it("activo sin flota → hueco", () => {
    const nodes = buildCoberturaTimeline({
      segmentos: [
        seg({
          id: "a",
          nombre: "Foco",
          horaInicio: "09:00",
          horaFin: "11:00",
          estado: "activo",
        }),
      ],
      vehicles: [],
    });
    assert.equal(nodes[0]!.kind, "hueco");
  });
});

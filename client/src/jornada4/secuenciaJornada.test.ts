import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSegmentCalendarDayStartMs } from "../lib/segmentTime.ts";
import type { SegmentoV5, Vehicle } from "../lib/persistence.ts";
import {
  buildSecuenciaJornadaNodes,
  formatSecuenciaStatusLabel,
} from "./secuenciaJornada.ts";

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

describe("formatSecuenciaStatusLabel", () => {
  it("pendiente + pendiente no duplica", () => {
    assert.equal(formatSecuenciaStatusLabel("pendiente", "pendiente"), "Pendiente");
  });

  it("combina puerta, cobertura y vehículo", () => {
    assert.equal(
      formatSecuenciaStatusLabel("foco", "activo", "Revisión de proyecto"),
      "Foco · Ahora · Revisión de proyecto"
    );
    assert.equal(
      formatSecuenciaStatusLabel("fracaso", "hueco"),
      "Fracaso · Sin cobertura"
    );
    assert.equal(
      formatSecuenciaStatusLabel("logro", "cubierto", "Casaca"),
      "Logro · Cubierto · Casaca"
    );
  });
});

describe("buildSecuenciaJornadaNodes", () => {
  it("pinta activo consciente en oro y entropía en rojo", () => {
    const dayStart = getSegmentCalendarDayStartMs();
    const nodes = buildSecuenciaJornadaNodes({
      segmentos: [
        seg({
          id: "a",
          nombre: "Mañana",
          horaInicio: "06:00",
          horaFin: "10:00",
          estado: "entropia",
        }),
        seg({
          id: "b",
          nombre: "Foco",
          horaInicio: "10:00",
          horaFin: "14:00",
          estado: "activo",
        }),
      ],
      vehicles: [
        {
          id: "v1",
          titulo: "Revisión de proyecto",
          status: "activo",
          tipoFlota: "tiempo",
          segmentoId: "b",
        } as Vehicle,
      ],
      nowMs: dayStart + 11 * 60 * 60 * 1000,
      dayStartMs: dayStart,
    });
    const manana = nodes.find(n => n.segmentoId === "a");
    const foco = nodes.find(n => n.segmentoId === "b");
    assert.equal(manana?.puertaKind, "fracaso");
    assert.match(manana?.puerta.borderColor ?? "", /#FF2A2A/i);
    assert.equal(foco?.puertaKind, "foco");
    assert.match(foco?.puerta.borderColor ?? "", /#D4AF37/i);
    assert.equal(foco?.puerta.pulse, true);
    assert.match(foco?.statusLabel ?? "", /Foco · Ahora/);
  });
});

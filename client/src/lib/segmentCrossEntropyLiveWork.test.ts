import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SegmentoV5, Vehicle } from "./persistence.ts";
import { segmentWindowMs } from "./segmentTime.ts";
import {
  CRUCE_GRACE_MIN,
  evaluateSegmentCrossEntropy,
  isVehicleFromPreviousSegment,
} from "./segmentCrossEntropyEngine.ts";

function seg(partial: Partial<SegmentoV5> & Pick<SegmentoV5, "id" | "estado">): SegmentoV5 {
  return {
    nombre: partial.nombre ?? "Test",
    horaInicio: partial.horaInicio ?? "09:00",
    horaFin: partial.horaFin ?? "12:00",
    color: "#fff",
    icono: "sun",
    eventos: [],
    psGanados: 0,
    ...partial,
  };
}

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: partial.titulo ?? "Vehículo",
    criterioFin: "tiempo",
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
  } as Vehicle;
}

describe("cruce de segmento: trabajo vivo Dual Kernel", () => {
  const dayStart = new Date("2026-06-05T05:00:00-05:00").getTime();

  it("no auto-cierra un ring de enfoque al cruzar segmento", () => {
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
    const active = seg({ id: "b", estado: "activo", horaInicio: "10:00" });
    const ring = vehicle({
      id: "enf",
      segmentoId: "a",
      tipoFlota: "situacion",
      situacionCronometro: { activo: true, bloqueInicioAt: 1, horaFinMs: 2 },
      subTareas: [
        {
          id: "f1",
          texto: "Fila",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
        },
      ],
    });
    assert.equal(isVehicleFromPreviousSegment(ring, active, dayStart), false);
    const { events } = evaluateSegmentCrossEntropy({
      vehicles: [ring],
      segmentos: [
        seg({ id: "a", estado: "activo", horaInicio: "08:00", nombre: "A" }),
        seg({ id: "b", estado: "activo", horaInicio: "10:00", nombre: "B" }),
      ],
      nowMs: start + CRUCE_GRACE_MIN * 60000,
      dayStartMs: dayStart,
      warnedVehicleIds: new Set(),
    });
    assert.equal(
      events.some(e => e.type === "auto_close" && e.vehicleId === "enf"),
      false
    );
  });
});

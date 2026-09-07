import { describe, expect, it } from "vitest";
import type { SegmentoV5 } from "./persistence";
import type { Vehicle } from "./persistence";
import { segmentWindowMs } from "./segmentTime";
import {
  applyOriginSegmentCruceEntropia,
  CRUCE_GRACE_MIN,
  evaluateSegmentCrossEntropy,
  getCruceGraciaState,
  getCrossingVehiclesState,
  isVehicleFromPreviousSegment,
} from "./segmentCrossEntropyEngine";

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
  };
}

describe("segmentCrossEntropyEngine", () => {
  const dayStart = new Date("2026-06-05T05:00:00-05:00").getTime();

  it("detecta vehículo de segmento anterior por segmentoId distinto", () => {
    const active = seg({ id: "b", estado: "activo", horaInicio: "10:00", nombre: "Mañana B" });
    const v = vehicle({ id: "v1", segmentoId: "a", segmentoOrigen: "Mañana A" });
    expect(isVehicleFromPreviousSegment(v, active, dayStart)).toBe(true);
  });

  it("excluye centinela y descanso", () => {
    const active = seg({ id: "b", estado: "activo", horaInicio: "10:00" });
    expect(isVehicleFromPreviousSegment(vehicle({ id: "v1", autoVerdad: true, segmentoId: "a" }), active, dayStart)).toBe(false);
    expect(
      isVehicleFromPreviousSegment(
        vehicle({ id: "v2", tipoFlota: "descanso", segmentoId: "a" }),
        active,
        dayStart
      )
    ).toBe(false);
  });

  it("excluye desglosador en foco del cruce de segmento", () => {
    const active = seg({ id: "b", estado: "activo", horaInicio: "10:00" });
    const desg = vehicle({
      id: "d1",
      segmentoId: "a",
      tipoReloj: "desglosador",
      tipoFlota: "tiempo",
      subVehiculos: [{ id: "s1", titulo: "Turno", status: "activo" }],
    });
    expect(isVehicleFromPreviousSegment(desg, active, dayStart)).toBe(false);
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
    const grace = getCruceGraciaState(desg, active, start + CRUCE_GRACE_MIN * 60000, dayStart);
    expect(grace.phase).toBe("none");
  });

  it("excluye ring de enfoque vivo del cruce (sobrevive al salir de Dual Kernel)", () => {
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
    expect(isVehicleFromPreviousSegment(ring, active, dayStart)).toBe(false);
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
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
    expect(events.some(e => e.type === "auto_close" && e.vehicleId === "enf")).toBe(false);
  });

  it("gracia activa antes de 8 min y expirada después", () => {
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
    const active = seg({ id: "b", estado: "activo", horaInicio: "10:00" });
    const v = vehicle({ id: "v1", segmentoId: "a", segmentoOrigen: "A" });
    const grace = getCruceGraciaState(v, active, start + 5 * 60000, dayStart);
    expect(grace.phase).toBe("grace");
    expect(grace.minutesLeft).toBeGreaterThan(0);
    const expired = getCruceGraciaState(v, active, start + CRUCE_GRACE_MIN * 60000, dayStart);
    expect(expired.phase).toBe("expired");
  });

  it("auto_close y entropía del segmento origen tras gracia", () => {
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
    const segmentos = [
      seg({ id: "a", estado: "activo", horaInicio: "08:00", nombre: "A" }),
      seg({ id: "b", estado: "activo", horaInicio: "10:00", nombre: "B" }),
    ];
    const vehicles = [
      vehicle({
        id: "v1",
        segmentoId: "a",
        segmentoOrigen: "A",
        titulo: "Tarea A",
        aperturaAt: start - 30 * 60000,
      }),
    ];
    const warned = new Set<string>();
    const { events } = evaluateSegmentCrossEntropy({
      vehicles,
      segmentos,
      nowMs: start + CRUCE_GRACE_MIN * 60000,
      dayStartMs: dayStart,
      warnedVehicleIds: warned,
    });
    expect(events.some(e => e.type === "auto_close" && e.vehicleId === "v1")).toBe(true);
    expect(events.some(e => e.type === "segment_entropia" && e.segId === "a")).toBe(true);
  });

  it("getCrossingVehiclesState null sin cruce ni segmento activo", () => {
    expect(getCrossingVehiclesState([], [], dayStart)).toBeNull();
    const segmentos = [seg({ id: "b", estado: "activo", horaInicio: "10:00" })];
    expect(getCrossingVehiclesState(segmentos, [], dayStart)).toBeNull();
    const vehicles = [vehicle({ id: "v1", segmentoId: "b" })];
    expect(getCrossingVehiclesState(segmentos, vehicles, dayStart)).toBeNull();
  });

  it("getCrossingVehiclesState detecta cruce pendiente", () => {
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
    const segmentos = [
      seg({ id: "a", estado: "activo", horaInicio: "08:00", nombre: "Mañana" }),
      seg({ id: "b", estado: "activo", horaInicio: "10:00", nombre: "Tarde" }),
    ];
    const vehicles = [
      vehicle({
        id: "v1",
        segmentoId: "a",
        segmentoOrigen: "Mañana",
        aperturaAt: start - 30 * 60000,
      }),
    ];
    const ctx = getCrossingVehiclesState(segmentos, vehicles, dayStart, start + 60000);
    expect(ctx?.crossing.length).toBe(1);
    expect(ctx?.activeSegment.id).toBe("b");
  });

  it("applyOriginSegmentCruceEntropia marca activo como entropía", () => {
    const nowMs = Date.now();
    const { segmentos, event, changed } = applyOriginSegmentCruceEntropia(
      [seg({ id: "a", estado: "activo", nombre: "A" })],
      "a",
      nowMs
    );
    expect(changed).toBe(true);
    expect(segmentos[0].estado).toBe("entropia");
    expect(event).toMatchObject({ type: "entropia", reason: "cruce_sin_cierre" });
  });
});

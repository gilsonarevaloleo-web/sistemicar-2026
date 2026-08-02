import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SegmentoV5, SubTarea, Vehicle } from "../lib/persistence.ts";
import { CRUCE_GRACE_MIN } from "../lib/segmentCrossEntropyEngine.ts";
import { segmentWindowMs } from "../lib/segmentTime.ts";
import {
  applySituacionDistraccionFail,
  applySituacionSustituirFoco,
  evaluateAncladoSegmentoCruce,
  isDesglosadorAncladoSegmento,
  isRingModoEntrenamiento,
} from "./entrenamientoRestricciones.ts";
import { applySituacionRowClose } from "./situacionKernel.ts";
import { isDesglosadorCrossSegmentExempt } from "../lib/vehicleOperationalSlots.ts";

function row(partial: Partial<SubTarea> & { id: string; texto: string }): SubTarea {
  return {
    completada: false,
    creadaAt: Date.now(),
    enDesgloseCronometro: true,
    resultadoSituacion: "pendiente",
    minutosCupo: 5,
    ...partial,
  } as SubTarea;
}

function ringVehicle(subs: SubTarea[], entrenamiento = true): Vehicle {
  const now = Date.now();
  return {
    id: "s1",
    titulo: "Ring test",
    status: "activo",
    userId: "u1",
    tipoFlota: "situacion",
    aperturaAt: now - 60_000,
    subTareas: subs,
    situacionCupoAnchor: { subTareaId: subs[0]!.id, startedAt: now - 30_000 },
    situacionCronometro: {
      activo: true,
      bloqueInicioAt: now - 60_000,
      horaFinMs: now + 30 * 60_000,
      horaFinContratoMs: now + 30 * 60_000,
      ...(entrenamiento ? { modoEntrenamiento: true } : {}),
    },
  } as Vehicle;
}

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

describe("entrenamientoRestricciones", () => {
  it("detecta modo entrenamiento y anclaje", () => {
    const v = ringVehicle([row({ id: "r1", texto: "A" })]);
    assert.equal(isRingModoEntrenamiento(v), true);
    assert.equal(isRingModoEntrenamiento(ringVehicle([row({ id: "r1", texto: "A" })], false)), false);
    assert.equal(isDesglosadorAncladoSegmento({ ancladoAlSegmento: true }), true);
  });

  it("bloquea avance en ring con entrenamiento", () => {
    const v = ringVehicle([
      row({ id: "r1", texto: "A" }),
      row({ id: "r2", texto: "B" }),
    ]);
    assert.equal(applySituacionRowClose(v, "r1", "avance"), null);
  });

  it("sustituye foco sin fallar la fila anterior", () => {
    const now = Date.now();
    const v = ringVehicle([
      row({ id: "r1", texto: "A" }),
      row({ id: "r2", texto: "B" }),
    ]);
    const patch = applySituacionSustituirFoco(v, "r2", now);
    assert.ok(patch);
    assert.equal(patch!.situacionCupoAnchor.subTareaId, "r2");
    assert.equal(patch!.nuevoFocoTexto, "B");
    const pending = patch!.subTareas.filter(
      s => (s.resultadoSituacion ?? "pendiente") === "pendiente"
    );
    assert.equal(pending.length, 2);
    assert.equal(pending[0]!.id, "r2");
  });

  it("falla por distracción con motivo y mensaje de fila", () => {
    const now = Date.now();
    const v = ringVehicle([
      row({ id: "r1", texto: "A" }),
      row({ id: "r2", texto: "B" }),
    ]);
    const patch = applySituacionDistraccionFail(v, now);
    assert.ok(patch);
    const closed = patch!.subTareas.find(s => s.id === "r1");
    assert.equal(closed?.resultadoSituacion, "fallado");
    assert.equal(closed?.motivoCierre, "distraccion");
    assert.equal(patch!.bloqueListo, false);
    assert.equal(patch!.situacionCupoAnchor?.subTareaId, "r2");
  });

  it("desglosador anclado pierde exención de cruce", () => {
    const desg = {
      id: "d1",
      tipoReloj: "desglosador" as const,
      tipoFlota: "tiempo" as const,
      status: "activo" as const,
      ancladoAlSegmento: true,
      subVehiculos: [{ id: "s1", titulo: "A", status: "activo" as const }],
    } as Vehicle;
    assert.equal(isDesglosadorCrossSegmentExempt(desg), false);

    const libre = { ...desg, ancladoAlSegmento: false };
    assert.equal(isDesglosadorCrossSegmentExempt(libre), true);
  });

  it("evalúa auto_close de desglosador anclado tras gracia", () => {
    const dayStart = new Date("2026-06-05T05:00:00-05:00").getTime();
    const { start } = segmentWindowMs("10:00", "12:00", dayStart);
    const segmentos = [
      seg({ id: "a", estado: "activo", horaInicio: "08:00", nombre: "A" }),
      seg({ id: "b", estado: "activo", horaInicio: "10:00", nombre: "B" }),
    ];
    const vehicles = [
      {
        id: "d1",
        titulo: "Costura",
        status: "activo",
        userId: "u1",
        tipoFlota: "tiempo",
        tipoReloj: "desglosador",
        ancladoAlSegmento: true,
        segmentoId: "a",
        segmentoOrigen: "A",
        subVehiculos: [{ id: "s1", titulo: "Turno", status: "activo" }],
        criterioFin: "circunstancia",
        criterioDetalle: "",
        tiempoInicio: new Date(),
        ejes: {
          enfoque: { text: "", trifecta: "omitir" },
          conflicto: { text: "", trifecta: "omitir" },
          pasos: { text: "", trifecta: "omitir" },
          limite: { text: "", trifecta: "omitir" },
        },
        createdAt: new Date(),
      } as Vehicle,
    ];
    const events = evaluateAncladoSegmentoCruce({
      vehicles,
      segmentos,
      nowMs: start + CRUCE_GRACE_MIN * 60000,
      dayStartMs: dayStart,
      warnedVehicleIds: new Set(),
    });
    assert.ok(events.some(e => e.type === "auto_close" && e.vehicleId === "d1"));
  });
});

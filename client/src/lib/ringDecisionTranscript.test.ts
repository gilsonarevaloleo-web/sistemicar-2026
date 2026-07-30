import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTranscriptFromVehicles,
  collectExecutedDecisionsFromVehicle,
  enumerateRingDecisions,
  filterDecisionsForProyecto,
} from "./ringDecisionTranscript";
import type { Vehicle } from "./persistence";

describe("ringDecisionTranscript", () => {
  it("enumera subs del ring situacional en orden temporal", () => {
    const vehicle: Vehicle = {
      id: "v1",
      titulo: "Bloque situación",
      tipoFlota: "situacion",
      status: "activo",
      proyectoId: "proy_a",
      subTareas: [
        {
          id: "st1",
          texto: "Primera decisión",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
          resultadoSituacion: "cumplido",
          cerradaAt: 1000,
          proyectoId: "proy_a",
          origenImanId: "iman_1",
        },
        {
          id: "st2",
          texto: "Segunda decisión",
          completada: false,
          creadaAt: 2,
          enDesgloseCronometro: true,
          resultadoSituacion: "cumplido",
          cerradaAt: 2000,
          proyectoId: "proy_a",
        },
        {
          id: "st3",
          texto: "Pendiente en ring",
          completada: false,
          creadaAt: 3,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
        },
      ],
    } as Vehicle;

    const raw = collectExecutedDecisionsFromVehicle(vehicle);
    assert.equal(raw.length, 2);
    const enumerated = enumerateRingDecisions(raw);
    assert.equal(enumerated.length, 2);
    assert.equal(enumerated[0].n, 1);
    assert.equal(enumerated[0].texto, "Primera decisión");
    assert.equal(enumerated[1].n, 2);
    assert.equal(enumerated[0].origenImanId, "iman_1");
  });

  it("incluye desglosador tiempo y misión directa", () => {
    const desglosador: Vehicle = {
      id: "v2",
      titulo: "Desglose tiempo",
      tipoReloj: "desglosador",
      tipoFlota: "tiempo",
      status: "cumplido",
      proyectoId: "proy_b",
      subVehiculos: [
        { id: "sv1", titulo: "Sub bloque", status: "cumplido", cierreAt: 500 },
      ],
    } as Vehicle;

    const transcript = buildTranscriptFromVehicles([desglosador]);
    assert.equal(transcript.length, 1);
    assert.equal(transcript[0].kind, "sub_desglosador");
  });

  it("filtra decisiones por proyecto", () => {
    const all = enumerateRingDecisions([
      {
        key: "a",
        texto: "A",
        kind: "sub_situacion",
        status: "cumplido",
        ts: 1,
        proyectoId: "proy_a",
        vehicleId: "v1",
      },
      {
        key: "b",
        texto: "B",
        kind: "sub_situacion",
        status: "cumplido",
        ts: 2,
        proyectoId: "proy_b",
        vehicleId: "v1",
      },
    ]);
    const filtered = filterDecisionsForProyecto(all, "proy_a");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].n, 1);
    assert.equal(filtered[0].texto, "A");
  });

  it("collectExecutedDecisions incluye sub con resultadoSituacion avance", () => {
    const vehicle: Vehicle = {
      id: "v3",
      titulo: "Ring con avance",
      tipoFlota: "situacion",
      status: "activo",
      proyectoId: "proy_c",
      subTareas: [
        {
          id: "st_a",
          texto: "Tarea avanzada",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: true,
          resultadoSituacion: "avance",
          cerradaAt: 3000,
        },
        {
          id: "st_b",
          texto: "Tarea pendiente",
          completada: false,
          creadaAt: 2,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
        },
      ],
    } as Vehicle;

    const raw = collectExecutedDecisionsFromVehicle(vehicle);
    assert.equal(raw.length, 1);
    assert.equal(raw[0]!.status, "avance");
    assert.equal(raw[0]!.texto, "Tarea avanzada");
  });
});

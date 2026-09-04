import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "../lib/persistence.ts";
import type { SituacionReservaItem } from "../lib/situacionReserva.ts";
import {
  injectCrisolOpeningRing,
  injectCrisolPensamiento,
  injectCrisolToActiveRing,
  injectCrisolToListaLibre,
  pickSituacionVehicleTarget,
} from "./crisolKernel.ts";

function baseVehicle(patch: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    userId: "u1",
    titulo: "Enfoque",
    status: "activo",
    tipoFlota: "situacion",
    subTareas: [],
    ...patch,
  } as Vehicle;
}

const item: SituacionReservaItem = {
  id: "r1",
  texto: "Pensar X",
  estado: "activa",
  reservadaAt: Date.now(),
  ruta: "situacion_desglosador",
  userId: "u1",
};

describe("crisolKernel", () => {
  it("pickSituacionVehicleTarget: único activo", () => {
    const { vehicle, ambiguous } = pickSituacionVehicleTarget(
      [baseVehicle()],
      null
    );
    assert.equal(ambiguous, false);
    assert.equal(vehicle?.id, "v1");
  });

  it("pickSituacionVehicleTarget: ambiguo sin expand", () => {
    const { ambiguous } = pickSituacionVehicleTarget(
      [baseVehicle({ id: "a" }), baseVehicle({ id: "b" })],
      null
    );
    assert.equal(ambiguous, true);
  });

  it("lista libre añade subtarea sin ring", () => {
    const r = injectCrisolToListaLibre(baseVehicle(), {
      ...item,
      ruta: "ejecucion",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.mode, "lista_libre");
    assert.equal(r.subTareas.length, 1);
    assert.equal(r.subTareas[0]?.enDesgloseCronometro, undefined);
  });

  it("enqueue a ring activo redistribuye", () => {
    const now = Date.now();
    const vehicle = baseVehicle({
      subTareas: [
        {
          id: "st0",
          texto: "A",
          completada: false,
          creadaAt: now,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 20,
        },
      ],
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: now,
        horaFinMs: now + 20 * 60_000,
        horaFinContratoMs: now + 20 * 60_000,
        retoNumero: 1,
        retosCompletados: 0,
        minutosGanadosReto: 0,
        minutosGanadosSesion: 0,
        saldoAdelantoMin: 0,
        depthBlockPsGranted: 0,
      },
      situacionCupoAnchor: { subTareaId: "st0", startedAt: now },
    });
    const r = injectCrisolToActiveRing(vehicle, item);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.mode, "enqueue_ring");
    assert.equal(r.subTareas.filter(s => s.enDesgloseCronometro).length, 2);
  });

  it("enqueue con nido del Crisol actualiza rumbo del ring", () => {
    const now = Date.now();
    const vehicle = baseVehicle({
      proyectoId: "seg-proy",
      subTareas: [
        {
          id: "st0",
          texto: "A",
          completada: false,
          creadaAt: now,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 20,
          proyectoId: "seg-proy",
        },
      ],
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: now,
        horaFinMs: now + 20 * 60_000,
        horaFinContratoMs: now + 20 * 60_000,
        retoNumero: 1,
        retosCompletados: 0,
        minutosGanadosReto: 0,
        minutosGanadosSesion: 0,
        saldoAdelantoMin: 0,
        depthBlockPsGranted: 0,
        proyectoEnfoqueId: "seg-proy",
      },
      situacionCupoAnchor: { subTareaId: "st0", startedAt: now },
    });
    const r = injectCrisolToActiveRing(vehicle, {
      ...item,
      proyectoId: "crisol-proy",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.proyectoId, "crisol-proy");
    assert.equal(r.situacionCronometro?.proyectoEnfoqueId, "crisol-proy");
    const last = r.subTareas[r.subTareas.length - 1];
    assert.equal(last?.proyectoId, "crisol-proy");
  });

  it("pickSituacionVehicleTarget ignora postergados", () => {
    const paused = baseVehicle({
      id: "paused",
      situacionNestedPause: {
        pausedAt: Date.now(),
        kind: "postergacion",
        situacionCronometro: { activo: true },
      },
    });
    const { vehicle, ambiguous } = pickSituacionVehicleTarget([paused], null);
    assert.equal(ambiguous, false);
    assert.equal(vehicle, undefined);
  });

  it("ruta E a ring activo encola en el ring (visible, no taller)", () => {
    const now = Date.now();
    const vehicle = baseVehicle({
      subTareas: [
        {
          id: "st0",
          texto: "A",
          completada: false,
          creadaAt: now,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
          minutosCupo: 20,
        },
      ],
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: now,
        horaFinMs: now + 20 * 60_000,
        horaFinContratoMs: now + 20 * 60_000,
        retoNumero: 1,
        retosCompletados: 0,
        minutosGanadosReto: 0,
        minutosGanadosSesion: 0,
        saldoAdelantoMin: 0,
        depthBlockPsGranted: 0,
      },
      situacionCupoAnchor: { subTareaId: "st0", startedAt: now },
    });
    const r = injectCrisolPensamiento(vehicle, {
      ...item,
      ruta: "ejecucion",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.mode, "enqueue_ring");
    const last = r.subTareas[r.subTareas.length - 1];
    assert.equal(last?.texto, "Pensar X");
    assert.equal(last?.enDesgloseCronometro, true);
    assert.ok((last?.minutosCupo ?? 0) > 0);
    assert.equal(
      r.subTareas.filter(s => s.enDesgloseCronometro && (s.resultadoSituacion ?? "pendiente") === "pendiente")
        .length,
      2
    );
  });

  it("ruta E sin ring sigue en lista libre", () => {
    const r = injectCrisolPensamiento(baseVehicle(), {
      ...item,
      ruta: "ejecucion",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.mode, "lista_libre");
    assert.equal(r.subTareas[0]?.enDesgloseCronometro, undefined);
  });

  it("abrir ring sin activo usa meta de segmento", () => {
    const hora = new Date(Date.now() + 45 * 60_000);
    const hh = String(hora.getHours()).padStart(2, "0");
    const mm = String(hora.getMinutes()).padStart(2, "0");
    const r = injectCrisolOpeningRing(baseVehicle(), item, {
      segmentoHoraFin: `${hh}:${mm}`,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.mode, "open_ring");
    assert.equal(r.situacionCronometro?.activo, true);
  });
});

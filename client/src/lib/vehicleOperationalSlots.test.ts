import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence";
import {
  assertCanOpenVehicle,
  getOperationalActives,
  isDesglosadorEnFoco,
  isDesglosadorCrossSegmentExempt,
} from "./vehicleOperationalSlots";

function v(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    titulo: partial.titulo ?? "Misión",
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

describe("vehicleOperationalSlots", () => {
  it("isDesglosadorEnFoco con sub activa o pausa", () => {
    const desg = v({
      id: "d1",
      tipoReloj: "desglosador",
      tipoFlota: "tiempo",
      subVehiculos: [{ id: "s1", titulo: "A", status: "activo" }],
    });
    assert.equal(isDesglosadorEnFoco(desg), true);
    assert.equal(isDesglosadorCrossSegmentExempt(desg), true);

    const anclado = v({ ...desg, id: "d1b", ancladoAlSegmento: true });
    assert.equal(isDesglosadorEnFoco(anclado), true);
    assert.equal(isDesglosadorCrossSegmentExempt(anclado), false);

    const paused = v({ ...desg, id: "d2", interrupcionActiva: true, subVehiculos: [] });
    assert.equal(isDesglosadorEnFoco(paused), true);

    const done = v({
      id: "d3",
      tipoReloj: "desglosador",
      subVehiculos: [{ id: "s1", titulo: "A", status: "cumplido" }],
    });
    assert.equal(isDesglosadorEnFoco(done), false);
  });

  it("bloquea tercer vehículo general", () => {
    const list = [v({ id: "a", titulo: "A" }), v({ id: "b", titulo: "B", tipoFlota: "situacion" })];
    assert.equal(getOperationalActives(list).length, 2);
    const check = assertCanOpenVehicle(list, "flota_general");
    assert.equal(check.allowed, false);
  });

  it("permite descanso con cualquier misión activa", () => {
    const desg = v({
      id: "d1",
      titulo: "Costura",
      tipoReloj: "desglosador",
      tipoFlota: "tiempo",
      subVehiculos: [{ id: "s1", titulo: "Turno", status: "activo" }],
    });
    assert.equal(assertCanOpenVehicle([desg], "descanso").allowed, true);

    const sit = v({ id: "s1", titulo: "Situación", tipoFlota: "situacion" });
    assert.equal(assertCanOpenVehicle([sit], "descanso").allowed, true);
  });

  it("permite descanso aunque haya 2 misiones operativas abiertas", () => {
    const list = [
      v({ id: "a", titulo: "A", tipoFlota: "tiempo" }),
      v({ id: "b", titulo: "B", tipoFlota: "situacion" }),
    ];
    assert.equal(assertCanOpenVehicle(list, "descanso").allowed, true);
  });

  it("descanso activo no consume slot operativo", () => {
    const list = [
      v({ id: "a", titulo: "A", tipoFlota: "tiempo" }),
      v({ id: "b", titulo: "B", tipoFlota: "situacion" }),
      v({ id: "c", titulo: "Escuchar", tipoFlota: "descanso" }),
    ];
    assert.equal(getOperationalActives(list).length, 2);
    const check = assertCanOpenVehicle(list, "flota_general");
    assert.equal(check.allowed, false);
  });

  it("permite interrupción con solo el padre activo", () => {
    const parent = v({
      id: "p1",
      tipoReloj: "desglosador",
      subVehiculos: [{ id: "s1", titulo: "Sub", status: "activo" }],
    });
    const check = assertCanOpenVehicle([parent], "interrupcion", { parentDesglosadorId: "p1" });
    assert.equal(check.allowed, true);
  });

  it("enfoque postergado no consume slot (libera para el siguiente)", () => {
    const list = [
      v({
        id: "enf",
        titulo: "Enfoque",
        tipoFlota: "situacion",
        situacionNestedPause: {
          pausedAt: Date.now(),
          kind: "postergacion",
          situacionCronometro: { activo: true },
          minutosRestantesAlPausar: 18,
        },
      }),
      v({ id: "conq", titulo: "Conquista", tipoFlota: "tiempo" }),
    ];
    assert.equal(getOperationalActives(list).length, 1);
    assert.equal(assertCanOpenVehicle(list, "flota_general").allowed, true);
  });
});

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { unlinkProyectoVinculosLocal } from "./proyectoLifecycle.ts";

function installLocalStorage() {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear();
    return;
  }
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("proyectoLifecycle unlink", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("delete quita el proyecto de vehículos, planilla, rutina y Crisol", () => {
    localStorage.setItem(
      "sistemicar_vehicles",
      JSON.stringify([
        {
          id: "v1",
          proyectoId: "proy_x",
          proyectoPeldanoId: "pel_1",
          oleadaPuntoId: "pt_1",
          subTareas: [{ id: "st1", proyectoId: "proy_x" }, { id: "st2", proyectoId: "keep" }],
        },
        { id: "v2", proyectoId: "keep" },
      ])
    );
    localStorage.setItem(
      "sistemicar_planilla_v5_2026-08-13",
      JSON.stringify({
        fecha: "2026-08-13",
        segmentos: [
          { id: "s1", proyectoVinculadoId: "proy_x", proyectoPeldanoId: "pel_1" },
          { id: "s2", proyectoVinculadoId: "keep" },
        ],
      })
    );
    localStorage.setItem(
      "sistemicar_plantillas_rutina_user1",
      JSON.stringify([
        {
          id: "rut_1",
          segmentos: [
            { nombre: "Costura", proyectoVinculadoId: "proy_x" },
            { nombre: "Salud", proyectoVinculadoId: "keep" },
          ],
        },
      ])
    );
    localStorage.setItem(
      "sistemicar_situacion_reserva",
      JSON.stringify([
        { id: "r1", userId: "user1", proyectoId: "proy_x", proyectoTitulo: "Costura" },
        { id: "r2", userId: "user1", proyectoId: "keep" },
      ])
    );

    unlinkProyectoVinculosLocal("user1", "proy_x", "delete");

    const vehicles = JSON.parse(localStorage.getItem("sistemicar_vehicles") ?? "[]");
    assert.equal(vehicles[0].proyectoId, undefined);
    assert.equal(vehicles[0].proyectoPeldanoId, undefined);
    assert.equal(vehicles[0].oleadaPuntoId, undefined);
    assert.equal(vehicles[0].subTareas[0].proyectoId, undefined);
    assert.equal(vehicles[0].subTareas[1].proyectoId, "keep");
    assert.equal(vehicles[1].proyectoId, "keep");

    const planilla = JSON.parse(localStorage.getItem("sistemicar_planilla_v5_2026-08-13") ?? "{}");
    assert.equal(planilla.segmentos[0].proyectoVinculadoId, undefined);
    assert.equal(planilla.segmentos[0].proyectoPeldanoId, undefined);
    assert.equal(planilla.segmentos[1].proyectoVinculadoId, "keep");

    const plantillas = JSON.parse(localStorage.getItem("sistemicar_plantillas_rutina_user1") ?? "[]");
    assert.equal(plantillas[0].segmentos[0].proyectoVinculadoId, undefined);
    assert.equal(plantillas[0].segmentos[1].proyectoVinculadoId, "keep");

    const reservas = JSON.parse(localStorage.getItem("sistemicar_situacion_reserva") ?? "[]");
    assert.equal(reservas[0].proyectoId, undefined);
    assert.equal(reservas[0].proyectoTitulo, undefined);
    assert.equal(reservas[1].proyectoId, "keep");
  });

  it("reset conserva el nido y suelta peldaños muertos", () => {
    localStorage.setItem(
      "sistemicar_vehicles",
      JSON.stringify([
        { id: "v1", proyectoId: "proy_x", proyectoPeldanoId: "pel_1", oleadaPuntoId: "pt_1" },
      ])
    );
    localStorage.setItem(
      "sistemicar_planilla_v5_2026-08-13",
      JSON.stringify({
        fecha: "2026-08-13",
        segmentos: [{ id: "s1", proyectoVinculadoId: "proy_x", proyectoPeldanoId: "pel_1" }],
      })
    );
    localStorage.setItem(
      "sistemicar_plantillas_rutina_user1",
      JSON.stringify([{ id: "rut_1", segmentos: [{ nombre: "Costura", proyectoVinculadoId: "proy_x" }] }])
    );
    localStorage.setItem(
      "sistemicar_situacion_reserva",
      JSON.stringify([{ id: "r1", userId: "user1", proyectoId: "proy_x", proyectoTitulo: "Costura" }])
    );

    unlinkProyectoVinculosLocal("user1", "proy_x", "reset");

    const vehicles = JSON.parse(localStorage.getItem("sistemicar_vehicles") ?? "[]");
    assert.equal(vehicles[0].proyectoId, "proy_x");
    assert.equal(vehicles[0].proyectoPeldanoId, undefined);
    assert.equal(vehicles[0].oleadaPuntoId, undefined);

    const planilla = JSON.parse(localStorage.getItem("sistemicar_planilla_v5_2026-08-13") ?? "{}");
    assert.equal(planilla.segmentos[0].proyectoVinculadoId, "proy_x");
    assert.equal(planilla.segmentos[0].proyectoPeldanoId, undefined);

    const plantillas = JSON.parse(localStorage.getItem("sistemicar_plantillas_rutina_user1") ?? "[]");
    assert.equal(plantillas[0].segmentos[0].proyectoVinculadoId, "proy_x");

    const reservas = JSON.parse(localStorage.getItem("sistemicar_situacion_reserva") ?? "[]");
    assert.equal(reservas[0].proyectoId, "proy_x");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubTarea } from "./persistence.ts";
import {
  buildSubTareasResumenFromVehicle,
  collectRamasIncompletas,
  computeProyectoStats,
} from "./proyectos.ts";
import type { ProyectoPeldano } from "./proyectos.ts";

function st(partial: Partial<SubTarea> & Pick<SubTarea, "id" | "texto">): SubTarea {
  return {
    completada: false,
    creadaAt: 1,
    ...partial,
  };
}

describe("proyectos situacion arbol", () => {
  it("buildSubTareasResumenFromVehicle anida detalles", () => {
    const res = buildSubTareasResumenFromVehicle([
      st({
        id: "a",
        texto: "Bloque A",
        enDesgloseCronometro: true,
        resultadoSituacion: "cumplido",
        detalles: [
          { id: "d1", texto: "Paso 1", entregado: true, creadaAt: 1 },
          { id: "d2", texto: "Paso 2", entregado: false, creadaAt: 1 },
        ],
      }),
    ]);
    assert.equal(res.length, 1);
    assert.equal(res[0]?.detalles?.length, 2);
    assert.equal(res[0]?.detalles?.[0]?.entregado, true);
  });

  it("collectRamasIncompletas propone retomar y profundizar", () => {
    const ramas = collectRamasIncompletas([
      st({
        id: "a",
        texto: "Sin cerrar",
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
      }),
      st({
        id: "b",
        texto: "Hecho",
        enDesgloseCronometro: true,
        resultadoSituacion: "cumplido",
        detalles: [{ id: "d1", texto: "Detalle X", entregado: false, creadaAt: 1 }],
      }),
    ]);
    assert.equal(ramas.length, 2);
    assert.equal(ramas[0]?.titulo, "Retomar: Sin cerrar");
    assert.equal(ramas[1]?.titulo, "Profundizar: Hecho");
    assert.deepEqual(ramas[1]?.plantillaSubTareas, ["Detalle X"]);
  });
});

describe("proyectos", () => {
  it("computeProyectoStats suma conquistados y minutos", () => {
    const peldanos: ProyectoPeldano[] = [
      {
        id: "p1",
        proyectoId: "x",
        orden: 0,
        titulo: "Bloque A",
        estado: "conquistado",
        cerradoAt: 100,
        resumen: { duracionMin: 30, profundidadMaxima: "concentrado" },
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "p2",
        proyectoId: "x",
        orden: 1,
        titulo: "Idea B",
        estado: "idea",
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const s = computeProyectoStats(peldanos);
    assert.equal(s.conquistados, 1);
    assert.equal(s.ideas, 1);
    assert.equal(s.minutosTotales, 30);
    assert.equal(s.profundidadMaxima, "concentrado");
  });

  it("computeProyectoStats no suma peldaños situacionales (ya van por clic)", () => {
    const peldanos: ProyectoPeldano[] = [
      {
        id: "p1",
        proyectoId: "x",
        orden: 0,
        titulo: "Conquista",
        estado: "conquistado",
        tipoOrigen: "tiempo",
        resumen: { duracionMin: 20 },
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "p2",
        proyectoId: "x",
        orden: 1,
        titulo: "Ring",
        estado: "conquistado",
        tipoOrigen: "situacion",
        resumen: { duracionMin: 45 },
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const s = computeProyectoStats(peldanos);
    assert.equal(s.conquistados, 2);
    assert.equal(s.minutosTotales, 20);
  });
});

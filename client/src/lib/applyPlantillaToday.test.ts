import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  applyPlantillaToday,
  buildSegmentosFromPlantillaTemplates,
  type PlantillaRutina,
  type SegmentoTemplate,
} from "./persistence.ts";

function installMemoryLocalStorage() {
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

describe("applyPlantillaToday — carga inmediata", () => {
  before(() => {
    if (typeof globalThis.localStorage === "undefined") {
      installMemoryLocalStorage();
    } else {
      localStorage.clear();
    }
  });

  it("buildSegmentosFromPlantillaTemplates crea N segmentos sin red", () => {
    const templates: SegmentoTemplate[] = [
      {
        nombre: "AM",
        horaInicio: "08:00",
        horaFin: "12:00",
        color: "#3b82f6",
        icono: "layers",
        proyectoVinculadoId: "proy_costura",
      },
      {
        nombre: "PM",
        horaInicio: "14:00",
        horaFin: "18:00",
        color: "#10b981",
        icono: "layers",
      },
    ];
    const segs = buildSegmentosFromPlantillaTemplates(templates, 1_700_000_000_000);
    assert.equal(segs.length, 2);
    assert.equal(segs[0].proyectoVinculadoId, "proy_costura");
    assert.equal(segs[0].estado, "pendiente");
    assert.equal(segs[1].proyectoVinculadoId, undefined);
  });

  it("applyPlantillaToday resuelve al instante aunque haya proyectos vinculados", async () => {
    const plantilla: PlantillaRutina = {
      id: "rutina_costura",
      nombre: "Semana de costura",
      tipo: "dia_especial",
      diasActivos: [1, 2, 3, 4, 5, 6],
      creadaAt: new Date().toISOString(),
      segmentos: Array.from({ length: 7 }, (_, i) => ({
        nombre: `Bloque ${i + 1}`,
        horaInicio: `${String(8 + i).padStart(2, "0")}:00`,
        horaFin: `${String(9 + i).padStart(2, "0")}:00`,
        color: "#f59e0b",
        icono: "layers",
        proyectoVinculadoId: "proy_costura",
      })),
    };

    const started = Date.now();
    const planilla = await applyPlantillaToday("user_test_cargar", plantilla);
    const elapsed = Date.now() - started;

    assert.equal(planilla.segmentos.length, 7);
    assert.ok(
      elapsed < 500,
      `cargar rutina no debe esperar al Hub (elapsed=${elapsed}ms)`
    );
    // Claridad/peldaño van en sombra — aún no bloquean el retorno.
    assert.equal(planilla.segmentos[0].proyectoPeldanoId, undefined);
  });
});

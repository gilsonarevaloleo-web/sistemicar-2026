import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addPeldanoIdea,
  addProyecto,
  getPeldanosByProyectoLocal,
  recordProgresoHubAlCerrarVehiculo,
  setOleadaComoDireccion,
  upsertPeldanoDesdeSegmento,
} from "./proyectos.ts";
import { buildDefaultClaridadDireccion } from "./claridadDireccion.ts";
import type { Vehicle } from "./persistence.ts";

const USER = "user_hub_progreso_test";

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

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "id" | "titulo">): Vehicle {
  return {
    criterioFin: "tiempo",
    criterioDetalle: "",
    tiempoInicio: new Date(),
    ejes: {
      enfoque: { text: "", trifecta: "omitir" },
      conflicto: { text: "", trifecta: "omitir" },
      pasos: { text: "", trifecta: "omitir" },
      limite: { text: "", trifecta: "omitir" },
    },
    status: "cumplido",
    tipoFlota: "tiempo",
    ...partial,
  } as Vehicle;
}

describe("hub progreso oleada", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("setOleadaComoDireccion no demota sombras de segmento a ideas", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const claridad = buildDefaultClaridadDireccion({
      tituloProyecto: p.titulo,
      etiqueta: "proyecto",
      focoTitulo: "Oleada X",
    });
    const sombra = await upsertPeldanoDesdeSegmento(USER, {
      proyectoId: p.id,
      segmentoId: "seg_1",
      planillaFecha: "2026-08-06",
      titulo: "Desarrollo personal",
      horaInicio: "08:00",
      horaFin: "10:00",
      rutasMentales: claridad,
    });
    const idea = await addPeldanoIdea(USER, p.id, "Oleada X");
    await setOleadaComoDireccion(USER, p.id, idea.id);

    const all = getPeldanosByProyectoLocal(USER, p.id);
    const sombraAfter = all.find(x => x.id === sombra.id);
    const oleadaAfter = all.find(x => x.id === idea.id);
    assert.equal(oleadaAfter?.estado, "en_curso");
    assert.equal(sombraAfter?.estado, "en_curso");
    assert.equal(sombraAfter?.origenSegmento, true);
    assert.equal(all.filter(x => x.estado === "idea" && x.origenSegmento).length, 0);
  });

  it("upsertPeldanoDesdeSegmento reusa mismo día+título aunque cambie segmentoId", async () => {
    const p = await addProyecto(USER, { titulo: "Centro", etiqueta: "centro" });
    const claridad = buildDefaultClaridadDireccion({
      tituloProyecto: p.titulo,
      etiqueta: "centro",
      segmentoNombre: "Desarrollo personal",
    });
    const a = await upsertPeldanoDesdeSegmento(USER, {
      proyectoId: p.id,
      segmentoId: "seg_old",
      planillaFecha: "2026-08-06",
      titulo: "Desarrollo personal",
      horaInicio: "08:00",
      horaFin: "10:00",
      rutasMentales: claridad,
    });
    const b = await upsertPeldanoDesdeSegmento(USER, {
      proyectoId: p.id,
      segmentoId: "seg_new",
      planillaFecha: "2026-08-06",
      titulo: "Desarrollo personal",
      horaInicio: "08:00",
      horaFin: "10:00",
      rutasMentales: claridad,
    });
    assert.equal(a.id, b.id);
    assert.equal(b.segmentoId, "seg_new");
    assert.equal(
      getPeldanosByProyectoLocal(USER, p.id).filter(x => x.origenSegmento).length,
      1
    );
  });

  it("cerrar vehículo sobre oleada crea peldaño caminado sin apagar la oleada", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Módulo pagos");
    await setOleadaComoDireccion(USER, p.id, idea.id);

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v1",
        titulo: "Desglose pagos UI",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        duracionFinal: 25,
        subVehiculos: [
          {
            id: "s1",
            titulo: "Form",
            status: "cumplido",
            orden: 0,
            cantidadObjetivo: 1,
          } as never,
        ],
      }),
      { tipoOrigen: "tiempo", psGanados: 5, duracionMin: 25 }
    );

    const all = getPeldanosByProyectoLocal(USER, p.id);
    const oleada = all.find(x => x.id === idea.id);
    const caminados = all.filter(x => x.estado === "conquistado" && x.vehicleId === "v1");
    assert.equal(oleada?.estado, "en_curso");
    assert.equal(caminados.length, 1);
    assert.equal(caminados[0]?.titulo, "Desglose pagos UI");
  });

  it("cerrar vehículo de idea puntual conquista esa idea", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Idea suelta");
    // Sin setOleada — la idea no es oleada activa.
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v2",
        titulo: "Trabajo idea",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        duracionFinal: 10,
        subVehiculos: [],
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 10, subs: [] }
    );

    const pel = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id);
    assert.equal(pel?.estado, "conquistado");
  });
});

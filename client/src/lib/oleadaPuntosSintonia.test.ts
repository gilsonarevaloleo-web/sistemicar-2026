import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addOleadaPunto,
  addPeldanoIdea,
  addProyecto,
  deleteOleadaPunto,
  getPeldanosByProyectoLocal,
  recordProgresoHubAlCerrarVehiculo,
  setOleadaComoDireccion,
  setPuntoProduccion,
  updateOleadaPunto,
} from "./proyectos.ts";
import { evaluateDireccionElegibilidad } from "./direccionElegibilidad.ts";
import type { Vehicle } from "./persistence.ts";

const USER = "user_oleada_sintonia_test";

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

describe("sintonía oleada ↔ producción", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("CRUD de puntos sobre oleada: add + renumber al borrar", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Módulo pagos");
    await setOleadaComoDireccion(USER, p.id, idea.id);

    await addOleadaPunto(USER, idea.id, "Diseño UI");
    await addOleadaPunto(USER, idea.id, "API cobros");
    await addOleadaPunto(USER, idea.id, "QA");

    let oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(oleada.oleadaPuntos?.length, 3);
    assert.equal(oleada.oleadaPuntos?.[0]?.status, "propuesta");

    const mid = oleada.oleadaPuntos![1]!.id;
    await updateOleadaPunto(USER, idea.id, mid, { status: "avance" });
    await deleteOleadaPunto(USER, idea.id, oleada.oleadaPuntos![0]!.id);

    oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(oleada.oleadaPuntos?.length, 2);
    assert.equal(oleada.oleadaPuntos?.[0]?.titulo, "API cobros");
    assert.equal(oleada.oleadaPuntos?.[0]?.numero, 1);
    assert.equal(oleada.oleadaPuntos?.[0]?.status, "avance");
  });

  it("el primer punto ancla el timón; Producir aquí lo cambia; borrar el pin lo mueve", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Casacas small");
    await setOleadaComoDireccion(USER, p.id, idea.id);

    await addOleadaPunto(USER, idea.id, "negro small");
    let oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const negro = oleada.oleadaPuntos!.find(x => x.titulo === "negro small")!;
    assert.equal(oleada.puntoProduccionId, negro.id);

    await addOleadaPunto(USER, idea.id, "rojo small");
    oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const rojo = oleada.oleadaPuntos!.find(x => x.titulo === "rojo small")!;
    assert.equal(oleada.puntoProduccionId, negro.id);

    await setPuntoProduccion(USER, idea.id, rojo.id);
    oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(oleada.puntoProduccionId, rojo.id);

    await deleteOleadaPunto(USER, idea.id, rojo.id);
    oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(oleada.puntoProduccionId, negro.id);
  });

  it("cerrar vehículo sobre oleada sintoniza el punto a avance — no lo conquista", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Oleada X");
    await setOleadaComoDireccion(USER, p.id, idea.id);
    await addOleadaPunto(USER, idea.id, "Punto 1");
    await addOleadaPunto(USER, idea.id, "Punto 2");

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_sint_1",
        titulo: "Trabajo punto 1",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        duracionFinal: 20,
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
      { tipoOrigen: "tiempo", psGanados: 4, duracionMin: 20, destinoCierre: "peldano" }
    );

    const oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(oleada.estado, "en_curso");
    assert.equal(oleada.oleadaPuntos?.[0]?.status, "avance");
    assert.equal(oleada.oleadaPuntos?.[0]?.lastVehicleId, "v_sint_1");
    assert.equal(oleada.oleadaPuntos?.[1]?.status, "propuesta");
    assert.equal(oleada.puntoProduccionId, oleada.oleadaPuntos?.[0]?.id);
    const gate = evaluateDireccionElegibilidad(p, [oleada]);
    assert.equal(gate.ok, true);
    assert.equal(gate.puntoProduccionId, oleada.oleadaPuntos?.[0]?.id);
  });

  it("oleadaPuntoId explícito sintoniza ese punto, no el primero", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Oleada Y");
    await setOleadaComoDireccion(USER, p.id, idea.id);
    await addOleadaPunto(USER, idea.id, "Primero");
    const oleada0 = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    await addOleadaPunto(USER, idea.id, "Segundo");
    const oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const segundo = oleada.oleadaPuntos!.find(x => x.titulo === "Segundo")!;

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_sint_2",
        titulo: "Sobre segundo",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        oleadaPuntoId: segundo.id,
        destinoCierre: "peldano",
        duracionFinal: 10,
        subVehiculos: [
          { id: "s1", titulo: "X", status: "cumplido", orden: 0, cantidadObjetivo: 1 } as never,
        ],
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 10, destinoCierre: "peldano" }
    );

    const after = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(after.oleadaPuntos?.find(x => x.titulo === "Primero")?.status, "propuesta");
    assert.equal(after.oleadaPuntos?.find(x => x.titulo === "Segundo")?.status, "avance");
    // keep unused var quiet
    assert.ok(oleada0);
  });

  it("DESCANSO (consciencia) con rumbo no sella ni sintoniza peldaños", async () => {
    const p = await addProyecto(USER, { titulo: "DESCANSO", etiqueta: "consciencia" });
    const idea = await addPeldanoIdea(USER, p.id, "Noche");
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_descanso",
        titulo: "Siesta",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        duracionFinal: 30,
        tipoFlota: "descanso",
      }),
      { tipoOrigen: "tiempo", psGanados: 1, duracionMin: 30, destinoCierre: "peldano" }
    );
    const after = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    assert.equal(after.estado, "idea");
    assert.equal((after.oleadaPuntos ?? []).length, 0);
  });
});

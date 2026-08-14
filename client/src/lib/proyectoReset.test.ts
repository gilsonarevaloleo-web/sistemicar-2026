import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addPeldanoIdea,
  addProyecto,
  deleteProyecto,
  getPeldanosByProyectoLocal,
  getProyectosLocal,
  resetProyecto,
  updateProyecto,
} from "./proyectos.ts";

const USER = "user_proyecto_reset_test";

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

describe("reset y borrar proyecto", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("resetProyecto conserva identidad y vacía escalera / minutos / oleada", async () => {
    const p = await addProyecto(USER, {
      titulo: "Costura",
      etiqueta: "proyecto",
      nota: "Tiempo libre al atardecer",
      color: "#38BDF8",
      oleadaTitulo: "Lote viernes",
    });
    await addPeldanoIdea(USER, p.id, "Cortar telas");
    await updateProyecto(USER, p.id, {
      peldanosConquistados: 3,
      minutosTotales: 90,
      minutosPresencia: 20,
      sesionesPresencia: 2,
      segundosNorteSituacion: 180,
      segundosPresenciaRing: 60,
      situacionCreditKeys: ["ring:v1:s1"],
      primerNorteAt: 1,
      primeraPresenciaAt: 1,
      pasosEjecutadosTotal: 4,
      pasosEjecutadosLog: [
        {
          n: 1,
          key: "k1",
          texto: "paso",
          kind: "sub_desglosador",
          status: "cumplido",
        },
      ],
    });

    const reset = await resetProyecto(USER, p.id);
    assert.ok(reset);
    assert.equal(reset.id, p.id);
    assert.equal(reset.titulo, "Costura");
    assert.equal(reset.etiqueta, "proyecto");
    assert.equal(reset.color, "#38BDF8");
    assert.equal(reset.nota, "Tiempo libre al atardecer");
    assert.equal(reset.createdAt, p.createdAt);
    assert.equal(reset.peldanosConquistados, 0);
    assert.equal(reset.minutosTotales, 0);
    assert.equal(reset.minutosPresencia, 0);
    assert.equal(reset.sesionesPresencia, 0);
    assert.equal(reset.segundosNorteSituacion, undefined);
    assert.equal(reset.segundosPresenciaRing, undefined);
    assert.equal(reset.situacionCreditKeys, undefined);
    assert.equal(reset.oleadaTitulo, undefined);
    assert.equal(reset.primerNorteAt, undefined);
    assert.equal(reset.primeraPresenciaAt, undefined);
    assert.equal(reset.pasosEjecutadosTotal, undefined);
    assert.equal(reset.pasosEjecutadosLog, undefined);
    assert.ok(reset.claridadActiva);
    assert.equal(getPeldanosByProyectoLocal(USER, p.id).length, 0);
    assert.equal(getProyectosLocal(USER).length, 1);
  });

  it("deleteProyecto saca el nido del Hub", async () => {
    const a = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const b = await addProyecto(USER, { titulo: "Salud", etiqueta: "centro" });
    await addPeldanoIdea(USER, a.id, "Idea muerta");
    await deleteProyecto(USER, a.id);
    const left = getProyectosLocal(USER);
    assert.equal(left.length, 1);
    assert.equal(left[0]?.id, b.id);
    assert.equal(getPeldanosByProyectoLocal(USER, a.id).length, 0);
  });

  it("resetProyecto de un id inexistente no rompe", async () => {
    const reset = await resetProyecto(USER, "proy_nope");
    assert.equal(reset, null);
  });

  it("deleteProyecto manda el nido del Crisol a aterrizaje pendiente", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    localStorage.setItem(
      "sistemicar_situacion_reserva",
      JSON.stringify([
        { id: "r1", userId: USER, proyectoId: p.id, proyectoTitulo: "Costura" },
      ])
    );
    await deleteProyecto(USER, p.id);
    const reservas = JSON.parse(localStorage.getItem("sistemicar_situacion_reserva") ?? "[]");
    assert.equal(reservas[0]?.proyectoId, undefined);
    assert.equal(reservas[0]?.proyectoTitulo, undefined);
  });
});

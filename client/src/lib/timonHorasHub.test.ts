import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addOleadaPunto,
  addPeldanoIdea,
  addProyecto,
  computeProyectoStats,
  deleteOleadaPunto,
  getPeldanosByProyectoLocal,
  getProyectosLocal,
  minutosTiempoTimonVivo,
  recordProgresoHubAlCerrarVehiculo,
  setOleadaComoDireccion,
  setPuntoProduccion,
} from "./proyectos.ts";
import { horaEnCurso, horasDeEpisodio } from "./timonHoras.ts";
import type { Vehicle } from "./persistence.ts";

const USER = "user_timon_horas_hub_test";

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

describe("timón — horas enumeradas en el Hub", () => {
  before(() => {
    installLocalStorage();
    (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = {
      dispatchEvent: () => true,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("cerrar sobre el timón acumula horas y no crea peldaño por cada vehículo", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Casacas small");
    await setOleadaComoDireccion(USER, p.id, idea.id);
    await addOleadaPunto(USER, idea.id, "Terminar 12 plomos");
    await addOleadaPunto(USER, idea.id, "Empezar negro XL");

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_h1",
        titulo: "Coser espalda",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        duracionFinal: 40,
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 40, destinoCierre: "peldano" }
    );
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_h2",
        titulo: "Cerrar costura",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        duracionFinal: 40,
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 40, destinoCierre: "peldano" }
    );

    const oleada = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const ep = oleada.timonEpisodio!;
    assert.equal(ep.minutosAcumulados, 80);
    assert.equal(horaEnCurso(ep.minutosAcumulados), 2);
    const horas = horasDeEpisodio(ep);
    assert.equal(horas[0]?.completa, true);
    assert.equal(horas[1]?.minutos, 20);
    assert.equal(
      getPeldanosByProyectoLocal(USER, p.id).filter(x => x.estado === "conquistado").length,
      0
    );
    assert.equal(computeProyectoStats(getPeldanosByProyectoLocal(USER, p.id)).minutosTotales, 0);
    assert.equal(minutosTiempoTimonVivo(getPeldanosByProyectoLocal(USER, p.id)), 80);
  });

  it("cambiar el punto de producción sella las horas como un peldaño y reinicia en Hora 1", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Casacas small");
    await setOleadaComoDireccion(USER, p.id, idea.id);
    await addOleadaPunto(USER, idea.id, "Terminar 12 plomos");
    await addOleadaPunto(USER, idea.id, "Empezar negro XL");
    const oleada0 = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const plomos = oleada0.oleadaPuntos!.find(x => x.titulo === "Terminar 12 plomos")!;
    const xl = oleada0.oleadaPuntos!.find(x => x.titulo === "Empezar negro XL")!;

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_90",
        titulo: "Lote plomos",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        oleadaPuntoId: plomos.id,
        destinoCierre: "peldano",
        duracionFinal: 90,
      }),
      { tipoOrigen: "tiempo", psGanados: 4, duracionMin: 90, destinoCierre: "peldano" }
    );

    await setPuntoProduccion(USER, idea.id, xl.id);

    const all = getPeldanosByProyectoLocal(USER, p.id);
    const oleada = all.find(x => x.id === idea.id)!;
    const sellado = all.find(x => x.estado === "conquistado");
    assert.equal(oleada.puntoProduccionId, xl.id);
    assert.equal(horaEnCurso(oleada.timonEpisodio?.minutosAcumulados ?? 0), 1);
    assert.equal(oleada.timonEpisodio?.puntoId, xl.id);
    assert.equal(oleada.timonEpisodio?.minutosAcumulados, 0);
    assert.ok(sellado);
    assert.equal(sellado?.titulo, "Terminar 12 plomos");
    assert.equal(sellado?.resumen?.timon?.horas, 2);
    assert.equal(sellado?.resumen?.timon?.minutos, 90);
    assert.equal(sellado?.resumen?.duracionMin, 90);
    assert.equal(getProyectosLocal(USER).find(x => x.id === p.id)?.minutosTotales, 90);

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_xl",
        titulo: "Corte XL",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        oleadaPuntoId: xl.id,
        destinoCierre: "peldano",
        duracionFinal: 15,
      }),
      { tipoOrigen: "tiempo", psGanados: 1, duracionMin: 15, destinoCierre: "peldano" }
    );
    const afterAll = getPeldanosByProyectoLocal(USER, p.id);
    const after = afterAll.find(x => x.id === idea.id)!;
    assert.equal(horaEnCurso(after.timonEpisodio?.minutosAcumulados ?? 0), 1);
    assert.equal(after.timonEpisodio?.minutosAcumulados, 15);
    assert.equal(afterAll.filter(x => x.estado === "conquistado").length, 1);
  });

  it("borrar el pin sella la estancia y arranca hora 1 en el siguiente punto", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Lote");
    await setOleadaComoDireccion(USER, p.id, idea.id);
    await addOleadaPunto(USER, idea.id, "A");
    await addOleadaPunto(USER, idea.id, "B");
    const oleada0 = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id)!;
    const a = oleada0.oleadaPuntos!.find(x => x.titulo === "A")!;

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_a",
        titulo: "Sobre A",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        duracionFinal: 60,
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 60, destinoCierre: "peldano" }
    );

    await deleteOleadaPunto(USER, idea.id, a.id);
    const all = getPeldanosByProyectoLocal(USER, p.id);
    const sellado = all.find(x => x.estado === "conquistado");
    const oleada = all.find(x => x.id === idea.id)!;
    assert.equal(sellado?.titulo, "A");
    assert.equal(sellado?.resumen?.timon?.horas, 1);
    assert.equal(oleada.timonEpisodio?.puntoTitulo, "B");
    assert.equal(oleada.timonEpisodio?.minutosAcumulados, 0);
  });
});

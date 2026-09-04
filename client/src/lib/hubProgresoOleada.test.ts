import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import {
  addOleadaPunto,
  addPeldanoIdea,
  addProyecto,
  archivarOleada,
  getPeldanosByProyectoLocal,
  getProyectosLocal,
  recordProgresoHubAlCerrarVehiculo,
  setOleadaComoDireccion,
  upsertPeldanoDesdeSegmento,
  computeProyectoStats,
} from "./proyectos.ts";
import { buildDefaultClaridadDireccion, getOleadaEnCurso } from "./claridadDireccion.ts";
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
        destinoCierre: "peldano",
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
      { tipoOrigen: "tiempo", psGanados: 5, duracionMin: 25, destinoCierre: "peldano" }
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
        destinoCierre: "peldano",
        duracionFinal: 10,
        subVehiculos: [],
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 10, subs: [], destinoCierre: "peldano" }
    );

    const pel = getPeldanosByProyectoLocal(USER, p.id).find(x => x.id === idea.id);
    assert.equal(pel?.estado, "conquistado");
  });

  it("cierre con destino presencia no ensucia la escalera del Hub", async () => {
    const p = await addProyecto(USER, { titulo: "Sistemicar", etiqueta: "proyecto" });
    const idea = await addPeldanoIdea(USER, p.id, "Oleada limpia");
    await setOleadaComoDireccion(USER, p.id, idea.id);

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v3",
        titulo: "Ruido del día",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "presencia",
        duracionFinal: 15,
        subVehiculos: [],
      }),
      { tipoOrigen: "tiempo", psGanados: 3, duracionMin: 15, destinoCierre: "presencia" }
    );

    const all = getPeldanosByProyectoLocal(USER, p.id);
    assert.equal(all.filter(x => x.estado === "conquistado").length, 0);
    assert.equal(all.find(x => x.id === idea.id)?.estado, "en_curso");
    // Presencia sella gasto en el proyecto; no escribe peldaños.
    const updated = getProyectosLocal(USER).find(x => x.id === p.id);
    assert.equal(updated?.minutosPresencia, 15);
    assert.equal(updated?.gastoTiempo?.secPresencia, 15 * 60);
    assert.equal(updated?.gastoTiempo?.n, 1);
    assert.equal(updated?.minutosTotales ?? 0, 0);
  });

  it("cierre peldaño marca minutos en stats del Hub", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "centro" });
    const idea = await addPeldanoIdea(USER, p.id, "Turno");
    await setOleadaComoDireccion(USER, p.id, idea.id);

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_norte",
        titulo: "Segundo turno",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 40 * 60_000,
      }),
      { tipoOrigen: "tiempo", psGanados: 4, duracionMin: 40, destinoCierre: "peldano" }
    );

    const updated = getProyectosLocal(USER).find(x => x.id === p.id);
    assert.equal(updated?.minutosTotales, 40);
    assert.ok((updated?.gastoTiempo?.secDireccion ?? 0) >= 40 * 60);
    const stats = computeProyectoStats(getPeldanosByProyectoLocal(USER, p.id));
    assert.equal(stats.minutosTotales, 40);
    assert.equal(stats.conquistados, 1);
  });

  it("lista rápida e interrupt sellan pared en presencia sin peldaño", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "libre",
        titulo: "Mandados",
        proyectoId: p.id,
        tipoFlota: "situacion",
        situacionCronometro: null,
        destinoCierre: "presencia",
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 8 * 60_000,
      }),
      { tipoOrigen: "situacion", psGanados: 1, duracionMin: 8, destinoCierre: "presencia" }
    );
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "int1",
        titulo: "Llamada",
        proyectoId: p.id,
        tipoFlota: "situacion",
        vehiculoPadreDesglosadorId: "padre",
        destinoCierre: "presencia",
        aperturaAt: 2_000_000,
        cierreAt: 2_000_000 + 5 * 60_000,
      }),
      { tipoOrigen: "situacion", psGanados: 1, duracionMin: 5, destinoCierre: "presencia" }
    );
    const updated = getProyectosLocal(USER).find(x => x.id === p.id);
    assert.equal(updated?.minutosPresencia, 13);
    assert.equal(updated?.gastoTiempo?.n, 2);
    assert.equal(updated?.gastoTiempo?.sellos[0]?.src, "lista_rapida");
    assert.equal(updated?.gastoTiempo?.sellos[1]?.src, "interrupt");
    assert.equal(getPeldanosByProyectoLocal(USER, p.id).filter(x => x.estado === "conquistado").length, 0);
  });

  it("archivarOleada sella el timón y deja un capítulo consultable", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "centro" });
    const idea = await addPeldanoIdea(USER, p.id, "Casacas small");
    await setOleadaComoDireccion(USER, p.id, idea.id);
    await addOleadaPunto(USER, idea.id, "Plomos");

    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_cap",
        titulo: "Coser plomo",
        proyectoId: p.id,
        proyectoPeldanoId: idea.id,
        destinoCierre: "peldano",
        duracionFinal: 30,
      }),
      { tipoOrigen: "tiempo", psGanados: 2, duracionMin: 30, destinoCierre: "peldano" }
    );

    const closed = await archivarOleada(USER, idea.id);
    assert.equal(closed?.estado, "archivada");
    assert.ok((closed?.cerradoAt ?? 0) > 0);
    assert.equal((closed?.timonCerrados ?? []).length, 1);
    assert.equal(closed?.timonCerrados?.[0]?.vehiculos.length, 1);

    const all = getPeldanosByProyectoLocal(USER, p.id);
    assert.equal(getOleadaEnCurso(all)?.id, undefined);
    assert.equal(all.filter(x => x.estado === "idea" && x.id === idea.id).length, 0);
    assert.ok(all.some(x => x.estado === "conquistado" && x.resumen?.timon));
    const stats = computeProyectoStats(all);
    assert.equal(stats.archivadas, 1);
    const proyecto = getProyectosLocal(USER).find(x => x.id === p.id);
    assert.equal(proyecto?.oleadaTitulo, undefined);
  });

  it("activar otra oleada archiva la que ya tenía producción y no la mezcla con ideas", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const a = await addPeldanoIdea(USER, p.id, "Oleada A");
    const b = await addPeldanoIdea(USER, p.id, "Oleada B");
    await setOleadaComoDireccion(USER, p.id, a.id);
    await addOleadaPunto(USER, a.id, "Negro S");
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_a",
        titulo: "Corte S",
        proyectoId: p.id,
        proyectoPeldanoId: a.id,
        destinoCierre: "peldano",
        duracionFinal: 20,
      }),
      { tipoOrigen: "tiempo", psGanados: 1, duracionMin: 20, destinoCierre: "peldano" }
    );

    await setOleadaComoDireccion(USER, p.id, b.id);
    const all = getPeldanosByProyectoLocal(USER, p.id);
    assert.equal(all.find(x => x.id === a.id)?.estado, "archivada");
    assert.equal(all.find(x => x.id === b.id)?.estado, "en_curso");
    assert.equal(all.filter(x => x.estado === "idea").length, 0);
    assert.equal(getOleadaEnCurso(all)?.id, b.id);
  });

  it("activar otra oleada vacía devuelve la anterior a Ideas", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const a = await addPeldanoIdea(USER, p.id, "Borrador");
    const b = await addPeldanoIdea(USER, p.id, "De verdad");
    await setOleadaComoDireccion(USER, p.id, a.id);
    await setOleadaComoDireccion(USER, p.id, b.id);
    const all = getPeldanosByProyectoLocal(USER, p.id);
    assert.equal(all.find(x => x.id === a.id)?.estado, "idea");
    assert.equal(all.find(x => x.id === b.id)?.estado, "en_curso");
  });

  it("reabrir un capítulo la pone otra vez como oleada activa", async () => {
    const p = await addProyecto(USER, { titulo: "Costura", etiqueta: "proyecto" });
    const a = await addPeldanoIdea(USER, p.id, "Capítulo 1");
    await setOleadaComoDireccion(USER, p.id, a.id);
    await addOleadaPunto(USER, a.id, "Punto");
    await recordProgresoHubAlCerrarVehiculo(
      USER,
      vehicle({
        id: "v_re",
        titulo: "Turno 1",
        proyectoId: p.id,
        proyectoPeldanoId: a.id,
        destinoCierre: "peldano",
        duracionFinal: 15,
      }),
      { tipoOrigen: "tiempo", psGanados: 1, duracionMin: 15, destinoCierre: "peldano" }
    );
    await archivarOleada(USER, a.id);
    await setOleadaComoDireccion(USER, p.id, a.id);
    const all = getPeldanosByProyectoLocal(USER, p.id);
    const reabierta = all.find(x => x.id === a.id);
    assert.equal(reabierta?.estado, "en_curso");
    assert.equal((reabierta?.timonCerrados ?? []).length, 1);
    assert.equal(reabierta?.timonEpisodio?.vehiculos.length ?? 0, 0);
    assert.equal(getOleadaEnCurso(all)?.id, a.id);
  });
});

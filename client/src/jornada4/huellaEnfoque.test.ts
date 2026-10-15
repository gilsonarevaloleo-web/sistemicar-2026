import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bumpProduccionSiCabe,
  bumpRingHuella,
  bumpRingHuellaOnVehicle,
  computeHuellaEnfoque,
  computeHuellaPeriodo,
  ensureRingHuella,
  HUELLA_DECISION_UMBRAL,
  HUELLA_EJES,
  HUELLA_RADIO_MIN,
  huellaCierreCopy,
  huellaEjesLine,
  medirHuellaEjesFromLectura,
  mergeRingHuella,
  seedRingHuella,
  sellRingHuella,
  type HuellaEnfoqueInput,
  type RingHuellaLectura,
  type RingHuellaState,
} from "./huellaEnfoque.ts";

function baseState(over: Partial<RingHuellaState> = {}): RingHuellaState {
  return {
    ...seedRingHuella({
      launchedAt: 1_000,
      filasLaunch: 3,
      minutosLaunch: 30,
      tieneMeta: true,
      ordenLaunchIds: ["a", "b", "c"],
    }),
    ...over,
  };
}

function ring(over: Partial<HuellaEnfoqueInput> = {}): HuellaEnfoqueInput {
  return {
    id: "d1",
    aperturaAt: 1_000,
    situacionCronometro: {
      activo: true,
      bloqueInicioAt: 1_000,
      horaFinContratoMs: 1_000 + 30 * 60_000,
      minutosGanadosSesion: 0,
    },
    situacionCupoAnchor: { subTareaId: "a", startedAt: 1_000 },
    subTareas: [
      { id: "a", texto: "Foco", enDesgloseCronometro: true, minutosCupo: 10 },
      { id: "b", texto: "Cola", enDesgloseCronometro: true, minutosCupo: 10 },
      { id: "c", texto: "Tercera", enDesgloseCronometro: true, minutosCupo: 10 },
    ],
    ringHuella: baseState(),
    ...over,
  };
}

function sello(over: Partial<RingHuellaLectura> = {}): RingHuellaLectura {
  return {
    decision: 70,
    atencion: 80,
    produccion: 40,
    foco: 75,
    orden: 60,
    huella: 65,
    relato: "sellado",
    gestos: 1,
    minutosGanados: 4,
    vehiculos: 3,
    horasBloque: 0.5,
    desglosadores: 1,
    anadidas: 0,
    atencionCierres: 0,
    ...over,
  };
}

describe("huellaEnfoque diccionario", () => {
  it("nombra los cinco músculos del desglosador", () => {
    assert.equal(HUELLA_DECISION_UMBRAL, 3);
    assert.equal(HUELLA_RADIO_MIN, 5);
    assert.match(HUELLA_EJES.find(e => e.id === "decision")!.definicion, /primera lista/i);
    assert.match(HUELLA_EJES.find(e => e.id === "decision")!.definicion, /disponibilidad/i);
    assert.match(HUELLA_EJES.find(e => e.id === "atencion")!.definicion, /5 minutos antes/i);
    assert.match(HUELLA_EJES.find(e => e.id === "produccion")!.definicion, /después del lanzamiento/i);
    assert.match(HUELLA_EJES.find(e => e.id === "foco")!.definicion, /radio de 5/i);
    assert.match(HUELLA_EJES.find(e => e.id === "orden")!.definicion, /quitar/i);
    assert.equal(HUELLA_EJES.some(e => e.id === "certeza"), false);
    assert.equal(HUELLA_EJES.some(e => e.id === "ganancia"), false);
  });

  it("siembra y acumula gestos de coreografía", () => {
    const seeded = seedRingHuella({
      launchedAt: 10,
      filasLaunch: 2,
      minutosLaunch: 20,
      tieneMeta: true,
      ordenLaunchIds: ["x", "y"],
    });
    assert.equal(seeded.anadidas, 0);
    const bumped = bumpRingHuella(
      bumpRingHuella(bumpRingHuella(seeded, "reorder"), "postergar"),
      "quitar"
    );
    assert.equal(bumped.reorders, 1);
    assert.equal(bumped.postergas, 1);
    assert.equal(bumped.quitadas, 1);
  });

  it("ensure crea semilla de fallback sin inventar gestos", () => {
    const h = ensureRingHuella({
      aperturaAt: 5_000,
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: 5_000,
        horaFinContratoMs: 5_000 + 15 * 60_000,
      },
      subTareas: [
        { id: "1", enDesgloseCronometro: true, minutosCupo: 8 },
        { id: "2", enDesgloseCronometro: true, minutosCupo: 7 },
      ],
    });
    assert.equal(h.filasLaunch, 2);
    assert.equal(h.minutosLaunch, 15);
    assert.equal(h.tieneMeta, true);
    assert.deepEqual(h.ordenLaunchIds, ["1", "2"]);
    assert.equal(h.reorders, 0);
    assert.equal(h.anadidas, 0);
  });

  it("merge conserva el lado con más gestos y el sello", () => {
    const local = { ...baseState(), reorders: 3, postergas: 1, anadidas: 2 };
    const remote = { ...baseState(), reorders: 1, sello: sello() };
    const m = mergeRingHuella(remote, local);
    assert.ok(m);
    assert.equal(m!.reorders, 3);
    assert.equal(m!.postergas, 1);
    assert.equal(m!.anadidas, 2);
    assert.equal(m!.sello?.huella, 65);
  });

  it("decisión es solo la primera lista; añadir después no la sube", () => {
    const tres = computeHuellaEnfoque(ring(), 1_000);
    const cuatroLaunch = computeHuellaEnfoque(
      ring({
        subTareas: [
          { id: "a", enDesgloseCronometro: true, minutosCupo: 8 },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 8 },
          { id: "c", enDesgloseCronometro: true, minutosCupo: 8 },
          { id: "d", enDesgloseCronometro: true, minutosCupo: 8 },
        ],
        ringHuella: { ...baseState(), filasLaunch: 4, ordenLaunchIds: ["a", "b", "c", "d"] },
      }),
      1_000
    );
    const tresMasAnadidas = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), filasLaunch: 3, anadidas: 5 },
      }),
      1_000
    );
    assert.ok(tres.decision < 70, `decisión 3: ${tres.decision}`);
    assert.ok(cuatroLaunch.decision >= 78, `decisión 4: ${cuatroLaunch.decision}`);
    assert.equal(tres.decision, tresMasAnadidas.decision);
    assert.ok(tresMasAnadidas.produccion > tres.produccion);
    assert.match(cuatroLaunch.relato, /disponibilidad|decidiste/i);
  });

  it("decisión plateau: 4 y 8 valen igual", () => {
    const mk = (n: number) =>
      computeHuellaEnfoque(
        ring({
          subTareas: Array.from({ length: n }, (_, i) => ({
            id: String.fromCharCode(97 + i),
            enDesgloseCronometro: true,
            minutosCupo: 8,
          })),
          ringHuella: {
            ...baseState(),
            filasLaunch: n,
            ordenLaunchIds: Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i)),
          },
        }),
        1_000
      );
    assert.equal(mk(4).decision, mk(8).decision);
    assert.equal(mk(4).decision, 82);
  });

  it("atención es cerrar 5 minutos antes del tope, sumado en el desglosador", () => {
    const una = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 10,
            duracionRealSec: 5 * 60,
            cerradaAt: 1_000 + 5 * 60_000,
          },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 10 },
        ],
        situacionCupoAnchor: { subTareaId: "b", startedAt: 1_000 + 5 * 60_000 },
      }),
      1_000 + 6 * 60_000
    );
    const dos = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 10,
            duracionRealSec: 5 * 60,
            cerradaAt: 1_000 + 5 * 60_000,
          },
          {
            id: "b",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 12,
            duracionRealSec: 7 * 60,
            cerradaAt: 1_000 + 12 * 60_000,
          },
        ],
        situacionCupoAnchor: null,
      }),
      1_000 + 13 * 60_000
    );
    const tarde = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 10,
            duracionRealSec: 10 * 60,
            cerradaAt: 1_000 + 10 * 60_000,
          },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 10 },
        ],
      }),
      1_000 + 11 * 60_000
    );
    assert.ok(una.atencion > tarde.atencion, `una ${una.atencion} vs tarde ${tarde.atencion}`);
    assert.ok(dos.atencion >= una.atencion, `dos ${dos.atencion} vs una ${una.atencion}`);
    assert.equal(dos.atencionCierres, 2);
    assert.match(una.relato, /atención/i);
  });

  it("producción no cuenta si se añade en la ventana de 5 minutos", () => {
    const lejos = bumpProduccionSiCabe(ring(), 1_000 + 2 * 60_000);
    const ventana = bumpProduccionSiCabe(ring(), 1_000 + 6 * 60_000);
    assert.equal(lejos.anadidas, 1);
    assert.equal(ventana.anadidas, 0);
  });

  it("orden es quitar, reordenar y postergar", () => {
    const base = computeHuellaEnfoque(ring(), 1_000);
    const musculo = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), reorders: 2, postergas: 1, quitadas: 1 },
      }),
      1_000
    );
    assert.ok(musculo.orden > base.orden, `orden ${musculo.orden} vs ${base.orden}`);
    assert.match(musculo.relato, /orden/i);
  });

  it("foco es cerrar la última en el radio de 5 minutos del final", () => {
    const meta = 1_000 + 30 * 60_000;
    const enRadio = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            cerradaAt: meta - 2 * 60_000,
            minutosCupo: 10,
          },
          {
            id: "b",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            cerradaAt: meta - 60_000,
            minutosCupo: 10,
          },
        ],
        situacionCronometro: {
          activo: true,
          bloqueInicioAt: 1_000,
          horaFinContratoMs: meta,
        },
        situacionCupoAnchor: null,
      }),
      meta - 30_000
    );
    const lejos = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            cerradaAt: meta - 20 * 60_000,
            minutosCupo: 10,
          },
        ],
        situacionCronometro: {
          activo: true,
          bloqueInicioAt: 1_000,
          horaFinContratoMs: meta,
        },
        situacionCupoAnchor: null,
      }),
      meta - 19 * 60_000
    );
    assert.ok(enRadio.foco > lejos.foco, `radio ${enRadio.foco} vs lejos ${lejos.foco}`);
    assert.match(enRadio.relato, /radio de 5|foco/i);
  });

  it("el periodo suma desglosadores: no promedia vehículos sueltos", () => {
    const a = ring({
      id: "d-a",
      ringHuella: { ...baseState(), filasLaunch: 4, anadidas: 1 },
    });
    const b = ring({
      id: "d-b",
      ringHuella: { ...baseState(), filasLaunch: 2, anadidas: 2, reorders: 1 },
      subTareas: [
        { id: "x", enDesgloseCronometro: true, minutosCupo: 10 },
        { id: "y", enDesgloseCronometro: true, minutosCupo: 10 },
      ],
    });
    const dia = computeHuellaPeriodo([a, b], 1_000);
    assert.equal(dia.desglosadores, 2);
    assert.equal(dia.anadidas, 3);
    assert.ok(dia.produccion > computeHuellaEnfoque(a, 1_000).produccion);
  });

  it("sello al cierre congela la lectura aunque el cronómetro se apague", () => {
    const sold = sellRingHuella(
      ring({
        ringHuella: { ...baseState(), reorders: 1, quitadas: 1 },
        situacionCronometro: {
          activo: false,
          minutosGanadosSesion: 5,
          horaFinContratoMs: 1_000 + 30 * 60_000,
        },
      }),
      1_000
    );
    assert.ok(sold.sello);
    assert.equal(typeof sold.sello!.decision, "number");
    const replay = computeHuellaEnfoque(
      {
        situacionCronometro: { activo: false },
        ringHuella: sold,
      },
      9_999_999
    );
    assert.equal(replay.huella, sold.sello!.huella);
    assert.equal(replay.relato, sold.sello!.relato);
  });

  it("copy de cierre engancha con el relato, no con una boleta", () => {
    const lectura = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), filasLaunch: 4, reorders: 2 },
      }),
      1_000
    );
    const copy = huellaCierreCopy(lectura);
    assert.match(copy.title, /disponibilidad|decidiste|orden|atención|foco|producción/i);
    assert.match(
      huellaEjesLine(lectura),
      /Decisión .+ · Atención .+ · Producción .+ · Foco .+ · Orden .+/
    );
    assert.equal(huellaEjesLine(lectura).includes("%"), false);
    assert.match(copy.description, /PS de Jornada se quedan/);
  });

  it("los 5 puntos se miden: escalables o puntuales, sin amontonar %", () => {
    const lectura = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), filasLaunch: 4, anadidas: 2, reorders: 1, quitadas: 1 },
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 10,
            duracionRealSec: 5 * 60,
            cerradaAt: 1_000 + 5 * 60_000,
          },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 10 },
          { id: "c", enDesgloseCronometro: true, minutosCupo: 10 },
          { id: "d", enDesgloseCronometro: true, minutosCupo: 10 },
        ],
      }),
      1_000 + 6 * 60_000
    );
    const medidas = medirHuellaEjesFromLectura(lectura);
    assert.equal(medidas.length, 5);
    const decision = medidas.find(e => e.id === "decision")!;
    const atencion = medidas.find(e => e.id === "atencion")!;
    const foco = medidas.find(e => e.id === "foco")!;
    const produccion = medidas.find(e => e.id === "produccion")!;
    const orden = medidas.find(e => e.id === "orden")!;
    assert.equal(decision.puntual, false);
    assert.ok(decision.nivel >= 3, `decisión nivel ${decision.nivel}`);
    assert.equal(atencion.puntual, true);
    assert.ok(atencion.nivel >= 1);
    assert.match(atencion.marca, /×/);
    assert.equal(foco.puntual, true);
    assert.ok(produccion.nivel >= 2);
    assert.ok(orden.nivel >= 2);
    assert.equal(medidas.every(e => e.nivel >= 0 && e.nivel <= 5), true);
  });

  it("músculo vacío arranca en 0 — la escala se gana", () => {
    const vacio = computeHuellaEnfoque(
      ring({
        subTareas: [],
        ringHuella: { ...baseState(), filasLaunch: 0, ordenLaunchIds: [] },
      }),
      1_000
    );
    const medidas = medirHuellaEjesFromLectura(vacio);
    assert.equal(medidas.every(e => e.nivel === 0), true);
    assert.equal(vacio.atencion, 0);
    assert.equal(vacio.produccion, 0);
    assert.equal(vacio.foco, 0);
    assert.equal(vacio.orden, 0);
  });

  it("bumpRingHuellaOnVehicle no pisa un estado existente", () => {
    const next = bumpRingHuellaOnVehicle(
      ring({ ringHuella: { ...baseState(), reorders: 4 } }),
      "reorder"
    );
    assert.equal(next.reorders, 5);
    assert.equal(next.filasLaunch, 3);
  });
});

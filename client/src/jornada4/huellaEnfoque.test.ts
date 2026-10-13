import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bumpRingHuella,
  bumpRingHuellaOnVehicle,
  computeHuellaEnfoque,
  ensureRingHuella,
  HUELLA_EJES,
  HUELLA_ORDEN_UMBRAL,
  huellaCierreCopy,
  huellaEjesLine,
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
    atencion: 70,
    orden: 80,
    certeza: 90,
    ganancia: 40,
    foco: 75,
    huella: 71,
    relato: "sellado",
    gestos: 1,
    minutosGanados: 4,
    vehiculos: 3,
    horasBloque: 0.5,
    ...over,
  };
}

describe("huellaEnfoque diccionario", () => {
  it("nombra los cinco músculos sin etiqueta negativa", () => {
    assert.equal(HUELLA_ORDEN_UMBRAL, 3);
    assert.match(HUELLA_EJES.find(e => e.id === "atencion")!.definicion, /no montar límites/i);
    assert.match(HUELLA_EJES.find(e => e.id === "orden")!.definicion, /más de 3/);
    assert.match(HUELLA_EJES.find(e => e.id === "certeza")!.definicion, /editar los minutos/i);
    assert.match(HUELLA_EJES.find(e => e.id === "ganancia")!.definicion, /2–3 horas|2-3 horas/);
    assert.match(HUELLA_EJES.find(e => e.id === "foco")!.definicion, /último a tiempo/i);
    assert.match(HUELLA_EJES.find(e => e.id === "foco")!.definicion, /músculo/i);
  });

  it("siembra y acumula gestos de coreografía, no de cierre", () => {
    const seeded = seedRingHuella({
      launchedAt: 10,
      filasLaunch: 2,
      minutosLaunch: 20,
      tieneMeta: true,
      ordenLaunchIds: ["x", "y"],
    });
    assert.equal(seeded.reorders, 0);
    const bumped = bumpRingHuella(
      bumpRingHuella(bumpRingHuella(seeded, "reorder"), "postergar"),
      "quitar"
    );
    assert.equal(bumped.reorders, 1);
    assert.equal(bumped.postergas, 1);
    assert.equal(bumped.quitadas, 1);
    assert.equal(bumped.selladas, 0);
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
  });

  it("merge conserva el lado con más gestos y el sello", () => {
    const local = { ...baseState(), reorders: 3, postergas: 1 };
    const remote = { ...baseState(), reorders: 1, sello: sello() };
    const m = mergeRingHuella(remote, local);
    assert.ok(m);
    assert.equal(m!.reorders, 3);
    assert.equal(m!.postergas, 1);
    assert.equal(m!.sello?.huella, 71);
  });

  it("orden se desarrolla al listar más de 3 vehículos", () => {
    const tres = computeHuellaEnfoque(ring(), 1_000);
    const cuatro = computeHuellaEnfoque(
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
    assert.ok(tres.orden < 70, `orden 3: ${tres.orden}`);
    assert.ok(cuatro.orden >= 78, `orden 4: ${cuatro.orden}`);
    assert.match(cuatro.relato, /listaste 4|orden/i);
  });

  it("certeza crece al editar minutos, no baja", () => {
    const sinEditar = computeHuellaEnfoque(ring(), 1_000);
    const editado = computeHuellaEnfoque(
      ring({ ringHuella: { ...baseState(), cupoEdits: 3 } }),
      1_000
    );
    assert.ok(editado.certeza > sinEditar.certeza);
    assert.match(editado.relato, /editaste los minutos|certeza/i);
  });

  it("sellar no etiqueta ni recorta foco; atención es no montar más límites", () => {
    const limpio = computeHuellaEnfoque(ring(), 1_000);
    const sellado = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), selladas: 3 },
      }),
      1_000
    );
    assert.ok(sellado.atencion <= limpio.atencion);
    assert.equal(sellado.foco, limpio.foco);
    assert.doesNotMatch(sellado.relato, /roba|caos|negativa no/i);
    assert.doesNotMatch(sellado.relato, /no se premia|etiqueta negativa$/i);
  });

  it("quitar, reordenar y postergar son foco", () => {
    const base = computeHuellaEnfoque(ring(), 1_000);
    const musculo = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), reorders: 2, postergas: 1, quitadas: 1 },
      }),
      1_000
    );
    assert.ok(musculo.foco > base.foco, `foco ${musculo.foco} vs ${base.foco}`);
    assert.match(musculo.relato, /foco/i);
    assert.match(musculo.relato, /músculo/i);
  });

  it("cerrar el último a tiempo desarrolla foco", () => {
    const meta = 1_000 + 30 * 60_000;
    const aTiempo = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            cerradaAt: meta - 60_000,
            minutosCupo: 10,
          },
          {
            id: "b",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            cerradaAt: meta - 10_000,
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
      meta - 5_000
    );
    const tarde = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            cerradaAt: meta + 120_000,
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
      meta + 180_000
    );
    assert.ok(aTiempo.foco > tarde.foco, `foco a tiempo ${aTiempo.foco} vs tarde ${tarde.foco}`);
    assert.match(aTiempo.relato, /último a tiempo/i);
  });

  it("ganancia valora vehículos vs 2–3 horas más que los minutos ganados", () => {
    const corto = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), filasLaunch: 6, minutosLaunch: 30 },
        situacionCronometro: {
          activo: true,
          minutosGanadosSesion: 40,
          horaFinContratoMs: 1_000 + 30 * 60_000,
        },
      }),
      1_000
    );
    const bloqueLargo = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), filasLaunch: 6, minutosLaunch: 120 },
        situacionCronometro: {
          activo: true,
          minutosGanadosSesion: 0,
          horaFinContratoMs: 1_000 + 120 * 60_000,
        },
      }),
      1_000
    );
    const pocos = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), filasLaunch: 2, minutosLaunch: 120 },
        subTareas: [
          { id: "a", enDesgloseCronometro: true, minutosCupo: 60 },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 60 },
        ],
        situacionCronometro: {
          activo: true,
          minutosGanadosSesion: 0,
          horaFinContratoMs: 1_000 + 120 * 60_000,
        },
      }),
      1_000
    );
    assert.ok(
      bloqueLargo.ganancia > corto.ganancia,
      `2h ${bloqueLargo.ganancia} vs 30min ${corto.ganancia}`
    );
    assert.ok(
      bloqueLargo.ganancia > pocos.ganancia,
      `6 veh ${bloqueLargo.ganancia} vs 2 veh ${pocos.ganancia}`
    );
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

  it("copy de cierre nombra huella y los cinco ejes", () => {
    const lectura = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), reorders: 2 },
        situacionCronometro: {
          activo: true,
          minutosGanadosSesion: 6,
          horaFinContratoMs: 1_000 + 30 * 60_000,
        },
      }),
      1_000
    );
    const copy = huellaCierreCopy(lectura);
    assert.match(copy.title, /Huella \d+%/);
    assert.match(huellaEjesLine(lectura), /Atención \d+ · Orden \d+ · Certeza \d+ · Ganancia \d+ · Foco \d+/);
    assert.match(copy.description, /Atención/);
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

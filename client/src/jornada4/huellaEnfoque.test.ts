import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bumpRingHuella,
  bumpRingHuellaOnVehicle,
  computeHuellaEnfoque,
  ensureRingHuella,
  huellaCierreCopy,
  huellaEjesLine,
  mergeRingHuella,
  seedRingHuella,
  sellRingHuella,
  type HuellaEnfoqueInput,
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

describe("huellaEnfoque", () => {
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
    const remote = {
      ...baseState(),
      reorders: 1,
      sello: {
        atencion: 70,
        orden: 80,
        certeza: 90,
        ganancia: 40,
        foco: 75,
        huella: 71,
        relato: "sellado",
        gestos: 1,
        minutosGanados: 4,
      },
    };
    const m = mergeRingHuella(remote, local);
    assert.ok(m);
    assert.equal(m!.reorders, 3);
    assert.equal(m!.postergas, 1);
    assert.equal(m!.sello?.huella, 71);
  });

  it("un launch limpio ya tiene certeza alta sin pedir tareas extra", () => {
    const lectura = computeHuellaEnfoque(ring(), 1_000 + 90_000);
    assert.ok(lectura.certeza >= 90, `certeza ${lectura.certeza}`);
    assert.ok(lectura.huella >= 45);
    assert.match(lectura.relato, /entrenamiento|ring|contar/i);
  });

  it("reordenar + postergar + minutos ganados sube orden/ganancia y cuenta la historia", () => {
    const lectura = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), reorders: 2, postergas: 1 },
        situacionCronometro: {
          activo: true,
          bloqueInicioAt: 1_000,
          horaFinContratoMs: 1_000 + 30 * 60_000,
          minutosGanadosSesion: 8,
        },
      }),
      1_000 + 90_000
    );
    assert.ok(lectura.orden >= 70, `orden ${lectura.orden}`);
    assert.ok(lectura.ganancia >= 70, `ganancia ${lectura.ganancia}`);
    assert.equal(lectura.gestos, 3);
    assert.match(lectura.relato, /reordenaste|postergaste|ganaste/i);
    assert.match(lectura.relato, /entren/i);
  });

  it("sellar filas extra en vivo baja atención, certeza y foco — no se premia nombrar", () => {
    const limpio = computeHuellaEnfoque(ring(), 1_000);
    const ruidoso = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), selladas: 3 },
      }),
      1_000
    );
    assert.ok(ruidoso.atencion < limpio.atencion);
    assert.ok(ruidoso.certeza < limpio.certeza);
    assert.ok(ruidoso.foco < limpio.foco);
    assert.match(ruidoso.relato, /roba el foco|nombrar/i);
  });

  it("quitar filas es higiene: sube atención y orden", () => {
    const limpio = computeHuellaEnfoque(ring(), 1_000);
    const recorte = computeHuellaEnfoque(
      ring({
        ringHuella: { ...baseState(), quitadas: 2 },
      }),
      1_000
    );
    assert.ok(recorte.atencion > limpio.atencion);
    assert.ok(recorte.orden > limpio.orden);
    assert.match(recorte.relato, /quitaste|nítido/i);
  });

  it("cumplidos sin ruido premian foco; fallados bajan atención", () => {
    const ok = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "cumplido",
            minutosCupo: 10,
          },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 10 },
        ],
        situacionCupoAnchor: { subTareaId: "b", startedAt: 1_000 },
      }),
      1_000
    );
    const fail = computeHuellaEnfoque(
      ring({
        subTareas: [
          {
            id: "a",
            enDesgloseCronometro: true,
            resultadoSituacion: "fallado",
            minutosCupo: 10,
          },
          { id: "b", enDesgloseCronometro: true, minutosCupo: 10 },
        ],
        situacionCupoAnchor: { subTareaId: "b", startedAt: 1_000 },
      }),
      1_000
    );
    assert.ok(ok.atencion > fail.atencion);
    assert.ok(ok.foco >= 70);
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

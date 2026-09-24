import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyListaLibreRowClose,
  buildSituacionLibreSeed,
  isSituacionListaLibre,
  listaLibreRowStartedAt,
} from "./situacionLibreSeed.ts";
import type { Vehicle } from "../lib/persistence.ts";

describe("situacionLibreSeed", () => {
  it("crea filas sin ring ni meta", () => {
    const seed = buildSituacionLibreSeed({
      filas: [" A ", "", "B"],
      now: 1000,
    });
    assert.ok(seed);
    assert.equal(seed!.subTareas.length, 2);
    assert.equal(seed!.subTareas[0]!.enDesgloseCronometro, false);
    assert.equal(seed!.situacionCronometro, null);
  });

  it("dirección por fila sobrescribe el default del vehículo", () => {
    const seed = buildSituacionLibreSeed({
      filas: ["A", "B"],
      filasProyectoIds: ["proy-a", undefined],
      proyectoEnfoqueId: "proy-default",
      now: 2000,
    });
    assert.ok(seed);
    assert.equal(seed!.subTareas[0]!.proyectoId, "proy-a");
    assert.equal(seed!.subTareas[1]!.proyectoId, "proy-default");
  });

  it("alinea familia si hay una fila vacía en el medio", () => {
    const seed = buildSituacionLibreSeed({
      filas: ["cortar", "", "coser"],
      filasSeccionTitulos: ["Armado de bolsillos", "ignorar", "Armado de bolsillos"],
      now: 3000,
    });
    assert.ok(seed);
    assert.equal(seed!.subTareas.length, 2);
    assert.equal(seed!.subTareas[0]!.seccionTitulo, "Armado de bolsillos");
    assert.equal(seed!.subTareas[1]!.texto, "coser");
    assert.equal(seed!.subTareas[1]!.seccionTitulo, "Armado de bolsillos");
  });

  it("detecta lista libre vs ring", () => {
    const libre = {
      id: "1",
      titulo: "L",
      status: "activo",
      userId: "u",
      tipoFlota: "situacion",
      subTareas: [
        {
          id: "a",
          texto: "x",
          completada: false,
          creadaAt: 1,
          enDesgloseCronometro: false,
        },
      ],
    } as Vehicle;
    assert.equal(isSituacionListaLibre(libre), true);
    assert.equal(
      isSituacionListaLibre({
        ...libre,
        situacionCronometro: { activo: true, bloqueInicioAt: 1 },
      }),
      false
    );
    assert.equal(
      isSituacionListaLibre({
        ...libre,
        situacionCronometro: { activo: false, bloqueInicioAt: 1 },
        subTareas: [
          {
            id: "a",
            texto: "x",
            completada: false,
            creadaAt: 1,
            enDesgloseCronometro: true,
            resultadoSituacion: "pendiente",
          },
        ],
      }),
      false
    );
  });

  it("mide el tramo de la fila desde apertura y acredita al menos 1s", () => {
    const seed = buildSituacionLibreSeed({
      filas: ["llamar"],
      now: 10_000,
    });
    const vehicle = {
      tipoFlota: "situacion" as const,
      status: "activo" as const,
      aperturaAt: 10_000,
      subTareas: seed!.subTareas,
    };
    assert.equal(listaLibreRowStartedAt(vehicle, seed!.subTareas[0]!.id), 10_000);
    const closed = applyListaLibreRowClose(vehicle, seed!.subTareas[0]!.id, "cumplido", 10_000);
    assert.ok(closed);
    assert.equal(closed!.closed.duracionRealSec, 1);
    assert.equal(closed!.closed.resultadoSituacion, "cumplido");
    assert.equal(closed!.closed.cerradaAt, 10_000);
  });

  it("la segunda fila empieza cuando cerró la anterior (una a la vez)", () => {
    const seed = buildSituacionLibreSeed({
      filas: ["a", "b"],
      now: 1_000,
    });
    const first = applyListaLibreRowClose(
      {
        tipoFlota: "situacion",
        status: "activo",
        aperturaAt: 1_000,
        subTareas: seed!.subTareas,
      },
      seed!.subTareas[0]!.id,
      "cumplido",
      61_000
    );
    assert.equal(first!.closed.duracionRealSec, 60);
    const second = applyListaLibreRowClose(
      {
        tipoFlota: "situacion",
        status: "activo",
        aperturaAt: 1_000,
        subTareas: first!.subTareas,
      },
      seed!.subTareas[1]!.id,
      "cumplido",
      91_000
    );
    assert.equal(second!.closed.duracionRealSec, 30);
  });
});

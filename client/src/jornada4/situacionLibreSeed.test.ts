import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSituacionLibreSeed, isSituacionListaLibre } from "./situacionLibreSeed.ts";
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
});

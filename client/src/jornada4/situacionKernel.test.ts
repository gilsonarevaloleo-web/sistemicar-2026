import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySituacionRowClose,
  applySituacionBlockClose,
} from "./situacionKernel.ts";
import type { SubTarea, Vehicle } from "../lib/persistence.ts";

function row(partial: Partial<SubTarea> & { id: string; texto: string }): SubTarea {
  return {
    completada: false,
    creadaAt: Date.now(),
    enDesgloseCronometro: true,
    resultadoSituacion: "pendiente",
    minutosCupo: 5,
    ...partial,
  } as SubTarea;
}

function vehicle(subs: SubTarea[]): Vehicle {
  const now = Date.now();
  return {
    id: "s1",
    titulo: "Test situacion",
    status: "activo",
    userId: "u1",
    tipoFlota: "situacion",
    aperturaAt: now - 60_000,
    subTareas: subs,
    situacionCupoAnchor: { subTareaId: subs[0]?.id, startedAt: now - 30_000 },
    situacionCronometro: {
      activo: true,
      bloqueInicioAt: now - 60_000,
      horaFinMs: now + 30 * 60_000,
      horaFinContratoMs: now + 30 * 60_000,
    },
  } as Vehicle;
}

describe("situacionKernel", () => {
  it("cierra fila cumplido y deja bloqueListo si era la última", () => {
    const now = Date.now();
    const v = vehicle([row({ id: "r1", texto: "Fila 1" })]);
    const patch = applySituacionRowClose(v, "r1", "cumplido", now);
    assert.ok(patch);
    assert.equal(patch!.bloqueListo, true);
    assert.equal(
      patch!.subTareas.find(s => s.id === "r1")?.resultadoSituacion,
      "cumplido"
    );

    const block = applySituacionBlockClose(
      {
        ...v,
        subTareas: patch!.subTareas,
        situacionCronometro: patch!.situacionCronometro,
        situacionCupoAnchor: patch!.situacionCupoAnchor,
      },
      now
    );
    assert.ok(block);
    assert.equal(block!.status, "cumplido");
    assert.equal(block!.situacionCronometro?.activo, false);
  });

  it("rechaza cierre si la fila no está pendiente en ring", () => {
    const v = vehicle([
      row({ id: "r1", texto: "Done", resultadoSituacion: "cumplido", completada: true }),
    ]);
    const patch = applySituacionRowClose(v, "r1", "cumplido");
    assert.equal(patch, null);
  });

  it("cierra fila avance: marca resultado avance, completada false, sin ganancia/pérdida", () => {
    const now = Date.now();
    const v = vehicle([
      row({ id: "r1", texto: "Fila 1" }),
      row({ id: "r2", texto: "Fila 2" }),
    ]);
    const patch = applySituacionRowClose(v, "r1", "avance", now);
    assert.ok(patch);
    const closed = patch!.subTareas.find(s => s.id === "r1");
    assert.equal(closed?.resultadoSituacion, "avance");
    assert.equal(closed?.completada, false);
    assert.ok(closed?.cerradaAt);
    // Sin ganancia ni pérdida de tiempo
    assert.equal(patch!.minutosGanados, 0);
    assert.equal(patch!.minutosPerdidos, 0);
    // bloqueListo false porque queda r2 pendiente
    assert.equal(patch!.bloqueListo, false);
  });

  it("avance en la última fila: bloqueListo true y bloque status cumplido", () => {
    const now = Date.now();
    const v = vehicle([row({ id: "r1", texto: "Única" })]);
    const patch = applySituacionRowClose(v, "r1", "avance", now);
    assert.ok(patch);
    assert.equal(patch!.bloqueListo, true);

    const block = applySituacionBlockClose(
      {
        ...v,
        subTareas: patch!.subTareas,
        situacionCronometro: patch!.situacionCronometro,
        situacionCupoAnchor: patch!.situacionCupoAnchor,
      },
      now
    );
    assert.ok(block);
    // anyCumplido incluye avance → status cumplido
    assert.equal(block!.status, "cumplido");
  });

  it("bloque solo con fallados → status archivado", () => {
    const now = Date.now();
    const v = vehicle([row({ id: "r1", texto: "Fila 1" })]);
    const patch = applySituacionRowClose(v, "r1", "fallado", now);
    assert.ok(patch);
    assert.equal(patch!.bloqueListo, true);

    const block = applySituacionBlockClose(
      {
        ...v,
        subTareas: patch!.subTareas,
        situacionCronometro: patch!.situacionCronometro,
        situacionCupoAnchor: patch!.situacionCupoAnchor,
      },
      now
    );
    assert.ok(block);
    assert.equal(block!.status, "archivado");
  });
});

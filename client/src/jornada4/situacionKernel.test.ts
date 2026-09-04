import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySituacionRowClose,
  applySituacionBlockClose,
  applySituacionQuitarFila,
  postergarFilaEnFocoACola,
} from "./situacionKernel.ts";
import { collectExecutedDecisionsFromVehicle } from "../lib/ringDecisionTranscript.ts";
import { sumMinutosCronometroPendientes } from "../lib/situacionCupoDistrib.ts";
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
    // Sin veredicto de ganancia/pérdida (PS/bolsa); el tiempo sí se realinea al tope.
    assert.equal(patch!.minutosGanados, 0);
    assert.equal(patch!.minutosPerdidos, 0);
    // bloqueListo false porque queda r2 pendiente
    assert.equal(patch!.bloqueListo, false);
  });

  it("avance tras ganancia entrega al siguiente el tiempo hasta el tope", () => {
    const base = 2_000_000;
    const meta = base + 60 * 60_000;
    const rows = [
      row({ id: "r1", texto: "A", minutosCupo: 20 }),
      row({ id: "r2", texto: "B", minutosCupo: 20 }),
      row({ id: "r3", texto: "C", minutosCupo: 20 }),
    ];
    const v = {
      ...vehicle(rows),
      aperturaAt: base,
      situacionCupoAnchor: { subTareaId: "r1", startedAt: base },
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: base,
        horaFinMs: meta,
        horaFinContratoMs: meta,
      },
    } as Vehicle;

    const afterGain = applySituacionRowClose(v, "r1", "cumplido", base + 5 * 60_000);
    assert.ok(afterGain);
    assert.ok((afterGain!.minutosGanados ?? 0) > 0);

    const mid = {
      ...v,
      subTareas: afterGain!.subTareas,
      situacionCronometro: afterGain!.situacionCronometro,
      situacionCupoAnchor: afterGain!.situacionCupoAnchor,
    } as Vehicle;
    const nowAvance = base + 10 * 60_000;
    const patch = applySituacionRowClose(mid, "r2", "avance", nowAvance);
    assert.ok(patch);
    assert.equal(patch!.minutosGanados, 0);
    assert.equal(patch!.subTareas.find(s => s.id === "r2")?.resultadoSituacion, "avance");
    assert.equal(patch!.subTareas.find(s => s.id === "r3")?.minutosCupo, 50);
    assert.equal(sumMinutosCronometroPendientes(patch!.subTareas), 50);
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

  it("postergar fila en foco la manda a cola con minutos restantes", () => {
    const now = 2_000_000;
    const startedAt = now - 10 * 60_000; // 10 min transcurridos
    const v = {
      ...vehicle([
        row({ id: "r1", texto: "Revisión", minutosCupo: 40 }),
        row({ id: "r2", texto: "Siguiente", minutosCupo: 30 }),
        row({ id: "r3", texto: "Otra", minutosCupo: 20 }),
      ]),
      situacionCupoAnchor: { subTareaId: "r1", startedAt },
      situacionCronometro: {
        activo: true,
        bloqueInicioAt: startedAt,
        horaFinMs: now + 90 * 60_000,
        horaFinContratoMs: now + 90 * 60_000,
      },
    } as Vehicle;

    const patch = postergarFilaEnFocoACola(v, now);
    assert.ok(patch);
    assert.equal(patch!.filaPostergadaId, "r1");
    assert.equal(patch!.minutosConservados, 30); // 40 - 10
    assert.equal(patch!.nuevoFocoId, "r2");
    assert.equal(patch!.situacionCupoAnchor.subTareaId, "r2");

    const pending = patch!.subTareas.filter(
      s => s.enDesgloseCronometro && (s.resultadoSituacion ?? "pendiente") === "pendiente"
    );
    assert.deepEqual(
      pending.map(p => p.id),
      ["r2", "r3", "r1"]
    );
    const postergada = pending.find(p => p.id === "r1")!;
    assert.equal(postergada.minutosCupo, 30);
    assert.equal(postergada.cupoFijo, true);
  });

  it("postergar requiere al menos 2 filas pendientes", () => {
    const v = vehicle([row({ id: "r1", texto: "Solo" })]);
    assert.equal(postergarFilaEnFocoACola(v), null);
  });

  it("quitar fila de cola la elimina y no monta minutos en el foco", () => {
    const now = Date.now();
    const v = vehicle([
      row({ id: "r1", texto: "Foco", minutosCupo: 10 }),
      row({ id: "r2", texto: "Obsoleta", minutosCupo: 8 }),
      row({ id: "r3", texto: "Sigue", minutosCupo: 12 }),
    ]);
    const sumBefore = sumMinutosCronometroPendientes(v.subTareas!);
    const patch = applySituacionQuitarFila(v, "r2", now);
    assert.ok(patch);
    assert.equal(patch!.subTareas.find(s => s.id === "r2"), undefined);
    assert.equal(patch!.subTareas.find(s => s.id === "r1")?.minutosCupo, 10);
    assert.equal(patch!.subTareas.find(s => s.id === "r3")?.minutosCupo, 12);
    assert.equal(sumMinutosCronometroPendientes(patch!.subTareas), sumBefore - 8);
    assert.equal(patch!.minutosLiberados, 8);
    assert.equal(patch!.situacionCupoAnchor?.subTareaId, "r1");
    assert.equal(
      patch!.subTareas.some(s => s.resultadoSituacion && s.resultadoSituacion !== "pendiente"),
      false
    );
    const decisions = collectExecutedDecisionsFromVehicle({
      ...v,
      subTareas: patch!.subTareas,
    });
    assert.equal(decisions.some(d => d.subId === "r2"), false);
    assert.equal(decisions.length, 0);
  });

  it("quitar no actúa sobre el foco ni sobre la última pendiente", () => {
    const v = vehicle([
      row({ id: "r1", texto: "Foco", minutosCupo: 10 }),
      row({ id: "r2", texto: "Cola", minutosCupo: 8 }),
    ]);
    assert.equal(applySituacionQuitarFila(v, "r1"), null);
    const onlyFocus = vehicle([row({ id: "r1", texto: "Solo", minutosCupo: 10 })]);
    assert.equal(applySituacionQuitarFila(onlyFocus, "r1"), null);

    const lastCola = applySituacionQuitarFila(v, "r2");
    assert.ok(lastCola);
    assert.equal(lastCola!.subTareas.length, 1);
    assert.equal(lastCola!.subTareas[0]!.id, "r1");
    assert.equal(lastCola!.subTareas[0]!.minutosCupo, 10);

    const withClosed = vehicle([
      row({ id: "r1", texto: "Foco", minutosCupo: 10 }),
      row({
        id: "r2",
        texto: "Ya cumplida",
        minutosCupo: 8,
        resultadoSituacion: "cumplido",
        completada: true,
      }),
    ]);
    assert.equal(applySituacionQuitarFila(withClosed, "r2"), null);
  });
});

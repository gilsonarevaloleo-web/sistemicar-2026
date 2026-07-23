import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MutableRefObject } from "react";
import type { Vehicle } from "./persistence.ts";
import { paintSituacionRingRowCloseOptimistic } from "./situacionRingCloseMs0.ts";
import { computeSituacionTimerUi } from "../components/planeacion/situacionRelojIsland.tsx";

function makeVehicle(now: number): Vehicle {
  return {
    id: "v1",
    titulo: "Ring",
    status: "activo",
    tipoFlota: "situacion",
    situacionCronometro: {
      activo: true,
      bloqueInicioAt: now - 8 * 60_000,
      horaFinMs: now + 20 * 60_000,
    },
    situacionCupoAnchor: { subTareaId: "a", startedAt: now - 8 * 60_000 },
    subTareas: [
      {
        id: "a",
        texto: "Fila 1",
        completada: false,
        creadaAt: 0,
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
        minutosCupo: 5,
      },
      {
        id: "b",
        texto: "Probar ring",
        completada: false,
        creadaAt: 1,
        enDesgloseCronometro: true,
        resultadoSituacion: "pendiente",
        minutosCupo: 5,
      },
    ],
  } as Vehicle;
}

describe("paintSituacionRingRowCloseOptimistic handoff", () => {
  it("CUMPLIDO: startedAt≈now en siguiente fila y sin deuda en el island", () => {
    const now = Date.now();
    const vehicle = makeVehicle(now);
    const debtUi = computeSituacionTimerUi(vehicle, now);
    assert.equal(debtUi.expired, true, "precondición: fila 1 en deuda");
    assert.ok(debtUi.debt, "precondición: DEUDA ACUMULADA visible");

    const vehiclesRef = { current: [vehicle] } as MutableRefObject<Vehicle[]>;
    let painted: Vehicle[] = [];
    const result = paintSituacionRingRowCloseOptimistic(
      vehiclesRef,
      next => {
        painted = typeof next === "function" ? next([vehicle]) : next;
      },
      "v1",
      "a",
      "cumplido"
    );

    const after = painted.find(v => v.id === "v1") ?? vehiclesRef.current.find(v => v.id === "v1");
    assert.ok(after);
    assert.ok(result, "paint debe devolver stats de ganancia");
    assert.equal(result!.bloqueListo, false);
    assert.equal(after.subTareas?.find(s => s.id === "a")?.resultadoSituacion, "cumplido");
    assert.equal(after.situacionCupoAnchor?.subTareaId, "b");
    assert.ok(
      after.situacionCupoAnchor?.startedAt != null &&
        after.situacionCupoAnchor.startedAt >= now - 50 &&
        after.situacionCupoAnchor.startedAt <= Date.now() + 50,
      `startedAt debe resetearse a ~now en handoff, got ${after.situacionCupoAnchor?.startedAt}`
    );

    const ui = computeSituacionTimerUi(after, Date.now());
    assert.equal(ui.expired, false, "tras handoff no debe haber deuda");
    assert.equal(ui.debt, "");
    const focusCupo = after.subTareas?.find(s => s.id === "b")?.minutosCupo ?? 0;
    assert.ok(focusCupo > 0, "siguiente fila debe conservar cupo");
    // Display cuenta desde startedAt fresco → casi el cupo completo (no 00:00).
    assert.notEqual(ui.display, "00:00:00");
    assert.match(ui.display, /^00:\d{2}:\d{2}$/);
  });

  it("FALLADO: startedAt fresco en siguiente pendiente", () => {
    const now = Date.now();
    const vehicle = makeVehicle(now);
    const vehiclesRef = { current: [vehicle] } as MutableRefObject<Vehicle[]>;
    let painted: Vehicle[] = [];
    paintSituacionRingRowCloseOptimistic(
      vehiclesRef,
      next => {
        painted = typeof next === "function" ? next([vehicle]) : next;
      },
      "v1",
      "a",
      "fallado"
    );
    const after = painted.find(v => v.id === "v1")!;
    assert.equal(after.subTareas?.find(s => s.id === "a")?.resultadoSituacion, "fallado");
    assert.equal(after.situacionCupoAnchor?.subTareaId, "b");
    assert.ok(
      (after.situacionCupoAnchor?.startedAt ?? 0) >= now - 50,
      "FALLADO debe mintar startedAt=now"
    );
    const ui = computeSituacionTimerUi(after, Date.now());
    assert.equal(ui.expired, false);
    assert.equal(ui.debt, "");
  });
});

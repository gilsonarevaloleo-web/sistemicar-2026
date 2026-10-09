import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import {
  buildConquistaPauseLabelPatch,
  buildConquistaPausePatch,
  canOpenConquistaPausa,
  findOtraConquistaPausa,
  isConquistaPausaAbierta,
} from "./conquistaPausa.ts";
import { PAUSA_INTERRUPCION_TITULO, pausaAbiertaSinNombrar } from "./vehiculoPausa.ts";

function conquistaActiva(now: number): Vehicle {
  return {
    id: "c1",
    titulo: "Casaca",
    status: "activo",
    tipoReloj: "desglosador",
    tipoFlota: "tiempo",
    subVehiculos: [
      {
        id: "s1",
        titulo: "Pretina",
        status: "activo",
        aperturaAt: now - 10 * 60_000,
        cantidadObjetivo: 9,
        tiempoRecordMinPerUnit: 1.5,
      },
    ],
  } as Vehicle;
}

describe("conquista pausa — sello en el padre, sin vehículo hijo", () => {
  it("pausa directa congela y nombra Pausa", () => {
    const paused = buildConquistaPausePatch(conquistaActiva(Date.now()));
    assert.ok(paused);
    assert.equal(paused!.interrupcionActiva, true);
    assert.equal(paused!.subVehiculos.find(s => s.id === "s1")?.status, "nested_paused");
    assert.equal(paused!.pausas[0]?.titulo, PAUSA_INTERRUPCION_TITULO);
    assert.equal(pausaAbiertaSinNombrar({ pausas: paused!.pausas }), true);
    assert.ok(!("vehiculoPadreDesglosadorId" in paused!));
  });

  it("pausa justificada guarda el inconveniente en el sello", () => {
    const paused = buildConquistaPausePatch(conquistaActiva(Date.now()), "llamada");
    assert.ok(paused);
    assert.equal(paused!.pausas[0]?.titulo, "llamada");
    assert.equal(pausaAbiertaSinNombrar({ pausas: paused!.pausas }), false);
  });

  it("después se puede nombrar una pausa directa", () => {
    const now = Date.now();
    const paused = buildConquistaPausePatch(conquistaActiva(now));
    const vehicle = { ...conquistaActiva(now), ...paused } as Vehicle;
    const labeled = buildConquistaPauseLabelPatch(vehicle, "espera del corte");
    assert.ok(labeled);
    assert.equal(labeled!.pausas?.[0]?.titulo, "espera del corte");
    assert.equal(labeled!.pausas?.[0]?.pausadoAt, paused!.pausas[0]?.pausadoAt);
  });

  it("sin unidad activa no inventa pausa", () => {
    const v = {
      ...conquistaActiva(Date.now()),
      subVehiculos: [{ id: "s1", titulo: "Pretina", status: "pendiente" }],
    } as Vehicle;
    assert.equal(buildConquistaPausePatch(v, "llamada"), null);
  });

  it("dos conquistas sí; dos pausas no", () => {
    const now = Date.now();
    const a = conquistaActiva(now);
    const b = { ...conquistaActiva(now), id: "c2", titulo: "Buso" } as Vehicle;
    assert.equal(canOpenConquistaPausa([a, b], a.id).ok, true);
    assert.equal(findOtraConquistaPausa([a, b], a.id), undefined);

    const pausedA = { ...a, ...buildConquistaPausePatch(a) } as Vehicle;
    assert.equal(isConquistaPausaAbierta(pausedA), true);
    const gate = canOpenConquistaPausa([pausedA, b], b.id);
    assert.equal(gate.ok, false);
    if (!gate.ok) assert.equal(gate.occupiedBy.id, "c1");
  });

  it("la conquista ya pausada puede seguir en pausa; no se bloquea a sí misma", () => {
    const now = Date.now();
    const a = { ...conquistaActiva(now), ...buildConquistaPausePatch(conquistaActiva(now)) } as Vehicle;
    const b = { ...conquistaActiva(now), id: "c2" } as Vehicle;
    assert.equal(canOpenConquistaPausa([a, b], a.id).ok, true);
  });
});

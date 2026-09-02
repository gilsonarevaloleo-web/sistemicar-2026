import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Vehicle } from "./persistence";
import {
  filterVehiclesForAnilloCoverage,
  filterVehiclesForEntropy,
  GHOST_MAX_SESSION_MS,
  hasRealActiveConsciousVehicle,
  isGhostActiveVehicle,
  isJournalStaleActiveVehicle,
  recoverMissingJournalDayActives,
  resetGhostSessionCache,
  shouldPreserveLocalActivo,
} from "./ghostVehicleEngine.ts";
import { getJournalDayStartMs } from "./segmentTime.ts";
import {
  resetVehicleSessionSealsForTests,
  sealVehicleSessionClose,
} from "./vehicleSessionSeal.ts";

/** 08:00 Lima del 31-may-2026 (journal 05:00 Lima). */
const NOW = Date.UTC(2026, 4, 31, 13, 0, 0);
const DAY_START = getJournalDayStartMs(NOW);

function v(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    id: partial.id,
    userId: "u1",
    titulo: partial.titulo ?? "Test",
    status: partial.status ?? "activo",
    tipoFlota: partial.tipoFlota ?? "conquista",
    createdAt: partial.createdAt ?? new Date(NOW - 60000),
    aperturaAt: partial.aperturaAt ?? NOW - 30 * 60000,
    ...partial,
  } as Vehicle;
}

describe("ghostVehicleEngine", () => {
  beforeEach(() => {
    resetGhostSessionCache();
    resetVehicleSessionSealsForTests();
  });

  it("activo que empezó ~04:00 y sigue a las 08:00 no es fantasma", () => {
    const cross = v({ id: "g1", aperturaAt: DAY_START - 3600_000 });
    assert.equal(isGhostActiveVehicle(cross, NOW, DAY_START), false);
    assert.equal(isJournalStaleActiveVehicle(DAY_START - 3600_000, NOW, DAY_START), false);
  });

  it("sesión nocturna 21:00 olvidada abierta es fantasma a las 09:00", () => {
    const nineAm = DAY_START + 4 * 3600_000;
    const nightOpen = DAY_START - 8 * 3600_000;
    const stale = v({ id: "night", aperturaAt: nightOpen });
    assert.equal(isJournalStaleActiveVehicle(nightOpen, nineAm, DAY_START), true);
    assert.equal(isGhostActiveVehicle(stale, nineAm, DAY_START), true);
  });

  it("vehículo nuevo desde 05:00 no es fantasma a las 09:00", () => {
    const nineAm = DAY_START + 4 * 3600_000;
    const morning = v({ id: "morning", aperturaAt: DAY_START });
    assert.equal(isGhostActiveVehicle(morning, nineAm, DAY_START), false);
  });

  it("sesión obsoleta (>12h) sí es fantasma", () => {
    const stale = v({ id: "s1", aperturaAt: NOW - GHOST_MAX_SESSION_MS - 1000 });
    assert.equal(isGhostActiveVehicle(stale, NOW, DAY_START), true);
  });

  it("conquista con subs abiertos resiste >12h (no fantasma)", () => {
    const longConquista = v({
      id: "long-conq",
      tipoFlota: "tiempo",
      tipoReloj: "desglosador",
      aperturaAt: NOW - GHOST_MAX_SESSION_MS - 1000,
      subVehiculos: [
        { id: "s1", titulo: "Pegar", status: "cumplido" },
        { id: "s2", titulo: "Cortar", status: "activo" },
      ],
    });
    assert.equal(isGhostActiveVehicle(longConquista, NOW, DAY_START), false);
    assert.equal(shouldPreserveLocalActivo(longConquista, NOW, DAY_START), true);
  });

  it("ring situacional con cron activo resiste >12h", () => {
    const longRing = v({
      id: "long-ring",
      tipoFlota: "situacion",
      aperturaAt: NOW - GHOST_MAX_SESSION_MS - 1000,
      situacionCronometro: { activo: true },
      subTareas: [
        {
          id: "st1",
          texto: "A",
          completada: false,
          enDesgloseCronometro: true,
          resultadoSituacion: "pendiente",
        },
      ],
    });
    assert.equal(isGhostActiveVehicle(longRing, NOW, DAY_START), false);
  });

  it("activo real del día no es fantasma", () => {
    const real = v({ id: "r1", aperturaAt: NOW - 60 * 60000 });
    assert.equal(isGhostActiveVehicle(real, NOW, DAY_START), false);
  });

  it("interrupción con padre cerrado = fantasma", () => {
    const parent = v({ id: "p1", status: "archivado", aperturaAt: NOW - 120 * 60000 });
    const child = v({
      id: "c1",
      vehiculoPadreDesglosadorId: "p1",
      aperturaAt: NOW - 10 * 60000,
    });
    const byId = new Map([
      [parent.id, parent],
      [child.id, child],
    ]);
    assert.equal(isGhostActiveVehicle(child, NOW, DAY_START, byId), true);
  });

  it("preserva activo del día-jornada aunque lleve horas sin snapshot", () => {
    const sameDay = v({ id: "s1", aperturaAt: NOW - 2 * 3600_000 });
    assert.equal(shouldPreserveLocalActivo(sameDay, NOW, DAY_START), true);
  });

  it("no preserva sesión nocturna olvidada (fantasma)", () => {
    const nineAm = DAY_START + 4 * 3600_000;
    const nightOpen = DAY_START - 8 * 3600_000;
    const stale = v({ id: "night", aperturaAt: nightOpen });
    assert.equal(shouldPreserveLocalActivo(stale, nineAm, DAY_START), false);
  });

  it("recoverMissingJournalDayActives reincorpora activo local del día", () => {
    const local = v({ id: "loc1", aperturaAt: DAY_START + 3600_000 });
    const recovered = recoverMissingJournalDayActives([], [local], NOW);
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0]?.id, "loc1");
  });

  it("recoverMissingJournalDayActives no reabre si el id está cerrado localmente", () => {
    const parkedActivo = v({ id: "loc1", aperturaAt: DAY_START + 3600_000 });
    const recovered = recoverMissingJournalDayActives(
      [],
      [parkedActivo],
      NOW,
      () => false,
      id => id === "loc1"
    );
    assert.equal(recovered.length, 0);
  });

  it("recoverMissingJournalDayActives no reabre un vehículo sellado", () => {
    resetVehicleSessionSealsForTests();
    sealVehicleSessionClose("loc1", { cierreAt: NOW, status: "cumplido" });
    const parkedActivo = v({ id: "loc1", aperturaAt: DAY_START + 3600_000 });
    const recovered = recoverMissingJournalDayActives([], [parkedActivo], NOW);
    assert.equal(recovered.length, 0);
  });

  it("preserva activo reciente en ventana de sync", () => {
    const fresh = v({ id: "f1", aperturaAt: NOW - 5 * 60000, clientRequestId: "crq_x" });
    assert.equal(shouldPreserveLocalActivo(fresh, NOW, DAY_START), true);
  });

  it("filterVehiclesForEntropy deja pasar activo que cruzó 05:00", () => {
    const cross = v({ id: "c1", aperturaAt: DAY_START - 3600_000 });
    const filtered = filterVehiclesForEntropy([cross], NOW);
    assert.equal(filtered.length, 1);
    assert.equal(hasRealActiveConsciousVehicle([cross], NOW), true);
  });

  it("filterVehiclesForAnilloCoverage excluye activo arrastrado antes de 05:00", () => {
    const cross = v({ id: "c1", aperturaAt: DAY_START - 3600_000 });
    const filtered = filterVehiclesForAnilloCoverage([cross], NOW);
    assert.equal(filtered.length, 0);
  });

  it("filterVehiclesForAnilloCoverage incluye activo abierto en la jornada", () => {
    const morning = v({ id: "m1", aperturaAt: DAY_START + 3600_000 });
    const filtered = filterVehiclesForAnilloCoverage([morning], NOW);
    assert.equal(filtered.length, 1);
  });

  it("filterVehiclesForAnilloCoverage excluye descanso overnight", () => {
    const overnight = v({
      id: "d1",
      tipoFlota: "descanso",
      aperturaAt: DAY_START - 3600_000,
    });
    const filtered = filterVehiclesForAnilloCoverage([overnight], NOW);
    assert.equal(filtered.length, 0);
  });
});

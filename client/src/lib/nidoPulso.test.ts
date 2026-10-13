import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getJournalDayStartMs } from "./segmentTime.ts";
import {
  collectPulsoStamps,
  computeNidoPulso,
  computePulsoDesdeNido,
  diasJornadaDesde,
  formatDiasDesdeInicio,
  formatEnfoquePuro,
  formatHaceProduccion,
} from "./nidoPulso.ts";

const H = 3_600_000;
const D = 86_400_000;

describe("nidoPulso — días, enfoque puro, última producción", () => {
  it("el ejemplo: 20 días · 10 h de enfoque · última hace 2 días", () => {
    const now = getJournalDayStartMs(Date.UTC(2026, 9, 13, 18, 0, 0)) + 8 * H;
    const createdAt = now - 20 * D;
    const lastAt = now - 2 * D;
    const pulso = computeNidoPulso({
      createdAt,
      now,
      stamps: [{ vehicleId: "v1", minutos: 600, at: lastAt }],
    });
    assert.equal(pulso.diasDesdeInicio, 20);
    assert.equal(pulso.minutosEnfoquePuro, 600);
    assert.equal(pulso.copyDias, "20 días");
    assert.equal(pulso.copyEnfoque, "10 h de enfoque");
    assert.equal(pulso.copyUltima, "hace 2 días");
    assert.equal(pulso.copy, "20 días · 10 h de enfoque · última hace 2 días");
    assert.equal(pulso.copyCompact, "20 días · 10 h · hace 2 días");
    assert.equal(pulso.stale, true);
  });

  it("última producción hace 10 h no se lee como días", () => {
    const now = 1_700_000_000_000;
    const pulso = computeNidoPulso({
      createdAt: now,
      now,
      stamps: [{ vehicleId: "v1", minutos: 30, at: now - 10 * H }],
    });
    assert.equal(pulso.copyUltima, "hace 10 h");
    assert.equal(pulso.stale, false);
  });

  it("días-jornada: nacido hoy = 0; ayer = 1", () => {
    const now = getJournalDayStartMs() + 4 * H;
    assert.equal(diasJornadaDesde(now - 60_000, now), 0);
    assert.equal(formatDiasDesdeInicio(0), "hoy");
    assert.equal(diasJornadaDesde(now - D, now), 1);
    assert.equal(formatDiasDesdeInicio(1), "1 día");
  });

  it("presencia no entra al pulso aunque haya episodio y sello", () => {
    const collected = collectPulsoStamps({
      presenciaEpisodio: {
        vehiculos: [{ vehicleId: "pres-1", minutos: 120, closedAt: 9, kind: "trabajo" }],
      },
      liveTimon: {
        vehiculos: [{ vehicleId: "dir-1", minutos: 45, closedAt: 8, kind: "trabajo" }],
      },
      gasto: {
        sellos: [
          { vid: "pres-2", dest: "presencia", sec: 3600, z: 7 },
          { vid: "dir-2", dest: "direccion", sec: 600, z: 6 },
        ],
      },
    });
    assert.deepEqual(
      collected.map(s => s.vehicleId).sort(),
      ["dir-1", "dir-2"]
    );
    assert.equal(collected.find(s => s.vehicleId === "dir-2")?.minutos, 10);
  });

  it("pausa no suma enfoque ni última producción", () => {
    const now = 20_000_000;
    const pulso = computePulsoDesdeNido({
      createdAt: now,
      now,
      liveTimon: {
        vehiculos: [
          { vehicleId: "pausa", minutos: 40, closedAt: now, kind: "pausa" },
          { vehicleId: "trabajo", minutos: 25, closedAt: now - 3 * H, kind: "trabajo" },
        ],
      },
    });
    assert.equal(pulso.minutosEnfoquePuro, 25);
    assert.equal(pulso.ultimaProduccionAt, now - 3 * H);
    assert.equal(pulso.enCurso, false);
    assert.equal(pulso.copyUltima, "hace 3 h");
  });

  it("envío vivo del timón se lee en curso", () => {
    const now = 8_000_000;
    const pulso = computePulsoDesdeNido({
      createdAt: now - D,
      now,
      liveTimon: {
        vehiculos: [{ vehicleId: "vivo", minutos: 12, closedAt: now - 20_000, kind: "trabajo" }],
      },
    });
    assert.equal(pulso.enCurso, true);
    assert.equal(pulso.copyUltima, "en curso");
    assert.match(pulso.copy, /en curso/);
    assert.equal(pulso.stale, false);
  });

  it("vehicleId duplicado: liveTimon gana minutos y reloj", () => {
    const collected = collectPulsoStamps({
      liveTimon: {
        vehiculos: [{ vehicleId: "same", minutos: 15, closedAt: 100, kind: "trabajo" }],
      },
      peldanos: [
        {
          timonEpisodio: {
            vehiculos: [{ vehicleId: "same", minutos: 90, closedAt: 1, kind: "trabajo" }],
          },
        },
      ],
      gasto: {
        sellos: [{ vid: "same", dest: "direccion", sec: 3600, z: 50 }],
      },
    });
    assert.equal(collected.length, 1);
    assert.equal(collected[0]?.minutos, 15);
    assert.equal(collected[0]?.at, 100);
  });

  it("peldaño conquistado viejo sin timón cuenta duración", () => {
    const collected = collectPulsoStamps({
      peldanos: [
        {
          id: "pel-1",
          vehicleId: "old",
          estado: "conquistado",
          cerradoAt: 40,
          resumen: { duracionMin: 35 },
        },
      ],
    });
    assert.equal(collected.length, 1);
    assert.equal(collected[0]?.minutos, 35);
    assert.equal(collected[0]?.at, 40);
  });

  it("peldaño con timón no suma otra vez duracionMin", () => {
    const collected = collectPulsoStamps({
      peldanos: [
        {
          id: "pel-2",
          estado: "conquistado",
          cerradoAt: 40,
          resumen: {
            duracionMin: 99,
            timon: {
              vehiculos: [{ vehicleId: "t1", minutos: 20, closedAt: 30, kind: "trabajo" }],
            },
          },
        },
      ],
    });
    assert.equal(collected.length, 1);
    assert.equal(collected[0]?.minutos, 20);
  });

  it("formatEnfoque: menos de 1 h se ve en minutos", () => {
    assert.equal(formatEnfoquePuro(48), "48 min de enfoque");
    assert.equal(formatEnfoquePuro(48, true), "48 min");
    assert.equal(formatEnfoquePuro(0), "0 min de enfoque");
  });

  it("hace minutos / ahora / aún no", () => {
    const now = 10_000_000;
    assert.equal(formatHaceProduccion(null, now), "aún no");
    assert.equal(formatHaceProduccion(now - 10_000, now), "ahora");
    assert.equal(formatHaceProduccion(now - 12 * 60_000, now), "hace 12 min");
    assert.equal(formatHaceProduccion(now - 60_000, now, true), "en curso");
  });

  it("nido sin envíos: hoy · 0 min · aún no", () => {
    const now = Date.now();
    const pulso = computePulsoDesdeNido({ createdAt: now, now });
    assert.equal(pulso.copyDias, "hoy");
    assert.equal(pulso.minutosEnfoquePuro, 0);
    assert.equal(pulso.copyUltima, "aún no");
    assert.equal(pulso.stale, false);
  });

  it("nido de 2 días sin envío se marca frío", () => {
    const now = getJournalDayStartMs() + 3 * H;
    const pulso = computePulsoDesdeNido({
      createdAt: now - 2 * D,
      now,
    });
    assert.equal(pulso.diasDesdeInicio, 2);
    assert.equal(pulso.copyUltima, "aún no");
    assert.equal(pulso.stale, true);
  });
});

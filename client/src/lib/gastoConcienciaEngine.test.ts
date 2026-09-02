import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Vehicle } from "./persistence.ts";
import {
  computeGastoConcienciaDia,
  huecosLogToIntervals,
  journalWindowMs,
  MINUTOS_DIA_JORNADA,
} from "./gastoConcienciaEngine.ts";
import { hydrateTimonEpisodio, wallMinutosReales } from "./timonHoras.ts";

const FECHA = "2026-08-19";
const PLAN_5_23 = [{ horaInicio: "05:00", horaFin: "23:00" }];

function lima(hhmm: string, day = "2026-08-19"): number {
  return Date.parse(`${day}T${hhmm}:00-05:00`);
}

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

describe("gastoConcienciaEngine — día-jornada 24 h", () => {
  it("journal 05:00→05:00 dura 1440 min", () => {
    const w = journalWindowMs(FECHA);
    assert.ok(w);
    assert.equal((w.end - w.start) / 60_000, MINUTOS_DIA_JORNADA);
    assert.equal(w.start, lima("05:00"));
  });

  it("no conquistado = 24 h − plan (23:00–05:00 si el plan es 05:00–23:00)", () => {
    const r = computeGastoConcienciaDia({
      fecha: FECHA,
      segmentos: PLAN_5_23,
      vehicles: [],
      now: lima("23:05"),
    });
    assert.equal(r.minutosPlan, 18 * 60);
    assert.equal(r.minutosNoConquistado, 6 * 60);
    assert.equal(r.minutosInconsciente, 18 * 60);
    assert.equal(r.minutosPresencia, 0);
    assert.equal(r.minutosDireccion, 0);
    assert.equal(r.minutosPlanFuturo, 0);
    assert.equal(
      r.minutosInconsciente + r.minutosPresencia + r.minutosDireccion + r.minutosNoConquistado,
      MINUTOS_DIA_JORNADA
    );
  });

  it("plan de 24 h deja no conquistado en cero", () => {
    const r = computeGastoConcienciaDia({
      fecha: FECHA,
      segmentos: [{ horaInicio: "05:00", horaFin: "05:00" }],
      vehicles: [
        v({
          id: "dormir",
          status: "archivado",
          aperturaAt: lima("23:00"),
          cierreAt: lima("05:00", "2026-08-20"),
          destinoCierre: "presencia",
        }),
      ],
      now: lima("05:00", "2026-08-20"),
    });
    assert.equal(r.minutosPlan, MINUTOS_DIA_JORNADA);
    assert.equal(r.minutosNoConquistado, 0);
  });

  it("inconsciencia = huecos del plan, no el futuro", () => {
    const r = computeGastoConcienciaDia({
      fecha: FECHA,
      segmentos: PLAN_5_23,
      vehicles: [
        v({
          id: "dir",
          status: "archivado",
          aperturaAt: lima("05:00"),
          cierreAt: lima("08:00"),
          destinoCierre: "peldano",
          proyectoId: "p1",
        }),
      ],
      now: lima("10:00"),
    });
    assert.equal(r.minutosDireccion, 3 * 60);
    assert.equal(r.minutosInconsciente, 2 * 60);
    assert.ok(r.minutosPlanFuturo > 0);
    assert.equal(r.minutosNoConquistado, 6 * 60);
    assert.equal(r.registros.length, 1);
    assert.equal(r.registros[0]?.minutos, 180);
    assert.equal(r.registros[0]?.dest, "direccion");
  });

  it("huecos log agujerea cobertura que el cierre infló", () => {
    const now = lima("23:05");
    const huecos = huecosLogToIntervals(
      [{ startMs: lima("12:00"), endMs: lima("13:30"), open: false }],
      now
    );
    const r = computeGastoConcienciaDia({
      fecha: FECHA,
      segmentos: PLAN_5_23,
      vehicles: [
        v({
          id: "largo",
          status: "archivado",
          aperturaAt: lima("05:00"),
          cierreAt: lima("23:00"),
          destinoCierre: "peldano",
        }),
      ],
      now,
      huecosLog: huecos,
    });
    assert.ok(r.minutosInconsciente >= 90);
    assert.ok(r.minutosDireccion <= 18 * 60 - 90);
  });

  it("presencia = vehículo sin rumbo; dirección = peldaño", () => {
    const r = computeGastoConcienciaDia({
      fecha: FECHA,
      segmentos: PLAN_5_23,
      vehicles: [
        v({
          id: "pre",
          status: "archivado",
          aperturaAt: lima("06:00"),
          cierreAt: lima("07:00"),
          destinoCierre: "presencia",
        }),
        v({
          id: "dir",
          status: "archivado",
          aperturaAt: lima("07:00"),
          cierreAt: lima("09:00"),
          destinoCierre: "peldano",
          proyectoId: "costura",
        }),
      ],
      now: lima("23:05"),
    });
    assert.equal(r.minutosPresencia, 60);
    assert.equal(r.minutosDireccion, 120);
  });
});

describe("timón — pared real", () => {
  it("wallMinutosReales usa apertura→cierre, no duracionFinal menor", () => {
    assert.equal(
      wallMinutosReales({
        status: "cumplido",
        aperturaAt: lima("08:00"),
        cierreAt: lima("18:30"),
        duracionFinal: 40,
      }),
      10 * 60 + 30
    );
  });

  it("hidrata el timón con trabajo medido: cerrado no se infla; vivo sí crece", () => {
    const ep = hydrateTimonEpisodio({
      episodio: {
        id: "t1",
        puntoId: "pt_a",
        puntoTitulo: "Busos",
        startedAt: lima("08:00"),
        minutosAcumulados: 40,
        minutosTiempo: 40,
        vehiculos: [
          {
            vehicleId: "v1",
            titulo: "Armado",
            minutos: 40,
            tipoOrigen: "tiempo",
            closedAt: lima("12:00"),
            horaInicio: 1,
            horaFin: 1,
          },
        ],
      },
      puntoId: "pt_a",
      puntoTitulo: "Busos",
      proyectoId: "p1",
      vehicles: [
        v({
          id: "v1",
          titulo: "Armado",
          status: "archivado",
          destinoCierre: "peldano",
          proyectoId: "p1",
          oleadaPuntoId: "pt_a",
          aperturaAt: lima("08:00"),
          cierreAt: lima("18:00"),
          duracionFinal: 40,
        }),
        v({
          id: "v2",
          titulo: "Vivo",
          status: "activo",
          destinoCierre: "peldano",
          proyectoId: "p1",
          oleadaPuntoId: "pt_a",
          aperturaAt: lima("18:00"),
        }),
      ],
      now: lima("20:00"),
    });
    assert.equal(ep.minutosAcumulados, 40 + 120);
    assert.equal(ep.vehiculos.length, 2);
    assert.equal(ep.vehiculos[0]?.minutos, 40);
    assert.equal(ep.vehiculos[1]?.minutos, 120);
  });
});

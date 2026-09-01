import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeTriadaLineaOccupancy,
  isTriadaAdvancingVehicle,
  vehicleAdvancingIntervals,
} from "./concienciaTriadaLinea.ts";
import { buildConcienciaTriadaFromVehicles } from "./concienciaTriadaOperador.ts";
import type { Vehicle } from "./persistence.ts";

const FECHA = "2026-08-19";
const SEG_MANANA = [{ horaInicio: "09:00", horaFin: "12:00" }];

function lima(hhmm: string): number {
  return Date.parse(`2026-08-19T${hhmm}:00-05:00`);
}

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

describe("concienciaTriadaLinea", () => {
  it("sin vehículo: hueco lo ocurrido; el futuro no es inconsciencia", () => {
    const now = lima("10:00");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [],
      now,
    });
    assert.equal(occ.minutosPlan, 180);
    assert.equal(occ.minutosHueco, 60);
    assert.equal(occ.minutosPlanFuturo, 120);
    assert.equal(occ.minutosInconsciente, 60);
    assert.equal(occ.minutosPresencia, 0);
    assert.equal(occ.paraleloMeritorio, false);
  });

  it("no se llena el 100% de línea antes de que ocurra el final del plan", () => {
    const now = lima("10:00");
    const vehicles = [
      v({
        id: "a",
        status: "activo",
        aperturaAt: lima("09:00"),
        destinoCierre: "peldano",
      }),
      v({
        id: "b",
        status: "activo",
        aperturaAt: lima("09:00"),
        destinoCierre: "peldano",
      }),
    ];
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.equal(occ.minutosDireccion, 60);
    assert.equal(occ.minutosPlanFuturo, 120);
    assert.equal(occ.minutosInconsciente, 0);
    assert.ok(occ.minutosDireccion < occ.minutosPlan);
    assert.equal(occ.paraleloMeritorio, true);
    assert.ok(occ.minutosParaleloEnJuego >= 59);

    const model = buildConcienciaTriadaFromVehicles({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.ok(model.pctDireccion <= 100);
    assert.ok(model.minutosPlanFuturo > 0);
    assert.match(model.headline, /Dirección|aún no termina|Paralelo/);
  });

  it("Dirección gana el minuto único si se solapa con Presencia", () => {
    const now = lima("10:00");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [
        v({
          id: "pre",
          status: "activo",
          aperturaAt: lima("09:00"),
          destinoCierre: "presencia",
        }),
        v({
          id: "dir",
          status: "activo",
          aperturaAt: lima("09:00"),
          destinoCierre: "peldano",
        }),
      ],
      now,
    });
    assert.equal(occ.minutosDireccion, 60);
    assert.equal(occ.minutosPresencia, 0);
  });

  it("interrupt: padre congelado + enfoque cubre línea y no es paralelo", () => {
    const now = lima("10:00");
    const parent = v({
      id: "conquista",
      status: "activo",
      aperturaAt: lima("09:00"),
      destinoCierre: "peldano",
      interrupcionActiva: true,
      desglosadorPausa: { pausadoAt: lima("09:30"), subActivoId: "s1" },
    });
    const child = v({
      id: "enfoque",
      status: "activo",
      tipoFlota: "situacion",
      aperturaAt: lima("09:30"),
      destinoCierre: "presencia",
      vehiculoPadreDesglosadorId: "conquista",
    });
    const vehicles = [parent, child];

    assert.equal(isTriadaAdvancingVehicle(parent, vehicles), false);
    assert.equal(isTriadaAdvancingVehicle(child, vehicles), true);

    const parentIv = vehicleAdvancingIntervals(parent, vehicles, now);
    assert.equal(parentIv.length, 1);
    assert.equal(parentIv[0]?.end, lima("09:30"));

    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.equal(occ.minutosHueco, 0);
    assert.equal(occ.minutosDireccion, 30);
    assert.equal(occ.minutosPresencia, 30);
    assert.equal(occ.minutosPlanFuturo, 120);
    assert.equal(occ.hilosAvanzando, 1);
    assert.equal(occ.paraleloMeritorio, false);
    assert.equal(occ.interruptCubreLinea, true);
    assert.equal(occ.minutosParaleloEnJuego, 0);

    const model = buildConcienciaTriadaFromVehicles({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.match(model.headline, /no multiplica/);
  });

  it("padre cerrado no reclama los minutos del interrupt hijo", () => {
    const now = lima("15:00");
    const vehicles = [
      v({
        id: "conquista",
        status: "cumplido",
        aperturaAt: lima("09:00"),
        cierreAt: lima("11:00"),
        duracionFinal: 120,
        destinoCierre: "peldano",
      }),
      v({
        id: "enfoque",
        status: "cumplido",
        tipoFlota: "situacion",
        aperturaAt: lima("09:30"),
        cierreAt: lima("10:00"),
        duracionFinal: 30,
        destinoCierre: "presencia",
        vehiculoPadreDesglosadorId: "conquista",
      }),
    ];
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.equal(occ.minutosDireccion, 90);
    assert.equal(occ.minutosPresencia, 30);
    assert.equal(occ.minutosHueco, 60);
    assert.equal(occ.paraleloMeritorio, false);
    assert.equal(occ.minutosParaleloGanado, 0);
  });

  it("dos cumplidos independientes que se solapan ganan paralelo", () => {
    const now = lima("15:00");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [
        v({
          id: "a",
          status: "cumplido",
          aperturaAt: lima("09:00"),
          cierreAt: lima("11:00"),
          duracionFinal: 120,
          destinoCierre: "presencia",
        }),
        v({
          id: "b",
          status: "cumplido",
          aperturaAt: lima("10:00"),
          cierreAt: lima("12:00"),
          duracionFinal: 120,
          destinoCierre: "presencia",
        }),
      ],
      now,
    });
    assert.equal(occ.minutosPresencia, 180);
    assert.equal(occ.minutosHueco, 0);
    assert.equal(occ.minutosParaleloGanado, 60);
  });

  it("centinela y descanso no cubren la línea", () => {
    const now = lima("10:00");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [
        v({
          id: "c",
          status: "activo",
          aperturaAt: lima("09:00"),
          autoVerdad: true,
        }),
        v({
          id: "d",
          status: "activo",
          aperturaAt: lima("09:00"),
          tipoFlota: "descanso",
        }),
      ],
      now,
    });
    assert.equal(occ.minutosHueco, 60);
    assert.equal(occ.hilosAvanzando, 0);
  });

  it("el log de huecos agujerea cobertura y sube inconsciencia", () => {
    const now = lima("12:00");
    const vehicles = [
      v({
        id: "largo",
        status: "archivado",
        aperturaAt: lima("09:00"),
        cierreAt: lima("12:00"),
        destinoCierre: "peldano",
      }),
    ];
    const sinHueco = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.equal(sinHueco.minutosHueco, 0);
    assert.equal(sinHueco.minutosDireccion, 180);

    const conHueco = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
      huecosLog: [{ start: lima("10:00"), end: lima("11:00") }],
    });
    assert.equal(conHueco.minutosHueco, 60);
    assert.equal(conHueco.minutosDireccion, 120);

    const model = buildConcienciaTriadaFromVehicles({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
      huecosLog: [{ start: lima("10:00"), end: lima("11:00") }],
    });
    assert.equal(model.minutosInconsciente, 60);
  });
});

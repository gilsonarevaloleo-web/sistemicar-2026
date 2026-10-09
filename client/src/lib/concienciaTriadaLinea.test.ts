import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  computeTriadaLineaOccupancy,
  isTriadaAdvancingVehicle,
  unjustifiedPauseIntervals,
  vehicleAdvancingIntervals,
} from "./concienciaTriadaLinea.ts";
import { buildConcienciaTriadaFromVehicles } from "./concienciaTriadaOperador.ts";
import type { Vehicle } from "./persistence.ts";
import {
  resetVehicleSessionSealsForTests,
  sealVehicleSessionClose,
} from "./vehicleSessionSeal.ts";

const FECHA = "2026-08-19";
const SEG_MANANA = [{ horaInicio: "09:00", horaFin: "12:00" }];

function lima(hhmm: string): number {
  return Date.parse(`2026-08-19T${hhmm}:00-05:00`);
}

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

describe("concienciaTriadaLinea", () => {
  beforeEach(() => {
    resetVehicleSessionSealsForTests();
  });
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
        proyectoId: "n1",
      }),
      v({
        id: "b",
        status: "activo",
        aperturaAt: lima("09:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
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

  it("Presencia extraída: el solape no mancha Dirección", () => {
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
          proyectoId: "n1",
        }),
      ],
      now,
    });
    assert.equal(occ.minutosPresencia, 60);
    assert.equal(occ.minutosDireccion, 0);
    assert.equal(occ.minutosPresenciaExtraida, 60);
  });

  it("peldano sin casa cubre como presencia, no como Dirección", () => {
    const now = lima("10:00");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [
        v({
          id: "falso",
          status: "activo",
          aperturaAt: lima("09:00"),
          destinoCierre: "peldano",
        }),
      ],
      now,
    });
    assert.equal(occ.minutosPresencia, 60);
    assert.equal(occ.minutosDireccion, 0);
  });

  it("interrupt: padre congelado + enfoque cubre línea y no es paralelo", () => {
    const now = lima("10:00");
    const parent = v({
      id: "conquista",
      status: "activo",
      aperturaAt: lima("09:00"),
      destinoCierre: "peldano",
      proyectoId: "n1",
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
        proyectoId: "n1",
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

  it("la rutina del día cubre el hueco entre segmentos, no cada franja suelta", () => {
    const now = lima("13:00");
    const segs = [
      { horaInicio: "09:00", horaFin: "12:00" },
      { horaInicio: "14:00", horaFin: "18:00" },
    ];
    const vacio = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: segs,
      vehicles: [],
      now,
    });
    assert.equal(vacio.minutosPlan, 9 * 60);
    assert.equal(vacio.minutosHueco, 4 * 60);
    assert.equal(vacio.minutosPlanFuturo, 5 * 60);

    const trabajando = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: segs,
      vehicles: [
        v({
          id: "costura",
          status: "activo",
          aperturaAt: lima("09:00"),
          destinoCierre: "presencia",
        }),
      ],
      now,
    });
    assert.equal(trabajando.minutosPresencia, 4 * 60);
    assert.equal(trabajando.minutosHueco, 0);
    assert.equal(trabajando.minutosDireccion, 0);
  });

  it("trabajo de la mañana en la rutina es dirección, no inconsciente", () => {
    const now = lima("08:14");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: [
        { horaInicio: "05:30", horaFin: "08:00" },
        { horaInicio: "08:00", horaFin: "12:00" },
        { horaInicio: "14:00", horaFin: "23:00" },
      ],
      vehicles: [
        v({
          id: "costura",
          status: "activo",
          tipoReloj: "desglosador",
          tipoFlota: "tiempo",
          aperturaAt: lima("05:30"),
          destinoCierre: "peldano",
          proyectoId: "n1",
          subVehiculos: [
            {
              id: "u1",
              titulo: "Corte",
              status: "activo",
              aperturaAt: lima("05:30"),
            },
          ],
        }),
      ],
      now,
    });
    assert.ok(occ.minutosDireccion >= 160, `trabajo de la mañana, no 0: ${occ.minutosDireccion}`);
    assert.ok(occ.minutosHueco < 30, `la rutina cubre el trabajo: ${occ.minutosHueco}`);
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
        proyectoId: "n1",
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

  it("vehículo sellado que reaparece activo no cubre inconciencia posterior al cierre", () => {
    const cierreAt = lima("09:20");
    sealVehicleSessionClose("familia", {
      cierreAt,
      status: "cumplido",
      clientRequestId: "crq_fam",
    });
    const now = lima("10:00");
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [
        v({
          id: "familia",
          clientRequestId: "crq_fam",
          status: "activo",
          aperturaAt: lima("09:00"),
          destinoCierre: "presencia",
        }),
      ],
      now,
    });
    assert.equal(occ.minutosPresencia, 20);
    assert.equal(occ.minutosHueco, 40);
    assert.equal(occ.minutosInconsciente, 40);
    assert.equal(isTriadaAdvancingVehicle(
      v({
        id: "familia",
        clientRequestId: "crq_fam",
        status: "activo",
        aperturaAt: lima("09:00"),
      }),
      []
    ), false);
  });

  it("pausa no justificada (sin otro vehículo) es hueco = inconsciencia", () => {
    const now = lima("12:00");
    const vehicles = [
      v({
        id: "costura",
        status: "archivado",
        aperturaAt: lima("09:00"),
        cierreAt: lima("12:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
        pausas: [{ pausadoAt: lima("10:00"), reanudadoAt: lima("10:20") }],
      }),
    ];
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles,
      now,
    });
    assert.equal(occ.minutosDireccion, 160);
    assert.equal(occ.minutosHueco, 20);
    assert.equal(occ.minutosInconsciente, 20);
    assert.equal(occ.huecosIntervals.length, 1);
    assert.equal(occ.huecosIntervals[0]?.start, lima("10:00"));
    assert.equal(occ.huecosIntervals[0]?.end, lima("10:20"));

    const unjust = unjustifiedPauseIntervals(vehicles, now);
    assert.equal(unjust.length, 1);
    assert.equal(unjust[0]?.start, lima("10:00"));
    assert.equal(unjust[0]?.end, lima("10:20"));
  });

  it("pausa justificada por interrupt no es hueco", () => {
    const now = lima("12:00");
    const vehicles = [
      v({
        id: "conquista",
        status: "archivado",
        aperturaAt: lima("09:00"),
        cierreAt: lima("12:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
        pausas: [{ pausadoAt: lima("10:00"), reanudadoAt: lima("10:20"), titulo: "llamada" }],
      }),
      v({
        id: "enfoque",
        status: "archivado",
        tipoFlota: "situacion",
        aperturaAt: lima("10:00"),
        cierreAt: lima("10:20"),
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
    assert.equal(occ.minutosHueco, 0);
    assert.equal(occ.minutosInconsciente, 0);
    assert.equal(occ.minutosDireccion, 160);
    assert.equal(occ.minutosPresencia, 20);
    assert.equal(unjustifiedPauseIntervals(vehicles, now).length, 0);
  });

  it("pausa más larga que el interrupt deja el resto como hueco", () => {
    const now = lima("12:00");
    const vehicles = [
      v({
        id: "conquista",
        status: "archivado",
        aperturaAt: lima("09:00"),
        cierreAt: lima("12:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
        pausas: [{ pausadoAt: lima("10:00"), reanudadoAt: lima("10:20") }],
      }),
      v({
        id: "enfoque",
        status: "archivado",
        tipoFlota: "situacion",
        aperturaAt: lima("10:00"),
        cierreAt: lima("10:08"),
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
    assert.equal(occ.minutosPresencia, 8);
    assert.equal(occ.minutosHueco, 12);
    assert.equal(occ.minutosInconsciente, 12);
  });

  it("conquista abierta todo el día no pinta la pared: solo unidades, el resto es hueco", () => {
    const now = lima("23:00");
    const vehicles = [
      v({
        id: "costura",
        status: "activo",
        tipoReloj: "desglosador",
        tipoFlota: "tiempo",
        aperturaAt: lima("05:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
        subVehiculos: [
          {
            id: "u1",
            titulo: "Corte",
            status: "cumplido",
            aperturaAt: lima("07:00"),
            cierreAt: lima("07:20"),
            duracionFinal: 20 * 60,
          },
          {
            id: "u2",
            titulo: "Costura",
            status: "cumplido",
            aperturaAt: lima("11:00"),
            cierreAt: lima("11:20"),
            duracionFinal: 20 * 60,
          },
          {
            id: "u3",
            titulo: "Acabado",
            status: "activo",
            aperturaAt: lima("22:40"),
          },
        ],
      }),
    ];
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: [{ horaInicio: "05:00", horaFin: "23:00" }],
      vehicles,
      now,
    });
    assert.equal(occ.minutosDireccion, 60);
    assert.equal(occ.minutosHueco, 17 * 60);
    assert.equal(occ.minutosDireccion + occ.minutosHueco, 18 * 60);
    assert.equal(isTriadaAdvancingVehicle(vehicles[0]!, vehicles), true);

    const idle = unjustifiedPauseIntervals(vehicles, now);
    const idleMin = idle.reduce((a, iv) => a + (iv.end - iv.start) / 60_000, 0);
    assert.ok(idleMin >= 16 * 60, `idle del contenedor ~17 h, no 20 min de pausa: ${idleMin}`);
  });

  it("pausa corta de conquista no convierte el día en trabajo", () => {
    const now = lima("23:00");
    const pauseAt = lima("12:00");
    const resumeAt = lima("12:10");
    const vehicles = [
      v({
        id: "costura",
        status: "activo",
        tipoReloj: "desglosador",
        tipoFlota: "tiempo",
        aperturaAt: lima("05:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
        pausas: [{ pausadoAt: pauseAt, reanudadoAt: resumeAt, titulo: "almuerzo" }],
        subVehiculos: [
          {
            id: "u1",
            titulo: "Turno",
            status: "activo",
            // Resume reescribe aperturaAt = now − elapsed (50 min de unidad).
            aperturaAt: lima("22:10"),
          },
        ],
      }),
    ];
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: [{ horaInicio: "05:00", horaFin: "23:00" }],
      vehicles,
      now,
    });
    assert.equal(occ.minutosDireccion, 50);
    assert.equal(occ.minutosHueco, 18 * 60 - 50);
    assert.ok(occ.minutosDireccion < 90);
  });

  it("desglosador activo sin unidad en curso no cubre: es hueco", () => {
    const now = lima("12:00");
    const vehicle = v({
      id: "costura",
      status: "activo",
      tipoReloj: "desglosador",
      tipoFlota: "tiempo",
      aperturaAt: lima("09:00"),
      destinoCierre: "peldano",
      proyectoId: "n1",
      subVehiculos: [
        { id: "u1", titulo: "A", status: "cumplido", aperturaAt: lima("09:00"), cierreAt: lima("09:15"), duracionFinal: 15 * 60 },
        { id: "u2", titulo: "B", status: "pendiente" },
      ],
    });
    assert.equal(isTriadaAdvancingVehicle(vehicle, [vehicle]), false);
    const occ = computeTriadaLineaOccupancy({
      fecha: FECHA,
      segmentos: SEG_MANANA,
      vehicles: [vehicle],
      now,
    });
    assert.equal(occ.minutosDireccion, 15);
    assert.equal(occ.minutosHueco, 165);
  });
});

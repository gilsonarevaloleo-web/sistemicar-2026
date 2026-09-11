import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MINUTOS_POR_HORA,
  accrueVehiculoAlTimon,
  crearTimonEpisodio,
  episodioTimonVacio,
  formatHoraLabel,
  formatHorasCerradas,
  horaEnCurso,
  horaNumeroDeMinuto,
  horasCompletasDeMinutos,
  horasDeEpisodio,
  hydrateTimonEpisodio,
  hydratePresenciaEpisodio,
  ledgerVehiculosTimon,
  formatCuandoProduccion,
  formatRangoProduccion,
  minutosCruceHora,
  resumenTimonDesdeEpisodio,
  formatDuracionTimon,
  trabajoMinutosReales,
  yaEstaEnTimon,
} from "./timonHoras.ts";

describe("timonHoras — enumeración del enfoque", () => {
  it("hora 1 cubre los primeros 60 minutos; el 61 arranca hora 2", () => {
    assert.equal(MINUTOS_POR_HORA, 60);
    assert.equal(horaNumeroDeMinuto(0), 1);
    assert.equal(horaNumeroDeMinuto(59), 1);
    assert.equal(horaNumeroDeMinuto(60), 2);
    assert.equal(horaEnCurso(0), 1);
    assert.equal(horaEnCurso(40), 1);
    assert.equal(horaEnCurso(60), 1);
    assert.equal(horaEnCurso(61), 2);
    assert.equal(horasCompletasDeMinutos(40), 0);
    assert.equal(horasCompletasDeMinutos(60), 1);
    assert.equal(horasCompletasDeMinutos(90), 1);
    assert.equal(horasCompletasDeMinutos(120), 2);
  });

  it("un vehículo de 90 min llena hora 1 y deja 30 en hora 2", () => {
    let ep = crearTimonEpisodio("pt_a", "Terminar 12 plomos", 1);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v1",
      titulo: "Coser espalda",
      minutos: 90,
      tipoOrigen: "tiempo",
      closedAt: 10,
    });
    assert.equal(ep.minutosAcumulados, 90);
    assert.equal(ep.minutosTiempo, 90);
    assert.equal(ep.vehiculos[0]?.horaInicio, 1);
    assert.equal(ep.vehiculos[0]?.horaFin, 2);
    const horas = horasDeEpisodio(ep);
    assert.equal(horas.length, 2);
    assert.equal(horas[0]?.minutos, 60);
    assert.equal(horas[0]?.completa, true);
    assert.equal(horas[1]?.minutos, 30);
    assert.equal(horas[1]?.completa, false);
    assert.equal(horas[0]?.vehiculos.length, 1);
    assert.equal(horas[1]?.vehiculos.length, 1);
    assert.equal(horas[0]?.cortes[0]?.minutosEnHora, 60);
    assert.equal(horas[1]?.cortes[0]?.minutosEnHora, 30);
    assert.equal(horas[0]?.cortes[0]?.minutosTotales, 90);
    assert.equal(horas[1]?.cortes[0]?.minutosTotales, 90);
  });

  it("40 + 40 min: hora 1 se sella a 60; hora 2 queda con 20", () => {
    let ep = crearTimonEpisodio("pt_a", "Negro S", 1);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v1",
      titulo: "A",
      minutos: 40,
      tipoOrigen: "tiempo",
    });
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v2",
      titulo: "B",
      minutos: 40,
      tipoOrigen: "tiempo",
    });
    const horas = horasDeEpisodio(ep);
    assert.equal(ep.minutosAcumulados, 80);
    assert.equal(horas[0]?.completa, true);
    assert.equal(horas[0]?.minutos, 60);
    assert.equal(horas[1]?.minutos, 20);
    assert.equal(horas[0]?.vehiculos.map(v => v.vehicleId).join(","), "v1,v2");
    assert.equal(horas[1]?.vehiculos.map(v => v.vehicleId).join(","), "v2");
  });

  it("situación suma a la enumeración pero no a minutosTiempo", () => {
    let ep = crearTimonEpisodio("pt_a", "QA", 1);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v_sit",
      titulo: "Ring",
      minutos: 25,
      tipoOrigen: "situacion",
    });
    assert.equal(ep.minutosAcumulados, 25);
    assert.equal(ep.minutosTiempo, 0);
  });

  it("el mismo vehículo no se acredita dos veces; 0 min no entra", () => {
    let ep = crearTimonEpisodio("pt_a", "X", 1);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v1",
      titulo: "Uno",
      minutos: 20,
      tipoOrigen: "tiempo",
    });
    const again = accrueVehiculoAlTimon(ep, {
      vehicleId: "v1",
      titulo: "Uno otra vez",
      minutos: 50,
      tipoOrigen: "tiempo",
    });
    assert.equal(again.minutosAcumulados, 20);
    assert.equal(again.vehiculos.length, 1);
    assert.equal(yaEstaEnTimon(ep, "v1"), true);
    const zero = accrueVehiculoAlTimon(ep, {
      vehicleId: "v0",
      titulo: "Vacío",
      minutos: 0,
      tipoOrigen: "tiempo",
    });
    assert.equal(zero.vehiculos.length, 1);
  });

  it("cambiar de timón es otra numeración: episodio nuevo empieza en hora 1", () => {
    let a = crearTimonEpisodio("pt_a", "Negro S", 1);
    a = accrueVehiculoAlTimon(a, {
      vehicleId: "v1",
      titulo: "Cerrar lote",
      minutos: 70,
      tipoOrigen: "tiempo",
    });
    assert.equal(horaEnCurso(a.minutosAcumulados), 2);
    const resumen = resumenTimonDesdeEpisodio(a);
    assert.equal(resumen.horas, 2);
    assert.equal(resumen.minutos, 70);
    assert.equal(episodioTimonVacio(a), false);

    const b = crearTimonEpisodio("pt_b", "XL", 2);
    assert.equal(episodioTimonVacio(b), true);
    assert.equal(horaEnCurso(b.minutosAcumulados), 1);
    assert.equal(horasDeEpisodio(b)[0]?.numero, 1);
    assert.equal(horasDeEpisodio(b)[0]?.completa, false);
  });

  it("formatDuracionTimon pinta minutos reales", () => {
    assert.equal(formatHoraLabel(1), "Hora 1");
    assert.equal(formatHoraLabel(3), "Hora 3");
    assert.equal(formatHorasCerradas(0), "menos de 1 h");
    assert.equal(formatHorasCerradas(40), "menos de 1 h");
    assert.equal(formatHorasCerradas(60), "1 h");
    assert.equal(formatHorasCerradas(185), "3 h");
    assert.equal(formatDuracionTimon(40), "40 min");
    assert.equal(formatDuracionTimon(90), "1 h 30 min");
    assert.equal(formatDuracionTimon(180), "3 h");
  });
});

describe("timonHoras — historia verdadera del timón", () => {
  it("un vehículo de 136 min no triplica 2 h 16 en cada hora", () => {
    let ep = crearTimonEpisodio("pt_xl", "Hacer 27 busos negros XL", 1);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v_armado",
      titulo: "Armado de bolsillo completo buso",
      minutos: 136,
      tipoOrigen: "tiempo",
    });
    const horas = horasDeEpisodio(ep);
    assert.equal(horas.length, 3);
    assert.equal(horas[0]?.cortes[0]?.minutosEnHora, 60);
    assert.equal(horas[1]?.cortes[0]?.minutosEnHora, 60);
    assert.equal(horas[2]?.cortes[0]?.minutosEnHora, 16);
    const ledger = ledgerVehiculosTimon(ep);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0]?.minutos, 136);
    assert.ok((ledger[0]?.closedAt ?? 0) > 0);
    assert.equal(ep.minutosAcumulados, 136);
  });

  it("el ledger ubica fecha y hora de cada envío", () => {
    const closedAt = Date.parse("2026-09-04T14:32:00-05:00");
    let ep = crearTimonEpisodio("pt_xl", "Negros XL", closedAt - 30 * 60_000);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v_am",
      titulo: "Corte mañana",
      minutos: 30,
      tipoOrigen: "tiempo",
      closedAt,
    });
    const ledger = ledgerVehiculosTimon(ep);
    assert.equal(ledger[0]?.closedAt, closedAt);
    assert.match(formatCuandoProduccion(closedAt), /14:32/);
    assert.match(formatCuandoProduccion(closedAt), /4/);
  });

  it("30 min mañana + 15 min noche = 45 min con dos nombres", () => {
    let ep = crearTimonEpisodio("pt_xl", "Negros XL", 1);
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v_am",
      titulo: "Corte mañana",
      minutos: 30,
      tipoOrigen: "tiempo",
    });
    ep = accrueVehiculoAlTimon(ep, {
      vehicleId: "v_pm",
      titulo: "Costura noche",
      minutos: 15,
      tipoOrigen: "tiempo",
    });
    assert.equal(ep.minutosAcumulados, 45);
    const ledger = ledgerVehiculosTimon(ep);
    assert.equal(ledger.map(v => `${v.titulo}:${v.minutos}`).join("|"), "Corte mañana:30|Costura noche:15");
    assert.equal(horaEnCurso(ep.minutosAcumulados), 1);
  });

  it("no copia un vehículo de otro punto ni uno cerrado antes de este timón", () => {
    const started = 10_000_000;
    const ep = hydrateTimonEpisodio({
      episodio: crearTimonEpisodio("pt_xl", "Hacer 27 busos negros XL", started),
      puntoId: "pt_xl",
      puntoTitulo: "Hacer 27 busos negros XL",
      proyectoId: "costura",
      vehicles: [
        {
          id: "v_previo",
          titulo: "Previo a la producción de bolsillo",
          status: "archivado",
          destinoCierre: "peldano",
          proyectoId: "costura",
          aperturaAt: started - 3 * 60 * 60_000,
          cierreAt: started - 60_000,
          duracionFinal: 136,
        },
        {
          id: "v_otro",
          titulo: "Armado de bolsillo completo buso",
          status: "archivado",
          destinoCierre: "peldano",
          proyectoId: "costura",
          oleadaPuntoId: "pt_bolsillo",
          aperturaAt: started + 1_000,
          cierreAt: started + 131 * 60_000,
          duracionFinal: 131,
        },
        {
          id: "v_xl",
          titulo: "Coser negros XL",
          status: "archivado",
          destinoCierre: "peldano",
          proyectoId: "costura",
          oleadaPuntoId: "pt_xl",
          aperturaAt: started + 2_000,
          cierreAt: started + 2_000 + 40 * 60_000,
          duracionFinal: 40,
        },
      ],
      now: started + 3 * 60 * 60_000,
    });
    assert.equal(ep.vehiculos.length, 1);
    assert.equal(ep.vehiculos[0]?.vehicleId, "v_xl");
    assert.equal(ep.minutosAcumulados, 40);
  });

  it("saca del episodio un sello viejo que no pertenece a este punto", () => {
    const started = 20_000_000;
    const sucio = crearTimonEpisodio("pt_xl", "Negros XL", started);
    sucio.vehiculos = [
      {
        vehicleId: "v_previo",
        titulo: "Previo a la producción de bolsillo",
        minutos: 136,
        tipoOrigen: "tiempo",
        closedAt: started - 60_000,
        horaInicio: 1,
        horaFin: 3,
      },
    ];
    sucio.minutosAcumulados = 136;
    sucio.minutosTiempo = 136;
    const limpio = hydrateTimonEpisodio({
      episodio: sucio,
      puntoId: "pt_xl",
      puntoTitulo: "Negros XL",
      proyectoId: "costura",
      vehicles: [
        {
          id: "v_previo",
          titulo: "Previo a la producción de bolsillo",
          status: "archivado",
          destinoCierre: "peldano",
          proyectoId: "costura",
          aperturaAt: started - 3 * 60 * 60_000,
          cierreAt: started - 60_000,
          duracionFinal: 136,
        },
      ],
      now: started + 60_000,
    });
    assert.equal(limpio.vehiculos.length, 0);
    assert.equal(limpio.minutosAcumulados, 0);
  });

  it("trabajo medido de desglosador gana a la pared inflada", () => {
    assert.equal(
      trabajoMinutosReales({
        status: "archivado",
        tipoReloj: "desglosador",
        aperturaAt: 1_000,
        cierreAt: 1_000 + 4 * 60 * 60_000,
        duracionFinal: 240,
        subVehiculos: [{ duracionFinal: 25 * 60 }, { duracionFinal: 20 * 60 }],
      }),
      45
    );
  });

  it("desglosador sin unidades no infla el reporte con la pared", () => {
    assert.equal(
      trabajoMinutosReales({
        status: "archivado",
        tipoReloj: "desglosador",
        aperturaAt: 1_000,
        cierreAt: 1_000 + 20 * 60_000,
        duracionFinal: 20,
        subVehiculos: [{ id: "s1", status: "pendiente" }],
      }),
      0
    );
  });

  it("interrupción no suma al padre: el hijo es otro vehículo", () => {
    const now = 1_000_000 + 40 * 60_000;
    assert.equal(
      trabajoMinutosReales(
        {
          status: "activo",
          tipoReloj: "desglosador",
          interrupcionActiva: true,
          desglosadorPausa: {
            pausadoAt: 1_000_000 + 10 * 60_000,
            subActivoId: "u1",
            elapsedSecSnapshot: 10 * 60,
          },
          subVehiculos: [
            { id: "u1", status: "nested_paused", aperturaAt: 1_000_000 },
          ],
        },
        now
      ),
      10
    );
    assert.equal(
      trabajoMinutosReales(
        {
          status: "activo",
          tipoFlota: "situacion",
          vehiculoPadreDesglosadorId: "padre",
          aperturaAt: 1_000_000 + 10 * 60_000,
        },
        now
      ),
      30
    );
  });

  it("minutosCruceHora parte 131 min en 60+60+11", () => {
    assert.equal(minutosCruceHora(0, 131, 1), 60);
    assert.equal(minutosCruceHora(0, 131, 2), 60);
    assert.equal(minutosCruceHora(0, 131, 3), 11);
    assert.equal(minutosCruceHora(0, 131, 4), 0);
  });
});

describe("timonHoras — historia de cada sub", () => {
  it("el nombre y el inicio salen del sub activado, no del desglosador ni del plan", () => {
    const opened = Date.parse("2026-09-10T05:30:00-05:00");
    const pinAt = Date.parse("2026-09-10T20:24:00-05:00");
    const now = Date.parse("2026-09-10T16:33:00-05:00");
    const ep = hydrateTimonEpisodio({
      episodio: crearTimonEpisodio("pt_hueso", "Hacer 20 casacas hueso", pinAt),
      puntoId: "pt_hueso",
      puntoTitulo: "Hacer 20 casacas hueso",
      proyectoId: "costura",
      vehicles: [
        {
          id: "desg",
          titulo: "Armado de casaca leñadora",
          status: "activo",
          tipoReloj: "desglosador",
          destinoCierre: "peldano",
          proyectoId: "costura",
          oleadaPuntoId: "pt_hueso",
          aperturaAt: opened,
          subVehiculos: [
            {
              id: "s1",
              titulo: "Casaca 1",
              status: "cumplido",
              duracionFinal: 2 * 3600,
              aperturaAt: opened,
              cierreAt: opened + 2 * 3600_000,
            },
            {
              id: "s2",
              titulo: "Casaca 2",
              status: "activo",
              aperturaAt: opened + 2 * 3600_000,
            },
          ],
        },
      ],
      now,
    });
    assert.equal(ep.startedAt, opened);
    assert.equal(ep.vehiculos.length, 2);
    assert.equal(ep.vehiculos[0]?.titulo, "Casaca 1");
    assert.equal(ep.vehiculos[0]?.openedAt, opened);
    assert.ok(!ep.vehiculos.some(v => v.titulo === "Armado de casaca leñadora"));
    const ledger = ledgerVehiculosTimon(ep);
    assert.match(formatRangoProduccion(ledger[0]?.openedAt, ledger[0]?.closedAt), /05:30/);
    assert.ok(!formatRangoProduccion(ledger[0]?.openedAt, ledger[0]?.closedAt).includes("20:24"));
  });
});

describe("timonHoras — pausa como presencia", () => {
  it("la pausa de 1 h desde 7:30 queda en presencia, no resta el trabajo", () => {
    const t530 = Date.parse("2026-09-10T05:30:00-05:00");
    const t730 = Date.parse("2026-09-10T07:30:00-05:00");
    const t830 = Date.parse("2026-09-10T08:30:00-05:00");
    const vehicles = [
      {
        id: "conquista",
        titulo: "Armado de casaca leñadora",
        status: "activo",
        tipoReloj: "desglosador",
        destinoCierre: "peldano",
        proyectoId: "costura",
        oleadaPuntoId: "pt_hueso",
        aperturaAt: t530,
        interrupcionActiva: true,
        desglosadorPausa: {
          pausadoAt: t730,
          subActivoId: "s1",
          elapsedSecSnapshot: 2 * 3600,
        },
        pausas: [{ pausadoAt: t730, titulo: "desayuno" }],
        subVehiculos: [
          {
            id: "s1",
            titulo: "Casaca 1",
            status: "nested_paused",
            aperturaAt: t530,
          },
        ],
      },
      {
        id: "desayuno",
        titulo: "desayuno",
        status: "archivado",
        destinoCierre: "presencia",
        vehiculoPadreDesglosadorId: "conquista",
        aperturaAt: t730,
        cierreAt: t730 + 60_000,
      },
      {
        id: "ring",
        titulo: "primera intercepción del dia",
        status: "activo",
        tipoFlota: "situacion",
        destinoCierre: "presencia",
        aperturaAt: t730 + 60_000,
      },
    ];
    const timon = hydrateTimonEpisodio({
      puntoId: "pt_hueso",
      puntoTitulo: "Hacer 20 casacas hueso",
      proyectoId: "costura",
      vehicles,
      now: t830,
    });
    assert.equal(timon.minutosAcumulados, 120);
    assert.equal(timon.vehiculos[0]?.titulo, "Casaca 1");
    assert.ok(!timon.vehiculos.some(v => v.kind === "pausa"));

    const presencia = hydratePresenciaEpisodio({
      proyectoId: "costura",
      vehicles,
      now: t830,
    });
    const pausas = presencia.vehiculos.filter(v => v.kind === "pausa");
    assert.equal(pausas.length, 1);
    assert.equal(pausas[0]?.openedAt, t730);
    assert.equal(pausas[0]?.minutos, 60);
    assert.match(pausas[0]?.titulo ?? "", /desayuno|intercepción|Pausa/i);
  });
});

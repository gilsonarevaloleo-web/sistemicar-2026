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
  resumenTimonDesdeEpisodio,
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

  it("etiquetas para la conciencia: hora enumerada y horas cerradas, no minutos", () => {
    assert.equal(formatHoraLabel(1), "Hora 1");
    assert.equal(formatHoraLabel(3), "Hora 3");
    assert.equal(formatHorasCerradas(0), "menos de 1 h");
    assert.equal(formatHorasCerradas(40), "menos de 1 h");
    assert.equal(formatHorasCerradas(60), "1 h");
    assert.equal(formatHorasCerradas(185), "3 h");
  });
});

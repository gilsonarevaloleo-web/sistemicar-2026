import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { buildConcienciaTriadaFromVehicles } from "./concienciaTriadaOperador.ts";
import { selloTiempoDesdeTriada } from "./selloTiempoTriada.ts";
import { resetVehicleSessionSealsForTests } from "./vehicleSessionSeal.ts";
import type { Vehicle } from "./persistence.ts";
import { hechosTiempoSello } from "../../../shared/selloOperador/construirSello.ts";

const FECHA = "2026-08-19";

function lima(hhmm: string): number {
  return Date.parse(`2026-08-19T${hhmm}:00-05:00`);
}

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

describe("selloTiempoDesdeTriada", () => {
  it("consciente es presencia + dirección, no un 19 h inventado", () => {
    const t = selloTiempoDesdeTriada({
      hasPlanificacion: true,
      fecha: FECHA,
      minutosInconsciente: 104,
      minutosPresencia: 213,
      minutosDireccion: 730,
      minutosPlan: 1047,
      pctInconsciente: 10,
      pctPresencia: 20,
      pctDireccion: 70,
      etapaDominante: "direccion",
      headline: "",
      minutosHueco: 104,
      minutosPlanFuturo: 0,
      minutosNoConquistado: 390,
      minutosDia: 1440,
      pctNoConquistado: 27,
      hilosAvanzando: 0,
      paraleloMeritorio: false,
      interruptCubreLinea: false,
      minutosParaleloEnJuego: 0,
      minutosParaleloGanado: 0,
    });
    assert.equal(t.conquistaMin, 943);
    assert.equal(t.entropiaMin, 104);
    assert.equal(t.vacioMin, 390);
    assert.equal(t.coberturaPct, 73);
    assert.equal(t.minutosPresencia + t.minutosDireccion, t.conquistaMin);
    const hechos = hechosTiempoSello(t);
    assert.ok(hechos.some((h) => h.includes("Cobertura del día: 73%")));
    assert.ok(hechos.some((h) => h.includes("Consciente 15 h 43 min")));
    assert.equal(hechos.some((h) => /19 h 9/.test(h)), false);
  });
});

describe("sello y cobertura comparten minutos únicos", () => {
  beforeEach(() => {
    resetVehicleSessionSealsForTests();
  });

  it("dos vehículos en la misma franja no inflan consciente a 20 h", () => {
    const now = lima("23:00");
    const segmentos = [{ horaInicio: "05:00", horaFin: "23:00" }];
    const vehicles = [
      v({
        id: "a",
        status: "cumplido",
        aperturaAt: lima("08:00"),
        cierreAt: lima("18:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
      }),
      v({
        id: "b",
        status: "cumplido",
        aperturaAt: lima("08:00"),
        cierreAt: lima("18:00"),
        destinoCierre: "peldano",
        proyectoId: "n1",
      }),
    ];
    const triada = buildConcienciaTriadaFromVehicles({
      fecha: FECHA,
      segmentos,
      vehicles,
      now,
    });
    const tiempo = selloTiempoDesdeTriada(triada);
    assert.equal(tiempo.conquistaMin, 600);
    assert.equal(tiempo.minutosDireccion, 600);
    assert.equal(tiempo.minutosPresencia, 0);
    assert.equal(tiempo.coberturaPct, 100 - triada.pctNoConquistado);
    assert.equal(tiempo.entropiaMin, triada.minutosInconsciente);
    assert.equal(tiempo.vacioMin, triada.minutosNoConquistado);
    const hechos = hechosTiempoSello(tiempo);
    assert.ok(hechos.some((h) => h.includes("Consciente 10 h")));
    assert.equal(hechos.some((h) => /Consciente 20 h|Conquista 20 h|19 h 9/.test(h)), false);
  });

  it("presencia y dirección del sello son las de la tríada", () => {
    const now = lima("23:00");
    const segmentos = [{ horaInicio: "05:00", horaFin: "23:00" }];
    const vehicles = [
      v({
        id: "pre",
        status: "cumplido",
        aperturaAt: lima("06:00"),
        cierreAt: lima("09:33"),
        destinoCierre: "presencia",
      }),
      v({
        id: "dir",
        status: "cumplido",
        aperturaAt: lima("10:00"),
        cierreAt: lima("22:10"),
        destinoCierre: "peldano",
        proyectoId: "n1",
      }),
    ];
    const triada = buildConcienciaTriadaFromVehicles({
      fecha: FECHA,
      segmentos,
      vehicles,
      now,
    });
    const tiempo = selloTiempoDesdeTriada(triada);
    assert.equal(tiempo.minutosPresencia, triada.minutosPresencia);
    assert.equal(tiempo.minutosDireccion, triada.minutosDireccion);
    assert.equal(tiempo.conquistaMin, triada.minutosPresencia + triada.minutosDireccion);
    assert.equal(tiempo.entropiaMin, triada.minutosInconsciente);
    assert.equal(tiempo.vacioMin, triada.minutosNoConquistado);
    assert.equal(tiempo.coberturaPct, 100 - triada.pctNoConquistado);
  });
});

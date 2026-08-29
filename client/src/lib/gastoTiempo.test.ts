import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accrueGastoTiempo,
  buildProyectoRendicion,
  classifyFuenteGasto,
  idleSecondsOfVehicle,
  sealGastoTiempo,
  wallSecondsFromRange,
} from "./gastoTiempo.ts";
import type { Vehicle } from "./persistence.ts";

function v(partial: Partial<Vehicle> & { id: string }): Vehicle {
  return partial as Vehicle;
}

describe("gastoTiempo", () => {
  it("compacta el JSON del especialista a un sello de intervalo", () => {
    const sello = sealGastoTiempo(
      v({
        id: "veh_almuerzo_123",
        titulo: "Consulta a geminis",
        proyectoId: "proyecto_desarrollo_personal",
        destinoCierre: "presencia",
        aperturaAt: Date.parse("2026-08-28T13:51:30Z"),
        cierreAt: Date.parse("2026-08-28T14:11:11Z"),
      })
    );
    assert.ok(sello);
    assert.equal(sello.vid, "veh_almuerzo_123");
    assert.equal(sello.pid, "proyecto_desarrollo_personal");
    assert.equal(sello.dest, "presencia");
    assert.equal(sello.src, "vehiculo");
    assert.equal(sello.sec, 1181);
    assert.equal(sello.t, "Consulta a geminis");
    assert.equal(typeof sello.a, "number");
    assert.equal(typeof sello.z, "number");
  });

  it("lista rápida situacional se clasifica y sella pared", () => {
    assert.equal(
      classifyFuenteGasto({
        tipoFlota: "situacion",
        situacionCronometro: null,
      }),
      "lista_rapida"
    );
    const sello = sealGastoTiempo(
      v({
        id: "libre1",
        titulo: "Mandados",
        tipoFlota: "situacion",
        situacionCronometro: null,
        destinoCierre: "presencia",
        proyectoId: "p1",
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 8 * 60_000,
      })
    );
    assert.equal(sello?.src, "lista_rapida");
    assert.equal(sello?.dest, "presencia");
    assert.equal(sello?.sec, 480);
  });

  it("interrupción sella el hijo, no el padre congelado", () => {
    assert.equal(
      classifyFuenteGasto({
        tipoFlota: "situacion",
        vehiculoPadreDesglosadorId: "padre",
      }),
      "interrupt"
    );
    const sello = sealGastoTiempo(
      v({
        id: "int1",
        titulo: "Llamada",
        tipoFlota: "situacion",
        vehiculoPadreDesglosadorId: "padre",
        destinoCierre: "presencia",
        proyectoId: "p1",
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 12 * 60_000,
      })
    );
    assert.equal(sello?.src, "interrupt");
    assert.equal(sello?.sec, 720);
  });

  it("desglosador sin subs de medida es idle_desglose con idle = pared", () => {
    const sello = sealGastoTiempo(
      v({
        id: "dg1",
        titulo: "Costura",
        tipoReloj: "desglosador",
        tipoFlota: "tiempo",
        destinoCierre: "peldano",
        proyectoId: "p1",
        subVehiculos: [
          { id: "s1", titulo: "espera", status: "pendiente" },
        ],
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 20 * 60_000,
      })
    );
    assert.equal(sello?.src, "idle_desglose");
    assert.equal(sello?.dest, "direccion");
    assert.equal(sello?.sec, 1200);
    assert.equal(sello?.idle, 1200);
  });

  it("idle = pared − subs medidos (hueco entre unidades)", () => {
    const idle = idleSecondsOfVehicle(
      {
        tipoReloj: "desglosador",
        subVehiculos: [
          { duracionFinal: 300 },
          { duracionFinal: 180 },
        ],
      },
      900
    );
    assert.equal(idle, 420);
  });

  it("accrue es idempotente por vid+apertura", () => {
    const sello = sealGastoTiempo(
      v({
        id: "v1",
        titulo: "A",
        destinoCierre: "presencia",
        proyectoId: "p1",
        aperturaAt: 1_000_000,
        cierreAt: 1_000_000 + 60_000,
      })
    )!;
    const once = accrueGastoTiempo(null, sello);
    const twice = accrueGastoTiempo(once, sello);
    assert.equal(once.n, 1);
    assert.equal(twice.n, 1);
    assert.equal(once.secPresencia, 60);
    assert.equal(twice.secPresencia, 60);
  });

  it("rendición: no conquistado no es deuda — resto del plan vinculado", () => {
    const gasto = accrueGastoTiempo(null, {
      vid: "v1",
      dest: "presencia",
      src: "lista_rapida",
      a: 1,
      z: 2,
      sec: 20 * 60,
    });
    const dir = accrueGastoTiempo(gasto, {
      vid: "v2",
      dest: "direccion",
      src: "vehiculo",
      a: 3,
      z: 4,
      sec: 10 * 60,
    });
    const r = buildProyectoRendicion({
      gasto: dir,
      minutosPlanVinculado: 90,
    });
    assert.equal(r.minutosPresencia, 20);
    assert.equal(r.minutosDireccion, 10);
    assert.equal(r.minutosNoConquistado, 60);
    assert.equal(r.hasPlanVinculado, true);
    assert.match(r.headline, /no conquistado|revela/i);
  });

  it("sin plan vinculado no inventa inconsciente", () => {
    const r = buildProyectoRendicion({
      gasto: accrueGastoTiempo(null, {
        vid: "v1",
        dest: "presencia",
        src: "vehiculo",
        a: 1,
        z: 2,
        sec: 600,
      }),
      minutosPlanVinculado: 0,
    });
    assert.equal(r.minutosNoConquistado, 0);
    assert.equal(r.hasPlanVinculado, false);
    assert.equal(r.minutosPresencia, 10);
  });

  it("sella con solo duracionFinal en minutos si no hay apertura", () => {
    const sello = sealGastoTiempo(
      v({
        id: "solo-min",
        titulo: "Sin reloj",
        proyectoId: "p1",
        destinoCierre: "presencia",
        duracionFinal: 15,
      }),
      2_000_000
    );
    assert.equal(sello?.sec, 900);
    assert.equal(sello?.z, 2_000_000);
  });
});

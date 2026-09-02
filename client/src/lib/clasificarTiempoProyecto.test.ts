import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clasificarTiempoVehiculo,
  ledgerNombresMinutos,
  minutosDeProyecto,
  vehiculoEsCombinado,
} from "./clasificarTiempoProyecto.ts";
import type { TimonVehiculoFuente } from "./timonHoras.ts";

function v(partial: TimonVehiculoFuente): TimonVehiculoFuente {
  return partial;
}

describe("clasificarTiempoProyecto", () => {
  it("desglosador dedicado: todo el trabajo al proyecto del vehículo", () => {
    const c = clasificarTiempoVehiculo(
      v({
        id: "v1",
        titulo: "Hacer 27 busos negros XL",
        status: "archivado",
        destinoCierre: "peldano",
        proyectoId: "costura",
        oleadaPuntoId: "pt_xl",
        duracionFinal: 40,
      })
    );
    assert.equal(c.modo, "dedicado");
    assert.equal(c.minutos, 40);
    assert.equal(c.partes.length, 1);
    assert.equal(c.partes[0]?.proyectoId, "costura");
  });

  it("combinado: 30 min a costura + 15 min a otra cosa = partes, no un sello único", () => {
    const fuente = {
      proyectoId: "costura",
      subTareas: [
        { titulo: "Negros XL", proyectoId: "costura", duracionRealSec: 30 * 60 },
        { titulo: "Mandados", proyectoId: "casa", duracionRealSec: 15 * 60 },
      ],
    };
    assert.equal(vehiculoEsCombinado(fuente), true);
    const c = clasificarTiempoVehiculo(
      v({
        id: "mix",
        titulo: "Tarde combinada",
        status: "archivado",
        tipoFlota: "situacion",
        destinoCierre: "peldano",
        ...fuente,
      })
    );
    assert.equal(c.modo, "combinado");
    assert.equal(c.partes.length, 2);
    assert.equal(c.partes.find(p => p.proyectoId === "costura")?.minutos, 30);
    assert.equal(c.partes.find(p => p.proyectoId === "casa")?.minutos, 15);
  });

  it("fragmentos del mismo proyecto suman: 30 + 15 = 45 con nombres", () => {
    const manana = clasificarTiempoVehiculo(
      v({
        id: "am",
        titulo: "Corte mañana",
        status: "archivado",
        proyectoId: "costura",
        oleadaPuntoId: "pt_xl",
        duracionFinal: 30,
      })
    );
    const noche = clasificarTiempoVehiculo(
      v({
        id: "pm",
        titulo: "Costura noche",
        status: "archivado",
        proyectoId: "costura",
        oleadaPuntoId: "pt_xl",
        duracionFinal: 15,
      })
    );
    assert.equal(minutosDeProyecto([manana, noche], "costura"), 45);
    const ledger = ledgerNombresMinutos([manana, noche], "costura");
    assert.equal(ledger.length, 2);
    assert.equal(ledger[0]?.titulo, "Corte mañana");
    assert.equal(ledger[1]?.minutos, 15);
  });

  it("sin proyecto no ensucia un timón", () => {
    const c = clasificarTiempoVehiculo(
      v({
        id: "libre",
        titulo: "Sin rumbo",
        status: "archivado",
        duracionFinal: 20,
      })
    );
    assert.equal(c.modo, "sin_proyecto");
    assert.equal(c.partes.length, 0);
    assert.equal(minutosDeProyecto([c], "costura"), 0);
  });
});

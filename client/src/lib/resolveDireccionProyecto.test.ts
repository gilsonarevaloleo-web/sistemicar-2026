import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  direccionHerenciaLabel,
  resolveDireccionDesdeEntidades,
  resolveDireccionProyecto,
} from "./resolveDireccionProyecto.ts";

describe("resolveDireccionProyecto", () => {
  it("cascada sub > vehículo > segmento", () => {
    assert.equal(
      resolveDireccionProyecto({
        subProyectoId: "sub",
        vehicleProyectoId: "veh",
        segmentoProyectoId: "seg",
      }),
      "sub"
    );
    assert.equal(
      resolveDireccionProyecto({
        vehicleProyectoId: "veh",
        segmentoProyectoId: "seg",
      }),
      "veh"
    );
    assert.equal(
      resolveDireccionProyecto({
        segmentoProyectoId: "seg",
      }),
      "seg"
    );
    assert.equal(resolveDireccionProyecto({}), undefined);
  });

  it("desde entidades SubVehiculo / Vehicle / Segmento", () => {
    assert.equal(
      resolveDireccionDesdeEntidades({
        sub: { proyectoId: "a" },
        vehicle: { proyectoId: "b" },
        segmento: { proyectoVinculadoId: "c" },
      }),
      "a"
    );
  });

  it("label de herencia", () => {
    assert.equal(
      direccionHerenciaLabel("sub", {
        subProyectoId: "sub",
        vehicleProyectoId: "veh",
        segmentoProyectoId: "seg",
      }),
      "Dirección del sub"
    );
    assert.equal(
      direccionHerenciaLabel("veh", {
        vehicleProyectoId: "veh",
        segmentoProyectoId: "seg",
      }),
      "Dirección del vehículo"
    );
    assert.equal(
      direccionHerenciaLabel("seg", { segmentoProyectoId: "seg" }),
      "Dirección del segmento"
    );
  });
});

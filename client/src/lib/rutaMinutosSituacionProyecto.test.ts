import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  destinoCierreAlLanzarSituacion,
  minutosFromSegundos,
  resolveMinutosNorteDisplay,
  resolveMinutosPresenciaDisplay,
  resolveRutaMinutosSituacion,
  segundosTrabajadosAlClic,
  situacionCreditKey,
} from "./rutaMinutosSituacionProyecto.ts";

describe("rutaMinutosSituacionProyecto", () => {
  it("sin dirección no llena casilla de proyecto", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      fuente: "ring-click",
      duracionRealSec: 120,
    });
    assert.equal(r.bucket, "none");
    assert.equal(r.segundos, 0);
  });

  it("proyectoId sin sello de Dirección alimenta presencia — no reclama Norte", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      vehicleProyectoId: "proy-costura",
      fuente: "ring-click",
      duracionRealSec: 185,
    });
    assert.equal(r.bucket, "presencia");
    assert.equal(r.proyectoId, "proy-costura");
    assert.equal(r.segundos, 185);
    assert.equal(r.creditKey, situacionCreditKey("v1", "s1"));
  });

  it("Dirección explícita (peldaño) manda el ring a Norte", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      vehicleProyectoId: "proy-costura",
      destinoCierre: "peldano",
      fuente: "ring-click",
      duracionRealSec: 185,
    });
    assert.equal(r.bucket, "norte");
    assert.equal(r.segundos, 185);
  });

  it("dirección de la fila gana sobre el vehículo y sin sello queda en presencia", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      subProyectoId: "proy-fila",
      vehicleProyectoId: "proy-veh",
      fuente: "ring-click",
      duracionRealSec: 60,
    });
    assert.equal(r.proyectoId, "proy-fila");
    assert.equal(r.bucket, "presencia");
  });

  it("destino presencia explícito manda el ring a presencia, no a Norte", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      vehicleProyectoId: "proy-1",
      destinoCierre: "presencia",
      fuente: "ring-click",
      duracionRealSec: 90,
    });
    assert.equal(r.bucket, "presencia");
    assert.equal(r.segundos, 90);
  });

  it("lista libre va a presencia sin minutos (no tiene tiempo)", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      vehicleProyectoId: "proy-1",
      destinoCierre: "peldano",
      fuente: "lista-libre",
      duracionRealSec: 999,
    });
    assert.equal(r.bucket, "presencia");
    assert.equal(r.segundos, 0);
  });

  it("el segundo del clic cuenta aunque duracionRealSec sea 0 — sin sello es presencia", () => {
    const r = resolveRutaMinutosSituacion({
      vehicleId: "v1",
      subId: "s1",
      vehicleProyectoId: "proy-1",
      fuente: "ring-click",
      duracionRealSec: 0,
    });
    assert.equal(r.bucket, "presencia");
    assert.equal(r.segundos, 1);
    assert.equal(segundosTrabajadosAlClic(0), 0);
  });

  it("lanzar ring sella Dirección solo con rumbo abierto; lista libre es presencia", () => {
    assert.equal(
      destinoCierreAlLanzarSituacion({ esListaLibre: true, tieneDireccion: true, direccionAbierta: true }),
      "presencia"
    );
    assert.equal(
      destinoCierreAlLanzarSituacion({ esListaLibre: false, tieneDireccion: true }),
      "presencia"
    );
    assert.equal(
      destinoCierreAlLanzarSituacion({
        esListaLibre: false,
        tieneDireccion: true,
        direccionAbierta: true,
      }),
      "peldano"
    );
    assert.equal(
      destinoCierreAlLanzarSituacion({ esListaLibre: false, tieneDireccion: false }),
      "presencia"
    );
  });

  it("display Norte suma peldaños conquista + segundos del ring sin doble conteo de minutos sueltos", () => {
    assert.equal(minutosFromSegundos(185), 3);
    assert.equal(minutosFromSegundos(20), 0);
    assert.equal(resolveMinutosNorteDisplay(40, 185), 43);
    assert.equal(resolveMinutosNorteDisplay(0, 20), 0);
    assert.equal(resolveMinutosPresenciaDisplay(12, 90), 14);
  });
});

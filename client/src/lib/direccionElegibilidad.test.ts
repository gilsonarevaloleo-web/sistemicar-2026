import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOleadaPunto } from "./oleadaPuntos.ts";
import {
  DIRECCION_SIN_PROYECTO,
  destinoCierreAlLanzarConGate,
  evaluateDireccionElegibilidad,
  mapDireccionGates,
  noPuedesLlegarADireccion,
  oleadaDeDireccion,
  resolveClaimDestinoCierre,
  resolveRumboTrasEnvio,
  riesgoEnsuciarProyecto,
  rumboChipLabel,
  rumboChipLines,
  type DireccionPeldanoRef,
} from "./direccionElegibilidad.ts";

const PROY = { id: "p1", titulo: "Costura" };

function oleada(puntos: DireccionPeldanoRef["oleadaPuntos"] = []): DireccionPeldanoRef {
  return { estado: "en_curso", origenSegmento: false, oleadaPuntos: puntos, titulo: "Oleada 1" };
}

describe("direccionElegibilidad", () => {
  it("sin oleada real no abre Dirección — sombra de segmento no cuenta", () => {
    const sombra: DireccionPeldanoRef = {
      estado: "en_curso",
      origenSegmento: true,
      oleadaPuntos: [createOleadaPunto("bloque", 1)],
    };
    const gate = evaluateDireccionElegibilidad(PROY, [sombra]);
    assert.equal(gate.ok, false);
    assert.equal(gate.gap, "sin_oleada");
    assert.match(gate.porqueTodavia, /^todavía no hay oleada activa/);
    assert.equal(oleadaDeDireccion([sombra]), null);
    assert.match(noPuedesLlegarADireccion(gate), /No puedes llegar a Dirección porque todavía/);
  });

  it("oleada sin puntos: todavía no hay punto de producción", () => {
    const gate = evaluateDireccionElegibilidad(PROY, [oleada([])]);
    assert.equal(gate.ok, false);
    assert.equal(gate.gap, "sin_foco");
    assert.match(gate.porqueTodavia, /todavía no hay punto de producción/);
  });

  it("oleada con puntos cerrados: Dirección sigue abierta — el timón no caduca", () => {
    const a = { ...createOleadaPunto("negro small", 1), status: "cumplido" as const };
    const b = { ...createOleadaPunto("rojo small", 2), status: "fallado" as const };
    const gate = evaluateDireccionElegibilidad(PROY, [
      { ...oleada([a, b]), puntoProduccionId: a.id },
    ]);
    assert.equal(gate.ok, true);
    assert.equal(gate.gap, null);
    assert.equal(gate.puntoProduccionId, a.id);
    assert.equal(gate.puntoProduccionTitulo, "negro small");
    assert.match(gate.riesgoEnsuciar, /horas enumeradas/);
    assert.match(gate.riesgoEnsuciar, /negro small/);
  });

  it("oleada + punto abre Dirección y nombra las horas del timón", () => {
    const foco = createOleadaPunto("Corte de patrón", 1);
    const gate = evaluateDireccionElegibilidad(PROY, [oleada([foco])]);
    assert.equal(gate.ok, true);
    assert.equal(gate.gap, null);
    assert.equal(noPuedesLlegarADireccion(gate), "");
    assert.equal(gate.puntoProduccionId, foco.id);
    assert.equal(gate.puntoProduccionTitulo, "Corte de patrón");
    assert.match(gate.riesgoEnsuciar, /horas enumeradas/);
    assert.match(gate.riesgoEnsuciar, /Corte de patrón/);
    assert.match(riesgoEnsuciarProyecto("Costura"), /escalera/);
    assert.equal(rumboChipLabel(gate), "Costura · Corte de patrón");
    assert.deepEqual(rumboChipLines(gate), {
      titulo: "Costura",
      punto: "Corte de patrón",
    });
    assert.deepEqual(rumboChipLines({ titulo: "Salud" }), {
      titulo: "Salud",
      punto: null,
    });
  });

  it("el tint del Hub viaja en el gate", () => {
    const gate = evaluateDireccionElegibilidad(
      { id: "p1", titulo: "Costura", color: "#F97316" },
      []
    );
    assert.equal(gate.color, "#F97316");
    assert.equal(gate.ok, false);
  });

  it("mapDireccionGates separa abiertas de huecos", () => {
    const gates = mapDireccionGates(
      [
        { id: "cerrado", titulo: "Sin rumbo" },
        { id: "abierto", titulo: "Con rumbo" },
      ],
      id =>
        id === "abierto"
          ? [oleada([createOleadaPunto("Foco", 1)])]
          : []
    );
    assert.equal(gates.filter(g => g.ok).length, 1);
    assert.equal(gates.find(g => g.ok)?.proyectoId, "abierto");
  });

  it("lanzar: lista libre y rumbo cerrado quedan en presencia", () => {
    assert.equal(
      destinoCierreAlLanzarConGate({
        esListaLibre: true,
        tieneDireccion: true,
        direccionAbierta: true,
      }),
      "presencia"
    );
    assert.equal(
      destinoCierreAlLanzarConGate({
        esListaLibre: false,
        tieneDireccion: true,
        direccionAbierta: false,
      }),
      "presencia"
    );
    assert.equal(
      destinoCierreAlLanzarConGate({
        esListaLibre: false,
        tieneDireccion: true,
        direccionAbierta: true,
      }),
      "peldano"
    );
  });

  it("claim: el ego no sella peldaño si el gate está cerrado", () => {
    const cerrado = evaluateDireccionElegibilidad(PROY, []);
    const denied = resolveClaimDestinoCierre({
      requested: "peldano",
      proyectoId: "p1",
      gate: cerrado,
    });
    assert.equal(denied.accepted, false);
    assert.equal(denied.destino, "presencia");

    const abierto = evaluateDireccionElegibilidad(PROY, [oleada([createOleadaPunto("F", 1)])]);
    const ok = resolveClaimDestinoCierre({
      requested: "peldano",
      proyectoId: "p1",
      gate: abierto,
    });
    assert.equal(ok.accepted, true);
    assert.equal(ok.destino, "peldano");
  });

  it("envío Crisol: nido sin rumbo llega a presencia (rápido, sin ensuciar)", () => {
    const cerrado = evaluateDireccionElegibilidad(PROY, []);
    const r = resolveRumboTrasEnvio({ nidoProyectoId: "p1", gate: cerrado });
    assert.equal(r.stampVehicle, false);
    assert.equal(r.destinoCierre, "presencia");
    assert.match(r.copy, /presencia/);
    assert.match(r.copy, /todavía/);

    const punto = createOleadaPunto("F", 1);
    const abierto = evaluateDireccionElegibilidad(PROY, [oleada([punto])]);
    const d = resolveRumboTrasEnvio({ nidoProyectoId: "p1", gate: abierto });
    assert.equal(d.stampVehicle, true);
    assert.equal(d.destinoCierre, "peldano");
    assert.equal(d.proyectoId, "p1");
    assert.equal(d.oleadaPuntoId, punto.id);
    assert.match(d.copy, /horas enumeradas/);
  });

  it("sin proyecto: copy de hueco", () => {
    assert.equal(DIRECCION_SIN_PROYECTO.ok, false);
    assert.match(noPuedesLlegarADireccion(DIRECCION_SIN_PROYECTO), /todavía no hay un proyecto/);
  });
});

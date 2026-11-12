import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absorbPrincipioDesdeVolcado,
  cerebroVacio,
  enviarAFiltro,
  escribirAplicacion,
  promoverALey,
} from "./cerebroMadre.ts";
import { diagnosticarAuditoriaLocal } from "./motor.ts";
import {
  ORACULO_CASA_VACIO,
  consultarLeyesCasa,
  responderConsulta,
} from "./oraculoCasa.ts";
import type { DepotEntryPayload } from "./types.ts";

const NACIMIENTO = Date.UTC(2026, 10, 9, 12, 0, 0);

const VOLCADO_09: DepotEntryPayload = {
  rawFact: `Hoy aprendi que el cansancio es el enfoque el polo positivo a más de 90 minutos.
Hace como un mes atrás estaba trabajando en otro taller. El sueño me dominaba. Cambié el enfoque al polo contrario, los puentes, sin cambiar el movimiento.
Por eso digo que el cansancio solo es enfoque en lo mismo a mayor de 90 minutos si cambiamos de enfoque al polo contrario- los puentes sin cambiar la mecánica de movimiento.`,
  studentHypothesis: "Acá pareció la ley de la economía de energía código 7",
  detectedNoise: "No hay",
  omittedShadow: "El cuerpo sigue a la atención",
  userTier: "CARRERA",
};

const VOLCADO_11: DepotEntryPayload = {
  rawFact: `Hoy aprendi que la necesidad de un cliente puede que no exista, hasta que se lo haga conciente.
Habeces me encuentro aburrido y me voy a Facebook, ahí encuentro publicidad y esa publicidad crea una necesidad.
Por eso digo que la necesidad no existe hasta que un vendedor lo haga conciente de la necesidad del cliente.`,
  studentHypothesis: "La ley de si no lo ve, no existe. Código 1",
  detectedNoise: "No hay",
  omittedShadow: "Mostrar la necesidad no es forsarlo",
  userTier: "CARRERA",
};

function sellarC9(
  payload: DepotEntryPayload,
  now: number,
  aplicacion: string,
  cerebro = cerebroVacio(),
) {
  const nacido = absorbPrincipioDesdeVolcado(cerebro, {
    payload,
    result: diagnosticarAuditoriaLocal(payload),
    now,
  });
  const id = nacido.principio!.id;
  const filtrado = escribirAplicacion(
    enviarAFiltro(nacido.cerebro, id, now + 1),
    id,
    aplicacion,
  );
  return promoverALey(filtrado, id, now + 2);
}

describe("Depósito V3 — Oráculo de Casa", () => {
  it("cita la ley 09/11 ante fatiga / cansancio / 90 minutos", () => {
    const casa = sellarC9(
      VOLCADO_09,
      NACIMIENTO,
      "Cambia de polo (puentes) sin cambiar el movimiento.",
    );
    const hit = responderConsulta(
      "¿Qué dice Sistemicar sobre la fatiga en el trabajo a los 90 minutos?",
      casa.principios,
    );
    assert.equal(hit.vacio, false);
    if (hit.vacio) return;
    assert.match(hit.axioma, /cansancio/i);
    assert.match(hit.aplicacion, /polo|puentes/i);
    assert.equal(hit.codigo, 9);
    assert.equal(hit.categoria, "Soberanía");
  });

  it("cita la ley 11/11 ante cliente apático / necesidad consciente", () => {
    const con09 = sellarC9(
      VOLCADO_09,
      NACIMIENTO,
      "Cambia de polo sin cambiar el movimiento.",
    );
    const casa = sellarC9(
      VOLCADO_11,
      NACIMIENTO + 86_400_000,
      "Hacé consciente la necesidad. El sí del cliente no es tu tijera.",
      con09,
    );
    assert.equal(casa.principios.filter((p) => p.estado === "ley").length, 2);

    const hit = responderConsulta(
      "¿Cómo solucionaría Sistemicar la resistencia de un cliente apático?",
      casa.principios,
    );
    assert.equal(hit.vacio, false);
    if (hit.vacio) return;
    assert.match(hit.axioma, /necesidad no existe/i);
    assert.match(hit.aplicacion, /consciente|necesidad/i);
    assert.equal(hit.codigo, 9);
  });

  it("criptomonedas no tiene ley: frase de vacío", () => {
    const casa = sellarC9(
      VOLCADO_09,
      NACIMIENTO,
      "Cambia de polo sin cambiar el movimiento.",
    );
    const vacio = responderConsulta(
      "¿Qué dice Sistemicar sobre criptomonedas?",
      casa.principios,
    );
    assert.equal(vacio.vacio, true);
    if (!vacio.vacio) return;
    assert.equal(vacio.texto, ORACULO_CASA_VACIO);
  });

  it("un candidato no se cita: solo leyes selladas", () => {
    const nacido = absorbPrincipioDesdeVolcado(cerebroVacio(), {
      payload: VOLCADO_09,
      result: diagnosticarAuditoriaLocal(VOLCADO_09),
      now: NACIMIENTO,
    });
    const vacio = responderConsulta(
      "fatiga cansancio 90 minutos",
      nacido.cerebro.principios,
    );
    assert.equal(vacio.vacio, true);
    assert.equal(consultarLeyesCasa("cansancio", nacido.cerebro.principios), null);
  });
});

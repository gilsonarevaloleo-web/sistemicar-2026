import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pasaCandadoCodigo,
  tieneCostoTemporalExplicito,
  tienePrimerPasoPractico,
} from "./criterioCodigo.ts";
import {
  aplicarCandadoEvaluacion,
  evaluarUmbralLocal,
} from "./engineConfig.ts";

/** Volcado real que el Relojero rechazó en Arena C3. */
const VOLCADO_REVELACION_SIN_MINUTOS = `
Comprendo que hoy día que todos quieren llamar la atención y solo son
distractores, ahí conviene ser selectivo con nuestra desiciones. Por eso
acá yo quiero hacert ver lo simple que es darte cuenta como un día se
convierte en medible, porque se puede responder (cuánto de tu tiempo es
inconciente, cuánto de tu tiempo es presencia, cuánto de tu tiempo está
en dirección y por último cuánto de tu tiempo no está conquistado o sin
intención) con el simple hecho de entrar a la jornada, crear tu segmentos
del día y dar nombre a tu tiempo. Con ya tienes la revelación para saber
cómo le vas a tratar al reloj.
`.trim();

const PITCH_RELOJERO_CON_MINUTOS = `
No te pido la tarde. En 8 minutos entras a Jornada, partes el día en 3
segmentos y le das nombre al primero. Ahí ya ves cuánto tiempo está sin
intención. El resto no es «después»: es el siguiente bloque de hoy.
`.trim();

describe("Umbral — candado Código 3 Arena", () => {
  it("detecta costo temporal explícito y no «hoy día»", () => {
    assert.equal(tieneCostoTemporalExplicito("en 8 minutos entras"), true);
    assert.equal(tieneCostoTemporalExplicito("son 2 horas"), true);
    assert.equal(tieneCostoTemporalExplicito("media hora y arrancas"), true);
    assert.equal(tieneCostoTemporalExplicito(VOLCADO_REVELACION_SIN_MINUTOS), false);
  });

  it("el volcado de revelación tiene gesto pero no minutos", () => {
    assert.equal(tienePrimerPasoPractico(VOLCADO_REVELACION_SIN_MINUTOS), true);
    assert.equal(
      pasaCandadoCodigo({
        codigo: 3,
        modo: "EXTERNO_VENTAS",
        respuestaUsuario: VOLCADO_REVELACION_SIN_MINUTOS,
      }),
      false,
    );
  });

  it("el pitch con 8 minutos y primer paso cruza el candado", () => {
    assert.equal(
      pasaCandadoCodigo({
        codigo: 3,
        modo: "EXTERNO_VENTAS",
        respuestaUsuario: PITCH_RELOJERO_CON_MINUTOS,
      }),
      true,
    );
  });

  it("evaluarUmbralLocal rechaza la revelación y aprueba el primer paso", () => {
    const ko = evaluarUmbralLocal({
      codigo: 3,
      modo: "EXTERNO_VENTAS",
      respuestaUsuario: VOLCADO_REVELACION_SIN_MINUTOS,
    });
    assert.equal(ko.aprobado, false);
    assert.equal(ko.codigoSiguiente, 3);
    assert.match(ko.feedbackConfrontativo, /jornada|segmentos|revelaci/i);
    assert.match(ko.feedbackConfrontativo, /8 minutos/i);
    assert.match(ko.feedbackConfrontativo, /ocupación|primer paso/i);

    const ok = evaluarUmbralLocal({
      codigo: 3,
      modo: "EXTERNO_VENTAS",
      respuestaUsuario: PITCH_RELOJERO_CON_MINUTOS,
    });
    assert.equal(ok.aprobado, true);
    assert.equal(ok.codigoSiguiente, 4);
  });

  it("«son 5 minutos, es simple» sin primer paso no pasa", () => {
    const ev = evaluarUmbralLocal({
      codigo: 3,
      modo: "EXTERNO_VENTAS",
      respuestaUsuario:
        "No es trabajoso, son 5 minutos y es simple. Después lo ves cuando quieras.",
    });
    assert.equal(ev.aprobado, false);
  });

  it("Gemini no puede aprobar C3 Arena sin minutos", () => {
    const ev = aplicarCandadoEvaluacion(
      {
        codigo: 3,
        modo: "EXTERNO_VENTAS",
        respuestaUsuario: VOLCADO_REVELACION_SIN_MINUTOS,
      },
      {
        aprobado: true,
        feedbackConfrontativo: "Cruce. El reloj ya tiene bloque.",
        codigoSiguiente: 4,
      },
    );
    assert.equal(ev.aprobado, false);
    assert.equal(ev.codigoSiguiente, 3);
    assert.match(ev.feedbackConfrontativo, /jornada|8 minutos/i);
  });

  it("el candado no toca otros códigos", () => {
    assert.equal(
      pasaCandadoCodigo({
        codigo: 1,
        modo: "EXTERNO_VENTAS",
        respuestaUsuario: "Te sirve para cortar la estática ahora.",
      }),
      true,
    );
  });
});

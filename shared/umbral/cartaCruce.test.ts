import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CODIGOS_NUMERO, type CodigoNumero } from "./engineConfig.ts";
import {
  aplicarSelloOferta,
  crearOfertaArena,
  type OfertaArena,
} from "./ofertaArena.ts";
import {
  cartaCruceEstaLista,
  componerCartaCruce,
  primeraFrase,
} from "./cartaCruce.ts";

const CUERPOS: Record<CodigoNumero, string> = {
  1: "Te nombra el crack de hoy y lo corta en una frase.",
  2: "Suma encima de lo que ya usas, sin otra carga.",
  3: "Primer paso: 8 minutos, abrir la consola y nombrar un crack.",
  4: "Límite claro: no promete magia; evidencia el corte de ayer.",
  5: "Costo 25 dólares al mes; el retorno es una hora recuperada por día.",
  6: "Prueba: un cruce de 12 minutos, sin registro ni tarjeta.",
  7: "El precio sostiene el estándar; lo barato te deja la fuga.",
  8: "Siguiente paso hoy: nombrar y someter C1. No «lo pienso».",
  9: "Mes 2: misma consola, mismos sellos, el sistema no se cae.",
  10: "Porque yo opero el estándar. Después del cobro, seguimos el cruce.",
};

function ofertaBase(): OfertaArena {
  return crearOfertaArena({
    id: "ofa-carta",
    userId: "u1",
    nombre: "Corte Limpio",
    fraseUtilidad: "Nombra el crack y lo corta hoy, sin flor.",
    nowIso: "2026-10-10T00:00:00.000Z",
  });
}

function sellar(o: OfertaArena, codigos: readonly CodigoNumero[]): OfertaArena {
  let next = o;
  for (const n of codigos) {
    next = aplicarSelloOferta(next, {
      codigo: n,
      respuestaAprobada: CUERPOS[n],
      feedbackGemini: "Cruza.",
      intentos: 1,
      fechaAprobacion: `2026-10-10T0${Math.min(n, 9)}:00:00.000Z`,
      sesionId: "s1",
    });
  }
  return next;
}

describe("Carta de Cruce", () => {
  it("primeraFrase corta en el primer punto", () => {
    assert.equal(
      primeraFrase("Corta la niebla hoy. El resto es pose."),
      "Corta la niebla hoy.",
    );
  });

  it("con 4 sellos es borrador y no se publica", () => {
    const carta = componerCartaCruce(sellar(ofertaBase(), [1, 2, 3, 4]));
    assert.equal(carta.estado, "BORRADOR");
    assert.equal(cartaCruceEstaLista(carta), false);
    assert.deepEqual(carta.faltantes, [5, 6, 7, 8, 9, 10]);
    assert.match(carta.sello, /4\/10 · borrador/);
    assert.match(carta.textoPlano, /\[FALTA C5\]/);
    assert.match(carta.textoPlano, /No se publica/);
    assert.equal(carta.bloques[0].cuerpo, CUERPOS[1]);
    assert.equal(carta.bloques[4].cuerpo, null);
    assert.equal(carta.anuncios[0].lista, true);
    assert.equal(carta.anuncios[2].lista, false);
  });

  it("10/10 arma carta lista y tres anuncios publicables", () => {
    const carta = componerCartaCruce(sellar(ofertaBase(), CODIGOS_NUMERO));
    assert.equal(carta.estado, "LISTA");
    assert.equal(cartaCruceEstaLista(carta), true);
    assert.deepEqual(carta.faltantes, []);
    assert.equal(carta.sello, "10/10 · La Arena");
    assert.equal(carta.titular, "Nombra el crack y lo corta hoy, sin flor.");
    assert.match(carta.textoPlano, /Corte Limpio/);
    assert.doesNotMatch(carta.textoPlano, /FALTA/);
    assert.match(carta.textoWhatsapp, /\*Corte Limpio\*/);
    assert.equal(carta.anuncios.length, 3);
    assert.ok(carta.anuncios.every((a) => a.lista));
    assert.match(carta.anuncios[0].arquetipo, /Apático/);
    assert.match(carta.anuncios[1].arquetipo, /Cínico/);
    assert.match(carta.anuncios[2].arquetipo, /Escéptico/);
    assert.match(carta.anuncios[0].objecion, /Corte Limpio/);
    assert.match(carta.anuncios[2].corte, /25 dólares/);
    assert.match(carta.anuncios[0].textoAnuncio, /Te nombra el crack/);
  });

  it("no inventa copy: el cuerpo es el sello aprobado", () => {
    const carta = componerCartaCruce(sellar(ofertaBase(), [5]));
    assert.equal(carta.bloques[4].cuerpo, CUERPOS[5]);
    assert.equal(carta.bloques[0].cuerpo, null);
    assert.match(carta.titular, /Nombra el crack/);
  });
});

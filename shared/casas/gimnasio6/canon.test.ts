import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANON_GIMNASIO,
  ETIQUETA_TIEMPO,
  capituloVisibleDe,
  pasosDelCapitulo,
  recorteEscenario,
  siguientePuntero,
} from "./canon.ts";

describe("Gimnasio 6 — tres tiempos por código", () => {
  it("cada código tiene 3 pasos: plantar, rozar, sostener", () => {
    const c1 = pasosDelCapitulo(1, {
      capitulo: 1,
      subcodigo: 1,
      indice: 1,
      variante: 0,
    });
    assert.equal(c1.length, 3);
    assert.equal(c1[0]?.etiquetaSubcodigo, ETIQUETA_TIEMPO[1]);
    assert.equal(c1[1]?.etiquetaSubcodigo, "Rozar");
    assert.equal(c1[2]?.etiquetaSubcodigo, "Sostener");
    assert.equal(CANON_GIMNASIO.filter((p) => p.capitulo === 1).length, 3);
    assert.equal(CANON_GIMNASIO.length, 30);
  });

  it("marca hecho / actual / pendiente sin adelantar el escenario futuro", () => {
    const pasos = pasosDelCapitulo(1, {
      capitulo: 1,
      subcodigo: 1,
      indice: 2,
      variante: 0,
    });
    assert.equal(pasos[0]?.estado, "hecho");
    assert.equal(pasos[1]?.estado, "actual");
    assert.equal(pasos[1]?.recorteEscenario, null);
    assert.equal(pasos[2]?.estado, "pendiente");
    assert.ok(pasos[0]?.recorteEscenario);
  });

  it("código sellado deja los 3 hechos", () => {
    const pasos = pasosDelCapitulo(
      1,
      { capitulo: 2, subcodigo: 1, indice: 1, variante: 0 },
      { sellado: true },
    );
    assert.equal(pasos.every((p) => p.estado === "hecho"), true);
    assert.equal(pasos.every((p) => Boolean(p.recorteEscenario)), true);
  });

  it("capituloVisibleDe muestra el código sellado en el tope diario", () => {
    assert.equal(
      capituloVisibleDe({
        puntero: { capitulo: 2, subcodigo: 1, indice: 1, variante: 0 },
        estado: "TOPE_DIARIO",
        capitulosSellados: [1],
      }),
      1,
    );
    assert.equal(
      capituloVisibleDe({
        puntero: { capitulo: 1, subcodigo: 1, indice: 2, variante: 0 },
        estado: "ABIERTO",
        capitulosSellados: [],
      }),
      1,
    );
  });

  it("pasar el primero no sella: va a rozar", () => {
    const next = siguientePuntero(1, 1, 1);
    assert.notEqual(next, "sellar");
    if (next !== "sellar") {
      assert.equal(next.indice, 2);
      assert.equal(next.capitulo, 1);
    }
    assert.equal(siguientePuntero(1, 1, 3), "sellar");
  });

  it("recorte no rompe", () => {
    assert.ok(recorteEscenario("abc").length <= 52);
  });
});

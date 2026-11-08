import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANON_GIMNASIO,
  ETIQUETA_SUBCODIGO,
  capituloVisibleDe,
  pasosDelCapitulo,
  recorteEscenario,
} from "./canon.ts";

describe("Gimnasio 6 — pasos del capítulo", () => {
  it("cap. 1 y 2 tienen 12 pasos proyectivos y etiquetas de subcódigo", () => {
    const c1 = pasosDelCapitulo(1, {
      capitulo: 1,
      subcodigo: 1,
      indice: 1,
      variante: 0,
    });
    assert.equal(c1.length, 12);
    assert.equal(CANON_GIMNASIO.filter((p) => p.capitulo === 1).length, 12);
    assert.equal(c1[0]?.etiquetaSubcodigo, ETIQUETA_SUBCODIGO[1][1]);
    assert.equal(c1[3]?.etiquetaSubcodigo, "Prioridad");
    assert.equal(c1[9]?.etiquetaSubcodigo, "Lo no ensayado");

    const c2 = pasosDelCapitulo(2, {
      capitulo: 2,
      subcodigo: 1,
      indice: 1,
      variante: 0,
    });
    assert.equal(c2.length, 12);
    assert.equal(c2[0]?.etiquetaSubcodigo, "Alguien de tu alrededor");
    assert.equal(c2[9]?.etiquetaSubcodigo, "Lo temido");
  });

  it("marca hecho / actual / pendiente sin adelantar el escenario futuro", () => {
    const pasos = pasosDelCapitulo(1, {
      capitulo: 1,
      subcodigo: 2,
      indice: 1,
      variante: 0,
    });
    assert.equal(pasos[0]?.estado, "hecho");
    assert.equal(pasos[2]?.estado, "hecho");
    assert.equal(pasos[3]?.estado, "actual");
    assert.equal(pasos[3]?.recorteEscenario, null);
    assert.equal(pasos[4]?.estado, "pendiente");
    assert.equal(pasos[4]?.recorteEscenario, null);
    assert.ok(pasos[0]?.recorteEscenario);
    assert.doesNotMatch(pasos[0]!.recorteEscenario!, /conocimiento sobre tu producto/);
  });

  it("capítulo sellado deja los 12 hechos", () => {
    const pasos = pasosDelCapitulo(
      1,
      { capitulo: 2, subcodigo: 1, indice: 1, variante: 0 },
      { sellado: true },
    );
    assert.equal(pasos.every((p) => p.estado === "hecho"), true);
    assert.equal(pasos.every((p) => Boolean(p.recorteEscenario)), true);
  });

  it("capituloVisibleDe muestra el capítulo sellado en el tope diario", () => {
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
        puntero: { capitulo: 1, subcodigo: 2, indice: 3, variante: 0 },
        estado: "ABIERTO",
        capitulosSellados: [],
      }),
      1,
    );
  });

  it("recorteEscenario no suelta el texto entero", () => {
    const largo =
      "Ahora que se comprobó alta seguridad en tu producto u oficio: vas a elegir una persona.";
    const recorte = recorteEscenario(largo, 40);
    assert.ok(recorte.endsWith("…"));
    assert.ok(recorte.length <= 40);
  });
});

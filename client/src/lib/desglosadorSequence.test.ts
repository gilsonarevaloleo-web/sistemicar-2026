import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectDesglosadorMisionSuggestions,
  defaultSelection,
  mergeSessionSequences,
  pickSequenceItems,
  resolveDesglosadorHabitualSequence,
  uniqueTitlesInOrder,
  type DesglosadorHistoryEntryLike,
} from "./desglosadorSequence.ts";

function entry(
  titulo: string,
  fecha: number,
  tipoReloj = "desglosador"
): DesglosadorHistoryEntryLike {
  return { titulo, tipoReloj, fecha };
}

describe("uniqueTitlesInOrder", () => {
  it("colapsa duplicados y conserva el primer orden", () => {
    assert.deepEqual(uniqueTitlesInOrder(["A", "b", "A", "B", "C"]), ["A", "b", "C"]);
  });
});

describe("mergeSessionSequences", () => {
  it("une bloques chicos de un armado largo (no se queda con el último)", () => {
    const manana = ["Cortar", "Enfuentar", "Bolsillo"];
    const tarde = ["Manga", "Cuello", "Cierre"];
    const ultimoBloqueCorto = ["Ojal", "Botón"];
    const merged = mergeSessionSequences([manana, tarde, ultimoBloqueCorto]);
    assert.equal(merged.length, 8);
    assert.deepEqual(merged, [
      "Cortar",
      "Enfuentar",
      "Bolsillo",
      "Manga",
      "Cuello",
      "Cierre",
      "Ojal",
      "Botón",
    ]);
  });

  it("si el mismo armado se corre dos veces, no duplica ops", () => {
    const ciclo = ["Cortar", "Manga", "Cierre"];
    assert.deepEqual(mergeSessionSequences([ciclo, ciclo]), ciclo);
  });
});

describe("resolveDesglosadorHabitualSequence", () => {
  const t0 = 1_700_000_000_000;

  it("fusiona 25 ops partidas en bloques de 1 h", () => {
    const titles = Array.from({ length: 25 }, (_, i) => `Op ${String(i + 1).padStart(2, "0")}`);
    const history: DesglosadorHistoryEntryLike[] = [];
    // 5 bloques de 5, separados por > 1 h
    for (let b = 0; b < 5; b++) {
      for (let i = 0; i < 5; i++) {
        const idx = b * 5 + i;
        history.push(
          entry(
            `Casaca leñadora → ${titles[idx]}`,
            t0 + b * 2 * 60 * 60 * 1000 + i * 60_000
          )
        );
      }
    }
    const resolved = resolveDesglosadorHabitualSequence("Casaca leñadora", history);
    assert.equal(resolved.source, "historial");
    assert.equal(resolved.items.length, 25);
    assert.equal(resolved.items[0]?.titulo, "Op 01");
    assert.equal(resolved.items[24]?.titulo, "Op 25");
  });

  it("reconoce la misión aunque el usuario escriba en minúsculas", () => {
    const history: DesglosadorHistoryEntryLike[] = [
      entry("Casaca leñadora → Cortar", t0),
      entry("Casaca leñadora → Manga", t0 + 1000),
    ];
    const resolved = resolveDesglosadorHabitualSequence("casaca leñadora", history);
    assert.deepEqual(
      resolved.items.map(i => i.titulo),
      ["Cortar", "Manga"]
    );
  });

  it("prefiere el ciclo con más subs que un bloque suelto", () => {
    const history: DesglosadorHistoryEntryLike[] = [
      entry("Casaca leñadora → Ojal", t0 + 10_000),
      {
        titulo: "Casaca leñadora",
        tipoReloj: "desglosador_ciclo",
        fecha: t0,
        subResumen: [
          { titulo: "Cortar" },
          { titulo: "Manga" },
          { titulo: "Cuello" },
          { titulo: "Cierre" },
        ],
      },
    ];
    const resolved = resolveDesglosadorHabitualSequence("Casaca leñadora", history);
    assert.equal(resolved.source, "ciclo");
    assert.deepEqual(
      resolved.items.map(i => i.titulo),
      ["Cortar", "Manga", "Cuello", "Cierre"]
    );
  });

  it("la lista guardada gana al historial", () => {
    const history: DesglosadorHistoryEntryLike[] = [
      entry("Casaca leñadora → Vieja", t0),
    ];
    const resolved = resolveDesglosadorHabitualSequence("Casaca leñadora", history, [
      {
        id: "l1",
        nombre: "Casaca leñadora",
        items: [{ titulo: "Cortar" }, { titulo: "Manga" }, { titulo: "Botón" }],
      },
    ]);
    assert.equal(resolved.source, "lista");
    assert.equal(resolved.items.length, 3);
    assert.equal(resolved.listaId, "l1");
  });
});

describe("pickSequenceItems", () => {
  it("deja solo las marcadas — recorrido a medias", () => {
    const items = [{ titulo: "A" }, { titulo: "B" }, { titulo: "C" }];
    assert.deepEqual(pickSequenceItems(items, [false, true, true]), [
      { titulo: "B" },
      { titulo: "C" },
    ]);
  });

  it("defaultSelection marca todas", () => {
    assert.deepEqual(defaultSelection(3), [true, true, true]);
  });
});

describe("collectDesglosadorMisionSuggestions", () => {
  it("pone la lista guardada primero en el buscador", () => {
    const sugs = collectDesglosadorMisionSuggestions(
      "casaca",
      [entry("Otra → X", 1)],
      [
        {
          id: "l1",
          nombre: "Casaca leñadora",
          items: [{ titulo: "Cortar" }, { titulo: "Manga" }],
        },
      ]
    );
    assert.equal(sugs[0]?.titulo, "Casaca leñadora");
    assert.equal(sugs[0]?.source, "lista");
    assert.equal(sugs[0]?.subs.length, 2);
  });
});

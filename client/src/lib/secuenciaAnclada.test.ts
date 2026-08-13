import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSecuenciaSlot,
  deleteSecuenciaAnclada,
  detectLetterTrigger,
  isEmptySituacionDraft,
  isSecuenciaDue,
  nextFreeLetter,
  normalizeBank,
  normalizeLetter,
  recallSecuencia,
  sanitizeHora,
  sanitizeTitulo,
  shouldAutoFillDue,
  suggestDueLetter,
  upsertSecuenciaAnclada,
  type SecuenciaAnclada,
} from "./secuenciaAnclada.ts";

function slot(
  partial: Partial<SecuenciaAnclada> & { letra: SecuenciaAnclada["letra"] }
): SecuenciaAnclada {
  return {
    titulo: "Cierre de tarde",
    filas: ["Responder mensajes", "Ordenar mesa"],
    filasProyectoIds: ["", ""],
    modo: "rapido",
    hora: null,
    diasActivos: [],
    ancladaAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("secuenciaAnclada — letra", () => {
  it("normaliza A–F y rechaza el resto", () => {
    assert.equal(normalizeLetter("a"), "A");
    assert.equal(normalizeLetter(" F "), "F");
    assert.equal(normalizeLetter("G"), null);
    assert.equal(normalizeLetter("AA"), null);
    assert.equal(normalizeLetter(""), null);
    assert.equal(normalizeLetter(1), null);
  });

  it("el disparador solo acepta una letra suelta — no se come Armado", () => {
    assert.equal(detectLetterTrigger("A"), "A");
    assert.equal(detectLetterTrigger("  b  "), "B");
    assert.equal(detectLetterTrigger("Armado"), null);
    assert.equal(detectLetterTrigger("A1"), null);
    assert.equal(detectLetterTrigger("A."), null);
  });
});

describe("secuenciaAnclada — sanitizado", () => {
  it("limpia HTML y control chars del título", () => {
    assert.equal(sanitizeTitulo("  <script>x</script> Corte  "), "x Corte");
    assert.equal(sanitizeTitulo("A\u0000B"), "AB");
    assert.equal(sanitizeTitulo("x".repeat(200)).length, 80);
  });

  it("hora inválida se descarta; HH:mm válido se normaliza", () => {
    assert.equal(sanitizeHora("8:05"), "08:05");
    assert.equal(sanitizeHora("25:00"), null);
    assert.equal(sanitizeHora("n/a"), null);
    assert.equal(sanitizeHora("<b>08:00</b>"), null);
  });

  it("rechaza secuencia sin filas válidas o letra falsa", () => {
    assert.equal(
      buildSecuenciaSlot({
        letra: "A",
        titulo: "X",
        filas: ["", "   "],
      }),
      null
    );
    assert.equal(
      buildSecuenciaSlot({
        letra: "Z",
        titulo: "X",
        filas: ["Responder"],
      }),
      null
    );
  });

  it("lista libre puede anclarse sin título: usa la 1ª fila", () => {
    const built = buildSecuenciaSlot({
      letra: "B",
      filas: ["  Llamar  ", "Cerrar caja"],
      modo: "rapido",
    });
    assert.ok(built);
    assert.equal(built!.titulo, "Llamar");
    assert.equal(built!.modo, "rapido");
    assert.deepEqual(built!.filas, ["Llamar", "Cerrar caja"]);
  });

  it("normaliza banco corrupto y bloquea prototype pollution", () => {
    const polluted = {
      slots: [
        {
          letra: "A",
          titulo: "Ok",
          filas: ["Uno"],
          __proto__: { admin: true },
          hora: "99:99",
          extra: "drop",
        },
        { letra: "A", titulo: "Más nuevo", filas: ["Dos"], updatedAt: 9 },
        { letra: "Q", titulo: "Basura", filas: ["X"] },
      ],
    };
    const bank = normalizeBank(polluted, 10);
    assert.equal(bank.length, 1);
    assert.equal(bank[0]!.letra, "A");
    assert.equal(bank[0]!.titulo, "Más nuevo");
    assert.equal(bank[0]!.hora, null);
    assert.equal(Object.prototype.hasOwnProperty.call(bank[0]!, "extra"), false);
  });

  it("recorta a 12 filas y ignora vacías", () => {
    const slotBuilt = buildSecuenciaSlot({
      letra: "C",
      titulo: "Lote",
      filas: ["", ...Array.from({ length: 15 }, (_, i) => `U${i + 1}`)],
    });
    assert.ok(slotBuilt);
    assert.equal(slotBuilt!.filas.length, 12);
    assert.equal(slotBuilt!.filas[0], "U1");
  });

  it("migra snapshots viejos con subs de conquista a filas", () => {
    const bank = normalizeBank([
      {
        letra: "D",
        titulo: "Viejo",
        subs: [{ titulo: "Corte", cantidadObjetivo: 9 }],
      },
    ]);
    assert.equal(bank[0]!.filas[0], "Corte");
  });
});

describe("secuenciaAnclada — anclar / recordar", () => {
  it("no sobrescribe un slot ocupado sin overwrite", () => {
    const current = [slot({ letra: "A", titulo: "Viejo" })];
    const blocked = upsertSecuenciaAnclada(current, {
      letra: "A",
      titulo: "Nuevo",
      filas: ["Otra"],
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error, "slot_ocupado");

    const replaced = upsertSecuenciaAnclada(
      current,
      {
        letra: "A",
        titulo: "Nuevo",
        filas: ["Otra"],
        modo: "desglose",
      },
      { overwrite: true, now: 50 }
    );
    assert.equal(replaced.ok, true);
    if (replaced.ok) {
      assert.equal(replaced.slot.titulo, "Nuevo");
      assert.equal(replaced.slot.modo, "desglose");
      assert.equal(replaced.slot.ancladaAt, 1);
      assert.equal(replaced.slot.updatedAt, 50);
    }
  });

  it("recall no muta el banco y nextFreeLetter salta ocupadas", () => {
    const slots = [slot({ letra: "A" }), slot({ letra: "C", titulo: "Corta" })];
    const recalled = recallSecuencia(slots, "c");
    assert.equal(recalled?.titulo, "Corta");
    assert.equal(recallSecuencia(slots, "B"), null);
    assert.equal(nextFreeLetter(slots), "B");
    const afterDelete = deleteSecuenciaAnclada(slots, "A");
    assert.equal(afterDelete.map(s => s.letra).join(""), "C");
    assert.equal(slots.length, 2);
  });
});

describe("secuenciaAnclada — horario y auto-fill", () => {
  it("marca due dentro de ±30 min Lima y respeta diasActivos", () => {
    const now = Date.UTC(2026, 7, 13, 13, 10, 0);
    const due = slot({ letra: "A", hora: "08:00", diasActivos: [] });
    assert.equal(isSecuenciaDue(due, now), true);
    const far = slot({ letra: "B", hora: "18:00", diasActivos: [] });
    assert.equal(isSecuenciaDue(far, now), false);
    const wrongDay = slot({ letra: "C", hora: "08:00", diasActivos: [1] });
    assert.equal(isSecuenciaDue(wrongDay, now), false);
    const thursday = slot({ letra: "D", hora: "08:00", diasActivos: [4] });
    assert.equal(isSecuenciaDue(thursday, now), true);
    assert.equal(suggestDueLetter([far, due], now), "A");
  });

  it("auto-fill solo si el borrador situacional está vacío", () => {
    assert.equal(isEmptySituacionDraft("", [""]), true);
    assert.equal(isEmptySituacionDraft("Enfoque", [""]), false);
    assert.equal(isEmptySituacionDraft("", ["Responder"]), false);
    assert.equal(shouldAutoFillDue(true, "A"), true);
    assert.equal(shouldAutoFillDue(false, "A"), false);
    assert.equal(shouldAutoFillDue(true, null), false);
  });
});

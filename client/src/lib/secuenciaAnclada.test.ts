import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSecuenciaSlot,
  deleteSecuenciaAnclada,
  detectLetterTrigger,
  isEmptyConquistaDraft,
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

function slot(partial: Partial<SecuenciaAnclada> & { letra: SecuenciaAnclada["letra"] }): SecuenciaAnclada {
  return {
    titulo: "Armado de bolsillo",
    subs: [{ titulo: "Corte", cantidadObjetivo: 9, tiempoRecordMinPerUnit: 1.2 }],
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

  it("rechaza secuencia sin subs válidos o letra falsa", () => {
    assert.equal(
      buildSecuenciaSlot({
        letra: "A",
        titulo: "X",
        subs: [{ titulo: "", cantidadObjetivo: 1 }],
      }),
      null
    );
    assert.equal(
      buildSecuenciaSlot({
        letra: "Z",
        titulo: "X",
        subs: [{ titulo: "Corte", cantidadObjetivo: 3 }],
      }),
      null
    );
  });

  it("normaliza banco corrupto y bloquea prototype pollution", () => {
    const polluted = {
      slots: [
        {
          letra: "A",
          titulo: "Ok",
          subs: [{ titulo: "Uno", cantidadObjetivo: 2 }],
          __proto__: { admin: true },
          hora: "99:99",
          extra: "drop",
        },
        { letra: "A", titulo: "Más nuevo", subs: [{ titulo: "Dos", cantidadObjetivo: 4 }], updatedAt: 9 },
        { letra: "Q", titulo: "Basura", subs: [{ titulo: "X", cantidadObjetivo: 1 }] },
      ],
    };
    const bank = normalizeBank(polluted, 10);
    assert.equal(bank.length, 1);
    assert.equal(bank[0]!.letra, "A");
    assert.equal(bank[0]!.titulo, "Más nuevo");
    assert.equal(bank[0]!.hora, null);
    assert.equal(Object.prototype.hasOwnProperty.call(bank[0]!, "extra"), false);
  });

  it("recorta a 12 subs y exige cantidad 1–9999", () => {
    const slotBuilt = buildSecuenciaSlot({
      letra: "C",
      titulo: "Lote",
      subs: [
        ...Array.from({ length: 15 }, (_, i) => ({
          titulo: `U${i + 1}`,
          cantidadObjetivo: i === 0 ? 0 : 1,
        })),
        { titulo: "malo", cantidadObjetivo: 10000 },
      ],
    });
    assert.ok(slotBuilt);
    assert.equal(slotBuilt!.subs.length, 12);
    assert.equal(slotBuilt!.subs[0]!.titulo, "U2");
  });
});

describe("secuenciaAnclada — anclar / recordar", () => {
  it("no sobrescribe un slot ocupado sin overwrite", () => {
    const current = [slot({ letra: "A", titulo: "Viejo" })];
    const blocked = upsertSecuenciaAnclada(current, {
      letra: "A",
      titulo: "Nuevo",
      subs: [{ titulo: "Corte", cantidadObjetivo: 3 }],
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error, "slot_ocupado");

    const replaced = upsertSecuenciaAnclada(
      current,
      {
        letra: "A",
        titulo: "Nuevo",
        subs: [{ titulo: "Corte", cantidadObjetivo: 3 }],
      },
      { overwrite: true, now: 50 }
    );
    assert.equal(replaced.ok, true);
    if (replaced.ok) {
      assert.equal(replaced.slot.titulo, "Nuevo");
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
    // 2026-08-13 08:10 Lima = 13:10 UTC
    const now = Date.UTC(2026, 7, 13, 13, 10, 0);
    const due = slot({ letra: "A", hora: "08:00", diasActivos: [] });
    assert.equal(isSecuenciaDue(due, now), true);
    const far = slot({ letra: "B", hora: "18:00", diasActivos: [] });
    assert.equal(isSecuenciaDue(far, now), false);
    // 2026-08-13 Lima es jueves (4)
    const wrongDay = slot({ letra: "C", hora: "08:00", diasActivos: [1] });
    assert.equal(isSecuenciaDue(wrongDay, now), false);
    const thursday = slot({ letra: "D", hora: "08:00", diasActivos: [4] });
    assert.equal(isSecuenciaDue(thursday, now), true);
    assert.equal(suggestDueLetter([far, due], now), "A");
  });

  it("auto-fill solo si el borrador está vacío", () => {
    assert.equal(isEmptyConquistaDraft("", [{ titulo: "", cantidadObjetivo: "" }]), true);
    assert.equal(isEmptyConquistaDraft("Armado", [{ titulo: "", cantidadObjetivo: "" }]), false);
    assert.equal(
      isEmptyConquistaDraft("", [{ titulo: "Corte", cantidadObjetivo: "" }]),
      false
    );
    assert.equal(shouldAutoFillDue(true, "A"), true);
    assert.equal(shouldAutoFillDue(false, "A"), false);
    assert.equal(shouldAutoFillDue(true, null), false);
  });
});

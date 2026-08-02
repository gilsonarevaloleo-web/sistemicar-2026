import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePuertaTimelineVisual } from "./puertaTimelineVisual.ts";

describe("resolvePuertaTimelineVisual", () => {
  it("foco: activo consciente (anillo oro, pulso)", () => {
    const v = resolvePuertaTimelineVisual({
      seg: { estado: "activo", puertaSistema: false },
      entrada: { estado: "contabilizada", contribucionPct: 14.29 },
    });
    assert.equal(v.kind, "foco");
    assert.equal(v.pulse, true);
    assert.match(v.borderColor, /#D4AF37/i);
  });

  it("foco: en ventana de apertura", () => {
    const v = resolvePuertaTimelineVisual({
      seg: { estado: "pendiente" },
      entrada: { estado: "en_ventana", contribucionPct: 0 },
    });
    assert.equal(v.kind, "foco");
    assert.equal(v.pulse, true);
  });

  it("logro: contabilizada con contribución > 0 (pasado, sin pulso)", () => {
    const v = resolvePuertaTimelineVisual({
      seg: { estado: "cerrado_manual" },
      entrada: { estado: "contabilizada", contribucionPct: 14.29 },
    });
    assert.equal(v.kind, "logro");
    assert.equal(v.pulse, false);
    assert.match(v.backgroundColor, /#00C851/i);
  });

  it("fracaso: sistema / entropía / cupo 0", () => {
    assert.equal(
      resolvePuertaTimelineVisual({
        seg: { estado: "activo", puertaSistema: true },
      }).kind,
      "fracaso"
    );
    assert.equal(
      resolvePuertaTimelineVisual({
        seg: { estado: "entropia" },
      }).kind,
      "fracaso"
    );
    assert.equal(
      resolvePuertaTimelineVisual({
        seg: { estado: "pendiente" },
        entrada: { estado: "contabilizada", contribucionPct: 0 },
      }).kind,
      "fracaso"
    );
  });

  it("pendiente: futuro sin contabilizar", () => {
    const v = resolvePuertaTimelineVisual({
      seg: { estado: "pendiente" },
      entrada: { estado: "pendiente", contribucionPct: 0 },
    });
    assert.equal(v.kind, "pendiente");
    assert.equal(v.pulse, false);
  });
});

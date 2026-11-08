import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OWNER_EMAIL } from "./moduleAccess.ts";
import { etiquetaSaldoCreditos, SALDO_ILIMITADO } from "./ownerCredits.ts";

describe("ownerCredits — etiqueta de saldo", () => {
  it("el dueño ve Ilimitado aunque el ledger esté en 0", () => {
    assert.equal(
      etiquetaSaldoCreditos(0, { email: OWNER_EMAIL }),
      "Ilimitado",
    );
    assert.equal(
      etiquetaSaldoCreditos(0, { ilimitado: true }),
      "Ilimitado",
    );
    assert.equal(etiquetaSaldoCreditos(SALDO_ILIMITADO, {}), `${SALDO_ILIMITADO} créditos`);
    assert.equal(etiquetaSaldoCreditos(1, { email: "otro@gmail.com" }), "1 crédito");
    assert.equal(etiquetaSaldoCreditos(null, {}), "…");
  });
});

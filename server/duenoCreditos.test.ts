import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OWNER_EMAIL } from "../shared/moduleAccess.ts";
import { SALDO_ILIMITADO } from "../shared/ownerCredits.ts";
import { createMemoryJuezWallet } from "./services/juezCreditos.ts";
import {
  cobroCreditos,
  consultarSaldoCreditos,
  emailDePeticion,
  esDuenoCreditos,
} from "./services/duenoCreditos.ts";

describe("duenoCreditos — gilsonarevalo.leo@gmail.com ilimitado", () => {
  it("reconoce el correo del dueño y no el de un tercero", async () => {
    assert.equal(await esDuenoCreditos("uid-x", OWNER_EMAIL), true);
    assert.equal(
      await esDuenoCreditos("uid-x", "  GILSONAREVALO.LEO@GMAIL.COM "),
      true,
    );
    assert.equal(await esDuenoCreditos("uid-x", "otro@gmail.com"), false);
    assert.equal(await esDuenoCreditos("uid-x"), false);
  });

  it("lee saldo ilimitado y no toca el ledger", async () => {
    const wallet = createMemoryJuezWallet({ u1: 0 });
    const visto = await consultarSaldoCreditos(wallet, "u1", OWNER_EMAIL);
    assert.equal(visto.ilimitado, true);
    assert.equal(visto.saldo, SALDO_ILIMITADO);
    assert.equal(await wallet.saldo("u1"), 0);
  });

  it("cobra 0 al dueño con ledger en 0", async () => {
    const wallet = createMemoryJuezWallet({ u1: 0 });
    const cobro = await cobroCreditos(wallet, "u1", 1, OWNER_EMAIL);
    assert.equal(cobro.ok, true);
    if (!cobro.ok) return;
    assert.equal(cobro.cobrado, 0);
    assert.equal(cobro.ilimitado, true);
    assert.equal(cobro.saldo, SALDO_ILIMITADO);
    assert.equal(await wallet.saldo("u1"), 0);
  });

  it("sigue cobrando a quien no es dueño", async () => {
    const wallet = createMemoryJuezWallet({ u1: 2 });
    const cobro = await cobroCreditos(wallet, "u1", 1, "otro@gmail.com");
    assert.equal(cobro.ok, true);
    if (!cobro.ok) return;
    assert.equal(cobro.cobrado, 1);
    assert.equal(cobro.ilimitado, false);
    assert.equal(await wallet.saldo("u1"), 1);
  });

  it("extrae el email del body, header o query", () => {
    assert.equal(
      emailDePeticion({ email: OWNER_EMAIL }, null, null),
      OWNER_EMAIL,
    );
    assert.equal(
      emailDePeticion({}, OWNER_EMAIL, null),
      OWNER_EMAIL,
    );
    assert.equal(
      emailDePeticion({}, null, { email: OWNER_EMAIL }),
      OWNER_EMAIL,
    );
  });
});

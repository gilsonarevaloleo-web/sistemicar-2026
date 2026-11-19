import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAccessVerification } from "./accessVerification.ts";

describe("verificación de acceso a módulos", () => {
  it("espera confirmación del servidor antes de denegar datos locales o en caché", () => {
    const verification = createAccessVerification();
    assert.equal(verification.observe("local", false).shouldVerify, false);
    assert.equal(verification.observe("cache", false).shouldVerify, false);
    assert.equal(verification.observe("confirmed", false).shouldVerify, true);
  });

  it("permite el acceso local y acepta la confirmación posterior", () => {
    const verification = createAccessVerification();
    assert.equal(verification.observe("local", true).shouldVerify, true);
    assert.equal(verification.observe("confirmed", true).shouldVerify, true);
  });

  it("ignora el resultado tardío de un claim tras recibir acceso confirmado", async () => {
    const verification = createAccessVerification();
    let finish!: (value: string[]) => void;
    const claim = new Promise<string[]>((resolve) => { finish = resolve; });
    const denied = verification.observe("confirmed", false);
    let redirected = false;
    const pending = claim.then((plans) => {
      if (denied.isCurrent() && plans.length === 0) redirected = true;
    });

    verification.observe("confirmed", true);
    finish([]);
    await pending;
    assert.equal(redirected, false);
  });

  it("una denegación confirmada vigente sí puede redirigir", () => {
    const verification = createAccessVerification();
    const denied = verification.observe("confirmed", false);
    assert.equal(denied.isCurrent(), true);
  });

  it("una emisión local denegada no invalida una comprobación confirmada", () => {
    const verification = createAccessVerification();
    const denied = verification.observe("confirmed", false);
    verification.observe("local", false);
    assert.equal(denied.isCurrent(), true);
  });

  it("descarta respuestas tras desmontar la ruta o cambiar de cuenta", () => {
    const verification = createAccessVerification();
    const pending = verification.observe("confirmed", false);
    verification.dispose();
    assert.equal(pending.isCurrent(), false);
  });
});

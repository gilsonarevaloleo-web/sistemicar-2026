import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluarDepositoVolcado } from "./evaluarVolcado.ts";

const SECO =
  "Hoy a las 9:10 llamé al cliente. Pedí 40 mil. Dijo que no. Anoté el rechazo. El sesgo: yo suelo disculparme. No lo hice. No dije «después veo». Cerré a las 9:14.";

describe("evaluarDepositoVolcado", () => {
  it("falla si el volcado está vacío", async () => {
    const r = await evaluarDepositoVolcado({ gradoUsuarioActual: 1 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.status, 400);
    assert.match(r.error, /vacío/);
  });

  it("promueve perfil G1→G3 en lectura seca", async () => {
    const r = await evaluarDepositoVolcado({
      textoVolcado: SECO,
      gradoUsuarioActual: 1,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.engine.evaluacionGrado.gradoDetectado, 3);
    assert.equal(r.perfilPromovido, true);
    assert.match(r.engine.ojoDominante.codigo, /^C\d+$/);
    assert.equal(r.source, "local_fallback");
  });
});

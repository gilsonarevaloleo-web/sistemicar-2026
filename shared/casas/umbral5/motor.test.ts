import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectarPisoIntento,
  detectarTipoLimite,
  diagnosticarUmbral5Local,
  esQuejaEspejo,
  parseUmbral5Lectura,
  sellarLectura,
} from "./index.ts";

describe("Casa 5 Umbral — motor", () => {
  it("tu caso: ya lo sé, no hice nada → C1", () => {
    const texto =
      "El Juez dijo que mi aumento está débil para poder ser vendedor. La mente arma una coartada. Ya sé cuál es mi límite. No hice nada.";
    assert.equal(detectarPisoIntento(texto), 1);
    const r = diagnosticarUmbral5Local({ limiteConocido: texto });
    assert.equal(r.codigoUsuario, 1);
    assert.equal(r.pisoIntento, 1);
    assert.match(r.lecturaFria, /C1/);
    assert.match(r.porQueNoEjecuta, /saber|Cero acto/i);
  });

  it("baja autoestima no es C1: es queja del Espejo", () => {
    const texto = "Tengo baja autoestima. No valgo. Me da vergüenza.";
    assert.equal(esQuejaEspejo(texto), true);
    assert.notEqual(detectarTipoLimite(texto), "opinion");
    const r = diagnosticarUmbral5Local({ limiteConocido: texto });
    assert.match(r.lecturaFria, /Espejo/);
    assert.doesNotMatch(r.lecturaFria, /asiento es C1/);
    assert.doesNotMatch(r.porQueNoEjecuta, /autoestima/i);
  });

  it("hablé con el alrededor → C2; trabajé y no se mueve → C3", () => {
    assert.equal(
      detectarPisoIntento("Ya sé el límite. Se lo hablé a mi familia buscando solución."),
      2,
    );
    assert.equal(
      diagnosticarUmbral5Local({
        limiteConocido: "Ya sé el límite. Se lo hablé a mi alrededor buscando solución.",
      }).codigoUsuario,
      2,
    );
    assert.equal(
      diagnosticarUmbral5Local({
        limiteConocido: "Trabajé en mi límite yo mismo y no se modifica.",
      }).codigoUsuario,
      3,
    );
  });

  it("opinión / convicción / impronta no sientan C10", () => {
    assert.equal(detectarTipoLimite("Me parece que todavía no es el mes."), "opinion");
    const opinion = diagnosticarUmbral5Local({
      limiteConocido: "Me parece que todavía no es el mes.",
    });
    assert.equal(opinion.codigoUsuario, 5);
    assert.match(opinion.lecturaFria, /C5/);
    assert.doesNotMatch(opinion.lecturaFria, /asiento es C1/);
    const conv = diagnosticarUmbral5Local({
      limiteConocido: "Yo no soy vendedor. Así me paro.",
    });
    assert.equal(conv.tipoLimite, "conviccion");
    assert.equal(conv.codigoUsuario, 7);
    const imp = diagnosticarUmbral5Local({
      limiteConocido: "Está estampado de cuna. Siempre fui así. No se discute.",
    });
    assert.equal(imp.tipoLimite, "impronta");
    assert.notEqual(imp.codigoUsuario, 10);
    assert.ok([1, 2, 3, 5, 6, 7].includes(imp.codigoUsuario));
  });

  it("el parse rechaza C8–C10 y sella impronta sin domicilio 10", () => {
    const bad = parseUmbral5Lectura({
      codigoUsuario: 10,
      pisoIntento: 1,
      tipoLimite: "impronta",
      lecturaFria: "Impronta.",
      porQueNoEjecuta: "Estampada.",
    });
    assert.equal(bad.ok, false);

    const ok = parseUmbral5Lectura({
      codigoUsuario: 7,
      pisoIntento: 1,
      tipoLimite: "impronta",
      lecturaFria: "Impronta. No se habita el 10.",
      porQueNoEjecuta: "Está estampada.",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.result.codigoUsuario, 7);
      assert.equal(ok.result.tipoLimite, "impronta");
    }

    const sealed = sellarLectura({
      codigoUsuario: 7,
      pisoIntento: 1,
      tipoLimite: "impronta",
      lecturaFria: "  x  ",
      porQueNoEjecuta: "  y  ",
    });
    assert.equal(sealed.codigoUsuario, 7);
  });
});

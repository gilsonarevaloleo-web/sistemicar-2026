import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectarCanal,
  detectarPisoIntento,
  detectarTipoLimite,
  diagnosticarUmbral5Local,
  esQuejaEspejo,
  parseUmbral5Lectura,
  sellarLectura,
} from "./index.ts";

describe("Casa 6 Umbral — motor", () => {
  it("C1 es identidad: tiene o no tiene ego, no es cero acto", () => {
    const sinEgo = diagnosticarUmbral5Local({
      limiteConocido:
        "No sé quién soy para cobrar. No tengo identidad. No hay cimiento.",
    });
    assert.equal(sinEgo.codigoLimite, 1);
    assert.equal(sinEgo.polo, "contra");
    assert.equal(sinEgo.codigoUsuario, 1);
    assert.match(sinEgo.lecturaFria, /C1/);
    assert.doesNotMatch(sinEgo.porQueNoEjecuta, /Cero acto/i);

    const conEgo = diagnosticarUmbral5Local({
      limiteConocido: "Sé quién soy. Tengo identidad. Hay cimiento. Me paro como vendedor.",
    });
    assert.equal(conEgo.codigoLimite, 1);
    assert.equal(conEgo.polo, "pro");
  });

  it("«ya lo sé, no hice nada» es intento, no canal C1 por sí solo", () => {
    const texto =
      "El Juez dijo que mi aumento está débil para poder ser vendedor. La mente arma una coartada. Ya sé cuál es mi límite. No hice nada.";
    assert.equal(detectarPisoIntento(texto), 1);
    const r = diagnosticarUmbral5Local({ limiteConocido: texto });
    assert.equal(r.pisoIntento, 1);
    assert.equal(r.codigoLimite, 1);
    assert.match(r.lecturaFria, /Intento: lo sé/);
    assert.equal(r.moduloGimnasio, "limite");
  });

  it("baja autoestima no es C1: es queja del Espejo", () => {
    const texto = "Tengo baja autoestima. No valgo. Me da vergüenza.";
    assert.equal(esQuejaEspejo(texto), true);
    assert.notEqual(detectarTipoLimite(texto), "opinion");
    const r = diagnosticarUmbral5Local({ limiteConocido: texto });
    assert.match(r.lecturaFria, /Espejo/);
    assert.match(r.lecturaFria, /identidad/);
    assert.doesNotMatch(r.porQueNoEjecuta, /autoestima/i);
    assert.equal(r.moduloGimnasio, null);
  });

  it("C2 es miedo a la exposición pública, no «hablé con el alrededor»", () => {
    const miedo = diagnosticarUmbral5Local({
      limiteConocido:
        "Si me ven vendiendo me critican. Miedo a la exposición pública. No salgo a la luz.",
    });
    assert.equal(miedo.codigoLimite, 2);
    assert.equal(miedo.polo, "contra");
    assert.equal(miedo.moduloGimnasio, "limite");

    const sinMiedo = diagnosticarUmbral5Local({
      limiteConocido: "No me importa que me vean. Puedo exponerme. Salgo a la luz.",
    });
    assert.equal(sinMiedo.codigoLimite, 2);
    assert.equal(sinMiedo.polo, "pro");

    assert.equal(
      detectarPisoIntento("Ya sé el límite. Se lo hablé a mi familia buscando solución."),
      2,
    );
    const alrededor = diagnosticarUmbral5Local({
      limiteConocido: "Ya sé el límite. Se lo hablé a mi alrededor buscando solución.",
    });
    assert.equal(alrededor.pisoIntento, 2);
    assert.notEqual(alrededor.codigoLimite, 2);
  });

  it("C6 es el cuerpo que niega, no C1", () => {
    const r = diagnosticarUmbral5Local({
      limiteConocido: "El cuerpo niega. Freeze. Se me traba el cuerpo ante el roce.",
    });
    assert.equal(r.codigoLimite, 6);
    assert.equal(r.polo, "contra");
    assert.equal(detectarCanal("El cuerpo niega. Freeze.").codigoLimite, 6);
  });

  it("C1 pro + C2 contra: el límite es la mirada", () => {
    const r = diagnosticarUmbral5Local({
      limiteConocido:
        "Sé quién soy. Tengo identidad. Hay cimiento. Si me ven vendiendo me critican. Miedo a la exposición pública.",
    });
    assert.equal(r.codigoLimite, 2);
    assert.equal(r.polo, "contra");
  });

  it("intento C3 y tipo convicción no pisan el canal", () => {
    assert.equal(
      diagnosticarUmbral5Local({
        limiteConocido: "Trabajé en mi límite yo mismo y no se modifica.",
      }).pisoIntento,
      3,
    );
    assert.equal(detectarTipoLimite("Me parece que todavía no es el mes."), "opinion");
    const opinion = diagnosticarUmbral5Local({
      limiteConocido: "Me parece que todavía no es el mes.",
    });
    assert.equal(opinion.tipoLimite, "opinion");
    assert.equal(opinion.codigoLimite, 5);
    const conv = diagnosticarUmbral5Local({
      limiteConocido: "Yo no soy vendedor. Así me paro.",
    });
    assert.equal(conv.tipoLimite, "conviccion");
    assert.equal(conv.codigoLimite, 1);
    const imp = diagnosticarUmbral5Local({
      limiteConocido: "Está estampado de cuna. Siempre fui así. No se discute.",
    });
    assert.equal(imp.tipoLimite, "impronta");
    assert.notEqual(imp.codigoUsuario, 10);
  });

  it("el parse nombra C10 y sienta C7", () => {
    const named = parseUmbral5Lectura({
      codigoLimite: 10,
      polo: "contra",
      codigoUsuario: 10,
      pisoIntento: 1,
      tipoLimite: "impronta",
      lecturaFria: "Origen. Se nombra.",
      porQueNoEjecuta: "Extravío.",
    });
    assert.equal(named.ok, true);
    if (named.ok) {
      assert.equal(named.result.codigoLimite, 10);
      assert.equal(named.result.codigoUsuario, 7);
    }

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
      codigoLimite: 7,
      polo: "contra",
      codigoUsuario: 7,
      pisoIntento: 1,
      tipoLimite: "impronta",
      lecturaFria: "  x  ",
      porQueNoEjecuta: "  y  ",
      moduloGimnasio: null,
    });
    assert.equal(sealed.codigoUsuario, 7);
    assert.equal(sealed.codigoLimite, 7);
  });
});

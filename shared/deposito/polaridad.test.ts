import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DICCIONARIO_OJOS } from "./engineConfig.ts";
import {
  BLOQUE_POLARIDAD_INTERNA,
  detectarPoloCarga,
  instruccionContrapeso,
  lecturaFaseEnergia,
} from "./polaridad.ts";

describe("Depósito v2 — polaridad interna (invisible)", () => {
  it("el bloque interno nombra los ejes y prohíbe exponerlos", () => {
    assert.match(BLOQUE_POLARIDAD_INTERNA, /Eje Masculino/);
    assert.match(BLOQUE_POLARIDAD_INTERNA, /Eje Femenino/);
    assert.match(BLOQUE_POLARIDAD_INTERNA, /M\+ \(Positivo\)/);
    assert.match(BLOQUE_POLARIDAD_INTERNA, /F- \(Negativo\)/);
    assert.match(BLOQUE_POLARIDAD_INTERNA, /contrapeso|BALANCE AUTOMÁTICO/);
    assert.match(BLOQUE_POLARIDAD_INTERNA, /PROHIBIDO volcar polo/);
    assert.match(BLOQUE_POLARIDAD_INTERNA, /LECTURA DE FASE/);
  });

  it("F- (rumiación / victimización) pide vector M+", () => {
    assert.equal(
      detectarPoloCarga(
        "Me condicionaron y no pude arrancar. Después veo. Siempre me pasa. Me pesa.",
      ),
      "F-",
    );
    const m = instruccionContrapeso("F-", 1, DICCIONARIO_OJOS[1]);
    assert.ok(m);
    assert.match(m, /hora|vehículo|corte|freno/i);
    assert.doesNotMatch(m, /masculin|femenin|M\+|F-|género|genero/i);
  });

  it("M- (choque / rigidez) pide contención F+", () => {
    assert.equal(
      detectarPoloCarga(
        "Forcé la puerta, grité el precio y me choqué con el rechazo. Impuse fuerza bruta.",
      ),
      "M-",
    );
    const f = instruccionContrapeso("M-", 6, DICCIONARIO_OJOS[6]);
    assert.ok(f);
    assert.match(f, /ritmo|secuencia|impulso|observ/i);
    assert.doesNotMatch(f, /masculin|femenin|M\+|F-/);
  });

  it("la lectura de fase no juzga", () => {
    const fase = lecturaFaseEnergia(7, DICCIONARIO_OJOS[7], "F-", "precio");
    assert.match(fase, /Fase actual/);
    assert.doesNotMatch(fase, /deberías|regañ|culpa moral/i);
  });
});

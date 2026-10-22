import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASA_UMBRAL5_AXIOMAS,
  CASA_UMBRAL5_FIRMA,
  CASA_UMBRAL5_MARCA,
  CASA_UMBRAL5_NOMBRE,
  CASA_UMBRAL5_RITUAL,
  CASA_UMBRAL5_SYSTEM_PROMPT,
  CASA_UMBRAL5_VERSION,
  PROMPT_UMBRAL5,
  buildUmbral5Prompt,
  buildUmbral5SystemPrompt,
  buildUmbral5UserPrompt,
} from "./index.ts";

describe("Casa 5 Umbral — prompt", () => {
  it("fija identidad, ritual y axiomas", () => {
    assert.equal(CASA_UMBRAL5_VERSION, "1.0.0-umbral-casa5");
    assert.equal(CASA_UMBRAL5_NOMBRE, "La Casa 5: Umbral");
    assert.equal(CASA_UMBRAL5_MARCA, "Umbral");
    assert.match(CASA_UMBRAL5_FIRMA, /Sabés qué hacer/);
    assert.equal(CASA_UMBRAL5_RITUAL, "¿Cuál es tu límite?");
    assert.equal(CASA_UMBRAL5_AXIOMAS.length, 4);
  });

  it("el sistema prohíbe queja, C8–C10 al usuario y asiento 4", () => {
    const system = buildUmbral5SystemPrompt();
    assert.equal(system, CASA_UMBRAL5_SYSTEM_PROMPT);
    assert.equal(PROMPT_UMBRAL5, CASA_UMBRAL5_SYSTEM_PROMPT);
    assert.match(system, /EL LÍMITE YA ESTÁ NOMBRADO/);
    assert.match(system, /C8–C10 SON DOMINIO NUESTRO/);
    assert.match(system, /codigoUsuario NUNCA es 4/);
    assert.match(system, /Baja autoestima/);
    assert.match(system, /impronta/);
    assert.doesNotMatch(system, /te acompaño/);
  });

  it("el user prompt mete el límite y sella el dominio", () => {
    const user = buildUmbral5UserPrompt({
      limiteConocido: "El Juez dijo que el aumento está débil. Ya lo sé. No hice nada.",
    });
    assert.match(user, /aumento está débil/);
    assert.match(user, /No le asignes C8, C9 ni C10/);
    assert.equal(
      buildUmbral5Prompt({
        limiteConocido: "El Juez dijo que el aumento está débil. Ya lo sé. No hice nada.",
      }),
      `${systemWrap()}${user}`,
    );
  });
});

function systemWrap(): string {
  return `${buildUmbral5SystemPrompt()}\n\n`;
}

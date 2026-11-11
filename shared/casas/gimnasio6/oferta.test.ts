import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esQuejaEspejo } from "../umbral5/motor.ts";
import { detectarModuloGimnasio, mensajeOferta } from "./oferta.ts";

describe("Gimnasio 6 — oferta desde el límite", () => {
  it("el volcado de vendedor abre el módulo social-producto", () => {
    const texto =
      "El Juez dijo que mi aumento está débil para poder ser vendedor. Ya sé cuál es mi límite. No hice nada.";
    assert.equal(detectarModuloGimnasio(texto), "social_producto");
    assert.match(mensajeOferta("social_producto"), /exposición/i);
  });

  it("la queja del Espejo no se ofrece aunque diga vergüenza", () => {
    const texto = "Tengo baja autoestima. No valgo. Me da vergüenza.";
    assert.equal(esQuejaEspejo(texto), true);
  });

  it("un límite sin producto ni exposición no abre este módulo", () => {
    assert.equal(
      detectarModuloGimnasio("Me parece que todavía no es el mes."),
      null,
    );
    assert.match(mensajeOferta(null), /Otros módulos/);
  });
});

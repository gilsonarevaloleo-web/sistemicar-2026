import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esQuejaEspejo } from "../umbral5/motor.ts";
import { detectarModuloGimnasio, mensajeOferta } from "./oferta.ts";

describe("Gimnasio 6 — oferta desde el límite", () => {
  it("cualquier volcado de límite abre la puerta A, no exige producto", () => {
    const texto =
      "El Juez dijo que mi aumento está débil para poder ser vendedor. Ya sé cuál es mi límite. No hice nada.";
    assert.equal(detectarModuloGimnasio(texto), "limite");
    assert.match(mensajeOferta("limite"), /volcado/i);
  });

  it("enamorar también es exposición, no módulo de producto", () => {
    assert.equal(
      detectarModuloGimnasio("Quiero enamorar a una chica y me da miedo que me vean."),
      "limite",
    );
  });

  it("la queja del Espejo no se ofrece aunque diga vergüenza", () => {
    const texto = "Tengo baja autoestima. No valgo. Me da vergüenza.";
    assert.equal(esQuejaEspejo(texto), true);
  });

  it("vacío no abre", () => {
    assert.equal(detectarModuloGimnasio(""), null);
    assert.match(mensajeOferta(null), /peso/i);
  });
});

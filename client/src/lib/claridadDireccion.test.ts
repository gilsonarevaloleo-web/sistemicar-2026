import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDefaultClaridadDireccion,
  normalizeRutasMentales,
  resolveClaridadParaProyecto,
  getOleadaEnCurso,
} from "./claridadDireccion.ts";

describe("claridadDireccion", () => {
  it("buildDefaultClaridadDireccion usa profundidad ligera/media/profunda, no biológico", () => {
    const r = buildDefaultClaridadDireccion({
      tituloProyecto: "Sistemicar",
      etiqueta: "proyecto",
      focoTitulo: "Módulo pagos",
    });
    assert.equal(r.rutas.a.perfil, "ligera");
    assert.equal(r.rutas.b.perfil, "media");
    assert.equal(r.rutas.c.perfil, "profunda");
    assert.match(r.rutas.a.pasos[0].titulo, /claro al entrar|debo cumplir/);
    assert.doesNotMatch(r.rutas.b.pasos[1].titulo, /columna|respiración/i);
  });

  it("etiqueta legado no cambia el lenguaje: todo nido mide la oleada", () => {
    const centro = buildDefaultClaridadDireccion({
      tituloProyecto: "Costura",
      etiqueta: "centro",
      focoTitulo: "Lote marzo",
    });
    const descanso = buildDefaultClaridadDireccion({
      tituloProyecto: "DESCANSO",
      etiqueta: "consciencia",
      focoTitulo: "Primeros 7 días",
    });
    assert.match(centro.rutas.a.pasos[0].titulo, /claro al entrar/);
    assert.match(descanso.rutas.a.pasos[0].titulo, /claro al entrar/);
    assert.match(descanso.rutas.a.pasos[1].titulo, /oleada/);
  });

  it("normalizeRutasMentales migra perfiles legacy", () => {
    const legacy = buildDefaultClaridadDireccion({
      tituloProyecto: "X",
      etiqueta: "proyecto",
    });
    (legacy.rutas.a as { perfil: string }).perfil = "solo_fluido";
    const n = normalizeRutasMentales(legacy);
    assert.equal(n.rutas.a.perfil, "ligera");
  });

  it("resolveClaridadParaProyecto prioriza claridadActiva del proyecto", () => {
    const base = buildDefaultClaridadDireccion({
      tituloProyecto: "P",
      etiqueta: "proyecto",
      focoTitulo: "Oleada A",
    });
    const r = resolveClaridadParaProyecto(
      {
        titulo: "P",
        etiqueta: "proyecto",
        claridadActiva: base,
        oleadaTitulo: "Oleada A",
      },
      [],
      "Bloque mañana"
    );
    assert.ok(r);
    assert.equal(r!.rutaActiva, "a");
  });

  it("getOleadaEnCurso prefiere peldaño no originado solo en segmento", () => {
    const oleada = getOleadaEnCurso([
      {
        titulo: "Seg hoy",
        estado: "en_curso",
        origenSegmento: true,
      },
      {
        titulo: "Producción 10d",
        estado: "en_curso",
        origenSegmento: false,
      },
    ]);
    assert.equal(oleada?.titulo, "Producción 10d");
  });
});

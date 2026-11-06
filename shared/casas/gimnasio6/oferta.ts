/**
 * El motor del límite decide si ofrece el gimnasio.
 * Módulo 1: chasis que no soporta la exposición social ante un producto.
 * Otros módulos: después.
 */

import type { ModuloGimnasio } from "./types.ts";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const MARCAS_SOCIAL_PRODUCTO = [
  /\bvend/,
  /\bventa\b/,
  /\bvendedor/,
  /\bproducto\b/,
  /\boficio\b/,
  /\bcliente/,
  /\bcobr/,
  /\bnegocio\b/,
  /\bemprend/,
  /\bexpon/,
  /\bexposicion\b/,
  /\bverguenza\b/,
  /\bhablarle\b/,
  /\bmostr/,
  /\bridicul/,
  /\bcritica\b/,
  /\bla gente\b/,
  /\bpitch\b/,
  /\boferta\b/,
  /\bservicio\b/,
];

export function detectarModuloGimnasio(limite: string): ModuloGimnasio | null {
  const texto = limite.trim();
  if (!texto) return null;
  const norm = normalizar(texto);
  for (const p of MARCAS_SOCIAL_PRODUCTO) {
    if (p.test(norm)) return "social_producto";
  }
  return null;
}

export function etiquetaModulo(modulo: ModuloGimnasio | null): string {
  if (modulo === "social_producto") {
    return "Exposición social ante un producto";
  }
  return "Sin módulo todavía";
}

export function mensajeOferta(modulo: ModuloGimnasio | null): string {
  if (modulo === "social_producto") {
    return "Este límite es de ejecución: sabés qué hacer y el cuerpo niega la exposición. El gimnasio simula ese espacio.";
  }
  return "Este límite no abre el módulo de exposición social. Otros módulos, después.";
}

/**
 * El motor del límite decide si ofrece el gimnasio.
 * Puerta A (límite): abre por peso, no exige producto.
 * Puerta B (vendedor): producto hermano, no comparte C1.
 */

import type { ModuloGimnasio } from "./types.ts";
import { puertaDeModulo } from "./types.ts";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function detectarModuloGimnasio(limite: string): ModuloGimnasio | null {
  const texto = limite.trim();
  if (!texto) return null;
  const norm = normalizar(texto);
  if (!norm) return null;
  return "limite";
}

export function etiquetaModulo(modulo: ModuloGimnasio | string | null): string {
  const puerta = modulo ? puertaDeModulo(modulo) : null;
  if (puerta === "vendedor") return "Vendedor · Carácter-Código";
  if (puerta === "limite" || modulo === "social_producto") return "Límite · exposición y cimiento";
  return "Sin módulo todavía";
}

export function mensajeOferta(modulo: ModuloGimnasio | string | null): string {
  const puerta = modulo ? puertaDeModulo(modulo) : null;
  if (modulo === "social_producto" || puerta === "limite") {
    return "Este límite es de ejecución: sabés qué hacer y el cuerpo niega. El gimnasio simula ese espacio. La escena sale del volcado: venta, enamorar, público o familia.";
  }
  if (puerta === "vendedor") {
    return "Puerta B: el vendedor camina C1–C10 del Oficio. No se califica el pitch. C1 es el Cortador, no el cimiento.";
  }
  return "Este límite todavía no abre la puerta A. Seguí volcando hasta que haya peso.";
}

export function mensajeOfertaVendedor(): string {
  return "Puerta B · Vendedor. Mismo gimnasio, otro libro. Carácter-Código, dos resistencias. No se califica el pitch.";
}

/**
 * Texto de anclaje de la oferta — sin imports del motor,
 * para que engineConfig pueda inyectarlo sin ciclo.
 */

function colapsar(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

export function anclarTextoAOferta(texto: string, nombre: string): string {
  const n = colapsar(nombre);
  if (!n) return texto;
  return String(texto ?? "")
    .replace(/\besto\b/gi, n)
    .replace(/\bproducto\b/gi, n);
}

export function bloquePromptOferta(input: {
  nombre: string;
  fraseUtilidad?: string;
}): string {
  const nom = colapsar(input.nombre);
  if (!nom) return "";
  const frase = colapsar(input.fraseUtilidad ?? "");
  return [
    "OFERTA EN JUICIO (La Arena):",
    `Nombre: «${nom}»`,
    frase ? `Frase de utilidad (C1): «${frase}»` : "",
    "REGLA: el cliente objeta ESTA oferta, no un producto genérico.",
    `Si el vendedor no ancla el nombre o habla de «esto» sin sostener «${nom}», rechaza.`,
    "Cada código sella o no sella ESTA oferta. Un pitch que serviría para cualquier cosa no cruza.",
  ]
    .filter(Boolean)
    .join("\n");
}

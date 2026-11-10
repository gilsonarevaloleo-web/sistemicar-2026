/**
 * Identidad de La Casa 5: Oficio.
 * Círculo cerrado de 10 códigos. No se mezcla con el Umbral (casa 6).
 * Matriz propia: C5 aquí es Cálculo, no Decisión (eso es el Juez).
 */

import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  type CodigoNumero,
} from "./engineConfig.ts";

export const CASA_OFICIO_VERSION = "1.1.0-oficio-saber" as const;
export const CASA_OFICIO_NOMBRE = "La Casa 5: Oficio";
export const CASA_OFICIO_MARCA = "Oficio";
export const CASA_OFICIO_FIRMA =
  "La valía que no se cobra se evapora. El día cerrado no es cuenta.";
/** Marca corta, familia del Juez («¿Cuál es tu problema?») y del 6 («¿Cuál es tu límite?»). */
export const CASA_OFICIO_RITUAL_CORTO = "¿Cuánto sabes sobre tu oficio?";
/** Ritual de lienzo. */
export const CASA_OFICIO_RITUAL =
  "¿Cuánto sabes sobre tu oficio — qué responsabilidad, deber o cuenta dominas, y qué se te evapora sin número?";

export const CASA_OFICIO_PLACEHOLDER =
  "Lo que sabes de tu responsabilidad, deber u oficio. Qué entregas. Qué no tiene cuenta. Un hecho. Sin pitch. Sin límite. Sin queja.";

export const CASA_OFICIO_RECURSO =
  "Cálculo, métrica, casuística, cobro, cuenta.";
export const CASA_OFICIO_PROHIBIDO =
  "Gimnasio, límite, mancha, aula, cierre del día.";
export const CASA_OFICIO_PERIMETRO =
  "Oficio no es límite. C5 Oficio es Cálculo, no Decisión. El 6 no enseña a vender ni a cobrar.";

/** Producto del maestro de Oficio: práctica de venta de 10 códigos. Capa profunda, no la puerta. */
export const OFICIO_PRODUCTO_VENTAS = "Maestro en ventas";
export const OFICIO_PRODUCTO_VENTAS_CAPA =
  "Capa profunda del Oficio. Práctica de venta con cada código de la matriz.";

export interface FichaMatrizOficio {
  numero: CodigoNumero;
  marca: string;
  acto: string;
}

/** Matriz del planeta 5. El número no es pasaporte: C5 aquí no es el C5 del Juez. */
export const MATRIZ_OFICIO: readonly FichaMatrizOficio[] = [
  { numero: 1, marca: "Claridad", acto: "Utilidad puntual. Nombrar la excusa." },
  { numero: 2, marca: "Suma", acto: "Apalancar lo que ya hay." },
  { numero: 3, marca: "Tiempo", acto: "Horas con tracción, no ocupación." },
  { numero: 4, marca: "Seriedad", acto: "Cero flor. Ruta mínima y máxima." },
  { numero: 5, marca: "Cálculo", acto: "Números, tasas, casuística. No sensación." },
  { numero: 6, marca: "Roce", acto: "Exposición real. Miedo al rechazo." },
  { numero: 7, marca: "Justicia", acto: "Cobrar. Intercambio. Culpa de precio." },
  { numero: 8, marca: "Persistencia", acto: "Estrategia de desgaste." },
  { numero: 9, marca: "Sistema", acto: "Rutina integrable, no evento." },
  { numero: 10, marca: "Dominio", acto: "Identidad de quien opera el oficio." },
];

export function fichaMatrizOficio(n: CodigoNumero): FichaMatrizOficio {
  return MATRIZ_OFICIO[n - 1];
}

export function nombreCodigoOficio(n: CodigoNumero): string {
  return DICCIONARIO_CODIGOS[n].nombre;
}

export function matrizOficioNumeros(): readonly CodigoNumero[] {
  return CODIGOS_NUMERO;
}

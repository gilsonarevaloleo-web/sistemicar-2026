/**
 * LEY DEL CARÁCTER DEL CÓDIGO — pedagogía oficial del Umbral.
 * Marca corta: Carácter-Código.
 *
 * Hermana de la Ley de Resistencia en Cascada:
 * - Cascada dice QUÉ falla si saltas un código.
 * - Carácter-Código dice CÓMO se enseña a cruzarlo.
 *
 * Autor del ensamble: Gilson Arévalo Pezo (el Maestro) · SISTEMICAR
 * Uso: Umbral (Forja / Arena). No diluir en coaching empático ni en DISC.
 */

export const LEY_CARACTER_CODIGO_NOMBRE = "Ley del Carácter del Código";
export const LEY_CARACTER_CODIGO_MARCA = "Carácter-Código";
export const LEY_CARACTER_CODIGO_FIRMA =
  "El maestro no se adapta al tipo del alumno. Se vuelve la voz del obstáculo.";

export const LEY_CARACTER_CODIGO_AXIOMAS = [
  {
    id: "caracter",
    titulo: "El código tiene carácter",
    texto:
      "Cada puerta habla su idioma. El alumno habita esa voz. No se le diagnostica el eneatipo ni el DISC.",
  },
  {
    id: "dos-resistencias",
    titulo: "Toda puerta tiene dos resistencias",
    texto:
      "R1 es el obstáculo del código (excusa / objeción). R2 es el colapso del operador cuando R1 le pega.",
  },
  {
    id: "empatia-de-codigo",
    titulo: "Empatía de código, no de persona",
    texto:
      "El alumno se siente visto cuando le devuelves SU crack en el idioma de ESA puerta. No cuando lo consuelas.",
  },
  {
    id: "ni-hielo-ni-consuelo",
    titulo: "Ni hielo ni consuelo",
    texto:
      "El rechazo no es un fallo: es el código todavía hablando. Un solo corte. Mismo código. Hoy.",
  },
  {
    id: "no-se-salta",
    titulo: "No se salta",
    texto:
      "Se aprueba solo si toca el criterio y sostiene R2. El cruce se sostiene hasta terminar los diez.",
  },
] as const;

export const LEY_CARACTER_CODIGO_NO_ES = [
  "No es coaching empático.",
  "No es DISC ni estilo de comprador.",
  "No es un manual de objeción-respuesta.",
  "No es New Age ni ánimo.",
] as const;

/** Bloque corto para el prompt del Maestro. No pegar el canon entero. */
export const LEY_CARACTER_CODIGO_KERNEL = `
LEY DEL UMBRAL: ${LEY_CARACTER_CODIGO_NOMBRE} (${LEY_CARACTER_CODIGO_MARCA}).
${LEY_CARACTER_CODIGO_FIRMA}
R1 = obstáculo del código. R2 = colapso del operador al chocarlo.
Hablas el idioma de la ficha activa. Ni hielo ni consuelo. No saltes de código.
`.trim();

/**
 * Texto canónico — la ley escrita.
 * Para UI, editorial y archivo. No inyectar entero en cada evaluación.
 */
export const LEY_CARACTER_CODIGO_CANON = `
╔══════════════════════════════════════════════════════════════════════╗
║     LEY DEL CARÁCTER DEL CÓDIGO — PEDAGOGÍA DEL UMBRAL             ║
║     Marca: Carácter-Código · SISTEMICAR                            ║
╚══════════════════════════════════════════════════════════════════════╝

FIRMA:
${LEY_CARACTER_CODIGO_FIRMA}

═══ EL PRINCIPIO ═══

El Umbral no es un quiz de ventas ni un espejo clínico.
Es una secuencia de diez puertas. Cada puerta tiene carácter.
El Maestro no se pone en el lugar del alumno (eso es coaching).
El Maestro no se pone en el lugar del tipo psicológico del cliente (eso es DISC).
El Maestro SE VUELVE la voz del código activo.

El alumno cruza cuando habita ese carácter el tiempo suficiente
para que la segunda resistencia deje de mandar.

═══ LAS DOS RESISTENCIAS ═══

R1 — Primera resistencia: el obstáculo del código.
     En La Forja es la excusa interna. En La Arena es la objeción del cliente.
     El analizador frío solo juzgaba esto. Por eso el alumno se trababa.

R2 — Segunda resistencia: lo que el operador hace cuando R1 le pega.
     Listas, flor, chase, descuento, huida, pose, ensayo infinito.
     Esto es lo que el Maestro enseña. Sin R2 no hay cruce, solo veredicto.

═══ LOS CINCO AXIOMAS ═══

1. EL CÓDIGO TIENE CARÁCTER.
   El alumno entra a la máscara de la puerta. No se le etiqueta a él.

2. TODA PUERTA TIENE DOS RESISTENCIAS.
   Nombrar R1 sin enseñar R2 es abandonar. Enseñar R2 sin criterio es consuelo.

3. EMPATÍA DE CÓDIGO, NO DE PERSONA.
   Se nombra el crack en el idioma de ESA puerta.
   «Yo te entiendo» está prohibido. «Esta es la frase con la que te desviaste» no.

4. NI HIELO NI CONSUELO.
   El hielo congela. El consuelo diluye. El Maestro sostiene.
   Rechazo = el código todavía habla. Un corte. Hoy. Mismo código.

5. NO SE SALTA.
   La Ley de Resistencia en Cascada ya dictó qué falla si escalas sin drenar.
   Esta ley dicta cómo se enseña el drenaje: habitando el carácter hasta el cruce.
   Los diez se terminan. El módulo no es un menú.

═══ LO QUE ESTA LEY NO ES ═══

No es coaching empático.
No es DISC ni estilo de comprador.
No es un manual de objeción-respuesta.
No es New Age ni ánimo.

Si alguien la archiva en esas cajas, la ley se diluyó. Recupera la firma.

═══ RELACIÓN CON LAS HERMANAS ═══

Cascada (Doctor / editorial): QUÉ falla si saltas el código N.
Carácter-Código (Umbral / Maestro): CÓMO se enseña a cruzar el código N.
Óptica-Código (Depósito): CON QUÉ se ve el mismo hecho.

Las tres leyes no compiten. Arquitectura, pedagogía y óptica.

═══ PROMESA AL OPERADOR ═══

No te prometo que dejes de tener objeciones.
Te prometo que, al habitar el carácter de esta puerta,
vas a sostener la segunda resistencia — y por eso vas a terminar los diez.
`.trim();

export function resumenLeyCaracterCodigo(): string {
  return `${LEY_CARACTER_CODIGO_NOMBRE} · ${LEY_CARACTER_CODIGO_MARCA}. ${LEY_CARACTER_CODIGO_FIRMA}`;
}

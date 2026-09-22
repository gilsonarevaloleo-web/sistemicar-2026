/**
 * LEY DEL FRENO — pedagogía oficial de la Jornada.
 * Marca corta: Freno-Vehículo.
 *
 * Hermana operativa de las leyes de SISTEMICAR:
 * - Cascada dice QUÉ falla si saltas un código.
 * - Carácter-Código dice CÓMO se enseña a cruzarlo.
 * - Óptica-Código dice CON QUÉ se ve el mismo hecho.
 * - Freno-Vehículo dice POR QUÉ se nombra antes de ejecutar.
 *
 * Autor del ensamble: Gilson Arévalo Pezo (el Maestro) · SISTEMICAR
 * Uso: Jornada / La Flota (lanzar Conquista o Enfoque).
 * No diluir en productividad, GTD ni “perder tiempo”.
 */

export const LEY_FRENO_VEHICULO_NOMBRE = "Ley del Freno";
export const LEY_FRENO_VEHICULO_MARCA = "Freno-Vehículo";
export const LEY_FRENO_VEHICULO_FIRMA =
  "Ir de frente es reactividad. Nombrar el vehículo instala el programa.";

/** Unidad de entrada de la Jornada: no se ejecuta crudo; se lanza con nombre. */
export const LEY_FRENO_VEHICULO_UNIDAD = "lanzamiento nombrado";

/** Ritual que enciende el instrumento. Copia canónica del clip GPS umbral. */
export const LEY_FRENO_VEHICULO_RITUAL = "Antes de moverse: póngale nombre.";

export const LEY_FRENO_VEHICULO_OBJECION = {
  q: "¿Por qué debo apuntar o abrir vehículos perdiendo tiempo si hacerlo de frente es más rápido y fácil?",
  a: "De frente es el automatismo donde nacen las emociones automáticas. Lanzar es el freno de esa reactividad: instala un programa antiemociones desordenadas y el hábito de planificar antes de ejecutar. La pereza es ausencia de imagen detallada de lo que se va a hacer. Nombrar el desglosador y las unidades escribe esa imagen.",
} as const;

export const LEY_FRENO_VEHICULO_AXIOMAS = [
  {
    id: "freno",
    titulo: "El freno",
    texto:
      "Lanzar corta el automatismo. En la pausa de nombrar nace la oportunidad del freno de la reactividad emocional — ahí donde, de frente, salen las emociones automáticas.",
  },
  {
    id: "programa",
    titulo: "El programa",
    texto:
      "Lanzar vehículos antes de ejecutar instala un programa antiemociones desordenadas. No es un extra: es el software que el gesto graba.",
  },
  {
    id: "imagen",
    titulo: "La imagen",
    texto:
      "La pereza es ausencia de imagen detallada de lo que se va a hacer. Nombrar el desglosador y las unidades escribe esa imagen en la mente.",
  },
  {
    id: "habito",
    titulo: "El hábito",
    texto:
      "Planificar antes de ejecutar elimina la pereza poco a poco. El gesto repetido — nombre, unidades, lanzar — es el entrenamiento, no un trámite.",
  },
  {
    id: "de-frente",
    titulo: "De frente no es más rápido",
    texto:
      "Saltar el lanzamiento ahorra segundos y deja el tramo en piloto automático. El inconsciente firma ese tramo. El vehículo nombrado no.",
  },
] as const;

export const LEY_FRENO_VEHICULO_NO_ES = [
  "No es burocracia ni perder tiempo.",
  "No es una lista de tareas ni GTD.",
  "No es motivación ni coach.",
  "No es un calendario más rápido.",
] as const;

/** Bloque corto para el Doctor IA en Jornada. No pegar el canon entero. */
export const LEY_FRENO_VEHICULO_KERNEL = `
LEY DE LA JORNADA: ${LEY_FRENO_VEHICULO_NOMBRE} (${LEY_FRENO_VEHICULO_MARCA}).
${LEY_FRENO_VEHICULO_FIRMA}
Ritual: ${LEY_FRENO_VEHICULO_RITUAL}
La pereza es ausencia de imagen detallada. Nombrar el desglosador y las unidades escribe esa imagen. No es burocracia.
`.trim();

/**
 * Texto canónico — la ley escrita.
 * Para UI, editorial y archivo. No inyectar entero en cada evaluación.
 */
export const LEY_FRENO_VEHICULO_CANON = `
╔══════════════════════════════════════════════════════════════════════╗
║     LEY DEL FRENO — PEDAGOGÍA DE LA JORNADA                        ║
║     Marca: Freno-Vehículo · SISTEMICAR                             ║
╚══════════════════════════════════════════════════════════════════════╝

FIRMA:
${LEY_FRENO_VEHICULO_FIRMA}

═══ EL PRINCIPIO ═══

La objeción llega siempre igual:
«¿Por qué apuntar o abrir vehículos perdiendo tiempo
si hacerlo de frente es más rápido y fácil?»

De frente no es velocidad. Es automatismo.
Ahí nacen las emociones automáticas.
Lanzar el vehículo es el freno de esa reactividad.

Lo que el operador hace al lanzar — antes de ejecutar —
es instalar un programa antiemociones desordenadas.

Otro beneficio, a favor de la ejecución:
el hábito de planificar antes de ejecutar.
Ese hábito elimina la pereza poco a poco.

La pereza no es flojera moral.
La pereza es ausencia de imagen detallada de lo que se va a hacer.

═══ EL INSTRUMENTO ═══

Unidad: ${LEY_FRENO_VEHICULO_UNIDAD}.
Ritual: ${LEY_FRENO_VEHICULO_RITUAL}

Al darle nombre al desglosador,
al dar nombre a los vehículos y a las unidades,
eso es lo que se programa en la mente del operador.

El nombre no es etiqueta.
El nombre es el programa.

═══ AXIOMAS ═══

${LEY_FRENO_VEHICULO_AXIOMAS.map((a) => `• ${a.titulo.toUpperCase()} — ${a.texto}`).join("\n")}

═══ QUÉ NO ES ═══

${LEY_FRENO_VEHICULO_NO_ES.join(" ")}

═══ HERMANAS ═══

Resistencia en Cascada · Carácter-Código · Óptica-Código · Freno-Vehículo.
`.trim();

export function resumenLeyFrenoVehiculo(): string {
  return `${LEY_FRENO_VEHICULO_NOMBRE} (${LEY_FRENO_VEHICULO_MARCA}): ${LEY_FRENO_VEHICULO_FIRMA}`;
}

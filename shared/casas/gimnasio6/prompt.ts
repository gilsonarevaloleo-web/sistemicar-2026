/**
 * Prompt del maestro del gimnasio.
 * Propósito: hacerle pasar la sesión completa. No suspender. No dar clase de venta.
 */

import type { LibroGimnasio, PreguntaCanon } from "./types.ts";
import { GIMNASIO6_FIRMA, GIMNASIO6_NOMBRE, GIMNASIO6_VERSION } from "./types.ts";

export const GIMNASIO6_RITUAL_ENTRADA = "¿Cuál es tu límite?";

export const GIMNASIO6_AXIOMAS = [
  {
    id: "entrada",
    titulo: "La entrada es el límite",
    texto:
      "La pregunta de entrada no se cambia. El gimnasio es capa profunda, no otra puerta.",
  },
  {
    id: "friccion",
    titulo: "Sin fricción hay oxidación",
    texto:
      "Si responde y no hay roce, no pasó. El maestro no oxida con un sí fácil.",
  },
  {
    id: "ambiente",
    titulo: "El poder está en la mente",
    texto:
      "El ambiente determina valor hasta que se ve que el poder no está en el entorno. El gimnasio simula el espacio que la vida no deja vivir.",
  },
  {
    id: "maestro",
    titulo: "Hacerle pasar el capítulo",
    texto:
      "Si no pasa, variante de la misma pregunta, con lo que dijo, para enfocar. No oye «fallaste». Oye el mismo cuarto, más cerca.",
  },
  {
    id: "c3",
    titulo: "C3 no es reloj",
    texto:
      "En el planeta 6, C3 es secuencia de esfuerzo. No minutos. No jornada. No oficio de ventas.",
  },
] as const;

export const GIMNASIO6_SYSTEM_PROMPT = `
Sos el maestro del ${GIMNASIO6_NOMBRE} (planeta 6, ${GIMNASIO6_VERSION}).
${GIMNASIO6_FIRMA}

La entrada del usuario fue «${GIMNASIO6_RITUAL_ENTRADA}». Vos no la cambias.
Sos capa profunda: el doctor de «sabe qué hacer y el cuerpo niega».
Este módulo es exposición social ante un producto. El chasis no soporta ser visto.
No sos el maestro de ventas (casa 5). No calificás el pitch. No mandás al Oficio. Vender es el pretexto para no poder irse de la mirada.

═══ AXIOMAS ═══

1. FRICCIÓN CONTRA OXIDACIÓN.
   Si no hay roce, no pasó. Un sí fácil oxida.

2. SIMULADOR.
   Preparás el escenario. Herramientas: imaginación, ambiente, pregunta, fluidez sobre lo que responde.
   Recursos del alumno: experiencia, miedo, familia/contactos, gustos. No inventás su vida.

3. UNA PREGUNTA A LA VEZ.
   Cada subcódigo tiene 3. Nunca las tres de golpe.

4. SI NO PASA.
   Variante de ESA pregunta. Usás lo que dijo. Enfocás. Propósito: hacerle pasar el capítulo.
   Prohibido: «incorrecto», «fallaste», dar clase, saltar, tirar las otras dos.
   Si hay número, nombre, hecho o situación concreta, pasa: true.
   La variante es para niebla, flor y vacío. No para repetir la pregunta a quien ya contestó.

5. C3 ES SECUENCIA, NO RELOJ.
   Semana, segundo y tercer esfuerzo, máximo. Si se va a lista de tareas, volvés al esfuerzo.

6. CAPÍTULO 1 MIDE SEGURIDAD / CONOCIMIENTO.
   Capítulo 2 mide fricción social. No copies «qué sabes del producto para el 10» al 2.
   El 1.4 es valor del propósito cuando las circunstancias no se acomodan.
   No es otra vez la prioridad entre deberes (1.2). No es el imprevisto.

═══ SALIDA ═══

Respondé ÚNICAMENTE un JSON válido. Sin markdown.
{"pasa": true, "motivo": "frase corta"}
`.trim();

export function buildGimnasio6UserPrompt(input: {
  limiteOrigen: string;
  pregunta: PreguntaCanon;
  respuesta: string;
  variante: number;
  historial?: string;
}): string {
  return [
    `Límite de origen: ${input.limiteOrigen.trim() || "(vacío)"}`,
    `Capítulo ${input.pregunta.capitulo} · subcódigo ${input.pregunta.subcodigo} · pregunta ${input.pregunta.indice} · variante ${input.variante}`,
    `Escenario: ${input.pregunta.escenario}`,
    `Pregunta: ${input.pregunta.pregunta}`,
    `Criterio del motor: ${input.pregunta.criterioMotor}`,
    input.historial ? `Turnos previos:\n${input.historial}` : "",
    "---",
    `Respuesta del alumno:\n${input.respuesta.trim() || "(vacío)"}`,
    "---",
    "¿Pasó el roce de ESTA pregunta? JSON {pasa, motivo}.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function serializarPromptGimnasio6(input: {
  limiteOrigen: string;
  pregunta: PreguntaCanon;
  respuesta: string;
  variante: number;
  historial?: string;
}): string {
  return `${GIMNASIO6_SYSTEM_PROMPT}\n\n${buildGimnasio6UserPrompt(input)}`;
}

export function copiarLibro(libro: LibroGimnasio): string {
  const lineas: string[] = [
    `# Libro del gimnasio`,
    `Módulo: exposición social ante un producto`,
    `Límite: ${libro.limiteOrigen.trim()}`,
    `Estado: ${libro.estado}`,
    "",
  ];
  let cap = 0;
  for (const t of libro.turnos) {
    if (t.capitulo !== cap) {
      cap = t.capitulo;
      const nombre =
        cap === 1
          ? "Seguridad en tu producto"
          : cap === 2
            ? "Fricción social"
            : `Capítulo ${cap}`;
      lineas.push(`## Capítulo ${cap} · ${nombre}`, "");
    }
    lineas.push(`### Pregunta ${t.subcodigo}.${t.indice}${t.variante > 0 ? ` · variante ${t.variante}` : ""}`);
    if (t.escenario) lineas.push(t.escenario);
    lineas.push(t.pregunta);
    if (t.respuesta) lineas.push("", t.respuesta);
    lineas.push("");
  }
  return lineas.join("\n").trim() + "\n";
}

export const PROMPT_GIMNASIO6 = GIMNASIO6_SYSTEM_PROMPT;

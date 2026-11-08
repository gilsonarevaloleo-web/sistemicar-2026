/**
 * Preguntas del módulo 1 (exposición social ante un producto).
 * Capítulo 1 cerrado. Capítulo 2 borrador. 3 y 4 no preparados.
 * Cada subcódigo: 3 preguntas. Se entregan de a una.
 */

import type {
  CapituloId,
  LibroGimnasio,
  PasoCapitulo,
  PreguntaCanon,
  PreguntaIndice,
  PunteroGimnasio,
  SubcodigoId,
} from "./types.ts";

export const ETIQUETA_CAPITULO: Record<CapituloId, string> = {
  1: "Seguridad en tu producto",
  2: "Fricción social",
  3: "Tres canales",
  4: "Lo imprevisto",
};

export const ETIQUETA_SUBCODIGO: Record<CapituloId, Record<SubcodigoId, string>> = {
  1: {
    1: "Frente al producto",
    2: "Prioridad",
    3: "Semana",
    4: "Lo no ensayado",
  },
  2: {
    1: "Alguien de tu alrededor",
    2: "Quien no compraría",
    3: "Semana social",
    4: "Lo temido",
  },
  3: {
    1: "Canal uno",
    2: "Canal dos",
    3: "Canal tres",
    4: "Cierre",
  },
  4: {
    1: "El golpe",
    2: "El cuerpo",
    3: "La mirada",
    4: "El 10",
  },
};

export function etiquetaSubcodigo(
  capitulo: CapituloId,
  subcodigo: SubcodigoId,
): string {
  return ETIQUETA_SUBCODIGO[capitulo][subcodigo];
}

export function recorteEscenario(texto: string, max = 52): string {
  const clean = texto.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function ordinalPaso(subcodigo: SubcodigoId, indice: PreguntaIndice): number {
  return (subcodigo - 1) * 3 + indice;
}

export function capituloVisibleDe(
  libro: Pick<LibroGimnasio, "puntero" | "estado" | "capitulosSellados">,
): CapituloId {
  if (libro.estado === "TOPE_DIARIO" || libro.estado === "CAPITULO_SELLADO") {
    const last = libro.capitulosSellados[libro.capitulosSellados.length - 1];
    if (last) return last;
  }
  return libro.puntero.capitulo;
}

export function pasosDelCapitulo(
  capitulo: CapituloId,
  puntero: PunteroGimnasio,
  opts: { sellado?: boolean } = {},
): PasoCapitulo[] {
  const items = CANON.filter((p) => p.capitulo === capitulo);
  const actual = ordinalPaso(puntero.subcodigo, puntero.indice);
  const mismoCapitulo = puntero.capitulo === capitulo;
  return items.map((p) => {
    const ord = ordinalPaso(p.subcodigo, p.indice);
    let estado: PasoCapitulo["estado"];
    if (opts.sellado) {
      estado = "hecho";
    } else if (!mismoCapitulo) {
      estado = puntero.capitulo > capitulo ? "hecho" : "pendiente";
    } else if (ord < actual) {
      estado = "hecho";
    } else if (ord === actual) {
      estado = "actual";
    } else {
      estado = "pendiente";
    }
    return {
      capitulo: p.capitulo,
      subcodigo: p.subcodigo,
      indice: p.indice,
      etiquetaSubcodigo: etiquetaSubcodigo(p.capitulo, p.subcodigo),
      etiquetaCapitulo: ETIQUETA_CAPITULO[p.capitulo],
      estado,
      recorteEscenario: estado === "hecho" ? recorteEscenario(p.escenario) : null,
    };
  });
}

const C1: PreguntaCanon[] = [
  {
    capitulo: 1,
    subcodigo: 1,
    indice: 1,
    escenario:
      "Ahora tienes tu propósito: vender. Estás frente a tu producto.",
    pregunta: "En una escala del 1 al 10, ¿en qué número te posicionas?",
    criterioMotor: "¿Hay una posición 1–10 o se quedó en niebla?",
  },
  {
    capitulo: 1,
    subcodigo: 1,
    indice: 2,
    escenario: "Ahora que te posicionaste. El producto sigue delante.",
    pregunta: "¿Qué conocimiento sobre tu producto te pone en ese nivel?",
    criterioMotor: "¿Hay conocimiento concreto o «más o menos»?",
  },
  {
    capitulo: 1,
    subcodigo: 1,
    indice: 3,
    escenario: "El 10 está en el mismo cuarto.",
    pregunta:
      "¿Qué te imaginas que deberías saber para posicionarte en el nivel 10?",
    criterioMotor: "¿Imaginó el 10 o se fue a flor / vacío?",
  },
  {
    capitulo: 1,
    subcodigo: 2,
    indice: 1,
    escenario:
      "Ahora que sabes sobre tu producto. Entre todos tus deberes personales.",
    pregunta:
      "¿Qué prioridad le das del 1 al 10 al oficio de vender entre todo lo que tienes que hacer?",
    criterioMotor: "¿Hay un número de prioridad o se escondió en los deberes?",
  },
  {
    capitulo: 1,
    subcodigo: 2,
    indice: 2,
    escenario: "Ese número ya te para.",
    pregunta: "¿Qué te hace pensar que es ese número el que te corresponde?",
    criterioMotor: "¿Justificó la prioridad o restó?",
  },
  {
    capitulo: 1,
    subcodigo: 2,
    indice: 3,
    escenario: "Imagina que esa intención llega a 10.",
    pregunta:
      "¿Marcaría una diferencia si tu intención de prioridad de vender llegara a nivel 10, y cómo sería esa situación?",
    criterioMotor: "¿Vio la situación del 10 o se quedó en el confort de los otros deberes?",
  },
  {
    capitulo: 1,
    subcodigo: 3,
    indice: 1,
    escenario:
      "Ahora que tu prioridad es alta. Por circunstancia de vida, vender es tu paga diaria.",
    pregunta: "¿Cómo te planificarías para poder sacar tu semana?",
    criterioMotor: "¿Sintió la secuencia de la semana o se fue a lista de tareas vacía?",
  },
  {
    capitulo: 1,
    subcodigo: 3,
    indice: 2,
    escenario: "La semana ya pesa. No es un golpe.",
    pregunta: "¿Qué nivel le pones a ese esfuerzo?",
    criterioMotor: "¿Nombró el esfuerzo o el calendario?",
  },
  {
    capitulo: 1,
    subcodigo: 3,
    indice: 3,
    escenario: "Todavía hay más peso.",
    pregunta: "¿Cuál sería tu máximo esfuerzo?",
    criterioMotor: "¿Hay máximo o pidió que sea fácil?",
  },
  {
    capitulo: 1,
    subcodigo: 4,
    indice: 1,
    escenario:
      "La semana ya corre. Entra lo que no ensayaste.",
    pregunta: "Del 1 al 10, sin flor, ¿dónde quedas cuando eso ya pasó?",
    criterioMotor: "¿Hay posición sin flor o cubrió con ánimo?",
  },
  {
    capitulo: 1,
    subcodigo: 4,
    indice: 2,
    escenario: "El imprevisto sigue en el cuarto.",
    pregunta: "¿Qué hecho te pone en ese número?",
    criterioMotor: "¿Hay hecho o flor?",
  },
  {
    capitulo: 1,
    subcodigo: 4,
    indice: 3,
    escenario: "El 10, con eso ya ocurrido.",
    pregunta: "¿Cómo sería el 10 cuando eso ya pasó?",
    criterioMotor: "¿Imaginó el 10 del hecho o prometió la próxima vez?",
  },
];

const C2: PreguntaCanon[] = [
  {
    capitulo: 2,
    subcodigo: 1,
    indice: 1,
    escenario:
      "Ahora que se comprobó alta seguridad en tu producto u oficio: vas a elegir una persona de tu alrededor para vendérselo.",
    pregunta: "¿Quién es?",
    criterioMotor: "¿Hay un nombre real o «la gente» / el amigo más fácil sin roce?",
  },
  {
    capitulo: 2,
    subcodigo: 1,
    indice: 2,
    escenario: "Esa persona ya está en el cuarto.",
    pregunta: "¿Qué le pudiera gustar y qué no le gustaría?",
    criterioMotor: "¿El otro es real (gusta / no gusta) o sigue siendo masa?",
  },
  {
    capitulo: 2,
    subcodigo: 1,
    indice: 3,
    escenario: "Ahora estás delante de esa persona, con el producto.",
    pregunta: "¿Cómo harías para convencerlo de que te compre?",
    criterioMotor: "¿Anticipó la exposición o armó un pitch de escritorio sin cuerpo?",
  },
  {
    capitulo: 2,
    subcodigo: 2,
    indice: 1,
    escenario:
      "Ahora, de tus conocidos: una persona que piensas que no le gustaría tu producto o que está lejos de comprártelo.",
    pregunta: "¿Quién sería esta persona?",
    criterioMotor: "¿Hay un nombre más lejos o se escondió («esa persona no es para mí»)?",
  },
  {
    capitulo: 2,
    subcodigo: 2,
    indice: 2,
    escenario: "Insistís. El campo social se calienta.",
    pregunta: "En la insistencia, ¿qué te dice que ya se salió de casillas?",
    criterioMotor: "¿Sintió la fricción o se fue del escenario?",
  },
  {
    capitulo: 2,
    subcodigo: 2,
    indice: 3,
    escenario: "Esa persona ya se salió de casillas. Seguís ahí.",
    pregunta: "¿Cómo consigues voltear ese escenario para terminar vendiéndole?",
    criterioMotor: "¿Se quedó bajo la mirada o se escondió? El pitch no se califica.",
  },
  {
    capitulo: 2,
    subcodigo: 3,
    indice: 1,
    escenario:
      "Ahora no es un encuentro. Esa persona que se salió de casillas la vuelves a ver: trabajo, familia, barrio. Eso es sacar tu semana social.",
    pregunta: "¿Cómo te sostienes en esa exposición más de una vez?",
    criterioMotor: "¿Hay secuencia o «ya no le hablo»?",
  },
  {
    capitulo: 2,
    subcodigo: 3,
    indice: 2,
    escenario: "Ya te vieron insistir.",
    pregunta: "¿Qué nivel de esfuerzo le pones a insistir cuando ya te vieron?",
    criterioMotor: "¿Nombró el esfuerzo social o pidió que se termine?",
  },
  {
    capitulo: 2,
    subcodigo: 3,
    indice: 3,
    escenario: "El cuerpo pide esconderte.",
    pregunta:
      "¿Cuál es tu máximo esfuerzo social — el punto donde el cuerpo pide esconderte y tú sigues ahí?",
    criterioMotor: "¿Hay máximo o confort?",
  },
  {
    capitulo: 2,
    subcodigo: 4,
    indice: 1,
    escenario:
      "En medio de esa insistencia ocurre lo que ya temías.",
    pregunta: "Sin flor: ¿qué hecho queda cuando eso ya pasó?",
    criterioMotor: "¿Hay hecho o cubrió?",
  },
  {
    capitulo: 2,
    subcodigo: 4,
    indice: 2,
    escenario: "El miedo ya está en el cuarto.",
    pregunta: "¿Te quedas en el escenario o lo cubres?",
    criterioMotor: "¿Se quedó o cubrió?",
  },
  {
    capitulo: 2,
    subcodigo: 4,
    indice: 3,
    escenario: "Los tres canales del encuentro siguen abiertos.",
    pregunta: "Sin flor: ¿qué sostienes ahora?",
    criterioMotor: "¿Sello o flor?",
  },
];

const CANON: PreguntaCanon[] = [...C1, ...C2];

export function preguntaCanon(
  capitulo: CapituloId,
  subcodigo: SubcodigoId,
  indice: PreguntaIndice,
): PreguntaCanon | null {
  return (
    CANON.find(
      (p) =>
        p.capitulo === capitulo &&
        p.subcodigo === subcodigo &&
        p.indice === indice,
    ) ?? null
  );
}

export function capituloPreparable(capitulo: CapituloId): boolean {
  return capitulo === 1 || capitulo === 2;
}

export function siguientePuntero(
  capitulo: CapituloId,
  subcodigo: SubcodigoId,
  indice: PreguntaIndice,
): { capitulo: CapituloId; subcodigo: SubcodigoId; indice: PreguntaIndice } | "sellar" {
  if (indice < 3) {
    return { capitulo, subcodigo, indice: (indice + 1) as PreguntaIndice };
  }
  if (subcodigo < 4) {
    return { capitulo, subcodigo: (subcodigo + 1) as SubcodigoId, indice: 1 };
  }
  return "sellar";
}

export const CANON_GIMNASIO = CANON;

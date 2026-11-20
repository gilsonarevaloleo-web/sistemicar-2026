/**
 * Preguntas del módulo 1 (exposición social ante un producto).
 * Capítulo 1 y 2: 12 preguntas cada uno (4 subcódigos × 3).
 * C3 y C4 se escriben después. No se inventan C1–C10 de a tres tiempos.
 * Se entregan de a una. No se sella el capítulo en la primera.
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
    4: "El propósito",
  },
  2: {
    1: "Alguien de tu alrededor",
    2: "Quien no compraría",
    3: "El aliado",
    4: "Lo inesperado",
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

/** Nombre corto de la persona a partir de la respuesta libre (primera frase, máx. 40). */
export function nombreCorto(respuesta: string): string {
  const t = respuesta.trim().split(/[\n.,;]/)[0]?.trim() ?? "";
  return t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t;
}

/** Sustituye {critico} por el nombre que dio el usuario, o «esa persona» si aún no hay. */
export function personalizar(texto: string, critico?: string): string {
  if (!texto.includes("{critico}")) return texto;
  const nombre = nombreCorto(critico ?? "") || "esa persona";
  return texto
    .replaceAll("{critico}", nombre)
    .replace(/(^|[.!?¿¡]\s+)([a-záéíóúñ])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
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
  opts: { sellado?: boolean; critico?: string } = {},
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
      recorteEscenario: estado === "hecho" ? recorteEscenario(personalizar(p.escenario, opts.critico)) : null,
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
    escenario: "Ahora se sabe el esfuerzo de llevar adelante tu propósito.",
    pregunta:
      "¿Qué pasaría si, a pesar de ese esfuerzo, las circunstancias no se acomodan para conseguir lo que quieres? ¿Te detendrías o seguirías, y por qué?",
    criterioMotor: "¿Hay tajo (me detengo / sigo) y un porqué concreto, o slogan de persistencia?",
  },
  {
    capitulo: 1,
    subcodigo: 4,
    indice: 2,
    escenario:
      "Esa persistencia, a pesar de la adversidad, ya está en el cuarto.",
    pregunta:
      "En una escala del 1 al 10, ¿qué nivel de valor le das a este propósito entre todos los que tienes, y por qué te corresponde ese número?",
    criterioMotor: "¿Hay 1–10 y un porqué de valor, o otra vez la prioridad entre deberes?",
  },
  {
    capitulo: 1,
    subcodigo: 4,
    indice: 3,
    escenario:
      "Imagina que ese propósito se alinea con tus valores más altos: nivel 10.",
    pregunta: "¿Qué escena de tu vida cambiaría si eso ya fuera así?",
    criterioMotor: "¿Hay escena concreta o flor / «todo va a estar bien»?",
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
      "Ahora, entre tus conocidos, eliges a una persona que no te compraría.",
    pregunta: "¿Quién es esta persona?",
    criterioMotor: "¿Hay un nombre real y lejano o se escondió («esa persona no es para mí»)?",
  },
  {
    capitulo: 2,
    subcodigo: 2,
    indice: 2,
    escenario:
      "{critico} te mira desde arriba. Lo conversan y termina diciéndote que eres tonto.",
    pregunta:
      "¿Por qué {critico} dice que eres tonto, y qué haces o dices tú para cambiar esa creencia sobre ti?",
    criterioMotor: "¿Sintió el golpe y actuó desde su identidad o se fue del escenario?",
  },
  {
    capitulo: 2,
    subcodigo: 2,
    indice: 3,
    escenario:
      "Le expusiste a {critico} por qué no debe verte inferior y estaba a punto de creerte. Entonces llega otra persona que también te ve inferior y, con total convicción, derrumba tu argumento a punta de preguntas.",
    pregunta: "¿Quién es esta persona y qué haces tú para ganar este debate?",
    criterioMotor: "¿Se sostuvo bajo las preguntas o se escondió? El argumento no se califica.",
  },
  {
    capitulo: 2,
    subcodigo: 3,
    indice: 1,
    escenario:
      "Superar la fricción social se hace en pasos, y no tienes que darlos solo. Hay alguien de tus conocidos que podría acompañarte en el primero.",
    pregunta: "¿A quién de tus conocidos elegirías como aliado? Dime su nombre. ¿Y cuál sería ese primer paso de fricción?",
    criterioMotor: "¿Eligió a una persona y un paso concreto? El nombre activa el cuerpo, no se exige: sin nombre pasa igual.",
  },
  {
    capitulo: 2,
    subcodigo: 3,
    indice: 2,
    escenario: "Con tu aliado a tu lado, el paso crece: ahora toca abordar a un grupo.",
    pregunta:
      "¿Quiénes serían esas 3 personas? Nómbralas una por una. ¿Y cómo se organizan con tu aliado para prepararse?",
    criterioMotor: "¿Hay un reparto de roles o un plan vago? Los nombres activan el cuerpo, no se exigen.",
  },
  {
    capitulo: 2,
    subcodigo: 3,
    indice: 3,
    escenario:
      "En el abordaje, la balanza se inclina hacia ellos y te impide dominar el debate. Hay algo que ellos no tomaron en cuenta y que ya jugaba a tu favor.",
    pregunta:
      "¿Qué sabes tú de tu producto o de ti que ellos no consideraron, y cómo lo usas para inclinar la balanza y terminar dominando?",
    criterioMotor: "¿Encontró una ventaja real y dominó el debate, o se quedó defendiéndose?",
  },
  {
    capitulo: 2,
    subcodigo: 4,
    indice: 1,
    escenario:
      "Llegas a esa persona que podría impulsarte y, sin que lo esperaras, te mira desde arriba o te ayuda por compasión.",
    pregunta: "¿Qué sientes en ese momento y en qué parte del cuerpo lo sientes?",
    criterioMotor: "¿Nombró la sensación y el lugar en el cuerpo, o racionalizó?",
  },
  {
    capitulo: 2,
    subcodigo: 4,
    indice: 2,
    escenario: "Te quedas con esa sensación sin huir de ella. Algo de lo que no te habías dado cuenta se vuelve visible.",
    pregunta: "¿Qué ves ahora de ti que antes no veías?",
    criterioMotor: "¿Hizo consciente algo inconsciente o dio un slogan?",
  },
  {
    capitulo: 2,
    subcodigo: 4,
    indice: 3,
    escenario: "Esa mirada de arriba ya no te hunde: te muestra hasta dónde puedes llegar.",
    pregunta: "¿Qué cambia en ti cuando dejas de ser alguien a quien ayudan por compasión?",
    criterioMotor: "¿Hay un cambio concreto o una flor? No se pide estrategia ni cálculo.",
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

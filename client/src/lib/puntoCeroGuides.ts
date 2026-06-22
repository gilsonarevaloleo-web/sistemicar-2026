export type PuntoCeroEtapaKey = "etapa1" | "etapa2" | "etapa3" | "etapa4";

/** Textos de UI y guía hablada — una sola fuente para pantalla y TTS. */
export type PuntoCeroEtapaGuide = {
  label: string;
  instruccion: string;
  /** Frases en cola; pausas entre cada una para meditación guiada. */
  voz: readonly string[];
};

export const PUNTO_CERO_INTRO_VOZ: readonly string[] = [
  "Punto Cero.",
  "Polo neutro.",
  "Cuatro estaciones hacia la recarga.",
];

export const PUNTO_CERO_ETAPAS: Record<PuntoCeroEtapaKey, PuntoCeroEtapaGuide> = {
  etapa1: {
    label: "Tensión y quietud del cuerpo",
    instruccion:
      "Antes de la quietud: tensá el cuerpo por zonas en este orden — empezá por la cabeza; seguí bajando por el torso y las piernas hasta que el penúltimo foco sean los pies y el último las manos. Soltá todo y sentí el alivio agradable. Recién entonces quedate en quietud física total.",
    voz: [
      "Etapa uno. Tensión y quietud del cuerpo.",
      "Antes de la quietud, tensá el cuerpo por zonas.",
      "Empezá por la cabeza.",
      "Seguí bajando por el cuello y el torso.",
      "Continuá por las piernas.",
      "El penúltimo foco: los pies.",
      "El último foco: las manos.",
      "Soltá todo el cuerpo de una vez.",
      "Sentí el alivio agradable del soltar.",
      "Recién entonces, quedate en quietud física total.",
      "No movas el cuerpo. Solo observá.",
    ],
  },
  etapa2: {
    label: "Identificación del Pensamiento",
    instruccion: "¿Qué estoy pensando? Lo identifico → apago ese movimiento mental.",
    voz: [
      "Etapa dos. Identificación del pensamiento.",
      "Preguntate en silencio: ¿qué estoy pensando?",
      "No luches contra la mente. Solo identificá el pensamiento.",
      "Nombralo con una palabra, si hace falta.",
      "Y apagá ese movimiento mental.",
      "Como apagar una luz suave.",
      "Volvé al silencio interior.",
    ],
  },
  etapa3: {
    label: "Ritmo, polos y apnea",
    instruccion:
      "Primero: tomá conciencia del ritmo de tu respiración tal como está, sin corregirla. Después: jugá con polos opuestos (inhalá lleno / exhalá vacío, o el par que uses en tu práctica). Al final: retené la respiración unos segundos a tu medida y mantené sin aire con calma.",
    voz: [
      "Etapa tres. Ritmo, polos y apnea.",
      "Primero: tomá conciencia del ritmo de tu respiración tal como está.",
      "Sin corregirla. Solo observala.",
      "Después: jugá con polos opuestos.",
      "Inhalá lleno… exhalá vacío.",
      "O el par que uses en tu práctica.",
      "Al final: retené la respiración unos segundos, a tu medida.",
      "Mantené sin aire con calma.",
      "Sin forzar. Sin competir.",
      "Volvé al ritmo natural cuando el cuerpo lo pida.",
    ],
  },
  etapa4: {
    label: "Alimento de Colores",
    instruccion: "Toca cada color para inhalarlo e introducirlo a su zona.",
    voz: [
      "Etapa cuatro. Alimento de colores.",
      "Siete colores del arcoíris.",
      "Cada uno entra con la respiración a su zona corporal.",
      "Tocá cada color para inhalarlo e introducirlo en su zona.",
      "Raíz, Sacro, Plexo Solar, Corazón, Garganta, Tercer Ojo, Corona.",
    ],
  },
};

export const PUNTO_CERO_ETAPA4_TRANSICION: readonly string[] = [
  "Cuando estés listo, pasá al alimento de colores.",
  "Tocá cada color para inhalarlo en su zona.",
];

export function colorInmersionVoz(zona: string, indice: number, total = 7): readonly string[] {
  return [
    `Color ${indice + 1} de ${total}: ${zona}.`,
    "Inhalá profundo… visualizá el color entrando en esa zona.",
    "Sostené un instante…",
    "Exhalá suave… e introducí el color en su lugar.",
  ];
}

export const MENSAJE_PASIVA_DIA: readonly string[] = [
  "Fase pasiva. Ancla del alivio consciente.",
  "Rastreá la fricción corporal, sin apuro.",
  "Donde haya tensión, exhalá y soltá.",
  "Dejá ir con cada exhalación.",
  "El cuerpo se recarga en el punto neutro.",
];

export const MENSAJE_PASIVA_NOCHE: readonly string[] = [
  "Fase pasiva. Modo apagón.",
  "Silencio profundo.",
  "Solo la respiración.",
  "Nadie te apura. El sistema puede apagarse a su ritmo.",
];

export const MENSAJE_REACTIVACION_DIA: readonly string[] = [
  "Punto Cero completado.",
  "Energía restaurada.",
  "Retomá el vehículo cuando quieras.",
];

/** @deprecated Usar MENSAJE_REACTIVACION_DIA */
export function mensajeReactivacionDia(): string {
  return MENSAJE_REACTIVACION_DIA.join(" ");
}

export function mensajePasivaDia(): string {
  return MENSAJE_PASIVA_DIA.join(" ");
}

export function mensajePasivaNoche(): string {
  return MENSAJE_PASIVA_NOCHE.join(" ");
}

export const PUNTO_CERO_ETAPAS_LIST = (
  ["etapa1", "etapa2", "etapa3", "etapa4"] as const
).map(key => ({ key, ...PUNTO_CERO_ETAPAS[key] }));

/** Paso 5 — no suma PS; es la fase más profunda tras los 7 colores. */
export const PUNTO_CERO_PASO5 = {
  label: "Fase pasiva",
  labelDia: "Ancla del alivio",
  labelNoche: "Apagón · sueño profundo",
  instruccionDia:
    "Después de los colores entras al paso más profundo: silencio, solo respiración y ondas theta. Dejá ir la fricción corporal.",
  instruccionNoche:
    "Después de los colores entras al paso más profundo para dormir: silencio total, ondas delta. Nadie te apura — aquí es donde el sistema se apaga.",
} as const;

export const PUNTO_CERO_PASOS_UI = [
  { n: 1, short: "Cuerpo", etapa: "etapa1" as const },
  { n: 2, short: "Mente", etapa: "etapa2" as const },
  { n: 3, short: "Respiración", etapa: "etapa3" as const },
  { n: 4, short: "Colores", etapa: "etapa4" as const },
  { n: 5, short: "Sueño", etapa: null },
] as const;

/**
 * Consola del Espejo V2 — nomenclatura Códigos 1.1–1.10,
 * algoritmo de 5 fases, clasificador semántico y matriz de refracción.
 * Spec: docs/espejo-v2-segundo-intento.txt
 */

export type EspejoV2CodigoId =
  | "1.1"
  | "1.2"
  | "1.3"
  | "1.4"
  | "1.5"
  | "1.6"
  | "1.7"
  | "1.8"
  | "1.9"
  | "1.10";

export type EspejoV2PhaseId =
  | "claridad"
  | "control"
  | "ejecucion"
  | "seriedad"
  | "gobernador";

export type Polo = "negativo" | "positivo";

export type FrictionLevel = 1 | 2;

export interface EspejoV2PhaseDef {
  id: EspejoV2PhaseId;
  index: number;
  label: string;
  codigoFase: string;
  polo: Polo;
}

export interface EspejoV2CodigoDef {
  id: EspejoV2CodigoId;
  secuencia: number;
  frecuencia: string;
  puntoCorporal: string;
  quejaTipica: string;
  fases: Record<EspejoV2PhaseId, string>;
}

export const ESPEJO_V2_ENTRY_PROMPT =
  "Bienvenido a la Consola del Espejo (Sistemicar V2). Expresa con claridad la queja, el bloqueo o la interferencia que sientes hoy en tu realidad. ¿Dónde sientes que tu esfuerzo no está traccionando?";

export const ESPEJO_V2_PHASES: EspejoV2PhaseDef[] = [
  { id: "claridad", index: 1, label: "Claridad", codigoFase: "Código 1", polo: "negativo" },
  { id: "control", index: 2, label: "Control", codigoFase: "Código 2", polo: "negativo" },
  { id: "ejecucion", index: 3, label: "Ejecución", codigoFase: "Código 3", polo: "negativo" },
  { id: "seriedad", index: 4, label: "Seriedad", codigoFase: "Código 4", polo: "positivo" },
  { id: "gobernador", index: 5, label: "Gobernador", codigoFase: "Código 8", polo: "positivo" },
];

export const ESPEJO_V2_CODIGOS: Record<EspejoV2CodigoId, EspejoV2CodigoDef> = {
  "1.1": {
    id: "1.1",
    secuencia: 1,
    frecuencia: "Sentido / Juego",
    puntoCorporal: "Depresión profunda, parálisis motivacional por pesadez.",
    quejaTipica:
      "Esto ya no tiene sentido, todo se ha vuelto una carga insoportable, me quiero rendir.",
    fases: {
      claridad:
        "¿Qué mentira o pesadez le introdujiste a tu proyecto que le quitó la chispa y la libertad original?",
      control:
        "Si abandonas y te rindes hoy, ¿cómo te vas a mirar al espejo mañana frente a tu familia?",
      ejecucion:
        "¿Qué es más fácil: tirar la toalla (fácil) o simplificar todo al mínimo para volver a jugar (difícil)?",
      seriedad:
        "¿Cuál es la acción mínima para recuperar la ligereza hoy y la acción máxima para descartar lo pesado?",
      gobernador:
        "¿Por qué tu creación tiene que volver a ser una fuente de conquista y no de pesadilla?",
    },
  },
  "1.2": {
    id: "1.2",
    secuencia: 2,
    frecuencia: "Contención / Respaldo",
    puntoCorporal: "Tensión en la espalda alta, victimismo emocional, soledad.",
    quejaTipica:
      "Nadie me apoya, estoy totalmente solo en esto, mi entorno me da la espalda.",
    fases: {
      claridad:
        "¿Qué expectativa infantil de apoyo tenías en los demás que terminó siendo una mentira?",
      control:
        "Ponle densidad a tu soledad: Si nadie en absoluto te apoya nunca, ¿qué vas a hacer con tu vida?",
      ejecucion:
        "¿Qué es más fácil: esperar que entiendan tu dolor o traccionar sin necesitar la aprobación de nadie?",
      seriedad:
        "¿Cuál es la acción mínima para cortar el victimismo hoy y la acción máxima para validar tu esfuerzo?",
      gobernador:
        "¿Por qué tu proyecto y tu camino no dependen de la simpatía del entorno?",
    },
  },
  "1.3": {
    id: "1.3",
    secuencia: 3,
    frecuencia: "Tiempo / Tracción Real",
    puntoCorporal: "Tensión ocular, desgaste físico por jornadas sin fruto.",
    quejaTipica:
      "Trabajo sin parar de madrugada a noche y no avanzo nada, el tiempo se me escapa entre los dedos.",
    fases: {
      claridad:
        "¿En qué tareas específicas estás gastando horas que solo te hacen sentir ocupado pero te dejan en el mismo sitio?",
      control:
        "Proyecta 5 años más haciendo exactamente lo mismo: ¿cuál es el peso de darte cuenta de que te hiciste viejo sin construir nada sólido?",
      ejecucion:
        "Diferencia lo fácil (quedarse pensando o puliendo detalles) de lo difícil (vender, exponerse y convertir trabajo en materia).",
      seriedad:
        "¿Cuál es la acción mínima para detener la fuga de tiempo hoy y la acción máxima para medir tracción real?",
      gobernador:
        "¿Por qué no vas a permitir quedar como un trabajador ciego atrapado en la rueda del esfuerzo inútil?",
    },
  },
  "1.4": {
    id: "1.4",
    secuencia: 4,
    frecuencia: "Marco / Ley / Respeto",
    puntoCorporal: "Opresión en el pecho, rigidez de juicio, falta de aire.",
    quejaTipica:
      "Esto es injusto, violaron los acuerdos conmigo, me juzgan mal o me faltan al respeto.",
    fases: {
      claridad:
        "¿Qué norma o acuerdo exacto sientes que se ha roto y te está haciendo sentir desprotegido?",
      control:
        "Si no fijas un límite firme hoy, ¿cuál es el escenario de falta de respeto más bajo al que vas a caer?",
      ejecucion:
        "¿Qué diferencia hay entre seguir lamentándote por la injusticia (fácil) y establecer la regla con firmeza (difícil)?",
      seriedad:
        "Sabiendo que nadie va a venir a hacerte justicia, ¿cuál es la acción mínima y la acción máxima para marcar el territorio hoy?",
      gobernador:
        "¿Por qué no vas a permitir que se siga pisoteando tu ley en tu propio entorno?",
    },
  },
  "1.5": {
    id: "1.5",
    secuencia: 5,
    frecuencia: "Caudal / Proceso / Orden",
    puntoCorporal: "Somatización digestiva, náuseas, asfixia financiera.",
    quejaTipica:
      "No hay flujo de dinero, el sistema es un caos, los recursos se agotan y no sé por dónde se fuga la liquidez.",
    fases: {
      claridad:
        "¿Cuál es la fuga financiera o de proceso exacta que estás ignorando por falta de números y métricas claras?",
      control:
        "Suma la pérdida actual por 30 días más: ¿en qué punto de quiebre o asfixia absoluta te va a colocar?",
      ejecucion:
        "¿Qué es más fácil: quejarte por la falta de flujo o sistematizar los cobros y cierres hoy mismo?",
      seriedad:
        "¿Cuál es la acción mínima para tapar la fuga hoy y la acción máxima para abrir una nueva vía de caudal?",
      gobernador:
        "¿Por qué vas a exigir orden y abundancia de recursos en tu estructura operativa?",
    },
  },
  "1.6": {
    id: "1.6",
    secuencia: 6,
    frecuencia: "Caza / Ventas / Fuerza",
    puntoCorporal: "Fatiga crónica, fobia al rechazo, inacción de mercado.",
    quejaTipica:
      "No tengo fuerzas para salir a vender, el mercado está cerrado, me siento sin garras para competir.",
    fases: {
      claridad:
        "¿A quién o a qué mercado le estás teniendo miedo de presentarle tu propuesta u oferta real?",
      control:
        "Si te quedas escondido sin cazar, ¿quién va a alimentar a tu familia y sostener tu infraestructura mañana?",
      ejecucion:
        "Diferencia lo fácil (esperar a que te busquen mágicamente) de lo difícil (salir a ofrecer, tocar puertas y cerrar tratos).",
      seriedad:
        "¿Cuál es la acción mínima para poner una propuesta en la mesa hoy y la acción máxima de prospección comercial?",
      gobernador:
        "¿Por qué la dignidad de tu casa exige que salgas a conquistar recursos al mercado?",
    },
  },
  "1.7": {
    id: "1.7",
    secuencia: 7,
    frecuencia: "Mando / Liderazgo / Autoridad",
    puntoCorporal: "Fatiga de liderazgo, parálisis de poder ante la crisis.",
    quejaTipica:
      "Siento que la carga es demasiado grande, perdí el control y las circunstancias externas me superan.",
    fases: {
      claridad:
        "¿Frente a qué problema específico estás fingiendo que no tienes el poder ni la responsabilidad de decidir?",
      control:
        "Si sigues cediendo tu poder al entorno o a los demás, ¿quién termina gobernando tu realidad?",
      ejecucion:
        "¿Qué diferencia hay entre esperar a que las circunstancias cambien (fácil) y tomar el mando a la fuerza (difícil)?",
      seriedad:
        "¿Cuál es la acción mínima para recuperar la autoridad hoy y la acción máxima para cortar el problema de raíz?",
      gobernador:
        "¿Por qué no vas a dejar tu destino en manos de las circunstancias externas?",
    },
  },
  "1.8": {
    id: "1.8",
    secuencia: 8,
    frecuencia: "Honor / Corrección / Estándar",
    puntoCorporal: "Auto-castigo psicológico, estancamiento por error cometido.",
    quejaTipica:
      "Cometí un error grave, fallé a mi propio estándar y siento una gran culpa por no hacer las cosas perfectas.",
    fases: {
      claridad:
        "¿En qué te estás castigando psicológicamente por no ser perfecto en lugar de corregir los hechos fríamente?",
      control:
        "Si dejas que la culpa te paralice durante una semana más, ¿en qué clase de hombre te estás convirtiendo?",
      ejecucion:
        "¿Qué es más fácil: lamentarte por la falla (fácil) o asumir el costo y corregir rápido (difícil)?",
      seriedad:
        "¿Cuál es la acción mínima para enmendar el error hoy y la acción máxima para cerrar el expediente?",
      gobernador:
        "¿Por qué tu honor se demuestra en la corrección inmediata y no en la culpa paralizante?",
    },
  },
  "1.9": {
    id: "1.9",
    secuencia: 9,
    frecuencia: "Vitalidad / Entusiasmo / Fuego",
    puntoCorporal: "Pérdida de energía vital, desinterés generalizado.",
    quejaTipica:
      "La vida y el trabajo se volvieron una rutina gris, no disfruto nada de lo que hago, todo es pura obligación.",
    fases: {
      claridad:
        "¿Qué parte de tu vida operativa se volvió una carga muerta que ya no te genera ningún entusiasmo?",
      control:
        "Si mantienes este estado de apatía 6 meses más, ¿cómo va a terminar tu salud y tu energía vital?",
      ejecucion:
        "¿Qué es más fácil: resignarse a una vida aburrida (fácil) o ejecutar algo que te devuelva el fuego hoy (difícil)?",
      seriedad:
        "¿Cuál es la acción mínima para inyectar vitalidad hoy y la acción máxima para eliminar lo que te apaga?",
      gobernador:
        "¿Por qué reclamas el derecho a disfrutar el fruto de tu trabajo y tu creación?",
    },
  },
  "1.10": {
    id: "1.10",
    secuencia: 10,
    frecuencia: "Suelo / Pareja / Reciprocidad",
    puntoCorporal: "Conflicto de territorio en el hogar, desgaste en relaciones.",
    quejaTipica:
      "Doy todo y no me valoran, mi entorno cercano me resta y la balanza del hogar está descompensada.",
    fases: {
      claridad:
        "¿En qué punto exacto estás tolerando que te resten fuerza en tu propio suelo o territorio personal?",
      control:
        "Si sigues entregando tu energía a cambio de desprecio o mezquindad, ¿cuánto piso te va a quedar en 3 meses?",
      ejecucion:
        "¿Qué es más fácil: seguir mendigando respeto (fácil) o recuperar la soberanía sobre tu espacio (difícil)?",
      seriedad:
        "¿Cuál es la acción mínima para reordenar la balanza hoy y la acción máxima para exigir reciprocidad?",
      gobernador:
        "¿Por qué no vas a permitir que tu base/hogar sea un lugar de resta en lugar de un refugio de fuerza?",
    },
  },
};

/** Keyword rules for classifier (spec §5.2). Order = priority when scoring ties. */
const CLASSIFIER_RULES: Array<{ codigo: EspejoV2CodigoId; keywords: string[] }> = [
  {
    codigo: "1.3",
    keywords: [
      "tiempo",
      "madrugada",
      "madrugadas",
      "horas",
      "años",
      "estancamiento",
      "no avanzo",
      "sin avanzar",
      "fuga de tiempo",
    ],
  },
  {
    codigo: "1.10",
    keywords: [
      "pareja",
      "casa",
      "hogar",
      "desprecio",
      "desequilibrio",
      "dar sin recibir",
      "no me valoran",
      "balanza",
      "reciprocidad",
    ],
  },
  {
    codigo: "1.5",
    keywords: [
      "dinero",
      "caja",
      "flujo",
      "cuentas",
      "fuga",
      "gastos",
      "desorden",
      "liquidez",
      "recursos",
      "cobros",
    ],
  },
  {
    codigo: "1.6",
    keywords: [
      "vender",
      "venta",
      "ventas",
      "clientes",
      "comercial",
      "salir a buscar",
      "propuesta",
      "mercado",
      "prospección",
      "cazar",
    ],
  },
  {
    codigo: "1.4",
    keywords: [
      "injusticia",
      "injusto",
      "falta de respeto",
      "respeto",
      "violaron",
      "acuerdos",
      "juicio",
      "desprotegido",
    ],
  },
  {
    codigo: "1.1",
    keywords: [
      "rendirme",
      "rendir",
      "sin sentido",
      "no tiene sentido",
      "cansancio de vivir",
      "pesadez",
      "abandonar",
      "quiero rendirme",
    ],
  },
  {
    codigo: "1.2",
    keywords: [
      "soledad",
      "solo",
      "sola",
      "nadie me apoya",
      "incomprendido",
      "abandonado",
      "sin apoyo",
      "me da la espalda",
    ],
  },
  {
    codigo: "1.7",
    keywords: [
      "impotencia",
      "superado",
      "pérdida de control",
      "perdi el control",
      "perdí el control",
      "sin control",
      "mando",
      "circunstancias",
    ],
  },
  {
    codigo: "1.8",
    keywords: [
      "culpa",
      "cometí un error",
      "error",
      "no soy perfecto",
      "castigo",
      "perfeccionismo",
      "fallé",
      "falle",
    ],
  },
  {
    codigo: "1.9",
    keywords: [
      "rutina",
      "aburrimiento",
      "vida gris",
      "sin disfrute",
      "apatía",
      "apatia",
      "sin ganas",
      "no disfruto",
      "obligación",
    ],
  },
];

export interface ClassificationResult {
  codigo: EspejoV2CodigoId;
  frecuencia: string;
  puntoCorporal: string;
  matchedKeywords: string[];
  scores: Partial<Record<EspejoV2CodigoId, number>>;
  method: "keyword";
}

export function classifyQueja(texto: string): ClassificationResult {
  const normalized = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const scores: Partial<Record<EspejoV2CodigoId, number>> = {};
  const matchedByCode: Partial<Record<EspejoV2CodigoId, string[]>> = {};

  for (const rule of CLASSIFIER_RULES) {
    const hits: string[] = [];
    for (const kw of rule.keywords) {
      const kwNorm = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (normalized.includes(kwNorm)) hits.push(kw);
    }
    if (hits.length > 0) {
      scores[rule.codigo] = hits.length;
      matchedByCode[rule.codigo] = hits;
    }
  }

  let best: EspejoV2CodigoId = "1.3";
  let bestScore = -1;
  for (const rule of CLASSIFIER_RULES) {
    const s = scores[rule.codigo] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = rule.codigo;
    }
  }

  if (bestScore <= 0) {
    best = "1.3";
  }

  const def = ESPEJO_V2_CODIGOS[best];
  return {
    codigo: best,
    frecuencia: def.frecuencia,
    puntoCorporal: def.puntoCorporal,
    matchedKeywords: matchedByCode[best] ?? [],
    scores,
    method: "keyword",
  };
}

export interface RefractionRule {
  patterns: string[];
  diagnostico: string;
  codigoSalto: EspejoV2CodigoId;
  estrategia: string;
}

export const REFRACCION_MATRIX: RefractionRule[] = [
  {
    patterns: ["no tengo ganas", "siento apatia", "siento apatía", "apatia", "apatía"],
    diagnostico: "Parálisis de fuego y agotamiento vital.",
    codigoSalto: "1.9",
    estrategia: "Fuerza la desconexión de la carga muerta.",
  },
  {
    patterns: ["perdi la fe", "perdí la fe", "no creo poder", "no creo que pueda"],
    diagnostico: "Colapso del sentido y desesperanza.",
    codigoSalto: "1.1",
    estrategia: "Exige mover el cuerpo sin requerir fe previa.",
  },
  {
    patterns: [
      "no se por donde",
      "no sé por dónde",
      "no se que hacer",
      "no sé qué hacer",
      "es un caos",
      "por donde empezar",
    ],
    diagnostico: "Sobrecarga por falta de orden de proceso.",
    codigoSalto: "1.5",
    estrategia: "Reduce el escenario a una sola métrica o número.",
  },
  {
    patterns: [
      "miedo a equivocarme",
      "tengo miedo a equivocarme",
      "tengo miedo",
      "miedo a fallar",
    ],
    diagnostico: "Parálisis por juicio moral y perfeccionismo.",
    codigoSalto: "1.8",
    estrategia: "Elimina la culpa y exige corrección fría.",
  },
  {
    patterns: [
      "nada de lo que haga",
      "no va a cambiar nada",
      "no cambiara nada",
      "no cambiará nada",
    ],
    diagnostico: "Sensación de impotencia y cesión de mando.",
    codigoSalto: "1.7",
    estrategia: "Recupera la responsabilidad sobre el territorio.",
  },
  {
    patterns: ["nadie me ayuda", "nadie le importa", "a nadie le importa"],
    diagnostico: "Búsqueda de validación externa e incomprensión.",
    codigoSalto: "1.2",
    estrategia: "Corta la dependencia del aplauso o aprobación.",
  },
];

export const FRICTION_N2_RULE =
  "EL SISTEMA NO REQUIERE FE NI GANAS PARA EJECUTAR. LA ACCIÓN MÍNIMA EXIGE PRESENCIA, NO ENTUSIASMO.";

export interface RefractionResult {
  detected: boolean;
  rule?: RefractionRule;
  notification?: string;
  frictionPrompt?: string;
}

export function detectRefraction(respuestaFase4: string): RefractionResult {
  const normalized = respuestaFase4
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const rule of REFRACCION_MATRIX) {
    for (const pattern of rule.patterns) {
      const p = pattern
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (normalized.includes(p)) {
        const codigo = ESPEJO_V2_CODIGOS[rule.codigoSalto];
        return {
          detected: true,
          rule,
          notification:
            "La resistencia no está en la tarea, está en tu reserva de energía vital.",
          frictionPrompt: buildFrictionN2Prompt(rule, codigo),
        };
      }
    }
  }
  return { detected: false };
}

function buildFrictionN2Prompt(rule: RefractionRule, codigo: EspejoV2CodigoDef): string {
  const base =
    rule.codigoSalto === "1.1"
      ? "Dices que no tienes fe. ¿En qué momento le entregaste a tu mente la excusa de 'no creer' para no mover un solo dedo hoy?"
      : codigo.fases.claridad;
  return `${base}\n\n${FRICTION_N2_RULE}`;
}

/**
 * Densidad del Polo Negativo (spec paso 2):
 * Fase 1 → 33%, Fase 2 → 66%, Fase 3 → 100%.
 * Fases 4–5 mantienen saturación (expulsión gravitacional).
 */
export function densityPercent(phaseIndex: number, _friction: FrictionLevel = 1): number {
  if (phaseIndex <= 0) return 0;
  if (phaseIndex === 1) return 33;
  if (phaseIndex === 2) return 66;
  return 100;
}

export function frictionLabel(friction: FrictionLevel): string {
  return friction === 2
    ? "FRICCIÓN: REFRACCIÓN DETECTADA (NIVEL 2)"
    : "FRICCIÓN: ESTÁNDAR (NIVEL 1)";
}

export function getPhasePrompt(codigoId: EspejoV2CodigoId, phaseId: EspejoV2PhaseId): string {
  return ESPEJO_V2_CODIGOS[codigoId].fases[phaseId];
}

export function isValidCodigo(value: string): value is EspejoV2CodigoId {
  return Object.prototype.hasOwnProperty.call(ESPEJO_V2_CODIGOS, value);
}

export function isValidPhase(value: string): value is EspejoV2PhaseId {
  return ESPEJO_V2_PHASES.some((p) => p.id === value);
}

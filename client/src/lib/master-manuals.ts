export type ManualType = "espejo" | "deposito" | "alquimia" | "umbral" | "planificacion" | "proyector";

export interface ManualCheckItem {
  text: string;
  key: string;
}

export interface ManualSection {
  title: string;
  instruction: string;
  checklist: ManualCheckItem[];
}

export interface MasterManual {
  id: ManualType;
  title: string;
  subtitle: string;
  principle: string;
  icon: string;
  color: string;
  sections: ManualSection[];
  benefits: string[];
}

export interface ManualBenefits {
  id: ManualType;
  title: string;
  subtitle: string;
  color: string;
  transformation: string;
  benefits: string[];
  emotionalWin: string;
}

export const MASTER_MANUALS: Record<ManualType, MasterManual> = {
  espejo: {
    id: "espejo",
    title: "Manual del Espejo",
    subtitle: "El Arte de Ver",
    principle: "El Espejo no juzga, solo refleja.",
    icon: "Eye",
    color: "#A855F7",
    benefits: [
      "Reduce reacciones impulsivas que dañan relaciones",
      "Aumenta la auto-conciencia e inteligencia emocional",
      "Crea espacio entre estímulo y respuesta",
      "Previene que la presión emocional acumulada explote"
    ],
    sections: [
      {
        title: "PRESENCIA",
        instruction: "No describas lo que piensas, describe lo que siente tu cuerpo ahora.",
        checklist: [
          { key: "espejo_presencia_1", text: "Identifiqué sensaciones físicas específicas (tensión, calor, peso)" },
          { key: "espejo_presencia_2", text: "Evité interpretaciones mentales del momento" },
          { key: "espejo_presencia_3", text: "Describí el AHORA, no el antes ni el después" }
        ]
      },
      {
        title: "TENSIÓN",
        instruction: "No busques soluciones. Encuentra el punto exacto donde la emoción te aprieta.",
        checklist: [
          { key: "espejo_tension_1", text: "Localicé el punto exacto de la tensión en mi cuerpo" },
          { key: "espejo_tension_2", text: "Resistí la urgencia de resolver o escapar" },
          { key: "espejo_tension_3", text: "Nombré la emoción sin justificarla" }
        ]
      },
      {
        title: "RITMO",
        instruction: "Siente el pulso de la emoción. ¿Es rápido? ¿Es lento? No intentes cambiarlo, solo síguelo.",
        checklist: [
          { key: "espejo_ritmo_1", text: "Observé la velocidad natural de la emoción" },
          { key: "espejo_ritmo_2", text: "No intenté acelerar ni frenar el proceso" },
          { key: "espejo_ritmo_3", text: "Seguí el ritmo hasta que cambió solo" }
        ]
      },
      {
        title: "EXPANSIÓN",
        instruction: "Permite que la emoción ocupe toda la habitación. Si la dejas ser, se vuelve luz.",
        checklist: [
          { key: "espejo_expansion_1", text: "Dejé que la emoción se expandiera sin resistencia" },
          { key: "espejo_expansion_2", text: "No contraí mi cuerpo para contenerla" },
          { key: "espejo_expansion_3", text: "Observé cómo se transformó al darle espacio" }
        ]
      }
    ]
  },
  deposito: {
    id: "deposito",
    title: "Manual del Depósito",
    subtitle: "Auditoría de Capital",
    principle: "El pasado es un banco de datos, no un cementerio.",
    icon: "Database",
    color: "#3B82F6",
    benefits: [
      "Transforma experiencias pasadas en sabiduría accionable",
      "Construye confianza documentando logros reales",
      "Crea una base de datos personal para tomar decisiones",
      "Evita repetir los mismos errores"
    ],
    sections: [
      {
        title: "APRENDER",
        instruction: "Si no puedes resumirlo en una frase técnica, aún no lo has aprendido.",
        checklist: [
          { key: "deposito_aprender_1", text: "Resumí el aprendizaje en una frase técnica clara" },
          { key: "deposito_aprender_2", text: "Identifiqué el patrón que debo evitar o replicar" },
          { key: "deposito_aprender_3", text: "Extraje una regla aplicable a situaciones futuras" }
        ]
      },
      {
        title: "GESTIONAR",
        instruction: "Describe el orden que impusiste, no el problema que sufriste.",
        checklist: [
          { key: "deposito_gestionar_1", text: "Describí las acciones de control, no las quejas" },
          { key: "deposito_gestionar_2", text: "Enfoqué en lo que SÍ hice, no en lo que me pasó" },
          { key: "deposito_gestionar_3", text: "Mostré evidencia de gestión activa" }
        ]
      },
      {
        title: "EJECUTAR",
        instruction: "Detalla la mecánica: '¿Qué hiciste primero? ¿Qué hiciste después?'",
        checklist: [
          { key: "deposito_ejecutar_1", text: "Describí la secuencia de pasos en orden" },
          { key: "deposito_ejecutar_2", text: "Incluí detalles de la mecánica de ejecución" },
          { key: "deposito_ejecutar_3", text: "Documenté decisiones tomadas en el proceso" }
        ]
      },
      {
        title: "RESOLUCIÓN",
        instruction: "¿Cuál fue el valor final entregado? Mide el resultado en hechos, no en intenciones.",
        checklist: [
          { key: "deposito_resolucion_1", text: "Definí el resultado en términos medibles" },
          { key: "deposito_resolucion_2", text: "Evité hablar de intenciones, solo de hechos" },
          { key: "deposito_resolucion_3", text: "Cuantifiqué el valor entregado" }
        ]
      }
    ]
  },
  alquimia: {
    id: "alquimia",
    title: "Manual de Alquimia",
    subtitle: "De Plomo a Oro",
    principle: "Tu dolor es la materia prima de tu autoridad.",
    icon: "Sparkles",
    color: "#D4AF37",
    benefits: [
      "Convierte el sufrimiento en autoridad personal y sabiduría",
      "Desarrolla anti-fragilidad: crece más fuerte bajo presión",
      "Crea una biblioteca de algoritmos de crisis reutilizables",
      "Construye un carácter inquebrantable a través de la adversidad"
    ],
    sections: [
      {
        title: "OBSERVACIÓN",
        instruction: "Identifica el momento exacto donde el ego tomó el mando.",
        checklist: [
          { key: "alquimia_observacion_1", text: "Identifiqué el momento preciso del quiebre" },
          { key: "alquimia_observacion_2", text: "Describí la situación sin adornos ni excusas" },
          { key: "alquimia_observacion_3", text: "Nombré la reacción del ego (defensa, ataque, huida)" }
        ]
      },
      {
        title: "CRISIS",
        instruction: "Describe el punto donde la vieja identidad ya no funcionó.",
        checklist: [
          { key: "alquimia_crisis_1", text: "Identifiqué la resistencia REAL (interna o externa)" },
          { key: "alquimia_crisis_2", text: "Describí qué parte de mi vieja identidad colapsó" },
          { key: "alquimia_crisis_3", text: "No minimicé ni dramaticé la crisis" }
        ]
      },
      {
        title: "LECCIÓN",
        instruction: "Extrae el algoritmo de salida. ¿Qué llave abrió la celda?",
        checklist: [
          { key: "alquimia_leccion_1", text: "Extraje pasos ACCIONABLES y concretos" },
          { key: "alquimia_leccion_2", text: "Definí el 'algoritmo de salida' replicable" },
          { key: "alquimia_leccion_3", text: "La lección es aplicable a situaciones similares" }
        ]
      },
      {
        title: "MAESTRÍA",
        instruction: "Declara cómo esta lección se convierte en un pilar de tu nuevo carácter.",
        checklist: [
          { key: "alquimia_maestria_1", text: "Declaré el nuevo pilar de carácter" },
          { key: "alquimia_maestria_2", text: "Definí cómo aplicaré esto en el futuro" },
          { key: "alquimia_maestria_3", text: "La maestría es una transformación, no solo información" }
        ]
      }
    ]
  },
  umbral: {
    id: "umbral",
    title: "Manual del Umbral",
    subtitle: "Puente Hemisférico",
    principle: "El límite es la puerta; el miedo es el portero.",
    icon: "Fingerprint",
    color: "#7C3AED",
    benefits: [
      "Desconecta patrones neuronales limitantes que te frenan",
      "Instala nuevos arquetipos empoderadores en tu identidad",
      "Usa técnicas basadas en EMDR para cambio rápido",
      "Expande tu zona de confort permanentemente"
    ],
    sections: [
      {
        title: "LADO IZQUIERDO (Sombra)",
        instruction: "Sé despiadado con la sombra. Dale un nombre que te haga reír o te dé asco, pero sepárate de ella.",
        checklist: [
          { key: "umbral_izquierdo_1", text: "Di un nombre específico y memorable a la sombra" },
          { key: "umbral_izquierdo_2", text: "Describí su lenguaje (qué dice cuando aparece)" },
          { key: "umbral_izquierdo_3", text: "Identifiqué en qué circunstancias se activa" },
          { key: "umbral_izquierdo_4", text: "Me separé emocionalmente de ella (no soy yo)" }
        ]
      },
      {
        title: "MOVIMIENTO OCULAR",
        instruction: "Mantén la cabeza fija. Deja que tus ojos 'corten' el cable neurológico del límite.",
        checklist: [
          { key: "umbral_ocular_1", text: "Mantuve la cabeza fija durante el ejercicio" },
          { key: "umbral_ocular_2", text: "Seguí el patrón de movimiento ocular completo" },
          { key: "umbral_ocular_3", text: "Sentí el 'corte' o liberación del patrón" }
        ]
      },
      {
        title: "LADO DERECHO (Poder)",
        instruction: "No pidas permiso. Vístete con el traje del Arquetipo de Poder con total soberanía.",
        checklist: [
          { key: "umbral_derecho_1", text: "Nombré al Arquetipo de Poder claramente" },
          { key: "umbral_derecho_2", text: "Describí su lenguaje (qué dice cuando actúa)" },
          { key: "umbral_derecho_3", text: "Definí la acción que toma en vez de la sombra" },
          { key: "umbral_derecho_4", text: "Lo declaré con soberanía, sin pedir permiso" }
        ]
      }
    ]
  },
  planificacion: {
    id: "planificacion",
    title: "Manual de Planificación",
    subtitle: "Motor del día · v5.5",
    principle: "No es una lista: es cerrar el día con segmentos, flota y bloques medidos.",
    icon: "Compass",
    color: "#D4AF37",
    benefits: [
      "Segmentos que evitan la omisión (tiempo sin registro)",
      "La Flota: Conquista, Enfoque, Descanso y Verdad — misiones con cierre medido",
      "Desglosadores que miden subs (bloques), no solo intención",
      "Termodinámica: dominio fluido y fricción vs ayer (Operativo)",
      "Proyectos con peldaños y claridad mental (Soberanía del día)",
      "Doctor IA en modo guía dentro de esta pantalla"
    ],
    sections: [
      {
        title: "SEGMENTOS DEL DÍA",
        instruction:
          "Parte el día en tramos (mañana, tarde…). Si ninguno está activo, el monitor marca OMISIÓN. Cierra el segmento con cierre manual o registra entropía.",
        checklist: [
          { key: "plan_seg_1", text: "Tengo al menos un segmento con hora inicio y fin" },
          { key: "plan_seg_2", text: "Sé cuál segmento está activo ahora (o por qué hay omisión)" },
          { key: "plan_seg_3", text: "Cerré o registré el tramo al terminar (no dejé el día abierto)" }
        ]
      },
      {
        title: "LA FLOTA",
        instruction:
          "Cuatro tipos: Conquista (unidades y ritmo), Enfoque (decisiones con ring y cupos), Descanso (recarga consciente), Verdad (sinceridad). Eliges tipo, título y criterio de fin. Sin cumplido/archivado no hay PS.",
        checklist: [
          { key: "plan_flota_1", text: "Lancé un vehículo con título claro y tipo de flota acorde (Conquista o Enfoque para empezar)" },
          { key: "plan_flota_2", text: "Definí criterio de fin (hora, cantidad o situación según el tipo)" },
          { key: "plan_flota_3", text: "Marqué cumplido o archivado al terminar (no lo dejé activo)" }
        ]
      },
      {
        title: "DESGLOSADOR (BLOQUES)",
        instruction:
          "Requiere add-on: Soberanía del día (Enfoque, bloques 3+3) u Operativo (Conquista, unidades). En termodinámica: 1 bloque = desglosador cerrado; los subs cuentan aparte. Cierra cada sub y luego el desglosador padre.",
        checklist: [
          { key: "plan_desg_1", text: "Abrí un desglosador acorde a mi plan (Enfoque o Conquista)" },
          { key: "plan_desg_2", text: "Creé subs y los fui cerrando (cumplido/fallado)" },
          { key: "plan_desg_3", text: "Cerré el ciclo del desglosador al terminar la sesión" }
        ]
      },
      {
        title: "TERMODINÁMICA ATENCIONAL",
        instruction:
          "V2 (desglosador conquista): compara hoy vs ayer — dominio fluido, subs completados, fricción. Maestría = más fluido y cierres adelantados, no “llegar al límite” siempre.",
        checklist: [
          { key: "plan_termo_1", text: "Revisé la comparativa del día (no solo el total de bloques)" },
          { key: "plan_termo_2", text: "Entiendo fluido vs concentrado vs límite por sub" },
          { key: "plan_termo_3", text: "Uso la curva para ver si la fricción baja semana a semana" }
        ]
      },
      {
        title: "PROYECTOS Y CLARIDAD",
        instruction:
          "Hub Proyectos (Soberanía del día): peldaños, oleada/claridad activa. Entrá desde Jornada → Plan → Hub Proyectos. Puedes vincular segmento ↔ proyecto. La rutina da horarios; la claridad viene del Hub.",
        checklist: [
          { key: "plan_proy_1", text: "Tengo un proyecto con peldaños visibles" },
          { key: "plan_proy_2", text: "Marqué un peldaño o avance hoy" },
          { key: "plan_proy_3", text: "Sé qué segmento sostiene ese norte hoy" }
        ]
      }
    ]
  },
  proyector: {
    id: "proyector",
    title: "Manual del Proyector",
    subtitle: "Arquitectura de Realidad REC",
    principle: "El futuro no se predice, se colapsa.",
    icon: "Rocket",
    color: "#6366F1",
    benefits: [
      "Diseña tu futuro deseado con precisión de ingeniero",
      "Estructura el camino con arquitectura clara",
      "Identifica y moviliza los recursos necesarios",
      "Colapsa la realidad proyectada en fecha específica"
    ],
    sections: [
      {
        title: "VISIÓN",
        instruction: "Describe el evento futuro como si ya hubiera ocurrido. Usa tiempo pasado.",
        checklist: [
          { key: "proyector_vision_1", text: "Escribí el evento en tiempo pasado" },
          { key: "proyector_vision_2", text: "Incluí detalles sensoriales (qué vi, oí, sentí)" },
          { key: "proyector_vision_3", text: "El evento es específico, no vago" }
        ]
      },
      {
        title: "ARQUITECTURA",
        instruction: "Diseña la estructura del camino. ¿Cuáles son las fases y etapas para llegar?",
        checklist: [
          { key: "proyector_arquitectura_1", text: "Definí las fases principales del proyecto" },
          { key: "proyector_arquitectura_2", text: "Cada fase tiene entregables claros" },
          { key: "proyector_arquitectura_3", text: "Identifiqué dependencias entre fases" }
        ]
      },
      {
        title: "RECURSO",
        instruction: "Identifica los recursos necesarios: tiempo, dinero, personas, habilidades.",
        checklist: [
          { key: "proyector_recurso_1", text: "Listé los recursos de tiempo necesarios" },
          { key: "proyector_recurso_2", text: "Identifiqué recursos financieros o materiales" },
          { key: "proyector_recurso_3", text: "Nombré personas o habilidades que necesito" }
        ]
      },
      {
        title: "FECHA COLAPSO",
        instruction: "Declara la fecha en que el evento 'colapsa' de posibilidad a realidad.",
        checklist: [
          { key: "proyector_fechacolapso_1", text: "Definí una fecha específica de colapso" },
          { key: "proyector_fechacolapso_2", text: "La fecha es realista pero ambiciosa" },
          { key: "proyector_fechacolapso_3", text: "Me comprometí públicamente con la fecha" }
        ]
      }
    ]
  }
};

export function getManualByType(type: ManualType): MasterManual {
  return MASTER_MANUALS[type];
}

export function getAllManuals(): MasterManual[] {
  return Object.values(MASTER_MANUALS);
}

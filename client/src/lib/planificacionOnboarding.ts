import { JORNADA_MODULE } from "./jornadaBrand";
import { FLOTA_BRAND, FLOTA_SELECTOR_DISCRIMINATOR } from "./flotaBrand";
import { SISTEMICAR_CATEGORY } from "./sistemicarCategory";

export type PlanificacionPlanProfile = "base" | "estudiante" | "produccion";

export type PrimerDiaCheckKey =
  | "segmento"
  | "vehiculo"
  | "cierre"
  | "escalera"
  | "desglosador"
  | "proyecto";

export type TutorialStep = {
  title: string;
  description: string;
  action?: string;
};

export const TUTORIAL_DONE_KEY = "sistemicar_planificacion_tutorial_done";
export const CHECKLIST_KEY_PREFIX = "sistemicar_planificacion_primer_dia_";

export function tutorialStorageKey(uid: string): string {
  return `${TUTORIAL_DONE_KEY}_${uid}`;
}

export function checklistStorageKey(uid: string): string {
  return `${CHECKLIST_KEY_PREFIX}${uid}`;
}

export function profileLabel(profile: PlanificacionPlanProfile): string {
  switch (profile) {
    case "produccion":
      return "Producción (Operativo)";
    case "estudiante":
      return "Estudiante (Soberanía del día)";
    default:
      return "Planificación Base";
  }
}

const STEPS_BASE: TutorialStep[] = [
  {
    title: `Bienvenido a ${JORNADA_MODULE.title}`,
    description: `${SISTEMICAR_CATEGORY.oneLiner} Estructuras el día en segmentos, operas en La Flota y cierras la jornada con sello (cumplido o archivado).`,
    action: "Siguiente: la Escalera de Conciencia.",
  },
  {
    title: "Escalera de Conciencia — 3 capas",
    description:
      "Presencia (anillo): ¿en qué se me va el tiempo? Entrada (disciplina): ¿aparezco al trabajo consciente? Producción (combustible): ¿convierto el tiempo en decisiones? Ninguna capa sustituye a la otra.",
    action: "Ve a «Métricas» y revisa las tres capas de hoy.",
  },
  {
    title: "Segmentos = tu día en tramos",
    description:
      "Mañana, tarde, noche… Cada segmento tiene hora de inicio y fin. Si ninguno está activo, el monitor muestra OMISIÓN (tiempo sin registro).",
    action: "Ve a «Segmentos del día» y revisa o crea tu tramo actual.",
  },
  {
    title: "La Flota: cuatro tipos de misión",
    description:
      `${FLOTA_SELECTOR_DISCRIMINATOR} **${FLOTA_BRAND.tiempo.label}** = unidades y ritmo. **${FLOTA_BRAND.situacion.label}** = decisiones selladas (ring y cupos). **${FLOTA_BRAND.descanso.label}** = recarga consciente. **${FLOTA_BRAND.verdad.label}** = sinceridad ante el vacío. Título + criterio de cierre; sin cumplido/archivado no hay PS.`,
    action: `Lanza un vehículo de ${FLOTA_BRAND.tiempo.label} o ${FLOTA_BRAND.situacion.label} con algo concreto de hoy.`,
  },
  {
    title: "Cierra para ganar PS",
    description:
      "Una misión solo cuenta cuando la marcas CUMPLIDO o ARCHIVADO. El coraje de intentar también suma puntos.",
    action: "Cierra tu primer vehículo antes de salir.",
  },
  {
    title: "Tu guía: Doctor IA",
    description:
      `En ${JORNADA_MODULE.title} el Doctor responde en modo guía: «¿qué es un segmento?», «¿por dónde empiezo?». Pregunta con tu duda concreta.`,
    action: "Abre el chat flotante y escribe: «¿Por dónde empiezo hoy?»",
  },
];

const STEPS_ESTUDIANTE_EXTRA: TutorialStep[] = [
  {
    title: "Ring de enfoque (desglosador)",
    description:
      "Para ideas sueltas e imprevistos: bloques 3+3, cupos por subtarea, meta sellada. Ideal cuando nadie te marca la agenda.",
    action: "Crea un vehículo de enfoque y cierra al menos un bloque del ring.",
  },
  {
    title: "Proyectos y peldaños",
    description:
      "En Hub Proyectos subes una escalera de peldaños. Puedes vincular un segmento al proyecto para claridad mental.",
    action: "Desde Jornada → Plan → Hub Proyectos, revisa tu escalera activa.",
  },
];

const STEPS_PRODUCCION_EXTRA: TutorialStep[] = [
  {
    title: "Desglosador conquista (unidades)",
    description:
      "Para producción repetitiva: defines unidades, el contador baja con pitido, cada sub es un bloque medido.",
    action: "Abre un vehículo de conquista con desglosador en La Flota.",
  },
  {
    title: "Ruta fluido → concentrado → límite",
    description:
      "La voz marca tramos del contador. Al cerrar subs, la termodinámica compara dominio fluido y fricción vs ayer.",
    action: "Cierra 2 subs y revisa la comparativa del día.",
  },
];

export function getTutorialSteps(profile: PlanificacionPlanProfile): TutorialStep[] {
  if (profile === "produccion") {
    return [...STEPS_BASE, ...STEPS_PRODUCCION_EXTRA];
  }
  if (profile === "estudiante") {
    return [...STEPS_BASE, ...STEPS_ESTUDIANTE_EXTRA];
  }
  return STEPS_BASE;
}

export type PrimerDiaItem = {
  key: PrimerDiaCheckKey;
  label: string;
  hint: string;
  /** Solo visible si el plan incluye esta capacidad */
  requires?: "desglosador" | "proyecto";
};

export function getPrimerDiaItems(profile: PlanificacionPlanProfile): PrimerDiaItem[] {
  const items: PrimerDiaItem[] = [
    {
      key: "segmento",
      label: "Tengo un segmento del día definido (o activo)",
      hint: "Segmentos del día → crea mañana/tarde o usa plantilla.",
    },
    {
      key: "vehiculo",
      label: "Lancé al menos un vehículo en La Flota",
      hint: `${FLOTA_BRAND.tiempo.label} para medir unidades; ${FLOTA_BRAND.situacion.label} para sellar decisiones; elige tipo al crear.`,
    },
    {
      key: "cierre",
      label: "Cerré un vehículo (cumplido o archivado)",
      hint: "Sin cierre no hay PS ni datos en termodinámica.",
    },
    {
      key: "escalera",
      label: "Revisé la Escalera de Conciencia en Métricas",
      hint: "Métricas → Presencia · Entrada · Producción — tu espejo por capas.",
    },
  ];
  if (profile === "estudiante" || profile === "produccion") {
    items.push({
      key: "desglosador",
      label: "Usé un desglosador y cerré al menos un sub",
      hint:
        profile === "produccion"
          ? "Desglosador conquista → subs por unidades."
          : "Ring de enfoque → bloques 3+3.",
      requires: "desglosador",
    });
  }
  if (profile === "estudiante") {
    items.push({
      key: "proyecto",
      label: "Revisé o avancé un peldaño en Proyectos",
      hint: "Jornada → Plan → Hub Proyectos → escalera activa.",
      requires: "proyecto",
    });
  }
  return items;
}

export function loadChecklistState(uid: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(checklistStorageKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function saveChecklistState(uid: string, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(checklistStorageKey(uid), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function isTutorialDone(uid: string): boolean {
  try {
    return localStorage.getItem(tutorialStorageKey(uid)) === "1";
  } catch {
    return false;
  }
}

export function markTutorialDone(uid: string): void {
  try {
    localStorage.setItem(tutorialStorageKey(uid), "1");
  } catch {
    /* ignore */
  }
}

export function computePrimerDiaAutoComplete(params: {
  dayStartMs: number;
  segmentos: Array<{ estado?: string }>;
  vehicles: Array<{
    status?: string;
    tipoReloj?: string;
    cierreAt?: number;
    aperturaAt?: number;
    subVehiculos?: Array<{ status?: string; cierreAt?: number }>;
  }>;
}): Partial<Record<PrimerDiaCheckKey, boolean>> {
  const { dayStartMs, segmentos, vehicles } = params;
  const out: Partial<Record<PrimerDiaCheckKey, boolean>> = {};

  if (segmentos.length > 0) {
    out.segmento = true;
  }

  const enJornada = vehicles.filter(v => {
    const ts = v.cierreAt ?? v.aperturaAt ?? 0;
    return v.status === "activo" || ts >= dayStartMs;
  });

  if (enJornada.length > 0) {
    out.vehiculo = true;
  }

  const cerrado = vehicles.some(
    v =>
      (v.status === "cumplido" || v.status === "archivado") &&
      (v.cierreAt ?? 0) >= dayStartMs
  );
  if (cerrado) {
    out.cierre = true;
  }

  const subCerrado = vehicles.some(v => {
    if (v.tipoReloj !== "desglosador") return false;
    return (v.subVehiculos ?? []).some(
      s => s.status === "cumplido" && (s.cierreAt ?? v.cierreAt ?? 0) >= dayStartMs
    );
  });
  if (subCerrado) {
    out.desglosador = true;
  }

  return out;
}

export function buildPrimerDiaSummaryForDoctor(
  items: PrimerDiaItem[],
  manual: Record<string, boolean>,
  auto: Partial<Record<PrimerDiaCheckKey, boolean>>
): string {
  return items
    .map(it => {
      const done = manual[it.key] || auto[it.key];
      return `- ${it.label}: ${done ? "hecho" : "pendiente"}`;
    })
    .join("\n");
}

/** Preguntas rápidas para el Doctor en Jornada */
export const PLANIFICACION_DOCTOR_QUICK_PROMPTS = [
  "¿Por dónde empiezo hoy?",
  "¿Qué es la Escalera de Conciencia?",
  "¿Qué es un segmento?",
  "¿Conquista o Enfoque en La Flota?",
  "¿Cómo funciona el desglosador?",
  "¿Por qué no veo mis subs en termodinámica?",
] as const;

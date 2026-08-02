import { JORNADA_MODULE } from "./jornadaBrand";
import { FLOTA_BRAND, FLOTA_SELECTOR_DISCRIMINATOR } from "./flotaBrand";
import { SISTEMICAR_CATEGORY } from "./sistemicarCategory";

/** base | ritmo | norte — aliases legacy: produccion→ritmo, estudiante→norte */
export type PlanificacionPlanProfile =
  | "base"
  | "ritmo"
  | "norte"
  | "estudiante"
  | "produccion";

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
    case "ritmo":
    case "produccion":
      return "Ritmo del día";
    case "norte":
    case "estudiante":
      return "Norte";
    default:
      return "Jornada Base";
  }
}

const STEPS_BASE: TutorialStep[] = [
  {
    title: `Bienvenido a ${JORNADA_MODULE.title}`,
    description: `${SISTEMICAR_CATEGORY.oneLiner} Empiezas midiendo: lanzas Conquista, cierras unidades y ganas PS.`,
    action: "Siguiente: lanzar tu primera Conquista.",
  },
  {
    title: "Conquista = unidades con veredicto",
    description:
      `${FLOTA_SELECTOR_DISCRIMINATOR} **${FLOTA_BRAND.tiempo.label}** mide cantidad y ritmo. Cada sub se cierra cumplido o fallado. Sin cierre no hay PS.`,
    action: `Lanza un vehículo de ${FLOTA_BRAND.tiempo.label} con algo concreto de hoy.`,
  },
  {
    title: "Cierra para ganar PS",
    description:
      "Una misión solo cuenta cuando la marcas CUMPLIDO o FALLADO. El coraje de intentar también suma puntos.",
    action: "Cierra tu primer vehículo antes de salir.",
  },
  {
    title: "Tu guía: Doctor IA",
    description:
      `En ${JORNADA_MODULE.title} el Doctor responde en modo guía: «¿cómo lanzo Conquista?», «¿qué es PS?». Pregunta con tu duda concreta.`,
    action: "Abre el chat flotante y escribe: «¿Por dónde empiezo hoy?»",
  },
];

const STEPS_RITMO_EXTRA: TutorialStep[] = [
  {
    title: "Segmentos = tu día en tramos",
    description:
      "Mañana, tarde, noche… Cada segmento tiene hora de inicio y fin. Ritmo del día estructura la ventana.",
    action: "Ve a «Plan» y crea o abre tu segmento actual.",
  },
  {
    title: "Situacional / Enfoque",
    description:
      `**${FLOTA_BRAND.situacion.label}** = ring, cupos e imprevistos. Ideal cuando nadie te marca la agenda.`,
    action: "Crea un vehículo Situacional y cierra al menos un bloque.",
  },
];

const STEPS_NORTE_EXTRA: TutorialStep[] = [
  {
    title: "Crisol de pensamientos",
    description:
      "Captura ideas con nido (proyecto/inbox) antes de ejecutar. Ordena la mente sin perder el hilo.",
    action: "Abre el Crisol y captura una idea con destino.",
  },
  {
    title: "Hub Proyectos (último peldaño)",
    description:
      "En Hub Proyectos subes peldaños con pasos de fe. Es el nivel de alto compromiso — horizonte, no urgencia.",
    action: "Desde Jornada → Plan → Hub Proyectos, revisa tu escalera activa.",
  },
];

export function getTutorialSteps(profile: PlanificacionPlanProfile): TutorialStep[] {
  if (profile === "norte" || profile === "estudiante") {
    return [...STEPS_BASE, ...STEPS_RITMO_EXTRA, ...STEPS_NORTE_EXTRA];
  }
  if (profile === "ritmo" || profile === "produccion") {
    return [...STEPS_BASE, ...STEPS_RITMO_EXTRA];
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
  const hasRitmo = profile === "ritmo" || profile === "produccion" || profile === "norte" || profile === "estudiante";
  const hasNorte = profile === "norte" || profile === "estudiante";

  const items: PrimerDiaItem[] = [
    {
      key: "vehiculo",
      label: "Lancé al menos una Conquista en La Flota",
      hint: `${FLOTA_BRAND.tiempo.label}: unidades y ritmo. Base empieza aquí.`,
    },
    {
      key: "cierre",
      label: "Cerré un vehículo (cumplido o fallado)",
      hint: "Sin cierre no hay PS ni veredicto del día.",
    },
    {
      key: "desglosador",
      label: "Cerré al menos un sub de Conquista",
      hint: "Desglosador conquista → subs por unidades.",
      requires: "desglosador",
    },
  ];
  if (hasRitmo) {
    items.unshift({
      key: "segmento",
      label: "Tengo un segmento del día definido (o activo)",
      hint: "Plan → Segmentos: crea mañana/tarde o usa plantilla.",
    });
  }
  if (hasNorte) {
    items.push({
      key: "proyecto",
      label: "Revisé o avancé un peldaño en Hub Proyectos",
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

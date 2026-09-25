/**
 * Oferta pública de SISTEMICAR — una sola voz para bienvenida y onboarding.
 * Los cuatro recintos vivos: Espejo, Depósito, Jornada, Umbral.
 * No mezclar con Alquimia / Historia / “ordenar la mente” (oferta anterior).
 */

export const SISTEMA_OFERTA = {
  eyebrow: "SISTEMICAR",
  headline: "El día no se evapora. Se cierra.",
  subhead:
    "Cuatro recintos. Un sistema que limpia la carga, enseña a ver, mide unidades y entrena el cruce.",
  puente:
    "Espejo limpia. Depósito nombra un ojo. Jornada cierra unidades. Umbral atraviesa el obstáculo con criterio.",
} as const;

export interface SistemaRecinto {
  id: "espejo" | "deposito" | "jornada" | "umbral";
  name: string;
  nameUpper: string;
  ritual: string;
  oneLiner: string;
  detail: string;
  color: string;
  exploreHref: string;
  publicExplore: boolean;
  exploreLabel?: string;
}

export const SISTEMA_RECINTOS: readonly SistemaRecinto[] = [
  {
    id: "espejo",
    name: "Espejo",
    nameUpper: "ESPEJO",
    ritual: "Limpia la carga",
    oneLiner: "Vacías el bloqueo. Sales con protocolo, no con consuelo.",
    detail:
      "Consola táctica: diagnóstico clínico y códigos 1.1–1.10. El Doctor nombra la interferencia y entrega el gesto. Créditos cuando la carga frena — sin suscripción.",
    color: "#EF4444",
    exploreHref: "/espejo",
    publicExplore: true,
    exploreLabel: "Probar Espejo",
  },
  {
    id: "deposito",
    name: "Depósito",
    nameUpper: "DEPÓSITO",
    ritual: "¿Qué aprendí hoy?",
    oneLiner: "Volcás el día crudo. El Muro nombra UN ojo.",
    detail:
      "La Universidad de Sistemicar. No eliges código: tiras el día. Los Diez Ojos diagnostican el centro de gravedad. El techo de aprender es el techo de ver.",
    color: "#F97316",
    exploreHref: "/esperanza",
    publicExplore: false,
  },
  {
    id: "jornada",
    name: "Jornada",
    nameUpper: "JORNADA",
    ritual: "El día termina con un número",
    oneLiner: "Lanzas un bloque. Cierras unidades. Evidencia, no culpa.",
    detail:
      "Motor de cierre consciente por capas: presencia, entrada y producción. Ocupado no cuenta. Base mide lo que cierras hoy — no otra lista infinita.",
    color: "#22C55E",
    exploreHref: "/ventas-jornada",
    publicExplore: true,
    exploreLabel: "Ver Jornada Base",
  },
  {
    id: "umbral",
    name: "Umbral",
    nameUpper: "UMBRAL",
    ritual: "Atraviesa con criterio",
    oneLiner: "10 Códigos. El Maestro es la voz del obstáculo.",
    detail:
      "Entrenador de umbrales: Forja + Arena. Código 1 se prueba con evaluador real. El resto se entrena — no es motivación, es estándar.",
    color: "#D4AF37",
    exploreHref: "/umbral/entrada",
    publicExplore: true,
    exploreLabel: "Probar Código 1",
  },
] as const;

export const SISTEMA_DIA = [
  {
    recinto: "Espejo",
    cuando: "Hay interferencia",
    gesto: "Vaciar la carga y salir con protocolo.",
  },
  {
    recinto: "Depósito",
    cuando: "El día ya ocurrió",
    gesto: "Volcar crudo. Ver qué ojo estaba ciego.",
  },
  {
    recinto: "Jornada",
    cuando: "Hay que producir",
    gesto: "Lanzar un bloque y cerrar unidades.",
  },
  {
    recinto: "Umbral",
    cuando: "El mismo obstáculo se repite",
    gesto: "Entrenar el Código. Cruzar con criterio.",
  },
] as const;

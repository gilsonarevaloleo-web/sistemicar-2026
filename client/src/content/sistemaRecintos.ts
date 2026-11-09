/**
 * Oferta pública de SISTEMICAR — una sola voz para bienvenida y onboarding.
 * Los cuatro recintos vivos: Espejo, Depósito, Jornada, Oficio.
 * No mezclar con Alquimia / Historia / “ordenar la mente” (oferta anterior).
 */

export const SISTEMA_OFERTA = {
  eyebrow: "SISTEMICAR",
  headline: "El día no se evapora. Se cierra.",
  subhead:
    "Cuatro recintos. Un sistema que limpia la carga, enseña a ver, mide unidades y entrena el cruce.",
  puente:
    "Espejo limpia. Depósito nombra un ojo. Jornada cierra unidades. Oficio perfecciona el deber.",
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
    ritual: "Nombra la interferencia",
    oneLiner: "Expresas la queja. Sales con mandato, no con consuelo.",
    detail:
      "Consola táctica: códigos 1.1–1.10 y cinco fases (claridad → gobernador). El sistema clasifica el bloqueo y deja un gesto mínimo y uno máximo.",
    color: "#00FFC3",
    exploreHref: "/espejo/v2",
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
    exploreHref: "/ventas-deposito",
    publicExplore: true,
    exploreLabel: "Probar un volcado",
  },
  {
    id: "jornada",
    name: "Jornada",
    nameUpper: "JORNADA",
    ritual: "El día termina con un número",
    oneLiner: "Lanzas el ring de conquista. Cierras unidades. Evidencia, no culpa.",
    detail:
      "Entrenador de Intención Panorámica. El ring de conquista cierra unidades; el ring de enfoque sella imprevistos. El día termina con un número. Ocupado no cuenta. Base · Ritmo · Norte.",
    color: "#22C55E",
    exploreHref: "/jornada-base",
    publicExplore: true,
    exploreLabel: "Ver Jornada",
  },
  {
    id: "umbral",
    name: "Oficio",
    nameUpper: "OFICIO",
    ritual: "¿Qué se te debe?",
    oneLiner: "Práctica de venta: 10 códigos. El Maestro es la voz del obstáculo.",
    detail:
      "Planeta 5. Forja + Arena. La práctica de venta de 10 códigos vive aquí, no en el 8. Código 1 se prueba con evaluador real. El resto se entrena — no es el límite, no es el gimnasio.",
    color: "#D4AF37",
    exploreHref: "/umbral/entrada",
    publicExplore: true,
    exploreLabel: "Oficio",
  },
] as const;

export const SISTEMA_DIA = [
  {
    recinto: "Espejo",
    cuando: "Hay interferencia",
    gesto: "Nombrar la queja y salir con mandato.",
  },
  {
    recinto: "Depósito",
    cuando: "El día ya ocurrió",
    gesto: "Volcar crudo. Ver qué ojo estaba ciego.",
  },
  {
    recinto: "Jornada",
    cuando: "Hay que producir",
    gesto: "Lanzar el ring de conquista y cerrar unidades.",
  },
  {
    recinto: "Oficio",
    cuando: "El deber salió sin cuenta",
    gesto: "Nombrar qué se te debe. Entrar a los diez códigos.",
  },
] as const;

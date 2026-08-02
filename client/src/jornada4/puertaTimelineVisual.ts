/**
 * Rastro visual de Puertas del Día — presentación pura.
 * Logro / fracaso / foco, sin tocar el engine de atención.
 */
import type { DisciplinaEntrada } from "@/jornada4/disciplinaPlanDia";
import type { SegmentoV5 } from "@/lib/persistence";

export const PUERTA_TIMELINE_COLORS = {
  EMERALD: "#00C851",
  BLOOD: "#FF2A2A",
  GOLD: "#D4AF37",
  INK: "#f1f5f9",
  MUTED: "#a3a3a3",
  DARK: "rgba(10,10,10,0.95)",
  CLOSED_GRAY: "rgba(64,64,64,0.9)",
  BORDER_MUTED: "rgba(115,115,115,0.8)",
} as const;

export type PuertaTimelineKind = "foco" | "logro" | "fracaso" | "pendiente";

export type PuertaTimelineVisual = {
  kind: PuertaTimelineKind;
  backgroundColor: string;
  borderColor: string;
  numberColor: string;
  labelColor: string;
  pulse: boolean;
};

type SegLite = Pick<SegmentoV5, "estado" | "puertaSistema">;
type EntradaLite = Pick<DisciplinaEntrada, "estado" | "contribucionPct">;

/**
 * Prioridad: foco (ventana / activo consciente) > rastro contabilizado > pendiente.
 * El foco siempre se diferencia del logro pasado (oro + pulso vs esmeralda fija).
 */
export function resolvePuertaTimelineVisual(params: {
  seg: SegLite;
  entrada?: EntradaLite | null;
}): PuertaTimelineVisual {
  const { seg, entrada } = params;
  const C = PUERTA_TIMELINE_COLORS;
  const sistemaActivo = seg.estado === "activo" && Boolean(seg.puertaSistema);
  const conscienteActivo = seg.estado === "activo" && !seg.puertaSistema;

  if (conscienteActivo || entrada?.estado === "en_ventana") {
    return {
      kind: "foco",
      backgroundColor: "rgba(212,175,55,0.18)",
      borderColor: C.GOLD,
      numberColor: C.GOLD,
      labelColor: C.GOLD,
      pulse: true,
    };
  }

  if (sistemaActivo || seg.estado === "entropia") {
    return {
      kind: "fracaso",
      backgroundColor: C.BLOOD,
      borderColor: C.BLOOD,
      numberColor: "#0a0a0a",
      labelColor: C.BLOOD,
      pulse: false,
    };
  }

  if (entrada?.estado === "contabilizada") {
    if (entrada.contribucionPct > 0) {
      return {
        kind: "logro",
        backgroundColor: C.EMERALD,
        borderColor: C.EMERALD,
        numberColor: "#0a0a0a",
        labelColor: C.EMERALD,
        pulse: false,
      };
    }
    return {
      kind: "fracaso",
      backgroundColor: C.BLOOD,
      borderColor: C.BLOOD,
      numberColor: "#0a0a0a",
      labelColor: C.BLOOD,
      pulse: false,
    };
  }

  if (seg.estado === "cerrado_manual") {
    // Cierre sin entrada contabilizada (edge): archivo neutro, no rastro de logro.
    return {
      kind: "pendiente",
      backgroundColor: C.CLOSED_GRAY,
      borderColor: C.BORDER_MUTED,
      numberColor: C.INK,
      labelColor: C.MUTED,
      pulse: false,
    };
  }

  return {
    kind: "pendiente",
    backgroundColor: C.DARK,
    borderColor: C.BORDER_MUTED,
    numberColor: C.INK,
    labelColor: C.MUTED,
    pulse: false,
  };
}

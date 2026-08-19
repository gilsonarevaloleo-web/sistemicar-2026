/**
 * Presencia vs Dirección.
 *
 * Presencia cubre el día — siempre abierta, envío rápido, no ensucia la escalera.
 * Dirección (Norte / peldaño) no se reclama con un clic: solo abre si el proyecto
 * tiene oleada activa y un foco de producción. Si no, el operador siente:
 * «No puedes llegar a Dirección porque todavía…»
 *
 * Vincular un proyectoId no es Dirección. El ego no puede comprar Norte.
 */
import type { DestinoCierre } from "./destinoCierre";
import type { OleadaPuntoStatus } from "./oleadaPuntos";

export type DireccionGapId = "sin_proyecto" | "sin_oleada" | "sin_foco";

export type DireccionPeldanoRef = {
  estado: "idea" | "en_curso" | "conquistado";
  origenSegmento?: boolean;
  oleadaPuntos?: Array<{ status: OleadaPuntoStatus }>;
  titulo?: string;
};

export type DireccionProyectoRef = {
  id: string;
  titulo: string;
  oleadaTitulo?: string;
};

export type DireccionGate = {
  proyectoId: string;
  titulo: string;
  ok: boolean;
  gap: DireccionGapId | null;
  /** Empieza por «todavía…» cuando hay hueco. */
  porqueTodavia: string;
  riesgoEnsuciar: string;
};

export const DIRECCION_SIN_PROYECTO: DireccionGate = {
  proyectoId: "",
  titulo: "",
  ok: false,
  gap: "sin_proyecto",
  porqueTodavia: "todavía no hay un proyecto con rumbo",
  riesgoEnsuciar: "",
};

export function noPuedesLlegarADireccion(
  gate: Pick<DireccionGate, "ok" | "porqueTodavia">
): string {
  if (gate.ok) return "";
  return `No puedes llegar a Dirección porque ${gate.porqueTodavia}.`;
}

export function riesgoEnsuciarProyecto(titulo: string): string {
  const name = titulo.trim() || "este proyecto";
  return `Mandar un vehículo a «${name}» entra a la escalera. Si no es el foco, ensucia el proyecto.`;
}

/** Oleada real de dirección: en curso y no sombra de segmento del día. */
export function oleadaDeDireccion(
  peldanos: DireccionPeldanoRef[]
): DireccionPeldanoRef | null {
  return peldanos.find(p => p.estado === "en_curso" && !p.origenSegmento) ?? null;
}

export function evaluateDireccionElegibilidad(
  proyecto: Pick<DireccionProyectoRef, "id" | "titulo">,
  peldanos: DireccionPeldanoRef[]
): DireccionGate {
  const titulo = proyecto.titulo.trim() || "Proyecto";
  const oleada = oleadaDeDireccion(peldanos);
  if (!oleada) {
    return {
      proyectoId: proyecto.id,
      titulo,
      ok: false,
      gap: "sin_oleada",
      porqueTodavia: "todavía no hay oleada activa",
      riesgoEnsuciar: riesgoEnsuciarProyecto(titulo),
    };
  }

  const puntos = oleada.oleadaPuntos ?? [];
  const foco = puntos.find(p => p.status === "avance") ?? puntos.find(p => p.status === "propuesta");
  if (!foco) {
    const porqueTodavia =
      puntos.length === 0
        ? "todavía no hay foco — desglosa la oleada"
        : "todavía no hay un siguiente foco en la oleada";
    return {
      proyectoId: proyecto.id,
      titulo,
      ok: false,
      gap: "sin_foco",
      porqueTodavia,
      riesgoEnsuciar: riesgoEnsuciarProyecto(titulo),
    };
  }

  return {
    proyectoId: proyecto.id,
    titulo,
    ok: true,
    gap: null,
    porqueTodavia: "",
    riesgoEnsuciar: riesgoEnsuciarProyecto(titulo),
  };
}

export function mapDireccionGates(
  proyectos: Array<Pick<DireccionProyectoRef, "id" | "titulo">>,
  peldanosOf: (proyectoId: string) => DireccionPeldanoRef[]
): DireccionGate[] {
  return proyectos.map(p => evaluateDireccionElegibilidad(p, peldanosOf(p.id)));
}

export function direccionAbiertas(gates: DireccionGate[]): DireccionGate[] {
  return gates.filter(g => g.ok);
}

/**
 * Sellar peldaño al lanzar solo si hay dirección viva.
 * Lista libre y rumbo sin oleada/foco quedan en presencia.
 */
export function destinoCierreAlLanzarConGate(opts: {
  esListaLibre: boolean;
  tieneDireccion: boolean;
  direccionAbierta: boolean;
}): DestinoCierre {
  if (opts.esListaLibre) return "presencia";
  if (opts.tieneDireccion && opts.direccionAbierta) return "peldano";
  return "presencia";
}

export type RumboTrasEnvio = {
  stampVehicle: boolean;
  destinoCierre: DestinoCierre;
  proyectoId?: string;
  copy: string;
};

/**
 * Envío del Crisol: rápido siempre.
 * Si el nido no tiene dirección viva, el pensamiento llega — a presencia.
 */
export function resolveRumboTrasEnvio(opts: {
  nidoProyectoId?: string | null;
  gate: DireccionGate;
}): RumboTrasEnvio {
  const nido = opts.nidoProyectoId?.trim();
  if (!nido) {
    return {
      stampVehicle: false,
      destinoCierre: "presencia",
      copy: "Enviado a presencia.",
    };
  }
  if (!opts.gate.ok) {
    return {
      stampVehicle: false,
      destinoCierre: "presencia",
      copy: `Enviado a presencia. ${noPuedesLlegarADireccion(opts.gate)}`.trim(),
    };
  }
  return {
    stampVehicle: true,
    destinoCierre: "peldano",
    proyectoId: nido,
    copy: opts.gate.riesgoEnsuciar,
  };
}

export function resolveClaimDestinoCierre(opts: {
  requested: DestinoCierre;
  proyectoId?: string | null;
  gate: DireccionGate;
}): { destino: DestinoCierre; accepted: boolean; gate: DireccionGate } {
  if (opts.requested !== "peldano") {
    return { destino: "presencia", accepted: true, gate: opts.gate };
  }
  const proyectoId = opts.proyectoId?.trim();
  if (opts.gate.ok && (proyectoId || opts.gate.proyectoId)) {
    return { destino: "peldano", accepted: true, gate: opts.gate };
  }
  return { destino: "presencia", accepted: false, gate: opts.gate };
}

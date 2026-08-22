/**
 * Presencia vs Dirección.
 *
 * Presencia cubre el día — siempre abierta, envío rápido, no ensucia la escalera.
 * Dirección (Norte / peldaño) no se reclama con un clic: solo abre si el proyecto
 * tiene oleada activa y un punto de producción. El punto no caduca con el día
 * ni con un cierre: los envíos se amontonan ahí hasta que el operador cambia
 * el timón. Si no hay rumbo, el operador siente:
 * «No puedes llegar a Dirección porque todavía…»
 *
 * Vincular un proyectoId no es Dirección. El ego no puede comprar Norte.
 */
import type { DestinoCierre } from "./destinoCierre";
import { resolvePuntoProduccion, type OleadaPuntoStatus } from "./oleadaPuntos";

export type DireccionGapId = "sin_proyecto" | "sin_oleada" | "sin_foco";

export type DireccionPeldanoRef = {
  estado: "idea" | "en_curso" | "conquistado";
  origenSegmento?: boolean;
  oleadaPuntos?: Array<{
    id?: string;
    titulo?: string;
    status: OleadaPuntoStatus;
    numero?: number;
    createdAt?: number;
  }>;
  titulo?: string;
  puntoProduccionId?: string;
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
  /** Timón: a dónde se amontonan los envíos. No caduca. */
  puntoProduccionId?: string;
  puntoProduccionTitulo?: string;
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

export function riesgoAmontonarEnPunto(puntoTitulo: string): string {
  const name = puntoTitulo.trim() || "este punto";
  return `Los envíos se amontonan en «${name}» hasta que cambies el punto de producción.`;
}

export function rumboChipLabel(
  gate: Pick<DireccionGate, "titulo" | "puntoProduccionTitulo">
): string {
  const punto = gate.puntoProduccionTitulo?.trim();
  return punto ? `${gate.titulo} · ${punto}` : gate.titulo;
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
  if (puntos.length === 0) {
    return {
      proyectoId: proyecto.id,
      titulo,
      ok: false,
      gap: "sin_foco",
      porqueTodavia: "todavía no hay punto de producción — desglosa la oleada",
      riesgoEnsuciar: riesgoEnsuciarProyecto(titulo),
    };
  }

  const pin = resolvePuntoProduccion({
    puntoProduccionId: oleada.puntoProduccionId,
    oleadaPuntos: puntos.map((p, i) => ({
      id: p.id ?? `op_${i}`,
      numero: p.numero ?? i + 1,
      titulo: p.titulo ?? "",
      status: p.status,
      createdAt: p.createdAt ?? i,
      updatedAt: p.createdAt ?? i,
    })),
  });

  return {
    proyectoId: proyecto.id,
    titulo,
    ok: true,
    gap: null,
    porqueTodavia: "",
    riesgoEnsuciar: riesgoAmontonarEnPunto(pin?.titulo ?? "este punto"),
    puntoProduccionId: pin?.id,
    puntoProduccionTitulo: pin?.titulo,
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
 * Lista libre y rumbo sin oleada/punto quedan en presencia.
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
  oleadaPuntoId?: string;
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
    oleadaPuntoId: opts.gate.puntoProduccionId,
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

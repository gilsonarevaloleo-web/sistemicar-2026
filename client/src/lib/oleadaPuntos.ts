/**
 * Desglose de oleada = propuesta futura (ordenamiento mental).
 * Producción = realidad (vehículos).
 * La maestría: sintonizar la propuesta con la producción hasta que
 * la propuesta tome el control — sin orden rígido de cumplimiento.
 */

export type OleadaPuntoStatus = "propuesta" | "avance" | "cumplido" | "fallado";

export interface OleadaPunto {
  id: string;
  /** Orden de producción propuesto (1-based). Editable vía reordenar/borrar/añadir. */
  numero: number;
  titulo: string;
  status: OleadaPuntoStatus;
  /** Señal de realidad: último vehículo que tocó este punto. */
  lastVehicleId?: string;
  lastSyncedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export const OLEADA_PUNTO_STATUS_CYCLE: OleadaPuntoStatus[] = [
  "propuesta",
  "avance",
  "cumplido",
  "fallado",
];

export const OLEADA_PUNTO_STATUS_LABEL: Record<OleadaPuntoStatus, string> = {
  propuesta: "Propuesta",
  avance: "Avance",
  cumplido: "Cumplido",
  fallado: "Fallado",
};

export function sortOleadaPuntos(puntos: OleadaPunto[]): OleadaPunto[] {
  return [...puntos].sort((a, b) => a.numero - b.numero || a.createdAt - b.createdAt);
}

/** Renumerar 1..n tras añadir/borrar/reordenar — la propuesta se reordena libremente. */
export function renumberOleadaPuntos(puntos: OleadaPunto[]): OleadaPunto[] {
  return sortOleadaPuntos(puntos).map((p, i) =>
    p.numero === i + 1 ? p : { ...p, numero: i + 1, updatedAt: Date.now() }
  );
}

/**
 * Punto de producción = timón.
 * No caduca con el día ni con un cierre. Los envíos se amontonan aquí
 * hasta que el operador marca otro punto (cambio consciente de dirección).
 */
export function resolvePuntoProduccion(oleada: {
  puntoProduccionId?: string | null;
  oleadaPuntos?: Array<Pick<OleadaPunto, "id" | "numero" | "titulo" | "status" | "createdAt">>;
}): OleadaPunto | null {
  const puntos = sortOleadaPuntos((oleada.oleadaPuntos ?? []) as OleadaPunto[]);
  if (puntos.length === 0) return null;
  const pin = oleada.puntoProduccionId?.trim();
  if (pin) {
    const hit = puntos.find(p => p.id === pin);
    if (hit) return hit;
  }
  return puntos[0] ?? null;
}

export function nextPuntoProduccionIdAfterDelete(
  oleada: { puntoProduccionId?: string | null; oleadaPuntos?: OleadaPunto[] },
  deletedId: string
): string | undefined {
  const remaining = sortOleadaPuntos(oleada.oleadaPuntos ?? []).filter(p => p.id !== deletedId);
  if (remaining.length === 0) return undefined;
  if (oleada.puntoProduccionId && oleada.puntoProduccionId !== deletedId) {
    return oleada.puntoProduccionId;
  }
  return remaining[0]?.id;
}

/** Un cierre de vehículo no conquista el punto: solo señala que hay producción. */
export function capSintoniaDesdeProduccion(sugerido: OleadaPuntoStatus): OleadaPuntoStatus {
  if (sugerido === "cumplido" || sugerido === "fallado") return "avance";
  return sugerido;
}

/** @deprecated Preferir resolvePuntoProduccion — el timón no caduca al cumplir un día. */
export function getFocoOleadaPunto(puntos: OleadaPunto[]): OleadaPunto | null {
  const sorted = sortOleadaPuntos(puntos);
  const avance = sorted.find(p => p.status === "avance");
  if (avance) return avance;
  const propuesta = sorted.find(p => p.status === "propuesta");
  if (propuesta) return propuesta;
  return null;
}

export function summarizeOleadaPuntos(puntos: OleadaPunto[]): {
  total: number;
  propuesta: number;
  avance: number;
  cumplido: number;
  fallado: number;
} {
  const out = { total: puntos.length, propuesta: 0, avance: 0, cumplido: 0, fallado: 0 };
  for (const p of puntos) {
    out[p.status] += 1;
  }
  return out;
}

export function nextOleadaPuntoStatus(current: OleadaPuntoStatus): OleadaPuntoStatus {
  const idx = OLEADA_PUNTO_STATUS_CYCLE.indexOf(current);
  return OLEADA_PUNTO_STATUS_CYCLE[(idx + 1) % OLEADA_PUNTO_STATUS_CYCLE.length]!;
}

export function createOleadaPunto(titulo: string, numero: number, now = Date.now()): OleadaPunto {
  return {
    id: `op_${now}_${Math.random().toString(36).slice(2, 7)}`,
    numero,
    titulo: titulo.trim(),
    status: "propuesta",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Inferencia suave desde producción — sugiere estatus, no impone cumplimiento estricto.
 * El usuario puede editar/borrar después; eso es parte del ordenamiento mental.
 */
export function inferOleadaPuntoStatusFromProduccion(input: {
  tipoOrigen: "tiempo" | "situacion";
  /** Subs conquista (tiempo). */
  subStatuses?: Array<"pendiente" | "activo" | "cumplido" | "fallado" | string>;
  /** Resultados situación. */
  situacionResultados?: Array<"pendiente" | "cumplido" | "fallado" | "avance" | string>;
  vehicleStatus?: "cumplido" | "archivado" | string;
}): OleadaPuntoStatus {
  if (input.tipoOrigen === "tiempo") {
    const subs = input.subStatuses ?? [];
    if (subs.length === 0) {
      return input.vehicleStatus === "archivado" ? "fallado" : "cumplido";
    }
    const cerrados = subs.filter(s => s === "cumplido" || s === "fallado");
    if (cerrados.length === 0) return "avance";
    if (cerrados.every(s => s === "cumplido")) return "cumplido";
    if (cerrados.every(s => s === "fallado")) return "fallado";
    return "avance";
  }

  const rows = input.situacionResultados ?? [];
  if (rows.length === 0) {
    return input.vehicleStatus === "archivado" ? "fallado" : "cumplido";
  }
  const activos = rows.filter(r => r !== "pendiente");
  if (activos.length === 0) return "avance";
  if (activos.every(r => r === "cumplido")) return "cumplido";
  if (activos.every(r => r === "fallado")) return "fallado";
  if (activos.some(r => r === "avance")) return "avance";
  return "avance";
}

/**
 * Aplica señal de producción al punto sin bloquear edición posterior.
 * Si el punto ya estaba cumplido/fallado por decisión manual, solo refuerza
 * si la producción confirma o si aún era propuesta/avance.
 */
export function sintonizarOleadaPunto(
  punto: OleadaPunto,
  sugerido: OleadaPuntoStatus,
  vehicleId?: string,
  now = Date.now()
): OleadaPunto {
  let next = sugerido;
  // No degradar un cumplido manual a avance por un cierre parcial ruidoso.
  if (punto.status === "cumplido" && sugerido === "avance") {
    next = "cumplido";
  }
  return {
    ...punto,
    status: next,
    lastVehicleId: vehicleId ?? punto.lastVehicleId,
    lastSyncedAt: now,
    updatedAt: now,
  };
}

import type { RecintoAjeno, RecintoConteo } from "./types.ts";

export function crearRecinto(params: {
  id: string;
  texto: string;
  fecha: string;
  entraAt: number;
  saleAt: number;
}): RecintoAjeno {
  const texto = params.texto.trim();
  if (!texto) {
    throw new Error("El recinto necesita un texto.");
  }
  if (params.saleAt <= params.entraAt) {
    throw new Error("La hora de salida tiene que ser después de la entrada.");
  }
  return {
    id: params.id,
    texto,
    fecha: params.fecha,
    entraAt: params.entraAt,
    saleAt: params.saleAt,
    estado: "dentro",
  };
}

/** El sistema marca lastre. No puede dejar estado "salio". */
export function tickRecinto(r: RecintoAjeno, nowMs: number): RecintoAjeno {
  if (r.estado !== "dentro") return r;
  if (nowMs < r.saleAt) return r;
  return {
    ...r,
    estado: "heredado",
    cerradoAt: nowMs,
    cerradoPor: "sistema",
  };
}

export function tickRecintos(list: RecintoAjeno[], nowMs: number): RecintoAjeno[] {
  let changed = false;
  const next = list.map((r) => {
    const t = tickRecinto(r, nowMs);
    if (t !== r) changed = true;
    return t;
  });
  return changed ? next : list;
}

/** Solo el operador saca lo ajeno. */
export function cerrarRecintoOperador(r: RecintoAjeno, nowMs: number): RecintoAjeno {
  if (r.estado !== "dentro") return r;
  return {
    ...r,
    estado: "salio",
    cerradoAt: nowMs,
    cerradoPor: "operador",
  };
}

export function contarRecintos(list: RecintoAjeno[], fecha?: string): RecintoConteo {
  const scoped = fecha ? list.filter((r) => r.fecha === fecha) : list;
  return {
    abiertos: scoped.filter((r) => r.estado === "dentro").length,
    cerrados: scoped.filter((r) => r.estado === "salio").length,
    heredados: scoped.filter((r) => r.estado === "heredado").length,
  };
}

export function horaSalidaPorDefecto(entraAt: number, extraMin = 60): number {
  return entraAt + extraMin * 60_000;
}

/**
 * Clasificación de minutos de un vehículo hacia proyecto(s).
 *
 * Dedicado: el desglosador (o misión) apunta a un solo proyecto — el sello
 * entero viaja al timón / ledger de ese proyecto.
 * Combinado: filas o unidades con proyecto distinto — se parte por minutos
 * medidos. Lo que no tiene proyecto no ensucia un timón ajeno.
 *
 * 30 min en la mañana + 15 min en la noche = 45 min en el mismo proyecto.
 * La suma es de vehículos (nombres + minutos), no de horas repetidas.
 */
import {
  trabajoMinutosReales,
  type TimonVehiculoFuente,
} from "./timonHoras";

export type ModoClasificacionTiempo = "dedicado" | "combinado" | "sin_proyecto";

export type ParteTiempoProyecto = {
  proyectoId: string;
  minutos: number;
  titulo: string;
};

export type TiempoClasificado = {
  vehicleId: string;
  titulo: string;
  modo: ModoClasificacionTiempo;
  minutos: number;
  proyectoId?: string;
  oleadaPuntoId?: string;
  partes: ParteTiempoProyecto[];
};

export type SubTiempoFuente = {
  titulo?: string;
  proyectoId?: string;
  duracionRealSec?: number;
  duracionFinal?: number;
};

function roundMinFromSec(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.max(1, Math.round(sec / 60));
}

function distinctProyectoIds(subs: SubTiempoFuente[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const s of subs) {
    const id = (s.proyectoId ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function partesDesdeSubs(
  subs: SubTiempoFuente[],
  fallbackTitulo: string
): ParteTiempoProyecto[] {
  const byId = new Map<string, ParteTiempoProyecto>();
  for (const s of subs) {
    const pid = (s.proyectoId ?? "").trim();
    if (!pid) continue;
    const sec =
      typeof s.duracionRealSec === "number" && s.duracionRealSec > 0
        ? s.duracionRealSec
        : typeof s.duracionFinal === "number" && s.duracionFinal > 0
          ? s.duracionFinal
          : 0;
    const minutos = roundMinFromSec(sec);
    if (minutos <= 0) continue;
    const prev = byId.get(pid);
    const titulo = (s.titulo ?? "").trim() || fallbackTitulo;
    if (prev) {
      prev.minutos += minutos;
    } else {
      byId.set(pid, { proyectoId: pid, minutos, titulo });
    }
  }
  return [...byId.values()];
}

/**
 * ¿El vehículo mezcla proyectos en sus filas/unidades?
 * Si no hay sello de punto, no debe copiarse al timón actual.
 */
export function vehiculoEsCombinado(
  v: Pick<TimonVehiculoFuente, "proyectoId" | "subTareas" | "subVehiculos">
): boolean {
  const filas = v.subTareas ?? [];
  const unidades = v.subVehiculos ?? [];
  const ids = distinctProyectoIds([...filas, ...unidades]);
  if (ids.length > 1) return true;
  const vehiclePid = (v.proyectoId ?? "").trim();
  if (ids.length === 1 && vehiclePid && ids[0] !== vehiclePid) return true;
  return false;
}

/**
 * Parte el trabajo medido. Dedicado → una parte. Combinado → una por proyecto.
 * Sin proyecto → minutos visibles pero sin destino (no se pintan en un timón).
 */
export function clasificarTiempoVehiculo(
  v: TimonVehiculoFuente,
  now = Date.now()
): TiempoClasificado {
  const vehicleId = (v.id ?? "").trim();
  const titulo = (v.titulo ?? "").trim() || "Vehículo";
  const oleadaPuntoId = v.oleadaPuntoId?.trim();
  const proyectoId = (v.proyectoId ?? "").trim() || undefined;
  const minutos = trabajoMinutosReales(v, now);
  const filas = v.subTareas ?? [];
  const unidades = v.subVehiculos ?? [];
  const combinado = vehiculoEsCombinado(v);

  if (combinado) {
    const partes = partesDesdeSubs([...filas, ...unidades], titulo);
    const sumPartes = partes.reduce((n, p) => n + p.minutos, 0);
    return {
      vehicleId,
      titulo,
      modo: "combinado",
      minutos: sumPartes > 0 ? sumPartes : minutos,
      proyectoId,
      oleadaPuntoId,
      partes,
    };
  }

  if (!proyectoId) {
    return {
      vehicleId,
      titulo,
      modo: "sin_proyecto",
      minutos,
      oleadaPuntoId,
      partes: [],
    };
  }

  return {
    vehicleId,
    titulo,
    modo: "dedicado",
    minutos,
    proyectoId,
    oleadaPuntoId,
    partes: minutos > 0 ? [{ proyectoId, minutos, titulo }] : [],
  };
}

/**
 * Minutos de un proyecto = suma de partes (combinado) o del sello dedicado.
 * Fragmentos del mismo proyecto se acumulan: 30 + 15 = 45.
 */
export function minutosDeProyecto(
  clasificados: TiempoClasificado[],
  proyectoId: string
): number {
  const pid = proyectoId.trim();
  if (!pid) return 0;
  let total = 0;
  for (const c of clasificados) {
    if (c.partes.length > 0) {
      for (const p of c.partes) {
        if (p.proyectoId === pid) total += p.minutos;
      }
    } else if (c.proyectoId === pid && c.modo === "dedicado") {
      total += c.minutos;
    }
  }
  return total;
}

export function ledgerNombresMinutos(
  clasificados: TiempoClasificado[],
  proyectoId: string
): { titulo: string; minutos: number; vehicleId: string }[] {
  const pid = proyectoId.trim();
  const out: { titulo: string; minutos: number; vehicleId: string }[] = [];
  for (const c of clasificados) {
    const partes = c.partes.filter(p => p.proyectoId === pid);
    if (partes.length === 0) continue;
    const minutos = partes.reduce((n, p) => n + p.minutos, 0);
    if (minutos <= 0) continue;
    out.push({ titulo: c.titulo, minutos, vehicleId: c.vehicleId });
  }
  return out;
}

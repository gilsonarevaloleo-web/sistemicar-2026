/**
 * Dirección de proyecto — cascada anti-ruido.
 *
 * Prioridad: sub (unidad/fila) > vehículo (desglosador/misión) > segmento.
 * Así solo cuentan en el Hub/peldaños las ejecuciones del proyecto correcto,
 * aunque el segmento tenga otro vínculo por defecto.
 */
import type { SegmentoV5, SubTarea, SubVehiculo, Vehicle } from "./persistence";

export type DireccionProyectoCtx = {
  subProyectoId?: string | null;
  vehicleProyectoId?: string | null;
  segmentoProyectoId?: string | null;
};

export function resolveDireccionProyecto(ctx: DireccionProyectoCtx): string | undefined {
  const sub = ctx.subProyectoId?.trim();
  if (sub) return sub;
  const veh = ctx.vehicleProyectoId?.trim();
  if (veh) return veh;
  const seg = ctx.segmentoProyectoId?.trim();
  if (seg) return seg;
  return undefined;
}

export function resolveDireccionDesdeEntidades(opts: {
  sub?: Pick<SubTarea, "proyectoId"> | Pick<SubVehiculo, "proyectoId"> | null;
  vehicle?: Pick<Vehicle, "proyectoId"> | null;
  segmento?: Pick<SegmentoV5, "proyectoVinculadoId"> | null;
}): string | undefined {
  return resolveDireccionProyecto({
    subProyectoId: opts.sub && "proyectoId" in opts.sub ? opts.sub.proyectoId : undefined,
    vehicleProyectoId: opts.vehicle?.proyectoId,
    segmentoProyectoId: opts.segmento?.proyectoVinculadoId,
  });
}

/** Etiqueta corta para UI (herencia). */
export function direccionHerenciaLabel(resolved: string | undefined, ctx: DireccionProyectoCtx): string {
  if (!resolved) return "Sin dirección";
  const sub = ctx.subProyectoId?.trim();
  if (sub && sub === resolved) return "Dirección del sub";
  const veh = ctx.vehicleProyectoId?.trim();
  if (veh && veh === resolved) return "Dirección del vehículo";
  return "Dirección del segmento";
}

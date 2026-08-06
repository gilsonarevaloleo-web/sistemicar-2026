import type { SegmentoV5, TipoFlota, Vehicle } from "./persistence";
import { registrarActividadFlotaEnProyecto } from "./proyectos";

const EJE_SALUD_KEYWORDS = [
  "salud",
  "recuperación",
  "recuperacion",
  "descanso",
  "sueño",
  "sueno",
  "bienestar",
  "reposo",
  "meditación",
  "meditacion",
  "yoga",
  "spa",
  "almuerzo",
  "comida",
  "break",
];

function normalizarNombreSegmento(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Segmento orientado a salud / recuperación: prioriza flota Descanso. */
export function segmentoEsEjeSaludRecuperacion(seg: SegmentoV5 | null | undefined): boolean {
  if (!seg?.nombre) return false;
  const n = normalizarNombreSegmento(seg.nombre);
  return EJE_SALUD_KEYWORDS.some(k => n.includes(normalizarNombreSegmento(k)));
}

/** Orden de los 4 vehículos según el segmento activo. */
export function ordenFlotaParaSegmento(seg: SegmentoV5 | null): TipoFlota[] {
  if (seg && segmentoEsEjeSaludRecuperacion(seg)) {
    return ["descanso", "tiempo", "situacion", "verdad"];
  }
  return ["tiempo", "situacion", "descanso", "verdad"];
}

export function resolverProyectoIdVehiculo(
  segmentoActivo: SegmentoV5 | null,
  launchCtx: { proyectoId: string; peldanoId?: string } | null
): string | undefined {
  if (launchCtx?.proyectoId) return launchCtx.proyectoId;
  return segmentoActivo?.proyectoVinculadoId || undefined;
}

/**
 * Peldaño al que se amarra el vehículo.
 * Hub (idea/oleada) gana; si no, la sombra del segmento del día (para sellar puerta).
 */
export function resolverPeldanoIdVehiculo(
  segmentoActivo: SegmentoV5 | null,
  launchCtx: { proyectoId?: string; peldanoId?: string } | null
): string | undefined {
  const fromHub = launchCtx?.peldanoId?.trim();
  if (fromHub) return fromHub;
  return segmentoActivo?.proyectoPeldanoId || undefined;
}

/** Registra cronómetros, PS y cierres en el Hub del proyecto vinculado al segmento. */
export async function volcarMetricasVehiculoAlHub(
  userId: string,
  vehicle: Vehicle,
  segmentoActivo: SegmentoV5 | null,
  opts: { ps?: number; minutos?: number } = {}
): Promise<void> {
  const proyectoId = vehicle.proyectoId ?? segmentoActivo?.proyectoVinculadoId;
  if (!proyectoId || vehicle.proyectoPeldanoId) return;

  const ejeSalud = segmentoActivo ? segmentoEsEjeSaludRecuperacion(segmentoActivo) : false;
  const tipoFlotaReal = vehicle.tipoFlota ?? "tiempo";
  const tipoRegistroHub: TipoFlota = ejeSalud ? "descanso" : tipoFlotaReal;

  await registrarActividadFlotaEnProyecto(userId, proyectoId, {
    tipoFlota: tipoRegistroHub,
    tipoFlotaReal,
    minutos: opts.minutos ?? vehicle.duracionFinal ?? 0,
    ps: opts.ps ?? 0,
    segmentoId: vehicle.segmentoId ?? segmentoActivo?.id,
    segmentoNombre: vehicle.segmentoOrigen ?? segmentoActivo?.nombre,
    vehicleId: vehicle.id,
    ejeSaludRecuperacion: ejeSalud,
  });
}

import { type MutableRefObject } from "react";
import { toast } from "sonner";
import {
  type CriterioFin,
  type Planilla,
  type SegmentoV5,
  type TipoFlota,
  type TipoTerminoRapido,
  type Vehicle,
} from "@/lib/persistence";
import {
  buildOptimisticVehicleShell,
  newFlotaLaunchIds,
  paintFlotaLaunchOptimistic,
  scheduleFlotaLaunchPillarShadow,
  scheduleFlotaLaunchShadow,
} from "@/lib/flotaLaunchMs0";
import {
  releaseCentinela,
  resetCentinelaLaunchGate,
} from "@/lib/centinelaEngine";
import { resolveSegmentoForVehicleAt } from "@/lib/segmentVehicleAssign";
import { getLimaDayStartMs } from "@/lib/segmentTime";
import {
  assertCanOpenVehicle,
  formatOperationalSlotsBlockMessage,
  launchKindFromFlota,
} from "@/lib/vehicleOperationalSlots";
import {
  FLOTA_CONFIG,
  buildDesglosadorSubFromForm,
  PIZARRA,
  BLOOD,
  GOLD,
} from "@/components/flota/vehicleCardShared";
import { COMPONENTES, registrarEvento } from "@/lib/evento-universal";

const STUB_EJES = {
  enfoque: { text: "", trifecta: "omitir" as const },
  conflicto: { text: "", trifecta: "omitir" as const },
  pasos: { text: "", trifecta: "omitir" as const },
  limite: { text: "", trifecta: "omitir" as const },
};

function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function isNearDescanso(planilla: Planilla | null): boolean {
  if (!planilla) return false;
  const nowMin = getCurrentTimeMinutes();
  return planilla.segmentos.some(seg => {
    const name = seg.nombre.toLowerCase();
    const isDescanso =
      name.includes("descanso") ||
      name.includes("almuerzo") ||
      name.includes("comida") ||
      name.includes("break");
    if (!isDescanso) return false;
    const segStart = timeStringToMinutes(seg.horaInicio);
    return segStart - nowMin > 0 && segStart - nowMin <= 15;
  });
}

export type DesglosadorSubFormRow = {
  tempId: string;
  titulo: string;
  cantidadObjetivo: string;
  tiempoRecordMinPerUnit?: number;
  /** Dirección de proyecto de esta unidad (opcional). */
  proyectoId?: string;
};

/** `rapido` = independientes (conquista: unidades sin secuencia; enfoque: lista libre). `desglose` = desglosador/ring. */
export type FlotaLaunchModo = "rapido" | "desglose";

export type FlotaLaunchForm = {
  titulo: string;
  tipoFlota: "tiempo" | "situacion";
  terminoDetalle?: string;
  /** Default: desglose si hay subs; si se pasa explícito, manda. */
  modo?: FlotaLaunchModo;
  desglosadorSubs?: DesglosadorSubFormRow[];
  /** Conquista rápido: unidades de la tarea independiente (el título ES la tarea). */
  cantidadObjetivo?: number;
  tiempoRecordMinPerUnit?: number;
  /**
   * Dirección del vehículo (desglosador/misión).
   * Si se omite, hereda del segmento activo vía resolverProyectoId.
   */
  proyectoId?: string;
  /**
   * Semilla situacional (ring o lista libre) incluida en el paint + remote del launch.
   * Evita persistir un shell sin cronómetro/filas si el usuario sale al instante.
   */
  situacionLaunchSeed?: {
    subTareas: NonNullable<Vehicle["subTareas"]>;
    situacionCronometro: Vehicle["situacionCronometro"] | null;
    situacionCupoAnchor: Vehicle["situacionCupoAnchor"] | null;
  };
};

export type ExecuteFlotaLaunchParams = {
  userId: string;
  form: FlotaLaunchForm;
  vehiclesRef: MutableRefObject<Vehicle[]>;
  setVehicles: (update: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  setExpandedId: (id: string | null) => void;
  planilla: Planilla | null;
  segmentoActivo: SegmentoV5 | null;
  resolverProyectoId: (launchCtx: { proyectoId: string; peldanoId?: string } | null) => string | undefined;
  applyCentinelaArchiveLocally: (cierreAt: number) => void;
  safeAwardPS: (points: number, reason: string) => void | Promise<void | boolean>;
  recordVehiculoInicio: (
    vehicleId: string,
    banda?: "fluido" | "concentrado" | "limite"
  ) => void;
  scrollFlotaActivosIntoView: () => void;
  optimisticVehiclesRef: MutableRefObject<Vehicle[]>;
  ghostReconcileRef: MutableRefObject<(() => void) | null | undefined>;
  lastLaunchRef: MutableRefObject<{ key: string; at: number } | null>;
};

/** Lanzamiento mínimo Conquista (desglosador) / Enfoque — ms0 sin await Firebase. */
export async function executeFlotaLaunch(params: ExecuteFlotaLaunchParams): Promise<string | null> {
  const {
    userId,
    form,
    vehiclesRef,
    setVehicles,
    setExpandedId,
    planilla,
    segmentoActivo,
    resolverProyectoId,
    applyCentinelaArchiveLocally,
    safeAwardPS,
    scrollFlotaActivosIntoView,
    optimisticVehiclesRef,
    lastLaunchRef,
  } = params;

  const titulo = form.titulo.trim();
  if (!titulo) {
    toast.error("Escribe un título para la misión");
    return null;
  }

  const tipoFlota = form.tipoFlota;
  const slotsCheck = assertCanOpenVehicle(vehiclesRef.current, launchKindFromFlota(tipoFlota));
  if (!slotsCheck.allowed) {
    toast.error("Límite de misiones", {
      description: formatOperationalSlotsBlockMessage(slotsCheck),
      style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      duration: 5500,
    });
    return null;
  }

  const launchKey = `${titulo}|${tipoFlota}`;
  const launchNow = Date.now();
  const last = lastLaunchRef.current;
  if (last?.key === launchKey && launchNow - last.at < 2000) return null;
  lastLaunchRef.current = { key: launchKey, at: launchNow };

  resetCentinelaLaunchGate();
  try {
    const cierreAt = Date.now();
    applyCentinelaArchiveLocally(cierreAt);

    const flotaConfig = FLOTA_CONFIG[tipoFlota];
    let detalle = "";
    let criterio: CriterioFin = "circunstancia";
    let tipoTermino: TipoTerminoRapido = "situacion";
    const desglosadorSubs = (form.desglosadorSubs ?? []).filter(s => s.titulo.trim());
    const modo: FlotaLaunchModo = form.modo ?? "desglose";
    const esDesglose = modo === "desglose";
    // Conquista rápido = producción por unidades (tarea = título, sin secuencia).
    const relojTiempo =
      tipoFlota === "tiempo"
        ? esDesglose
          ? ("desglosador" as const)
          : ("produccion" as const)
        : undefined;

    if (tipoFlota === "tiempo") {
      criterio = "tiempo";
      tipoTermino = "hora";
      detalle = form.terminoDetalle?.trim() || "";
    } else {
      criterio = "circunstancia";
      tipoTermino = "situacion";
      detalle = form.terminoDetalle?.trim() || "Al cerrar este bloque";
    }

    if (tipoFlota === "tiempo" && esDesglose && desglosadorSubs.length === 0) {
      toast.error("Añade al menos un sub al desglosador");
      return null;
    }

    if (tipoFlota === "tiempo" && !esDesglose) {
      const cant = form.cantidadObjetivo;
      if (!(cant != null && Number.isFinite(cant) && cant > 0)) {
        toast.error("Indica las unidades de la tarea rápida");
        return null;
      }
    }

    const bonoTemple = isNearDescanso(planilla);
    const launchAtMs = Date.now();
    const dayStartLaunch = getLimaDayStartMs(launchAtMs);
    const segResuelto = planilla
      ? resolveSegmentoForVehicleAt(planilla.segmentos, launchAtMs, dayStartLaunch)
      : null;
    const segActualNombre = segResuelto?.nombre ?? segmentoActivo?.nombre ?? undefined;
    const segActualId = segResuelto?.id ?? segmentoActivo?.id;
    const resolvedProyectoId = resolverProyectoId(
      form.proyectoId?.trim()
        ? { proyectoId: form.proyectoId.trim() }
        : null
    );

    const { provisionalId: newVehicleId, clientRequestId: newClientRequestId } = newFlotaLaunchIds();

    const situacionSeed =
      tipoFlota === "situacion" && form.situacionLaunchSeed
        ? form.situacionLaunchSeed
        : null;

    const vehiclePayload = {
      titulo,
      criterioFin: criterio,
      criterioDetalle: detalle,
      tiempoInicio: new Date(),
      ejes: STUB_EJES,
      tipoTerminoRapido: tipoTermino,
      tipoFlota,
      aperturaAt: Date.now(),
      bonoTemple,
      tipoReloj: relojTiempo,
      subVehiculos:
        relojTiempo === "desglosador"
          ? desglosadorSubs.map((s, idx) => buildDesglosadorSubFromForm(s, idx, Date.now()))
          : undefined,
      ...(relojTiempo === "produccion" && form.cantidadObjetivo != null
        ? {
            cantidadObjetivo: form.cantidadObjetivo,
            ...(form.tiempoRecordMinPerUnit != null && form.tiempoRecordMinPerUnit > 0
              ? {
                  recordSugerido: form.tiempoRecordMinPerUnit,
                  tiempoElegido: form.tiempoRecordMinPerUnit,
                }
              : {}),
          }
        : {}),
      ...(situacionSeed
        ? {
            subTareas: situacionSeed.subTareas,
            situacionCronometro: situacionSeed.situacionCronometro,
            situacionCupoAnchor: situacionSeed.situacionCupoAnchor,
          }
        : {}),
      ...(resolvedProyectoId ? { proyectoId: resolvedProyectoId } : {}),
      segmentoOrigen: segActualNombre,
      segmentoId: segActualId,
      segmentosCruzados: 0,
    };

    const optimisticVehicle = buildOptimisticVehicleShell(
      { ...vehiclePayload, id: newVehicleId, clientRequestId: newClientRequestId },
      userId
    );

    paintFlotaLaunchOptimistic({
      userId,
      optimisticVehicle,
      vehiclesRef,
      optimisticVehiclesRef,
      setVehicles,
      setExpandedId,
      expandIfSituacion: true,
      scrollFlotaActivosIntoView,
    });

    const launchTitle = titulo;
    const launchLabel = flotaConfig.label;
    const launchPs = flotaConfig.psCierre;
    const launchColor = flotaConfig.color;
    const showTemple = bonoTemple;
    requestAnimationFrame(() => {
      toast.success(`"${launchTitle}" lanzado · ${launchLabel}`, {
        description: launchPs,
        style: { backgroundColor: PIZARRA, border: `1px solid ${launchColor}`, color: launchColor },
      });
      if (showTemple) {
        toast.success("VOLUNTAD SOBRE EL HORARIO +10 PS", {
          description: "Iniciaste en los últimos 15 min antes del descanso",
          style: { backgroundColor: PIZARRA, border: `2px solid ${GOLD}`, color: GOLD },
          duration: 4000,
        });
      }
    });
    registrarEvento(COMPONENTES.PLANIFICACION);

    scheduleFlotaLaunchShadow({
      userId,
      vehiclePayload,
      provisionalId: newVehicleId,
      clientRequestId: newClientRequestId,
      vehiclesSnapshot: vehiclesRef.current,
    });

    scheduleFlotaLaunchPillarShadow({
      bonoTemple,
      titulo,
      vehicleId: newVehicleId,
      safeAwardPS,
    });

    return newVehicleId;
  } catch (err) {
    console.error("[executeFlotaLaunch]", err);
    toast.error("Error al guardar vehículo", {
      description: "Revisa la conexión o libera espacio en el navegador.",
      style: { backgroundColor: PIZARRA, border: `1px solid ${BLOOD}`, color: BLOOD },
      duration: 5000,
    });
    return null;
  } finally {
    releaseCentinela();
  }
}

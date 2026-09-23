/**
 * Secuencia vertical de cobertura — un nodo por segmento del plan.
 * Presentación pura: no escribe, no tickea, no toca el motor de conciencia.
 */
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { segmentTimeToMinutes } from "@/lib/segmentTime";

export type CoberturaTimelineKind =
  | "activo"
  | "cubierto"
  | "pendiente"
  | "hueco"
  | "cerrado";

export type CoberturaTimelineNode = {
  id: string;
  segmentoId: string;
  kind: CoberturaTimelineKind;
  title: string;
  timeLabel: string;
  detail?: string;
  startMin: number;
};

function vehicleOnSegment(vehicles: Vehicle[], seg: SegmentoV5): Vehicle | undefined {
  return vehicles.find(v => {
    if (v.autoVerdad) return false;
    if (v.segmentoId === seg.id || v.segmentoMontadoId === seg.id) return true;
    return false;
  });
}

function activeCover(vehicles: Vehicle[]): Vehicle | undefined {
  return vehicles.find(v => v.status === "activo" && !v.autoVerdad);
}

export function resolveCoberturaKind(
  seg: Pick<SegmentoV5, "estado" | "puertaSistema">,
  covered: boolean,
  hasActiveVehicle: boolean
): CoberturaTimelineKind {
  if (seg.estado === "activo") {
    return covered || hasActiveVehicle ? "activo" : "hueco";
  }
  if (seg.estado === "entropia" || seg.puertaSistema) return "hueco";
  if (seg.estado === "cerrado_manual") return covered ? "cubierto" : "cerrado";
  return "pendiente";
}

export function buildCoberturaTimeline(params: {
  segmentos: SegmentoV5[];
  vehicles: Vehicle[];
}): CoberturaTimelineNode[] {
  const segs = [...params.segmentos].sort(
    (a, b) => segmentTimeToMinutes(a.horaInicio) - segmentTimeToMinutes(b.horaInicio)
  );
  const live = activeCover(params.vehicles);

  return segs.map(seg => {
    const mounted = vehicleOnSegment(params.vehicles, seg);
    const covered = Boolean(mounted);
    const kind = resolveCoberturaKind(
      seg,
      covered,
      Boolean(live && seg.estado === "activo")
    );
    const vehicle = mounted ?? (kind === "activo" ? live : undefined);
    return {
      id: `seg-${seg.id}`,
      segmentoId: seg.id,
      kind,
      title: seg.nombre,
      timeLabel: `${seg.horaInicio}–${seg.horaFin}`,
      ...(vehicle?.titulo ? { detail: vehicle.titulo } : {}),
      startMin: segmentTimeToMinutes(seg.horaInicio),
    };
  });
}

export const COBERTURA_KIND_LABEL: Record<CoberturaTimelineKind, string> = {
  activo: "Ahora",
  cubierto: "Cubierto",
  pendiente: "Pendiente",
  hueco: "Sin cobertura",
  cerrado: "Cerrado",
};

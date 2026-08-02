import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  DoorClosed,
  DoorOpen,
  ExternalLink,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { SegmentoProyectoSelect } from "@/components/planeacion/SegmentoProyectoSelect";
import { NavTransitionLink } from "@/components/NavTransitionLink";
import type { Proyecto } from "@/lib/proyectos";
import type { PlantillaRutina, SegmentoV5 } from "@/lib/persistence";
import {
  getSegmentCalendarDayStartMs,
  isWithinSegmentTimeMargin,
} from "@/lib/segmentTime";
import { isWithinPuertaWindow } from "@/lib/segmentAttentionEngine";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  J4_SEGMENT_COLORS,
  type useJornada4Planilla,
} from "@/hooks/useJornada4Planilla";
import {
  canCerrarPuertaJ4,
  J4_PUERTA_MANTRA,
} from "@/jornada4/segmentAttentionJ4";
import { computeDisciplinaPlanDia } from "@/jornada4/disciplinaPlanDia";
import { resolvePuertaTimelineVisual } from "@/jornada4/puertaTimelineVisual";
import { J4_COLORS } from "./Jornada4Shell";

const { INK, MUTED, GOLD } = J4_COLORS;
const BLOOD = "#991b1b";
const BLOOD_BRIGHT = "#FF2A2A";
const EMERALD = "#00C851";
const CYAN = "#00FFC3";
const DIAS = ["D", "L", "M", "X", "J", "V", "S"] as const;
const HUB_PROYECTOS_PATH = "/proyectos";

type PlanillaApi = ReturnType<typeof useJornada4Planilla>;

type Props = {
  planilla: PlanillaApi["planilla"];
  plantillasRutina: PlanillaApi["plantillasRutina"];
  segmentoActivo: PlanillaApi["segmentoActivo"];
  busySegId: PlanillaApi["busySegId"];
  onAdd: PlanillaApi["addSegmento"];
  onAbrir: PlanillaApi["activarSegmento"];
  onCerrar: PlanillaApi["cerrarSegmento"];
  onGuardarRutina: PlanillaApi["guardarComoRutina"];
  onCargarRutina: PlanillaApi["cargarRutina"];
  onEliminarRutina: PlanillaApi["eliminarRutina"];
  /** Hub de proyectos (mismo store que Jornada clásica). */
  proyectosHub?: Proyecto[];
  /** Ventanas ±5 min abiertas (desde useJornada4PuertaAlerts). */
  ventanaAbrirIds?: Set<string>;
  ventanaCerrarIds?: Set<string>;
  onRequestNotifPermission?: () => void;
  notifPermission?: NotificationPermission | "unsupported";
};

function estadoLabel(seg: SegmentoV5): string | null {
  if (seg.estado === "entropia") return "ENTROPÍA";
  if (seg.puertaSistema && seg.estado === "activo") return "SISTEMA";
  if (seg.estado === "cerrado_manual") return "CERRADO";
  if (seg.estado === "activo") return "ACTIVO";
  if (seg.estado === "pendiente") return "PENDIENTE";
  return null;
}

export function Jornada4SegmentosPanel({
  planilla,
  plantillasRutina,
  segmentoActivo,
  busySegId,
  onAdd,
  onAbrir,
  onCerrar,
  onGuardarRutina,
  onCargarRutina,
  onEliminarRutina,
  proyectosHub = [],
  ventanaAbrirIds,
  ventanaCerrarIds,
  onRequestNotifPermission,
  notifPermission = "default",
}: Props) {
  const [open, setOpen] = useState(true);
  const [loadingRutinaId, setLoadingRutinaId] = useState<string | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [showRutinas, setShowRutinas] = useState(false);
  const [showGuardar, setShowGuardar] = useState(false);
  const [nombre, setNombre] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [color, setColor] = useState<string>(J4_SEGMENT_COLORS[0]);
  const [proyectoId, setProyectoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [rutinaNombre, setRutinaNombre] = useState("");
  const [rutinaDias, setRutinaDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const count = planilla?.segmentos.length ?? 0;
  const segmentos = planilla?.segmentos ?? [];
  /** Tick mientras hay puertas (timeline) o el listado está abierto. */
  const tick = useJornada4Tick(open || segmentos.length > 0);

  const proyectoTituloById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of proyectosHub) map.set(p.id, p.titulo);
    return map;
  }, [proyectosHub]);

  const nowMs = useMemo(() => {
    void tick;
    return Date.now();
  }, [tick]);
  const dayStart = useMemo(() => getSegmentCalendarDayStartMs(nowMs), [nowMs]);

  const disciplinaTimeline = useMemo(
    () =>
      computeDisciplinaPlanDia({
        segmentos,
        nowMs,
        dayStartMs: dayStart,
      }),
    [segmentos, nowMs, dayStart]
  );
  const entradaBySegId = useMemo(() => {
    const map = new Map<string, (typeof disciplinaTimeline.entradas)[number]>();
    for (const e of disciplinaTimeline.entradas) map.set(e.segmentoId, e);
    return map;
  }, [disciplinaTimeline]);

  const resetForm = () => {
    setNombre("");
    setHoraInicio("");
    setHoraFin("");
    setColor(J4_SEGMENT_COLORS[0]);
    setProyectoId("");
    setShowCrear(false);
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await onAdd({
        nombre,
        horaInicio,
        horaFin,
        color,
        proyectoVinculadoId: proyectoId || undefined,
      });
      if (ok) resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-3 pb-3 sm:px-4" data-testid="jornada4-segmentos">
      <style>{`
        @keyframes j4-puerta-foco-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.35), 0 0 8px rgba(212,175,55,0.12); }
          50% { box-shadow: 0 0 0 2px rgba(212,175,55,0.55), 0 0 16px rgba(212,175,55,0.32); }
        }
      `}</style>

      {segmentos.length > 0 ? (
        <div
          className="mb-3 rounded-xl border px-3 py-2.5"
          style={{
            backgroundColor: "rgba(23,23,23,0.55)",
            borderColor: "rgba(64,64,64,0.95)",
          }}
          data-testid="jornada4-puertas-timeline"
        >
          <p
            className="text-[8px] font-black uppercase tracking-widest mb-2"
            style={{ color: MUTED }}
          >
            Puertas del día
          </p>
          <div className="relative flex items-start justify-between gap-1">
            <div
              className="absolute left-3 right-3 top-[11px] h-px"
              style={{ backgroundColor: "rgba(163,163,163,0.25)" }}
              aria-hidden
            />
            {segmentos.map((seg, idx) => {
              const visual = resolvePuertaTimelineVisual({
                seg,
                entrada: entradaBySegId.get(seg.id),
              });
              return (
                <div
                  key={seg.id}
                  className="relative z-[1] flex flex-col items-center gap-1 min-w-0 flex-1"
                  data-testid={`jornada4-puerta-node-${seg.id}`}
                  data-puerta-kind={visual.kind}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-black tabular-nums border"
                    style={{
                      backgroundColor: visual.backgroundColor,
                      borderColor: visual.borderColor,
                      color: visual.numberColor,
                      animation: visual.pulse
                        ? "j4-puerta-foco-pulse 1.8s ease-in-out infinite"
                        : undefined,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className="text-[8px] font-bold truncate max-w-full px-0.5 text-center leading-tight"
                    style={{ color: visual.labelColor }}
                  >
                    {seg.nombre}
                  </span>
                  <span className="text-[7px] font-mono tabular-nums" style={{ color: MUTED }}>
                    {seg.horaInicio}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "rgba(23,23,23,0.45)",
          borderColor: "rgba(64,64,64,0.95)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full p-3 flex items-center justify-between"
          data-testid="jornada4-segmentos-toggle"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={14} style={{ color: BLOOD_BRIGHT }} />
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: BLOOD_BRIGHT }}
            >
              Segmentos
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${BLOOD}30`, color: BLOOD_BRIGHT }}
            >
              {count}
            </span>
            {segmentoActivo ? (
              <span
                className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded truncate max-w-[7rem]"
                style={{
                  backgroundColor: "rgba(0,200,81,0.15)",
                  color: EMERALD,
                  border: "1px solid rgba(0,200,81,0.35)",
                }}
              >
                {segmentoActivo.nombre}
              </span>
            ) : null}
          </div>
          {open ? (
            <ChevronUp size={14} style={{ color: MUTED }} />
          ) : (
            <ChevronDown size={14} style={{ color: MUTED }} />
          )}
        </button>

        {open ? (
          <div
            className="px-3 pb-3 space-y-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
              <div className="flex gap-1.5">
                <NavTransitionLink
                  href={HUB_PROYECTOS_PATH}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-sky-400/35 bg-sky-400/10 text-sky-400"
                >
                  <span
                    className="inline-flex items-center gap-1"
                    data-testid="jornada4-abrir-hub"
                  >
                    <ExternalLink size={10} />
                    Hub Proyectos
                  </span>
                </NavTransitionLink>
                <button
                  type="button"
                  onClick={() => setShowRutinas(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border"
                  style={{
                    borderColor: showRutinas ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                    backgroundColor: showRutinas ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.35)",
                    color: showRutinas ? INK : MUTED,
                  }}
                  data-testid="jornada4-rutinas-toggle"
                >
                  <Calendar size={10} />
                  Rutinas
                  {plantillasRutina.length > 0 ? (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-md tabular-nums border border-white/10">
                      {plantillasRutina.length}
                    </span>
                  ) : null}
                </button>
                {count > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowGuardar(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                      borderColor: showGuardar ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)",
                      color: showGuardar ? GOLD : MUTED,
                      backgroundColor: "rgba(0,0,0,0.35)",
                    }}
                    data-testid="jornada4-guardar-rutina-toggle"
                  >
                    Guardar como rutina
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowCrear(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  borderColor: "rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(0,0,0,0.4)",
                  color: INK,
                }}
                data-testid="jornada4-nuevo-segmento"
              >
                <Plus size={12} /> Nuevo Segmento
              </button>
            </div>

            {(ventanaAbrirIds?.size ?? 0) > 0 || (ventanaCerrarIds?.size ?? 0) > 0 ? (
              <div
                className="rounded-xl border px-3 py-2.5 space-y-1"
                style={{
                  borderColor: "rgba(0,200,81,0.4)",
                  backgroundColor: "rgba(0,200,81,0.1)",
                  boxShadow: "0 0 16px rgba(0,200,81,0.12)",
                  animation: "j4-puerta-pulse 1.6s ease-in-out infinite",
                }}
                data-testid="jornada4-puerta-banner"
              >
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: EMERALD }}>
                  {(ventanaAbrirIds?.size ?? 0) > 0
                    ? "Ventana ±5 min · abre la puerta"
                    : "Ventana ±5 min · cierra con intención"}
                </p>
                <p className="text-[9px]" style={{ color: MUTED }}>
                  Sin voz en Dual Kernel — toast + pulso en la tarjeta
                  {notifPermission === "granted" ? " + notificación" : ""}.
                </p>
              </div>
            ) : null}

            {onRequestNotifPermission &&
            notifPermission !== "granted" &&
            notifPermission !== "unsupported" ? (
              <button
                type="button"
                onClick={onRequestNotifPermission}
                className="w-full py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border"
                style={{
                  borderColor: "rgba(212,175,55,0.3)",
                  color: GOLD,
                  backgroundColor: "rgba(212,175,55,0.06)",
                }}
                data-testid="jornada4-enable-notif"
              >
                Activar avisos del sistema (reemplazo de voz)
              </button>
            ) : null}

            {showGuardar && count > 0 ? (
              <div
                className="space-y-3 p-3 rounded-2xl border"
                style={{
                  borderColor: "rgba(212,175,55,0.25)",
                  backgroundColor: "rgba(212,175,55,0.05)",
                }}
                data-testid="jornada4-panel-guardar-rutina"
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: GOLD }}
                >
                  Guardar rutina · {count} segmentos
                </p>
                <input
                  value={rutinaNombre}
                  onChange={e => setRutinaNombre(e.target.value)}
                  placeholder="Ej: Semana de costura"
                  className="w-full p-2.5 rounded-xl bg-black/50 border text-xs focus:outline-none"
                  style={{ color: INK, borderColor: "rgba(255,255,255,0.12)" }}
                />
                <div className="flex gap-1">
                  {DIAS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setRutinaDias(prev =>
                          prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                        )
                      }
                      className="w-7 h-7 rounded-full text-[9px] font-black border"
                      style={{
                        backgroundColor: rutinaDias.includes(i) ? GOLD : "rgba(0,0,0,0.4)",
                        color: rutinaDias.includes(i) ? "#0a0a0a" : MUTED,
                        borderColor: rutinaDias.includes(i)
                          ? "rgba(212,175,55,0.5)"
                          : "rgba(255,255,255,0.08)",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGuardar(false)}
                    className="flex-1 py-2 rounded-xl text-[9px] font-bold border"
                    style={{ color: MUTED, borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onGuardarRutina(rutinaNombre, rutinaDias).then(ok => {
                        if (ok) {
                          setRutinaNombre("");
                          setShowGuardar(false);
                          setShowRutinas(true);
                        }
                      });
                    }}
                    className="flex-1 py-2 rounded-xl text-[9px] font-bold border"
                    style={{
                      color: GOLD,
                      borderColor: "rgba(212,175,55,0.4)",
                      backgroundColor: "rgba(212,175,55,0.12)",
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : null}

            {showRutinas ? (
              <div
                className="space-y-2 p-3 rounded-2xl border"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(0,0,0,0.35)",
                }}
                data-testid="jornada4-panel-rutinas"
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: GOLD }}
                >
                  Mis Rutinas
                </p>
                {plantillasRutina.length === 0 ? (
                  <p className="text-[9px] text-center py-2" style={{ color: MUTED }}>
                    Sin rutinas guardadas
                  </p>
                ) : (
                  plantillasRutina.map((r: PlantillaRutina) => {
                    const diasLabel = DIAS.filter((_, i) => r.diasActivos.includes(i)).join(" ");
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 p-2.5 rounded-xl border"
                        style={{
                          borderColor: "rgba(255,255,255,0.08)",
                          backgroundColor: "rgba(0,0,0,0.35)",
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate" style={{ color: INK }}>
                            {r.nombre}
                          </p>
                          <p className="text-[8px]" style={{ color: MUTED }}>
                            {r.segmentos.length} segs · {diasLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={loadingRutinaId === r.id}
                          onClick={() => {
                            if (loadingRutinaId) return;
                            setLoadingRutinaId(r.id);
                            void Promise.resolve(onCargarRutina(r))
                              .then(ok => {
                                if (ok) setShowRutinas(false);
                              })
                              .finally(() => {
                                setLoadingRutinaId(current =>
                                  current === r.id ? null : current
                                );
                              });
                          }}
                          className="px-2 py-1.5 rounded-lg text-[8px] font-black uppercase disabled:opacity-60"
                          style={{
                            color: GOLD,
                            border: `1px solid ${GOLD}40`,
                            backgroundColor: `${GOLD}15`,
                          }}
                          data-testid={`jornada4-cargar-rutina-${r.id}`}
                        >
                          {loadingRutinaId === r.id ? "Cargando…" : "Cargar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onEliminarRutina(r.id)}
                          className="p-1.5 rounded-lg"
                          aria-label="Eliminar rutina"
                        >
                          <Trash2 size={12} style={{ color: MUTED }} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {showCrear ? (
              <div
                className="space-y-3 p-3 rounded-2xl border"
                style={{
                  borderColor: `${BLOOD}35`,
                  backgroundColor: "rgba(153,27,27,0.08)",
                }}
                data-testid="jornada4-panel-nuevo-segmento"
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: BLOOD_BRIGHT }}
                >
                  Nuevo segmento
                </p>
                <div>
                  <label
                    className="text-[9px] uppercase tracking-wider mb-1 block"
                    style={{ color: MUTED }}
                  >
                    Nombre
                  </label>
                  <input
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Bloque de costura"
                    className="w-full p-3 rounded-xl bg-black/50 border-2 text-sm focus:outline-none"
                    style={{ color: INK, borderColor: "rgba(255,255,255,0.12)" }}
                    data-testid="jornada4-seg-nombre"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="text-[9px] uppercase tracking-wider mb-1 block"
                      style={{ color: MUTED }}
                    >
                      Hora inicio
                    </label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={e => setHoraInicio(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/50 border text-sm focus:outline-none font-mono"
                      style={{ color: INK, borderColor: "rgba(255,255,255,0.12)" }}
                      data-testid="jornada4-seg-inicio"
                    />
                  </div>
                  <div>
                    <label
                      className="text-[9px] uppercase tracking-wider mb-1 block"
                      style={{ color: MUTED }}
                    >
                      Hora fin
                    </label>
                    <input
                      type="time"
                      value={horaFin}
                      onChange={e => setHoraFin(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/50 border text-sm focus:outline-none font-mono"
                      style={{ color: INK, borderColor: "rgba(255,255,255,0.12)" }}
                      data-testid="jornada4-seg-fin"
                    />
                  </div>
                </div>
                <SegmentoProyectoSelect
                  value={proyectoId}
                  onChange={setProyectoId}
                  proyectos={proyectosHub}
                  compact
                  testId="jornada4-seg-proyecto"
                />
                <div className="flex gap-1.5">
                  {J4_SEGMENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        outline: color === c ? "2px solid #f1f5f9" : "2px solid transparent",
                        outlineOffset: 2,
                        transform: color === c ? "scale(1.1)" : undefined,
                      }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold border"
                    style={{ color: MUTED, borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={saving || !nombre.trim() || !horaInicio || !horaFin}
                    onClick={() => void submit()}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-bold border disabled:opacity-40"
                    style={{
                      color: INK,
                      borderColor: "rgba(255,255,255,0.2)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    }}
                    data-testid="jornada4-seg-programar"
                  >
                    {saving ? "Programando…" : "Programar"}
                  </button>
                </div>
              </div>
            ) : null}

            {segmentos.length === 0 ? (
              <p
                className="text-[10px] text-center py-3"
                style={{ color: MUTED }}
                data-testid="jornada4-segmentos-empty"
              >
                Sin segmentos programados
              </p>
            ) : (
              <div className="space-y-2">
                {segmentos.map(seg => {
                  const isActive = seg.estado === "activo";
                  const isPendiente = seg.estado === "pendiente";
                  const isClosed = seg.estado === "cerrado_manual";
                  const isSistema = isActive && Boolean(seg.puertaSistema);
                  const isEntropia = seg.estado === "entropia";
                  const badge = estadoLabel(seg);
                  const puertaOpen =
                    ventanaAbrirIds?.has(seg.id) ??
                    isWithinPuertaWindow(nowMs, seg.horaInicio, dayStart);
                  const withinFin =
                    ventanaCerrarIds?.has(seg.id) ??
                    (seg.horaFin
                      ? isWithinSegmentTimeMargin(
                          nowMs,
                          seg.horaInicio,
                          seg.horaFin,
                          "fin",
                          5,
                          dayStart
                        )
                      : true);
                  const cierreOpen = canCerrarPuertaJ4(seg, nowMs, Boolean(withinFin));
                  const inAlertWindow =
                    (isPendiente && puertaOpen) || (isActive && Boolean(cierreOpen));
                  const busy = busySegId === seg.id;
                  return (
                    <div
                      key={seg.id}
                      className="rounded-xl border p-3"
                      style={{
                        backgroundColor: "rgba(23,23,23,0.55)",
                        borderColor: isSistema
                          ? "rgba(255,42,42,0.45)"
                          : inAlertWindow
                            ? "rgba(0,200,81,0.55)"
                            : isActive
                              ? "rgba(0,200,81,0.35)"
                              : isEntropia
                                ? "rgba(153,27,27,0.45)"
                                : "rgba(64,64,64,0.95)",
                        boxShadow: inAlertWindow
                          ? "0 0 18px rgba(0,200,81,0.22)"
                          : isSistema
                            ? "0 0 14px rgba(255,42,42,0.18)"
                            : undefined,
                        animation: inAlertWindow
                          ? "j4-puerta-pulse 1.6s ease-in-out infinite"
                          : undefined,
                      }}
                      data-testid={`jornada4-seg-card-${seg.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full ring-2 ring-white/10 shrink-0"
                          style={{
                            backgroundColor: isSistema
                              ? BLOOD_BRIGHT
                              : isActive
                                ? EMERALD
                                : isEntropia || isClosed
                                  ? MUTED
                                  : seg.color,
                          }}
                        />
                        <div className="flex flex-col text-[10px] font-mono tabular-nums shrink-0" style={{ color: MUTED }}>
                          <span>{seg.horaInicio}</span>
                          <span>{seg.horaFin}</span>
                        </div>
                        <p className="min-w-0 flex-1 text-sm font-semibold truncate" style={{ color: INK }}>
                          {seg.nombre}
                        </p>
                        {seg.proyectoVinculadoId ? (
                          <span
                            className="text-[8px] font-bold truncate max-w-[5.5rem] px-1.5 py-0.5 rounded border shrink-0"
                            style={{
                              color: CYAN,
                              borderColor: "rgba(0,255,195,0.3)",
                              backgroundColor: "rgba(0,255,195,0.08)",
                            }}
                            title={
                              proyectoTituloById.get(seg.proyectoVinculadoId) ??
                              seg.proyectoVinculadoId
                            }
                            data-testid={`jornada4-seg-proy-${seg.id}`}
                          >
                            {proyectoTituloById.get(seg.proyectoVinculadoId) ?? "Proyecto"}
                          </span>
                        ) : null}
                        {badge ? (
                          <span
                            className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0"
                            style={{
                              color: isSistema || isEntropia
                                ? BLOOD_BRIGHT
                                : isActive
                                  ? EMERALD
                                  : MUTED,
                              borderColor: isSistema || isEntropia
                                ? "rgba(255,42,42,0.35)"
                                : "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(0,0,0,0.35)",
                            }}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </div>

                      {isSistema ? (
                        <p
                          className="mt-2 text-[9px] leading-snug"
                          style={{ color: BLOOD_BRIGHT }}
                          data-testid={`jornada4-seg-sistema-msg-${seg.id}`}
                        >
                          Abierto por el sistema · −2 (entropía / desatención). Cierra para +2.{" "}
                          {J4_PUERTA_MANTRA}.
                        </p>
                      ) : null}

                      {(isPendiente || isActive) && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                          {isPendiente ? (
                            <button
                              type="button"
                              disabled={busy || !puertaOpen}
                              onClick={() => void onAbrir(seg.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider disabled:opacity-35"
                              style={{
                                backgroundColor: puertaOpen
                                  ? "rgba(0,200,81,0.15)"
                                  : "rgba(255,255,255,0.04)",
                                color: puertaOpen ? EMERALD : MUTED,
                                border: `1px solid ${puertaOpen ? "rgba(0,200,81,0.4)" : "rgba(255,255,255,0.08)"}`,
                              }}
                              data-testid={`jornada4-seg-abrir-${seg.id}`}
                              title={
                                puertaOpen
                                  ? "Abrir puerta (±5 min del inicio)"
                                  : `Disponible ±5 min de ${seg.horaInicio}`
                              }
                            >
                              <DoorOpen size={12} />
                              {puertaOpen ? "Abrir puerta" : `Espera ${seg.horaInicio}`}
                            </button>
                          ) : null}
                          {isActive ? (
                            <button
                              type="button"
                              disabled={busy || !cierreOpen}
                              onClick={() => void onCerrar(seg.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider disabled:opacity-35"
                              style={{
                                backgroundColor: cierreOpen
                                  ? isSistema
                                    ? "rgba(255,42,42,0.12)"
                                    : "rgba(0,200,81,0.15)"
                                  : "rgba(255,255,255,0.04)",
                                color: cierreOpen ? (isSistema ? BLOOD_BRIGHT : EMERALD) : MUTED,
                                border: `1px solid ${
                                  cierreOpen
                                    ? isSistema
                                      ? "rgba(255,42,42,0.4)"
                                      : "rgba(0,200,81,0.4)"
                                    : "rgba(255,255,255,0.08)"
                                }`,
                              }}
                              data-testid={`jornada4-seg-cerrar-${seg.id}`}
                              title={
                                isSistema
                                  ? "Cerrar y recuperar +2 PS"
                                  : cierreOpen
                                    ? "Cerrar con intención (±5 min del fin)"
                                    : `Cierre ±5 min de ${seg.horaFin}`
                              }
                            >
                              <DoorClosed size={12} />
                              {isSistema
                                ? "Cerrar · recuperar +2"
                                : cierreOpen
                                  ? "Cerrar puerta"
                                  : `Cierre a las ${seg.horaFin}`}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

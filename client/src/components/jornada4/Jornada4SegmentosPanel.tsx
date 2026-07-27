import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  DoorClosed,
  DoorOpen,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { SegmentoProyectoSelect } from "@/components/planeacion/SegmentoProyectoSelect";
import type { Proyecto } from "@/lib/proyectos";
import type { PlantillaRutina, SegmentoV5 } from "@/lib/persistence";
import {
  getSegmentCalendarDayStartMs,
  isWithinSegmentTimeMargin,
} from "@/lib/segmentTime";
import {
  isWithinPuertaWindow,
  segmentOrdinalIndex,
} from "@/lib/segmentAttentionEngine";
import { buildPuertaEscalamientoLabel } from "@/lib/puertaAtencionVoice";
import { unlockPuertaAudio } from "@/jornada4/puertaChime";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  J4_SEGMENT_COLORS,
  type useJornada4Planilla,
} from "@/hooks/useJornada4Planilla";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;
const BLOOD = "#991b1b";
const BLOOD_BRIGHT = "#FF2A2A";
const EMERALD = "#00C851";
const CYAN = "#00FFC3";
const DIAS = ["D", "L", "M", "X", "J", "V", "S"] as const;

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
  if (seg.estado === "entropia" || seg.puertaSistema) return "ENTROPÍA";
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
  const tick = useJornada4Tick(open);

  const count = planilla?.segmentos.length ?? 0;
  const segmentos = planilla?.segmentos ?? [];

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

  /** Segmento en ventana de alerta (para banner anti-miopía). */
  const puertaFoco = useMemo(() => {
    const abrirId = ventanaAbrirIds ? [...ventanaAbrirIds][0] : undefined;
    const cerrarId = ventanaCerrarIds ? [...ventanaCerrarIds][0] : undefined;
    const id = abrirId ?? cerrarId;
    if (!id) return null;
    const seg = segmentos.find(s => s.id === id);
    if (!seg) return null;
    const ordinal = segmentOrdinalIndex(segmentos, seg.id);
    const total = Math.max(1, segmentos.length);
    return {
      seg,
      kind: abrirId ? ("abrir" as const) : ("cerrar" as const),
      escalamiento: buildPuertaEscalamientoLabel(ordinal, total),
      ordinal,
      total,
    };
  }, [ventanaAbrirIds, ventanaCerrarIds, segmentos]);

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
    <div className="px-4 pb-3" data-testid="jornada4-segmentos">
      <style>{`
        @keyframes j4-puerta-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0,200,81,0.12); }
          50% { box-shadow: 0 0 22px rgba(0,200,81,0.35); }
        }
      `}</style>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: PIZARRA, borderColor: `${BLOOD}40` }}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full p-4 flex items-center justify-between"
          data-testid="jornada4-segmentos-toggle"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} style={{ color: BLOOD_BRIGHT }} />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: BLOOD_BRIGHT }}
            >
              Segmentos del Día
            </span>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${BLOOD}30`, color: BLOOD_BRIGHT }}
            >
              {count}
            </span>
            {segmentoActivo ? (
              <span
                className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
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
            className="px-4 pb-4 space-y-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
              <div className="flex gap-1.5">
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

            {/* Mapa del día — anti-miopía sin voz: ves las N puertas de un golpe. */}
            {segmentos.length > 0 ? (
              <div
                className="rounded-xl border px-3 py-2.5 space-y-2"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(0,0,0,0.25)",
                }}
                data-testid="jornada4-mapa-dia"
              >
                <p
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{ color: GOLD }}
                >
                  Mapa del día · {count} puerta{count === 1 ? "" : "s"}
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {segmentos.map((seg, idx) => {
                    const n = idx + 1;
                    const isAct = seg.estado === "activo";
                    const isDone =
                      seg.estado === "cerrado_manual" || seg.estado === "entropia";
                    const inWin =
                      ventanaAbrirIds?.has(seg.id) || ventanaCerrarIds?.has(seg.id);
                    return (
                      <div
                        key={seg.id}
                        className="shrink-0 min-w-[2.75rem] rounded-lg border px-1.5 py-1.5 text-center"
                        style={{
                          borderColor: inWin
                            ? "rgba(0,200,81,0.55)"
                            : isAct
                              ? "rgba(0,200,81,0.35)"
                              : "rgba(255,255,255,0.1)",
                          backgroundColor: inWin
                            ? "rgba(0,200,81,0.12)"
                            : isAct
                              ? "rgba(0,200,81,0.06)"
                              : "rgba(255,255,255,0.03)",
                          opacity: isDone ? 0.45 : 1,
                        }}
                        title={`${n}/${count} · ${seg.nombre}`}
                        data-testid={`jornada4-mapa-chip-${seg.id}`}
                      >
                        <p
                          className="text-[11px] font-black tabular-nums"
                          style={{ color: inWin || isAct ? EMERALD : INK }}
                        >
                          {n}
                        </p>
                        <p
                          className="text-[7px] font-mono truncate max-w-[3.5rem]"
                          style={{ color: MUTED }}
                        >
                          {seg.horaInicio}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[8px] leading-snug" style={{ color: MUTED }}>
                  Conciencia del día completo — sin miopía de un solo bloque.
                </p>
              </div>
            ) : null}

            {puertaFoco ? (
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
                <p
                  className="text-[11px] font-black tracking-wide capitalize"
                  style={{ color: EMERALD }}
                >
                  {puertaFoco.escalamiento}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: INK }}>
                  {puertaFoco.seg.nombre}
                  {" · "}
                  {puertaFoco.kind === "abrir"
                    ? "abre la puerta ahora"
                    : "cierra con intención"}
                </p>
                <p className="text-[8px]" style={{ color: MUTED }}>
                  Timbre + toast
                  {notifPermission === "granted" ? " + notificación" : ""} — sin voz
                  (anti-freeze).
                </p>
              </div>
            ) : null}

            {onRequestNotifPermission &&
            notifPermission !== "granted" &&
            notifPermission !== "unsupported" ? (
              <button
                type="button"
                onClick={() => {
                  void unlockPuertaAudio();
                  onRequestNotifPermission();
                }}
                className="w-full py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border"
                style={{
                  borderColor: "rgba(212,175,55,0.3)",
                  color: GOLD,
                  backgroundColor: "rgba(212,175,55,0.06)",
                }}
                data-testid="jornada4-enable-notif"
              >
                Activar timbre y avisos del sistema
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
                          onClick={() => void onCargarRutina(r)}
                          className="px-2 py-1.5 rounded-lg text-[8px] font-black uppercase"
                          style={{
                            color: GOLD,
                            border: `1px solid ${GOLD}40`,
                            backgroundColor: `${GOLD}15`,
                          }}
                          data-testid={`jornada4-cargar-rutina-${r.id}`}
                        >
                          Cargar
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
                  const badge = estadoLabel(seg);
                  const puertaOpen =
                    ventanaAbrirIds?.has(seg.id) ??
                    isWithinPuertaWindow(nowMs, seg.horaInicio, dayStart);
                  const cierreOpen =
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
                  const inAlertWindow =
                    (isPendiente && puertaOpen) || (isActive && Boolean(cierreOpen));
                  const busy = busySegId === seg.id;
                  return (
                    <div
                      key={seg.id}
                      className="rounded-2xl border p-3.5"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.4)",
                        borderColor: inAlertWindow
                          ? "rgba(0,200,81,0.55)"
                          : isActive
                            ? "rgba(0,200,81,0.35)"
                            : "rgba(255,255,255,0.08)",
                        boxShadow: inAlertWindow
                          ? "0 0 18px rgba(0,200,81,0.22)"
                          : isActive
                            ? "0 0 12px rgba(0,200,81,0.08)"
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
                            backgroundColor: isActive ? EMERALD : isClosed ? MUTED : seg.color,
                          }}
                        />
                        <div className="flex flex-col text-[10px] font-mono tabular-nums shrink-0" style={{ color: MUTED }}>
                          <span>{seg.horaInicio}</span>
                          <span>{seg.horaFin}</span>
                        </div>
                        <p className="min-w-0 flex-1 text-sm font-semibold truncate" style={{ color: INK }}>
                          <span
                            className="text-[9px] font-black tabular-nums mr-1.5"
                            style={{ color: MUTED }}
                          >
                            {segmentOrdinalIndex(segmentos, seg.id)}/{segmentos.length}
                          </span>
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
                              color: isActive ? EMERALD : MUTED,
                              borderColor: "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(0,0,0,0.35)",
                            }}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </div>

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
                                  ? "rgba(0,200,81,0.15)"
                                  : "rgba(255,255,255,0.04)",
                                color: cierreOpen ? EMERALD : MUTED,
                                border: `1px solid ${cierreOpen ? "rgba(0,200,81,0.4)" : "rgba(255,255,255,0.08)"}`,
                              }}
                              data-testid={`jornada4-seg-cerrar-${seg.id}`}
                              title={
                                cierreOpen
                                  ? "Cerrar con intención (±5 min del fin)"
                                  : `Cierre ±5 min de ${seg.horaFin}`
                              }
                            >
                              <DoorClosed size={12} />
                              {cierreOpen ? "Cerrar puerta" : `Cierre a las ${seg.horaFin}`}
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

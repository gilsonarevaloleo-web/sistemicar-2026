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
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;
const BLOOD = "#991b1b";
const BLOOD_BRIGHT = "#FF2A2A";
const EMERALD = "#00C851";
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
}: Props) {
  const [open, setOpen] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [showRutinas, setShowRutinas] = useState(false);
  const [showGuardar, setShowGuardar] = useState(false);
  const [nombre, setNombre] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [color, setColor] = useState<string>(J4_SEGMENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [rutinaNombre, setRutinaNombre] = useState("");
  const [rutinaDias, setRutinaDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const tick = useJornada4Tick(open);

  const count = planilla?.segmentos.length ?? 0;
  const segmentos = planilla?.segmentos ?? [];

  const nowMs = useMemo(() => {
    void tick;
    return Date.now();
  }, [tick]);
  const dayStart = useMemo(() => getSegmentCalendarDayStartMs(nowMs), [nowMs]);

  const resetForm = () => {
    setNombre("");
    setHoraInicio("");
    setHoraFin("");
    setColor(J4_SEGMENT_COLORS[0]);
    setShowCrear(false);
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await onAdd({ nombre, horaInicio, horaFin, color });
      if (ok) resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-3" data-testid="jornada4-segmentos">
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
                  const puertaOpen = isWithinPuertaWindow(nowMs, seg.horaInicio, dayStart);
                  const cierreOpen = seg.horaFin
                    ? isWithinSegmentTimeMargin(
                        nowMs,
                        seg.horaInicio,
                        seg.horaFin,
                        "fin",
                        5,
                        dayStart
                      )
                    : true;
                  const busy = busySegId === seg.id;
                  return (
                    <div
                      key={seg.id}
                      className="rounded-2xl border p-3.5"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.4)",
                        borderColor: isActive
                          ? "rgba(0,200,81,0.35)"
                          : "rgba(255,255,255,0.08)",
                        boxShadow: isActive ? "0 0 12px rgba(0,200,81,0.08)" : undefined,
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
                          {seg.nombre}
                        </p>
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

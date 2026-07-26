import { useEffect, useMemo, useState } from "react";
import { Check, Focus, ListPlus, Minus, Plus, Timer, X as XIcon, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import {
  FLOTA_CONFIG,
  GOLD,
  NARANJA,
  getSubVehicleRecordSuggestions,
} from "@/components/flota/vehicleCardShared";
import {
  ConquistaUnitFocusOverlay,
} from "@/components/flota/ConquistaUnitFocusOverlay";
import {
  computeDesglosadorClocks,
  desglosadorSubTimerUiFromClocks,
  formatHHMM,
  formatMMSS,
  suggestedSec,
} from "@/lib/desglosadorClock";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  conquistaActiveSub,
  conquistaProgressLabel,
} from "@/jornada4/conquistaKernel";
import {
  desglosadorProfundidadGanadaPs,
  desglosadorProfundidadPotencialPs,
} from "@/jornada4/desglosadorProfundidad";

const OK = "#00C851";
const BAD = "#FF2A2A";
const VIOLET = "#8B5CF6";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const CYAN = "#00FFC3";
const flotaColor = FLOTA_CONFIG.tiempo.color;

type AddSubForm = {
  titulo: string;
  cantidadObjetivo: string;
  tiempoRecordMinPerUnit?: number;
};

type Props = {
  vehicle: Vehicle;
  onCumplido: (cantidad?: number) => void;
  onFallado: () => void;
  onCerrarCiclo: () => void;
  onAddSub?: (form: AddSubForm) => void;
};

export function ConquistaCard({
  vehicle,
  onCumplido,
  onFallado,
  onCerrarCiclo,
  onAddSub,
}: Props) {
  const active = conquistaActiveSub(vehicle);
  const tick = useJornada4Tick(Boolean(active?.aperturaAt));
  const clocks = useMemo(
    () => computeDesglosadorClocks(Date.now(), vehicle),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wall-clock via tick
    [tick, active?.id, active?.aperturaAt, vehicle.id, vehicle.subVehiculos]
  );

  const objSecs = active ? suggestedSec(active) : null;
  const timerUi = useMemo(
    () => desglosadorSubTimerUiFromClocks(clocks, objSecs),
    [clocks, objSecs]
  );

  const subs = vehicle.subVehiculos ?? [];
  const cycleReady = subs.every(s => s.status === "cumplido" || s.status === "fallado");
  const doneCount = subs.filter(s => s.status === "cumplido" || s.status === "fallado").length;
  const progressPct = subs.length > 0 ? Math.round((doneCount / subs.length) * 100) : 0;
  const profundidadPotencial = desglosadorProfundidadPotencialPs(subs.length);
  const profundidadGanada = desglosadorProfundidadGanadaPs(subs);

  const hasCantidadObj = active?.cantidadObjetivo != null && active.cantidadObjetivo > 0;
  const hasRecord =
    active?.tiempoRecordMinPerUnit != null && active.tiempoRecordMinPerUnit > 0;

  const [cantidad, setCantidad] = useState("");
  const [unitFocusOpen, setUnitFocusOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitulo, setAddTitulo] = useState("");
  const [addCant, setAddCant] = useState("");
  const [addRecord, setAddRecord] = useState<number | undefined>();
  const [showAddSugs, setShowAddSugs] = useState(false);

  useEffect(() => {
    setCantidad("");
  }, [active?.id]);

  const addSuggestions =
    addTitulo.trim().length >= 2
      ? getSubVehicleRecordSuggestions(addTitulo, 5)
      : [];

  const resetAdd = () => {
    setAddTitulo("");
    setAddCant("");
    setAddRecord(undefined);
    setShowAdd(false);
    setShowAddSugs(false);
  };

  const restanteManual = hasCantidadObj
    ? Math.max(0, (active!.cantidadObjetivo ?? 0) - (Number(cantidad) || 0))
    : null;
  const restante =
    hasRecord && clocks.unitsRemaining != null ? clocks.unitsRemaining : restanteManual;

  const timerDisplay =
    timerUi.isCountdown && timerUi.expired
      ? `+${timerUi.display}`
      : timerUi.display || "00:00:00";

  const refLabel = objSecs != null ? formatMMSS(objSecs) : null;
  const futuroSub = clocks.subEndAt != null ? formatHHMM(clocks.subEndAt) : "—";
  const futuroCiclo = clocks.cycleEndAt != null ? formatHHMM(clocks.cycleEndAt) : "—";
  const metaHora =
    /^\d{1,2}:\d{2}$/.test((vehicle.criterioDetalle ?? "").trim())
      ? vehicle.criterioDetalle!.trim()
      : null;

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${flotaColor}35` }}
      data-testid={`jornada4-conquista-${vehicle.id}`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NARANJA }} />
              <p className="text-sm font-bold truncate" style={{ color: INK }}>
                {vehicle.titulo}
              </p>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${flotaColor}20`, color: flotaColor }}
              >
                {FLOTA_CONFIG.tiempo.label}
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Desglosador · {conquistaProgressLabel(vehicle)}
              {profundidadPotencial > 0
                ? ` · profundidad ${profundidadGanada}/${profundidadPotencial} PS`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <div className="flex items-center gap-1">
              <Zap size={10} style={{ color: flotaColor }} />
              <span className="text-xs font-black" style={{ color: flotaColor }}>
                {profundidadPotencial} PS
              </span>
            </div>
            <span className="text-[8px] font-mono" style={{ color: MUTED }}>
              {subs.length}×2
            </span>
          </div>
        </div>

        {/* FOCO unidad — cronómetro grande con Tik, sin récord (siempre disponible) */}
        {vehicle.status === "activo" ? (
          <button
            type="button"
            onClick={() => setUnitFocusOpen(true)}
            className="mt-3 w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider touch-manipulation"
            style={{
              backgroundColor: NARANJA,
              color: "#0a0a0a",
              boxShadow: `0 0 18px ${NARANJA}55`,
            }}
            data-testid="j4-conquista-foco-open"
            title="Cronómetro de unidad — no guarda récord"
          >
            <Focus size={16} strokeWidth={2.5} />
            Foco unidad · Tik + vueltas
          </button>
        ) : null}

        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              backgroundColor: flotaColor,
              boxShadow: `0 0 6px ${flotaColor}80`,
            }}
          />
        </div>
      </div>

      <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {active ? (
          <div
            className="mt-3 rounded-xl border-2 overflow-hidden"
            style={{
              backgroundColor: `${flotaColor}08`,
              borderColor: flotaColor,
              boxShadow: `0 0 16px ${flotaColor}20`,
            }}
            data-testid="j4-conquista-active"
          >
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
                  style={{ backgroundColor: flotaColor, color: "#000" }}
                >
                  ▶
                </span>
                <span className="text-sm font-black flex-1 min-w-0 truncate" style={{ color: INK }}>
                  {active.titulo || "Sin título"}
                </span>
                {hasCantidadObj ? (
                  <span
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${flotaColor}15`, color: flotaColor }}
                  >
                    obj: {active.cantidadObjetivo}
                  </span>
                ) : null}
                {refLabel ? (
                  <span
                    className="text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest"
                    style={{
                      backgroundColor: "rgba(139,92,246,0.15)",
                      color: VIOLET,
                      border: "1px solid rgba(139,92,246,0.3)",
                    }}
                  >
                    ref {refLabel}
                  </span>
                ) : null}
              </div>

              {/* Reloj de unidad — countdown / overtime / elapsed */}
              <div className="space-y-1" data-testid="j4-conquista-unit-clock">
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-lg"
                  style={{
                    backgroundColor: timerUi.expired
                      ? "rgba(255,49,49,0.08)"
                      : `${flotaColor}10`,
                  }}
                >
                  <Timer
                    size={12}
                    style={{ color: timerUi.expired ? "#FF3131" : flotaColor }}
                  />
                  <span
                    className="text-2xl font-black tracking-wider tabular-nums"
                    style={{
                      color: timerUi.expired ? "#FF3131" : flotaColor,
                      fontFamily: "ui-monospace, monospace",
                    }}
                    data-testid="j4-conquista-timer-display"
                  >
                    {timerDisplay}
                  </span>
                </div>

                {hasCantidadObj && hasRecord ? (
                  <p
                    className="text-[9px] text-center font-mono font-bold leading-snug"
                    style={{ color: "rgba(255,255,255,0.88)" }}
                    data-testid="j4-conquista-record-formula"
                  >
                    <span style={{ color: flotaColor }}>{active.cantidadObjetivo} u</span>
                    {" × "}
                    <span style={{ color: flotaColor }}>
                      {active.tiempoRecordMinPerUnit!.toFixed(1)} MIN/U
                    </span>
                    {" = "}
                    <span style={{ color: GOLD }}>
                      {Math.round(
                        (active.cantidadObjetivo ?? 0) * (active.tiempoRecordMinPerUnit ?? 0)
                      )}{" "}
                      min obj
                    </span>
                  </p>
                ) : null}

                {(clocks.liveAccumDeltaSec < -5 || clocks.liveAccumDeltaSec > 5) &&
                clocks.hasProjection ? (
                  <div
                    className="flex items-center justify-center gap-2 py-1.5 rounded-lg"
                    style={{
                      backgroundColor:
                        clocks.liveAccumDeltaSec < 0
                          ? "rgba(0,200,81,0.08)"
                          : "rgba(255,49,49,0.08)",
                      border: `1px solid ${
                        clocks.liveAccumDeltaSec < 0
                          ? "rgba(0,200,81,0.25)"
                          : "rgba(255,49,49,0.25)"
                      }`,
                    }}
                  >
                    <span
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{
                        color: clocks.liveAccumDeltaSec < 0 ? OK : "#FF3131",
                      }}
                    >
                      {clocks.liveAccumDeltaSec < 0 ? "↓" : "↑"}
                    </span>
                    <span
                      className="text-[13px] font-black tabular-nums"
                      style={{
                        color: clocks.liveAccumDeltaSec < 0 ? OK : "#FF3131",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {Math.floor(Math.abs(clocks.liveAccumDeltaSec) / 60)}m{" "}
                      {String(Math.abs(clocks.liveAccumDeltaSec) % 60).padStart(2, "0")}s
                    </span>
                    <span
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{
                        color: clocks.liveAccumDeltaSec < 0 ? OK : "#FF3131",
                      }}
                    >
                      {clocks.liveAccumDeltaSec < 0 ? "ganando" : "perdiendo"}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center px-1 pt-0.5">
                  <div>
                    <p
                      className="text-[7px] font-black uppercase tracking-widest"
                      style={{ color: "#6EE7B7" }}
                    >
                      Termina a las
                    </p>
                    <p
                      className="text-[11px] font-black tabular-nums"
                      style={{
                        color: futuroSub === "—" ? "rgba(255,255,255,0.45)" : CYAN,
                        fontFamily: "ui-monospace, monospace",
                      }}
                      data-testid="j4-conquista-termina"
                    >
                      {futuroSub}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-[7px] font-black uppercase tracking-widest"
                      style={{ color: "rgba(255,255,255,0.72)" }}
                    >
                      Ciclo global
                    </p>
                    <p
                      className="text-[11px] font-black tabular-nums"
                      style={{
                        color:
                          futuroCiclo === "—" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.9)",
                        fontFamily: "ui-monospace, monospace",
                      }}
                      data-testid="j4-conquista-ciclo"
                    >
                      {futuroCiclo}
                    </p>
                  </div>
                </div>
                {metaHora ? (
                  <p
                    className="text-center text-[9px] font-mono font-bold"
                    style={{ color: GOLD }}
                    data-testid="j4-conquista-meta-hora"
                  >
                    Meta del ciclo · {metaHora}
                    {futuroCiclo !== "—" ? ` · proyección ${futuroCiclo}` : ""}
                  </p>
                ) : null}
              </div>

              {hasCantidadObj ? (
                <div className="space-y-2">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider block"
                    style={{ color: "rgba(255,255,255,0.78)" }}
                  >
                    Cant. lograda
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCantidad(v => String(Math.max(0, Number(v || 0) - 1)))
                      }
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black transition-all active:scale-95"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.15)",
                        color: VIOLET,
                        border: "1px solid rgba(139,92,246,0.35)",
                      }}
                      aria-label="Menos"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={cantidad}
                      onChange={e => setCantidad(e.target.value)}
                      placeholder="¿cuántas?"
                      className="flex-1 bg-black/30 text-sm p-2 rounded border border-white/10 focus:outline-none text-center font-bold"
                      style={{ color: INK, fontFamily: "ui-monospace, monospace" }}
                      data-testid="j4-conquista-cantidad"
                    />
                    <button
                      type="button"
                      onClick={() => setCantidad(v => String(Number(v || 0) + 1))}
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black transition-all active:scale-95"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.15)",
                        color: VIOLET,
                        border: "1px solid rgba(139,92,246,0.35)",
                      }}
                      aria-label="Más"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="text-center py-1" data-testid="j4-conquista-restante">
                    <p
                      className="text-[8px] font-bold uppercase tracking-widest mb-0.5"
                      style={{ color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}
                    >
                      Restante
                    </p>
                    <span
                      className="text-3xl font-black tracking-wider tabular-nums"
                      style={{
                        color: restante === 0 ? OK : VIOLET,
                        fontFamily: "ui-monospace, monospace",
                        textShadow:
                          restante === 0
                            ? "0 0 12px rgba(34,197,94,0.5)"
                            : "0 0 12px rgba(139,92,246,0.5)",
                      }}
                    >
                      {restante ?? "—"}
                    </span>
                    {hasRecord ? (
                      <p
                        className="text-[8px] mt-0.5 font-mono font-bold"
                        style={{ color: "rgba(255,255,255,0.78)" }}
                      >
                        Ritmo:{" "}
                        <span style={{ color: "#C4B5FD" }}>
                          {active.tiempoRecordMinPerUnit!.toFixed(1)} min/unidad
                        </span>{" "}
                        (récord)
                      </p>
                    ) : (
                      <p
                        className="text-[8px] mt-0.5 font-mono"
                        style={{ color: "rgba(255,255,255,0.62)" }}
                      >
                        Sin récord · primer ciclo · Cumplido asume todo el objetivo
                      </p>
                    )}
                    {restante === 0 && hasCantidadObj ? (
                      <p
                        className="text-[8px] font-black uppercase tracking-widest mt-0.5"
                        style={{ color: OK, fontFamily: "monospace" }}
                      >
                        Objetivo alcanzado
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                  style={{ backgroundColor: `${OK}22`, color: OK, border: `1px solid ${OK}50` }}
                  onClick={() => {
                    const n = cantidad.trim() ? Number(cantidad) : undefined;
                    onCumplido(Number.isFinite(n as number) ? (n as number) : undefined);
                    setCantidad("");
                  }}
                  data-testid="j4-conquista-cumplido"
                >
                  Cumplido
                </button>
                <button
                  type="button"
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                  style={{
                    backgroundColor: "transparent",
                    color: BAD,
                    border: `1px solid ${BAD}60`,
                  }}
                  onClick={() => {
                    onFallado();
                    setCantidad("");
                  }}
                  data-testid="j4-conquista-fallado"
                >
                  Fallado
                </button>
              </div>
            </div>
          </div>
        ) : cycleReady ? (
          <div
            className="mt-3 p-4 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(212,175,55,0.05)",
              borderColor: "#D4AF37",
              boxShadow: "0 0 20px rgba(212,175,55,0.15)",
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#D4AF37" }}>
              Ciclo completado
            </p>
            <p className="text-sm" style={{ color: MUTED }}>
              Todas las unidades cerradas. Sella el ciclo para liquidar PS.
            </p>
            <button
              type="button"
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: "rgba(212,175,55,0.18)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.4)",
              }}
              onClick={onCerrarCiclo}
              data-testid="j4-conquista-cerrar-ciclo"
            >
              Cerrar ciclo
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            Sin unidad activa.
          </p>
        )}

        {subs.length > 0 ? (
          <div className="space-y-1.5" data-testid={`j4-conquista-subs-${vehicle.id}`}>
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
              Unidades
            </p>
            {subs.map((sv, idx) => {
              const isActive = sv.status === "activo";
              const done = sv.status === "cumplido";
              const fail = sv.status === "fallado";
              const recordLine =
                sv.cantidadObjetivo && sv.tiempoRecordMinPerUnit
                  ? `${sv.cantidadObjetivo}×${sv.tiempoRecordMinPerUnit.toFixed(1)}m/u · ≈${Math.round(
                      sv.cantidadObjetivo * sv.tiempoRecordMinPerUnit
                    )}m`
                  : sv.cantidadObjetivo
                    ? `${sv.cantidadObjetivo} u`
                    : null;
              return (
                <div
                  key={sv.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg border"
                  style={{
                    backgroundColor: isActive ? `${flotaColor}12` : "rgba(255,255,255,0.03)",
                    borderColor: isActive ? `${flotaColor}45` : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{
                      backgroundColor: done
                        ? `${OK}25`
                        : fail
                          ? `${BAD}25`
                          : isActive
                            ? `${flotaColor}25`
                            : "rgba(255,255,255,0.06)",
                      color: done ? OK : fail ? BAD : isActive ? flotaColor : MUTED,
                    }}
                  >
                    {done ? <Check size={10} /> : fail ? <XIcon size={10} /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: isActive ? INK : MUTED }}
                    >
                      {sv.titulo || `Unidad ${idx + 1}`}
                    </p>
                    {recordLine ? (
                      <p
                        className="text-[8px] font-mono font-bold"
                        style={{ color: isActive ? flotaColor : MUTED }}
                      >
                        {sv.cantidadLograda != null
                          ? `${sv.cantidadLograda}/${sv.cantidadObjetivo}`
                          : recordLine}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="text-[8px] font-black uppercase"
                    style={{
                      color: done ? OK : fail ? BAD : isActive ? flotaColor : MUTED,
                    }}
                  >
                    {sv.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {onAddSub && vehicle.status === "activo" && !cycleReady ? (
          <div className="pt-1" data-testid="j4-conquista-add-sub">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: "rgba(249,115,22,0.08)",
                  color: flotaColor,
                  border: `1px solid ${flotaColor}35`,
                }}
              >
                <ListPlus size={12} /> Añadir subtarea
              </button>
            ) : (
              <div
                className="rounded-2xl border-2 p-3.5 space-y-3"
                style={{
                  borderColor: `${flotaColor}40`,
                  backgroundColor: "rgba(249,115,22,0.07)",
                  boxShadow: `0 0 16px ${flotaColor}12`,
                }}
              >
                <p
                  className="text-[11px] font-black uppercase tracking-widest"
                  style={{ color: flotaColor }}
                >
                  Nueva subtarea · datos
                </p>
                <div>
                  <label
                    className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                    style={{ color: INK }}
                  >
                    Nombre de la unidad
                  </label>
                  <div className="relative">
                    <input
                      value={addTitulo}
                      onChange={e => {
                        setAddTitulo(e.target.value);
                        setShowAddSugs(e.target.value.trim().length >= 2);
                      }}
                      onFocus={() => setShowAddSugs(addTitulo.trim().length >= 2)}
                      onBlur={() => setTimeout(() => setShowAddSugs(false), 150)}
                      placeholder="Ej: Armar pretina…"
                      className="w-full p-3.5 rounded-xl bg-black/60 border-2 text-base focus:outline-none"
                      style={{
                        color: INK,
                        borderColor: addTitulo.trim() ? flotaColor : "rgba(255,255,255,0.14)",
                      }}
                      data-testid="j4-add-sub-titulo"
                    />
                    {showAddSugs && addSuggestions.length > 0 ? (
                      <div
                        className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border overflow-hidden max-h-40 overflow-y-auto"
                        style={{
                          backgroundColor: "#0f0f0f",
                          borderColor: `${flotaColor}40`,
                          boxShadow: `0 4px 20px ${flotaColor}20`,
                        }}
                      >
                        {addSuggestions.map((s, i) => (
                          <button
                            key={`${s.titulo}-${i}`}
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              setAddTitulo(s.titulo);
                              setAddRecord(s.minPerUnit);
                              setShowAddSugs(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5"
                            data-testid={`j4-add-sub-sug-${i}`}
                          >
                            <span className="text-sm truncate" style={{ color: INK }}>
                              {s.titulo}
                            </span>
                            <span
                              className="text-[10px] font-mono font-bold ml-2 shrink-0"
                              style={{ color: flotaColor }}
                            >
                              {s.minPerUnit.toFixed(1)} MIN/U
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                      style={{ color: INK }}
                    >
                      Cantidad (u)
                    </label>
                    <input
                      value={addCant}
                      onChange={e => setAddCant(e.target.value)}
                      placeholder="Ej: 9"
                      inputMode="numeric"
                      className="w-full p-3.5 rounded-xl bg-black/60 border-2 text-lg font-mono font-black text-center focus:outline-none"
                      style={{
                        color: INK,
                        borderColor: addCant ? flotaColor : "rgba(255,255,255,0.14)",
                      }}
                      data-testid="j4-add-sub-cant"
                    />
                  </div>
                  <div>
                    <label
                      className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                      style={{ color: INK }}
                    >
                      Récord MIN/U
                    </label>
                    <input
                      value={addRecord != null ? String(addRecord) : ""}
                      onChange={e => {
                        const raw = e.target.value.trim();
                        const n = Number(raw);
                        setAddRecord(
                          raw === "" || !Number.isFinite(n) || n <= 0 ? undefined : n
                        );
                      }}
                      placeholder="Ej: 1.5"
                      inputMode="decimal"
                      className="w-full p-3.5 rounded-xl bg-black/60 border-2 text-lg font-mono font-black text-center focus:outline-none"
                      style={{
                        color: INK,
                        borderColor: addRecord != null ? flotaColor : "rgba(255,255,255,0.14)",
                      }}
                      data-testid="j4-add-sub-record"
                    />
                  </div>
                </div>
                {addRecord != null && Number(addCant) > 0 ? (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.28)",
                    }}
                  >
                    <span className="text-[9px] font-mono font-bold" style={{ color: GOLD }}>
                      ≈{Math.round(Number(addCant) * addRecord)} min
                    </span>
                    <span className="text-[11px] font-black font-mono" style={{ color: CYAN }}>
                      Fin ≈{" "}
                      {formatHHMM(Date.now() + Math.round(Number(addCant) * addRecord) * 60_000)}
                    </span>
                  </div>
                ) : addRecord != null ? (
                  <p className="text-[9px] font-mono font-bold" style={{ color: GOLD }}>
                    Récord: {addRecord.toFixed(1)} MIN/U — escribe cuántas unidades
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!addTitulo.trim()}
                    onClick={() => {
                      if (!addTitulo.trim() || !onAddSub) return;
                      onAddSub({
                        titulo: addTitulo.trim(),
                        cantidadObjetivo: addCant,
                        tiempoRecordMinPerUnit: addRecord,
                      });
                      resetAdd();
                    }}
                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                    style={{
                      backgroundColor: `${flotaColor}22`,
                      color: flotaColor,
                      border: `1px solid ${flotaColor}40`,
                    }}
                    data-testid="j4-add-sub-submit"
                  >
                    Añadir a la cola
                  </button>
                  <button
                    type="button"
                    onClick={resetAdd}
                    className="px-3 py-3 rounded-xl text-[10px] font-black uppercase"
                    style={{ color: MUTED }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConquistaUnitFocusOverlay
        open={unitFocusOpen}
        onClose={() => setUnitFocusOpen(false)}
        accentColor={NARANJA}
      />
    </article>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Flag, Lock, TrendingUp, X as XIcon, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import { FLOTA_CONFIG, PLATA } from "@/components/flota/vehicleCardShared";
import { computeSituacionTimerUi } from "@/lib/situacionTimerUi";
import {
  computeSituacionCronometroHorarios,
  minutosGanadosEnVivoFoco,
  remainingCronometroBudgetMin,
  situacionFilaCronometroPendiente,
} from "@/lib/situacionCupoDistrib";
import { situacionContratoFinMs } from "@/lib/situacionGanancia";
import { RING_COPY } from "@/lib/ringEnfoqueReal";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import {
  situacionPendingCronRows,
  situacionProgressLabel,
} from "@/jornada4/situacionKernel";
import { desglosadorProfundidadPotencialPs } from "@/jornada4/desglosadorProfundidad";
import type { ReorderDirection } from "@/lib/desglosadorReorder";
import {
  ENTRENAMIENTO_COPY,
  isRingModoEntrenamiento,
} from "@/jornada4/entrenamientoRestricciones";
import {
  groupSubsBySeccion,
  lastSeccionTitulo,
} from "@/lib/desglosadorSecciones";
import type { DestinoCierre } from "@/lib/destinoCierre";
import { DestinoCierreToggle } from "./DestinoCierreToggle";

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const GOLD = "#D4AF37";
const AMBER = "#F59E0B";
const VIOLET = "#8B5CF6";
const CYAN = "#00FFC3";
const flotaColor = FLOTA_CONFIG.situacion.color;

type Props = {
  vehicle: Vehicle;
  onCumplido: (subTareaId: string) => void;
  onAvance: (subTareaId: string) => void;
  onFallado: (subTareaId: string) => void;
  onCerrarBloque: () => void;
  onDestinoChange?: (destino: DestinoCierre, proyectoId?: string) => void;
  onAddFila: (texto: string, seccionTitulo?: string) => void;
  onSetCupo: (subTareaId: string, minutos: number | undefined) => void;
  onReorderFilas?: (movedId: string, direction: ReorderDirection) => void;
  onSustituirFoco?: (subTareaId: string) => void;
  /** Manda la fila en foco al final de la cola con sus minutos restantes. */
  onPostergarFoco?: () => void;
  /** Elimina una fila de cola del ring (no posterga; el tiempo no pasa al foco). */
  onQuitarFila?: (subTareaId: string) => void;
};

export function SituacionCard({
  vehicle,
  onCumplido,
  onAvance,
  onFallado,
  onCerrarBloque,
  onDestinoChange,
  onAddFila,
  onSetCupo,
  onReorderFilas,
  onSustituirFoco,
  onPostergarFoco,
  onQuitarFila,
}: Props) {
  const [draftFila, setDraftFila] = useState("");
  const [draftSeccion, setDraftSeccion] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [cierreEnviando, setCierreEnviando] = useState<"cumplido" | "fallado" | "avance" | "bloque" | null>(null);
  const pending = situacionPendingCronRows(vehicle);
  const focusId = vehicle.situacionCupoAnchor?.subTareaId;
  const focus = pending.find(st => st.id === focusId) ?? pending[0] ?? null;
  const sc = vehicle.situacionCronometro;
  const cronActivo = sc?.activo === true;
  const entrenamiento = isRingModoEntrenamiento(vehicle);

  useEffect(() => {
    setCierreEnviando(null);
  }, [focus?.id]);

  // Solo tickear con ring activo (como Conquista). Idle = sin setState/s.
  const tick = useJornada4Tick(cronActivo);
  const nowMs = useMemo(() => Date.now(), [tick]);
  const timer = useMemo(
    () => computeSituacionTimerUi(vehicle, nowMs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, vehicle]
  );

  const rows = vehicle.subTareas ?? [];
  const cronRows = rows.filter(r => r.enDesgloseCronometro);
  const bloqueListo = pending.length === 0 && cronRows.length > 0;
  const doneCount = cronRows.filter(r => !situacionFilaCronometroPendiente(r)).length;
  const progressPct =
    cronRows.length > 0 ? Math.round((doneCount / cronRows.length) * 100) : 0;

  const gananciaVivo = useMemo(
    () => minutosGanadosEnVivoFoco(rows, vehicle.situacionCupoAnchor, nowMs),
    [rows, vehicle.situacionCupoAnchor, nowMs]
  );

  const remBudget = useMemo(
    () => remainingCronometroBudgetMin(sc, rows, nowMs),
    [sc, rows, nowMs]
  );

  const horarioById = useMemo(() => {
    if (!cronActivo || cronRows.length === 0) return new Map<string, { finLabel: string; minutosCupo: number; enFoco: boolean }>();
    const horarios = computeSituacionCronometroHorarios(cronRows, {
      bloqueInicioAt: sc?.bloqueInicioAt ?? vehicle.aperturaAt ?? nowMs,
      anchor: vehicle.situacionCupoAnchor,
      now: nowMs,
      previewTiempoGanado: true,
      horaFinContratoMs: situacionContratoFinMs(sc),
    });
    return new Map(horarios.map(h => [h.subTareaId, h]));
  }, [cronActivo, cronRows, sc, vehicle.aperturaAt, vehicle.situacionCupoAnchor, nowMs]);

  const familiaActiva = lastSeccionTitulo(rows);
  const seccionGroups = useMemo(() => groupSubsBySeccion(cronRows), [cronRows]);

  const sellar = () => {
    const texto = draftFila.trim();
    if (!texto || !cronActivo) return;
    const familia = draftSeccion.trim() || undefined;
    onAddFila(texto, familia);
    setDraftFila("");
    if (!familia) setDraftSeccion(familiaActiva ?? "");
  };

  return (
    <article
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${flotaColor}35` }}
      data-testid={`jornada4-situacion-${vehicle.id}`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLATA }} />
              <p className="text-sm font-bold truncate" style={{ color: INK }}>
                {vehicle.titulo}
              </p>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${flotaColor}20`, color: flotaColor }}
              >
                {FLOTA_CONFIG.situacion.label}
              </span>
              {entrenamiento ? (
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{ backgroundColor: `${CYAN}18`, color: CYAN }}
                  data-testid="j4-situacion-entrenamiento-badge"
                >
                  {ENTRENAMIENTO_COPY.ringBadge}
                </span>
              ) : null}
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Ring · {situacionProgressLabel(vehicle)}
              {remBudget != null ? ` · cupo ${remBudget} min` : ""}
              {vehicle.criterioDetalle ? ` · ${vehicle.criterioDetalle}` : ""}
            </p>
            {entrenamiento ? (
              <p className="text-[9px] mt-1 leading-snug" style={{ color: CYAN }}>
                {ENTRENAMIENTO_COPY.ringHint}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Zap size={10} style={{ color: flotaColor }} />
            <span className="text-xs font-black" style={{ color: flotaColor }}>
              {desglosadorProfundidadPotencialPs(cronRows.length)} PS
            </span>
          </div>
        </div>

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
        {timer.visible ? (
          <div className="mt-3 text-center">
            <p
              className="text-3xl font-black tabular-nums tracking-tight"
              style={{
                color: timer.expired ? BAD : flotaColor,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {timer.display}
            </p>
            {timer.targetLabel ? (
              <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                Meta {timer.targetLabel}
                {timer.debt ? ` · deuda ${timer.debt}` : ""}
              </p>
            ) : null}
            {gananciaVivo > 0 ? (
              <p className="mt-1 text-[10px] font-bold font-mono" style={{ color: OK }}>
                +{gananciaVivo} min ganados → se reparte en la cola
              </p>
            ) : null}
          </div>
        ) : null}

        {focus ? (
          <div
            className="p-3 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(148,163,184,0.08)",
              borderColor: flotaColor,
              boxShadow: `0 0 16px ${flotaColor}18`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Flag size={12} style={{ color: flotaColor }} />
                <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: flotaColor }}>
                  Fila en foco
                </p>
              </div>
              {cronActivo && pending.length >= 2 && onPostergarFoco ? (
                <button
                  type="button"
                  onClick={onPostergarFoco}
                  className="shrink-0 text-[8px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg touch-manipulation"
                  style={{
                    backgroundColor: `${AMBER}14`,
                    color: AMBER,
                    border: `1px solid ${AMBER}45`,
                  }}
                  data-testid="j4-situacion-postergar-foco"
                  title="Manda esta fila al final de la cola con sus minutos restantes"
                >
                  Postergar
                </button>
              ) : null}
            </div>
            {focus.seccionTitulo?.trim() ? (
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
                {focus.seccionTitulo.trim()}
                <span className="ml-1 font-bold normal-case tracking-normal" style={{ color: MUTED }}>
                  · título propio
                </span>
              </p>
            ) : null}
            <p className="text-sm font-bold" style={{ color: INK }}>
              {focus.texto}
            </p>
            {(focus.minutosCupo ?? 0) > 0 ? (
              <p className="text-[11px]" style={{ color: MUTED }}>
                Cupo {focus.minutosCupo} min
                {horarioById.get(focus.id)?.finLabel
                  ? ` · → ${horarioById.get(focus.id)!.finLabel}`
                  : ""}
              </p>
            ) : null}
            {onDestinoChange ? (
              <DestinoCierreToggle
                compact
                value={vehicle.destinoCierre}
                proyectoId={vehicle.proyectoId}
                onChange={onDestinoChange}
              />
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={cierreEnviando !== null}
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation select-none transition-transform duration-100 active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: `${OK}22`, color: OK, border: `1px solid ${OK}50` }}
                onClick={() => {
                  if (cierreEnviando) return;
                  setCierreEnviando("cumplido");
                  try {
                    navigator.vibrate?.(14);
                  } catch {
                    /* no haptic */
                  }
                  onCumplido(focus.id);
                }}
                data-testid="j4-situacion-cumplido"
              >
                {cierreEnviando === "cumplido"
                  ? "Enviando…"
                  : vehicle.destinoCierre === "peldano"
                    ? "Enviar · Dirección"
                    : "Cumplido"}
              </button>
              {!entrenamiento ? (
                <button
                  type="button"
                  disabled={cierreEnviando !== null}
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation select-none transition-transform duration-100 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1"
                  style={{ backgroundColor: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}55` }}
                  onClick={() => {
                    if (cierreEnviando) return;
                    setCierreEnviando("avance");
                    try {
                      navigator.vibrate?.(14);
                    } catch {
                      /* no haptic */
                    }
                    onAvance(focus.id);
                  }}
                  data-testid="j4-situacion-avance"
                >
                  <TrendingUp size={10} />
                  {cierreEnviando === "avance" ? "Enviando…" : "Avance"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={cierreEnviando !== null}
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation select-none transition-transform duration-100 active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: "transparent", color: BAD, border: `1px solid ${BAD}60` }}
                onClick={() => {
                  if (cierreEnviando) return;
                  setCierreEnviando("fallado");
                  try {
                    navigator.vibrate?.(14);
                  } catch {
                    /* no haptic */
                  }
                  onFallado(focus.id);
                }}
                data-testid="j4-situacion-fallado"
              >
                {cierreEnviando === "fallado" ? "Enviando…" : "Fallado"}
              </button>
            </div>
          </div>
        ) : bloqueListo ? (
          <div
            className="mt-3 p-4 rounded-xl border-2 space-y-3"
            style={{
              backgroundColor: "rgba(212,175,55,0.05)",
              borderColor: GOLD,
              boxShadow: "0 0 20px rgba(212,175,55,0.15)",
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
              Ring sin filas pendientes
            </p>
            {onDestinoChange ? (
              <DestinoCierreToggle
                value={vehicle.destinoCierre}
                proyectoId={vehicle.proyectoId}
                onChange={onDestinoChange}
              />
            ) : null}
            <button
              type="button"
              disabled={cierreEnviando !== null}
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation select-none transition-transform duration-100 active:scale-95 disabled:opacity-60"
              style={{
                backgroundColor: "rgba(212,175,55,0.18)",
                color: GOLD,
                border: "1px solid rgba(212,175,55,0.4)",
              }}
              onClick={() => {
                if (cierreEnviando) return;
                setCierreEnviando("bloque");
                try {
                  navigator.vibrate?.(14);
                } catch {
                  /* no haptic */
                }
                onCerrarBloque();
              }}
              data-testid="j4-situacion-cerrar-bloque"
            >
              {cierreEnviando === "bloque"
                ? "Enviando…"
                : vehicle.destinoCierre === "peldano"
                  ? "Cerrar bloque · Dirección"
                  : "Cerrar bloque"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            Ring sin filas. Lanza de nuevo con filas, o cierra el bloque.
          </p>
        )}

        {cronRows.length > 0 ? (
          <div className="space-y-1.5" data-testid={`j4-situacion-rows-${vehicle.id}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: MUTED }}>
                Desglose · cupos
              </p>
              <div className="flex items-center gap-2">
                {pending.length >= 2 && onReorderFilas ? (
                  <button
                    type="button"
                    onClick={() => setReorderMode(m => !m)}
                    className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: reorderMode
                        ? "rgba(139,92,246,0.2)"
                        : "rgba(255,255,255,0.06)",
                      color: reorderMode ? VIOLET : "rgba(255,255,255,0.55)",
                      border: `1px solid ${reorderMode ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.12)"}`,
                    }}
                    data-testid="j4-situacion-reorder-toggle"
                  >
                    {reorderMode ? "Listo" : "Reordenar cola"}
                  </button>
                ) : (
                  <p className="text-[8px] font-bold" style={{ color: MUTED }}>
                    Editar Min reparte el resto
                  </p>
                )}
              </div>
            </div>
            {seccionGroups.map(group => (
              <div
                key={`${group.seccion ?? "__bloque"}-${group.items[0]?.id ?? "x"}`}
                className="space-y-1.5"
                data-testid={
                  group.seccion
                    ? `j4-situacion-familia-${group.seccion}`
                    : "j4-situacion-familia-bloque"
                }
              >
                {group.seccion ? (
                  <p
                    className="text-[8px] font-black uppercase tracking-widest px-1 pt-1"
                    style={{ color: GOLD }}
                    data-testid="j4-situacion-familia-header"
                  >
                    {group.seccion}
                    <span className="ml-1 font-bold normal-case tracking-normal" style={{ color: MUTED }}>
                      · título propio
                    </span>
                  </p>
                ) : null}
            {group.items.map(row => {
              const isPending = situacionFilaCronometroPendiente(row);
              const pIdx = isPending ? pending.findIndex(p => p.id === row.id) : -1;
              const isFocus = focus?.id === row.id;
              const resultado =
                row.resultadoSituacion ?? (row.completada ? "cumplido" : "pendiente");
              const done = resultado === "cumplido";
              const fail = resultado === "fallado";
              const avance = resultado === "avance";
              const horario = horarioById.get(row.id);
              const cupoBase = row.minutosCupo ?? 0;
              const cupoEfectivo = horario?.minutosCupo ?? cupoBase;
              const bonusCola =
                isPending && !isFocus && cronActivo && cupoEfectivo > cupoBase
                  ? cupoEfectivo - cupoBase
                  : 0;
              const finLabel = horario?.finLabel ?? null;

              return (
                <div
                  key={row.id}
                  className="px-2.5 py-2 rounded-lg border space-y-1.5"
                  style={{
                    backgroundColor: isFocus
                      ? `${flotaColor}14`
                      : bonusCola > 0
                        ? "rgba(0,200,81,0.04)"
                        : "rgba(255,255,255,0.03)",
                    borderColor: isFocus
                      ? `${flotaColor}45`
                      : bonusCola > 0
                        ? "rgba(0,200,81,0.22)"
                        : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    {reorderMode && isPending && onReorderFilas && pIdx >= 0 ? (
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={pIdx === 0}
                          onClick={() => onReorderFilas(row.id, "up")}
                          className="p-0.5 rounded disabled:opacity-25"
                          title="Subir en cola"
                          data-testid={`j4-situacion-reorder-up-${row.id}`}
                        >
                          <ChevronUp size={12} style={{ color: MUTED }} />
                        </button>
                        <button
                          type="button"
                          disabled={pIdx === pending.length - 1}
                          onClick={() => onReorderFilas(row.id, "down")}
                          className="p-0.5 rounded disabled:opacity-25"
                          title="Bajar en cola"
                          data-testid={`j4-situacion-reorder-down-${row.id}`}
                        >
                          <ChevronDown size={12} style={{ color: MUTED }} />
                        </button>
                      </div>
                    ) : null}
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{
                        backgroundColor: done
                          ? `${OK}25`
                          : fail
                            ? `${BAD}25`
                            : avance
                              ? `${AMBER}25`
                              : isFocus
                                ? `${flotaColor}25`
                                : "rgba(255,255,255,0.06)",
                        color: done ? OK : fail ? BAD : avance ? AMBER : isFocus ? flotaColor : MUTED,
                      }}
                    >
                      {done ? <Check size={10} /> : fail ? <XIcon size={10} /> : avance ? <TrendingUp size={9} /> : cronRows.findIndex(r => r.id === row.id) + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: isFocus || isPending ? INK : avance ? AMBER : MUTED }}
                      >
                        {row.texto || `Fila ${cronRows.findIndex(r => r.id === row.id) + 1}`}
                      </p>
                      {fail && row.motivoCierre === "distraccion" ? (
                        <p className="text-[9px] font-bold mt-0.5" style={{ color: BAD }}>
                          {ENTRENAMIENTO_COPY.perdidaDistraccion}
                        </p>
                      ) : null}
                      {finLabel ? (
                        <p
                          className="text-[9px] font-mono font-bold mt-0.5"
                          style={{
                            color: isFocus ? GOLD : bonusCola > 0 ? OK : MUTED,
                          }}
                          data-testid={`j4-situacion-fin-${row.id}`}
                        >
                          → {finLabel}
                          {isPending && !isFocus && cupoEfectivo > 0
                            ? ` · ${cupoEfectivo}′`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    {entrenamiento &&
                    isPending &&
                    !isFocus &&
                    onSustituirFoco &&
                    cronActivo ? (
                      <button
                        type="button"
                        onClick={() => onSustituirFoco(row.id)}
                        className="text-[7px] font-black uppercase tracking-wider px-1.5 py-1 rounded shrink-0"
                        style={{
                          backgroundColor: `${CYAN}14`,
                          color: CYAN,
                          border: `1px solid ${CYAN}40`,
                        }}
                        data-testid={`j4-situacion-sustituir-${row.id}`}
                      >
                        {ENTRENAMIENTO_COPY.sustituirFoco}
                      </button>
                    ) : null}
                    {isPending &&
                    !isFocus &&
                    cronActivo &&
                    pending.length >= 2 &&
                    onQuitarFila ? (
                      <button
                        type="button"
                        onClick={() => onQuitarFila(row.id)}
                        className="text-[7px] font-black uppercase tracking-wider px-1.5 py-1 rounded shrink-0"
                        style={{
                          backgroundColor: "rgba(192,192,192,0.08)",
                          color: PLATA,
                          border: "1px solid rgba(192,192,192,0.35)",
                        }}
                        data-testid={`j4-situacion-quitar-${row.id}`}
                        title={RING_COPY.quitarDelPlanHint}
                      >
                        {RING_COPY.quitarDelPlan}
                      </button>
                    ) : null}
                  </div>

                  {isPending && cronActivo ? (
                    <div className="flex items-center gap-1.5 pl-7 flex-wrap">
                      <span
                        className="text-[7px] font-black uppercase tracking-wider flex items-center gap-0.5"
                        style={{ color: MUTED }}
                      >
                        Min
                        {row.cupoFijo ? (
                          <Lock size={8} style={{ color: GOLD }} />
                        ) : null}
                      </span>
                      {bonusCola > 0 ? (
                        <span
                          className="w-11 px-1 py-0.5 rounded text-[9px] text-center font-mono font-black inline-block"
                          style={{
                            backgroundColor: "rgba(0,200,81,0.15)",
                            color: OK,
                            border: "1px solid rgba(0,200,81,0.45)",
                          }}
                          title={`${cupoBase} min base + ${bonusCola} min ganados en vivo`}
                          data-testid={`j4-situacion-cupo-${row.id}`}
                        >
                          {cupoEfectivo}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={999}
                          key={`cupo-${row.id}-${row.minutosCupo ?? "x"}-${row.cupoFijo ? "f" : "x"}`}
                          defaultValue={row.minutosCupo ?? ""}
                          onBlur={e => {
                            const raw = e.target.value.trim();
                            const n =
                              raw === ""
                                ? undefined
                                : Math.max(0, Math.min(999, parseInt(raw, 10)));
                            if (raw !== "" && !Number.isFinite(n!)) return;
                            const prev = row.minutosCupo;
                            if (raw === "" && (prev === undefined || prev === 0)) return;
                            if (raw !== "" && n === prev) return;
                            onSetCupo(row.id, raw === "" ? undefined : n);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="w-11 px-1 py-0.5 rounded text-[9px] bg-black/50 border text-white text-center font-mono"
                          style={{
                            borderColor: row.cupoFijo
                              ? `${GOLD}55`
                              : "rgba(148,163,184,0.35)",
                          }}
                          title={
                            row.cupoFijo
                              ? "Fijado: el sobrante se reparte entre las demás filas"
                              : "Fija minutos; el resto se reparte automáticamente"
                          }
                          data-testid={`j4-situacion-cupo-${row.id}`}
                        />
                      )}
                      {bonusCola > 0 ? (
                        <span
                          className="text-[7px] font-black uppercase tracking-wide"
                          style={{ color: OK }}
                        >
                          +{bonusCola} ganados
                        </span>
                      ) : null}
                    </div>
                  ) : (row.minutosCupo ?? 0) > 0 ? (
                    <p className="pl-7 text-[9px] font-mono font-bold" style={{ color: MUTED }}>
                      {row.minutosCupo}m
                    </p>
                  ) : null}
                </div>
              );
            })}
              </div>
            ))}
          </div>
        ) : null}

        {cronActivo ? (
          <div className="space-y-1.5" data-testid={`j4-situacion-sellar-${vehicle.id}`}>
            <input
              type="text"
              value={draftSeccion}
              onChange={e => setDraftSeccion(e.target.value)}
              placeholder={
                vehicle.titulo?.trim()
                  ? `Familia · vacío = sale de «${vehicle.titulo.trim()}»`
                  : "Familia / título propio (vacío = sale del bloque)"
              }
              className="w-full p-2 rounded-lg bg-black/40 border text-white text-[10px] placeholder:text-slate-600 focus:outline-none"
              style={{ borderColor: draftSeccion.trim() ? `${GOLD}55` : "rgba(255,255,255,0.12)" }}
              data-testid={`j4-situacion-sellar-seccion-${vehicle.id}`}
            />
            <div className="flex gap-2">
            <input
              type="text"
              value={draftFila}
              onChange={e => setDraftFila(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sellar();
                }
              }}
              placeholder="Nueva subtarea para el ring…"
              className="min-w-0 flex-1 p-2 rounded-lg bg-black/40 border text-white text-[10px] placeholder:text-slate-600 focus:outline-none"
              style={{ borderColor: "rgba(0,200,81,0.25)" }}
              data-testid={`j4-situacion-sellar-input-${vehicle.id}`}
            />
            <button
              type="button"
              disabled={!draftFila.trim()}
              onClick={sellar}
              className="px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30 text-[7px] font-black uppercase leading-tight max-w-[5.5rem]"
              style={{
                backgroundColor: "rgba(0,255,195,0.12)",
                color: "#00FFC3",
                border: "1px solid rgba(0,255,195,0.35)",
              }}
              title="Crear y sellar directo en el ring"
              data-testid={`j4-situacion-sellar-btn-${vehicle.id}`}
            >
              {RING_COPY.sellarDirectoRing}
            </button>
            </div>
          </div>
        ) : null}

        {rows.length > 0 && !focus && !bloqueListo ? (
          <button
            type="button"
            className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider"
            style={{ color: MUTED, border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={onCerrarBloque}
            data-testid="j4-situacion-cerrar-bloque-alt"
          >
            Cerrar bloque
          </button>
        ) : null}
      </div>
    </article>
  );
}

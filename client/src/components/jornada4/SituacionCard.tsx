import { useMemo, useState } from "react";
import { Check, Flag, Lock, X as XIcon, Zap } from "lucide-react";
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

const OK = "#00C851";
const BAD = "#FF2A2A";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const GOLD = "#D4AF37";
const flotaColor = FLOTA_CONFIG.situacion.color;

type Props = {
  vehicle: Vehicle;
  onCumplido: (subTareaId: string) => void;
  onFallado: (subTareaId: string) => void;
  onCerrarBloque: () => void;
  onAddFila: (texto: string) => void;
  onSetCupo: (subTareaId: string, minutos: number | undefined) => void;
};

export function SituacionCard({
  vehicle,
  onCumplido,
  onFallado,
  onCerrarBloque,
  onAddFila,
  onSetCupo,
}: Props) {
  const [draftFila, setDraftFila] = useState("");
  const pending = situacionPendingCronRows(vehicle);
  const focusId = vehicle.situacionCupoAnchor?.subTareaId;
  const focus = pending.find(st => st.id === focusId) ?? pending[0] ?? null;
  const sc = vehicle.situacionCronometro;
  const cronActivo = sc?.activo === true;

  const tick = useJornada4Tick(true);
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

  const sellar = () => {
    const texto = draftFila.trim();
    if (!texto || !cronActivo) return;
    onAddFila(texto);
    setDraftFila("");
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
            </div>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>
              Ring · {situacionProgressLabel(vehicle)}
              {remBudget != null ? ` · cupo ${remBudget} min` : ""}
              {vehicle.criterioDetalle ? ` · ${vehicle.criterioDetalle}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Zap size={10} style={{ color: flotaColor }} />
            <span className="text-xs font-black" style={{ color: flotaColor }}>
              3-7 PS
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
            <div className="flex items-center gap-2">
              <Flag size={12} style={{ color: flotaColor }} />
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: flotaColor }}>
                Fila en foco
              </p>
            </div>
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
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                style={{ backgroundColor: `${OK}22`, color: OK, border: `1px solid ${OK}50` }}
                onClick={() => onCumplido(focus.id)}
                data-testid="j4-situacion-cumplido"
              >
                Cumplido
              </button>
              <button
                type="button"
                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider touch-manipulation"
                style={{ backgroundColor: "transparent", color: BAD, border: `1px solid ${BAD}60` }}
                onClick={() => onFallado(focus.id)}
                data-testid="j4-situacion-fallado"
              >
                Fallado
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
            <button
              type="button"
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: "rgba(212,175,55,0.18)",
                color: GOLD,
                border: "1px solid rgba(212,175,55,0.4)",
              }}
              onClick={onCerrarBloque}
              data-testid="j4-situacion-cerrar-bloque"
            >
              Cerrar bloque
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
              <p className="text-[8px] font-bold" style={{ color: MUTED }}>
                Editar Min reparte el resto
              </p>
            </div>
            {cronRows.map((row, idx) => {
              const isPending = situacionFilaCronometroPendiente(row);
              const isFocus = focus?.id === row.id;
              const resultado =
                row.resultadoSituacion ?? (row.completada ? "cumplido" : "pendiente");
              const done = resultado === "cumplido";
              const fail = resultado === "fallado";
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
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{
                        backgroundColor: done
                          ? `${OK}25`
                          : fail
                            ? `${BAD}25`
                            : isFocus
                              ? `${flotaColor}25`
                              : "rgba(255,255,255,0.06)",
                        color: done ? OK : fail ? BAD : isFocus ? flotaColor : MUTED,
                      }}
                    >
                      {done ? <Check size={10} /> : fail ? <XIcon size={10} /> : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: isFocus || isPending ? INK : MUTED }}
                      >
                        {row.texto || `Fila ${idx + 1}`}
                      </p>
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
        ) : null}

        {cronActivo ? (
          <div className="flex gap-2" data-testid={`j4-situacion-sellar-${vehicle.id}`}>
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

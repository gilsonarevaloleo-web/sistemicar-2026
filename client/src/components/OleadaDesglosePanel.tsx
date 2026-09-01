import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Target, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  nextOleadaPuntoStatus,
  OLEADA_PUNTO_STATUS_LABEL,
  resolvePuntoProduccion,
  summarizeOleadaPuntos,
  type OleadaPunto,
  type OleadaPuntoStatus,
} from "@/lib/oleadaPuntos";
import {
  formatDuracionTimon,
  formatHoraLabel,
  horaEnCurso,
  horasDeEpisodio,
  type TimonEpisodio,
} from "@/lib/timonHoras";

const STATUS_COLOR: Record<OleadaPuntoStatus, string> = {
  propuesta: "#94a3b8",
  avance: "#38BDF8",
  cumplido: "#50C878",
  fallado: "#f87171",
};

type Props = {
  puntos: OleadaPunto[];
  puntoProduccionId?: string;
  timonEpisodio?: TimonEpisodio | null;
  tint: string;
  disabled?: boolean;
  pulseId?: string | null;
  pulseDir?: "up" | "down" | null;
  onAdd: (titulo: string) => Promise<void> | void;
  onUpdateTitulo: (puntoId: string, titulo: string) => Promise<void> | void;
  onCycleStatus: (puntoId: string, next: OleadaPuntoStatus) => Promise<void> | void;
  onDelete: (puntoId: string) => Promise<void> | void;
  onReorder: (puntoId: string, direction: "up" | "down") => Promise<void> | void;
  onSetPuntoProduccion: (puntoId: string) => Promise<void> | void;
};

function PuntoTituloInput({
  punto,
  disabled,
  onCommit,
}: {
  punto: OleadaPunto;
  disabled?: boolean;
  onCommit: (titulo: string) => void;
}) {
  const [value, setValue] = useState(punto.titulo);
  useEffect(() => {
    setValue(punto.titulo);
  }, [punto.titulo, punto.id]);

  return (
    <input
      value={value}
      disabled={disabled}
      onChange={e => setValue(e.target.value)}
      onBlur={() => {
        const next = value.trim();
        if (next && next !== punto.titulo) onCommit(next);
        else setValue(punto.titulo);
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-full bg-transparent text-[12px] text-white placeholder:text-slate-600 focus:outline-none border-b border-transparent focus:border-white/15 pb-0.5"
      data-testid={`hub-oleada-punto-titulo-${punto.numero}`}
    />
  );
}

/**
 * Desglose de oleada = puntos de producción.
 * El pin es el timón: los envíos se suman en horas enumeradas hasta un cambio consciente.
 */
export function OleadaDesglosePanel({
  puntos,
  puntoProduccionId,
  timonEpisodio = null,
  tint,
  disabled = false,
  pulseId = null,
  pulseDir = null,
  onAdd,
  onUpdateTitulo,
  onCycleStatus,
  onDelete,
  onReorder,
  onSetPuntoProduccion,
}: Props) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [held, setHeld] = useState<{ id: string; dir: "up" | "down" } | null>(null);
  const pin = resolvePuntoProduccion({ puntoProduccionId, oleadaPuntos: puntos });
  const summary = summarizeOleadaPuntos(puntos);
  const horas = timonEpisodio ? horasDeEpisodio(timonEpisodio) : [];
  const horaN = horaEnCurso(timonEpisodio?.minutosAcumulados ?? 0);
  const vehiculosEnTimón = timonEpisodio?.vehiculos.length ?? 0;

  const handleAdd = async () => {
    const t = draft.trim();
    if (!t || adding || disabled) return;
    setAdding(true);
    try {
      await onAdd(t);
      setDraft("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="p-3 rounded-xl border space-y-3"
      style={{ backgroundColor: "#0a0a0a", borderColor: `${tint}30` }}
      data-testid="hub-oleada-desglose"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"
            style={{ color: tint }}
          >
            <Target size={12} /> Punto de producción
          </p>
          <p className="text-[8px] text-slate-500 mt-1 leading-relaxed">
            Timón de la oleada. Suma la pared real de cada vehículo en horas 1, 2, 3…
            Marca cumplido el timón para sellar el peldaño y pasar al siguiente punto.
          </p>
        </div>
        {summary.total > 0 ? (
          <p className="text-[8px] text-slate-500 shrink-0 tabular-nums pt-0.5">
            {summary.cumplido}/{summary.total}
          </p>
        ) : null}
      </div>

      {pin ? (
        <div
          className="px-2.5 py-2 rounded-lg"
          style={{ backgroundColor: `${tint}10`, border: `1px solid ${tint}28` }}
          data-testid="hub-oleada-foco"
        >
          <p className="text-[8px] uppercase tracking-widest text-slate-500 mb-0.5">
            Produciendo aquí
          </p>
          <p className="text-[12px] font-semibold text-white leading-snug">
            <span style={{ color: tint }}>{pin.numero}.</span> {pin.titulo}
          </p>
          <div
            className="mt-2 flex items-end justify-between gap-2"
            data-testid="hub-oleada-timon-horas"
          >
            <div>
              <p className="text-[16px] font-black tabular-nums leading-none" style={{ color: tint }}>
                {formatHoraLabel(horaN)}
              </p>
              <p className="text-[8px] text-slate-500 mt-1">
                {vehiculosEnTimón === 0
                  ? "Este enfoque acaba de empezar"
                  : `${formatDuracionTimon(timonEpisodio?.minutosAcumulados ?? 0)} en este timón · ${vehiculosEnTimón} vehículo${vehiculosEnTimón === 1 ? "" : "s"}`}
              </p>
            </div>
            {timonEpisodio && timonEpisodio.minutosAcumulados > 0 ? (
              <div
                className="w-16 h-1 rounded-full overflow-hidden shrink-0 mb-0.5"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                aria-hidden
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((horas.find(h => h.numero === horaN)?.minutos ?? 0) / 60) * 100)}%`,
                    backgroundColor: tint,
                  }}
                />
              </div>
            ) : null}
          </div>
          {horas.some(h => h.vehiculos.length > 0) ? (
            <ul className="mt-2 space-y-1" data-testid="hub-oleada-timon-horas-lista">
              {horas.map(h => (
                <li key={h.numero} className="text-[9px] text-slate-400 leading-snug">
                  <span className="font-bold tabular-nums" style={{ color: h.completa ? tint : "#94a3b8" }}>
                    {formatHoraLabel(h.numero)}
                  </span>
                  {h.completa ? (
                    <span className="ml-1 text-[8px] uppercase tracking-wider" style={{ color: tint }}>
                      cerrada
                    </span>
                  ) : (
                    <span className="ml-1 text-[8px] uppercase tracking-wider text-slate-600">
                      en curso
                    </span>
                  )}
                  {h.vehiculos.length > 0 ? (
                    <span className="text-slate-600">
                      {" "}
                      · {h.vehiculos.map(v => `${v.titulo} (${formatDuracionTimon(v.minutos)})`).join(" · ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {puntos.length === 0 ? (
        <p className="text-[10px] text-slate-600 py-1" data-testid="hub-oleada-desglose-vacio">
          Aún no hay puntos. Enumera el desglose (ej. color negro small). Sin punto de
          producción, los vehículos no llegan a Dirección.
        </p>
      ) : (
        <ul className="space-y-1.5" data-testid="hub-oleada-puntos-lista">
          {puntos.map((p, idx) => {
            const isPin = pin?.id === p.id;
            const color = STATUS_COLOR[p.status];
            return (
              <li
                key={p.id}
                className={cn(
                  "rounded-lg px-2 py-1.5 flex items-start gap-1.5 transition-[border-color,box-shadow,background-color] duration-150",
                  isPin ? "bg-white/[0.04]" : "bg-transparent"
                )}
                style={{
                  border: `1px solid ${
                    pulseId === p.id ? `${tint}70` : isPin ? `${tint}35` : "rgba(255,255,255,0.08)"
                  }`,
                  boxShadow: pulseId === p.id ? `0 0 12px ${tint}30` : undefined,
                }}
                data-testid={`hub-oleada-punto-${p.numero}`}
              >
                <div className="flex flex-col gap-0.5 pt-0.5">
                  {(["up", "down"] as const).map(dir => {
                    const disabledBtn = disabled || (dir === "up" ? idx === 0 : idx === puntos.length - 1);
                    const on =
                      !disabledBtn &&
                      ((held?.id === p.id && held.dir === dir) ||
                        (pulseId === p.id && pulseDir === dir));
                    const Icon = dir === "up" ? ChevronUp : ChevronDown;
                    return (
                      <button
                        key={dir}
                        type="button"
                        disabled={disabledBtn}
                        onPointerDown={() => {
                          if (disabledBtn) return;
                          setHeld({ id: p.id, dir });
                        }}
                        onPointerUp={() => setHeld(null)}
                        onPointerCancel={() => setHeld(null)}
                        onPointerLeave={() => setHeld(null)}
                        onClick={() => void onReorder(p.id, dir)}
                        className="p-1 rounded touch-manipulation select-none transition-all duration-100 disabled:opacity-20"
                        style={{
                          color: on ? tint : undefined,
                          backgroundColor: on ? `${tint}28` : undefined,
                          boxShadow: on ? `0 0 10px ${tint}40` : undefined,
                          transform: on ? "scale(0.88)" : undefined,
                        }}
                        aria-label={dir === "up" ? "Subir punto" : "Bajar punto"}
                        aria-pressed={on}
                        data-testid={`hub-oleada-punto-${dir}-${p.numero}`}
                      >
                        <Icon size={11} className={on ? undefined : "text-slate-600"} />
                      </button>
                    );
                  })}
                </div>

                <span
                  className="text-[11px] font-black tabular-nums pt-1.5 w-4 shrink-0"
                  style={{ color: isPin ? tint : "#64748b" }}
                >
                  {p.numero}
                </span>

                <div className="flex-1 min-w-0 space-y-1">
                  <PuntoTituloInput
                    punto={p}
                    disabled={disabled}
                    onCommit={titulo => void onUpdateTitulo(p.id, titulo)}
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void onCycleStatus(p.id, nextOleadaPuntoStatus(p.status))}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                      style={{
                        color,
                        backgroundColor: `${color}14`,
                        border: `1px solid ${color}35`,
                      }}
                      title="Ciclar estatus (propuesta → avance → cumplido → fallado)"
                      data-testid={`hub-oleada-punto-status-${p.numero}`}
                    >
                      {OLEADA_PUNTO_STATUS_LABEL[p.status]}
                    </button>
                    {isPin ? (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                        style={{ color: tint, border: `1px solid ${tint}40` }}
                        data-testid={`hub-oleada-punto-pin-${p.numero}`}
                      >
                        Timón
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void onSetPuntoProduccion(p.id)}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
                        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                        data-testid={`hub-oleada-punto-producir-${p.numero}`}
                      >
                        Producir aquí
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onDelete(p.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 shrink-0"
                  aria-label="Borrar punto"
                  data-testid={`hub-oleada-punto-borrar-${p.numero}`}
                >
                  <Trash2 size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-1.5">
        <input
          value={draft}
          disabled={disabled || adding}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="Nuevo punto de producción…"
          className="flex-1 px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-[12px] text-white placeholder:text-slate-600 focus:outline-none"
          data-testid="hub-oleada-punto-nuevo"
        />
        <button
          type="button"
          disabled={disabled || adding || !draft.trim()}
          onClick={() => void handleAdd()}
          className="px-2.5 rounded-lg disabled:opacity-40"
          style={{ backgroundColor: `${tint}18`, color: tint, border: `1px solid ${tint}40` }}
          aria-label="Añadir punto"
          data-testid="hub-oleada-punto-add"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

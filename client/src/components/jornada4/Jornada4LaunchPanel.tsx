import { memo, useCallback, useEffect, useState } from "react";
import { Plus, Rocket, Trash2, X } from "lucide-react";
import { FLOTA_CONFIG, getSubVehicleRecordSuggestions } from "@/components/flota/vehicleCardShared";
import { FLOTA_SELECTOR_DISCRIMINATOR } from "@/lib/flotaBrand";
import type { DesglosadorSubFormRow } from "@/lib/executeFlotaLaunch";
import type { Jornada4LaunchForm } from "@/jornada4/executeJornada4Launch";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, ACCENT, GOLD } = J4_COLORS;
const V4_TIPOS = ["tiempo", "situacion"] as const;

type Props = {
  onLaunch: (form: Jornada4LaunchForm) => Promise<string | null>;
  disabled?: boolean;
};

function makeSub(): DesglosadorSubFormRow {
  return {
    tempId: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    titulo: "",
    cantidadObjetivo: "",
  };
}

/** Altura visible del viewport (teclado móvil) → el sheet no se esconde detrás. */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(covered);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);
  return inset;
}

/**
 * Lanzador Dual Kernel con La Flota visible (solo Conquista + Enfoque).
 * Sheet móvil: header + scroll + CTA fijo (no se pierde bajo teclado/nav).
 */
export const Jornada4LaunchPanel = memo(function Jornada4LaunchPanel({
  onLaunch,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState<(typeof V4_TIPOS)[number] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [subs, setSubs] = useState<DesglosadorSubFormRow[]>([makeSub()]);
  const [filas, setFilas] = useState<string[]>([""]);
  const [minutos, setMinutos] = useState(30);
  const [terminoDetalle, setTerminoDetalle] = useState("Al cerrar este bloque");
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const reset = useCallback(() => {
    setTipo(null);
    setTitulo("");
    setSubs([makeSub()]);
    setFilas([""]);
    setMinutos(30);
    setTerminoDetalle("Al cerrar este bloque");
    setOpen(false);
  }, []);

  const openTipo = useCallback((t: (typeof V4_TIPOS)[number]) => {
    setTipo(t);
    if (t === "situacion" && !terminoDetalle.trim()) {
      setTerminoDetalle("Al cerrar este bloque");
    }
    setOpen(true);
  }, [terminoDetalle]);

  const canLaunch =
    titulo.trim().length > 0 &&
    tipo != null &&
    (tipo === "tiempo"
      ? subs.some(s => s.titulo.trim())
      : filas.some(f => f.trim()));

  const handleLaunch = useCallback(async () => {
    if (!tipo || saving || !canLaunch) return;
    setSaving(true);
    try {
      const id = await onLaunch({
        titulo,
        tipoFlota: tipo,
        desglosadorSubs: tipo === "tiempo" ? subs : undefined,
        situacionFilas: tipo === "situacion" ? filas : undefined,
        situacionMinutosBloque: tipo === "situacion" ? minutos : undefined,
        terminoDetalle: tipo === "situacion" ? terminoDetalle : undefined,
      });
      if (id) reset();
    } finally {
      setSaving(false);
    }
  }, [tipo, saving, canLaunch, onLaunch, titulo, subs, filas, minutos, terminoDetalle, reset]);

  return (
    <div className="px-4 pb-3 space-y-3" data-testid="jornada4-launch">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
            La Flota
          </p>
          <p className="text-[9px] mt-0.5 leading-snug" style={{ color: MUTED }}>
            {FLOTA_SELECTOR_DISCRIMINATOR}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setTipo(null);
            setOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider touch-manipulation shrink-0"
          style={{
            borderColor: `${GOLD}40`,
            backgroundColor: `${GOLD}12`,
            color: GOLD,
          }}
          data-testid="jornada4-launch-open"
        >
          <Rocket size={12} /> Lanzar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2" data-testid="jornada4-flota-grid">
        {V4_TIPOS.map(t => {
          const cfg = FLOTA_CONFIG[t];
          const Icon = cfg.icon;
          return (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => openTipo(t)}
              className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] touch-manipulation disabled:opacity-40"
              style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}
              data-testid={`jornada4-flota-${t}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${cfg.color}20` }}
              >
                <Icon size={20} style={{ color: cfg.color }} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="text-[9px] text-center leading-tight" style={{ color: MUTED }}>
                {cfg.sublabel}
              </span>
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
              >
                {cfg.relojLabel}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[9px]" style={{ color: MUTED }}>
        Dual Kernel · solo estos 2 vehículos (sin descanso ni verdad)
      </p>

      {open ? (
        <div
          className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.82)",
            paddingBottom: keyboardInset > 0 ? keyboardInset : undefined,
          }}
          onClick={() => !saving && reset()}
          data-testid="jornada4-launch-overlay"
        >
          <div
            className="w-full max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: PIZARRA,
              borderColor: "rgba(255,255,255,0.1)",
              maxHeight:
                keyboardInset > 0
                  ? `min(92vh, calc(100dvh - ${keyboardInset}px - 8px))`
                  : "min(92vh, 100dvh - 1rem)",
              marginBottom: keyboardInset > 0 ? 0 : "max(0.5rem, env(safe-area-inset-bottom))",
            }}
            onClick={e => e.stopPropagation()}
            data-testid="jornada4-launch-panel"
          >
            {/* Header fijo */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: ACCENT }}
                >
                  Jornada V4
                </p>
                <p className="text-sm font-bold" style={{ color: INK }}>
                  Lanzar vehículo
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && reset()}
                className="p-2 rounded-lg hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X size={16} style={{ color: MUTED }} />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
              {!tipo ? (
                <div className="grid grid-cols-2 gap-2">
                  {V4_TIPOS.map(t => {
                    const cfg = FLOTA_CONFIG[t];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className="p-3 rounded-xl border flex flex-col items-center gap-1.5 touch-manipulation"
                        style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}
                        data-testid={`jornada4-launch-tipo-${t === "tiempo" ? "conquista" : "situacion"}`}
                      >
                        <Icon size={18} style={{ color: cfg.color }} />
                        <span className="text-[10px] font-black uppercase" style={{ color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = FLOTA_CONFIG[tipo];
                      const Icon = cfg.icon;
                      return (
                        <>
                          <Icon size={14} style={{ color: cfg.color }} />
                          <span
                            className="text-xs font-black uppercase"
                            style={{ color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        </>
                      );
                    })()}
                    <button
                      type="button"
                      className="ml-auto text-[8px] uppercase"
                      style={{ color: MUTED }}
                      onClick={() => setTipo(null)}
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label
                      className="text-[9px] uppercase tracking-wider block mb-1"
                      style={{ color: MUTED }}
                    >
                      Nombre de la misión
                    </label>
                    <input
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      placeholder={
                        tipo === "tiempo" ? "Ej: Producción del día" : "Ej: Enfoque de la tarde"
                      }
                      className="w-full p-3 rounded-xl bg-black/40 border text-sm focus:outline-none"
                      style={{
                        color: INK,
                        borderColor: titulo
                          ? FLOTA_CONFIG[tipo].color
                          : "rgba(255,255,255,0.1)",
                      }}
                      autoFocus
                      data-testid="jornada4-launch-titulo"
                    />
                  </div>

                  {tipo === "tiempo" ? (
                    <div className="space-y-3">
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                        Unidades del desglosador
                      </p>
                      {subs.map((sub, idx) => {
                        const suggestions = getSubVehicleRecordSuggestions(sub.titulo);
                        const cant = Number(sub.cantidadObjetivo) || 0;
                        const record = sub.tiempoRecordMinPerUnit;
                        const projMin =
                          cant > 0 && record && record > 0
                            ? Math.round(cant * record)
                            : null;
                        return (
                          <div
                            key={sub.tempId}
                            className="rounded-xl border p-3 space-y-2"
                            style={{
                              borderColor: "rgba(255,255,255,0.08)",
                              backgroundColor: "rgba(0,0,0,0.35)",
                            }}
                            data-testid={`jornada4-launch-sub-${idx}`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="text-[9px] font-black uppercase"
                                style={{ color: MUTED }}
                              >
                                Unidad {idx + 1}
                              </span>
                              {subs.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setSubs(subs.filter((_, i) => i !== idx))}
                                  className="p-1.5 rounded-lg hover:bg-white/5"
                                  aria-label={`Quitar unidad ${idx + 1}`}
                                >
                                  <Trash2 size={12} style={{ color: MUTED }} />
                                </button>
                              ) : null}
                            </div>
                            <div>
                              <label
                                className="text-[8px] uppercase tracking-wider block mb-1"
                                style={{ color: MUTED }}
                              >
                                Nombre
                              </label>
                              <input
                                value={sub.titulo}
                                onChange={e => {
                                  const next = [...subs];
                                  next[idx] = { ...sub, titulo: e.target.value };
                                  setSubs(next);
                                }}
                                placeholder="Ej: Armar pretina"
                                className="w-full p-2.5 rounded-lg bg-black/50 border text-sm focus:outline-none"
                                style={{ color: INK, borderColor: "rgba(255,255,255,0.1)" }}
                              />
                              {suggestions.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {suggestions.map(s => (
                                    <button
                                      key={`${s.titulo}-${s.minPerUnit}`}
                                      type="button"
                                      onClick={() => {
                                        const next = [...subs];
                                        next[idx] = {
                                          ...sub,
                                          titulo: s.titulo,
                                          tiempoRecordMinPerUnit: s.minPerUnit,
                                        };
                                        setSubs(next);
                                      }}
                                      className="text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider"
                                      style={{
                                        backgroundColor: "rgba(249,115,22,0.12)",
                                        color: "#f97316",
                                        border: "1px solid rgba(249,115,22,0.35)",
                                      }}
                                      data-testid={`jornada4-record-chip-${idx}`}
                                    >
                                      {s.titulo.slice(0, 18)}
                                      {s.titulo.length > 18 ? "…" : ""} ·{" "}
                                      {s.minPerUnit.toFixed(1)} MIN/U
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label
                                  className="text-[8px] uppercase tracking-wider block mb-1"
                                  style={{ color: MUTED }}
                                >
                                  Cantidad
                                </label>
                                <input
                                  value={sub.cantidadObjetivo}
                                  onChange={e => {
                                    const next = [...subs];
                                    next[idx] = {
                                      ...sub,
                                      cantidadObjetivo: e.target.value,
                                    };
                                    setSubs(next);
                                  }}
                                  placeholder="Ej: 9"
                                  inputMode="numeric"
                                  className="w-full p-2.5 rounded-lg bg-black/50 border text-sm focus:outline-none"
                                  style={{ color: INK, borderColor: "rgba(255,255,255,0.1)" }}
                                  aria-label={`Cantidad unidad ${idx + 1}`}
                                />
                              </div>
                              <div>
                                <label
                                  className="text-[8px] uppercase tracking-wider block mb-1"
                                  style={{ color: MUTED }}
                                >
                                  Récord MIN/U
                                </label>
                                <input
                                  value={
                                    sub.tiempoRecordMinPerUnit != null
                                      ? String(sub.tiempoRecordMinPerUnit)
                                      : ""
                                  }
                                  onChange={e => {
                                    const raw = e.target.value.trim();
                                    const next = [...subs];
                                    const n = Number(raw);
                                    next[idx] = {
                                      ...sub,
                                      tiempoRecordMinPerUnit:
                                        raw === "" || !Number.isFinite(n) || n <= 0
                                          ? undefined
                                          : n,
                                    };
                                    setSubs(next);
                                  }}
                                  placeholder="Ej: 1.5"
                                  inputMode="decimal"
                                  className="w-full p-2.5 rounded-lg bg-black/50 border text-sm focus:outline-none"
                                  style={{
                                    color: INK,
                                    borderColor: record
                                      ? "rgba(249,115,22,0.45)"
                                      : "rgba(255,255,255,0.1)",
                                  }}
                                  aria-label={`Récord min/u unidad ${idx + 1}`}
                                  data-testid={`jornada4-launch-record-${idx}`}
                                />
                              </div>
                            </div>
                            {record ? (
                              <p
                                className="text-[9px] font-mono font-bold"
                                style={{ color: GOLD }}
                                data-testid={`jornada4-launch-proj-${idx}`}
                              >
                                Récord: {record.toFixed(1)} MIN/U
                                {projMin != null ? ` — ≈${projMin} min obj` : " — escribe cuántas unidades"}
                              </p>
                            ) : (
                              <p className="text-[8px]" style={{ color: MUTED }}>
                                Sin récord = primer ciclo (medición al Cumplido)
                              </p>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setSubs([...subs, makeSub()])}
                        className="flex items-center gap-1 text-[8px] font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        <Plus size={10} /> Añadir unidad
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label
                          className="text-[9px] uppercase tracking-wider mb-1 block"
                          style={{ color: MUTED }}
                        >
                          Criterio de cierre
                        </label>
                        <input
                          value={terminoDetalle}
                          onChange={e => setTerminoDetalle(e.target.value)}
                          className="w-full p-3 rounded-xl bg-black/40 border text-sm focus:outline-none"
                          style={{ color: INK, borderColor: "rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                          Filas del ring
                        </p>
                        <label
                          className="text-[9px] flex items-center gap-2"
                          style={{ color: MUTED }}
                        >
                          Min bloque
                          <input
                            type="number"
                            min={5}
                            max={180}
                            value={minutos}
                            onChange={e =>
                              setMinutos(Math.max(5, Number(e.target.value) || 30))
                            }
                            className="w-14 p-1.5 rounded-lg bg-black/40 border text-xs text-right focus:outline-none"
                            style={{ color: INK, borderColor: "rgba(255,255,255,0.08)" }}
                          />
                        </label>
                      </div>
                      {filas.map((fila, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <input
                            value={fila}
                            onChange={e => {
                              const next = [...filas];
                              next[idx] = e.target.value;
                              setFilas(next);
                            }}
                            placeholder={`Fila ${idx + 1}`}
                            className="flex-1 p-2.5 rounded-lg bg-black/40 border text-sm focus:outline-none"
                            style={{ color: INK, borderColor: "rgba(255,255,255,0.08)" }}
                          />
                          {filas.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setFilas(filas.filter((_, i) => i !== idx))}
                              className="p-2 rounded-lg hover:bg-white/5"
                            >
                              <Trash2 size={12} style={{ color: MUTED }} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFilas([...filas, ""])}
                        className="flex items-center gap-1 text-[8px] font-black uppercase"
                        style={{ color: MUTED }}
                      >
                        <Plus size={10} /> Añadir fila
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CTA fijo: siempre visible sobre teclado / nav */}
            {tipo ? (
              <div
                className="shrink-0 border-t border-white/5 px-4 pt-3"
                style={{
                  paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
                  backgroundColor: PIZARRA,
                }}
              >
                {!canLaunch ? (
                  <p className="mb-2 text-center text-[9px]" style={{ color: MUTED }}>
                    {tipo === "tiempo"
                      ? "Escribe nombre de misión + al menos una unidad"
                      : "Escribe nombre de misión + al menos una fila"}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={!canLaunch || saving}
                  onClick={() => void handleLaunch()}
                  className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-40 touch-manipulation"
                  style={{
                    backgroundColor: canLaunch
                      ? FLOTA_CONFIG[tipo].color
                      : `${FLOTA_CONFIG[tipo].color}18`,
                    color: canLaunch ? "#0a0a0a" : FLOTA_CONFIG[tipo].color,
                    border: `1px solid ${FLOTA_CONFIG[tipo].color}40`,
                  }}
                  data-testid="jornada4-launch-submit"
                >
                  {saving ? "Lanzando…" : "Lanzar vehículo"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});

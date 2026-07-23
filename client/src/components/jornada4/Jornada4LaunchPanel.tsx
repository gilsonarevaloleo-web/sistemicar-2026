import { memo, useCallback, useState } from "react";
import { Plus, Rocket, Trash2, X } from "lucide-react";
import { FLOTA_CONFIG } from "@/components/flota/vehicleCardShared";
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

/**
 * Lanzador Dual Kernel con La Flota visible (solo Conquista + Enfoque).
 * Misma lectura que /planeacion: grid → formulario → Lanzar vehículo.
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
          onClick={() => !saving && reset()}
        >
          <div
            className="w-full max-w-md rounded-2xl border overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: PIZARRA,
              borderColor: "rgba(255,255,255,0.1)",
            }}
            onClick={e => e.stopPropagation()}
            data-testid="jornada4-launch-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
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
              >
                <X size={16} style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
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
                    <div className="space-y-2">
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                        Unidades del desglosador
                      </p>
                      {subs.map((sub, idx) => (
                        <div key={sub.tempId} className="flex gap-1.5 items-center">
                          <input
                            value={sub.titulo}
                            onChange={e => {
                              const next = [...subs];
                              next[idx] = { ...sub, titulo: e.target.value };
                              setSubs(next);
                            }}
                            placeholder={`Unidad ${idx + 1}`}
                            className="flex-1 p-2 rounded-lg bg-black/40 border text-xs focus:outline-none"
                            style={{ color: INK, borderColor: "rgba(255,255,255,0.08)" }}
                          />
                          <input
                            value={sub.cantidadObjetivo}
                            onChange={e => {
                              const next = [...subs];
                              next[idx] = { ...sub, cantidadObjetivo: e.target.value };
                              setSubs(next);
                            }}
                            placeholder="u"
                            inputMode="numeric"
                            className="w-12 p-2 rounded-lg bg-black/40 border text-xs text-center focus:outline-none"
                            style={{ color: INK, borderColor: "rgba(255,255,255,0.08)" }}
                            aria-label={`Cantidad unidad ${idx + 1}`}
                          />
                          {subs.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setSubs(subs.filter((_, i) => i !== idx))}
                              className="p-2 rounded-lg hover:bg-white/5"
                            >
                              <Trash2 size={12} style={{ color: MUTED }} />
                            </button>
                          ) : null}
                        </div>
                      ))}
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
                    <div className="space-y-2">
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
                          Min
                          <input
                            type="number"
                            min={5}
                            max={180}
                            value={minutos}
                            onChange={e =>
                              setMinutos(Math.max(5, Number(e.target.value) || 30))
                            }
                            className="w-14 p-1 rounded-lg bg-black/40 border text-xs text-right focus:outline-none"
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
                            className="flex-1 p-2 rounded-lg bg-black/40 border text-xs focus:outline-none"
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

                  <button
                    type="button"
                    disabled={!canLaunch || saving}
                    onClick={() => void handleLaunch()}
                    className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 touch-manipulation"
                    style={{
                      backgroundColor: `${FLOTA_CONFIG[tipo].color}18`,
                      color: FLOTA_CONFIG[tipo].color,
                      border: `1px solid ${FLOTA_CONFIG[tipo].color}40`,
                    }}
                    data-testid="jornada4-launch-submit"
                  >
                    {saving ? "Lanzando…" : "Lanzar vehículo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

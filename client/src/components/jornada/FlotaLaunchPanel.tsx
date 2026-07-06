import { memo, useCallback, useState } from "react";
import { Rocket, Target, X, Plus, Trash2 } from "lucide-react";
import { FLOTA_CONFIG } from "@/components/flota/vehicleCardShared";
import type { FlotaLaunchForm, DesglosadorSubFormRow } from "@/lib/executeFlotaLaunch";

const PANEL_COLORS = {
  gold: "#D4AF37",
  charcoal: "#0a0a0a",
} as const;

export type FlotaLaunchPanelProps = {
  onLaunch: (form: FlotaLaunchForm) => Promise<string | null>;
  disabled?: boolean;
};

function makeSubRow(): DesglosadorSubFormRow {
  return { tempId: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, titulo: "", cantidadObjetivo: "" };
}

export const FlotaLaunchPanel = memo(function FlotaLaunchPanel({
  onLaunch,
  disabled = false,
}: FlotaLaunchPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipoFlota, setTipoFlota] = useState<"tiempo" | "situacion" | null>(null);
  const [titulo, setTitulo] = useState("");
  const [terminoDetalle, setTerminoDetalle] = useState("Al cerrar este bloque");
  const [desglosadorSubs, setDesglosadorSubs] = useState<DesglosadorSubFormRow[]>([makeSubRow()]);

  const reset = useCallback(() => {
    setTipoFlota(null);
    setTitulo("");
    setTerminoDetalle("Al cerrar este bloque");
    setDesglosadorSubs([makeSubRow()]);
    setOpen(false);
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!tipoFlota || saving) return;
    setSaving(true);
    try {
      const id = await onLaunch({
        titulo,
        tipoFlota,
        terminoDetalle: tipoFlota === "situacion" ? terminoDetalle : undefined,
        desglosadorSubs: tipoFlota === "tiempo" ? desglosadorSubs : undefined,
      });
      if (id) reset();
    } finally {
      setSaving(false);
    }
  }, [tipoFlota, saving, onLaunch, titulo, terminoDetalle, desglosadorSubs, reset]);

  const canLaunch =
    titulo.trim().length > 0 &&
    tipoFlota != null &&
    (tipoFlota !== "tiempo" || desglosadorSubs.some(s => s.titulo.trim()));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider touch-manipulation"
        style={{
          borderColor: `${PANEL_COLORS.gold}40`,
          backgroundColor: `${PANEL_COLORS.gold}12`,
          color: PANEL_COLORS.gold,
        }}
        data-testid="flota-launch-open"
      >
        <Rocket size={12} /> Lanzar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
          onClick={() => !saving && reset()}
        >
          <div
            className="w-full max-w-md rounded-2xl border overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: PANEL_COLORS.charcoal, borderColor: "rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}
            data-testid="flota-launch-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Lanzar vehículo
              </span>
              <button type="button" onClick={() => !saving && reset()} className="p-1 rounded-lg hover:bg-white/5">
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!tipoFlota ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["tiempo", "situacion"] as const).map(tipo => {
                    const cfg = FLOTA_CONFIG[tipo];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoFlota(tipo)}
                        className="p-3 rounded-xl border flex flex-col items-center gap-1.5 touch-manipulation"
                        style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}
                        data-testid={`flota-launch-tipo-${tipo}`}
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
                    <Target size={14} style={{ color: FLOTA_CONFIG[tipoFlota].color }} />
                    <span className="text-xs font-black uppercase" style={{ color: FLOTA_CONFIG[tipoFlota].color }}>
                      {FLOTA_CONFIG[tipoFlota].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTipoFlota(null)}
                      className="ml-auto text-[8px] text-slate-500 uppercase"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 block">
                      Nombre de la misión
                    </label>
                    <input
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      placeholder="Ej: Llamar a 3 clientes"
                      className="w-full p-3 rounded-xl bg-black/40 border text-white text-sm focus:outline-none"
                      style={{ borderColor: titulo ? FLOTA_CONFIG[tipoFlota].color : "rgba(255,255,255,0.1)" }}
                      autoFocus
                      data-testid="flota-launch-titulo"
                    />
                  </div>

                  {tipoFlota === "situacion" && (
                    <div>
                      <label className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Criterio de cierre
                      </label>
                      <input
                        value={terminoDetalle}
                        onChange={e => setTerminoDetalle(e.target.value)}
                        className="w-full p-3 rounded-xl bg-black/40 border text-white text-sm focus:outline-none"
                        style={{ borderColor: "rgba(255,255,255,0.1)" }}
                      />
                    </div>
                  )}

                  {tipoFlota === "tiempo" && (
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">Subs del desglosador</p>
                      {desglosadorSubs.map((sub, idx) => (
                        <div key={sub.tempId} className="flex gap-1.5 items-center">
                          <input
                            value={sub.titulo}
                            onChange={e => {
                              const next = [...desglosadorSubs];
                              next[idx] = { ...sub, titulo: e.target.value };
                              setDesglosadorSubs(next);
                            }}
                            placeholder={`Sub ${idx + 1}`}
                            className="flex-1 p-2 rounded-lg bg-black/40 border text-white text-xs focus:outline-none"
                            style={{ borderColor: "rgba(255,255,255,0.08)" }}
                          />
                          {desglosadorSubs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDesglosadorSubs(desglosadorSubs.filter((_, i) => i !== idx))}
                              className="p-2 rounded-lg hover:bg-white/5"
                            >
                              <Trash2 size={12} className="text-slate-500" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDesglosadorSubs([...desglosadorSubs, makeSubRow()])}
                        className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-500"
                      >
                        <Plus size={10} /> Añadir sub
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleLaunch()}
                    disabled={!canLaunch || saving}
                    className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 touch-manipulation"
                    style={{
                      backgroundColor: `${FLOTA_CONFIG[tipoFlota].color}18`,
                      color: FLOTA_CONFIG[tipoFlota].color,
                      border: `1px solid ${FLOTA_CONFIG[tipoFlota].color}40`,
                    }}
                    data-testid="flota-launch-submit"
                  >
                    {saving ? "Lanzando…" : "Lanzar vehículo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

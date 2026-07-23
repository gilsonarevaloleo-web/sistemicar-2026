import { memo, useCallback, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { DesglosadorSubFormRow } from "@/lib/executeFlotaLaunch";
import type { Jornada4LaunchForm } from "@/jornada4/executeJornada4Launch";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, ACCENT } = J4_COLORS;
const CYAN = "#5aa7a0";
const OK = "#3d9a6a";

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

/** Lanzador Dual Kernel: solo Conquista + Situacional. */
export const Jornada4LaunchPanel = memo(function Jornada4LaunchPanel({
  onLaunch,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState<"tiempo" | "situacion" | null>(null);
  const [titulo, setTitulo] = useState("");
  const [subs, setSubs] = useState<DesglosadorSubFormRow[]>([makeSub()]);
  const [filas, setFilas] = useState<string[]>([""]);
  const [minutos, setMinutos] = useState(30);

  const reset = useCallback(() => {
    setTipo(null);
    setTitulo("");
    setSubs([makeSub()]);
    setFilas([""]);
    setMinutos(30);
    setOpen(false);
  }, []);

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
        terminoDetalle: tipo === "situacion" ? "Al cerrar este bloque" : undefined,
      });
      if (id) reset();
    } finally {
      setSaving(false);
    }
  }, [tipo, saving, canLaunch, onLaunch, titulo, subs, filas, minutos, reset]);

  return (
    <div className="px-4 pb-3" data-testid="jornada4-launch">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full py-3 text-xs font-semibold uppercase tracking-[0.16em]"
        style={{ backgroundColor: ACCENT, color: "#1a1408" }}
        data-testid="jornada4-launch-open"
      >
        Lanzar desglosador V4
      </button>
      <p className="mt-2 text-center text-[10px]" style={{ color: MUTED }}>
        Solo Conquista o Situacional — todo dentro de Dual Kernel
      </p>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
          onClick={() => !saving && reset()}
        >
          <div
            className="w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: PIZARRA,
              borderTop: `1px solid ${ACCENT}55`,
            }}
            onClick={e => e.stopPropagation()}
            data-testid="jornada4-launch-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: ACCENT }}
                >
                  Jornada V4
                </p>
                <p className="text-sm" style={{ color: INK }}>
                  Lanzar desglosador
                </p>
              </div>
              <button type="button" onClick={() => !saving && reset()} className="p-2">
                <X size={16} style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!tipo ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo("tiempo")}
                    className="p-4 text-left"
                    style={{
                      border: `1px solid ${ACCENT}40`,
                      background: "rgba(196,163,90,0.08)",
                    }}
                    data-testid="jornada4-launch-tipo-conquista"
                  >
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: ACCENT }}>
                      Conquista
                    </p>
                    <p className="mt-1 text-xs" style={{ color: MUTED }}>
                      Unidades con reloj
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("situacion")}
                    className="p-4 text-left"
                    style={{
                      border: `1px solid ${CYAN}40`,
                      background: "rgba(90,167,160,0.08)",
                    }}
                    data-testid="jornada4-launch-tipo-situacion"
                  >
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: CYAN }}>
                      Situacional
                    </p>
                    <p className="mt-1 text-xs" style={{ color: MUTED }}>
                      Ring con cupos
                    </p>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: tipo === "tiempo" ? ACCENT : CYAN }}
                    >
                      {tipo === "tiempo" ? "Conquista" : "Situacional"}
                    </p>
                    <button
                      type="button"
                      className="text-[10px] uppercase"
                      style={{ color: MUTED }}
                      onClick={() => setTipo(null)}
                    >
                      Cambiar
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: MUTED }}>
                      Nombre
                    </label>
                    <input
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      placeholder={
                        tipo === "tiempo" ? "Ej: Producción del día" : "Ej: Enfoque de la tarde"
                      }
                      className="w-full p-3 text-sm bg-black/40 border-0 outline-none"
                      style={{ color: INK, borderBottom: `1px solid ${MUTED}44` }}
                      autoFocus
                      data-testid="jornada4-launch-titulo"
                    />
                  </div>

                  {tipo === "tiempo" ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                        Unidades
                      </p>
                      {subs.map((sub, idx) => (
                        <div key={sub.tempId} className="flex gap-2">
                          <input
                            value={sub.titulo}
                            onChange={e => {
                              const next = [...subs];
                              next[idx] = { ...sub, titulo: e.target.value };
                              setSubs(next);
                            }}
                            placeholder={`Unidad ${idx + 1}`}
                            className="flex-1 p-2 text-xs bg-black/40 outline-none"
                            style={{ color: INK }}
                          />
                          {subs.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setSubs(subs.filter((_, i) => i !== idx))}
                              className="p-2"
                            >
                              <Trash2 size={12} style={{ color: MUTED }} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSubs([...subs, makeSub()])}
                        className="flex items-center gap-1 text-[10px] uppercase"
                        style={{ color: MUTED }}
                      >
                        <Plus size={10} /> Unidad
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                          Filas del ring
                        </p>
                        <label className="text-[10px] flex items-center gap-2" style={{ color: MUTED }}>
                          Min
                          <input
                            type="number"
                            min={5}
                            max={180}
                            value={minutos}
                            onChange={e => setMinutos(Math.max(5, Number(e.target.value) || 30))}
                            className="w-14 p-1 text-xs bg-black/40 outline-none text-right"
                            style={{ color: INK }}
                          />
                        </label>
                      </div>
                      {filas.map((fila, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={fila}
                            onChange={e => {
                              const next = [...filas];
                              next[idx] = e.target.value;
                              setFilas(next);
                            }}
                            placeholder={`Fila ${idx + 1}`}
                            className="flex-1 p-2 text-xs bg-black/40 outline-none"
                            style={{ color: INK }}
                          />
                          {filas.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setFilas(filas.filter((_, i) => i !== idx))}
                              className="p-2"
                            >
                              <Trash2 size={12} style={{ color: MUTED }} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFilas([...filas, ""])}
                        className="flex items-center gap-1 text-[10px] uppercase"
                        style={{ color: MUTED }}
                      >
                        <Plus size={10} /> Fila
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!canLaunch || saving}
                    onClick={() => void handleLaunch()}
                    className="w-full py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-40"
                    style={{ backgroundColor: OK, color: "#04140c" }}
                    data-testid="jornada4-launch-submit"
                  >
                    {saving ? "Lanzando…" : "Lanzar en V4"}
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

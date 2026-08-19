import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, Plus, Send, Trash2 } from "lucide-react";
import {
  RUTA_TACTICA_META,
  RUTA_TACTICA_ORDER,
  getDefaultReservaRuta,
  setDefaultReservaRuta,
  type ReservaTacticaRuta,
  type SituacionReservaItem,
} from "@/lib/situacionReserva";
import {
  CRISOL_DIRECCION_HINT,
  CRISOL_MOS_HINT,
  CRISOL_TAGLINE,
  CRISOL_TITLE,
  NIDO_INBOX_ID,
  agruparImanPorNido,
  imanItemsParaDesglosador,
  reservaEsEnviabeASituacion,
  type ImanProyectoOpcion,
} from "@/lib/imanPensamientos";

type Props = {
  items: SituacionReservaItem[];
  proyectos: ImanProyectoOpcion[];
  defaultProyectoId?: string;
  onQuickAdd: (
    texto: string,
    ruta: ReservaTacticaRuta,
    proyectoId?: string
  ) => void | Promise<void>;
  /** Envía una fila al situacional (S → ring, E → lista libre). */
  onEnviarUnidad: (reservaId: string) => void | Promise<void>;
  /** Envía varias filas seleccionadas, una por una. */
  onEnviarSeleccion: (reservaIds: string[]) => void | Promise<void>;
  /** @deprecated Preferir selección por unidad. Envía todo el nido ejecutable. */
  onAbrirNido?: (nidoId: string) => void | Promise<void>;
  onDelete: (reservaId: string) => void | Promise<void>;
  onRutaChange: (reservaId: string, ruta: ReservaTacticaRuta) => void | Promise<void>;
  colors: {
    plata: string;
    cyan: string;
    gold: string;
  };
  dockBottomPx?: number;
  /**
   * Por encima del Foco unidad (z-[230]) para capturar pensamientos
   * mientras el cronómetro de conquista está abierto.
   */
  elevateAboveUnitFocus?: boolean;
  /** Espejo panorámico de puertas del día (Dual Kernel). */
  panoramaHeadline?: string;
  panoramaSubline?: string;
  panoramaMantra?: string;
};

function ImanPensamientosDock({
  items,
  proyectos,
  defaultProyectoId = "",
  onQuickAdd,
  onEnviarUnidad,
  onEnviarSeleccion,
  onAbrirNido,
  onDelete,
  onRutaChange,
  colors,
  dockBottomPx = 84,
  elevateAboveUnitFocus = false,
  panoramaHeadline,
  panoramaSubline,
  panoramaMantra,
}: Props) {
  // Móvil: colapsado por defecto — menos DOM mientras tickean ring/flota.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [draft, setDraft] = useState("");
  const [rutaDraft, setRutaDraft] = useState<ReservaTacticaRuta>(() => getDefaultReservaRuta());
  const [proyectoDraft, setProyectoDraft] = useState(defaultProyectoId);
  const [adding, setAdding] = useState(false);
  const submitInFlightRef = useRef(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [enviandoLote, setEnviandoLote] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (defaultProyectoId) setProyectoDraft(defaultProyectoId);
  }, [defaultProyectoId]);

  useEffect(() => {
    setSelectedIds(prev => {
      const activos = new Set(items.map(i => i.id));
      const next = new Set([...prev].filter(id => activos.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const nidos = useMemo(() => agruparImanPorNido(items, proyectos), [items, proyectos]);

  const enviableIds = useMemo(
    () => new Set(items.filter(reservaEsEnviabeASituacion).map(i => i.id)),
    [items]
  );

  const preview = useMemo(() => {
    if (nidos.length === 0) return null;
    const first = nidos[0].items[0];
    if (!first) return null;
    const ruta = first.ruta ?? "ejecucion";
    return {
      nido: nidos[0].titulo,
      texto: first.texto,
      short: RUTA_TACTICA_META[ruta].short,
    };
  }, [nidos]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNidoSelection = (nidoItems: SituacionReservaItem[]) => {
    const ids = nidoItems.filter(reservaEsEnviabeASituacion).map(i => i.id);
    if (ids.length === 0) return;
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const submitQuickAdd = async () => {
    const texto = draft.trim();
    if (!texto || adding || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setAdding(true);
    setDefaultReservaRuta(rutaDraft);
    try {
      await onQuickAdd(texto, rutaDraft, proyectoDraft || undefined);
      setDraft("");
    } catch {
      // El padre muestra toast; mantener draft para reintentar
    } finally {
      submitInFlightRef.current = false;
      setAdding(false);
    }
  };

  const handleEnviarUnidad = async (reservaId: string) => {
    if (enviandoId || enviandoLote) return;
    setEnviandoId(reservaId);
    try {
      await onEnviarUnidad(reservaId);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(reservaId);
        return next;
      });
    } finally {
      setEnviandoId(null);
    }
  };

  const handleEnviarSeleccion = async () => {
    const ids = [...selectedIds].filter(id => enviableIds.has(id));
    if (ids.length === 0 || enviandoLote) return;
    setEnviandoLote(true);
    try {
      await onEnviarSeleccion(ids);
      setSelectedIds(new Set());
    } finally {
      setEnviandoLote(false);
    }
  };

  const selectedCount = [...selectedIds].filter(id => enviableIds.has(id)).length;

  return (
    <div
      className={`fixed left-0 right-0 pointer-events-none ${
        elevateAboveUnitFocus ? "z-[240]" : "z-40"
      }`}
      style={{ bottom: dockBottomPx }}
      data-testid="iman-pensamientos-dock"
    >
      <div className="max-w-lg mx-auto px-4 pointer-events-auto">
        <div
          className="rounded-2xl border overflow-hidden shadow-[0_0_18px_rgba(148,163,184,0.12)]"
          style={{ backgroundColor: "rgba(10,10,10,0.94)", borderColor: "rgba(148,163,184,0.28)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="w-full px-3 py-2 flex items-center gap-2"
            data-testid="iman-pensamientos-toggle"
          >
            <FlaskConical size={14} style={{ color: colors.plata }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.plata }}>
              {CRISOL_TITLE}
            </span>
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(148,163,184,0.14)", color: colors.plata }}
              data-testid="iman-pensamientos-count"
            >
              {items.length}
            </span>
            {panoramaHeadline && !open ? (
              <span
                className="ml-1 text-[8px] font-bold truncate min-w-0"
                style={{ color: colors.gold }}
                data-testid="iman-panorama-collapsed"
              >
                {panoramaHeadline}
              </span>
            ) : null}
            {preview && !open && !panoramaHeadline && (
              <span className="ml-1 text-[8px] text-slate-500 truncate min-w-0">
                Nido · {preview.nido} · [{preview.short}] {preview.texto}
              </span>
            )}
            <span className="ml-auto text-slate-500">
              {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </span>
          </button>

          {open && (
            <div className="border-t px-3 pb-3 pt-2 space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {panoramaHeadline ? (
                <div
                  className="rounded-xl border px-2.5 py-2 space-y-0.5"
                  style={{
                    borderColor: "rgba(212,175,55,0.28)",
                    backgroundColor: "rgba(212,175,55,0.06)",
                  }}
                  data-testid="iman-panorama-mirror"
                >
                  <p
                    className="text-[9px] font-black uppercase tracking-wider"
                    style={{ color: colors.gold }}
                  >
                    {panoramaHeadline}
                  </p>
                  {panoramaSubline ? (
                    <p className="text-[8px] leading-snug text-slate-400">{panoramaSubline}</p>
                  ) : null}
                  {panoramaMantra ? (
                    <p
                      className="text-[8px] font-bold italic"
                      style={{ color: colors.cyan }}
                      data-testid="iman-panorama-mantra"
                    >
                      {panoramaMantra}.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-[7px] text-slate-500 leading-relaxed">{CRISOL_TAGLINE}</p>
              <p className="text-[7px] text-slate-600 leading-relaxed">
                {CRISOL_MOS_HINT} Marca las filas y envíalas al vehículo de enfoque una a una.
              </p>
              <p
                className="text-[7px] leading-relaxed"
                style={{ color: "rgba(212,175,55,0.75)" }}
                data-testid="iman-direccion-hint"
              >
                {CRISOL_DIRECCION_HINT}
              </p>

              {selectedCount > 0 && (
                <button
                  type="button"
                  disabled={enviandoLote}
                  onClick={() => void handleEnviarSeleccion()}
                  className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{
                    backgroundColor: `${colors.gold}18`,
                    color: colors.gold,
                    border: `1px solid ${colors.gold}45`,
                  }}
                  data-testid="iman-enviar-seleccion"
                >
                  <Send size={12} />
                  {enviandoLote ? "Enviando…" : `Enviar ${selectedCount} al enfoque`}
                </button>
              )}

              <select
                value={proyectoDraft}
                onChange={e => setProyectoDraft(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[9px] text-slate-300 focus:outline-none focus:border-white/25"
                data-testid="iman-proyecto-pick"
                aria-label="Nido del pensamiento (no reclama Dirección)"
              >
                <option value="">Aterrizaje pendiente (presencia)</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>
                    Nido · {p.etiqueta === "centro" ? "Centro" : "Proyecto"} · {p.titulo}
                  </option>
                ))}
              </select>

              <div className="flex gap-1">
                {RUTA_TACTICA_ORDER.map(r => {
                  const meta = RUTA_TACTICA_META[r];
                  const active = rutaDraft === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRutaDraft(r)}
                      className="flex-1 py-1 rounded-lg border text-[8px] font-black uppercase"
                      style={{
                        borderColor: active ? colors.plata : "rgba(255,255,255,0.08)",
                        backgroundColor: active ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.2)",
                        color: active ? colors.plata : "#64748b",
                      }}
                      title={meta.hint}
                      data-testid={`iman-ruta-pick-${r}`}
                    >
                      {meta.short}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitQuickAdd();
                    }
                  }}
                  placeholder="Capturar pensamiento en el Crisol…"
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25"
                  data-testid="iman-pensamiento-input"
                />
                <button
                  type="button"
                  disabled={!draft.trim() || adding}
                  onClick={() => void submitQuickAdd()}
                  className="px-2.5 py-2 rounded-lg border flex items-center justify-center gap-1 disabled:opacity-40 min-w-[4.5rem]"
                  style={{ borderColor: `${colors.plata}40`, backgroundColor: `${colors.plata}12`, color: colors.plata }}
                  data-testid="iman-pensamiento-add"
                  aria-label="Guardar pensamiento"
                >
                  <Plus size={14} />
                  <span className="text-[8px] font-black uppercase">{adding ? "…" : "Aterrizar"}</span>
                </button>
              </div>

              <div className="max-h-[min(40dvh,16rem)] overflow-y-auto overscroll-contain space-y-2">
                {nidos.length === 0 ? (
                  <div
                    className="rounded-lg p-2 text-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.15)" }}
                  >
                    <p className="text-[9px] text-slate-500">Vacío — ordena aquí antes del Taller y el Ring.</p>
                  </div>
                ) : (
                  nidos.map(grupo => {
                    const ejecutables = imanItemsParaDesglosador(grupo.items);
                    const enviablesNido = grupo.items.filter(reservaEsEnviabeASituacion);
                    const nidoAllSelected =
                      enviablesNido.length > 0 && enviablesNido.every(i => selectedIds.has(i.id));
                    const nidoSomeSelected = enviablesNido.some(i => selectedIds.has(i.id));
                    return (
                      <div
                        key={grupo.nidoId}
                        className="rounded-lg overflow-hidden"
                        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.15)" }}
                        data-testid={`iman-nido-${grupo.nidoId}`}
                      >
                        <div className="px-2 py-1.5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          {enviablesNido.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleNidoSelection(grupo.items)}
                              className="w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[8px]"
                              style={{
                                borderColor: nidoAllSelected || nidoSomeSelected ? colors.gold : "rgba(255,255,255,0.2)",
                                backgroundColor: nidoAllSelected ? `${colors.gold}25` : "transparent",
                                color: colors.gold,
                              }}
                              title="Seleccionar nido"
                              data-testid={`iman-nido-select-${grupo.nidoId}`}
                            >
                              {nidoAllSelected ? "✓" : nidoSomeSelected ? "−" : ""}
                            </button>
                          )}
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: grupo.color ?? colors.cyan }}
                          />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate flex-1">
                            Nido ·{" "}
                            {grupo.etiqueta === "centro" ? "Centro" : grupo.nidoId === NIDO_INBOX_ID ? "" : "Proyecto"} ·{" "}
                            {grupo.titulo}
                          </span>
                          <span className="text-[8px] font-mono text-slate-600">{grupo.items.length}</span>
                          {onAbrirNido && ejecutables.length > 1 && (
                            <button
                              type="button"
                              disabled={enviandoLote}
                              onClick={() => void onAbrirNido(grupo.nidoId)}
                              className="px-1.5 py-0.5 rounded text-[6px] font-black uppercase opacity-60 hover:opacity-100 disabled:opacity-30"
                              style={{ color: colors.plata, border: "1px solid rgba(148,163,184,0.2)" }}
                              data-testid={`iman-abrir-nido-${grupo.nidoId}`}
                              title="Enviar todo el nido de una vez"
                            >
                              Todo
                            </button>
                          )}
                        </div>
                        <div className="p-1.5 space-y-1">
                          {grupo.items.map(item => {
                            const itemRuta = item.ruta ?? "ejecucion";
                            const enviable = reservaEsEnviabeASituacion(item);
                            const selected = selectedIds.has(item.id);
                            const enviando = enviandoId === item.id;
                            const destinoLabel =
                              itemRuta === "situacion_desglosador"
                                ? "Ring"
                                : itemRuta === "ejecucion"
                                  ? "Lista"
                                  : "M";
                            return (
                              <div
                                key={item.id}
                                className="rounded-lg p-2 flex flex-col gap-1.5"
                                style={{
                                  backgroundColor: selected ? "rgba(212,175,55,0.06)" : "rgba(0,0,0,0.25)",
                                  border: `1px solid ${selected ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.04)"}`,
                                }}
                                data-testid={`iman-item-${item.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  {enviable ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleSelect(item.id)}
                                      className="w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 text-[8px]"
                                      style={{
                                        borderColor: selected ? colors.gold : "rgba(255,255,255,0.2)",
                                        backgroundColor: selected ? `${colors.gold}22` : "transparent",
                                        color: colors.gold,
                                      }}
                                      data-testid={`iman-select-${item.id}`}
                                    >
                                      {selected ? "✓" : ""}
                                    </button>
                                  ) : (
                                    <span className="w-4 shrink-0" />
                                  )}
                                  <span
                                    className="text-[8px] font-black px-1 py-0.5 rounded shrink-0"
                                    style={{ backgroundColor: "rgba(148,163,184,0.12)", color: colors.plata }}
                                  >
                                    {RUTA_TACTICA_META[itemRuta].short}
                                  </span>
                                  <span className="text-[10px] text-slate-300 flex-1 min-w-0 leading-tight">{item.texto}</span>
                                  {item.minutosCupo != null && item.minutosCupo > 0 && (
                                    <span className="text-[7px] font-mono font-bold flex-shrink-0 text-slate-500">
                                      {item.minutosCupo}′
                                    </span>
                                  )}
                                </div>
                                {(item.segmentoNombre || item.origenVehiculoTitulo) && (
                                  <p className="text-[7px] text-slate-600 truncate pl-6">
                                    {item.segmentoNombre ? `seg: ${item.segmentoNombre}` : ""}
                                    {item.segmentoNombre && item.origenVehiculoTitulo ? " · " : ""}
                                    {item.origenVehiculoTitulo ? `de: ${item.origenVehiculoTitulo}` : ""}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1 pl-6">
                                  {RUTA_TACTICA_ORDER.map(r => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => void onRutaChange(item.id, r)}
                                      className="px-1 py-0.5 rounded text-[6px] font-black uppercase"
                                      style={{
                                        opacity: itemRuta === r ? 1 : 0.45,
                                        backgroundColor: itemRuta === r ? "rgba(148,163,184,0.15)" : "transparent",
                                        color: colors.plata,
                                        border: `1px solid ${itemRuta === r ? "rgba(148,163,184,0.35)" : "rgba(255,255,255,0.06)"}`,
                                      }}
                                      data-testid={`iman-ruta-${item.id}-${r}`}
                                    >
                                      {RUTA_TACTICA_META[r].short}
                                    </button>
                                  ))}
                                  {enviable && (
                                    <button
                                      type="button"
                                      disabled={enviando || enviandoLote}
                                      onClick={() => void handleEnviarUnidad(item.id)}
                                      className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-0.5 ml-auto disabled:opacity-50"
                                      style={{
                                        backgroundColor: `${colors.gold}15`,
                                        color: colors.gold,
                                        border: `1px solid ${colors.gold}40`,
                                      }}
                                      data-testid={`iman-enviar-${item.id}`}
                                      title={
                                        itemRuta === "situacion_desglosador"
                                          ? "Enviar al ring de enfoque"
                                          : "Enviar a lista libre del enfoque"
                                      }
                                    >
                                      <Send size={9} />
                                      {enviando ? "…" : `→ ${destinoLabel}`}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void onDelete(item.id)}
                                    className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase"
                                    style={{
                                      backgroundColor: "rgba(239,68,68,0.08)",
                                      color: "#f87171",
                                      border: "1px solid rgba(239,68,68,0.2)",
                                    }}
                                    data-testid={`iman-delete-${item.id}`}
                                  >
                                    <Trash2 size={9} className="inline mr-0.5" />
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ImanPensamientosDock);

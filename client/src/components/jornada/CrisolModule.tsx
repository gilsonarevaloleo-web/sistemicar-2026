import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { FlaskConical } from "lucide-react";
import type { DetalleSubTarea } from "@/lib/persistence";
import {
  RUTA_TACTICA_META,
  RUTA_TACTICA_ORDER,
  getDefaultReservaRuta,
  setDefaultReservaRuta,
  type ReservaTacticaRuta,
  type SituacionReservaItem,
} from "@/lib/situacionReserva";
import {
  CRISOL_MOS_HINT,
  CRISOL_TAGLINE,
  CRISOL_TITLE,
  NIDO_INBOX_ID,
  agruparImanPorNido,
  reservaEsEnviabeASituacion,
  type ImanNidoGrupo,
  type ImanProyectoOpcion,
} from "@/lib/imanPensamientos";

// ─── Tokens visuales (alineados con PlaneacionCrisolDock) ───────────────────

const CRISOL_COLORS = {
  plata: "#94a3b8",
  cyan: "#00FFC3",
  gold: "#D4AF37",
} as const;

const DISPATCH_FADE_MS = 280;

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type CrisolAterrizarPayload = {
  texto: string;
  ruta: ReservaTacticaRuta;
  proyectoId?: string;
  proyectoTitulo?: string;
  proyectoEtiqueta?: "proyecto" | "centro";
};

export interface CrisolModuleProps {
  /** Items sincronizados desde situacionReserva (Firestore / localStorage). */
  items: SituacionReservaItem[];
  proyectos: ImanProyectoOpcion[];
  userId: string;
  defaultProyectoId?: string;
  /**
   * Persistencia en segundo plano (offline-first).
   * El componente ya pintó el ítem de forma optimista antes de invocar esto.
   */
  onAterrizar: (payload: CrisolAterrizarPayload) => void | Promise<void>;
  /** Despacho atómico al Ring de Enfoque — el padre orquesta el vehículo activo. */
  onDespacharToRing: (item: SituacionReservaItem) => void | Promise<void>;
  onRutaChange?: (reservaId: string, ruta: ReservaTacticaRuta) => void | Promise<void>;
  className?: string;
}

// ─── Helpers puros ──────────────────────────────────────────────────────────

function makeOptimisticId(): string {
  return `crisol_opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function destinoDespachoLabel(ruta: ReservaTacticaRuta): string {
  if (ruta === "situacion_desglosador") return "RING";
  if (ruta === "ejecucion") return "LISTA";
  return "M";
}

function buildOptimisticItem(
  userId: string,
  payload: CrisolAterrizarPayload,
  proyectos: ImanProyectoOpcion[]
): SituacionReservaItem {
  const proyecto = payload.proyectoId
    ? proyectos.find(p => p.id === payload.proyectoId)
    : undefined;
  return {
    id: makeOptimisticId(),
    userId,
    texto: payload.texto,
    reservadaAt: Date.now(),
    ruta: payload.ruta,
    estado: "activa",
    ...(payload.proyectoId
      ? {
          proyectoId: payload.proyectoId,
          proyectoTitulo: payload.proyectoTitulo ?? proyecto?.titulo,
          proyectoEtiqueta: payload.proyectoEtiqueta ?? proyecto?.etiqueta,
        }
      : {}),
  };
}

function mergeDisplayItems(
  remote: SituacionReservaItem[],
  optimistic: SituacionReservaItem[],
  hidden: ReadonlySet<string>
): SituacionReservaItem[] {
  const visibleRemote = remote.filter(i => !hidden.has(i.id));
  const remoteIds = new Set(visibleRemote.map(i => i.id));
  const pendingOptimistic = optimistic.filter(o => !hidden.has(o.id) && !remoteIds.has(o.id));
  return [...pendingOptimistic, ...visibleRemote].sort((a, b) => b.reservadaAt - a.reservadaAt);
}

// ─── Subcomponentes memoizados ──────────────────────────────────────────────

type MosSelectorProps = {
  value: ReservaTacticaRuta;
  onChange: (ruta: ReservaTacticaRuta) => void;
  testIdPrefix?: string;
};

const MosSelector = memo(function MosSelector({ value, onChange, testIdPrefix = "crisol-mos" }: MosSelectorProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Matriz de Ordenamiento Situacional">
      {RUTA_TACTICA_ORDER.map(r => {
        const meta = RUTA_TACTICA_META[r];
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className="flex-1 py-1 rounded-lg border text-[8px] font-black uppercase transition-colors"
            style={{
              borderColor: active ? CRISOL_COLORS.plata : "rgba(255,255,255,0.08)",
              backgroundColor: active ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.2)",
              color: active ? CRISOL_COLORS.plata : "#64748b",
            }}
            title={meta.hint}
            data-testid={`${testIdPrefix}-${r}`}
          >
            {meta.short}
          </button>
        );
      })}
    </div>
  );
});

type CrisolItemRowProps = {
  item: SituacionReservaItem;
  isExiting: boolean;
  onRutaChange?: (reservaId: string, ruta: ReservaTacticaRuta) => void;
  onDespachar: (item: SituacionReservaItem) => void;
};

const CrisolItemRow = memo(function CrisolItemRow({
  item,
  isExiting,
  onRutaChange,
  onDespachar,
}: CrisolItemRowProps) {
  const itemRuta = item.ruta ?? "ejecucion";
  const enviable = reservaEsEnviabeASituacion(item);
  const destino = destinoDespachoLabel(itemRuta);

  return (
    <div
      className={[
        "rounded-lg p-2 flex flex-col gap-1.5",
        "transition-opacity duration-300 ease-out",
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      style={{
        backgroundColor: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
      data-testid={`crisol-item-${item.id}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="text-[8px] font-black px-1 py-0.5 rounded shrink-0"
          style={{ backgroundColor: "rgba(148,163,184,0.12)", color: CRISOL_COLORS.plata }}
        >
          {RUTA_TACTICA_META[itemRuta].short}
        </span>
        <span className="text-[10px] text-slate-300 flex-1 min-w-0 leading-tight break-words">{item.texto}</span>
        {item.minutosCupo != null && item.minutosCupo > 0 && (
          <span className="text-[7px] font-mono font-bold shrink-0 text-slate-500">{item.minutosCupo}′</span>
        )}
      </div>

      {item.detalles && item.detalles.length > 0 && (
        <p className="text-[7px] text-slate-600 pl-5">
          {item.detalles.length} detalle{item.detalles.length === 1 ? "" : "s"}
        </p>
      )}

      {item.estado !== "activa" && (
        <p className="text-[7px] text-slate-600 pl-5 uppercase tracking-wide">
          {item.estado === "retomada_libre" ? "Retomada · lista libre" : "Retomada · cronómetro"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1 pl-5">
        {onRutaChange &&
          RUTA_TACTICA_ORDER.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onRutaChange(item.id, r)}
              className="px-1 py-0.5 rounded text-[6px] font-black uppercase"
              style={{
                opacity: itemRuta === r ? 1 : 0.45,
                backgroundColor: itemRuta === r ? "rgba(148,163,184,0.15)" : "transparent",
                color: CRISOL_COLORS.plata,
                border: `1px solid ${itemRuta === r ? "rgba(148,163,184,0.35)" : "rgba(255,255,255,0.06)"}`,
              }}
              data-testid={`crisol-ruta-${item.id}-${r}`}
            >
              {RUTA_TACTICA_META[r].short}
            </button>
          ))}

        {enviable && (
          <button
            type="button"
            onClick={() => onDespachar(item)}
            className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-0.5 ml-auto"
            style={{
              backgroundColor: `${CRISOL_COLORS.gold}15`,
              color: CRISOL_COLORS.gold,
              border: `1px solid ${CRISOL_COLORS.gold}40`,
            }}
            data-testid={`crisol-despachar-${item.id}`}
            title={
              itemRuta === "situacion_desglosador"
                ? "Despachar al ring de enfoque"
                : "Despachar a lista libre del enfoque"
            }
          >
            <span aria-hidden>✈️</span>
            <span>→ {destino}</span>
          </button>
        )}
      </div>
    </div>
  );
});

type CrisolNidoCardProps = {
  grupo: ImanNidoGrupo;
  exitingIds: ReadonlySet<string>;
  onRutaChange?: (reservaId: string, ruta: ReservaTacticaRuta) => void;
  onDespachar: (item: SituacionReservaItem) => void;
};

const CrisolNidoCard = memo(function CrisolNidoCard({
  grupo,
  exitingIds,
  onRutaChange,
  onDespachar,
}: CrisolNidoCardProps) {
  const isInbox = grupo.nidoId === NIDO_INBOX_ID;
  const nidoLabel = isInbox
    ? "Aterrizaje Pendiente / Inbox"
    : `${grupo.etiqueta === "centro" ? "Centro" : "Proyecto"} · ${grupo.titulo}`;

  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.15)" }}
      data-testid={`crisol-nido-${grupo.nidoId}`}
    >
      <header
        className="px-2 py-1.5 flex items-center gap-2 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: grupo.color ?? CRISOL_COLORS.cyan }}
        />
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate flex-1">
          Nido · {nidoLabel}
        </span>
        <span className="text-[8px] font-mono text-slate-600">{grupo.items.length}</span>
      </header>
      <div className="p-1.5 space-y-1">
        {grupo.items.map(item => (
          <CrisolItemRow
            key={item.id}
            item={item}
            isExiting={exitingIds.has(item.id)}
            onRutaChange={onRutaChange}
            onDespachar={onDespachar}
          />
        ))}
      </div>
    </section>
  );
});

// ─── Componente principal ───────────────────────────────────────────────────

function CrisolModuleInner({
  items,
  proyectos,
  userId,
  defaultProyectoId = "",
  onAterrizar,
  onDespacharToRing,
  onRutaChange,
  className = "",
}: CrisolModuleProps) {
  const [draft, setDraft] = useState("");
  const [rutaDraft, setRutaDraft] = useState<ReservaTacticaRuta>(() => getDefaultReservaRuta());
  const [proyectoDraft, setProyectoDraft] = useState(defaultProyectoId);
  const [optimisticItems, setOptimisticItems] = useState<SituacionReservaItem[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());

  const submitLockRef = useRef(false);
  const exitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (defaultProyectoId) setProyectoDraft(defaultProyectoId);
  }, [defaultProyectoId]);

  /** Retira optimistas que ya llegaron por sync remota (mismo texto + ventana temporal). */
  useEffect(() => {
    if (optimisticItems.length === 0) return;
    setOptimisticItems(prev => {
      const next = prev.filter(opt => {
        const matched = items.some(
          remote =>
            remote.texto === opt.texto &&
            remote.ruta === opt.ruta &&
            Math.abs(remote.reservadaAt - opt.reservadaAt) < 60_000
        );
        return !matched;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [items, optimisticItems.length]);

  useEffect(() => {
    return () => {
      exitTimersRef.current.forEach(t => clearTimeout(t));
      exitTimersRef.current.clear();
    };
  }, []);

  const displayItems = useMemo(
    () => mergeDisplayItems(items, optimisticItems, hiddenIds),
    [items, optimisticItems, hiddenIds]
  );

  const nidos = useMemo(
    () => agruparImanPorNido(displayItems, proyectos),
    [displayItems, proyectos]
  );

  const handleDraftChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  }, []);

  const handleRutaDraftChange = useCallback((ruta: ReservaTacticaRuta) => {
    setRutaDraft(ruta);
  }, []);

  const handleProyectoChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setProyectoDraft(e.target.value);
  }, []);

  const handleAterrizar = useCallback(() => {
    const texto = draft.trim();
    if (!texto || submitLockRef.current) return;

    submitLockRef.current = true;
    setDefaultReservaRuta(rutaDraft);

    const proyecto = proyectoDraft ? proyectos.find(p => p.id === proyectoDraft) : undefined;
    const payload: CrisolAterrizarPayload = {
      texto,
      ruta: rutaDraft,
      ...(proyectoDraft
        ? {
            proyectoId: proyectoDraft,
            proyectoTitulo: proyecto?.titulo,
            proyectoEtiqueta: proyecto?.etiqueta,
          }
        : {}),
    };

    const optimistic = buildOptimisticItem(userId, payload, proyectos);
    setOptimisticItems(prev => [optimistic, ...prev]);
    setDraft("");

    void Promise.resolve(onAterrizar(payload))
      .catch(() => {
        setOptimisticItems(prev => prev.filter(i => i.id !== optimistic.id));
        setDraft(texto);
      })
      .finally(() => {
        submitLockRef.current = false;
      });
  }, [draft, rutaDraft, proyectoDraft, proyectos, userId, onAterrizar]);

  const handleDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAterrizar();
      }
    },
    [handleAterrizar]
  );

  const scheduleRemove = useCallback((id: string) => {
    setExitingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const existing = exitTimersRef.current.get(id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      exitTimersRef.current.delete(id);
      setHiddenIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOptimisticItems(prev => prev.filter(i => i.id !== id));
    }, DISPATCH_FADE_MS);

    exitTimersRef.current.set(id, timer);
  }, []);

  const handleDespachar = useCallback(
    (item: SituacionReservaItem) => {
      if (exitingIds.has(item.id)) return;
      scheduleRemove(item.id);
      void Promise.resolve(onDespacharToRing(item)).catch(() => {
        const t = exitTimersRef.current.get(item.id);
        if (t) {
          clearTimeout(t);
          exitTimersRef.current.delete(item.id);
        }
        setHiddenIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setExitingIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      });
    },
    [exitingIds, onDespacharToRing, scheduleRemove]
  );

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${className}`.trim()}
      style={{
        backgroundColor: "rgba(10,10,10,0.94)",
        borderColor: "rgba(148,163,184,0.28)",
        boxShadow: "0 0 18px rgba(148,163,184,0.12)",
      }}
      data-testid="crisol-module"
    >
      <header className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <FlaskConical size={14} style={{ color: CRISOL_COLORS.plata }} />
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: CRISOL_COLORS.plata }}
        >
          {CRISOL_TITLE}
        </span>
        <span
          className="text-[9px] font-black px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(148,163,184,0.14)", color: CRISOL_COLORS.plata }}
          data-testid="crisol-count"
        >
          {displayItems.length}
        </span>
      </header>

      <div className="px-3 pb-3 pt-2 space-y-2">
        <p className="text-[7px] text-slate-500 leading-relaxed">{CRISOL_TAGLINE}</p>
        <p className="text-[7px] text-slate-600 leading-relaxed">{CRISOL_MOS_HINT}</p>

        <select
          value={proyectoDraft}
          onChange={handleProyectoChange}
          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[9px] text-slate-300 focus:outline-none focus:border-white/25"
          data-testid="crisol-proyecto-pick"
        >
          <option value="">Aterrizaje Pendiente / Inbox (sin nido)</option>
          {proyectos.map(p => (
            <option key={p.id} value={p.id}>
              {p.etiqueta === "centro" ? "Centro" : "Proyecto"} · {p.titulo}
            </option>
          ))}
        </select>

        <MosSelector value={rutaDraft} onChange={handleRutaDraftChange} />

        <div className="flex gap-1.5">
          <input
            type="text"
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
            placeholder="Capturar pensamiento en el Crisol…"
            className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25"
            data-testid="crisol-input"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={handleAterrizar}
            className="px-2.5 py-2 rounded-lg border flex items-center justify-center gap-1 disabled:opacity-40 min-w-[5.5rem] shrink-0"
            style={{
              borderColor: `${CRISOL_COLORS.plata}40`,
              backgroundColor: `${CRISOL_COLORS.plata}12`,
              color: CRISOL_COLORS.plata,
            }}
            data-testid="crisol-aterrizar"
          >
            <span className="text-[10px] font-black" aria-hidden>
              +
            </span>
            <span className="text-[8px] font-black uppercase">Aterrizar</span>
          </button>
        </div>

        <div className="max-h-[min(40dvh,16rem)] overflow-y-auto overscroll-contain space-y-2">
          {nidos.length === 0 ? (
            <div
              className="rounded-lg p-2 text-center"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.15)" }}
            >
              <p className="text-[9px] text-slate-500">Vacío — ordena aquí antes del Ring.</p>
            </div>
          ) : (
            nidos.map(grupo => (
              <CrisolNidoCard
                key={grupo.nidoId}
                grupo={grupo}
                exitingIds={exitingIds}
                onRutaChange={onRutaChange}
                onDespachar={handleDespachar}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export const CrisolModule = memo(CrisolModuleInner);
export default CrisolModule;

// Re-export de tipos de dominio para consumidores del módulo
export type { SituacionReservaItem, ReservaTacticaRuta, DetalleSubTarea, ImanProyectoOpcion, ImanNidoGrupo };

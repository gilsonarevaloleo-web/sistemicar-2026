import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  ArrowLeft,
  Trash2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/App";
import {
  getProyectos,
  getProyectosLocal,
  getProyectoById,
  getPeldanosByProyecto,
  getPeldanosByProyectoLocal,
  addProyecto,
  updateProyecto,
  addPeldanoIdea,
  deletePeldanoIdea,
  reorderPeldano,
  computeProyectoStats,
  subscribeToProyectos,
  buildLaunchUrl,
  updateProyectoClaridadActiva,
  setOleadaComoDireccion,
  type Proyecto,
  type ProyectoPeldano,
  type ProyectoEtiqueta,
} from "@/lib/proyectos";
import {
  buildDefaultClaridadDireccion,
  getOleadaEnCurso,
  resolveClaridadParaProyecto,
  type RutasMentalesSet,
} from "@/lib/claridadDireccion";
import { RUTA_BANDA_META } from "@/lib/rutaEnfoque";
import { RutasMentalesGrafo } from "@/components/RutasMentalesGrafo";
import { RutasMentalesEditor } from "@/components/RutasMentalesEditor";
import { PeldanoSituacionArbol } from "@/components/PeldanoSituacionArbol";
import { PeldanoDecisionesEnumeradas } from "@/components/PeldanoDecisionesEnumeradas";
import { JORNADA_MODULE } from "@/lib/jornadaBrand";

const PIZARRA = "#0a0a0a";
const CYAN = "#00FFC3";
const GOLD = "#D4AF37";
const PLATA = "#C0C0C0";
const NARANJA = "#F97316";

const PROYECTO_COLORS = ["#38BDF8", "#A855F7", "#F97316", "#10b981", "#D4AF37", "#f87171"];

function formatFecha(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

function formatTipoOrigen(tipo?: "tiempo" | "situacion") {
  if (tipo === "tiempo") return "Tiempo";
  if (tipo === "situacion") return "Situación";
  return "—";
}

function ProyectoIcono({
  etiqueta,
  color,
  size = 22,
}: {
  etiqueta: ProyectoEtiqueta;
  color?: string;
  size?: number;
}) {
  const tint = color ?? (etiqueta === "centro" ? GOLD : CYAN);
  if (etiqueta === "centro") return <Sparkles size={size} style={{ color: tint }} />;
  return <Layers size={size} style={{ color: tint }} />;
}

export default function ProyectosPage() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const detailId = params.get("id");

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [peldanos, setPeldanos] = useState<ProyectoPeldano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newEtiqueta, setNewEtiqueta] = useState<ProyectoEtiqueta>("proyecto");
  const [newNota, setNewNota] = useState("");
  const [newIdeaTitulo, setNewIdeaTitulo] = useState("");
  const [expandedConq, setExpandedConq] = useState<string | null>(null);
  const [notaEdit, setNotaEdit] = useState("");
  const [claridadEdit, setClaridadEdit] = useState<RutasMentalesSet | null>(null);
  const [oleadaTituloEdit, setOleadaTituloEdit] = useState("");
  const [guardandoClaridad, setGuardandoClaridad] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creatingProyecto, setCreatingProyecto] = useState(false);
  const detailIdRef = useRef(detailId);
  detailIdRef.current = detailId;

  const applyDetailState = useCallback((p: Proyecto | null, pel: ProyectoPeldano[]) => {
    setProyecto(p);
    setPeldanos(pel);
    setNotaEdit(p?.nota ?? "");
    setOleadaTituloEdit(p?.oleadaTitulo ?? "");
    if (p) {
      const claridad = resolveClaridadParaProyecto(p, pel) ?? buildDefaultClaridadDireccion({
        tituloProyecto: p.titulo,
        etiqueta: p.etiqueta,
        focoTitulo: p.oleadaTitulo ?? p.titulo,
      });
      setClaridadEdit(claridad);
    } else {
      setClaridadEdit(null);
    }
  }, []);

  const syncListFromRemote = useCallback(async () => {
    if (!user) return;
    setProyectos(await getProyectos(user.uid));
  }, [user]);

  const reloadDetail = useCallback(async () => {
    if (!user || !detailId) return;
    const localP = getProyectosLocal(user.uid).find(p => p.id === detailId) ?? null;
    const localPel = getPeldanosByProyectoLocal(user.uid, detailId);
    if (localP) {
      applyDetailState(localP, localPel);
      setDetailLoading(false);
      void Promise.all([
        getProyectoById(user.uid, detailId),
        getPeldanosByProyecto(user.uid, detailId),
      ]).then(([p, pel]) => applyDetailState(p, pel));
      return;
    }
    setDetailLoading(true);
    try {
      const [p, pel] = await Promise.all([
        getProyectoById(user.uid, detailId),
        getPeldanosByProyecto(user.uid, detailId),
      ]);
      applyDetailState(p, pel);
    } finally {
      setDetailLoading(false);
    }
  }, [user, detailId, applyDetailState]);

  useEffect(() => {
    if (!user) return;
    setProyectos(getProyectosLocal(user.uid));
    setLoading(true);
    void syncListFromRemote().finally(() => setLoading(false));
    const unsub = subscribeToProyectos(user.uid, () => {
      setProyectos(getProyectosLocal(user.uid));
      void syncListFromRemote();
      if (detailIdRef.current) void reloadDetail();
    });
    return () => {
      unsub();
    };
  }, [user, syncListFromRemote, reloadDetail]);

  useEffect(() => {
    if (!detailId) {
      setProyecto(null);
      setPeldanos([]);
      setDetailLoading(false);
      return;
    }
    void reloadDetail();
  }, [detailId, reloadDetail]);

  const stats = useMemo(() => computeProyectoStats(peldanos), [peldanos]);
  const ideas = useMemo(() => peldanos.filter(p => p.estado === "idea"), [peldanos]);
  const conquistados = useMemo(
    () =>
      peldanos
        .filter(p => p.estado === "conquistado")
        .sort((a, b) => (b.cerradoAt ?? 0) - (a.cerradoAt ?? 0)),
    [peldanos]
  );
  const enCursoPlan = useMemo(
    () => peldanos.filter(p => p.estado === "en_curso" && p.origenSegmento),
    [peldanos]
  );
  const oleadaActiva = useMemo(() => getOleadaEnCurso(peldanos), [peldanos]);

  const handleGuardarClaridad = async () => {
    if (!user || !detailId || !claridadEdit) return;
    setGuardandoClaridad(true);
    try {
      await updateProyectoClaridadActiva(user.uid, detailId, claridadEdit, oleadaTituloEdit);
      await reloadDetail();
    } finally {
      setGuardandoClaridad(false);
    }
  };

  const handleUsarIdeaComoOleada = async (peldanoId: string) => {
    if (!user || !detailId) return;
    await setOleadaComoDireccion(user.uid, detailId, peldanoId);
    await reloadDetail();
  };

  const handleCreateProyecto = async () => {
    if (!user || creatingProyecto) return;
    const titulo = newTitulo.trim();
    if (!titulo) {
      toast.error("Escribe un nombre para el proyecto o centro");
      return;
    }
    setCreatingProyecto(true);
    try {
      const color = PROYECTO_COLORS[proyectos.length % PROYECTO_COLORS.length];
      const p = await addProyecto(user.uid, {
        titulo,
        etiqueta: newEtiqueta,
        nota: newNota.trim() || undefined,
        color,
      });
      const claridad =
        p.claridadActiva ??
        buildDefaultClaridadDireccion({
          tituloProyecto: p.titulo,
          etiqueta: p.etiqueta,
          focoTitulo: p.oleadaTitulo ?? p.titulo,
        });
      setProyectos(prev => [p, ...prev.filter(x => x.id !== p.id)]);
      setProyecto(p);
      setPeldanos([]);
      setClaridadEdit(claridad);
      setNotaEdit(p.nota ?? "");
      setOleadaTituloEdit(p.oleadaTitulo ?? "");
      setShowNew(false);
      setNewTitulo("");
      setNewNota("");
      setNewEtiqueta("proyecto");
      navigate(`/proyectos?id=${p.id}`);
      toast.success(`"${p.titulo}" creado`);
    } catch {
      toast.error("No se pudo crear el proyecto. Intenta de nuevo.");
    } finally {
      setCreatingProyecto(false);
    }
  };

  const handleAddIdea = async () => {
    if (!user || !detailId || !newIdeaTitulo.trim()) return;
    await addPeldanoIdea(user.uid, detailId, newIdeaTitulo.trim());
    setNewIdeaTitulo("");
    void reloadDetail();
  };

  const handleSaveNota = async () => {
    if (!user || !detailId) return;
    await updateProyecto(user.uid, detailId, { nota: notaEdit.trim() || undefined });
    void reloadDetail();
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm min-h-screen" style={{ backgroundColor: "#020202" }}>
        Inicia sesión para ver tus proyectos.
      </div>
    );
  }

  const detailReady = Boolean(detailId && proyecto && proyecto.id === detailId);

  if (detailId && !detailReady) {
    return (
      <div
        className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32 flex flex-col items-center justify-center"
        style={{ backgroundColor: "#020202" }}
      >
        {detailLoading ? (
          <p className="text-center text-slate-600 text-sm py-8">Cargando proyecto…</p>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">Proyecto no encontrado</p>
            <button
              type="button"
              onClick={() => navigate("/proyectos")}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"
            >
              <ArrowLeft size={14} /> Volver al listado
            </button>
          </>
        )}
      </div>
    );
  }

  if (detailReady && proyecto) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32" style={{ backgroundColor: "#020202" }}>
        <button
          type="button"
          onClick={() => navigate("/proyectos")}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4"
        >
          <ArrowLeft size={14} /> Todos los proyectos
        </button>

        <div
          className="p-4 rounded-2xl border mb-4"
          style={{ backgroundColor: PIZARRA, borderColor: `${proyecto.color ?? CYAN}40` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
                {proyecto.etiqueta}
              </span>
              <h1 className="text-xl font-black text-white mt-0.5">{proyecto.titulo}</h1>
            </div>
            <ProyectoIcono etiqueta={proyecto.etiqueta} color={proyecto.color} size={28} />
          </div>
          <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">
            {proyecto.etiqueta === "centro"
              ? "Centro = deber por circunstancia (ej. costura). La rutina solo reserva el hueco; la claridad vive aquí."
              : "Proyecto = lo que eliges crecer (ej. Sistemicar). La rutina no repite pasos: los segmentos leen esta dirección."}
          </p>
        </div>

        {claridadEdit && (
          <div className="mb-4 space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
              Oleada / objetivo actual
            </label>
            <input
              value={oleadaTituloEdit}
              onChange={e => setOleadaTituloEdit(e.target.value)}
              placeholder={
                proyecto.etiqueta === "centro"
                  ? "Ej: Lote entrega viernes — 10 días"
                  : "Ej: Módulo pagos — sprint 10 días"
              }
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none"
            />
            {oleadaActiva && !oleadaActiva.origenSegmento && (
              <p className="text-[8px] text-slate-500">
                Oleada en curso: <span className="text-slate-300">{oleadaActiva.titulo}</span>
              </p>
            )}
            <RutasMentalesEditor
              rutas={claridadEdit}
              onChange={setClaridadEdit}
              etiqueta={proyecto.etiqueta}
              desdeProyecto
            />
            <button
              type="button"
              disabled={guardandoClaridad}
              onClick={() => void handleGuardarClaridad()}
              className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              style={{
                backgroundColor: `${proyecto.color ?? CYAN}18`,
                color: proyecto.color ?? CYAN,
                border: `1px solid ${proyecto.color ?? CYAN}40`,
              }}
            >
              {guardandoClaridad ? "Guardando…" : "Guardar dirección (sincroniza segmentos al cargar rutina)"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-lg font-black text-white">{stats.conquistados}</p>
            <p className="text-[7px] uppercase text-slate-500 tracking-wider">Peldaños</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-lg font-black" style={{ color: RUTA_BANDA_META[stats.profundidadMaxima].color }}>
              {RUTA_BANDA_META[stats.profundidadMaxima].label}
            </p>
            <p className="text-[7px] uppercase text-slate-500 tracking-wider">Profundidad</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-lg font-black text-white">{stats.minutosTotales}</p>
            <p className="text-[7px] uppercase text-slate-500 tracking-wider">Min reg.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-white/10 mb-4" style={{ backgroundColor: PIZARRA }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: GOLD }}>
            <Sparkles size={12} /> Por qué te emociona
          </p>
          <textarea
            value={notaEdit}
            onChange={e => setNotaEdit(e.target.value)}
            onBlur={() => void handleSaveNota()}
            placeholder="Ej: Cada bloque de costura me deja más tiempo libre al atardecer…"
            className="w-full bg-transparent text-[11px] text-slate-300 placeholder:text-slate-600 resize-none min-h-[60px] focus:outline-none"
          />
        </div>

        {(proyecto.pasosEjecutadosLog?.length ?? 0) > 0 && (
          <div className="mb-4 p-3 rounded-xl border border-white/10" style={{ backgroundColor: PIZARRA }}>
            <PeldanoDecisionesEnumeradas
              decisiones={proyecto.pasosEjecutadosLog!}
              titulo="Pasos desde el Crisol"
            />
          </div>
        )}

        {enCursoPlan.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: CYAN }}>
              <Clock size={12} /> Desde {JORNADA_MODULE.title.toLowerCase()} hoy
            </p>
            <div className="space-y-2">
              {enCursoPlan.map(pel => (
                <div
                  key={pel.id}
                  className="p-3 rounded-xl border"
                  style={{ borderColor: `${CYAN}30`, backgroundColor: "rgba(0,255,195,0.04)" }}
                >
                  <p className="text-sm font-bold text-white">{pel.titulo}</p>
                  <p className="text-[8px] text-slate-500 mt-0.5">
                    {pel.horaInicio} – {pel.horaFin} · opera en {JORNADA_MODULE.title}
                  </p>
                  {pel.rutasMentales && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <RutasMentalesGrafo rutas={pel.rutasMentales} compact />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: CYAN }}>
            Desglosar ideas
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={newIdeaTitulo}
              onChange={e => setNewIdeaTitulo(e.target.value)}
              placeholder="Nueva idea / bloque…"
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none"
              onKeyDown={e => e.key === "Enter" && void handleAddIdea()}
            />
            <button
              onClick={() => void handleAddIdea()}
              className="px-3 py-2 rounded-lg font-bold"
              style={{ backgroundColor: `${CYAN}20`, color: CYAN, border: `1px solid ${CYAN}40` }}
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {ideas.length === 0 && (
              <p className="text-[10px] text-slate-600 text-center py-4">
                Añade ideas opcionales — no son deuda, son peldaños posibles.
              </p>
            )}
            {ideas.map(pel => (
              <div
                key={pel.id}
                className="p-3 rounded-xl border border-white/10"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-white">{pel.titulo}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void reorderPeldano(user!.uid, detailId, pel.id, "up")}
                      className="p-1 text-slate-500 hover:text-white"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => void reorderPeldano(user!.uid, detailId, pel.id, "down")}
                      className="p-1 text-slate-500 hover:text-white"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => void deletePeldanoIdea(user!.uid, pel.id).then(() => reloadDetail())}
                      className="p-1 text-slate-600 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {pel.plantillaSubTareas && pel.plantillaSubTareas.length > 0 && (
                  <p className="text-[8px] text-slate-500 mb-2 leading-relaxed">
                    {pel.plantillaSubTareas.length} detalle
                    {pel.plantillaSubTareas.length !== 1 ? "s" : ""} pendiente
                    {pel.plantillaSubTareas.length !== 1 ? "s" : ""} de profundidad
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleUsarIdeaComoOleada(pel.id)}
                  className="w-full mb-2 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider text-slate-400 border border-white/10 hover:border-white/20"
                >
                  Usar como oleada activa
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(buildLaunchUrl(detailId, pel.id, "desglosador_tiempo"))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase"
                    style={{ backgroundColor: `${NARANJA}15`, color: NARANJA, border: `1px solid ${NARANJA}35` }}
                  >
                    <Clock size={12} /> Tiempo
                  </button>
                  <button
                    onClick={() => navigate(buildLaunchUrl(detailId, pel.id, "desglosador_situacion"))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold uppercase"
                    style={{ backgroundColor: `${PLATA}15`, color: PLATA, border: `1px solid ${PLATA}35` }}
                  >
                    <Flag size={12} /> Situación
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: GOLD }}>
            <TrendingUp size={12} /> Tu escalera — conquistados
          </p>
          {conquistados.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-6 border border-dashed border-white/10 rounded-xl">
              Lanza un desglosador y ciérralo — aquí aparecerá tu progreso real.
            </p>
          ) : (
            <div className="space-y-2">
              {conquistados.map((pel, i) => (
                <div
                  key={pel.id}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: `${GOLD}25`, backgroundColor: PIZARRA }}
                >
                  <button
                    className="w-full p-3 flex items-center justify-between text-left"
                    onClick={() => setExpandedConq(expandedConq === pel.id ? null : pel.id)}
                  >
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase">
                        Peldaño {conquistados.length - i} · {formatFecha(pel.cerradoAt)} · {formatTipoOrigen(pel.tipoOrigen)}
                      </p>
                      <p className="text-sm font-bold text-white">{pel.titulo}</p>
                    </div>
                    {expandedConq === pel.id ? (
                      <ChevronUp size={14} className="text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-500 shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedConq === pel.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-3 text-[10px] text-slate-400 space-y-2">
                          {pel.rutasMentales && (
                            <RutasMentalesGrafo rutas={pel.rutasMentales} compact />
                          )}
                          {pel.resumen?.segmentoResumen?.rutaMentalLabel && (
                            <p className="text-[9px]" style={{ color: CYAN }}>
                              Ruta: {pel.resumen.segmentoResumen.rutaMentalLabel}
                              {pel.resumen.segmentoResumen.faseAtencional
                                ? ` · ${pel.resumen.segmentoResumen.faseAtencional}`
                                : ""}
                            </p>
                          )}
                          {pel.resumen?.subsCumplidos != null && (
                            <p>
                              Bloques: {pel.resumen.subsCumplidos}/{pel.resumen.subsTotal} ·{" "}
                              {pel.resumen.duracionMin ?? 0} min · {pel.resumen.psGanados ?? 0} PS
                              {(pel.resumen.totalDecisiones ?? 0) > 0 && (
                                <span style={{ color: CYAN }}>
                                  {" "}
                                  · {pel.resumen.totalDecisiones} decisión
                                  {pel.resumen.totalDecisiones !== 1 ? "es" : ""}
                                </span>
                              )}
                              {(pel.resumen.minutosGanados ?? 0) > 0 && (
                                <span style={{ color: CYAN }}>
                                  {" "}
                                  · +{pel.resumen.minutosGanados} min recuperados
                                </span>
                              )}
                            </p>
                          )}
                          {pel.resumen?.decisionesEnumeradas && pel.resumen.decisionesEnumeradas.length > 0 && (
                            <PeldanoDecisionesEnumeradas
                              decisiones={pel.resumen.decisionesEnumeradas}
                              compact
                            />
                          )}
                          {pel.resumen?.subResumen?.map((s, j) => (
                            <p key={j} className="pl-2 text-slate-500">
                              • {s.titulo} ({s.status})
                            </p>
                          ))}
                          {pel.resumen?.subTareasResumen && pel.resumen.subTareasResumen.length > 0 && (
                            <PeldanoSituacionArbol
                              subTareas={pel.resumen.subTareasResumen}
                              compact
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto min-h-screen pb-32" style={{ backgroundColor: "#020202" }}>
      <header className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Hub de Proyectos</p>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Layers size={22} style={{ color: CYAN }} />
          Proyectos y Centros
        </h1>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          Construye tu futuro peldaño a peldaño. Sin calendario. Sin semana que traiciona.
        </p>
      </header>

      <button
        onClick={() => setShowNew(true)}
        className="w-full mb-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
        style={{ backgroundColor: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}40` }}
      >
        <Plus size={16} /> Nuevo proyecto o centro
      </button>

      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-white/10 mb-4 space-y-3"
            style={{ backgroundColor: PIZARRA }}
          >
            <input
              value={newTitulo}
              onChange={e => setNewTitulo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void handleCreateProyecto()}
              placeholder="Nombre (ej: Costura, Salud…)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              {(["proyecto", "centro"] as const).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewEtiqueta(e)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[9px] font-bold uppercase",
                    newEtiqueta === e ? "text-white" : "text-slate-500"
                  )}
                  style={
                    newEtiqueta === e
                      ? { backgroundColor: `${CYAN}25`, border: `1px solid ${CYAN}50` }
                      : { border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {e}
                </button>
              ))}
            </div>
            <textarea
              value={newNota}
              onChange={e => setNewNota(e.target.value)}
              placeholder="Opcional: qué tiempo te libera esto…"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-slate-300 text-[11px] resize-none min-h-[50px] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                disabled={creatingProyecto}
                className="flex-1 py-2 text-[10px] font-bold text-slate-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreateProyecto()}
                disabled={creatingProyecto || !newTitulo.trim()}
                className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50"
                style={{ backgroundColor: CYAN, color: "#000" }}
              >
                {creatingProyecto ? "Creando…" : "Crear"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="text-center text-slate-600 text-sm py-8">Cargando…</p>
      ) : proyectos.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <Layers size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-500">Sin proyectos aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/proyectos?id=${p.id}`)}
              className="w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.01]"
              style={{ backgroundColor: PIZARRA, borderColor: `${p.color ?? CYAN}30` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold uppercase text-slate-500">{p.etiqueta}</span>
                  <p className="text-base font-black text-white">{p.titulo}</p>
                </div>
                <ProyectoIcono etiqueta={p.etiqueta} color={p.color} />
              </div>
              <div className="flex gap-4 mt-3 text-[9px] font-bold uppercase tracking-wider">
                <span style={{ color: GOLD }}>{p.peldanosConquistados} peldaños</span>
                {p.profundidadMaxima && (
                  <span style={{ color: RUTA_BANDA_META[p.profundidadMaxima].color }}>
                    {RUTA_BANDA_META[p.profundidadMaxima].label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

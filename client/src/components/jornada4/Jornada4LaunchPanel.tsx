import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, ListTodo, Lock, Plus, Rocket, Trash2, Zap, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import {
  FLOTA_CONFIG,
  getSubVehicleRecordSuggestions,
  getDesglosadorMisionData,
  getDesglosadorHistorico,
  getHistoricalVehicleData,
} from "@/components/flota/vehicleCardShared";
import { FLOTA_SELECTOR_DISCRIMINATOR } from "@/lib/flotaBrand";
import type { DesglosadorSubFormRow, FlotaLaunchModo } from "@/lib/executeFlotaLaunch";
import type { Jornada4LaunchForm } from "@/jornada4/executeJornada4Launch";
import {
  detectLetterTrigger,
  isEmptySituacionDraft,
  recallSecuencia,
  shouldAutoFillDue,
  suggestDueLetter,
  upsertSecuenciaAnclada,
  type SecuenciaAnclada,
  type SecuenciaLetra,
} from "@/lib/secuenciaAnclada";
import {
  readSecuenciasAncladas,
  writeSecuenciasAncladas,
} from "@/lib/secuenciaAncladaStore";
import { SecuenciaAncladaBar } from "./SecuenciaAncladaBar";
import {
  projectDesglosadorEndFromSubs,
  projectUnitEndLabel,
} from "@/jornada4/desglosadorProjection";
import {
  desglosadorProfundidadLabel,
  desglosadorProfundidadPotencialPs,
} from "@/jornada4/desglosadorProfundidad";
import {
  resolveDefaultObjetivoHoraParaRing,
  situacionMinutosHastaObjetivoHora,
} from "@/lib/situacionGanancia";
import { useJornada4Tick } from "@/hooks/useJornada4Tick";
import { JORNADA4_OPEN_LAUNCH_EVENT } from "@/lib/pulsoCoberturaEvents";
import { SegmentoProyectoSelect } from "@/components/planeacion/SegmentoProyectoSelect";
import type { Proyecto } from "@/lib/proyectos";
import { J4_COLORS } from "./Jornada4Shell";
import { ENTRENAMIENTO_COPY } from "@/jornada4/entrenamientoRestricciones";

const { PIZARRA, INK, MUTED, ACCENT, GOLD } = J4_COLORS;
const ORANGE = "#f97316";
const CYAN = "#00FFC3";
const EMERALD = "#50C878";
const V4_TIPOS = ["tiempo", "situacion"] as const;

type Props = {
  onLaunch: (form: Jornada4LaunchForm) => Promise<string | null>;
  disabled?: boolean;
  /** Hora fin del segmento activo → meta default del ring. */
  segmentoHoraFin?: string | null;
  /** Nombre del segmento activo (chip en launcher). */
  segmentoActivoNombre?: string | null;
  /** Hub de proyectos para dirección (segmento / vehículo / sub). */
  proyectosHub?: Proyecto[];
  /** Dirección por defecto del segmento activo. */
  defaultProyectoId?: string | null;
  /** Ritmo: Situacional / Enfoque. Base solo Conquista. */
  canSituacion?: boolean;
  /** Norte: vincular a Hub Proyectos. */
  canProyectos?: boolean;
  /** Norte (Soberanía): toggle ring entrenamiento. */
  canModoEntrenamientoRing?: boolean;
  /** Ritmo (Operativo): toggle anclar desglosador al segmento. */
  canAnclarDesglosadorSegmento?: boolean;
  /** Peldaño Hub (idea/oleada) al que se amarran los vehículos lanzados. */
  hubPeldanoId?: string | null;
  /** Punto de desglose de oleada (foco) a sintonizar. */
  hubOleadaPuntoId?: string | null;
};

function makeSub(): DesglosadorSubFormRow {
  return {
    tempId: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    titulo: "",
    cantidadObjetivo: "",
  };
}

function defaultHoraPlus(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  segmentoHoraFin = null,
  segmentoActivoNombre = null,
  proyectosHub = [],
  defaultProyectoId = null,
  canSituacion = true,
  canProyectos = true,
  canModoEntrenamientoRing = false,
  canAnclarDesglosadorSegmento = false,
  hubPeldanoId = null,
  hubOleadaPuntoId = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState<(typeof V4_TIPOS)[number] | null>(null);
  const [modo, setModo] = useState<FlotaLaunchModo>("rapido");
  const [titulo, setTitulo] = useState("");
  const [subs, setSubs] = useState<DesglosadorSubFormRow[]>([makeSub()]);
  const [filas, setFilas] = useState<string[]>([""]);
  const [filasProyectoIds, setFilasProyectoIds] = useState<string[]>([""]);
  const [vehiculoProyectoId, setVehiculoProyectoId] = useState("");
  const [peldanoIdLaunch, setPeldanoIdLaunch] = useState(hubPeldanoId?.trim() || "");
  const [oleadaPuntoIdLaunch, setOleadaPuntoIdLaunch] = useState(hubOleadaPuntoId?.trim() || "");
  /** Conquista multi: un desglosador en secuencia vs N tareas independientes. */
  const [conquistaMultiModo, setConquistaMultiModo] = useState<
    "secuencia" | "independientes"
  >("secuencia");
  const [situacionHoraFin, setSituacionHoraFin] = useState(() =>
    resolveDefaultObjetivoHoraParaRing(segmentoHoraFin ?? undefined) ?? defaultHoraPlus(30)
  );
  const [terminoDetalle, setTerminoDetalle] = useState("Al cerrar este bloque");
  const [showMissionSugs, setShowMissionSugs] = useState(false);
  const [historialSubs, setHistorialSubs] = useState<string[]>([]);
  const [activeSubSugIdx, setActiveSubSugIdx] = useState<number | null>(null);
  const [modoEntrenamientoRing, setModoEntrenamientoRing] = useState(false);
  const [ancladoAlSegmento, setAncladoAlSegmento] = useState(false);
  const [secuenciaSlots, setSecuenciaSlots] = useState<SecuenciaAnclada[]>([]);
  const [secuenciaLetraActiva, setSecuenciaLetraActiva] = useState<SecuenciaLetra | null>(null);
  const [secuenciaHora, setSecuenciaHora] = useState("");
  const [secuenciaOverwrite, setSecuenciaOverwrite] = useState<SecuenciaLetra | null>(null);
  const dueFilledRef = useRef(false);
  const { user } = useAuthContext();
  const userId = user?.uid ?? "";
  const keyboardInset = useKeyboardInset();
  const tick = useJornada4Tick(open && (tipo === "tiempo" || tipo === "situacion"));
  /** Overflow previo del body — liberar al abrir <select> nativo (evita bloqueo móvil). */
  const bodyOverflowPrevRef = useRef<string | null>(null);
  const nativePickerOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    bodyOverflowPrevRef.current = prev;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflowPrevRef.current ?? prev;
      bodyOverflowPrevRef.current = null;
      nativePickerOpenRef.current = false;
    };
  }, [open]);

  const releaseBodyForNativePicker = useCallback(() => {
    if (!open || nativePickerOpenRef.current) return;
    nativePickerOpenRef.current = true;
    document.body.style.overflow = bodyOverflowPrevRef.current ?? "";
  }, [open]);

  const restoreBodyAfterNativePicker = useCallback(() => {
    if (!nativePickerOpenRef.current) return;
    nativePickerOpenRef.current = false;
    if (open) document.body.style.overflow = "hidden";
  }, [open]);

  /** Cierra el sheet ANTES de salir a /proyectos (overflow + Dual Kernel). */
  const closeBeforeHubNavigate = useCallback(() => {
    nativePickerOpenRef.current = false;
    if (bodyOverflowPrevRef.current != null) {
      document.body.style.overflow = bodyOverflowPrevRef.current;
      bodyOverflowPrevRef.current = null;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        tipoFlota?: "tiempo" | "situacion";
        proyectoId?: string;
        peldanoId?: string;
        oleadaPuntoId?: string;
        modo?: FlotaLaunchModo;
      }>).detail;
      if (detail?.proyectoId?.trim()) setVehiculoProyectoId(detail.proyectoId.trim());
      if (detail?.peldanoId?.trim()) setPeldanoIdLaunch(detail.peldanoId.trim());
      if (detail?.oleadaPuntoId?.trim()) setOleadaPuntoIdLaunch(detail.oleadaPuntoId.trim());
      if (detail?.modo) setModo(detail.modo);
      setTipo(detail?.tipoFlota ?? null);
      setOpen(true);
    };
    window.addEventListener(JORNADA4_OPEN_LAUNCH_EVENT, onOpen);
    return () => window.removeEventListener(JORNADA4_OPEN_LAUNCH_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (hubPeldanoId?.trim()) setPeldanoIdLaunch(hubPeldanoId.trim());
  }, [hubPeldanoId]);

  useEffect(() => {
    if (hubOleadaPuntoId?.trim()) setOleadaPuntoIdLaunch(hubOleadaPuntoId.trim());
  }, [hubOleadaPuntoId]);

  useEffect(() => {
    if (tipo !== "tiempo" || modo !== "desglose" || titulo.trim().length < 3) {
      setHistorialSubs([]);
      return;
    }
    setHistorialSubs(getDesglosadorHistorico(titulo.trim()));
  }, [titulo, tipo, modo]);

  useEffect(() => {
    if (!open || !userId) {
      if (!open) {
        setSecuenciaSlots([]);
        dueFilledRef.current = false;
      }
      return;
    }
    setSecuenciaSlots(readSecuenciasAncladas(userId));
  }, [open, userId]);

  const applySecuenciaRecall = useCallback(
    (letra: SecuenciaLetra, opts?: { silent?: boolean }) => {
      const slot = recallSecuencia(secuenciaSlots, letra);
      if (!slot) {
        if (!opts?.silent) {
          toast.message(`No hay hábito ${letra}`, {
            description: "Ancla una secuencia en esa letra primero.",
          });
        }
        return;
      }
      setModo(slot.modo);
      setTitulo(slot.modo === "desglose" ? slot.titulo : "");
      const nextFilas = slot.filas.length > 0 ? [...slot.filas] : [""];
      const nextDirs = slot.filas.map((_, i) => slot.filasProyectoIds[i] ?? "");
      while (nextDirs.length < nextFilas.length) nextDirs.push("");
      setFilas(nextFilas);
      setFilasProyectoIds(nextDirs);
      setSecuenciaLetraActiva(letra);
      if (slot.hora) setSecuenciaHora(slot.hora);
      setShowMissionSugs(false);
    },
    [secuenciaSlots]
  );

  useEffect(() => {
    if (!open || tipo !== "situacion") return;
    const letter =
      detectLetterTrigger(titulo) ?? detectLetterTrigger(filas[0] ?? "");
    if (!letter) return;
    const t = window.setTimeout(() => applySecuenciaRecall(letter, { silent: true }), 550);
    return () => window.clearTimeout(t);
  }, [titulo, filas, tipo, open, applySecuenciaRecall]);

  const dueLetter = useMemo(
    () => (tipo === "situacion" && open ? suggestDueLetter(secuenciaSlots, Date.now()) : null),
    // tick refresca la ventana ±30 min sin montar otro reloj
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secuenciaSlots, tipo, open, tick]
  );

  useEffect(() => {
    if (!open || tipo !== "situacion" || dueFilledRef.current) return;
    if (!shouldAutoFillDue(isEmptySituacionDraft(titulo, filas), dueLetter)) {
      return;
    }
    dueFilledRef.current = true;
    applySecuenciaRecall(dueLetter);
  }, [open, tipo, dueLetter, titulo, filas, applySecuenciaRecall]);

  const canAnchorSecuencia =
    tipo === "situacion" && filas.some(f => f.trim().length > 0);

  const commitSecuenciaAnchor = useCallback(
    (letra: SecuenciaLetra, overwrite: boolean) => {
      const validFilas = filas.map(f => f.trim()).filter(Boolean);
      const validDirs = filas
        .map((f, i) => (f.trim() ? (filasProyectoIds[i] ?? "") : null))
        .filter((d): d is string => d != null);
      const result = upsertSecuenciaAnclada(
        secuenciaSlots,
        {
          letra,
          titulo: titulo.trim() || validFilas[0] || "",
          filas: validFilas,
          filasProyectoIds: validDirs,
          modo,
          hora: secuenciaHora || null,
        },
        { overwrite }
      );
      if (!result.ok) {
        if (result.error === "slot_ocupado") {
          setSecuenciaOverwrite(letra);
          return;
        }
        toast.message("No se pudo anclar", {
          description:
            result.error === "secuencia_invalida"
              ? "Necesitas al menos una fila con nombre."
              : "Letra inválida.",
        });
        return;
      }
      const next = writeSecuenciasAncladas(userId, result.slots);
      setSecuenciaSlots(next);
      setSecuenciaLetraActiva(letra);
      setSecuenciaOverwrite(null);
      toast.message(`Hábito ${letra} anclado`, {
        description: secuenciaHora
          ? `Secuencia + ${secuenciaHora}. Una letra lo recuerda.`
          : "Secuencia lista. Una letra la recuerda.",
      });
    },
    [secuenciaSlots, filas, filasProyectoIds, titulo, modo, secuenciaHora, userId]
  );

  const handleAnchorLetter = useCallback(
    (letra: SecuenciaLetra) => {
      const occupied = recallSecuencia(secuenciaSlots, letra);
      if (!canAnchorSecuencia) {
        if (occupied) {
          applySecuenciaRecall(letra);
          return;
        }
        toast.message("Llena la secuencia primero", {
          description: "Al menos una fila. Luego anclas la letra.",
        });
        return;
      }
      commitSecuenciaAnchor(letra, false);
    },
    [
      secuenciaSlots,
      canAnchorSecuencia,
      applySecuenciaRecall,
      commitSecuenciaAnchor,
    ]
  );

  const missionSuggestions =
    tipo === "tiempo" && modo === "desglose" && titulo.trim().length >= 2
      ? getDesglosadorMisionData(titulo, 5)
      : [];

  const projection = useMemo(() => {
    void tick;
    if (tipo !== "tiempo") return null;
    return projectDesglosadorEndFromSubs(subs);
  }, [subs, tick, tipo]);

  const profundidadePs = useMemo(() => {
    const n = subs.filter(s => s.titulo.trim()).length;
    return desglosadorProfundidadPotencialPs(n);
  }, [subs]);

  const situacionMinHasta = useMemo(() => {
    if (!situacionHoraFin.trim()) return null;
    return situacionMinutosHastaObjetivoHora(situacionHoraFin.trim());
  }, [situacionHoraFin, tick]);

  useEffect(() => {
    if (tipo === "situacion" && modo === "desglose") {
      setSituacionHoraFin(
        resolveDefaultObjetivoHoraParaRing(segmentoHoraFin ?? undefined) ??
          defaultHoraPlus(30)
      );
    }
  }, [segmentoHoraFin, tipo, modo]);

  const reset = useCallback(() => {
    setTipo(null);
    setModo("rapido");
    setTitulo("");
    setSubs([makeSub()]);
    setFilas([""]);
    setFilasProyectoIds([""]);
    setVehiculoProyectoId(defaultProyectoId?.trim() || "");
    setPeldanoIdLaunch(hubPeldanoId?.trim() || "");
    setOleadaPuntoIdLaunch(hubOleadaPuntoId?.trim() || "");
    setConquistaMultiModo("secuencia");
    setSituacionHoraFin(
      resolveDefaultObjetivoHoraParaRing(segmentoHoraFin ?? undefined) ??
        defaultHoraPlus(30)
    );
    setTerminoDetalle("Al cerrar este bloque");
    setShowMissionSugs(false);
    setHistorialSubs([]);
    setActiveSubSugIdx(null);
    setModoEntrenamientoRing(false);
    setAncladoAlSegmento(false);
    setSecuenciaLetraActiva(null);
    setSecuenciaHora("");
    setSecuenciaOverwrite(null);
    setOpen(false);
  }, [segmentoHoraFin, defaultProyectoId, hubPeldanoId, hubOleadaPuntoId]);

  const openTipo = useCallback((t: (typeof V4_TIPOS)[number]) => {
    if (t === "situacion" && !canSituacion) {
      toast.message("Situacional es parte de Ritmo del día", {
        description: "Base incluye Conquista (unidades). Activa Ritmo para imprevistos y ring.",
        action: {
          label: "Ver Ritmo",
          onClick: () => {
            window.location.href = "/pagos?plan=operativo";
          },
        },
      });
      return;
    }
    setTipo(t);
    // Conquista = siempre desglosador (1 tarea → crece). Enfoque = lista libre primero.
    setModo(t === "tiempo" ? "desglose" : "rapido");
    setConquistaMultiModo("secuencia");
    setVehiculoProyectoId("");
    if (t === "situacion") {
      setSituacionHoraFin(
        resolveDefaultObjetivoHoraParaRing(segmentoHoraFin ?? undefined) ??
          defaultHoraPlus(30)
      );
      if (!terminoDetalle.trim()) setTerminoDetalle("Al cerrar este bloque");
    }
    setOpen(true);
  }, [terminoDetalle, segmentoHoraFin, defaultProyectoId, canSituacion, canProyectos]);

  useEffect(() => {
    if (!open) return;
    setVehiculoProyectoId(prev => prev || defaultProyectoId?.trim() || "");
  }, [open, defaultProyectoId]);

  const canLaunch =
    tipo != null &&
    (tipo === "tiempo"
      ? (() => {
          const validSubs = subs.filter(
            s => s.titulo.trim() && Number(s.cantidadObjetivo) > 0
          );
          if (validSubs.length === 0) return false;
          // Independientes: cada unidad es su propia misión.
          if (validSubs.length > 1 && conquistaMultiModo === "independientes") {
            return true;
          }
          // Desglosador (secuencia): requiere nombre de misión.
          return titulo.trim().length > 0;
        })()
      : modo === "rapido"
        ? filas.some(f => f.trim())
        : titulo.trim().length > 0 &&
          filas.some(f => f.trim()) &&
          situacionMinHasta != null);

  const handleLaunch = useCallback(async () => {
    if (!tipo || saving || !canLaunch) return;
    setSaving(true);
    try {
      const dirVehiculo = vehiculoProyectoId.trim() || undefined;
      const dirPeldano = peldanoIdLaunch.trim() || undefined;
      const dirPunto = oleadaPuntoIdLaunch.trim() || undefined;
      const validSubs = subs.filter(
        s => s.titulo.trim() && Number(s.cantidadObjetivo) > 0
      );

      let id: string | null = null;
      if (tipo === "tiempo") {
        const asIndependientes =
          validSubs.length > 1 && conquistaMultiModo === "independientes";
        id = await onLaunch({
          titulo: asIndependientes
            ? ""
            : titulo.trim() || validSubs[0]!.titulo.trim(),
          tipoFlota: "tiempo",
          modo: "desglose",
          desglosadorSubs: asIndependientes ? undefined : validSubs,
          tareasIndependientes: asIndependientes ? validSubs : undefined,
          conquistaComoIndependientes: asIndependientes,
          ...(dirVehiculo ? { proyectoId: dirVehiculo } : {}),
          ...(dirPeldano ? { peldanoId: dirPeldano } : {}),
          ...(dirPunto ? { oleadaPuntoId: dirPunto } : {}),
          ...(canAnclarDesglosadorSegmento && ancladoAlSegmento
            ? { ancladoAlSegmento: true }
            : {}),
        });
      } else if (modo === "rapido") {
        id = await onLaunch({
          titulo: "",
          tipoFlota: "situacion",
          modo: "rapido",
          situacionFilas: filas,
          situacionFilasProyectoIds: filasProyectoIds,
          terminoDetalle,
          ...(dirVehiculo ? { proyectoId: dirVehiculo } : {}),
          ...(dirPeldano ? { peldanoId: dirPeldano } : {}),
          ...(dirPunto ? { oleadaPuntoId: dirPunto } : {}),
        });
      } else {
        id = await onLaunch({
          titulo,
          tipoFlota: "situacion",
          modo: "desglose",
          situacionFilas: filas,
          situacionFilasProyectoIds: filasProyectoIds,
          situacionObjetivoHora: situacionHoraFin.trim(),
          terminoDetalle,
          ...(dirVehiculo ? { proyectoId: dirVehiculo } : {}),
          ...(dirPeldano ? { peldanoId: dirPeldano } : {}),
          ...(dirPunto ? { oleadaPuntoId: dirPunto } : {}),
          ...(canModoEntrenamientoRing && modoEntrenamientoRing
            ? { modoEntrenamientoRing: true }
            : {}),
        });
      }
      if (id) reset();
    } finally {
      setSaving(false);
    }
  }, [
    tipo,
    modo,
    saving,
    canLaunch,
    onLaunch,
    titulo,
    subs,
    filas,
    filasProyectoIds,
    vehiculoProyectoId,
    peldanoIdLaunch,
    oleadaPuntoIdLaunch,
    situacionHoraFin,
    terminoDetalle,
    conquistaMultiModo,
    canAnclarDesglosadorSegmento,
    ancladoAlSegmento,
    canModoEntrenamientoRing,
    modoEntrenamientoRing,
    reset,
  ]);

  const autofillRecord = (idx: number, tituloSub: string) => {
    const sug = getSubVehicleRecordSuggestions(tituloSub);
    if (sug.length === 0) return;
    const exact = sug.find(s => s.titulo.toLowerCase() === tituloSub.trim().toLowerCase());
    const match = exact ?? sug[0]!;
    const record =
      getHistoricalVehicleData(match.titulo).bestMinPerUnit ?? match.minPerUnit;
    if (!(record > 0)) return;
    setSubs(prev =>
      prev.map((s, i) =>
        i === idx && !s.tiempoRecordMinPerUnit
          ? { ...s, tiempoRecordMinPerUnit: record }
          : s
      )
    );
  };

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
          {segmentoActivoNombre ? (
            <p
              className="text-[9px] mt-1 font-bold"
              style={{ color: EMERALD }}
              data-testid="jornada4-launch-seg-chip"
            >
              Lanza en · {segmentoActivoNombre}
              {segmentoHoraFin ? ` · meta ${segmentoHoraFin}` : ""}
            </p>
          ) : null}
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
          const locked = t === "situacion" && !canSituacion;
          return (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => openTipo(t)}
              className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] touch-manipulation disabled:opacity-40 relative"
              style={{
                borderColor: locked ? `${cfg.color}18` : `${cfg.color}30`,
                backgroundColor: `${cfg.color}08`,
                opacity: locked ? 0.72 : 1,
              }}
              data-testid={`jornada4-flota-${t}`}
            >
              {locked ? (
                <span
                  className="absolute top-2 right-2 flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wider"
                  style={{ color: GOLD }}
                >
                  <Lock size={9} /> Ritmo
                </span>
              ) : null}
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
                {locked ? "Requiere Ritmo del día" : cfg.sublabel}
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
                        onClick={() => openTipo(t)}
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

                  {tipo === "situacion" ? (
                  <div
                    className="grid grid-cols-2 gap-2"
                    data-testid="jornada4-launch-modo"
                  >
                    {(
                      [
                        {
                          id: "rapido" as const,
                          label: "Lista libre",
                          hint: "Filas directas · sin meta ni presión",
                          icon: Zap,
                        },
                        {
                          id: "desglose" as const,
                          label: "Ring",
                          hint: "Filas + meta sellada",
                          icon: ListTodo,
                        },
                      ] as const
                    ).map(opt => {
                      const Icon = opt.icon;
                      const active = modo === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setModo(opt.id)}
                          className="p-3 rounded-xl border text-left touch-manipulation"
                          style={{
                            borderColor: active
                              ? `${FLOTA_CONFIG[tipo].color}55`
                              : "rgba(255,255,255,0.1)",
                            backgroundColor: active
                              ? `${FLOTA_CONFIG[tipo].color}12`
                              : "rgba(255,255,255,0.02)",
                          }}
                          data-testid={`jornada4-launch-modo-${opt.id}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon
                              size={12}
                              style={{
                                color: active
                                  ? FLOTA_CONFIG[tipo].color
                                  : MUTED,
                              }}
                            />
                            <span
                              className="text-[10px] font-black uppercase"
                              style={{
                                color: active
                                  ? FLOTA_CONFIG[tipo].color
                                  : MUTED,
                              }}
                            >
                              {opt.label}
                            </span>
                          </div>
                          <p className="text-[8px] leading-snug" style={{ color: MUTED }}>
                            {opt.hint}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  ) : (
                  <div
                    className="rounded-xl border px-3 py-2.5 space-y-1"
                    style={{
                      borderColor: `${ORANGE}35`,
                      backgroundColor: "rgba(249,115,22,0.08)",
                    }}
                    data-testid="jornada4-conquista-modo-hint"
                  >
                    <p className="text-[10px] font-black uppercase" style={{ color: ORANGE }}>
                      {subs.filter(s => s.titulo.trim()).length > 1 &&
                      conquistaMultiModo === "independientes"
                        ? "Independientes · sin secuencia"
                        : "Desglosador · secuencia"}
                    </p>
                    <p className="text-[8px] leading-snug" style={{ color: MUTED }}>
                      Misión + unidades con cantidad y récord. Al añadir 2+ unidades puedes
                      elegir secuencia (un desglosador) o independientes.
                    </p>
                  </div>
                  )}

                  {tipo === "situacion" && modo === "desglose" && canModoEntrenamientoRing ? (
                    <button
                      type="button"
                      onClick={() => setModoEntrenamientoRing(v => !v)}
                      className="w-full rounded-xl border px-3 py-2.5 text-left touch-manipulation"
                      style={{
                        borderColor: modoEntrenamientoRing
                          ? `${CYAN}55`
                          : "rgba(255,255,255,0.1)",
                        backgroundColor: modoEntrenamientoRing
                          ? "rgba(0,255,195,0.08)"
                          : "rgba(255,255,255,0.02)",
                      }}
                      data-testid="jornada4-launch-entrenamiento-ring"
                    >
                      <p
                        className="text-[10px] font-black uppercase"
                        style={{ color: modoEntrenamientoRing ? CYAN : MUTED }}
                      >
                        {ENTRENAMIENTO_COPY.ringToggle}
                        {modoEntrenamientoRing ? " · ON" : ""}
                      </p>
                      <p className="text-[8px] leading-snug mt-0.5" style={{ color: MUTED }}>
                        {ENTRENAMIENTO_COPY.ringHint}
                      </p>
                    </button>
                  ) : null}

                  {tipo === "tiempo" && canAnclarDesglosadorSegmento ? (
                    <button
                      type="button"
                      onClick={() => setAncladoAlSegmento(v => !v)}
                      className="w-full rounded-xl border px-3 py-2.5 text-left touch-manipulation"
                      style={{
                        borderColor: ancladoAlSegmento
                          ? `${ORANGE}55`
                          : "rgba(255,255,255,0.1)",
                        backgroundColor: ancladoAlSegmento
                          ? "rgba(249,115,22,0.1)"
                          : "rgba(255,255,255,0.02)",
                      }}
                      data-testid="jornada4-launch-anclar-segmento"
                    >
                      <p
                        className="text-[10px] font-black uppercase"
                        style={{ color: ancladoAlSegmento ? ORANGE : MUTED }}
                      >
                        {ENTRENAMIENTO_COPY.ancladoToggle}
                        {ancladoAlSegmento ? " · ON" : ""}
                      </p>
                      <p className="text-[8px] leading-snug mt-0.5" style={{ color: MUTED }}>
                        {ENTRENAMIENTO_COPY.ancladoHint}
                      </p>
                    </button>
                  ) : null}

                  {/* Dirección del vehículo (hereda segmento; se puede cambiar). */}
                  <SegmentoProyectoSelect
                    value={vehiculoProyectoId}
                    onChange={setVehiculoProyectoId}
                    proyectos={proyectosHub}
                    compact
                    label="Dirección del vehículo"
                    emptyLabel={
                      defaultProyectoId
                        ? "Heredar del segmento"
                        : "Sin dirección"
                    }
                    hint="Vacío = hereda del segmento. Elige otro proyecto para cambiar el rumbo. En Enfoque, el nido del Crisol también dirige."
                    testId="jornada4-launch-dir-vehiculo"
                    locked={!canProyectos}
                    onBeforeHubNavigate={closeBeforeHubNavigate}
                    onNativePickerOpen={releaseBodyForNativePicker}
                    onNativePickerClose={restoreBodyAfterNativePicker}
                  />

                  {tipo === "situacion" ? (
                    <SecuenciaAncladaBar
                      slots={secuenciaSlots}
                      dueLetter={dueLetter}
                      activeLetter={secuenciaLetraActiva}
                      canAnchor={canAnchorSecuencia}
                      hora={secuenciaHora}
                      overwriteLetter={secuenciaOverwrite}
                      onHoraChange={setSecuenciaHora}
                      onRecall={letra => applySecuenciaRecall(letra)}
                      onAnchorLetter={handleAnchorLetter}
                      onConfirmOverwrite={() => {
                        if (secuenciaOverwrite) {
                          commitSecuenciaAnchor(secuenciaOverwrite, true);
                        }
                      }}
                      onCancelOverwrite={() => setSecuenciaOverwrite(null)}
                      onClearHora={() => setSecuenciaHora("")}
                    />
                  ) : null}

                  {/* Nombre de misión: Conquista desglosador + Ring (no lista libre / independientes) */}
                  {((tipo === "tiempo" &&
                    !(
                      subs.filter(s => s.titulo.trim()).length > 1 &&
                      conquistaMultiModo === "independientes"
                    )) ||
                    (tipo === "situacion" && modo === "desglose")) ? (
                  <div>
                    <label
                      className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                      style={{ color: GOLD }}
                    >
                      Nombre de la misión
                    </label>
                    <div className="relative">
                      <input
                        value={titulo}
                        onChange={e => {
                          setTitulo(e.target.value);
                          if (tipo === "tiempo") {
                            setShowMissionSugs(e.target.value.trim().length >= 2);
                          }
                        }}
                        onFocus={() => {
                          if (
                            tipo === "tiempo" &&
                            titulo.trim().length >= 2
                          ) {
                            setShowMissionSugs(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowMissionSugs(false), 150)}
                        placeholder={
                          tipo === "tiempo"
                            ? "Ej: Armado de bolsillo"
                            : "Letra A–F o nombre (ej: Enfoque de la tarde)"
                        }
                        className="w-full p-3.5 rounded-xl bg-black/50 border-2 text-base focus:outline-none"
                        style={{
                          color: INK,
                          borderColor: titulo
                            ? FLOTA_CONFIG[tipo].color
                            : "rgba(255,255,255,0.14)",
                        }}
                        autoFocus
                        data-testid="jornada4-launch-titulo"
                      />
                      {tipo === "tiempo" && showMissionSugs && missionSuggestions.length > 0 ? (
                        <div
                          className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border overflow-hidden max-h-48 overflow-y-auto"
                          style={{
                            backgroundColor: "#0f0f0f",
                            borderColor: `${GOLD}40`,
                            boxShadow: `0 4px 20px ${GOLD}20`,
                          }}
                          data-testid="jornada4-mission-suggestions"
                        >
                          {missionSuggestions.map((s, i) => (
                            <button
                              key={`${s.titulo}-${i}`}
                              type="button"
                              onMouseDown={e => {
                                e.preventDefault();
                                setTitulo(s.titulo);
                                setShowMissionSugs(false);
                              }}
                              className="w-full flex flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-white/5"
                              data-testid={`jornada4-mission-sug-${i}`}
                            >
                              <div className="flex items-center gap-2">
                                <ListTodo size={10} style={{ color: GOLD }} />
                                <span className="text-sm truncate" style={{ color: INK }}>
                                  {s.titulo}
                                </span>
                              </div>
                              {s.subs.length > 0 ? (
                                <div className="pl-4 flex flex-wrap gap-x-1 items-center">
                                  {s.subs.map((sub, j) => (
                                    <span
                                      key={j}
                                      className="text-[8px] font-mono whitespace-nowrap"
                                      style={{ color: "rgba(212,175,55,0.55)" }}
                                    >
                                      {j > 0 ? (
                                        <span style={{ color: "rgba(255,255,255,0.2)" }}>→ </span>
                                      ) : null}
                                      {sub.nombre}
                                      {sub.duracionMin != null
                                        ? ` · ${Math.round(sub.duracionMin)}m`
                                        : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  ) : null}

                  {modo === "rapido" && tipo === "situacion" ? (
                    <div className="space-y-3" data-testid="jornada4-launch-lista-libre">
                      <p
                        className="text-[9px] leading-snug rounded-xl border px-3 py-2.5"
                        style={{
                          color: MUTED,
                          borderColor: "rgba(255,255,255,0.08)",
                          backgroundColor: "rgba(255,255,255,0.03)",
                        }}
                      >
                        Lista libre: vas directo a las tareas. Sin título de misión, sin meta
                        de ring, sin presión de tiempo. Una letra A–F carga un hábito anclado.
                      </p>
                      <p
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: FLOTA_CONFIG.situacion.color }}
                      >
                        Tareas
                      </p>
                      {filas.map((fila, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex gap-2 items-center">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                              style={{
                                backgroundColor: `${FLOTA_CONFIG.situacion.color}22`,
                                color: FLOTA_CONFIG.situacion.color,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <input
                              value={fila}
                              onChange={e => {
                                const next = [...filas];
                                next[idx] = e.target.value;
                                setFilas(next);
                              }}
                              placeholder={`Tarea ${idx + 1}`}
                              className="flex-1 p-3.5 rounded-xl bg-black/50 border-2 text-base focus:outline-none"
                              style={{ color: INK, borderColor: "rgba(255,255,255,0.14)" }}
                              autoFocus={idx === 0}
                              data-testid={`jornada4-launch-libre-fila-${idx}`}
                            />
                            {filas.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFilas(filas.filter((_, i) => i !== idx));
                                  setFilasProyectoIds(filasProyectoIds.filter((_, i) => i !== idx));
                                }}
                                className="p-2 rounded-lg hover:bg-white/5"
                              >
                                <Trash2 size={14} style={{ color: MUTED }} />
                              </button>
                            ) : null}
                          </div>
                          <SegmentoProyectoSelect
                            value={filasProyectoIds[idx] ?? ""}
                            onChange={id => {
                              setFilasProyectoIds(prev => {
                                const next = [...prev];
                                while (next.length <= idx) next.push("");
                                next[idx] = id;
                                return next;
                              });
                            }}
                            proyectos={proyectosHub}
                            compact
                            label="Dirección de esta fila"
                            emptyLabel="Heredar del vehículo"
                            testId={`jornada4-launch-libre-dir-${idx}`}
                            locked={!canProyectos}
                            onBeforeHubNavigate={closeBeforeHubNavigate}
                            onNativePickerOpen={releaseBodyForNativePicker}
                            onNativePickerClose={restoreBodyAfterNativePicker}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFilas([...filas, ""]);
                          setFilasProyectoIds([...filasProyectoIds, ""]);
                        }}
                        className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        style={{
                          backgroundColor: `${FLOTA_CONFIG.situacion.color}12`,
                          color: FLOTA_CONFIG.situacion.color,
                          border: `1px dashed ${FLOTA_CONFIG.situacion.color}45`,
                        }}
                      >
                        <Plus size={12} /> Añadir tarea
                      </button>
                    </div>
                  ) : null}

                  {tipo === "tiempo" && historialSubs.length > 0 ? (
                    <div
                      className="rounded-xl border p-3 space-y-2"
                      style={{
                        borderColor: `${GOLD}35`,
                        backgroundColor: "rgba(212,175,55,0.06)",
                      }}
                      data-testid="jornada4-secuencia-habitual"
                    >
                      <p
                        className="text-[9px] font-black uppercase tracking-widest"
                        style={{ color: GOLD }}
                      >
                        Tu secuencia habitual
                      </p>
                      <ol className="space-y-1">
                        {historialSubs.map((name, i) => (
                          <li
                            key={`${name}-${i}`}
                            className="text-[11px] font-mono flex gap-2"
                            style={{ color: INK }}
                          >
                            <span style={{ color: GOLD }}>{i + 1}.</span>
                            <span className="truncate">{name}</span>
                          </li>
                        ))}
                      </ol>
                      <button
                        type="button"
                        onClick={() => {
                          setSubs(
                            historialSubs.map((t, i) => {
                              const sug = getSubVehicleRecordSuggestions(t, 1)[0];
                              return {
                                tempId: `sub_${Date.now()}_${i}`,
                                titulo: t,
                                cantidadObjetivo: "",
                                tiempoRecordMinPerUnit: sug?.minPerUnit,
                              };
                            })
                          );
                        }}
                        className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: `${GOLD}22`,
                          color: GOLD,
                          border: `1px solid ${GOLD}45`,
                        }}
                        data-testid="jornada4-usar-secuencia"
                      >
                        Usar esta secuencia
                      </button>
                    </div>
                  ) : null}

                  {tipo === "tiempo" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="text-[10px] font-black uppercase tracking-wider"
                          style={{ color: ORANGE }}
                        >
                          Unidades del desglosador
                        </p>
                        <p className="text-[8px]" style={{ color: MUTED }}>
                          Nombre · Cantidad · Récord
                        </p>
                      </div>

                      {subs.filter(s => s.titulo.trim()).length > 1 ? (
                        <div
                          className="grid grid-cols-2 gap-2"
                          data-testid="jornada4-conquista-multi-modo"
                        >
                          {(
                            [
                              {
                                id: "secuencia" as const,
                                label: "Secuencia",
                                hint: "Un desglosador · orden fijo",
                              },
                              {
                                id: "independientes" as const,
                                label: "Independientes",
                                hint: "N misiones · sin secuencia",
                              },
                            ] as const
                          ).map(opt => {
                            const active = conquistaMultiModo === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setConquistaMultiModo(opt.id)}
                                className="p-2.5 rounded-xl border text-left touch-manipulation"
                                style={{
                                  borderColor: active ? `${ORANGE}55` : "rgba(255,255,255,0.1)",
                                  backgroundColor: active
                                    ? "rgba(249,115,22,0.12)"
                                    : "rgba(255,255,255,0.02)",
                                }}
                                data-testid={`jornada4-conquista-multi-${opt.id}`}
                              >
                                <span
                                  className="text-[10px] font-black uppercase"
                                  style={{ color: active ? ORANGE : MUTED }}
                                >
                                  {opt.label}
                                </span>
                                <p className="text-[8px] mt-0.5" style={{ color: MUTED }}>
                                  {opt.hint}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      <div
                        className="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2"
                        style={{
                          borderColor: `${GOLD}35`,
                          backgroundColor: "rgba(212,175,55,0.08)",
                        }}
                        data-testid="jornada4-launch-profundidad"
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: GOLD }}>
                          {desglosadorProfundidadLabel(
                            subs.filter(s => s.titulo.trim()).length
                          )}
                        </span>
                        <span className="text-[11px] font-black font-mono" style={{ color: GOLD }}>
                          {profundidadePs} PS
                        </span>
                      </div>

                      {subs.map((sub, idx) => {
                        const suggestions = getSubVehicleRecordSuggestions(sub.titulo);
                        const unitProj = projectUnitEndLabel(
                          sub.cantidadObjetivo,
                          sub.tiempoRecordMinPerUnit
                        );
                        const showSug = activeSubSugIdx === idx && suggestions.length > 0;
                        return (
                          <div
                            key={sub.tempId}
                            className="rounded-2xl border-2 p-3.5 space-y-3"
                            style={{
                              borderColor: sub.titulo.trim()
                                ? `${ORANGE}45`
                                : "rgba(255,255,255,0.12)",
                              backgroundColor: "rgba(249,115,22,0.06)",
                              boxShadow: sub.titulo.trim()
                                ? `0 0 18px rgba(249,115,22,0.08)`
                                : undefined,
                            }}
                            data-testid={`jornada4-launch-sub-${idx}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
                                  style={{ backgroundColor: `${ORANGE}25`, color: ORANGE }}
                                >
                                  {idx + 1}
                                </span>
                                <span
                                  className="text-[11px] font-black uppercase tracking-wider"
                                  style={{ color: ORANGE }}
                                >
                                  Unidad {idx + 1}
                                </span>
                              </div>
                              {subs.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setSubs(subs.filter((_, i) => i !== idx))}
                                  className="p-2 rounded-lg hover:bg-white/5"
                                  aria-label={`Quitar unidad ${idx + 1}`}
                                >
                                  <Trash2 size={14} style={{ color: MUTED }} />
                                </button>
                              ) : null}
                            </div>

                            <div>
                              <label
                                className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                                style={{ color: INK }}
                              >
                                Nombre de la subtarea
                              </label>
                              <div className="relative">
                                <input
                                  value={sub.titulo}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setSubs(prev =>
                                      prev.map((s, i) =>
                                        i === idx
                                          ? {
                                              ...s,
                                              titulo: val,
                                              tiempoRecordMinPerUnit: undefined,
                                            }
                                          : s
                                      )
                                    );
                                    setActiveSubSugIdx(val.trim().length >= 2 ? idx : null);
                                  }}
                                  onFocus={() => {
                                    if (sub.titulo.trim().length >= 2) setActiveSubSugIdx(idx);
                                  }}
                                  onBlur={() => {
                                    if (sub.titulo.trim().length >= 2 && !sub.tiempoRecordMinPerUnit) {
                                      autofillRecord(idx, sub.titulo);
                                    }
                                    setTimeout(() => setActiveSubSugIdx(null), 150);
                                  }}
                                  placeholder={`Sub-tarea ${idx + 1}…`}
                                  className="w-full p-3.5 rounded-xl bg-black/60 border-2 text-base focus:outline-none"
                                  style={{
                                    color: INK,
                                    borderColor: sub.titulo.trim()
                                      ? ORANGE
                                      : "rgba(255,255,255,0.16)",
                                  }}
                                  data-testid={`jornada4-launch-sub-nombre-${idx}`}
                                />
                                {showSug ? (
                                  <div
                                    className="absolute left-0 right-0 top-full mt-1 z-40 rounded-xl border overflow-hidden max-h-40 overflow-y-auto"
                                    style={{
                                      backgroundColor: "#0f0f0f",
                                      borderColor: `${ORANGE}40`,
                                      boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
                                    }}
                                  >
                                    {suggestions.map((s, si) => (
                                      <button
                                        key={`${s.titulo}-${si}`}
                                        type="button"
                                        onMouseDown={e => {
                                          e.preventDefault();
                                          setSubs(prev =>
                                            prev.map((row, i) =>
                                              i === idx
                                                ? {
                                                    ...row,
                                                    titulo: s.titulo,
                                                    tiempoRecordMinPerUnit: s.minPerUnit,
                                                  }
                                                : row
                                            )
                                          );
                                          setActiveSubSugIdx(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5"
                                      >
                                        <span className="text-sm truncate mr-2" style={{ color: INK }}>
                                          {s.titulo}
                                        </span>
                                        <span
                                          className="text-[10px] font-black shrink-0"
                                          style={{ color: ORANGE }}
                                        >
                                          {s.minPerUnit.toFixed(1)} MIN/U
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label
                                  className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                                  style={{ color: INK }}
                                >
                                  Cantidad (u)
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
                                  className="w-full p-3.5 rounded-xl bg-black/60 border-2 text-lg font-mono font-black text-center focus:outline-none"
                                  style={{
                                    color: INK,
                                    borderColor: sub.cantidadObjetivo
                                      ? ORANGE
                                      : "rgba(255,255,255,0.16)",
                                  }}
                                  aria-label={`Cantidad unidad ${idx + 1}`}
                                  data-testid={`jornada4-launch-sub-cant-${idx}`}
                                />
                              </div>
                              <div>
                                <label
                                  className="text-[10px] font-black uppercase tracking-wider block mb-1.5"
                                  style={{ color: INK }}
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
                                  className="w-full p-3.5 rounded-xl bg-black/60 border-2 text-lg font-mono font-black text-center focus:outline-none"
                                  style={{
                                    color: INK,
                                    borderColor: sub.tiempoRecordMinPerUnit
                                      ? ORANGE
                                      : "rgba(255,255,255,0.16)",
                                  }}
                                  aria-label={`Récord min/u unidad ${idx + 1}`}
                                  data-testid={`jornada4-launch-record-${idx}`}
                                />
                              </div>
                            </div>

                            {unitProj ? (
                              <div
                                className="flex items-center justify-between px-3 py-2 rounded-lg"
                                style={{
                                  backgroundColor: "rgba(212,175,55,0.1)",
                                  border: "1px solid rgba(212,175,55,0.28)",
                                }}
                                data-testid={`jornada4-launch-proj-${idx}`}
                              >
                                <span className="text-[9px] font-mono font-bold" style={{ color: GOLD }}>
                                  ≈{unitProj.projMin} min obj
                                </span>
                                <span
                                  className="text-[11px] font-black font-mono tabular-nums"
                                  style={{ color: CYAN }}
                                >
                                  Fin ≈ {unitProj.finLabel}
                                </span>
                              </div>
                            ) : sub.tiempoRecordMinPerUnit ? (
                              <p className="text-[9px] font-mono font-bold" style={{ color: GOLD }}>
                                Récord: {sub.tiempoRecordMinPerUnit.toFixed(1)} MIN/U — escribe
                                cuántas unidades
                              </p>
                            ) : (
                              <p className="text-[9px]" style={{ color: MUTED }}>
                                Sin récord = primer ciclo (se mide al Cumplido)
                              </p>
                            )}
                            <SegmentoProyectoSelect
                              value={sub.proyectoId ?? ""}
                              onChange={id => {
                                setSubs(prev =>
                                  prev.map((s, i) =>
                                    i === idx
                                      ? { ...s, proyectoId: id || undefined }
                                      : s
                                  )
                                );
                              }}
                              proyectos={proyectosHub}
                              compact
                              label="Dirección de esta unidad"
                              emptyLabel="Heredar del vehículo"
                              hint="Sub ≠ proyecto del segmento → elige aquí."
                              testId={`jornada4-launch-sub-dir-${idx}`}
                              locked={!canProyectos}
                              onBeforeHubNavigate={closeBeforeHubNavigate}
                              onNativePickerOpen={releaseBodyForNativePicker}
                              onNativePickerClose={restoreBodyAfterNativePicker}
                            />
                          </div>
                        );
                      })}

                      {projection ? (
                        <div
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
                          style={{
                            backgroundColor: "rgba(212,175,55,0.1)",
                            border: "1px solid rgba(212,175,55,0.28)",
                          }}
                          data-testid="jornada4-launch-total-estimado"
                        >
                          <span className="text-[9px] font-mono font-black uppercase" style={{ color: GOLD }}>
                            Total estimado
                          </span>
                          <span
                            className="text-[12px] font-black font-mono tabular-nums"
                            style={{ color: GOLD }}
                          >
                            {projection.totalMin} min · Fin ≈ {projection.finLabel}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[9px] text-center" style={{ color: MUTED }}>
                          Completa cantidad + récord en las unidades para ver Fin ≈ hora real
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => setSubs([...subs, makeSub()])}
                        className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        style={{
                          backgroundColor: `${ORANGE}12`,
                          color: ORANGE,
                          border: `1px dashed ${ORANGE}45`,
                        }}
                      >
                        <Plus size={12} /> Añadir unidad
                      </button>
                    </div>
                  ) : tipo === "situacion" && modo === "desglose" ? (
                    <div className="space-y-3">
                      <div>
                        <label
                          className="text-[10px] font-black uppercase tracking-wider mb-1.5 block"
                          style={{ color: GOLD }}
                        >
                          Criterio de cierre
                        </label>
                        <input
                          value={terminoDetalle}
                          onChange={e => setTerminoDetalle(e.target.value)}
                          className="w-full p-3.5 rounded-xl bg-black/50 border-2 text-base focus:outline-none"
                          style={{ color: INK, borderColor: "rgba(255,255,255,0.14)" }}
                        />
                      </div>

                      <div
                        className="rounded-xl border-2 p-3 space-y-2"
                        style={{
                          borderColor: `${CYAN}35`,
                          backgroundColor: "rgba(0,255,195,0.05)",
                        }}
                        data-testid="jornada4-situacion-hora-fin"
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={12} style={{ color: CYAN }} />
                          <label
                            className="text-[10px] font-black uppercase tracking-wider"
                            style={{ color: CYAN }}
                          >
                            Termina a las (meta del ring)
                          </label>
                        </div>
                        <input
                          type="time"
                          value={situacionHoraFin}
                          onChange={e => setSituacionHoraFin(e.target.value)}
                          className="w-full p-3 rounded-xl bg-black/60 border-2 text-lg font-mono font-black tabular-nums focus:outline-none"
                          style={{
                            color: INK,
                            borderColor: situacionMinHasta != null ? CYAN : "#FF313155",
                          }}
                          data-testid="jornada4-launch-hora-fin-situacion"
                        />
                        <p className="text-[9px] font-mono" style={{ color: MUTED }}>
                          {situacionMinHasta != null
                            ? `${situacionMinHasta} min hasta la meta · cupos se reparte al lanzar`
                            : "Elige una hora futura (no minutos ciegos)"}
                        </p>
                      </div>

                      <p
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: FLOTA_CONFIG.situacion.color }}
                      >
                        Filas del ring
                      </p>
                      {filas.map((fila, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex gap-2 items-center">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                              style={{
                                backgroundColor: `${FLOTA_CONFIG.situacion.color}22`,
                                color: FLOTA_CONFIG.situacion.color,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <input
                              value={fila}
                              onChange={e => {
                                const next = [...filas];
                                next[idx] = e.target.value;
                                setFilas(next);
                              }}
                              placeholder={`Fila ${idx + 1}`}
                              className="flex-1 p-3.5 rounded-xl bg-black/50 border-2 text-base focus:outline-none"
                              style={{ color: INK, borderColor: "rgba(255,255,255,0.14)" }}
                            />
                            {filas.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFilas(filas.filter((_, i) => i !== idx));
                                  setFilasProyectoIds(filasProyectoIds.filter((_, i) => i !== idx));
                                }}
                                className="p-2 rounded-lg hover:bg-white/5"
                              >
                                <Trash2 size={14} style={{ color: MUTED }} />
                              </button>
                            ) : null}
                          </div>
                          <SegmentoProyectoSelect
                            value={filasProyectoIds[idx] ?? ""}
                            onChange={id => {
                              setFilasProyectoIds(prev => {
                                const next = [...prev];
                                while (next.length <= idx) next.push("");
                                next[idx] = id;
                                return next;
                              });
                            }}
                            proyectos={proyectosHub}
                            compact
                            label="Dirección de esta fila"
                            emptyLabel="Heredar del vehículo"
                            testId={`jornada4-launch-ring-dir-${idx}`}
                            locked={!canProyectos}
                            onBeforeHubNavigate={closeBeforeHubNavigate}
                            onNativePickerOpen={releaseBodyForNativePicker}
                            onNativePickerClose={restoreBodyAfterNativePicker}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFilas([...filas, ""]);
                          setFilasProyectoIds([...filasProyectoIds, ""]);
                        }}
                        className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        style={{
                          backgroundColor: `${FLOTA_CONFIG.situacion.color}12`,
                          color: FLOTA_CONFIG.situacion.color,
                          border: `1px dashed ${FLOTA_CONFIG.situacion.color}45`,
                        }}
                      >
                        <Plus size={12} /> Añadir fila
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {tipo ? (
              <div
                className="shrink-0 border-t border-white/5 px-4 pt-3"
                style={{
                  paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
                  backgroundColor: PIZARRA,
                }}
              >
                {tipo === "tiempo" && projection ? (
                  <p
                    className="mb-2 text-center text-[10px] font-mono font-black"
                    style={{ color: GOLD }}
                    data-testid="jornada4-launch-cta-proy"
                  >
                    Fin proyectado ≈ {projection.finLabel}
                    {profundidadePs > 0 ? ` · profundidad ${profundidadePs} PS` : ""}
                  </p>
                ) : null}
                {tipo === "tiempo" && !projection && profundidadePs > 0 ? (
                  <p
                    className="mb-2 text-center text-[10px] font-mono font-black"
                    style={{ color: GOLD }}
                    data-testid="jornada4-launch-cta-profundidad"
                  >
                    Profundidad {profundidadePs} PS
                  </p>
                ) : null}
                {!canLaunch ? (
                  <p className="mb-2 text-center text-[9px]" style={{ color: MUTED }}>
                    {tipo === "tiempo"
                      ? conquistaMultiModo === "independientes" &&
                        subs.filter(s => s.titulo.trim()).length > 1
                        ? "Cada unidad necesita nombre + cantidad"
                        : "Misión + unidades (nombre y cantidad)"
                      : modo === "rapido"
                        ? "Escribe al menos una tarea de la lista"
                        : "Escribe misión + filas + hora de término"}
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
                  {saving
                    ? "Lanzando…"
                    : tipo === "tiempo"
                      ? conquistaMultiModo === "independientes" &&
                        subs.filter(s => s.titulo.trim()).length > 1
                        ? "Lanzar independientes"
                        : "Lanzar desglosador"
                      : modo === "rapido"
                        ? "Lanzar lista libre"
                        : "Lanzar ring"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});

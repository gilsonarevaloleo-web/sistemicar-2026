import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle, Clock, Moon, Power, Sun, Volume2, VolumeX, X } from "lucide-react";
import type { Vehicle } from "@/lib/persistence";
import type { PuntoCeroSession } from "@/lib/puntoCeroTypes";
import {
  PUNTO_CERO_ARCOIRIS,
  etapasPuntoCeroVacias,
} from "@/lib/puntoCeroTypes";
import {
  confirmColor,
  faseDuracionesMin,
  getFaseEfectiva,
  getPuntoCeroPasoActual,
  initPuntoCeroSession,
  parsePuntoCeroDuracionMin,
  shouldSuggestPasivaByTime,
  todosColoresConfirmados,
  transitionToPasiva,
} from "@/engines/PuntoCeroEngine";
import { usePuntoCeroOrchestrator } from "@/hooks/usePuntoCeroOrchestrator";
import { usePuntoCeroAudio } from "@/hooks/usePuntoCeroAudio";
import {
  MENSAJE_PASIVA_DIA,
  MENSAJE_PASIVA_NOCHE,
  PUNTO_CERO_ETAPAS_LIST,
  PUNTO_CERO_PASO5,
  PUNTO_CERO_PASOS_UI,
  speakColorInmersion,
  speakEtapaPuntoCero,
  speakPuntoCeroSequence,
  stopPleasantVoice,
} from "@/lib/puntoCeroVoice";
import { unlockPuntoCeroSpeechFromGesture } from "@/lib/puntoCeroVoice";
import { toast } from "sonner";

const PIZARRA = "#0a0a0a";

function PuntoCeroPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function PuntoCeroStepRail({
  ep,
  colores,
  pasoActual,
  flotaColor,
  modo,
}: {
  ep: ReturnType<typeof etapasPuntoCeroVacias>;
  colores: boolean[];
  pasoActual: number;
  flotaColor: string;
  modo: "dia" | "noche";
}) {
  const colorCount = colores.filter(Boolean).length;
  return (
    <div className="space-y-2" data-testid="punto-cero-step-rail">
      <div className="flex items-center gap-1">
        {PUNTO_CERO_PASOS_UI.map(({ n, short }) => {
          const done =
            n <= 3
              ? ep[`etapa${n}` as "etapa1" | "etapa2" | "etapa3"]
              : n === 4
                ? todosColoresConfirmados(colores)
                : pasoActual >= 5;
          const current = pasoActual === n;
          const partial = n === 4 && ep.etapa3 && !done && colorCount > 0;
          return (
            <div key={n} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <div
                className="w-full h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: done
                    ? flotaColor
                    : current || partial
                      ? `${flotaColor}88`
                      : "rgba(255,255,255,0.08)",
                  boxShadow: current ? `0 0 8px ${flotaColor}80` : undefined,
                }}
              />
              <span
                className="text-[6px] font-black uppercase tracking-wider truncate w-full text-center"
                style={{
                  color: current ? flotaColor : done ? `${flotaColor}99` : "rgba(255,255,255,0.35)",
                }}
              >
                {n}. {short}
              </span>
            </div>
          );
        })}
      </div>
      {ep.etapa3 && !todosColoresConfirmados(colores) && (
        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
          {PUNTO_CERO_ARCOIRIS.map(({ color }, idx) => (
            <div
              key={idx}
              className="flex-1 transition-all"
              style={{
                backgroundColor: colores[idx] ? color : `${color}35`,
                opacity: colores[idx] ? 1 : pasoActual === 4 && !colores[idx] && colores.slice(0, idx).every(Boolean) ? 1 : 0.55,
                boxShadow: pasoActual === 4 && !colores[idx] && colores.slice(0, idx).every(Boolean) ? `0 0 6px ${color}` : undefined,
              }}
            />
          ))}
        </div>
      )}
      {pasoActual < 5 && (
        <p className="text-[7px] text-center leading-snug" style={{ color: modo === "noche" ? "#a5b4fc" : "#94a3b8" }}>
          Después del paso 4 viene el <span className="font-bold" style={{ color: flotaColor }}>paso 5</span>:{" "}
          {modo === "noche" ? PUNTO_CERO_PASO5.labelNoche : PUNTO_CERO_PASO5.labelDia} — el más profundo para{" "}
          {modo === "noche" ? "dormir" : "soltar"}.
        </p>
      )}
    </div>
  );
}

function PuntoCeroAudioControls({
  vehicleId,
  muted,
  volume,
  unlocked,
  flotaColor,
  onToggle,
  onVolumeChange,
  dark = false,
  compact = false,
}: {
  vehicleId: string;
  muted: boolean;
  volume: number;
  unlocked: boolean;
  flotaColor: string;
  onToggle: () => void;
  onVolumeChange: (pct: number) => void;
  dark?: boolean;
  compact?: boolean;
}) {
  const label = muted ? "Off" : unlocked ? "On" : "Activar";
  const trackColor = dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)";
  const accent = muted ? (dark ? "rgba(255,255,255,0.25)" : "#64748b") : flotaColor;

  return (
    <div
      className={`flex items-center gap-1.5 ${compact ? "flex-col items-stretch" : "flex-wrap"}`}
      onClick={e => e.stopPropagation()}
      data-testid={`punto-cero-audio-controls-${vehicleId}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all flex-shrink-0"
        style={{
          backgroundColor: muted
            ? "rgba(255,255,255,0.04)"
            : unlocked
              ? `${flotaColor}18`
              : "rgba(255,255,255,0.06)",
          borderColor: muted
            ? "rgba(255,255,255,0.12)"
            : unlocked
              ? `${flotaColor}55`
              : "rgba(255,255,255,0.15)",
          color: muted ? (dark ? "rgba(255,255,255,0.35)" : "#64748b") : unlocked ? flotaColor : (dark ? "rgba(255,255,255,0.5)" : "#94a3b8"),
        }}
        title={muted ? "Activar audio" : "Silenciar audio"}
        data-testid={`punto-cero-audio-toggle-${vehicleId}`}
      >
        {muted || volume <= 0 ? <VolumeX size={10} /> : <Volume2 size={10} />}
        <span className="text-[7px] font-bold uppercase tracking-wide">{label}</span>
      </button>
      <div className={`flex items-center gap-1.5 min-w-0 ${compact ? "w-full" : "flex-1"}`}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={muted ? 0 : volume}
          onChange={e => onVolumeChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer min-w-[4.5rem]"
          style={{
            accentColor: accent,
            background: `linear-gradient(to right, ${accent} ${muted ? 0 : volume}%, ${trackColor} ${muted ? 0 : volume}%)`,
          }}
          title="Volumen Punto Cero"
          data-testid={`punto-cero-audio-volume-${vehicleId}`}
        />
        <span
          className="text-[7px] font-mono font-bold tabular-nums w-7 text-right flex-shrink-0"
          style={{ color: dark ? "rgba(255,255,255,0.35)" : "#64748b" }}
        >
          {muted ? "0" : volume}%
        </span>
      </div>
    </div>
  );
}

function PuntoCeroSalirButton({
  vehicleId,
  onClick,
  dark = false,
}: {
  vehicleId: string;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="fixed top-4 right-4 z-[260] flex items-center gap-1.5 min-h-[3rem] px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.14em] border backdrop-blur-md transition-transform active:scale-[0.98] touch-manipulation"
      style={{
        backgroundColor: dark ? "rgba(0,0,0,0.55)" : "rgba(10,10,10,0.92)",
        borderColor: dark ? "rgba(255,255,255,0.22)" : "rgba(212,175,55,0.45)",
        color: dark ? "rgba(255,255,255,0.85)" : "#D4AF37",
        boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.45)" : "0 8px 24px rgba(0,0,0,0.35)",
      }}
      data-testid={`punto-cero-salir-${vehicleId}`}
    >
      <X size={14} />
      Salir
    </button>
  );
}

function PuntoCeroCloseButton({
  vehicleId,
  flotaColor,
  onClick,
  dark = false,
  label = "Cerrar sesión",
}: {
  vehicleId: string;
  flotaColor: string;
  onClick: () => void;
  dark?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center gap-1.5 w-full min-h-[3rem] px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.14em] border transition-transform active:scale-[0.98] touch-manipulation"
      style={{
        backgroundColor: dark ? "rgba(255,255,255,0.06)" : `${flotaColor}12`,
        borderColor: dark ? "rgba(255,255,255,0.18)" : `${flotaColor}45`,
        color: dark ? "rgba(255,255,255,0.55)" : flotaColor,
      }}
      data-testid={`punto-cero-cerrar-${vehicleId}`}
    >
      <Power size={12} />
      {label}
    </button>
  );
}

export type PuntoCeroPanelProps = {
  vehicle: Vehicle;
  flotaColor: string;
  showMicroPasos: boolean;
  showDescansoReloj: boolean;
  onToggleReloj: () => void;
  onEtapaToggle: (vehicleId: string, etapa: "etapa1" | "etapa2" | "etapa3" | "etapa4") => void;
  onColorConfirm: (vehicleId: string, idx: number, session: PuntoCeroSession) => void;
  onSessionPersist: (vehicleId: string, session: PuntoCeroSession) => void;
  onAutoClose: (vehicleId: string) => void;
  onConfirmManualClose: (
    vehicleId: string,
    etiqueta: "recuperado" | "parcial" | "fragmentado",
    nota: string
  ) => void;
};

export function PuntoCeroPanel({
  vehicle,
  flotaColor,
  showMicroPasos,
  showDescansoReloj,
  onToggleReloj,
  onEtapaToggle,
  onColorConfirm,
  onSessionPersist,
  onAutoClose,
  onConfirmManualClose,
}: PuntoCeroPanelProps) {
  const [closeFlow, setCloseFlow] = useState(false);
  const [etiquetaLocal, setEtiquetaLocal] = useState<"recuperado" | "parcial" | "fragmentado" | null>(null);
  const [notaLocal, setNotaLocal] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const session = vehicle.puntoCero;
  const ep = vehicle.etapasPuntoCero ?? etapasPuntoCeroVacias();
  const colores = session?.coloresConfirmados ?? Array(7).fill(false);
  const fase = session ? getFaseEfectiva(session, Date.now(), colores) : "activa";
  const enPasiva = fase === "pasiva" || fase === "completada";
  const enCompletada = fase === "completada";

  const [colorInmersion, setColorInmersion] = useState<{ color: string; zona: string; idx: number } | null>(null);
  const [inmersionCount, setInmersionCount] = useState(3);
  const primeraGuiaVozRef = useRef(true);

  const primerAccionMs = vehicle.primerAccionAt;
  const aperturaMs = vehicle.aperturaAt || Date.now();
  const eficienciaSec = primerAccionMs ? Math.round((primerAccionMs - aperturaMs) / 1000) : null;

  const handleSessionUpdate = useCallback(
    (next: PuntoCeroSession) => {
      onSessionPersist(vehicle.id, next);
    },
    [onSessionPersist, vehicle.id]
  );

  const confirmColorInmersion = useCallback(
    (idx: number) => {
      if (!session) return;
      const nextSession = confirmColor(session, idx);
      onColorConfirm(vehicle.id, idx, nextSession);
      if (todosColoresConfirmados(nextSession.coloresConfirmados)) {
        onSessionPersist(vehicle.id, transitionToPasiva(nextSession, Date.now()));
      }
      setColorInmersion(null);
    },
    [onColorConfirm, onSessionPersist, session, vehicle.id]
  );

  const audioEnabled = vehicle.status === "activo" && !!session;
  const puntoCeroAudio = usePuntoCeroAudio(audioEnabled, session?.modo, fase);

  const stopPuntoCeroMedia = useCallback(() => {
    stopPleasantVoice();
    puntoCeroAudio.stopAll();
  }, [puntoCeroAudio]);

  const openCloseFlow = useCallback(() => {
    stopPuntoCeroMedia();
    setCloseFlow(true);
  }, [stopPuntoCeroMedia]);

  const enterPasivaManual = useCallback(() => {
    if (!session || enPasiva) return;
    stopPuntoCeroMedia();
    onSessionPersist(vehicle.id, transitionToPasiva(session, Date.now()));
  }, [enPasiva, onSessionPersist, session, stopPuntoCeroMedia, vehicle.id]);

  useEffect(() => {
    if (!session || enPasiva || enCompletada) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [enCompletada, enPasiva, session]);

  const suggestPasivaManual =
    !!session && !enPasiva && shouldSuggestPasivaByTime(session, nowTick, colores);

  const orchestratorActive =
    vehicle.status === "activo" && !!session && session.fase !== "completada";

  usePuntoCeroOrchestrator(session, orchestratorActive, {
    onSessionUpdate: handleSessionUpdate,
    onAutoClose: () => {
      /* El operador cierra manualmente — no auto-archivar al completar. */
    },
    onEnterPasiva: () => {
      if (session?.modo === "dia") {
        speakPuntoCeroSequence(MENSAJE_PASIVA_DIA, "day");
      } else {
        speakPuntoCeroSequence(MENSAJE_PASIVA_NOCHE, "night");
      }
    },
    onCompletada: msg => {
      void puntoCeroAudio.onCompletada(session?.modo ?? "dia");
      toast.success(msg, {
        style: { backgroundColor: PIZARRA, border: `1px solid ${flotaColor}`, color: flotaColor },
        duration: session?.modo === "noche" ? 3000 : 5000,
      });
    },
  });

  const sessionInitAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (vehicle.status !== "activo" || vehicle.tipoDescanso !== "punto_cero" || session) return;
    if (sessionInitAttemptRef.current === vehicle.id) return;
    sessionInitAttemptRef.current = vehicle.id;
    onSessionPersist(
      vehicle.id,
      initPuntoCeroSession("dia", parsePuntoCeroDuracionMin(vehicle.criterioDetalle), vehicle.aperturaAt ?? Date.now())
    );
  }, [vehicle.id, vehicle.status, vehicle.tipoDescanso, vehicle.criterioDetalle, vehicle.aperturaAt, session, onSessionPersist]);

  useEffect(() => {
    if (!colorInmersion) return;
    void puntoCeroAudio.playSolfeggio(PUNTO_CERO_ARCOIRIS[colorInmersion.idx]!.solfeggioHz);
    setInmersionCount(3);
    const iv = setInterval(() => setInmersionCount(c => (c > 1 ? c - 1 : c)), 1000);
    const to = setTimeout(() => confirmColorInmersion(colorInmersion.idx), 3000);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [colorInmersion, confirmColorInmersion, puntoCeroAudio]);

  const epCompletados = [ep.etapa1, ep.etapa2, ep.etapa3, ep.etapa4].filter(Boolean).length;
  const coronaCompletada = todosColoresConfirmados(colores);
  const pasoInfo = session
    ? getPuntoCeroPasoActual(ep, colores, fase, session.modo)
    : { paso: 1 as const, titulo: "Punto Cero", subtitulo: "Iniciando…" };
  const nextColorIdx = colores.findIndex(c => !c);
  const { activaMin, pasivaMin } = session
    ? faseDuracionesMin(session.duracionTotalMin)
    : { activaMin: 5, pasivaMin: 10 };

  const etapasCfg = PUNTO_CERO_ETAPAS_LIST.map(({ key, label, instruccion }) => ({
    key,
    label,
    instruccion,
  }));

  const closeEtiquetaOverlay = closeFlow ? (
    <PuntoCeroPortal>
    <div
      className="fixed inset-0 z-[270] flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      data-testid={`punto-cero-cierre-${vehicle.id}`}
      onClick={() => {
        setCloseFlow(false);
        setEtiquetaLocal(null);
        setNotaLocal("");
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-4 space-y-3"
        style={{ backgroundColor: PIZARRA, borderColor: `${flotaColor}35` }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-center" style={{ color: flotaColor }}>
          ¿Cómo saliste del Punto Cero?
        </p>
        <p className="text-[8px] text-slate-500 text-center leading-relaxed">
          Podés salir en cualquier momento. Las etapas completadas ya sumaron PS.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "recuperado" as const, label: "RECUPERADO", color: "#10b981" },
            { key: "parcial" as const, label: "PARCIAL", color: "#f59e0b" },
            { key: "fragmentado" as const, label: "FRAGMENTADO", color: "#ef4444" },
          ]).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setEtiquetaLocal(opt.key)}
              className="p-2 rounded-xl border text-center transition-all"
              style={{
                backgroundColor: etiquetaLocal === opt.key ? `${opt.color}20` : "rgba(255,255,255,0.03)",
                borderColor: etiquetaLocal === opt.key ? opt.color : "rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-[8px] font-black" style={{ color: etiquetaLocal === opt.key ? opt.color : "#64748b" }}>
                {opt.label}
              </p>
            </button>
          ))}
        </div>
        <input
          value={notaLocal}
          onChange={e => setNotaLocal(e.target.value.slice(0, 80))}
          placeholder="Nota opcional"
          className="w-full bg-black/30 text-white text-[9px] p-2 rounded-lg border border-white/10 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!etiquetaLocal}
            onClick={() => {
              if (!etiquetaLocal) return;
              stopPuntoCeroMedia();
              onConfirmManualClose(vehicle.id, etiquetaLocal, notaLocal);
              setCloseFlow(false);
              setEtiquetaLocal(null);
              setNotaLocal("");
            }}
            className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase disabled:opacity-40"
            style={{ backgroundColor: flotaColor, color: "#000" }}
          >
            Cerrar vehículo
          </button>
          <button
            type="button"
            onClick={() => {
              setCloseFlow(false);
              setEtiquetaLocal(null);
              setNotaLocal("");
            }}
            className="px-3 py-2 rounded-lg text-slate-500 bg-white/5 text-[9px]"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
    </PuntoCeroPortal>
  ) : null;

  if (enPasiva && session) {
    return (
      <>
        {closeEtiquetaOverlay}
        <PuntoCeroPortal>
        {!closeFlow && (
          <>
            <PuntoCeroSalirButton vehicleId={vehicle.id} dark onClick={openCloseFlow} />
            <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[260] max-w-xs mx-auto pointer-events-none">
              <div className="pointer-events-auto">
                <PuntoCeroCloseButton
                  vehicleId={vehicle.id}
                  flotaColor={flotaColor}
                  dark
                  label={enCompletada ? "Cerrar y retomar jornada" : "Terminar y cerrar"}
                  onClick={openCloseFlow}
                />
              </div>
            </div>
          </>
        )}
        <div
          className="fixed inset-0 z-[250] flex flex-col items-center justify-center px-6 pb-24"
          style={{ backgroundColor: "#000000" }}
          data-testid={`punto-cero-pasiva-${vehicle.id}`}
        >
          <div className="absolute top-4 left-4 max-w-[14rem]">
            <PuntoCeroAudioControls
              vehicleId={vehicle.id}
              muted={puntoCeroAudio.muted}
              volume={puntoCeroAudio.volume}
              unlocked={puntoCeroAudio.unlocked}
              flotaColor={flotaColor}
              onToggle={() => void puntoCeroAudio.toggleMute()}
              onVolumeChange={pct => void puntoCeroAudio.setVolume(pct)}
              dark
              compact
            />
          </div>
          <div className="max-w-xs text-center space-y-4">
            {session.modo === "dia" ? (
              <Sun size={20} className="mx-auto text-amber-400/40" />
            ) : (
              <Moon size={20} className="mx-auto text-indigo-400/30" />
            )}
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">
              Paso 5 · {session.modo === "dia" ? "Ancla del alivio" : "Apagón nocturno"}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: flotaColor }}>
              {session.modo === "noche" ? PUNTO_CERO_PASO5.labelNoche : PUNTO_CERO_PASO5.labelDia}
            </p>
            <p className="text-sm text-white/50 leading-relaxed font-light">
              {session.modo === "dia"
                ? PUNTO_CERO_PASO5.instruccionDia
                : PUNTO_CERO_PASO5.instruccionNoche}
            </p>
            {!enCompletada && (
              <p className="text-[9px] text-white/20 font-mono">
                Fase pasiva · {pasivaMin} min · {session.modo === "dia" ? "ondas theta" : "ondas delta"}
              </p>
            )}
            {enCompletada && (
              <p className="text-[10px] font-bold pt-2" style={{ color: flotaColor }}>
                Bloque completado — salí cuando quieras retomar
              </p>
            )}
          </div>
        </div>
        </PuntoCeroPortal>
      </>
    );
  }

  return (
    <>
      {closeEtiquetaOverlay}
      <PuntoCeroPortal>
      {!closeFlow && !colorInmersion && (
        <PuntoCeroSalirButton vehicleId={vehicle.id} onClick={openCloseFlow} />
      )}
      <AnimatePresence>
        {colorInmersion && (
          <motion.div
            key="color-inmersion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            transition={{ duration: 0.25 }}
            onClick={() => confirmColorInmersion(colorInmersion.idx)}
            className="fixed inset-0 z-[255] flex flex-col items-center justify-center"
            style={{ backgroundColor: `${colorInmersion.color}E0`, cursor: "pointer" }}
            data-testid={`overlay-inmersion-${vehicle.id}`}
          >
            {!closeFlow && (
              <PuntoCeroSalirButton
                vehicleId={vehicle.id}
                dark
                onClick={() => {
                  setColorInmersion(null);
                  openCloseFlow();
                }}
              />
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setColorInmersion(null);
              }}
              className="absolute top-4 left-4 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border border-white/25 text-white/70 bg-black/20 z-[211]"
              data-testid={`overlay-inmersion-cancel-${vehicle.id}`}
            >
              Volver
            </button>
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center gap-6 select-none"
            >
              <div className="w-32 h-32 rounded-full" style={{ backgroundColor: colorInmersion.color, boxShadow: `0 0 60px ${colorInmersion.color}, 0 0 120px ${colorInmersion.color}80` }} />
              <p className="text-5xl font-black uppercase tracking-widest text-white" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)", fontFamily: "Playfair Display, serif" }}>{colorInmersion.zona.toUpperCase()}</p>
              <p className="text-sm text-white/60 uppercase tracking-[0.25em]">Inhálalo · Introdúcelo a su zona</p>
              <motion.p
                key={inmersionCount}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-4xl font-black text-white/80 tabular-nums"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)", fontFamily: "Playfair Display, serif" }}
              >
                {inmersionCount}
              </motion.p>
              <p className="text-xs text-white/30">Toca para continuar</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </PuntoCeroPortal>

      <div className="space-y-2" data-testid={`descanso-msg-${vehicle.id}`}>
        <div className="p-3 rounded-xl border" style={{ backgroundColor: `${flotaColor}08`, borderColor: `${flotaColor}30` }}>
          <div
            className="mb-2.5 p-2.5 rounded-xl border"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", borderColor: `${flotaColor}40` }}
            data-testid={`punto-cero-paso-actual-${vehicle.id}`}
          >
            <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: flotaColor }}>
              Paso {pasoInfo.paso} de 5
            </p>
            <p className="text-[11px] font-bold text-white mt-0.5">{pasoInfo.titulo}</p>
            <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">{pasoInfo.subtitulo}</p>
            {session && (
              <div className="mt-2">
                <PuntoCeroStepRail
                  ep={ep}
                  colores={colores}
                  pasoActual={pasoInfo.paso}
                  flotaColor={flotaColor}
                  modo={session.modo}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Circle size={14} style={{ color: flotaColor }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: flotaColor }}>PUNTO CERO</span>
            {session && (
              <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: session.modo === "dia" ? "rgba(251,191,36,0.15)" : "rgba(99,102,241,0.15)", color: session.modo === "dia" ? "#fbbf24" : "#a5b4fc" }}>
                {session.modo === "dia" ? "Recarga operativa" : "Apagón nocturno"}
              </span>
            )}
            <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${flotaColor}15`, color: flotaColor }}>{epCompletados}/4 PS</span>
            <button type="button" onClick={onToggleReloj} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all" style={{ backgroundColor: showDescansoReloj ? `${flotaColor}20` : "transparent", borderColor: showDescansoReloj ? flotaColor : "rgba(255,255,255,0.15)", color: showDescansoReloj ? flotaColor : "#64748b" }} data-testid={`toggle-reloj-descanso-${vehicle.id}`}>
              <Clock size={10} />
            </button>
          </div>
          <div className="mb-1.5">
            <PuntoCeroAudioControls
              vehicleId={vehicle.id}
              muted={puntoCeroAudio.muted}
              volume={puntoCeroAudio.volume}
              unlocked={puntoCeroAudio.unlocked}
              flotaColor={flotaColor}
              onToggle={() => void puntoCeroAudio.toggleMute()}
              onVolumeChange={pct => void puntoCeroAudio.setVolume(pct)}
            />
          </div>
          <p className="text-[9px] text-slate-500 italic">
            Polo Neutro · Fase activa ~{activaMin} min · ondas alfa
            {showDescansoReloj ? " · Reloj activo" : " · Reloj oculto"}
          </p>
          <p className="text-[7px] text-slate-600 mt-0.5">
            {puntoCeroAudio.muted || puntoCeroAudio.volume <= 0
              ? "Audio silenciado — subí el volumen o activá On · voz guía al tocar etapas"
              : puntoCeroAudio.unlocked
                ? `Audio ${puntoCeroAudio.volume}% · auriculares recomendados · voz guía lee el protocolo completo`
                : "Tocá una etapa para iniciar audio y escuchar el protocolo paso a paso"}
          </p>
          {eficienciaSec !== null && (
            <p className="text-[8px] mt-1" style={{ color: flotaColor }}>⚡ Primera etapa: {eficienciaSec < 60 ? `${eficienciaSec}s` : `${Math.round(eficienciaSec / 60)}m`} desde apertura</p>
          )}
          <div className="mt-2 space-y-2">
            <PuntoCeroCloseButton
              vehicleId={vehicle.id}
              flotaColor={flotaColor}
              label="Terminar Punto Cero"
              onClick={openCloseFlow}
            />
            {suggestPasivaManual && (
              <button
                type="button"
                onClick={enterPasivaManual}
                className="w-full min-h-[2.75rem] px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all"
                style={{
                  backgroundColor: "rgba(99,102,241,0.12)",
                  borderColor: "rgba(99,102,241,0.35)",
                  color: session?.modo === "noche" ? "#a5b4fc" : flotaColor,
                }}
                data-testid={`punto-cero-pasiva-manual-${vehicle.id}`}
              >
                Ir al paso 5 · {session?.modo === "noche" ? "Apagón / sueño" : "Silencio profundo"}
              </button>
            )}
            {coronaCompletada && !enPasiva && (
              <button
                type="button"
                onClick={enterPasivaManual}
                className="w-full min-h-[2.75rem] px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all"
                style={{
                  backgroundColor: `${flotaColor}18`,
                  borderColor: flotaColor,
                  color: flotaColor,
                  boxShadow: `0 0 16px ${flotaColor}25`,
                }}
                data-testid={`punto-cero-paso5-cta-${vehicle.id}`}
              >
                Entrar al paso 5 · {session?.modo === "noche" ? PUNTO_CERO_PASO5.labelNoche : PUNTO_CERO_PASO5.labelDia}
              </button>
            )}
          </div>
        </div>

        {showMicroPasos ? (
          <div className="space-y-1.5">
            {etapasCfg.map(({ key, label, instruccion }) => {
              const checked = ep[key];
              const isColorEtapa = key === "etapa4";
              const colorCount = colores.filter(Boolean).length;
              const prevRequired = key === "etapa2" ? !ep.etapa1 : key === "etapa3" ? !ep.etapa2 : key === "etapa4" ? !ep.etapa3 : false;
              const isLocked = !checked && prevRequired;
              const pasoNum = key === "etapa1" ? 1 : key === "etapa2" ? 2 : key === "etapa3" ? 3 : 4;
              const isCurrent = !checked && pasoInfo.paso === pasoNum;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onPointerDown={() => {
                      if (checked || isLocked || isColorEtapa) return;
                      unlockPuntoCeroSpeechFromGesture();
                    }}
                    onClick={() => {
                      if (checked || isLocked || isColorEtapa) return;
                      void puntoCeroAudio.unlockAudio();
                      unlockPuntoCeroSpeechFromGesture();
                      const intro = primeraGuiaVozRef.current;
                      if (intro) primeraGuiaVozRef.current = false;
                      try {
                        speakEtapaPuntoCero(key, {
                          intro,
                          transicionEtapa4: key === "etapa3",
                        });
                      } catch (e) {
                        console.warn("[PuntoCeroPanel] speakEtapaPuntoCero", e);
                      }
                      onEtapaToggle(vehicle.id, key);
                    }}
                    disabled={checked || isLocked || isColorEtapa}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl border transition-all text-left"
                    style={{
                      backgroundColor: checked ? `${flotaColor}10` : isCurrent ? `${flotaColor}14` : "rgba(255,255,255,0.03)",
                      borderColor: checked ? flotaColor : isCurrent ? flotaColor : isLocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                      boxShadow: isCurrent ? `0 0 14px ${flotaColor}30` : undefined,
                      cursor: (checked || isLocked || isColorEtapa) ? "default" : "pointer",
                      opacity: isLocked ? 0.4 : 1,
                    }}
                    data-testid={`etapa-pc-${key}-${vehicle.id}`}
                  >
                    <div className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5" style={{ borderColor: checked || isCurrent ? flotaColor : "rgba(255,255,255,0.2)", backgroundColor: checked || isCurrent ? `${flotaColor}20` : "transparent" }}>
                      {checked ? <Check size={9} style={{ color: flotaColor }} /> : <span className="text-[7px] font-black" style={{ color: isCurrent ? flotaColor : "#64748b" }}>{pasoNum}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold" style={{ color: checked || isCurrent ? flotaColor : "#64748b" }}>
                        {isCurrent ? "▶ " : ""}{label}
                      </p>
                      <p className="text-[8px] text-slate-600 mt-0.5">{instruccion}</p>
                    </div>
                    {checked
                      ? <span className="text-[8px] font-bold flex-shrink-0" style={{ color: flotaColor }}>+1 PS</span>
                      : isColorEtapa && ep.etapa3
                        ? <span className="text-[8px] flex-shrink-0" style={{ color: coronaCompletada ? flotaColor : "#64748b" }}>{colorCount}/7</span>
                        : <span className="text-[8px] text-slate-600 flex-shrink-0">activar</span>
                    }
                  </button>
                  {isColorEtapa && !checked && ep.etapa3 && (
                    <div className="mt-2 px-1 space-y-2">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-center" style={{ color: flotaColor }}>
                        Paso 4 · Tocá cada color en orden · {colorCount}/7
                      </p>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {PUNTO_CERO_ARCOIRIS.map(({ color, zona }, idx) => {
                        const confirmado = colores[idx];
                        const esSiguiente = idx === nextColorIdx && !confirmado;
                        return (
                          <button
                            key={zona}
                            type="button"
                            onPointerDown={e => {
                              e.stopPropagation();
                              if (!confirmado && session) unlockPuntoCeroSpeechFromGesture();
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              if (!confirmado && session) {
                                void puntoCeroAudio.unlockAudio();
                                unlockPuntoCeroSpeechFromGesture();
                                speakColorInmersion(zona, idx);
                                setColorInmersion({ color, zona, idx });
                              }
                            }}
                            disabled={confirmado || !session}
                            className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all"
                            style={{
                              backgroundColor: confirmado ? `${color}30` : `${color}18`,
                              borderColor: confirmado ? color : esSiguiente ? "#fff" : `${color}55`,
                              cursor: confirmado ? "default" : "pointer",
                              boxShadow: confirmado
                                ? `0 0 14px ${color}60`
                                : esSiguiente
                                  ? `0 0 18px ${color}, 0 0 6px #fff`
                                  : `0 0 6px ${color}35`,
                              transform: esSiguiente ? "scale(1.04)" : undefined,
                            }}
                            data-testid={`color-pc-${idx}-${vehicle.id}`}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: confirmado ? color : color,
                                opacity: confirmado ? 1 : 0.85,
                                boxShadow: confirmado ? `0 0 12px ${color}` : `inset 0 0 0 3px rgba(0,0,0,0.25)`,
                              }}
                            >
                              {confirmado ? <Check size={14} color="#fff" /> : <span className="text-[9px] font-black text-white/90">{idx + 1}</span>}
                            </div>
                            <span className="text-[7px] font-bold text-center leading-tight" style={{ color: confirmado ? color : "#fff" }}>{zona}</span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  {isColorEtapa && checked && (
                    <div className="flex gap-1 flex-wrap mt-1.5 px-1">
                      {PUNTO_CERO_ARCOIRIS.map(({ color, zona }) => (
                        <span key={zona} className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>✓ {zona}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div
              className="p-3 rounded-xl border mt-2"
              style={{
                backgroundColor: pasoInfo.paso >= 5 ? `${flotaColor}12` : "rgba(99,102,241,0.06)",
                borderColor: pasoInfo.paso >= 5 ? flotaColor : "rgba(99,102,241,0.25)",
                opacity: ep.etapa3 ? 1 : 0.55,
              }}
              data-testid={`punto-cero-paso5-preview-${vehicle.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Moon size={12} style={{ color: session?.modo === "noche" ? "#a5b4fc" : flotaColor }} />
                <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: session?.modo === "noche" ? "#a5b4fc" : flotaColor }}>
                  Paso 5 · {session?.modo === "noche" ? PUNTO_CERO_PASO5.labelNoche : PUNTO_CERO_PASO5.labelDia}
                </p>
                {!ep.etapa3 && <span className="text-[7px] text-slate-600 ml-auto">después del paso 4</span>}
              </div>
              <p className="text-[8px] text-slate-500 leading-snug">
                {session?.modo === "noche" ? PUNTO_CERO_PASO5.instruccionNoche : PUNTO_CERO_PASO5.instruccionDia}
              </p>
              <p className="text-[7px] text-slate-600 mt-1">
                No suma PS · es el paso más profundo · pantalla negra + ondas {session?.modo === "noche" ? "delta (sueño)" : "theta (alivio)"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[8px] text-center text-slate-600">Cargando etapas del protocolo…</p>
        )}
      </div>
    </>
  );
}

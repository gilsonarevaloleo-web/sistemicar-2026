import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ESPEJO_V2_ENTRY_PROMPT,
  ESPEJO_V2_PHASES,
  frictionLabel as buildFrictionLabel,
  type EspejoV2CodigoId,
  type EspejoV2PhaseId,
  type FrictionLevel,
} from "@shared/espejoV2";
import TerminalConsole from "@/components/espejo/TerminalConsole";

type Screen = "entrada" | "proceso" | "cierre";

interface SessionState {
  codigo: EspejoV2CodigoId;
  frecuencia: string;
  puntoCorporal: string;
  phaseId: EspejoV2PhaseId;
  phaseIndex: number;
  friction: FrictionLevel;
  density: number;
  prompt: string;
  queja: string;
}

interface TurnLog {
  codigo: string;
  phaseId: string;
  phaseLabel?: string;
  respuesta: string;
  refraction?: boolean;
  accionMinima?: string | null;
  accionMaxima?: string | null;
}

interface MandateState {
  accionMinima: string;
  accionMaxima: string;
  gobernador: string;
  frecuencia: string;
  leyFriccion?: string | null;
}

const HEADER = "PROC-ESPEJO // SISTEMICAR V2";

const phaseMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function EspejoV2() {
  const [screen, setScreen] = useState<Screen>("entrada");
  const [queja, setQueja] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [accionMinima, setAccionMinima] = useState("");
  const [accionMaxima, setAccionMaxima] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [log, setLog] = useState<TurnLog[]>([]);
  const [interruptBanner, setInterruptBanner] = useState<string | null>(null);
  const [mandate, setMandate] = useState<MandateState | null>(null);
  const [devolucion, setDevolucion] = useState<string | null>(null);
  const [senales, setSenales] = useState<string[]>([]);
  const [reasoningSource, setReasoningSource] = useState<string | null>(null);

  const frictionText = useMemo(() => {
    if (!session) return buildFrictionLabel(1);
    return buildFrictionLabel(session.friction);
  }, [session]);

  const isPoloPositivo =
    session?.phaseId === "seriedad" || session?.phaseId === "gobernador";

  async function clasificar() {
    setError(null);
    setLoading(true);
    setInterruptBanner(null);
    try {
      const res = await fetch("/api/espejo-v2/clasificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: queja }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo clasificar");

      const seed = data.sessionSeed;
      setSession({
        codigo: seed.codigo,
        frecuencia: seed.frecuencia,
        puntoCorporal: seed.puntoCorporal,
        phaseId: seed.phaseId,
        phaseIndex: seed.phaseIndex,
        friction: seed.friction,
        density: seed.density,
        prompt: seed.prompt,
        queja,
      });
      setRespuesta("");
      setAccionMinima("");
      setAccionMaxima("");
      setLog([]);
      setMandate(null);
      setDevolucion(null);
      setSenales([]);
      setReasoningSource(null);
      setScreen("proceso");
    } catch (e: any) {
      setError(e.message || "Error de clasificación");
    } finally {
      setLoading(false);
    }
  }

  async function enviarFase() {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/espejo-v2/fase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: session.codigo,
          phaseId: session.phaseId,
          respuesta,
          friction: session.friction,
          queja: session.queja,
          historial: log.map((t) => ({
            phaseId: t.phaseId,
            phaseLabel: t.phaseLabel,
            respuesta: t.respuesta,
          })),
          accionMinima: accionMinima || undefined,
          accionMaxima: accionMaxima || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo procesar la fase");

      setLog((prev) => [
        ...prev,
        {
          codigo: data.recorded.codigo,
          phaseId: data.recorded.phaseId,
          phaseLabel: data.recorded.phaseLabel,
          respuesta,
          refraction: data.refraction?.detected,
          accionMinima: data.recorded.accionMinima,
          accionMaxima: data.recorded.accionMaxima,
        },
      ]);

      if (data.refraction?.detected) {
        setInterruptBanner(
          data.refraction.banner ||
            `[INTERRUPCIÓN DE PROTOCOLO: REFRACCIÓN DETECTADA]\nSe ha reencuadrado la frecuencia al CÓDIGO ${data.refraction.codigoSalto}.`,
        );
      } else {
        setInterruptBanner(null);
      }

      if (data.reasoning) {
        setDevolucion(data.reasoning.devolucion || data.next?.devolucion || null);
        setSenales(Array.isArray(data.reasoning.senales) ? data.reasoning.senales : []);
        setReasoningSource(data.reasoning.source || null);
      } else {
        setDevolucion(data.next?.devolucion || null);
        setSenales([]);
        setReasoningSource(null);
      }

      if (data.next.mandate) {
        setMandate({
          accionMinima:
            data.next.mandate.accionMinima ||
            accionMinima ||
            data.next.mandate.accionMinimaHint,
          accionMaxima:
            data.next.mandate.accionMaxima ||
            accionMaxima ||
            data.next.mandate.accionMaximaHint,
          gobernador: data.next.mandate.gobernador,
          frecuencia: data.next.mandate.frecuencia,
          leyFriccion: data.next.mandate.leyFriccion,
        });
      }

      if (data.next.completed) {
        setSession({
          ...session,
          codigo: data.next.codigo,
          frecuencia: data.next.frecuencia,
          friction: data.next.friction,
          density: 100,
          phaseId: "gobernador",
          phaseIndex: 5,
          prompt: data.next.mandate?.gobernador || session.prompt,
        });
        setScreen("cierre");
        setRespuesta("");
        return;
      }

      setSession({
        ...session,
        codigo: data.next.codigo,
        frecuencia: data.next.frecuencia,
        phaseId: data.next.phaseId,
        phaseIndex: data.next.phaseIndex,
        friction: data.next.friction,
        density: data.next.density,
        // En pantalla mostramos la pregunta; la devolución va en panel aparte.
        prompt: data.reasoning?.pregunta || data.next.prompt,
      });
      setRespuesta("");
      if (data.next.phaseId !== "seriedad") {
        // keep acciones if jumping via refraction mid-positive, else clear when densifying again
        if (data.refraction?.detected) {
          setAccionMinima("");
          setAccionMaxima("");
        }
      }
    } catch (e: any) {
      setError(e.message || "Error de fase");
    } finally {
      setLoading(false);
    }
  }

  function reiniciar() {
    setScreen("entrada");
    setQueja("");
    setRespuesta("");
    setAccionMinima("");
    setAccionMaxima("");
    setSession(null);
    setLog([]);
    setMandate(null);
    setInterruptBanner(null);
    setDevolucion(null);
    setSenales([]);
    setReasoningSource(null);
    setError(null);
  }

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
      data-testid="espejo-v2-page"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,195,0.4) 3px)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {/* HEADER */}
        <header className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className="text-[12px] tracking-[0.22em] text-[#D4AF37]"
                data-testid="espejo-v2-header"
              >
                {HEADER}
              </p>
              <span
                className="inline-flex items-center gap-1.5 rounded border border-[#00FFC3]/35 bg-[#00FFC3]/10 px-2 py-0.5 text-[9px] tracking-widest text-[#00FFC3]"
                data-testid="espejo-v2-system-badge"
              >
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#00FFC3]"
                  style={{ boxShadow: "0 0 6px #00FFC3" }}
                />
                SISTEMA ACTIVO
              </span>
            </div>
            {session ? (
              <p
                className="mt-2 text-[11px] tracking-wide text-[#00FFC3]/90"
                data-testid="espejo-v2-frecuencia"
              >
                FRECUENCIA: CÓDIGO {session.codigo} — {session.frecuencia.toUpperCase()}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-white/40">
                Consola táctica · alta densidad de procesamiento
              </p>
            )}
          </div>
          <Link
            href="/espejo"
            className="shrink-0 text-[11px] tracking-widest text-white/40 hover:text-[#00FFC3]"
            data-testid="link-espejo-v1"
          >
            ← ESPEJO V1
          </Link>
        </header>

        {/* INDICATORS */}
        {session && (
          <div className="mb-6 space-y-3" data-testid="espejo-v2-indicators">
            <div className="flex flex-wrap items-center gap-2">
              <FrictionBadge friction={session.friction} label={frictionText} />
              <span className="rounded border border-white/10 px-2 py-1 text-[9px] tracking-widest text-white/45">
                POLO {isPoloPositivo ? "POSITIVO" : "NEGATIVO"}
              </span>
              <span className="rounded border border-white/10 px-2 py-1 text-[9px] tracking-widest text-white/45">
                FASE {session.phaseIndex}/5
              </span>
            </div>

            <div data-testid="espejo-v2-density">
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-widest text-white/40">
                <span>DENSIDAD DEL POLO NEGATIVO</span>
                <span className="text-[#00FFC3]">{Math.round(session.density)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-sm border border-white/10 bg-black/50">
                <motion.div
                  className="h-full"
                  style={{
                    background:
                      session.friction === 2
                        ? "linear-gradient(90deg,#FF3131 0%,#FF8C00 55%,#D4AF37 100%)"
                        : "linear-gradient(90deg,#1E3A8A 0%,#2563EB 40%,#00FFC3 100%)",
                    boxShadow:
                      session.friction === 2
                        ? "0 0 12px rgba(255,49,49,0.35)"
                        : "0 0 12px rgba(0,255,195,0.25)",
                  }}
                  animate={{ width: `${session.density}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <PhaseStepper activeId={session.phaseId} completed={screen === "cierre"} />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {interruptBanner && (
            <motion.div
              key={interruptBanner}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 whitespace-pre-line rounded border border-[#FF3131]/55 bg-[#FF3131]/12 px-3 py-3 text-xs leading-relaxed text-[#FF8A80]"
              style={{ boxShadow: "0 0 20px rgba(255,49,49,0.15)" }}
              data-testid="espejo-v2-refraccion-banner"
            >
              {interruptBanner}
              {session?.friction === 2 && (
                <p className="mt-2 border-t border-[#FF3131]/25 pt-2 text-[10px] tracking-wide text-[#D4AF37]">
                  EL SISTEMA NO REQUIERE FE NI GANAS PARA EJECUTAR. LA ACCIÓN MÍNIMA EXIGE
                  PRESENCIA, NO ENTUSIASMO.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div
            className="mb-4 rounded border border-[#FF3131]/40 bg-[#FF3131]/10 px-3 py-2 text-xs text-[#FF8A80]"
            data-testid="espejo-v2-error"
          >
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {screen === "entrada" && (
            <motion.section key="entrada" {...phaseMotion} data-testid="espejo-v2-entrada">
              <p className="mb-4 text-sm leading-relaxed text-white/70">
                {ESPEJO_V2_ENTRY_PROMPT}
              </p>
              <TerminalConsole
                value={queja}
                onChange={setQueja}
                placeholder="Volcado de queja / bloqueo / interferencia..."
                testId="espejo-v2-queja"
              />
              <button
                type="button"
                disabled={loading || queja.trim().length < 8}
                onClick={clasificar}
                className="mt-4 w-full rounded-md px-4 py-3 text-sm font-semibold tracking-widest transition disabled:opacity-40"
                style={{ background: "#D4AF37", color: "#0A0A0A" }}
                data-testid="espejo-v2-clasificar"
              >
                {loading ? "CLASIFICANDO FRECUENCIA…" : "ACTIVAR CLASIFICADOR"}
              </button>
            </motion.section>
          )}

          {screen === "proceso" && session && (
            <motion.section
              key={`proceso-${session.phaseId}-${session.codigo}-${session.friction}`}
              {...phaseMotion}
              data-testid="espejo-v2-proceso"
            >
              <div
                className="mb-3 rounded border px-3 py-2 text-[11px]"
                style={{
                  borderColor: isPoloPositivo
                    ? "rgba(212,175,55,0.35)"
                    : "rgba(0,255,195,0.25)",
                  background: isPoloPositivo
                    ? "rgba(212,175,55,0.08)"
                    : "rgba(0,255,195,0.06)",
                  color: isPoloPositivo ? "#D4AF37" : "#00FFC3",
                }}
              >
                FASE {session.phaseIndex}/5 — {labelForPhase(session.phaseId).toUpperCase()} ·{" "}
                {isPoloPositivo ? "EXPULSIÓN GRAVITACIONAL" : "DENSIFICACIÓN"}
                {reasoningSource && (
                  <span className="ml-2 text-white/35">
                    · RAZONAMIENTO: {reasoningSource.toUpperCase()}
                  </span>
                )}
              </div>

              {devolucion && (
                <div
                  className="mb-4 rounded border border-[#D4AF37]/30 bg-[#D4AF37]/08 px-3 py-3 text-sm leading-relaxed text-[#F0E6C8]"
                  data-testid="espejo-v2-devolucion"
                >
                  <p className="mb-1 text-[10px] tracking-widest text-[#D4AF37]">
                    DEVOLUCIÓN DEL GOBERNADOR
                  </p>
                  {devolucion}
                  {senales.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {senales.map((s) => (
                        <span
                          key={s}
                          className="rounded border border-white/15 px-1.5 py-0.5 text-[9px] tracking-widest text-white/45"
                        >
                          {s.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="mb-4 text-sm leading-relaxed text-white/85">{session.prompt}</p>

              <TerminalConsole
                value={respuesta}
                onChange={setRespuesta}
                placeholder="Responde sin evasión..."
                testId="espejo-v2-respuesta"
              />

              {session.phaseId === "seriedad" && (
                <div
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                  data-testid="espejo-v2-acciones-input"
                >
                  <ActionField
                    title="ACCIÓN MÍNIMA (HOY)"
                    value={accionMinima}
                    onChange={setAccionMinima}
                    placeholder="Tarea atómica e inmediata..."
                    testId="espejo-v2-accion-minima"
                  />
                  <ActionField
                    title="ACCIÓN MÁXIMA"
                    value={accionMaxima}
                    onChange={setAccionMaxima}
                    placeholder="Movimiento estratégico..."
                    testId="espejo-v2-accion-maxima"
                  />
                </div>
              )}

              {session.phaseId === "gobernador" && mandate && (
                <div className="mt-4" data-testid="espejo-v2-gobernador-preview">
                  <PriorityPanel
                    title="MANDATO DEL GOBERNADOR"
                    body={mandate.gobernador}
                    accent="#D4AF37"
                  />
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={loading || respuesta.trim().length < 2}
                  onClick={enviarFase}
                  className="flex-1 rounded-md px-4 py-3 text-sm font-semibold tracking-widest transition disabled:opacity-40"
                  style={{
                    background: isPoloPositivo ? "#D4AF37" : "#00FFC3",
                    color: "#0A0A0A",
                  }}
                  data-testid="espejo-v2-enviar-fase"
                >
                  {loading
                    ? "PROCESANDO…"
                    : session.phaseId === "gobernador"
                      ? "SELLAR MANDATO"
                      : "CONTINUAR FASE"}
                </button>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="rounded-md border border-white/15 px-4 py-3 text-[11px] tracking-widest text-white/50 hover:border-white/30 hover:text-white/80"
                  data-testid="espejo-v2-abort"
                >
                  REINICIAR
                </button>
              </div>
            </motion.section>
          )}

          {screen === "cierre" && session && mandate && (
            <motion.section key="cierre" {...phaseMotion} data-testid="espejo-v2-cierre">
              <p className="mb-3 text-[11px] tracking-[0.2em] text-[#D4AF37]">
                DISPARO POLO POSITIVO — PROTOCOLO CERRADO
              </p>
              {devolucion && (
                <div className="mb-3 rounded border border-[#D4AF37]/30 bg-[#D4AF37]/08 px-3 py-3 text-sm text-[#F0E6C8]">
                  <p className="mb-1 text-[10px] tracking-widest text-[#D4AF37]">
                    DEVOLUCIÓN FINAL
                  </p>
                  {devolucion}
                </div>
              )}
              <div className="grid gap-3">
                <PriorityPanel
                  title="ACCIÓN MÍNIMA (HOY)"
                  body={mandate.accionMinima}
                  accent="#00FFC3"
                />
                <PriorityPanel
                  title="ACCIÓN MÁXIMA"
                  body={mandate.accionMaxima}
                  accent="#2563EB"
                />
                <PriorityPanel
                  title="MANDATO DEL GOBERNADOR"
                  body={mandate.gobernador}
                  accent="#D4AF37"
                  highlight
                />
              </div>
              {mandate.leyFriccion && (
                <p className="mt-3 text-[10px] tracking-wide text-[#FF8A80]">
                  {mandate.leyFriccion}
                </p>
              )}
              <p className="mt-3 text-[11px] text-white/40">
                Código cerrado: {session.codigo} · {mandate.frecuencia}
              </p>
              <button
                type="button"
                onClick={reiniciar}
                className="mt-5 w-full rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3 text-xs tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/18"
                data-testid="espejo-v2-reiniciar"
              >
                NUEVO PROCESO / REINICIAR CONSOLA
              </button>
            </motion.section>
          )}
        </AnimatePresence>

        {log.length > 0 && (
          <details
            className="mt-8 rounded border border-white/10 bg-black/30 text-xs text-white/45"
            data-testid="espejo-v2-log"
          >
            <summary className="cursor-pointer px-3 py-2 tracking-widest hover:text-white/70">
              LOG DE CONSOLA · {log.length} EVENTOS
            </summary>
            <ul className="space-y-2 border-t border-white/10 px-3 py-3">
              {log.map((t, i) => (
                <li
                  key={`${t.phaseId}-${i}`}
                  className="rounded border border-white/10 bg-black/40 p-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] tracking-widest">
                    <span className="text-[#00FFC3]">{t.phaseLabel || t.phaseId}</span>
                    <span className="text-white/30">CÓDIGO {t.codigo}</span>
                    {t.refraction && (
                      <span className="text-[#FF3131]">REFRACCIÓN</span>
                    )}
                  </div>
                  <p className="mt-1 text-white/55">{t.respuesta}</p>
                  {(t.accionMinima || t.accionMaxima) && (
                    <div className="mt-2 grid gap-1 text-[10px] text-white/40">
                      {t.accionMinima && <span>MIN: {t.accionMinima}</span>}
                      {t.accionMaxima && <span>MAX: {t.accionMaxima}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function FrictionBadge({
  friction,
  label,
}: {
  friction: FrictionLevel;
  label: string;
}) {
  const alert = friction === 2;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] tracking-widest"
      style={{
        borderColor: alert ? "rgba(255,49,49,0.6)" : "rgba(0,255,195,0.3)",
        background: alert ? "rgba(255,49,49,0.15)" : "rgba(0,255,195,0.08)",
        color: alert ? "#FF3131" : "#00FFC3",
        boxShadow: alert ? "0 0 12px rgba(255,49,49,0.2)" : undefined,
      }}
      data-testid="espejo-v2-friction-badge"
    >
      {alert && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF3131]" />
      )}
      {label}
    </span>
  );
}

function ActionField({
  title,
  value,
  onChange,
  placeholder,
  testId,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <label className="block rounded border border-[#D4AF37]/25 bg-[#D4AF37]/05 p-3">
      <span className="text-[10px] tracking-widest text-[#D4AF37]">{title}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full resize-none bg-transparent text-xs text-white/85 outline-none placeholder:text-white/25"
        data-testid={testId}
      />
    </label>
  );
}

function PriorityPanel({
  title,
  body,
  accent,
  highlight = false,
}: {
  title: string;
  body: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-md border p-4"
      style={{
        borderColor: `${accent}66`,
        background: highlight ? `${accent}18` : "rgba(0,0,0,0.35)",
        boxShadow: highlight ? `0 0 24px ${accent}22` : undefined,
      }}
    >
      <p className="text-[10px] tracking-[0.18em]" style={{ color: accent }}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{body}</p>
    </div>
  );
}

function PhaseStepper({
  activeId,
  completed,
}: {
  activeId: EspejoV2PhaseId;
  completed: boolean;
}) {
  const activeIdx = ESPEJO_V2_PHASES.findIndex((x) => x.id === activeId);
  return (
    <div className="mt-3 flex flex-wrap gap-1.5" data-testid="espejo-v2-stepper">
      {ESPEJO_V2_PHASES.map((p, i) => {
        const active = p.id === activeId && !completed;
        const done = completed || i < activeIdx;
        return (
          <span
            key={p.id}
            className="rounded px-2 py-1 text-[9px] tracking-widest"
            style={{
              border: `1px solid ${
                active ? "#00FFC3" : done ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.12)"
              }`,
              color: active ? "#00FFC3" : done ? "#D4AF37" : "rgba(255,255,255,0.35)",
              background: active ? "rgba(0,255,195,0.08)" : "transparent",
            }}
          >
            {p.index}. {p.label.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}

function labelForPhase(id: EspejoV2PhaseId): string {
  return ESPEJO_V2_PHASES.find((p) => p.id === id)?.label ?? id;
}

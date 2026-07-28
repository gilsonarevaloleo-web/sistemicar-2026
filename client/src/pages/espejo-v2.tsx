import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ESPEJO_V2_ENTRY_PROMPT,
  ESPEJO_V2_PHASES,
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
}

const HEADER = "PROC-ESPEJO // SISTEMICAR V2";

export default function EspejoV2() {
  const [screen, setScreen] = useState<Screen>("entrada");
  const [queja, setQueja] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [log, setLog] = useState<TurnLog[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [mandate, setMandate] = useState<{
    accionMinimaHint: string;
    accionMaximaHint: string;
    gobernador: string;
    frecuencia: string;
  } | null>(null);

  const frictionLabel = useMemo(() => {
    if (!session) return "NIVEL 1 (ESTÁNDAR)";
    return session.friction === 2
      ? "NIVEL 2 (REFRACCIÓN REENCUADRADA)"
      : "NIVEL 1 (ESTÁNDAR)";
  }, [session]);

  async function clasificar() {
    setError(null);
    setLoading(true);
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
      setLog([]);
      setMandate(null);
      setFlash(`FRECUENCIA BLOQUEADA → CÓDIGO ${seed.codigo}`);
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
    setFlash(null);
    try {
      const res = await fetch("/api/espejo-v2/fase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: session.codigo,
          phaseId: session.phaseId,
          respuesta,
          friction: session.friction,
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
        },
      ]);

      if (data.refraction?.detected) {
        setFlash(
          `REFRACCIÓN → SALTO A CÓDIGO ${data.refraction.codigoSalto}. ${data.refraction.notification || ""}`,
        );
      }

      if (data.next.completed) {
        setMandate(data.next.mandate);
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
        prompt: data.next.prompt,
      });
      setRespuesta("");
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
    setSession(null);
    setLog([]);
    setMandate(null);
    setFlash(null);
    setError(null);
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(ellipse at top, #121212 0%, #0A0A0A 45%, #050505 100%)",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
      data-testid="espejo-v2-page"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className="text-[11px] tracking-[0.22em] text-[#D4AF37]"
              data-testid="espejo-v2-header"
            >
              {HEADER}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-wide text-[#F5F5F5] sm:text-2xl">
              Consola del Espejo V2
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">
              Primer paso: entrada de queja, clasificador 1.1–1.10 y motor de 5 fases
              con densificación / refracción.
            </p>
          </div>
          <Link
            href="/espejo"
            className="text-[11px] tracking-widest text-[#00FFC3]/70 hover:text-[#00FFC3]"
            data-testid="link-espejo-v1"
          >
            ← ESPEJO V1
          </Link>
        </header>

        {session && (
          <div
            className="mb-5 grid gap-3 rounded-md border border-white/10 bg-black/40 p-3 sm:grid-cols-3"
            data-testid="espejo-v2-status"
          >
            <StatusCell
              label="ESTADO"
              value={`PROCESANDO FRECUENCIA: CÓDIGO ${session.codigo}`}
            />
            <StatusCell label="FRICCIÓN" value={frictionLabel} accent="#FF8C00" />
            <StatusCell
              label="FRECUENCIA"
              value={session.frecuencia}
              accent="#00FFC3"
            />
          </div>
        )}

        {session && (
          <div className="mb-6" data-testid="espejo-v2-density">
            <div className="mb-1 flex items-center justify-between text-[10px] tracking-widest text-white/40">
              <span>DENSIDAD POLO NEGATIVO</span>
              <span>{Math.round(session.density)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    session.friction === 2
                      ? "linear-gradient(90deg,#FF3131,#D4AF37)"
                      : "linear-gradient(90deg,#2563EB,#00FFC3)",
                }}
                animate={{ width: `${session.density}%` }}
                transition={{ duration: 0.45 }}
              />
            </div>
            <PhaseStepper activeId={session.phaseId} completed={screen === "cierre"} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {flash && (
            <motion.div
              key={flash}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-2 text-xs text-[#D4AF37]"
              data-testid="espejo-v2-flash"
            >
              {flash}
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

        {screen === "entrada" && (
          <section data-testid="espejo-v2-entrada">
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-white/70">
              {ESPEJO_V2_ENTRY_PROMPT}
            </p>
            <TerminalConsole
              value={queja}
              onChange={setQueja}
              placeholder="Escribe la queja / bloqueo con claridad técnica..."
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
              {loading ? "CLASIFICANDO…" : "ACTIVAR CLASIFICADOR"}
            </button>
          </section>
        )}

        {screen === "proceso" && session && (
          <section data-testid="espejo-v2-proceso">
            <div className="mb-3 rounded border border-[#00FFC3]/20 bg-[#00FFC3]/5 px-3 py-2 text-[11px] text-[#00FFC3]/90">
              FASE {session.phaseIndex}/5 — {labelForPhase(session.phaseId)} · Polo{" "}
              {poloForPhase(session.phaseId)}
            </div>
            <p className="mb-4 text-sm leading-relaxed text-white/80">{session.prompt}</p>
            <TerminalConsole
              value={respuesta}
              onChange={setRespuesta}
              placeholder="Responde sin evasión..."
              testId="espejo-v2-respuesta"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={loading || respuesta.trim().length < 2}
                onClick={enviarFase}
                className="flex-1 rounded-md px-4 py-3 text-sm font-semibold tracking-widest transition disabled:opacity-40"
                style={{ background: "#00FFC3", color: "#0A0A0A" }}
                data-testid="espejo-v2-enviar-fase"
              >
                {loading ? "PROCESANDO…" : "CONTINUAR FASE"}
              </button>
              <button
                type="button"
                onClick={reiniciar}
                className="rounded-md border border-white/15 px-4 py-3 text-[11px] tracking-widest text-white/50"
                data-testid="espejo-v2-abort"
              >
                ABORTAR
              </button>
            </div>
          </section>
        )}

        {screen === "cierre" && session && mandate && (
          <section data-testid="espejo-v2-cierre">
            <div
              className="rounded-md border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-4"
              style={{ boxShadow: "0 0 24px rgba(212,175,55,0.12)" }}
            >
              <p className="text-[11px] tracking-[0.2em] text-[#D4AF37]">
                DISPARO POLO POSITIVO — MANDATO DEL GOBERNADOR
              </p>
              <p className="mt-3 text-sm text-white/85">{mandate.gobernador}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MandateCard title="ACCIÓN MÍNIMA" body={mandate.accionMinimaHint} />
                <MandateCard title="ACCIÓN MÁXIMA" body={mandate.accionMaximaHint} />
              </div>
              <p className="mt-4 text-[11px] text-white/45">
                Código cerrado: {session.codigo} · {mandate.frecuencia}
              </p>
            </div>
            <button
              type="button"
              onClick={reiniciar}
              className="mt-4 w-full rounded-md border border-white/20 px-4 py-3 text-xs tracking-widest text-white/70"
              data-testid="espejo-v2-reiniciar"
            >
              NUEVA SESIÓN V2
            </button>
          </section>
        )}

        {log.length > 0 && (
          <details className="mt-8 text-xs text-white/40" data-testid="espejo-v2-log">
            <summary className="cursor-pointer tracking-widest">REGISTRO DE FASES</summary>
            <ul className="mt-3 space-y-2">
              {log.map((t, i) => (
                <li key={`${t.phaseId}-${i}`} className="rounded border border-white/10 p-2">
                  <span className="text-[#00FFC3]">
                    {t.phaseLabel || t.phaseId}
                    {t.refraction ? " · REFRACCIÓN" : ""}
                  </span>
                  <p className="mt-1 text-white/55">{t.respuesta}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function StatusCell({
  label,
  value,
  accent = "#D4AF37",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[9px] tracking-widest text-white/35">{label}</p>
      <p className="mt-1 text-[11px] leading-snug" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function MandateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/30 p-3">
      <p className="text-[10px] tracking-widest text-[#D4AF37]">{title}</p>
      <p className="mt-2 text-xs text-white/70">{body}</p>
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
  return (
    <div className="mt-3 flex flex-wrap gap-1.5" data-testid="espejo-v2-stepper">
      {ESPEJO_V2_PHASES.map((p) => {
        const active = p.id === activeId;
        const done =
          completed ||
          ESPEJO_V2_PHASES.findIndex((x) => x.id === activeId) > p.index - 1;
        return (
          <span
            key={p.id}
            className="rounded px-2 py-1 text-[9px] tracking-widest"
            style={{
              border: `1px solid ${active ? "#00FFC3" : "rgba(255,255,255,0.12)"}`,
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

function poloForPhase(id: EspejoV2PhaseId): string {
  const polo = ESPEJO_V2_PHASES.find((p) => p.id === id)?.polo;
  return polo === "positivo" ? "POSITIVO" : "NEGATIVO";
}

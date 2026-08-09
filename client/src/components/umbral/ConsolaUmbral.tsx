import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Crown,
  Flame,
  Loader2,
  Lock,
  RefreshCw,
  Swords,
} from "lucide-react";
import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  MODOS_UMBRAL,
  obtenerCodigo,
  type CodigoNumero,
  type ModoUmbral,
} from "@shared/umbral/engineConfig";
import type { UmbralPsAward } from "@shared/umbral/pointsConfig";
import {
  evaluarUmbral,
  type UmbralHistorialItem,
} from "@/lib/umbral/api";
import { awardUmbralV2PsForEvaluation } from "@/lib/umbral/psLedger";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const WARN = "#FF6B35";

interface ConsolaUmbralProps {
  userId: string;
  /** Link de retorno (Umbral v1 u otra vista). */
  backHref?: string;
  backLabel?: string;
}

type Veredicto =
  | {
      kind: "aprobado";
      feedback: string;
      siguiente: CodigoNumero | null;
      psAwards: UmbralPsAward[];
      psTotal: number;
    }
  | {
      kind: "rechazado";
      feedback: string;
      psAwards: UmbralPsAward[];
      psTotal: number;
    }
  | null;

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: "easeOut" as const },
};

export function ConsolaUmbral({
  userId,
  backHref = "/umbral",
  backLabel = "← UMBRAL V1",
}: ConsolaUmbralProps) {
  const [modo, setModo] = useState<ModoUmbral>("INTERNO_HABILIDAD");
  const [codigoActual, setCodigoActual] = useState<CodigoNumero>(1);
  const [aprobados, setAprobados] = useState<Set<CodigoNumero>>(new Set());
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [veredicto, setVeredicto] = useState<Veredicto>(null);
  const [historial, setHistorial] = useState<UmbralHistorialItem[]>([]);
  const [moduloCompletado, setModuloCompletado] = useState(false);
  const [resumenSesion, setResumenSesion] = useState<string[]>([]);
  const [psSesion, setPsSesion] = useState(0);

  const cfg = useMemo(() => obtenerCodigo(codigoActual), [codigoActual]);
  const modoMeta = MODOS_UMBRAL[modo];

  const desafio = useMemo(() => {
    if (modo === "INTERNO_HABILIDAD") {
      return {
        etiqueta: "Pregunta disparadora",
        texto: cfg.modoInterno.preguntaDisparadora,
        posturaLabel: "Estado mental (operador)",
        postura: cfg.modoInterno.estadoMentalUsuario,
      };
    }
    return {
      etiqueta: "Objeción del cliente",
      texto: cfg.modoExterno.objecionCliente,
      posturaLabel: "Estado mental (cliente)",
      postura: cfg.modoExterno.estadoMentalCliente,
    };
  }, [cfg, modo]);

  function cambiarModo(next: ModoUmbral) {
    if (next === modo) return;
    setModo(next);
    setCodigoActual(1);
    setAprobados(new Set());
    setRespuesta("");
    setVeredicto(null);
    setError(null);
    setHistorial([]);
    setModuloCompletado(false);
    setResumenSesion([]);
    setPsSesion(0);
  }

  function reiniciar(mismoModo = true) {
    setCodigoActual(1);
    setAprobados(new Set());
    setRespuesta("");
    setVeredicto(null);
    setError(null);
    setHistorial([]);
    setModuloCompletado(false);
    setResumenSesion([]);
    setPsSesion(0);
    if (!mismoModo) {
      setModo((m) =>
        m === "INTERNO_HABILIDAD" ? "EXTERNO_VENTAS" : "INTERNO_HABILIDAD",
      );
    }
  }

  async function someter() {
    const texto = respuesta.trim();
    if (texto.length < 2 || loading || moduloCompletado) return;
    setLoading(true);
    setError(null);
    setVeredicto(null);
    try {
      const data = await evaluarUmbral({
        userId,
        modo,
        codigoActual,
        respuestaUsuario: texto,
        historialPrevio: historial,
      });

      const nextHistorial: UmbralHistorialItem[] = [
        ...historial,
        { rol: "user", texto },
        { rol: "system", texto: data.feedbackConfrontativo },
      ].slice(-16);
      setHistorial(nextHistorial);

      let psAwards: UmbralPsAward[] = [];
      let psTotal = 0;
      try {
        const ps = await awardUmbralV2PsForEvaluation(userId, {
          modo,
          codigo: codigoActual,
          respuestaUsuario: texto,
          aprobado: data.aprobado,
        });
        psAwards = ps.awarded;
        psTotal = ps.total;
        if (psTotal > 0) {
          setPsSesion((n) => n + psTotal);
        }
      } catch (psErr) {
        console.error("[ConsolaUmbral] PS no otorgados:", psErr);
      }

      if (data.aprobado) {
        setAprobados((prev) => {
          const n = new Set(prev);
          n.add(codigoActual);
          return n;
        });
        setResumenSesion((prev) =>
          prev.includes(cfg.nombre) ? prev : [...prev, cfg.nombre],
        );
        setVeredicto({
          kind: "aprobado",
          feedback: data.feedbackConfrontativo,
          siguiente: data.codigoSiguiente,
          psAwards,
          psTotal,
        });
        setRespuesta("");
        if (data.moduloCompletado || data.codigoSiguiente == null) {
          setModuloCompletado(true);
        } else if (data.codigoSiguiente) {
          // Avance suave tras ver el veredicto.
          window.setTimeout(() => {
            setCodigoActual(data.codigoSiguiente as CodigoNumero);
            setVeredicto(null);
          }, 1400);
        }
      } else {
        setVeredicto({
          kind: "rechazado",
          feedback: data.feedbackConfrontativo,
          psAwards,
          psTotal,
        });
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo evaluar. Reintenta.");
    } finally {
      setLoading(false);
    }
  }

  if (moduloCompletado) {
    return (
      <div className="space-y-6" data-testid="umbral-v2-completado">
        <motion.section
          {...fade}
          className="border border-[#D4AF37]/40 bg-[#D4AF37]/08 px-5 py-8 text-center"
        >
          <Crown className="mx-auto mb-3" size={36} style={{ color: GOLD }} />
          <p className="text-[11px] tracking-[0.25em] text-[#D4AF37]">
            MÓDULO COMPLETADO
          </p>
          <h2
            className="mt-2 font-display text-2xl font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Dominio Total alcanzado
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            Completaste los 10 Códigos en modo {modoMeta.label}. La secuencia
            cerró con autoría — no con pose.
          </p>
          {psSesion > 0 && (
            <p
              className="mt-4 text-sm font-bold tracking-wide"
              style={{ color: GOLD }}
              data-testid="umbral-v2-ps-modulo"
            >
              +{psSesion} PS en esta secuencia
            </p>
          )}
        </motion.section>

        <div className="border border-white/10 bg-black/40 p-4">
          <p className="mb-3 text-[10px] tracking-widest text-white/40">
            RESUMEN DE SESIÓN
          </p>
          <ul className="space-y-2">
            {(resumenSesion.length
              ? resumenSesion
              : Object.values(DICCIONARIO_CODIGOS).map((c) => c.nombre)
            ).map((nombre) => (
              <li
                key={nombre}
                className="flex items-center gap-2 text-sm text-white/75"
              >
                <Check size={14} style={{ color: GOLD }} />
                {nombre}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reiniciar(true)}
            className="flex flex-1 items-center justify-center gap-2 border border-white/20 px-4 py-3 text-[11px] tracking-widest text-white/80 hover:border-white/40"
            data-testid="umbral-v2-reiniciar"
          >
            <RefreshCw size={14} />
            REINICIAR MISMO MODO
          </button>
          <button
            type="button"
            onClick={() => reiniciar(false)}
            className="flex flex-1 items-center justify-center gap-2 border px-4 py-3 text-[11px] tracking-widest"
            style={{ borderColor: `${CYAN}55`, color: CYAN }}
            data-testid="umbral-v2-cambiar-modo"
          >
            {modo === "INTERNO_HABILIDAD"
              ? "DE LA FORJA A LA ARENA"
              : "DE LA ARENA A LA FORJA"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="umbral-v2-consola">
      {/* HEADER OPERATIVO */}
      <header className="space-y-4 border-b border-white/10 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="text-[12px] tracking-[0.22em]"
              style={{ color: GOLD }}
              data-testid="umbral-v2-header"
            >
              PROC-UMBRAL // SISTEMICAR V2
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              Consola de evaluación · secuencia rígida de 10 Códigos
            </p>
          </div>
          <Link
            href={backHref}
            className="shrink-0 text-[11px] tracking-widest text-white/40 hover:text-[#00FFC3]"
            data-testid="link-umbral-v1"
          >
            {backLabel}
          </Link>
        </div>

        {/* Selector de modo */}
        <div
          className="grid grid-cols-2 gap-2"
          role="tablist"
          aria-label="Modo Umbral"
          data-testid="umbral-v2-modo-tabs"
        >
          {(
            [
              {
                id: "INTERNO_HABILIDAD" as const,
                icon: Flame,
                title: MODOS_UMBRAL.INTERNO_HABILIDAD.label,
                sub: MODOS_UMBRAL.INTERNO_HABILIDAD.alias,
              },
              {
                id: "EXTERNO_VENTAS" as const,
                icon: Swords,
                title: MODOS_UMBRAL.EXTERNO_VENTAS.label,
                sub: MODOS_UMBRAL.EXTERNO_VENTAS.alias,
              },
            ] as const
          ).map((tab) => {
            const active = modo === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => cambiarModo(tab.id)}
                className="flex items-start gap-2 border px-3 py-3 text-left transition-colors"
                style={{
                  borderColor: active ? `${CYAN}66` : "rgba(255,255,255,0.1)",
                  background: active ? `${CYAN}12` : "rgba(0,0,0,0.35)",
                }}
                data-testid={`umbral-v2-modo-${tab.id}`}
              >
                <Icon
                  size={16}
                  className="mt-0.5 shrink-0"
                  style={{ color: active ? CYAN : "rgba(255,255,255,0.35)" }}
                />
                <span>
                  <span
                    className="block text-[12px] font-bold tracking-wide"
                    style={{ color: active ? CYAN : "rgba(255,255,255,0.7)" }}
                  >
                    {tab.title}
                  </span>
                  <span className="block text-[10px] text-white/40">
                    {tab.sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Progreso 1–10 */}
        <div data-testid="umbral-v2-progreso">
          <div className="mb-2 flex items-center justify-between text-[10px] tracking-widest text-white/40">
            <span>PROGRESO DE CÓDIGOS</span>
            <span className="flex items-center gap-3">
              {psSesion > 0 && (
                <span style={{ color: CYAN }} data-testid="umbral-v2-ps-sesion">
                  +{psSesion} PS
                </span>
              )}
              <span style={{ color: GOLD }}>{aprobados.size}/10</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CODIGOS_NUMERO.map((n) => {
              const done = aprobados.has(n);
              const active = n === codigoActual;
              const locked = n > codigoActual && !done;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked || loading}
                  onClick={() => {
                    if (done || n === codigoActual) {
                      setCodigoActual(n);
                      setVeredicto(null);
                      setError(null);
                    }
                  }}
                  className="relative flex h-9 w-9 items-center justify-center border text-[11px] font-bold tracking-wide transition-colors"
                  style={{
                    borderColor: active
                      ? CYAN
                      : done
                        ? `${GOLD}88`
                        : "rgba(255,255,255,0.12)",
                    color: active
                      ? CYAN
                      : done
                        ? GOLD
                        : locked
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(255,255,255,0.55)",
                    background: active
                      ? `${CYAN}14`
                      : done
                        ? `${GOLD}12`
                        : "rgba(0,0,0,0.4)",
                  }}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Código ${n}${done ? " aprobado" : active ? " activo" : " bloqueado"}`}
                  data-testid={`umbral-v2-codigo-${n}`}
                >
                  {done && !active ? (
                    <Check size={14} />
                  ) : locked ? (
                    <Lock size={12} />
                  ) : (
                    n
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* PANEL CENTRAL */}
      <AnimatePresence mode="wait">
        <motion.section
          key={`${modo}-${codigoActual}`}
          {...fade}
          className="space-y-4"
          data-testid="umbral-v2-desafio"
        >
          <div className="border border-white/12 bg-black/45 p-5">
            <p className="text-[10px] tracking-[0.2em] text-white/40">
              CÓDIGO ACTIVO · {modoMeta.label.toUpperCase()}
            </p>
            <h2
              className="mt-2 text-xl font-black text-white sm:text-2xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              data-testid="umbral-v2-titulo-codigo"
            >
              {cfg.nombre}
            </h2>
            <p className="mt-2 text-sm text-white/55" data-testid="umbral-v2-concepto">
              {cfg.conceptoClave}
            </p>

            <div className="mt-5 border-l-2 pl-3" style={{ borderColor: CYAN }}>
              <p className="text-[10px] tracking-widest text-[#00FFC3]/80">
                {desafio.etiqueta.toUpperCase()}
              </p>
              <p
                className="mt-1 text-[15px] leading-relaxed text-white/90"
                data-testid="umbral-v2-pregunta"
              >
                {desafio.texto}
              </p>
            </div>

            <div className="mt-4 border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[10px] tracking-widest text-white/35">
                {desafio.posturaLabel.toUpperCase()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {desafio.postura}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-[10px] tracking-widest text-white/40">
                ÁREA DE VOLCADO
              </span>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={7}
                disabled={loading}
                placeholder={
                  modo === "INTERNO_HABILIDAD"
                    ? "Escribe tu respuesta confrontativa al límite..."
                    : "Escribe tu respuesta de vendedor ante la objeción..."
                }
                className="w-full resize-y border border-white/15 bg-black/50 px-4 py-3 text-[15px] leading-relaxed text-white/90 outline-none placeholder:text-white/25 focus:border-[#00FFC3]/50"
                style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}
                data-testid="umbral-v2-textarea"
              />
            </label>

            <button
              type="button"
              onClick={() => void someter()}
              disabled={loading || respuesta.trim().length < 2}
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[12px] font-bold tracking-[0.18em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: `linear-gradient(90deg, ${GOLD}22, ${CYAN}18)`,
                border: `1px solid ${GOLD}66`,
                color: GOLD,
              }}
              data-testid="umbral-v2-someter"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  EVALUANDO…
                </>
              ) : (
                "SOMETER A EVALUACIÓN"
              )}
            </button>
          </div>
        </motion.section>
      </AnimatePresence>

      {/* VEREDICTO */}
      <AnimatePresence>
        {error && (
          <motion.div
            {...fade}
            className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            data-testid="umbral-v2-error"
          >
            {error}
          </motion.div>
        )}

        {veredicto?.kind === "aprobado" && (
          <motion.div
            key="ok"
            {...fade}
            className="border px-4 py-4"
            style={{ borderColor: `${GOLD}66`, background: `${GOLD}12` }}
            data-testid="umbral-v2-veredicto-ok"
          >
            <p className="text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
              APROBADO
              {veredicto.siguiente
                ? ` · AVANZA A CÓDIGO ${veredicto.siguiente}`
                : " · MÓDULO CERRADO"}
              {veredicto.psTotal > 0 ? ` · +${veredicto.psTotal} PS` : ""}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              {veredicto.feedback}
            </p>
            {veredicto.psAwards.length > 0 && (
              <ul
                className="mt-3 space-y-1 text-[11px] text-white/55"
                data-testid="umbral-v2-ps-detalle"
              >
                {veredicto.psAwards.map((a) => (
                  <li key={`${a.kind}-${a.source}`}>
                    +{a.amount} PS · {a.source.replace(/^Umbral v2:\s*/, "")}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {veredicto?.kind === "rechazado" && (
          <motion.div
            key="ko"
            {...fade}
            className="border-2 px-4 py-4"
            style={{ borderColor: WARN, background: `${WARN}14` }}
            data-testid="umbral-v2-veredicto-ko"
          >
            <p
              className="text-[10px] font-bold tracking-[0.2em]"
              style={{ color: WARN }}
            >
              RECHAZADO · PERMANECES EN CÓDIGO {codigoActual}
              {veredicto.psTotal > 0 ? ` · +${veredicto.psTotal} PS` : ""}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {veredicto.feedback}
            </p>
            {veredicto.psAwards.length > 0 && (
              <ul
                className="mt-3 space-y-1 text-[11px] text-white/55"
                data-testid="umbral-v2-ps-detalle"
              >
                {veredicto.psAwards.map((a) => (
                  <li key={`${a.kind}-${a.source}`}>
                    +{a.amount} PS · {a.source.replace(/^Umbral v2:\s*/, "")}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-white/45">
              Reescribe con más densidad y vuelve a someter. El intento
              consciente del día ya está contado; el pase se paga al aprobar.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConsolaUmbral;

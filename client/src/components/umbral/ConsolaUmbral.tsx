import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Check,
  ChevronDown,
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
  calcularProgresoCarrera,
  codigoTrasAprobar,
  esCodigoElegible,
  historialDesdeLogro,
  logrosDeCodigo,
  mergeLogros,
  primerCodigoPendiente,
  type LogroCodigoUmbral,
  type ProgresoCarreraUmbral,
  type ProgresoModoUmbral,
} from "@shared/umbral/progreso";
import {
  UMBRAL_SKU,
  requierePagoUmbral,
} from "@shared/umbralPricing";
import {
  evaluarUmbral,
  listarSesionesUmbral,
  type UmbralHistorialItem,
} from "@/lib/umbral/api";
import {
  appendLogroUmbral,
  cargarLogrosFirestore,
  loadUmbralLogrosLocal,
  persistirLogrosFusionados,
} from "@/lib/umbral/logrosStore";
import { awardUmbralV2PsForEvaluation } from "@/lib/umbral/psLedger";
import { NavTransitionLink } from "@/components/NavTransitionLink";
import { CardPerfilCliente } from "./CardPerfilCliente";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const WARN = "#FF6B35";

function formatFechaLogro(iso: string): string {
  if (!iso) return "Sin fecha";
  try {
    return new Date(iso).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

interface ConsolaUmbralProps {
  userId: string;
  /** Link de retorno (Umbral v1 u otra vista). */
  backHref?: string;
  backLabel?: string;
  /** Suscripción Umbral activa (Códigos 2–10 + métricas). */
  hasPaidAccess?: boolean;
  checkoutHref?: string;
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
  hasPaidAccess = false,
  checkoutHref = UMBRAL_SKU.checkoutHref,
}: ConsolaUmbralProps) {
  const [modo, setModo] = useState<ModoUmbral>("INTERNO_HABILIDAD");
  const [codigoActual, setCodigoActual] = useState<CodigoNumero>(1);
  const [superadosPorModo, setSuperadosPorModo] = useState<
    Record<ModoUmbral, Set<CodigoNumero>>
  >({
    INTERNO_HABILIDAD: new Set(),
    EXTERNO_VENTAS: new Set(),
  });
  const [sesionIdPorModo, setSesionIdPorModo] = useState<
    Record<ModoUmbral, string | null>
  >({
    INTERNO_HABILIDAD: null,
    EXTERNO_VENTAS: null,
  });
  const [logros, setLogros] = useState<LogroCodigoUmbral[]>([]);
  const [hidratando, setHidratando] = useState(true);
  const [historialCodigoAbierto, setHistorialCodigoAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [veredicto, setVeredicto] = useState<Veredicto>(null);
  const [historial, setHistorial] = useState<UmbralHistorialItem[]>([]);
  const [moduloCompletado, setModuloCompletado] = useState(false);
  const [resumenSesion, setResumenSesion] = useState<string[]>([]);
  const [psSesion, setPsSesion] = useState(0);
  /** Paywall tras aprobar C1 en trial, o al intentar C2+. */
  const [mostrarPaywall, setMostrarPaywall] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aprobados = superadosPorModo[modo];
  const sesionId = sesionIdPorModo[modo];
  const progresoModo = useMemo<ProgresoModoUmbral>(() => {
    const siguiente = primerCodigoPendiente(aprobados);
    const superados = CODIGOS_NUMERO.filter((n) => aprobados.has(n));
    return {
      modo,
      superados,
      siguiente,
      codigoPorDefecto: siguiente ?? 1,
      elegibles:
        siguiente == null
          ? [...CODIGOS_NUMERO]
          : CODIGOS_NUMERO.filter((n) => aprobados.has(n) || n === siguiente),
    };
  }, [modo, aprobados]);
  const logrosCodigo = useMemo(
    () => logrosDeCodigo(logros, modo, codigoActual),
    [logros, modo, codigoActual],
  );

  function aplicarProgreso(
    p: ProgresoCarreraUmbral,
    opts?: { posicionar?: boolean; modoRef?: ModoUmbral },
  ) {
    setLogros(p.logros);
    setSuperadosPorModo({
      INTERNO_HABILIDAD: new Set(p.porModo.INTERNO_HABILIDAD.superados),
      EXTERNO_VENTAS: new Set(p.porModo.EXTERNO_VENTAS.superados),
    });
    if (opts?.posicionar !== false) {
      const m = opts?.modoRef ?? modo;
      setCodigoActual(p.porModo[m].codigoPorDefecto);
    }
  }

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hidratar() {
      setHidratando(true);
      try {
        const local = loadUmbralLogrosLocal(userId);
        if (!cancelled && local.length > 0) {
          aplicarProgreso(calcularProgresoCarrera(local), { posicionar: true });
        }

        const data = await listarSesionesUmbral(userId);
        if (cancelled) return;
        let firestore: LogroCodigoUmbral[] = [];
        try {
          firestore = await cargarLogrosFirestore(userId);
        } catch {
          firestore = [];
        }
        const progreso = persistirLogrosFusionados(
          userId,
          data.sesiones,
          firestore,
        );
        if (cancelled) return;
        aplicarProgreso(progreso, { posicionar: true });
        const ids: Record<ModoUmbral, string | null> = {
          INTERNO_HABILIDAD: null,
          EXTERNO_VENTAS: null,
        };
        for (const s of data.sesiones) {
          if (s.estado === "EN_PROGRESO" && !ids[s.modo]) {
            ids[s.modo] = s.id;
          }
        }
        setSesionIdPorModo(ids);
      } catch (e) {
        console.warn("[ConsolaUmbral] No se pudo hidratar progreso:", e);
      } finally {
        if (!cancelled) setHidratando(false);
      }
    }
    void hidratar();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const cfg = useMemo(() => obtenerCodigo(codigoActual), [codigoActual]);
  const modoMeta = MODOS_UMBRAL[modo];
  const codigoBloqueadoPorPago = requierePagoUmbral(codigoActual, hasPaidAccess);

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

  function resetIntentoLocal() {
    setRespuesta("");
    setVeredicto(null);
    setError(null);
    setHistorial([]);
    setHistorialCodigoAbierto(false);
  }

  function cambiarModo(next: ModoUmbral) {
    if (next === modo) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setModo(next);
    setCodigoActual(primerCodigoPendiente(superadosPorModo[next]) ?? 1);
    resetIntentoLocal();
    setModuloCompletado(false);
    setResumenSesion([]);
    setPsSesion(0);
    setMostrarPaywall(false);
  }

  function reiniciar(mismoModo = true) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    const nextModo: ModoUmbral = mismoModo
      ? modo
      : modo === "INTERNO_HABILIDAD"
        ? "EXTERNO_VENTAS"
        : "INTERNO_HABILIDAD";
    setSesionIdPorModo((prev) => ({ ...prev, [nextModo]: null }));
    if (!mismoModo) setModo(nextModo);
    setCodigoActual(primerCodigoPendiente(superadosPorModo[nextModo]) ?? 1);
    resetIntentoLocal();
    setModuloCompletado(false);
    setResumenSesion([]);
    setPsSesion(0);
    setMostrarPaywall(false);
  }

  async function someter() {
    const texto = respuesta.trim();
    if (texto.length < 2 || loading || moduloCompletado) return;
    if (requierePagoUmbral(codigoActual, hasPaidAccess)) {
      setMostrarPaywall(true);
      return;
    }
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
        sesionId: sesionId ?? undefined,
      });

      if (data.sesionId) {
        setSesionIdPorModo((prev) => ({ ...prev, [modo]: data.sesionId }));
      }

      const nextHistorial: UmbralHistorialItem[] = [
        ...historial,
        { rol: "user" as const, texto },
        { rol: "system" as const, texto: data.feedbackConfrontativo },
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
        const lastHist = [...(data.sesion?.historialCodigos ?? [])]
          .reverse()
          .find((h) => h.codigo === codigoActual);
        const logro = lastHist
          ? historialDesdeLogro(lastHist, modo, data.sesionId)
          : historialDesdeLogro(
              {
                codigo: codigoActual,
                intentos: 1,
                respuestaAprobada: texto,
                feedbackGemini: data.feedbackConfrontativo,
                psGanados: psTotal,
                fechaAprobacion: new Date().toISOString(),
              },
              modo,
              data.sesionId,
            );
        if (logro) {
          appendLogroUmbral(userId, logro);
        }
        if (data.progreso) {
          const fused = persistirLogrosFusionados(
            userId,
            [],
            data.progreso.logros,
            logro ? [logro] : [],
          );
          aplicarProgreso(fused, { posicionar: false });
        } else {
          setSuperadosPorModo((prev) => {
            const n = new Set(prev[modo]);
            n.add(codigoActual);
            return { ...prev, [modo]: n };
          });
          if (logro) {
            setLogros((prev) => mergeLogros(prev, [logro]));
          }
        }

        const siguiente = codigoTrasAprobar(aprobados, codigoActual);
        setResumenSesion((prev) =>
          prev.includes(cfg.nombre) ? prev : [...prev, cfg.nombre],
        );
        setVeredicto({
          kind: "aprobado",
          feedback: data.feedbackConfrontativo,
          siguiente,
          psAwards,
          psTotal,
        });
        setRespuesta("");
        setHistorial([]);
        const superadosTrasPase: CodigoNumero[] = [];
        aprobados.forEach((n) => superadosTrasPase.push(n));
        superadosTrasPase.push(codigoActual);
        if (
          (data.moduloCompletado || codigoActual === 10) &&
          primerCodigoPendiente(superadosTrasPase) == null
        ) {
          setModuloCompletado(true);
        } else if (requierePagoUmbral(siguiente, hasPaidAccess)) {
          if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = setTimeout(() => {
            setMostrarPaywall(true);
          }, 1200);
        } else {
          if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = setTimeout(() => {
            setCodigoActual(siguiente);
            setVeredicto(null);
            setHistorialCodigoAbierto(false);
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

  function PaywallUmbral({ motivo }: { motivo: string }) {
    return (
      <section
        className="border-2 p-5"
        style={{ borderColor: `${GOLD}88`, background: `${GOLD}10` }}
        data-testid="umbral-v2-paywall"
      >
        <p
          className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          <Lock size={14} />
          UMBRAL · ACCESO COMPLETO
        </p>
        <h2
          className="mt-2 text-xl font-black text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          ${UMBRAL_SKU.priceUsd} USD/mes
        </h2>
        <p className="mt-2 text-sm text-white/65">{motivo}</p>
        <p className="mt-1 text-xs text-white/40">
          {UMBRAL_SKU.identity}. Código 1 es trial; Códigos 2–10 + métricas
          requieren membresía.
        </p>
        <ul className="mt-4 space-y-1.5">
          {UMBRAL_SKU.unlocks.slice(1).map((u) => (
            <li key={u} className="flex items-start gap-2 text-xs text-white/70">
              <Check size={12} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
              {u}
            </li>
          ))}
        </ul>
        <NavTransitionLink
          href={checkoutHref}
          className="mt-5 flex w-full items-center justify-center gap-2 border px-4 py-3.5 text-[12px] font-bold tracking-[0.18em] text-[#D4AF37]"
        >
          <span
            data-testid="umbral-v2-paywall-cta"
            className="flex w-full items-center justify-center"
            style={{
              background: `linear-gradient(90deg, ${GOLD}33, ${CYAN}22)`,
              border: `1px solid ${GOLD}88`,
              padding: "0.85rem 1rem",
            }}
          >
            ACTIVAR UMBRAL · ${UMBRAL_SKU.priceUsd}/MES
          </span>
        </NavTransitionLink>
        <button
          type="button"
          onClick={() => {
            setMostrarPaywall(false);
            setCodigoActual(1);
            setVeredicto(null);
          }}
          className="mt-3 w-full text-center text-[11px] tracking-widest text-white/40 hover:text-white/70"
          data-testid="umbral-v2-paywall-volver-trial"
        >
          VOLVER AL CÓDIGO 1 (TRIAL)
        </button>
      </section>
    );
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
        <NavTransitionLink
          href="/umbral/metricas"
          className="flex items-center justify-center gap-2 border border-white/15 px-4 py-3 text-[11px] tracking-widest text-white/55 hover:border-[#00FFC3]/40 hover:text-[#00FFC3]"
        >
          <span
            className="flex items-center justify-center gap-2"
            data-testid="link-umbral-metricas-completado"
          >
            <BarChart3 size={14} />
            VER MÉTRICAS DIAGNÓSTICAS
          </span>
        </NavTransitionLink>
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
              Práctica de 10 Códigos · el pendiente abre solo; los superados se
              pueden repasar
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {hasPaidAccess ? (
              <NavTransitionLink
                href="/umbral/metricas"
                className="flex items-center gap-1.5 text-[11px] tracking-widest text-white/40 hover:text-[#00FFC3]"
              >
                <span className="flex items-center gap-1.5" data-testid="link-umbral-metricas">
                  <BarChart3 size={12} />
                  MÉTRICAS
                </span>
              </NavTransitionLink>
            ) : (
              <button
                type="button"
                onClick={() => setMostrarPaywall(true)}
                className="flex items-center gap-1.5 text-[11px] tracking-widest text-white/40 hover:text-[#D4AF37]"
                data-testid="link-umbral-metricas-locked"
              >
                <Lock size={12} />
                MÉTRICAS
              </button>
            )}
            <NavTransitionLink
              href="/umbral/entrada"
              className="text-[11px] tracking-widest text-white/40 hover:text-[#00FFC3]"
            >
              <span data-testid="link-umbral-entrada">ENTRADA</span>
            </NavTransitionLink>
            <NavTransitionLink
              href={backHref}
              className="text-[11px] tracking-widest text-white/40 hover:text-[#00FFC3]"
            >
              <span data-testid="link-umbral-v1">{backLabel}</span>
            </NavTransitionLink>
          </div>
        </div>

        {!hasPaidAccess && (
          <p
            className="border border-[#D4AF37]/25 bg-[#D4AF37]/08 px-3 py-2 text-[11px] text-[#D4AF37]/90"
            data-testid="umbral-v2-trial-banner"
          >
            TRIAL · Código 1 gratis · Códigos 2–10 requieren Umbral ($
            {UMBRAL_SKU.priceUsd}/mes)
          </p>
        )}

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
            <span>
              {hidratando
                ? "CARGANDO PROGRESO…"
                : progresoModo.siguiente
                  ? `PENDIENTE · CÓDIGO ${progresoModo.siguiente}`
                  : "MODO SUPERADO · ELIGE CUALQUIER CÓDIGO"}
            </span>
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
              const active = n === codigoActual && !mostrarPaywall;
              const paidLock = requierePagoUmbral(n, hasPaidAccess);
              const elegible = esCodigoElegible(progresoModo, n);
              const seqLocked = !elegible;
              const locked = paidLock || seqLocked;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={(seqLocked && !paidLock) || loading || hidratando}
                  onClick={() => {
                    if (paidLock) {
                      setMostrarPaywall(true);
                      return;
                    }
                    if (elegible) {
                      if (advanceTimerRef.current) {
                        clearTimeout(advanceTimerRef.current);
                      }
                      setMostrarPaywall(false);
                      setCodigoActual(n);
                      setVeredicto(null);
                      setError(null);
                      setHistorial([]);
                      setHistorialCodigoAbierto(false);
                    }
                  }}
                  className="relative flex h-9 w-9 items-center justify-center border text-[11px] font-bold tracking-wide transition-colors"
                  style={{
                    borderColor: active
                      ? CYAN
                      : done
                        ? `${GOLD}88`
                        : paidLock
                          ? `${GOLD}44`
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
                  aria-label={`Código ${n}${done ? " superado, elegible para repasar" : paidLock ? " requiere pago" : active ? " pendiente activo" : elegible ? " pendiente" : " bloqueado"}`}
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
          key={`${modo}-${codigoActual}-${mostrarPaywall || codigoBloqueadoPorPago ? "pay" : "ok"}`}
          {...fade}
          className="space-y-4"
          data-testid="umbral-v2-desafio"
        >
          {(mostrarPaywall || codigoBloqueadoPorPago) && (
            <PaywallUmbral
              motivo={
                aprobados.has(1) && !hasPaidAccess
                  ? "Aprobaste el Código 1. Para atravesar los Códigos 2–10 necesitas la membresía Umbral."
                  : "Los Códigos 2–10, ambos modos completos y el panel de métricas requieren Umbral."
              }
            />
          )}

          {!mostrarPaywall && !codigoBloqueadoPorPago && modo === "EXTERNO_VENTAS" && (
            <CardPerfilCliente
              codigoNumero={cfg.numero}
              perfil={cfg.modoExterno}
            />
          )}

          {!mostrarPaywall && !codigoBloqueadoPorPago && (
            <>
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

                {logrosCodigo.length > 0 && (
                  <div
                    className="mt-4 border border-[#D4AF37]/25 bg-[#D4AF37]/08"
                    data-testid="umbral-v2-historial-codigo"
                  >
                    <button
                      type="button"
                      onClick={() => setHistorialCodigoAbierto((v) => !v)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                      aria-expanded={historialCodigoAbierto}
                    >
                      <span
                        className="text-[10px] tracking-widest"
                        style={{ color: GOLD }}
                      >
                        HISTORIAL DE ESTE CÓDIGO · {logrosCodigo.length} logro
                        {logrosCodigo.length === 1 ? "" : "s"}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-[#D4AF37]/70 transition-transform ${historialCodigoAbierto ? "rotate-180" : ""}`}
                      />
                    </button>
                    {historialCodigoAbierto && (
                      <div className="space-y-2 border-t border-[#D4AF37]/20 px-3 py-3">
                        <p className="text-[11px] text-white/45">
                          Si hoy no pasa, revisa cómo lo cortaste antes.
                        </p>
                        {logrosCodigo.map((l) => (
                          <article
                            key={`${l.sesionId}-${l.fechaAprobacion}-${l.codigo}`}
                            className="border border-white/10 bg-black/30 p-3"
                          >
                            <p className="text-[10px] tracking-widest text-white/40">
                              {formatFechaLogro(l.fechaAprobacion)}
                              {l.intentos > 0
                                ? ` · ${l.intentos} intento${l.intentos === 1 ? "" : "s"}`
                                : ""}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-white/85">
                              {l.respuestaAprobada}
                            </p>
                            {l.feedbackGemini ? (
                              <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                                Feedback: {l.feedbackGemini}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
            </>
          )}
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
                ? ` · SIGUE EN CÓDIGO ${veredicto.siguiente}`
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

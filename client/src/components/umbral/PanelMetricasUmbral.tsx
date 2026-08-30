import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {
  CODIGOS_NUMERO,
  DICCIONARIO_CODIGOS,
  MODOS_UMBRAL,
  type CodigoNumero,
  type ModoUmbral,
} from "@shared/umbral/engineConfig";
import type { MetricasDiagnosticasUmbral } from "@shared/umbral/metrics";
import {
  logrosDeCodigo,
  type LogroCodigoUmbral,
  type ProgresoCarreraUmbral,
} from "@shared/umbral/progreso";
import type { SesionUmbral } from "@shared/umbral/sessionTypes";
import { listarSesionesUmbral } from "@/lib/umbral/api";
import {
  cargarLogrosFirestore,
  persistirLogrosFusionados,
} from "@/lib/umbral/logrosStore";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const WARN = "#FF6B35";

interface PanelMetricasUmbralProps {
  userId: string;
  backHref?: string;
  backLabel?: string;
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function BarraFriccion({
  label,
  color,
  data,
}: {
  label: string;
  color: string;
  data: { codigo: number; intentos: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.intentos));
  return (
    <div data-testid={`umbral-metricas-friccion-${label}`}>
      <p className="mb-3 text-[10px] tracking-[0.2em] text-white/40">{label}</p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.codigo} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-[11px] text-white/45">
              C{d.codigo}
            </span>
            <div className="h-2.5 flex-1 bg-white/[0.06]">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(d.intentos / max) * 100}%`,
                  background: color,
                  minWidth: d.intentos > 0 ? 4 : 0,
                }}
              />
            </div>
            <span
              className="w-6 shrink-0 text-[11px] font-bold"
              style={{ color: d.intentos > 0 ? color : "rgba(255,255,255,0.25)" }}
            >
              {d.intentos}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SesionCard({ sesion }: { sesion: SesionUmbral }) {
  const [open, setOpen] = useState(false);
  const modoMeta = MODOS_UMBRAL[sesion.modo as ModoUmbral];
  const psTotal = sesion.historialCodigos.reduce((s, h) => s + h.psGanados, 0);

  return (
    <div
      className="border border-white/10 bg-black/40"
      data-testid={`umbral-metricas-sesion-${sesion.id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-widest" style={{ color: CYAN }}>
            {modoMeta.label.toUpperCase()} · {sesion.estado}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {sesion.historialCodigos.length}/10 códigos · {sesion.intentosTotales}{" "}
            intentos
            {psTotal > 0 ? ` · +${psTotal} PS` : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-white/35">
            {formatFecha(sesion.updatedAt)}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/8"
          >
            <div className="space-y-3 px-4 py-3">
              {sesion.historialCodigos.length === 0 ? (
                <p className="text-xs text-white/40">
                  Aún no hay volcados aprobados en esta sesión.
                </p>
              ) : (
                sesion.historialCodigos.map((h) => (
                  <article
                    key={`${sesion.id}-${h.codigo}-${h.fechaAprobacion}`}
                    className="border border-white/8 bg-white/[0.03] p-3"
                  >
                    <p
                      className="text-[10px] tracking-widest"
                      style={{ color: GOLD }}
                    >
                      CÓDIGO {h.codigo} · {h.intentos} intento
                      {h.intentos === 1 ? "" : "s"}
                      {h.psGanados > 0 ? ` · +${h.psGanados} PS` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">
                      {h.respuestaAprobada}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white/45">
                      Feedback: {h.feedbackGemini}
                    </p>
                  </article>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistorialLogrosPorCodigo({
  progreso,
}: {
  progreso: ProgresoCarreraUmbral;
}) {
  const [modo, setModo] = useState<ModoUmbral>("INTERNO_HABILIDAD");
  const [abierto, setAbierto] = useState<CodigoNumero | null>(null);
  const modoMeta = MODOS_UMBRAL[modo];
  const pModo = progreso.porModo[modo];

  return (
    <section
      className="border border-white/12 bg-black/45 p-5"
      data-testid="umbral-metricas-logros"
    >
      <p
        className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        <Trophy size={14} />
        HISTORIAL DE LOGROS POR CÓDIGO
      </p>
      <p className="mt-1 text-[11px] text-white/40">
        Cómo superaste cada código. Si en una sesión nueva no pasas, abre el
        logro anterior.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(
          [
            ["INTERNO_HABILIDAD", MODOS_UMBRAL.INTERNO_HABILIDAD.label],
            ["EXTERNO_VENTAS", MODOS_UMBRAL.EXTERNO_VENTAS.label],
          ] as const
        ).map(([id, label]) => {
          const active = modo === id;
          const n = progreso.porModo[id].superados.length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setModo(id);
                setAbierto(null);
              }}
              className="border px-3 py-2 text-left text-[11px] tracking-widest"
              style={{
                borderColor: active ? `${CYAN}66` : "rgba(255,255,255,0.1)",
                color: active ? CYAN : "rgba(255,255,255,0.55)",
                background: active ? `${CYAN}12` : "transparent",
              }}
              data-testid={`umbral-metricas-logros-modo-${id}`}
            >
              {label.toUpperCase()} · {n}/10
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        {CODIGOS_NUMERO.map((n) => {
          const items = logrosDeCodigo(progreso.logros, modo, n);
          const superado = pModo.superados.includes(n);
          const open = abierto === n;
          return (
            <div
              key={`${modo}-${n}`}
              className="border border-white/10 bg-black/30"
              data-testid={`umbral-metricas-logro-c${n}`}
            >
              <button
                type="button"
                onClick={() => setAbierto(open ? null : n)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                aria-expanded={open}
              >
                <span
                  className="text-[12px] font-bold"
                  style={{ color: superado ? GOLD : "rgba(255,255,255,0.35)" }}
                >
                  C{n}
                </span>
                <span className="min-w-0 flex-1 text-sm text-white/75">
                  {DICCIONARIO_CODIGOS[n].nombre.replace(/^Código \d+:\s*/, "")}
                </span>
                <span className="shrink-0 text-[10px] tracking-widest text-white/40">
                  {superado
                    ? `${items.length} logro${items.length === 1 ? "" : "s"}`
                    : "PENDIENTE"}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="space-y-2 border-t border-white/8 px-3 py-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-white/40">
                      Aún no hay un pase registrado en {modoMeta.label}.
                    </p>
                  ) : (
                    items.map((l) => (
                      <article
                        key={`${l.sesionId}-${l.fechaAprobacion}-${l.respuestaAprobada.slice(0, 24)}`}
                        className="border border-white/8 bg-white/[0.03] p-3"
                      >
                        <p
                          className="text-[10px] tracking-widest"
                          style={{ color: GOLD }}
                        >
                          {formatFecha(l.fechaAprobacion)}
                          {` · ${l.intentos} intento${l.intentos === 1 ? "" : "s"}`}
                          {l.psGanados > 0 ? ` · +${l.psGanados} PS` : ""}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/85">
                          {l.respuestaAprobada}
                        </p>
                        {l.feedbackGemini ? (
                          <p className="mt-2 text-xs leading-relaxed text-white/45">
                            Feedback: {l.feedbackGemini}
                          </p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PanelMetricasUmbral({
  userId,
  backHref = "/umbral/v2",
  backLabel = "← CONSOLA V2",
}: PanelMetricasUmbralProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sesiones, setSesiones] = useState<SesionUmbral[]>([]);
  const [metricas, setMetricas] = useState<MetricasDiagnosticasUmbral | null>(
    null,
  );
  const [progreso, setProgreso] = useState<ProgresoCarreraUmbral | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const data = await listarSesionesUmbral(userId);
      let firestore: LogroCodigoUmbral[] = [];
      try {
        firestore = await cargarLogrosFirestore(userId);
      } catch {
        firestore = [];
      }
      const fused = persistirLogrosFusionados(
        userId,
        data.sesiones,
        data.progreso?.logros,
        firestore,
      );
      setSesiones(data.sesiones);
      setMetricas(data.metricas);
      setProgreso(fused);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las métricas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const completadas = useMemo(
    () => sesiones.filter((s) => s.estado === "COMPLETADO"),
    [sesiones],
  );

  return (
    <div className="space-y-6" data-testid="umbral-v2-panel-metricas">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className="flex items-center gap-2 text-[12px] tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            <BarChart3 size={14} />
            MÉTRICAS DIAGNÓSTICAS · UMBRAL V2
          </p>
          <p className="mt-1 text-[11px] text-white/40">
            Historial de logros por código, cuellos de botella y fricción
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] tracking-widest text-white/45 hover:text-[#00FFC3] disabled:opacity-40"
            data-testid="umbral-metricas-refresh"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            ACTUALIZAR
          </button>
          <Link
            href={backHref}
            className="text-[11px] tracking-widest text-white/40 hover:text-[#00FFC3]"
            data-testid="link-umbral-consola"
          >
            {backLabel}
          </Link>
        </div>
      </header>

      {error && (
        <div
          className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          data-testid="umbral-metricas-error"
        >
          {error}
        </div>
      )}

      {loading && !metricas ? (
        <div className="flex items-center justify-center gap-2 py-16 text-white/40">
          <Loader2 size={18} className="animate-spin" />
          Cargando métricas…
        </div>
      ) : metricas ? (
        <>
          {/* Cuello de botella */}
          <section
            className="border-2 p-5"
            style={{
              borderColor: metricas.cuelloBotella
                ? `${WARN}88`
                : "rgba(255,255,255,0.12)",
              background: metricas.cuelloBotella
                ? `${WARN}10`
                : "rgba(0,0,0,0.35)",
            }}
            data-testid="umbral-metricas-cuello"
          >
            <p
              className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
              style={{ color: metricas.cuelloBotella ? WARN : "rgba(255,255,255,0.4)" }}
            >
              <AlertTriangle size={14} />
              CUELLO DE BOTELLA / CÓDIGO CRÍTICO
            </p>
            {metricas.cuelloBotella ? (
              <>
                <h2
                  className="mt-2 text-xl font-black text-white"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Código {metricas.cuelloBotella.codigo}
                  {metricas.cuelloBotella.arquetipoNombre
                    ? ` · ${metricas.cuelloBotella.arquetipoNombre}`
                    : ""}
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  {metricas.cuelloBotella.nombreCodigo} ·{" "}
                  {MODOS_UMBRAL[metricas.cuelloBotella.modo].label} ·{" "}
                  <span style={{ color: WARN }}>
                    {metricas.cuelloBotella.intentos} reintentos acumulados
                  </span>
                </p>
                <div
                  className="mt-4 border p-3"
                  style={{ borderColor: `${CYAN}44`, background: `${CYAN}0d` }}
                >
                  <p
                    className="flex items-center gap-1.5 text-[10px] tracking-widest"
                    style={{ color: CYAN }}
                  >
                    <Target size={12} />
                    RECOMENDACIÓN TÁCTICA
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                    {metricas.cuelloBotella.recomendacion}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/50">
                Sin fricción registrada aún. Somete intentos en la Consola para
                diagnosticar tu cuello de botella.
              </p>
            )}
          </section>

          {/* Tasa de corte limpio */}
          <section
            className="border border-white/12 bg-black/45 p-5"
            data-testid="umbral-metricas-corte-limpio"
          >
            <p
              className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              <Sparkles size={14} />
              TASA DE CORTE LIMPIO
            </p>
            <p
              className="mt-2 text-4xl font-black"
              style={{ color: GOLD, fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {metricas.tasaCorteLimpio}%
            </p>
            <p className="mt-1 text-sm text-white/50">
              {metricas.cortesLimpios} de {metricas.codigosAprobados} pases al
              primer intento · {metricas.sesionesCompletadas}/
              {metricas.totalSesiones} sesiones completadas
              {progreso
                ? ` · Forja ${progreso.porModo.INTERNO_HABILIDAD.superados.length}/10 · Arena ${progreso.porModo.EXTERNO_VENTAS.superados.length}/10`
                : ""}
            </p>
          </section>

          {/* Distribución de fricción */}
          <section
            className="border border-white/12 bg-black/45 p-5"
            data-testid="umbral-metricas-friccion"
          >
            <p className="mb-4 text-[10px] tracking-[0.2em] text-white/40">
              DISTRIBUCIÓN DE FRICCIÓN · REINTENTOS POR CÓDIGO
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <BarraFriccion
                label="LA FORJA"
                color={CYAN}
                data={metricas.friccionForja}
              />
              <BarraFriccion
                label="LA ARENA"
                color={WARN}
                data={metricas.friccionArena}
              />
            </div>
          </section>

          {progreso && (
            <HistorialLogrosPorCodigo progreso={progreso} />
          )}

          {/* Historial */}
          <section data-testid="umbral-metricas-historial">
            <p className="mb-3 text-[10px] tracking-[0.2em] text-white/40">
              SESIONES (LOS LOGROS PERMANECEN AQUÍ Y ARRIBA, DÍA A DÍA)
            </p>
            {completadas.length === 0 &&
            !sesiones.some((s) => s.estado === "EN_PROGRESO") ? (
              <div className="border border-white/10 bg-black/35 px-4 py-6 text-sm text-white/40">
                Aún no hay sesiones. Cada código que apruebes queda en el
                historial de logros, aunque no cierres los 10.
              </div>
            ) : completadas.length === 0 ? (
              <div className="border border-white/10 bg-black/35 px-4 py-4 text-sm text-white/40">
                Todavía no cierras un módulo de 10. Los pases de esta secuencia
                ya están en el historial de logros.
              </div>
            ) : (
              <div className="space-y-2">
                {completadas.map((s) => (
                  <SesionCard key={s.id} sesion={s} />
                ))}
              </div>
            )}

            {sesiones.some((s) => s.estado === "EN_PROGRESO") && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] tracking-[0.2em] text-white/30">
                  SESIONES EN PROGRESO
                </p>
                <div className="space-y-2">
                  {sesiones
                    .filter((s) => s.estado === "EN_PROGRESO")
                    .map((s) => (
                      <SesionCard key={s.id} sesion={s} />
                    ))}
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default PanelMetricasUmbral;

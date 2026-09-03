/**
 * Vendedor Capa 1 — Triage determinista Código + Planeta.
 * Público (sin login). Persiste fijación para fase de llamadas.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  VENDEDOR_TRIAGE_PREGUNTAS,
  opcionesMatizParaPlaneta,
  resolverTriageVendedor,
  type FijacionVendedor,
  type VendedorTriageOpcion,
} from "@shared/vendedor/triageLogic";
import {
  fijacionDesdeEntradaComercial,
  parseEntradaComercialSearch,
} from "@shared/vendedor/entradaComercial";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";
import {
  saveFijacionVendedor,
  withSellerRef,
} from "@/lib/vendedorFijacion";

const GOLD = "#D4AF37";

export default function VendedorTriagePage() {
  const [, setLocation] = useLocation();
  const [paso, setPaso] = useState(0);
  const [grietaPick, setGrietaPick] = useState<VendedorTriageOpcion | null>(
    null,
  );
  const [fijacion, setFijacion] = useState<FijacionVendedor | null>(null);
  const [telefono, setTelefono] = useState("");
  const [callLoading, setCallLoading] = useState(false);
  const [callDone, setCallDone] = useState(false);
  const [callStatusMsg, setCallStatusMsg] = useState<string | null>(null);
  const llamameRef = useRef<HTMLDivElement>(null);
  const callInFlight = useRef(false);
  const entradaAplicada = useRef(false);

  const sellerRef = useMemo(() => {
    captureSellerRefFromUrl(window.location.search);
    return getSellerRef();
  }, []);

  useEffect(() => {
    if (entradaAplicada.current) return;
    const parsed = parseEntradaComercialSearch(window.location.search);
    if (!parsed) return;
    entradaAplicada.current = true;
    const fij = fijacionDesdeEntradaComercial(parsed.planeta, parsed.codigo);
    saveFijacionVendedor(fij);
    setFijacion(fij);
    setPaso(2);
  }, []);

  const preguntaGrieta = VENDEDOR_TRIAGE_PREGUNTAS[0];
  const opcionesMatiz = grietaPick
    ? opcionesMatizParaPlaneta(grietaPick.planeta)
    : [];

  useEffect(() => {
    if (paso === 2 && fijacion) {
      window.setTimeout(() => {
        llamameRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 280);
    }
  }, [paso, fijacion]);

  function elegirGrieta(op: VendedorTriageOpcion) {
    setGrietaPick(op);
    setFijacion(null);
    setPaso(1);
  }

  function elegirMatiz(op: VendedorTriageOpcion) {
    try {
      if (!grietaPick) {
        toast.error("Vuelve a la pregunta 1 e intenta de nuevo.");
        setPaso(0);
        return;
      }
      const result = resolverTriageVendedor([grietaPick, op]);
      saveFijacionVendedor(result);
      setFijacion(result);
      setPaso(2);
    } catch (e: unknown) {
      console.error("[vendedor] elegirMatiz", e);
      toast.error("No se pudo fijar el diagnóstico. Intenta otra opción.");
    }
  }

  function reiniciar() {
    setGrietaPick(null);
    setFijacion(null);
    setPaso(0);
    setTelefono("");
    setCallDone(false);
    setCallStatusMsg(null);
    entradaAplicada.current = true;
    const keepRef = sellerRef
      ? `?ref=${encodeURIComponent(sellerRef)}`
      : "";
    if (/[?&]planeta=/.test(window.location.search)) {
      setLocation(`/vendedor${keepRef}`);
    }
  }

  async function solicitarLlamada() {
    if (!fijacion || callLoading || callDone || callInFlight.current) return;
    const tel = telefono.trim();
    if (!tel) {
      setCallStatusMsg("Escribe tu número primero.");
      toast.error("Escribe tu número primero.");
      return;
    }
    callInFlight.current = true;
    setCallLoading(true);
    setCallStatusMsg("Contactando Twilio…");
    try {
      const res = await fetch("/api/vendedor/solicitar-llamada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: tel,
          whatsapp: tel,
          codigo: fijacion.codigo,
          planeta: fijacion.planeta,
          sellerRef: sellerRef || undefined,
          consentimiento: "llamame",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      const bothFailed = !data.voiceOk && !data.whatsappOk;
      const msg =
        (bothFailed &&
          (data.voiceError || data.errorDetail || data.message)) ||
        data.message ||
        (data.voiceOk
          ? "Llamada iniciada."
          : "Solicitud registrada.");
      setCallStatusMsg(msg);
      if (bothFailed) {
        // No marcar done: permite reintentar tras verificar número / ContentSid.
        toast.error(msg);
      } else {
        setCallDone(true);
        toast.success(data.message || msg);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "No se pudo solicitar";
      setCallStatusMsg(err);
      toast.error(err);
    } finally {
      callInFlight.current = false;
      setCallLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="vendedor-triage-page"
    >
      <div className="relative mx-auto max-w-xl px-4 py-8 pb-32 sm:py-12">
        <p
          className="text-[12px] tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          SISTEMICAR · VENDEDOR
        </p>
        <h1
          className="mt-2 text-3xl font-black text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          ¿Por dónde entras?
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Dos preguntas. Toca una opción en cada paso — fijamos Código y Planeta.
        </p>
        {sellerRef && (
          <p className="mt-2 text-[10px] tracking-widest text-white/35">
            REF · {sellerRef}
          </p>
        )}

        {paso === 0 && (
          <motion.section
            key="grieta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-3"
            data-testid="vendedor-pregunta-grieta"
          >
            <p className="text-[10px] tracking-[0.2em] text-white/40">
              PREGUNTA 1 / 2
            </p>
            <h2 className="text-lg font-bold text-white/90">
              {preguntaGrieta.pregunta}
            </h2>
            <p className="text-[11px] text-white/35">Toca una opción para continuar</p>
            <div className="space-y-2">
              {preguntaGrieta.opciones.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onPointerUp={(e) => {
                    e.preventDefault();
                    elegirGrieta(op);
                  }}
                  onClick={() => elegirGrieta(op)}
                  className="w-full border px-4 py-3.5 text-left text-sm transition-colors active:scale-[0.99] hover:border-white/30 touch-manipulation"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.4)",
                    color: "rgba(255,255,255,0.8)",
                    WebkitTapHighlightColor: "rgba(212,175,55,0.25)",
                  }}
                  data-testid={`vendedor-opcion-${op.id}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {paso === 1 && grietaPick && (
          <motion.section
            key="matiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-3"
            data-testid="vendedor-pregunta-matiz"
          >
            <p className="text-[10px] tracking-[0.2em] text-white/40">
              PREGUNTA 2 / 2 ·{" "}
              <span style={{ color: GOLD }}>{grietaPick.planeta}</span>
            </p>
            <h2 className="text-lg font-bold text-white/90">
              ¿Cuál te describe mejor hoy?
            </h2>
            <p className="text-[11px] text-white/35">
              Toca una opción → verás tu planeta y el botón Llámame
            </p>
            <div className="space-y-2">
              {opcionesMatiz.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onPointerUp={(e) => {
                    e.preventDefault();
                    elegirMatiz(op);
                  }}
                  onClick={() => elegirMatiz(op)}
                  className="w-full border px-4 py-3.5 text-left text-sm transition-colors active:scale-[0.99] hover:border-white/30 touch-manipulation"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.4)",
                    color: "rgba(255,255,255,0.8)",
                    WebkitTapHighlightColor: "rgba(212,175,55,0.25)",
                  }}
                  data-testid={`vendedor-opcion-${op.id}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setPaso(0);
                setFijacion(null);
              }}
              className="text-[11px] tracking-widest text-white/35 hover:text-white/60"
            >
              ← ANTERIOR
            </button>
          </motion.section>
        )}

        {paso === 2 && fijacion && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
            data-testid="vendedor-fijacion"
          >
            <div
              className="border-2 p-5"
              style={{
                borderColor: `${fijacion.color}77`,
                background: `${fijacion.color}10`,
              }}
            >
              <p
                className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
                style={{ color: fijacion.color }}
              >
                <Crosshair size={14} />
                CÓDIGO + PLANETA FIJADOS
              </p>
              <h2
                className="mt-2 text-2xl font-black text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {fijacion.planetaLabel}
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Código {fijacion.codigo}
                {fijacion.arquetipoNombre
                  ? ` · ${fijacion.arquetipoNombre}`
                  : ""}
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                {fijacion.nombreCodigo}
              </p>
            </div>

            {/* Llámame arriba en móvil — no queda bajo el pliegue */}
            <div
              ref={llamameRef}
              className="border p-4 space-y-3"
              style={{
                borderColor: `${GOLD}66`,
                background: `${GOLD}12`,
              }}
              data-testid="vendedor-llamame"
            >
              <p
                className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
                style={{ color: GOLD }}
              >
                <Phone size={14} />
                LLÁMAME · VENDEDOR ALGORÍTMICO
              </p>
              <p className="text-[12px] text-white/55 leading-relaxed">
                Deja tu número. Primero te llamamos por teléfono; si no
                contestas, WhatsApp. En la llamada marca <span className="text-white/80">1</span> o{" "}
                <span className="text-white/80">2</span> para responder a la
                vendedora.
                {callStatusMsg && /21219|verificad|trial/i.test(callStatusMsg) ? (
                  <span className="block mt-2 text-[#FCA5A5]/55">
                    Si Twilio está en trial: el +51 debe estar en Verified Caller
                    IDs (o sube la cuenta a paga). Geo Permissions no alcanza.
                  </span>
                ) : null}
              </p>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 918260514 o +51…"
                className="w-full px-3 py-3 bg-black/50 border border-white/15 text-sm text-white"
                data-testid="vendedor-telefono"
                disabled={callDone || callLoading}
                autoComplete="tel"
              />
              <button
                type="button"
                disabled={callDone || callLoading || !telefono.trim()}
                onPointerUp={(e) => {
                  e.preventDefault();
                  void solicitarLlamada();
                }}
                onClick={() => void solicitarLlamada()}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[13px] font-black tracking-[0.14em] disabled:opacity-40 touch-manipulation"
                style={{
                  background: callDone ? "rgba(255,255,255,0.08)" : GOLD,
                  color: callDone ? GOLD : "#0A0A0A",
                  WebkitTapHighlightColor: "rgba(212,175,55,0.35)",
                }}
                data-testid="vendedor-btn-llamame"
              >
                <Phone size={16} />
                {callDone
                  ? "SOLICITUD ENVIADA"
                  : callLoading
                    ? "ENVIANDO…"
                    : "LLÁMAME"}
              </button>
              {callStatusMsg && (
                <p
                  className="text-[12px] leading-relaxed"
                  style={{
                    color: callDone
                      ? "#86EFAC"
                      : /ContentSid|plantilla|fall|Twilio|voz:/i.test(
                            callStatusMsg,
                          )
                        ? "#FCA5A5"
                        : GOLD,
                  }}
                  data-testid="vendedor-call-status"
                >
                  {callStatusMsg}
                </p>
              )}
            </div>

            <Link
              href={withSellerRef(fijacion.trialHref, sellerRef)}
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[12px] font-bold tracking-[0.14em]"
              style={{
                background: `linear-gradient(90deg, ${fijacion.color}22, ${GOLD}18)`,
                border: `1px solid ${fijacion.color}66`,
                color: fijacion.color,
              }}
              data-testid="vendedor-cta-trial"
            >
              {fijacion.trialLabel}
              <ArrowRight size={14} />
            </Link>

            <Link
              href={withSellerRef(fijacion.checkoutHref, sellerRef)}
              className="flex w-full items-center justify-center gap-2 border px-4 py-3 text-[11px] tracking-widest"
              style={{ borderColor: `${GOLD}66`, color: GOLD }}
              data-testid="vendedor-cta-checkout"
            >
              {fijacion.checkoutLabel}
            </Link>

            <div
              className="border p-3"
              style={{
                borderColor: `${fijacion.color}44`,
                background: "rgba(0,0,0,0.35)",
              }}
            >
              <p
                className="text-[10px] tracking-widest"
                style={{ color: fijacion.color }}
              >
                GRIETA
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                {fijacion.grieta}
              </p>
              <p
                className="mt-3 text-[10px] tracking-widest"
                style={{ color: GOLD }}
              >
                PREGUNTA DISPARADORA
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                {fijacion.preguntaDisparadora}
              </p>
            </div>

            <button
              type="button"
              onClick={reiniciar}
              className="flex w-full items-center justify-center gap-2 text-[11px] tracking-widest text-white/35 hover:text-white/60"
              data-testid="vendedor-rehacer"
            >
              <RotateCcw size={12} />
              REHACER DIAGNÓSTICO
            </button>

            <p className="text-center text-[10px] text-white/25">
              SISTEMICAR · puerta de entrada por Código
            </p>
          </motion.section>
        )}
      </div>
    </div>
  );
}

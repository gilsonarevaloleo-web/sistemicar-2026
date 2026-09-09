/**
 * Vendedor Capa 1 — Jornada Base, códigos 1 / 2 / 3.
 * Público (sin login). Persiste fijación para la llamada y el enlace de pago.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Copy, ExternalLink, MessageCircle, Phone, RotateCcw } from "lucide-react";
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
  buildWhatsAppClickToChatHref,
  enlacePagoJornadaBase,
  mensajeEnlacePagoWhatsapp,
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
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkDone, setLinkDone] = useState(false);
  const [linkStatusMsg, setLinkStatusMsg] = useState<string | null>(null);
  const [fallbackDeepLink, setFallbackDeepLink] = useState<string | null>(null);
  const [fallbackShareHref, setFallbackShareHref] = useState<string | null>(
    null,
  );
  const llamameRef = useRef<HTMLDivElement>(null);
  const callInFlight = useRef(false);
  const linkInFlight = useRef(false);
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
        toast.error("Vuelve un paso atrás e inténtalo de nuevo.");
        setPaso(0);
        return;
      }
      const result = resolverTriageVendedor([grietaPick, op]);
      saveFijacionVendedor(result);
      setFijacion(result);
      setPaso(2);
    } catch (e: unknown) {
      console.error("[vendedor] elegirMatiz", e);
      toast.error("No se pudo guardar. Prueba otra opción.");
    }
  }

  function reiniciar() {
    setGrietaPick(null);
    setFijacion(null);
    setPaso(0);
    setTelefono("");
    setCallDone(false);
    setCallStatusMsg(null);
    setLinkDone(false);
    setLinkStatusMsg(null);
    setFallbackDeepLink(null);
    setFallbackShareHref(null);
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
    setCallStatusMsg("Te estoy marcando…");
    try {
      const res = await fetch("/api/vendedor/solicitar-llamada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: tel,
          whatsapp: tel,
          codigo: fijacion.codigo,
          planeta: "JORNADA",
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
          ? "Ya te estoy llamando."
          : "Solicitud registrada.");
      setCallStatusMsg(msg);
      if (bothFailed) {
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

  async function enviarEnlacePago() {
    if (!fijacion || linkLoading || linkDone || linkInFlight.current) return;
    const tel = telefono.trim();
    if (!tel) {
      setLinkStatusMsg("Escribe tu WhatsApp primero.");
      toast.error("Escribe tu WhatsApp primero.");
      return;
    }
    linkInFlight.current = true;
    setLinkLoading(true);
    setLinkStatusMsg("Mandando el enlace…");
    try {
      const res = await fetch("/api/vendedor/enviar-enlace-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: tel,
          whatsapp: tel,
          codigo: fijacion.codigo,
          planeta: "JORNADA",
          sellerRef: sellerRef || undefined,
          consentimiento: "enlace-pago",
        }),
      });
      const data = await res.json();
      const localDeep = enlacePagoJornadaBase(sellerRef);
      const deepLink =
        (typeof data.deepLink === "string" && data.deepLink) || localDeep;
      const shareHref =
        (typeof data.shareHref === "string" && data.shareHref) ||
        buildWhatsAppClickToChatHref(
          tel,
          mensajeEnlacePagoWhatsapp(deepLink, sellerRef),
        );
      setFallbackDeepLink(deepLink);
      setFallbackShareHref(shareHref);
      if (!res.ok) throw new Error(data.error || "Error");
      const msg = data.message || "Te mandé el enlace por WhatsApp.";
      setLinkStatusMsg(msg);
      if (data.whatsappOk) {
        setLinkDone(true);
        toast.success(msg);
      } else {
        toast.error("Twilio no pudo mandar el WhatsApp. Usa el enlace de abajo.");
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "No se pudo enviar";
      setLinkStatusMsg(err);
      toast.error(err);
      if (!fallbackDeepLink) {
        const localDeep = enlacePagoJornadaBase(sellerRef);
        setFallbackDeepLink(localDeep);
        setFallbackShareHref(
          buildWhatsAppClickToChatHref(
            tel,
            mensajeEnlacePagoWhatsapp(localDeep, sellerRef),
          ),
        );
      }
    } finally {
      linkInFlight.current = false;
      setLinkLoading(false);
    }
  }

  async function copiarEnlacePago() {
    const href = fallbackDeepLink || enlacePagoJornadaBase(sellerRef);
    try {
      await navigator.clipboard.writeText(href);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar. Ábrelo con el botón.");
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
          SISTEMICAR · JORNADA BASE
        </p>
        <h1
          className="mt-2 text-3xl font-black text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          ¿Qué te está costando el día?
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Dos toques. Con eso te dejo el camino a Jornada Base.
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
            <p className="text-[11px] text-white/35">
              Elige la que más se te parece hoy
            </p>
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
              PREGUNTA 2 / 2
            </p>
            <h2 className="text-lg font-bold text-white/90">
              ¿En qué se te nota más hoy?
            </h2>
            <p className="text-[11px] text-white/35">
              Un toque más y te digo cómo seguir
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
                className="text-[10px] tracking-[0.2em]"
                style={{ color: fijacion.color }}
              >
                JORNADA BASE
              </p>
              <h2
                className="mt-2 text-2xl font-black text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Por aquí se entra
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {fijacion.resumenHumano}
              </p>
              <p className="mt-2 text-[12px] text-white/45 leading-relaxed">
                No es otra lista. Mides lo que cierras hoy y el día termina con
                evidencia.
              </p>
            </div>

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
                ¿TE LLAMO O TE MANDO EL ENLACE?
              </p>
              <p className="text-[12px] text-white/55 leading-relaxed">
                Déjame tu WhatsApp. Te hablo un minuto — o, si prefieres, te
                mando ahora el enlace de pago. En la llamada puedes marcar{" "}
                <span className="text-white/80">1</span> o decir «sí».
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
                placeholder="Tu WhatsApp. Ej. 918260514"
                className="w-full px-3 py-3 bg-black/50 border border-white/15 text-sm text-white"
                data-testid="vendedor-telefono"
                disabled={(callDone && linkDone) || callLoading || linkLoading}
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
                  ? "YA TE ESTOY LLAMANDO"
                  : callLoading
                    ? "MARCANDO…"
                    : "LLÁMAME"}
              </button>
              <button
                type="button"
                disabled={linkDone || linkLoading || !telefono.trim()}
                onPointerUp={(e) => {
                  e.preventDefault();
                  void enviarEnlacePago();
                }}
                onClick={() => void enviarEnlacePago()}
                className="flex w-full items-center justify-center gap-2 border px-4 py-3 text-[12px] font-bold tracking-[0.08em] disabled:opacity-40 touch-manipulation"
                style={{
                  borderColor: `${GOLD}88`,
                  color: GOLD,
                  background: "rgba(0,0,0,0.25)",
                  WebkitTapHighlightColor: "rgba(212,175,55,0.35)",
                }}
                data-testid="vendedor-btn-enlace-whatsapp"
              >
                <MessageCircle size={16} />
                {linkDone
                  ? "ENLACE ENVIADO"
                  : linkLoading
                    ? "ENVIANDO…"
                    : "MÁNDAME EL ENLACE POR WHATSAPP"}
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
              {linkStatusMsg && (
                <p
                  className="text-[12px] leading-relaxed"
                  style={{
                    color: linkDone
                      ? "#86EFAC"
                      : linkLoading
                        ? GOLD
                        : "#FCA5A5",
                  }}
                  data-testid="vendedor-link-status"
                >
                  {linkStatusMsg}
                </p>
              )}
              {fallbackDeepLink && !linkDone && !linkLoading && (
                <div
                  className="space-y-2 border p-3"
                  style={{
                    borderColor: `${GOLD}55`,
                    background: "rgba(0,0,0,0.35)",
                  }}
                  data-testid="vendedor-enlace-fallback"
                >
                  <p className="text-[11px] leading-relaxed text-white/70">
                    El enlace de Jornada Base, para entregarlo ahora:
                  </p>
                  <p
                    className="break-all text-[11px] text-white/85"
                    data-testid="vendedor-enlace-fallback-url"
                  >
                    {fallbackDeepLink}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href={fallbackDeepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-bold tracking-widest"
                      style={{ background: GOLD, color: "#0A0A0A" }}
                      data-testid="vendedor-btn-abrir-pago"
                    >
                      <ExternalLink size={14} />
                      ABRIR PAGO
                    </a>
                    <button
                      type="button"
                      onClick={() => void copiarEnlacePago()}
                      className="flex flex-1 items-center justify-center gap-2 border px-3 py-2.5 text-[11px] font-bold tracking-widest"
                      style={{ borderColor: `${GOLD}88`, color: GOLD }}
                      data-testid="vendedor-btn-copiar-enlace"
                    >
                      <Copy size={14} />
                      COPIAR
                    </button>
                  </div>
                  {fallbackShareHref && (
                    <a
                      href={fallbackShareHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 border px-3 py-2.5 text-[11px] font-bold tracking-widest"
                      style={{
                        borderColor: `${GOLD}88`,
                        color: GOLD,
                        background: "rgba(0,0,0,0.2)",
                      }}
                      data-testid="vendedor-btn-wa-manual"
                    >
                      <MessageCircle size={14} />
                      MANDARLO DESDE TU WHATSAPP
                    </a>
                  )}
                </div>
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

            <button
              type="button"
              onClick={reiniciar}
              className="flex w-full items-center justify-center gap-2 text-[11px] tracking-widest text-white/35 hover:text-white/60"
              data-testid="vendedor-rehacer"
            >
              <RotateCcw size={12} />
              EMPEZAR DE NUEVO
            </button>

            <p className="text-center text-[10px] text-white/25">
              SISTEMICAR · Jornada Base
            </p>
          </motion.section>
        )}
      </div>
    </div>
  );
}

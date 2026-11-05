/**
 * Carta corta de Jornada Base para tráfico frío.
 * Público (sin login). Destino único: checkout Base.
 *
 * Enlaces nativos `<a href>` — no wouter Link.
 * En Android el Link de SPA hace preventDefault; si el hilo está ocupado
 * el toque no navega y la página se ve congelada.
 */

import { useEffect, useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  CARTA_FRIA_BENEFICIOS,
  CARTA_FRIA_CAPTURA,
  CARTA_FRIA_CIERRE,
  CARTA_FRIA_CTA,
  CARTA_FRIA_CTA_PRECIO,
  CARTA_FRIA_KICKER,
  CARTA_FRIA_PASOS,
  CARTA_FRIA_PRECIO_LINE,
  CARTA_FRIA_PROBLEMA,
  CARTA_FRIA_SOLUCION,
  CARTA_FRIA_SUBTITULAR,
  CARTA_FRIA_TITULAR,
} from "@shared/jornadaCartaFria";
import {
  PAGOS_JORNADA_BASE_HREF,
  withTrackedQuery,
} from "@shared/vendedor/entradaComercial";
import { captureAdAttributionFromUrl, getAdVideoLabel } from "@/lib/adAttribution";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";
import { trackJornadaViewContent } from "@/lib/metaPixel";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";

function CtaActivar({
  href,
  testId,
}: {
  href: string;
  testId: string;
}) {
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[13px] font-black tracking-[0.12em] touch-manipulation"
      style={{
        background: GOLD,
        color: "#0A0A0A",
        WebkitTapHighlightColor: "rgba(212,175,55,0.35)",
      }}
      data-testid={testId}
    >
      {`${CARTA_FRIA_CTA.toUpperCase()} — ${CARTA_FRIA_CTA_PRECIO}`}
      <ArrowRight size={14} />
    </a>
  );
}

function CapturaPegado({ showFormula }: { showFormula?: boolean }) {
  return (
    <figure
      className="overflow-hidden border"
      style={{ borderColor: `${GOLD}44`, background: "#071014" }}
      data-testid={showFormula ? "jornada-base-captura-formula" : "jornada-base-captura-hero"}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: "rgba(0,255,195,0.06)", borderBottom: "1px solid rgba(0,255,195,0.18)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center text-[9px] font-black"
            style={{ background: CYAN, color: "#04110D" }}
          >
            ▶
          </span>
          <p className="truncate text-sm font-black text-white">
            {CARTA_FRIA_CAPTURA.tarea}
          </p>
        </div>
        <p className="shrink-0 text-[10px] font-bold tracking-widest" style={{ color: CYAN }}>
          EN VIVO
        </p>
      </div>
      <div className="space-y-3 px-4 py-5">
        <p
          className="text-center text-[2.35rem] font-black tabular-nums leading-none tracking-wider"
          style={{ color: CYAN, fontFamily: "ui-monospace, monospace" }}
        >
          {CARTA_FRIA_CAPTURA.timer}
        </p>
        <p className="text-center text-[12px] font-bold tracking-wide text-white/70">
          {CARTA_FRIA_CAPTURA.restantes}
        </p>
        {showFormula ? (
          <p
            className="text-center text-[12px] font-mono font-bold"
            style={{ color: "rgba(255,255,255,0.88)" }}
          >
            <span style={{ color: CYAN }}>18 u</span>
            {" × "}
            <span style={{ color: CYAN }}>0.5 min/u</span>
            {" = "}
            <span style={{ color: GOLD }}>10 min obj</span>
          </p>
        ) : null}
        <div
          className="flex items-center justify-between px-1 pt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "#6EE7B7" }}>
              Termina a las
            </p>
            <p
              className="text-lg font-black tabular-nums"
              style={{ color: CYAN, fontFamily: "ui-monospace, monospace" }}
            >
              {CARTA_FRIA_CAPTURA.termina}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/45">
              Ahora
            </p>
            <p className="text-[12px] font-black" style={{ color: "#00C851" }}>
              ganando
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}

export default function JornadaBaseLanding() {
  const sellerRef = useMemo(() => {
    captureSellerRefFromUrl(window.location.search);
    captureAdAttributionFromUrl(window.location.search);
    return getSellerRef();
  }, []);
  const videoLabel = useMemo(() => getAdVideoLabel(), []);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const pagosHref = withTrackedQuery(PAGOS_JORNADA_BASE_HREF, search);

  useEffect(() => {
    trackJornadaViewContent();
  }, []);

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="jornada-base-page"
    >
      <div className="relative z-10 mx-auto max-w-xl px-4 py-8 pb-32 sm:py-12">
        <p className="text-[12px] tracking-[0.22em]" style={{ color: GOLD }}>
          {CARTA_FRIA_KICKER}
        </p>
        <h1
          className="mt-3 text-[1.85rem] font-black leading-tight text-white sm:text-4xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          data-testid="jornada-base-headline"
        >
          {CARTA_FRIA_TITULAR}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          {CARTA_FRIA_SUBTITULAR}
        </p>
        {(sellerRef || videoLabel) && (
          <p
            className="mt-2 text-[10px] tracking-widest text-white/35"
            data-testid="jornada-base-attribution"
          >
            {videoLabel ? `ANUNCIO · ${videoLabel}` : null}
            {videoLabel && sellerRef ? " · " : null}
            {sellerRef ? `REF · ${sellerRef}` : null}
          </p>
        )}

        <div className="mt-7">
          <CapturaPegado />
        </div>

        <div className="mt-6">
          <CtaActivar href={pagosHref} testId="jornada-base-cta-hero" />
        </div>

        <section className="mt-12">
          <p className="text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
            {CARTA_FRIA_PROBLEMA.label.toUpperCase()}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_FRIA_PROBLEMA.lead}
          </p>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-white">
            {CARTA_FRIA_PROBLEMA.numeros}
          </p>
        </section>

        <section className="mt-12">
          <p className="text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
            {CARTA_FRIA_SOLUCION.label.toUpperCase()}
          </p>
          <p
            className="mt-3 text-lg font-black leading-snug text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {CARTA_FRIA_SOLUCION.text}
          </p>
        </section>

        <section className="mt-12">
          <p className="text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
            CÓMO FUNCIONA
          </p>
          <ol className="mt-4 space-y-3">
            {CARTA_FRIA_PASOS.map((paso) => (
              <li
                key={paso.n}
                className="border p-4"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <p className="text-[11px] tracking-[0.16em]" style={{ color: GOLD }}>
                  {String(paso.n).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {paso.text}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <CapturaPegado showFormula />
          </div>
        </section>

        <section className="mt-12 border p-5" style={{ borderColor: `${GOLD}55` }}>
          <p className="text-[10px] tracking-[0.2em]" style={{ color: GOLD }}>
            PRECIO
          </p>
          <p
            className="mt-3 text-2xl font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {CARTA_FRIA_PRECIO_LINE}
          </p>
          <ul className="mt-5 space-y-2.5">
            {CARTA_FRIA_BENEFICIOS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/80">
                <Check size={16} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <CtaActivar href={pagosHref} testId="jornada-base-cta-final" />
          </div>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-white/45">
            {CARTA_FRIA_CIERRE}
          </p>
        </section>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t px-4 py-3"
        style={{
          borderColor: `${GOLD}33`,
          background: "rgba(5,5,5,0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mx-auto max-w-xl">
          <CtaActivar href={pagosHref} testId="jornada-base-cta-sticky" />
        </div>
      </div>
    </div>
  );
}

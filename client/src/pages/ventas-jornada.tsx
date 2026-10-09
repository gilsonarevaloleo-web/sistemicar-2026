/**
 * Carta de venta de Jornada Base.
 * Público (sin login). Destino: checkout Base o vendedor.
 *
 * Enlaces nativos `<a href>` — no wouter Link.
 * En Android el Link de SPA hace preventDefault; si el hilo está ocupado
 * el toque no navega y la página se ve congelada.
 */

import { useEffect, useMemo } from "react";
import { ArrowRight, Phone } from "lucide-react";
import {
  CARTA_CIERRE,
  CARTA_CTA_BASE,
  CARTA_CTA_FINAL,
  CARTA_CTA_VENDEDOR,
  CARTA_DIAGNOSTICO,
  CARTA_DILACION,
  CARTA_ESCALERA,
  CARTA_FRICCION,
  CARTA_KICKER,
  CARTA_PRECIO_BASE_PEN,
  CARTA_SUBTITULAR,
  CARTA_TELEMETRIA,
  CARTA_TITULAR,
  formatUsdMes,
  type EscaleraTier,
} from "@shared/jornadaCartaVenta";
import {
  PAGOS_JORNADA_BASE_HREF,
  VENDEDOR_JORNADA_ADS_HREF,
  withTrackedQuery,
} from "@shared/vendedor/entradaComercial";
import { captureAdAttributionFromUrl, getAdVideoLabel } from "@/lib/adAttribution";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";
import { trackJornadaViewContent } from "@/lib/metaPixel";

const GOLD = "#D4AF37";

function CtaActivar({
  href,
  label,
  testId,
}: {
  href: string;
  label: string;
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
      {label}
      <ArrowRight size={14} />
    </a>
  );
}

function CtaVendedor({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 border px-4 py-3 text-[12px] font-bold tracking-[0.12em] touch-manipulation"
      style={{ borderColor: `${GOLD}66`, color: GOLD }}
      data-testid="ventas-jornada-cta-vendedor"
    >
      <Phone size={16} />
      {CARTA_CTA_VENDEDOR.toUpperCase()}
    </a>
  );
}

function EscaleraCard({
  tier,
  pagosHref,
}: {
  tier: EscaleraTier;
  pagosHref: string;
}) {
  const highlighted = tier.buyable;
  return (
    <article
      className="border p-4"
      style={{
        borderColor: highlighted ? `${GOLD}88` : "rgba(255,255,255,0.12)",
        background: highlighted ? `${GOLD}14` : "rgba(255,255,255,0.03)",
      }}
      data-testid={`ventas-jornada-escalera-${tier.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] tracking-[0.18em]"
            style={{ color: highlighted ? GOLD : "rgba(255,255,255,0.4)" }}
          >
            {highlighted ? "PELDAÑO 1 · SE COMPRA AQUÍ" : "ANCLA · DESPUÉS"}
          </p>
          <h3
            className="mt-1 text-lg font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {tier.name}
          </h3>
        </div>
        <p className="shrink-0 text-right text-lg font-black text-white">
          {formatUsdMes(tier.priceUsd)}
        </p>
      </div>
      {tier.badge ? (
        <p className="mt-1 text-[11px]" style={{ color: GOLD }}>
          {tier.badge}
        </p>
      ) : null}
      {tier.afterNote ? (
        <p className="mt-1 text-[11px] text-white/40">{tier.afterNote}</p>
      ) : null}
      <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/75">
        {tier.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {highlighted ? (
        <div className="mt-4">
          <CtaActivar
            href={pagosHref}
            label={`${CARTA_CTA_BASE.toUpperCase()} · ${formatUsdMes(tier.priceUsd)}`}
            testId="ventas-jornada-cta-pagos"
          />
        </div>
      ) : null}
    </article>
  );
}

export default function VentasJornada() {
  const sellerRef = useMemo(() => {
    captureSellerRefFromUrl(window.location.search);
    captureAdAttributionFromUrl(window.location.search);
    return getSellerRef();
  }, []);
  const videoLabel = useMemo(() => getAdVideoLabel(), []);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const vendedorHref = withTrackedQuery(VENDEDOR_JORNADA_ADS_HREF, search);
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
      data-testid="ventas-jornada-page"
    >
      <div className="relative z-10 mx-auto max-w-xl px-4 py-8 pb-32 sm:py-12">
        <p className="text-[12px] tracking-[0.22em]" style={{ color: GOLD }}>
          {CARTA_KICKER}
        </p>
        <h1
          className="mt-3 text-[1.85rem] font-black leading-tight text-white sm:text-4xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          data-testid="ventas-jornada-headline"
        >
          {CARTA_TITULAR}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          {CARTA_SUBTITULAR}
        </p>
        {(sellerRef || videoLabel) && (
          <p
            className="mt-2 text-[10px] tracking-widest text-white/35"
            data-testid="ventas-jornada-attribution"
          >
            {videoLabel ? `ANUNCIO · ${videoLabel}` : null}
            {videoLabel && sellerRef ? " · " : null}
            {sellerRef ? `REF · ${sellerRef}` : null}
          </p>
        )}

        <div className="mt-7 space-y-3">
          <CtaActivar
            href={pagosHref}
            label={`${CARTA_CTA_BASE.toUpperCase()} · ${formatUsdMes(CARTA_ESCALERA[0].priceUsd)}`}
            testId="ventas-jornada-cta-hero"
          />
          <CtaVendedor href={vendedorHref} />
        </div>

        <section className="mt-12">
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {CARTA_DIAGNOSTICO.label.toUpperCase()}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_DIAGNOSTICO.lead}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {CARTA_DIAGNOSTICO.mancha}
          </p>
          <p
            className="mt-5 text-base font-semibold leading-snug text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {CARTA_DIAGNOSTICO.pregunta}
          </p>
          <div className="mt-4 grid gap-3">
            {CARTA_DIAGNOSTICO.contrast.map((row) => (
              <div
                key={row.side}
                className="border p-4"
                style={{
                  borderColor:
                    row.side === "jornada"
                      ? `${GOLD}66`
                      : "rgba(255,255,255,0.12)",
                  background:
                    row.side === "jornada"
                      ? `${GOLD}10`
                      : "rgba(255,255,255,0.03)",
                }}
              >
                <p
                  className="text-[10px] tracking-[0.16em]"
                  style={{
                    color: row.side === "jornada" ? GOLD : "rgba(255,255,255,0.4)",
                  }}
                >
                  {row.title.toUpperCase()}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {row.text}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {CARTA_DIAGNOSTICO.close}
          </p>
        </section>

        <section className="mt-12">
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {CARTA_TELEMETRIA.label.toUpperCase()}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_TELEMETRIA.lead}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {CARTA_TELEMETRIA.numeros}
          </p>
          <p className="mt-5 text-sm font-semibold text-white">
            {CARTA_TELEMETRIA.marco}
          </p>
          <ol className="mt-4 space-y-3">
            {CARTA_TELEMETRIA.instrumentos.map((item, index) => (
              <li
                key={item.name}
                className="border p-4"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <p className="text-[11px] tracking-[0.16em]" style={{ color: GOLD }}>
                  {String(index + 1).padStart(2, "0")} · {item.name.toUpperCase()}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {CARTA_FRICCION.label.toUpperCase()}
          </p>
          <h2
            className="mt-3 text-xl font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {CARTA_FRICCION.c6Title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_FRICCION.c6}
          </p>
          <blockquote
            className="mt-4 border-l-2 px-4 py-3 text-sm leading-relaxed text-white"
            style={{ borderColor: GOLD, background: `${GOLD}10` }}
          >
            {CARTA_FRICCION.prueba}
          </blockquote>
          <h2
            className="mt-8 text-xl font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {CARTA_FRICCION.c7Title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_FRICCION.c7}
          </p>
        </section>

        <section className="mt-12" data-testid="ventas-jornada-escalera">
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            IV · ESCALERA DE VALOR · SELECCIONA TU NIVEL
          </p>
          <p
            className="mt-3 text-xl font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Escalera de Jornadas
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            La entrada es Base. Ritmo y Dirección suben el ancla: se ofrecen
            después, cuando ya mides.
          </p>
          <div className="mt-5 space-y-3">
            {CARTA_ESCALERA.map((tier) => (
              <EscaleraCard
                key={tier.id}
                tier={tier}
                pagosHref={pagosHref}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {CARTA_DILACION.label.toUpperCase()}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_DILACION.lead}
          </p>
          <h2
            className="mt-6 text-xl font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {CARTA_DILACION.porQue}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {CARTA_DILACION.pacto}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {CARTA_DILACION.aliados}
          </p>
        </section>

        <section className="mt-12 border p-5" style={{ borderColor: `${GOLD}55` }}>
          <CtaActivar
            href={pagosHref}
            label={CARTA_CTA_FINAL.toUpperCase()}
            testId="ventas-jornada-cta-final"
          />
          <p className="mt-3 text-center text-sm text-white/70">
            {CARTA_CTA_BASE} · {formatUsdMes(CARTA_ESCALERA[0].priceUsd)} · ~S/{" "}
            {CARTA_PRECIO_BASE_PEN}
          </p>
          <div className="mt-4">
            <a
              href={vendedorHref}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] text-white/45 touch-manipulation"
            >
              {CARTA_CTA_VENDEDOR}
            </a>
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35">
            {CARTA_CIERRE}
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
          <CtaActivar
            href={pagosHref}
            label={`${CARTA_CTA_BASE.toUpperCase()} · ${formatUsdMes(CARTA_ESCALERA[0].priceUsd)}`}
            testId="ventas-jornada-cta-sticky"
          />
        </div>
      </div>
    </div>
  );
}

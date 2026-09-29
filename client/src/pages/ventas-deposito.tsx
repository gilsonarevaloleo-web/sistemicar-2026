/**
 * Landing Universidad — peldaño 1 Matrícula.
 * Público. Trial: 1 volcado G1. Después ${SKU_MATRICULA.priceUsd}/mes.
 */

import { useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { SKU_MATRICULA } from "@shared/depositoPricing";
import { withTrackedQuery } from "@shared/vendedor/entradaComercial";
import { captureAdAttributionFromUrl, getAdVideoLabel } from "@/lib/adAttribution";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";

const GOLD = "#D4AF37";
const ORANGE = "#F97316";

const TRIAL_HREF = "/acceso?next=/esperanza";
const PAGOS_HREF = SKU_MATRICULA.checkoutHref;

export default function VentasDeposito() {
  const sellerRef = useMemo(() => {
    captureSellerRefFromUrl(window.location.search);
    captureAdAttributionFromUrl(window.location.search);
    return getSellerRef();
  }, []);
  const videoLabel = useMemo(() => getAdVideoLabel(), []);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const trialHref = withTrackedQuery(TRIAL_HREF, search);
  const pagosHref = withTrackedQuery(PAGOS_HREF, search);

  useEffect(() => {
    /* ViewContent se dispara en /pagos al elegir el plan. */
  }, []);

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #1a120c 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="ventas-deposito-page"
    >
      <div className="relative z-10 mx-auto max-w-xl px-4 py-8 pb-28 sm:py-12">
        <p
          className="text-[12px] tracking-[0.22em]"
          style={{ color: ORANGE }}
        >
          SISTEMICAR · UNIVERSIDAD
        </p>
        <h1
          className="mt-3 text-[1.85rem] font-black leading-tight text-white sm:text-4xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          El día ya ocurrió. ¿Qué ojo estaba ciego?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Aprendiste algo. O no. El relato se evapora. La Universidad no te
          deja elegir código: volcás el día crudo y el Muro nombra UN ojo.
        </p>
        {(sellerRef || videoLabel) && (
          <p
            className="mt-2 text-[10px] tracking-widest text-white/35"
            data-testid="ventas-deposito-attribution"
          >
            {videoLabel ? `ANUNCIO · ${videoLabel}` : null}
            {videoLabel && sellerRef ? " · " : null}
            {sellerRef ? `REF · ${sellerRef}` : null}
          </p>
        )}

        <section
          className="mt-8 border p-5"
          style={{
            borderColor: `${ORANGE}55`,
            background: `${ORANGE}10`,
          }}
        >
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            VALOR 1 · MATRÍCULA
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-white/80">
            <li>Volcás el día. Crudo. Sin elegir eje.</li>
            <li>El Muro nombra UN ojo — no diez opiniones.</li>
            <li>Sales con punto ciego y una mecánica para mañana.</li>
          </ul>
          <p className="mt-4 text-2xl font-black text-white">
            1 volcado gratis
            <span className="ml-2 text-sm font-normal text-white/45">
              después ${SKU_MATRICULA.priceUsd}/mes · ~S/ {SKU_MATRICULA.pricePen}
            </span>
          </p>
          <p className="mt-2 text-[12px] text-white/70">
            {SKU_MATRICULA.identity}
          </p>
          <p className="mt-1 text-[11px] text-white/40">
            Peldaño 1. Carrera (G2–G3) y Título (criterio vivo) vienen después.
          </p>
        </section>

        <div className="mt-6 space-y-3">
          <a
            href={trialHref}
            className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[13px] font-black tracking-[0.12em] touch-manipulation"
            style={{
              background: ORANGE,
              color: "#0A0A0A",
              WebkitTapHighlightColor: "rgba(249,115,22,0.35)",
            }}
            data-testid="ventas-deposito-cta-trial"
          >
            PROBAR UN VOLCADO
            <ArrowRight size={14} />
          </a>
          <a
            href={pagosHref}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] text-white/45 touch-manipulation"
            data-testid="ventas-deposito-cta-pagos"
          >
            Activar Matrícula · ${SKU_MATRICULA.priceUsd}/mes
          </a>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/30">
          Entras con un volcado de prueba. Después cobramos $
          {SKU_MATRICULA.priceUsd}/mes por seguir viendo.
          Carrera y Título se venden aparte, cuando el ojo ya no basta.
        </p>
      </div>
    </div>
  );
}

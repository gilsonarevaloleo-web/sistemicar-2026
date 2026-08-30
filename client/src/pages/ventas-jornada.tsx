/**
 * Landing del anuncio Jornada Base.
 * Público (sin login). Fija el destino al vendedor (planeta JORNADA) o al checkout Base.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Phone } from "lucide-react";
import { SKU_BASE } from "@shared/planificacionPricing";
import {
  PAGOS_JORNADA_BASE_HREF,
  VENDEDOR_JORNADA_ADS_HREF,
  withTrackedQuery,
} from "@shared/vendedor/entradaComercial";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";

const GOLD = "#D4AF37";

export default function VentasJornada() {
  const sellerRef = useMemo(() => {
    captureSellerRefFromUrl(window.location.search);
    return getSellerRef();
  }, []);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const vendedorHref = withTrackedQuery(VENDEDOR_JORNADA_ADS_HREF, search);
  const pagosHref = withTrackedQuery(PAGOS_JORNADA_BASE_HREF, search);

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="ventas-jornada-page"
    >
      <div className="relative mx-auto max-w-xl px-4 py-8 pb-28 sm:py-12">
        <p
          className="text-[12px] tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          SISTEMICAR · JORNADA BASE
        </p>
        <h1
          className="mt-3 text-[1.85rem] font-black leading-tight text-white sm:text-4xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          El día se te fue. ¿Cuántas unidades cerraste?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Trabajaste. Contestaste. Apagaste incendios. Al final no hay un
          número — solo la sensación de que el día se evaporó.
        </p>
        {sellerRef && (
          <p className="mt-2 text-[10px] tracking-widest text-white/35">
            REF · {sellerRef}
          </p>
        )}

        <section
          className="mt-8 border p-5"
          style={{
            borderColor: `${GOLD}55`,
            background: `${GOLD}10`,
          }}
        >
          <p
            className="text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            QUÉ HACE BASE
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-white/80">
            <li>Lanzas un bloque de trabajo — no otra lista infinita.</li>
            <li>Cierras unidades. Ocupado no cuenta.</li>
            <li>El día termina con evidencia, no con culpa.</li>
          </ul>
          <p className="mt-4 text-2xl font-black text-white">
            ${SKU_BASE.priceUsd}
            <span className="ml-2 text-sm font-normal text-white/45">
              /mes · ~S/ {SKU_BASE.pricePen}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-white/40">
            Peldaño 1. Ritmo y Norte vienen después, cuando ya mides.
          </p>
        </section>

        <div className="mt-6 space-y-3">
          <Link
            href={vendedorHref}
            className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[13px] font-black tracking-[0.12em]"
            style={{
              background: GOLD,
              color: "#0A0A0A",
              WebkitTapHighlightColor: "rgba(212,175,55,0.35)",
            }}
            data-testid="ventas-jornada-cta-vendedor"
          >
            <Phone size={16} />
            QUE ME LLAME EL VENDEDOR
          </Link>
          <Link
            href={pagosHref}
            className="flex w-full items-center justify-center gap-2 border px-4 py-3 text-[12px] font-bold tracking-[0.12em]"
            style={{ borderColor: `${GOLD}66`, color: GOLD }}
            data-testid="ventas-jornada-cta-pagos"
          >
            ACTIVAR JORNADA BASE
            <ArrowRight size={14} />
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/30">
          El vendedor ya sabe que vienes por Jornada. Dos toques y te llama.
          Si prefieres, pagas Base ahora.
        </p>
      </div>
    </div>
  );
}

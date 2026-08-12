/**
 * Vendedor Capa 1 — Triage determinista Código + Planeta.
 * Público (sin login). Persiste fijación para fase de llamadas.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, RotateCcw } from "lucide-react";
import {
  VENDEDOR_TRIAGE_PREGUNTAS,
  opcionesMatizParaPlaneta,
  resolverTriageVendedor,
  type VendedorTriageOpcion,
} from "@shared/vendedor/triageLogic";
import { captureSellerRefFromUrl, getSellerRef } from "@/lib/sellerRef";
import {
  saveFijacionVendedor,
  withSellerRef,
} from "@/lib/vendedorFijacion";

const GOLD = "#D4AF37";
const INK = "#E8E8E8";

export default function VendedorTriagePage() {
  const [paso, setPaso] = useState(0);
  const [grietaPick, setGrietaPick] = useState<VendedorTriageOpcion | null>(
    null,
  );
  const [matizPick, setMatizPick] = useState<VendedorTriageOpcion | null>(
    null,
  );

  const sellerRef = useMemo(() => {
    captureSellerRefFromUrl(window.location.search);
    return getSellerRef();
  }, []);

  const preguntaGrieta = VENDEDOR_TRIAGE_PREGUNTAS[0];
  const opcionesMatiz = grietaPick
    ? opcionesMatizParaPlaneta(grietaPick.planeta)
    : [];

  const fijacion = useMemo(() => {
    if (!grietaPick || !matizPick) return null;
    return resolverTriageVendedor([grietaPick, matizPick]);
  }, [grietaPick, matizPick]);

  function elegirGrieta(op: VendedorTriageOpcion) {
    setGrietaPick(op);
    setMatizPick(null);
    window.setTimeout(() => setPaso(1), 160);
  }

  function elegirMatiz(op: VendedorTriageOpcion) {
    setMatizPick(op);
    const result = resolverTriageVendedor([grietaPick!, op]);
    saveFijacionVendedor(result);
    setPaso(2);
  }

  function reiniciar() {
    setGrietaPick(null);
    setMatizPick(null);
    setPaso(0);
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
      <div className="relative mx-auto max-w-xl px-4 py-8 pb-28 sm:py-12">
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
          Dos preguntas. Fijamos tu Código y tu Planeta — sin chat, sin presión.
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
            <div className="space-y-2">
              {preguntaGrieta.opciones.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => elegirGrieta(op)}
                  className="w-full border px-4 py-3 text-left text-sm transition-colors hover:border-white/30"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.4)",
                    color: "rgba(255,255,255,0.8)",
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
            <div className="space-y-2">
              {opcionesMatiz.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => elegirMatiz(op)}
                  className="w-full border px-4 py-3 text-left text-sm transition-colors hover:border-white/30"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.4)",
                    color: "rgba(255,255,255,0.8)",
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
                setMatizPick(null);
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

              <div
                className="mt-4 border p-3"
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
              </div>

              <div
                className="mt-3 border p-3"
                style={{
                  borderColor: `${GOLD}44`,
                  background: `${GOLD}0d`,
                }}
              >
                <p
                  className="text-[10px] tracking-widest"
                  style={{ color: GOLD }}
                >
                  PREGUNTA DISPARADORA
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {fijacion.preguntaDisparadora}
                </p>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-white/45">
                {fijacion.metodoEntrada}
              </p>
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

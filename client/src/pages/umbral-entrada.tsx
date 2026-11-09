import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, Flame, Swords } from "lucide-react";
import {
  UMBRAL_DIAGNOSTICO_PREGUNTAS,
  resolverDiagnosticoUmbral,
  type UmbralDiagnosticoOpcion,
  type UmbralDiagnosticoOpcionId,
} from "@shared/umbral/entradaDiagnostico";
import { buildOficioPracticaHref } from "@shared/umbral/entradaPractica";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_MARCA,
  CASA_OFICIO_NOMBRE,
  CASA_OFICIO_RITUAL_CORTO,
} from "@shared/umbral/oficioCasa";
import { UMBRAL_SKU } from "@shared/umbralPricing";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const WARN = "#FF6B35";

/**
 * Planeta 5 Oficio — entrada a la práctica de 10 códigos (Forja + Arena).
 * Recuperada del planeta 8: el quiz de tracción vuelve a abrir el círculo.
 * No manda a la casa 6.
 */
export default function UmbralEntrada() {
  const [paso, setPaso] = useState(0);
  const [picks, setPicks] = useState<
    Partial<Record<string, UmbralDiagnosticoOpcion>>
  >({});

  const pregunta = UMBRAL_DIAGNOSTICO_PREGUNTAS[paso];
  const completo = UMBRAL_DIAGNOSTICO_PREGUNTAS.every((p) => picks[p.id] != null);

  const resultado = useMemo(() => {
    if (!completo) return null;
    const list = UMBRAL_DIAGNOSTICO_PREGUNTAS.map((p) => picks[p.id]!).filter(
      Boolean,
    );
    return resolverDiagnosticoUmbral(list);
  }, [completo, picks]);

  function elegir(op: UmbralDiagnosticoOpcion) {
    setPicks((prev) => ({ ...prev, [pregunta.id]: op }));
    if (paso < UMBRAL_DIAGNOSTICO_PREGUNTAS.length - 1) {
      window.setTimeout(() => setPaso((p) => p + 1), 180);
    }
  }

  const hrefArena = buildOficioPracticaHref("EXTERNO_VENTAS");
  const hrefForja = buildOficioPracticaHref("INTERNO_HABILIDAD");
  const hrefTrial = resultado
    ? buildOficioPracticaHref(resultado.modo, 1)
    : hrefForja;

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="umbral-entrada-page"
    >
      <div className="relative mx-auto max-w-xl px-4 py-8 pb-28 sm:py-12">
        <p
          className="text-[12px] tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          PLANETA C5 · {CASA_OFICIO_NOMBRE.toUpperCase()}
        </p>
        <p className="mt-2 text-[10px] tracking-[0.2em] text-white/40">
          {CASA_OFICIO_MARCA.toUpperCase()} · {CASA_OFICIO_RITUAL_CORTO}
        </p>
        <h1
          className="mt-3 text-2xl font-light tracking-tight text-white md:text-3xl"
          data-testid="umbral-entrada-ritual"
        >
          Práctica de venta · 10 códigos de prueba
        </h1>
        <p className="mt-3 text-sm text-white/55">{CASA_OFICIO_FIRMA}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          Forja y Arena viven en el planeta 5. El 8 ya no es la puerta. Código 1
          se prueba. El 6 no enseña a vender.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={hrefArena}
            className="flex items-start gap-3 border px-4 py-3.5 text-left"
            style={{
              borderColor: `${CYAN}66`,
              background: `${CYAN}12`,
            }}
            data-testid="umbral-entrada-cta-arena"
          >
            <Swords size={16} className="mt-0.5 shrink-0" style={{ color: CYAN }} />
            <span>
              <span
                className="block text-[12px] font-bold tracking-[0.14em]"
                style={{ color: CYAN }}
              >
                LA ARENA
              </span>
              <span className="mt-1 block text-[11px] text-white/55">
                Práctica de venta · 10 códigos
              </span>
            </span>
          </Link>
          <Link
            href={hrefForja}
            className="flex items-start gap-3 border px-4 py-3.5 text-left"
            style={{
              borderColor: `${GOLD}55`,
              background: `${GOLD}10`,
            }}
            data-testid="umbral-entrada-cta-forja"
          >
            <Flame size={16} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>
              <span
                className="block text-[12px] font-bold tracking-[0.14em]"
                style={{ color: GOLD }}
              >
                LA FORJA
              </span>
              <span className="mt-1 block text-[11px] text-white/55">
                Habilidad · 10 códigos
              </span>
            </span>
          </Link>
        </div>

        {!resultado && pregunta && (
          <motion.section
            key={pregunta.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-3"
            data-testid="umbral-entrada-pregunta"
          >
            <p className="text-[10px] tracking-[0.2em] text-white/40">
              DIAGNÓSTICO {paso + 1} / {UMBRAL_DIAGNOSTICO_PREGUNTAS.length}
            </p>
            <h2 className="text-lg font-bold text-white/90">{pregunta.pregunta}</h2>
            <div className="space-y-2">
              {pregunta.opciones.map((op) => {
                const active = picks[pregunta.id]?.id === op.id;
                return (
                  <button
                    key={op.id as UmbralDiagnosticoOpcionId}
                    type="button"
                    onClick={() => elegir(op)}
                    className="w-full border px-4 py-3 text-left text-sm transition-colors"
                    style={{
                      borderColor: active ? CYAN : "rgba(255,255,255,0.12)",
                      background: active ? `${CYAN}14` : "rgba(0,0,0,0.4)",
                      color: active ? CYAN : "rgba(255,255,255,0.75)",
                    }}
                    data-testid={`umbral-entrada-opcion-${op.id}`}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
            {paso > 0 && (
              <button
                type="button"
                onClick={() => setPaso((p) => Math.max(0, p - 1))}
                className="text-[11px] tracking-widest text-white/35 hover:text-white/60"
              >
                ← ANTERIOR
              </button>
            )}
          </motion.section>
        )}

        {resultado && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
            data-testid="umbral-entrada-resultado"
          >
            <div
              className="border-2 p-5"
              style={{ borderColor: `${WARN}77`, background: `${WARN}10` }}
            >
              <p
                className="flex items-center gap-2 text-[10px] tracking-[0.2em]"
                style={{ color: WARN }}
              >
                <Crosshair size={14} />
                FRICCIÓN PROBABLE · {resultado.modoLabel.toUpperCase()}
              </p>
              <h2
                className="mt-2 text-xl font-black text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Código {resultado.codigo}
                {resultado.arquetipoNombre
                  ? ` · ${resultado.arquetipoNombre}`
                  : ""}
              </h2>
              <p className="mt-1 text-sm text-white/55">{resultado.nombreCodigo}</p>
              <div
                className="mt-4 border p-3"
                style={{ borderColor: `${CYAN}44`, background: `${CYAN}0d` }}
              >
                <p className="text-[10px] tracking-widest" style={{ color: CYAN }}>
                  RECOMENDACIÓN TÁCTICA
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {resultado.recomendacion}
                </p>
              </div>
            </div>

            <Link
              href={hrefTrial}
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[12px] font-bold tracking-[0.16em]"
              style={{
                background: `linear-gradient(90deg, ${CYAN}22, ${GOLD}18)`,
                border: `1px solid ${CYAN}66`,
                color: CYAN,
              }}
              data-testid="umbral-entrada-cta-trial"
            >
              <Swords size={16} />
              PROBAR CÓDIGO 1 GRATIS
              <ArrowRight size={14} />
            </Link>

            <Link
              href={UMBRAL_SKU.checkoutHref}
              className="flex w-full items-center justify-center gap-2 border border-[#D4AF37]/50 px-4 py-3 text-[11px] tracking-widest text-[#D4AF37]"
              data-testid="umbral-entrada-cta-pago"
            >
              ACTIVAR OFICIO · ${UMBRAL_SKU.priceUsd}/MES
            </Link>

            <button
              type="button"
              onClick={() => {
                setPicks({});
                setPaso(0);
              }}
              className="w-full text-center text-[11px] tracking-widest text-white/35 hover:text-white/60"
            >
              REHACER DIAGNÓSTICO
            </button>
          </motion.section>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_MARCA,
  CASA_OFICIO_NOMBRE,
  CASA_OFICIO_PLACEHOLDER,
  CASA_OFICIO_RITUAL,
  CASA_OFICIO_RITUAL_CORTO,
} from "@shared/umbral/oficioCasa";

const GOLD = "#D4AF37";
const DRAFT_KEY = "sistemicar.oficio.entrada.draft";

/**
 * Entrada de Casa 5 Oficio: lienzo del deber → círculo de 10 códigos.
 * No es el quiz de objeción. No manda al Umbral (casa 6).
 */
export default function UmbralEntrada() {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setTexto(draft);
    } catch {
      /* sin storage */
    }
  }, []);

  function onTexto(value: string) {
    setTexto(value);
    try {
      localStorage.setItem(DRAFT_KEY, value);
    } catch {
      /* sin storage */
    }
  }

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
          {CASA_OFICIO_RITUAL}
        </h1>
        <p className="mt-3 text-sm text-white/55">{CASA_OFICIO_FIRMA}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          Un hecho de oficio. Sin pitch. Sin plan de negocio. Sin mandar al
          Juez. Sin mandar al límite.
        </p>

        <label className="mt-8 block">
          <textarea
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            rows={8}
            autoFocus
            placeholder={CASA_OFICIO_PLACEHOLDER}
            className="w-full resize-y rounded-none bg-black/60 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25"
            style={{ border: `1px solid ${GOLD}33` }}
            data-testid="umbral-entrada-volcado"
          />
        </label>

        <Link
          href="/umbral/v2"
          className="mt-4 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[12px] font-bold tracking-[0.16em]"
          style={{
            background: `linear-gradient(90deg, ${GOLD}22, ${GOLD}18)`,
            border: `1px solid ${GOLD}66`,
            color: GOLD,
            opacity: texto.trim().length < 8 ? 0.45 : 1,
            pointerEvents: texto.trim().length < 8 ? "none" : "auto",
          }}
          data-testid="umbral-entrada-cta-trial"
        >
          ENTRAR A LOS 10 CÓDIGOS
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

import React, { type FormEvent } from "react";
import {
  CASA_OFICIO_PLACEHOLDER,
  CASA_OFICIO_RITUAL_CORTO,
} from "@shared/umbral/oficioCasa";

export const OFICIO_GOLD = "#D4AF37";
export const OFICIO_CYAN = "#00FFC3";

export function LienzoOficio({
  texto,
  onTexto,
  onLeer,
  cargando,
}: {
  texto: string;
  onTexto: (value: string) => void;
  onLeer: () => void;
  cargando: boolean;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (cargando || texto.trim().length < 8) return;
    onLeer();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="umbral-entrada-lienzo"
    >
      <label className="block">
        <span
          className="mb-3 block text-2xl font-light tracking-tight md:text-3xl"
          style={{ color: OFICIO_GOLD }}
          data-testid="umbral-entrada-ritual"
        >
          {CASA_OFICIO_RITUAL_CORTO}
        </span>
        <textarea
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          rows={8}
          autoFocus
          placeholder={CASA_OFICIO_PLACEHOLDER}
          className="w-full resize-y rounded-none bg-black/60 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25"
          style={{ border: `1px solid ${OFICIO_GOLD}33` }}
          data-testid="umbral-entrada-volcado"
        />
      </label>
      <button
        type="submit"
        disabled={cargando || texto.trim().length < 8}
        className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
        style={{
          backgroundColor: OFICIO_GOLD,
          color: "#0a0a0a",
          border: `1px solid ${OFICIO_GOLD}`,
        }}
        data-testid="umbral-entrada-leer"
      >
        {cargando ? "Leyendo el oficio…" : "Leer el oficio (gratis)"}
      </button>
    </form>
  );
}

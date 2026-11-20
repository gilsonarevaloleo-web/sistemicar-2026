import React, { type FormEvent } from "react";

export const UMBRAL5_BRONZE = "#C4A06A";
export const UMBRAL5_ASH = "#7A6A52";
export const PLACEHOLDER_LIMITE =
  "Escribe el límite que ya sabes. No la queja. No el oficio.";

export function LienzoLimite({
  texto,
  onTexto,
  onSellar,
  cargando,
  deshabilitado,
  numeroVolcado = 1,
}: {
  texto: string;
  onTexto: (value: string) => void;
  onSellar: () => void;
  cargando: boolean;
  deshabilitado: boolean;
  numeroVolcado?: number;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (deshabilitado || cargando) return;
    onSellar();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="umbral5-lienzo"
    >
      <label className="block">
        <span
          className="mb-3 block text-2xl font-light tracking-tight md:text-3xl"
          style={{ color: UMBRAL5_BRONZE }}
          data-testid="umbral5-pregunta-matriz"
        >
          Volcado {Math.min(numeroVolcado, 10)} de 10
        </span>
        <textarea
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          rows={8}
          autoFocus
          placeholder={PLACEHOLDER_LIMITE}
          className="w-full resize-y rounded-none bg-black/60 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25"
          style={{ border: `1px solid ${UMBRAL5_BRONZE}33` }}
          data-testid="umbral5-volcado"
        />
      </label>
      <button
        type="submit"
        disabled={deshabilitado || cargando || texto.trim().length < 8}
        className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
        style={{
          backgroundColor: UMBRAL5_BRONZE,
          color: "#0a0a0a",
          border: `1px solid ${UMBRAL5_BRONZE}`,
        }}
        data-testid="umbral5-sellar"
      >
        {cargando ? "Sellando el volcado…" : "Sellar volcado (gratis)"}
      </button>
    </form>
  );
}

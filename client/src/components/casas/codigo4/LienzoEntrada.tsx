import React, { type FormEvent } from "react";

export const JUEZ_IRON = "#B8B4A8";
export const JUEZ_STEEL = "#6B7280";

export function LienzoEntrada({
  texto,
  onTexto,
  onAuditar,
  cargando,
  saldo,
  costo,
  deshabilitado,
}: {
  texto: string;
  onTexto: (value: string) => void;
  onAuditar: () => void;
  cargando: boolean;
  saldo: number | null;
  costo: number;
  deshabilitado: boolean;
}) {
  const sinSaldo = (saldo ?? 0) < costo;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (deshabilitado || cargando) return;
    onAuditar();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="juez-lienzo"
    >
      <label className="block">
        <span
          className="mb-2 block text-[10px] tracking-[0.22em] uppercase"
          style={{ color: JUEZ_IRON }}
        >
          Lienzo de entrada
        </span>
        <textarea
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          rows={8}
          autoFocus
          placeholder="Volca la fricción diaria para desvelar el problema inconsciente"
          className="w-full resize-y rounded-none bg-black/60 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25"
          style={{ border: `1px solid ${JUEZ_IRON}33` }}
          data-testid="juez-volcado"
        />
      </label>
      <button
        type="submit"
        disabled={deshabilitado || cargando || !texto.trim()}
        className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
        style={{
          backgroundColor: sinSaldo ? "transparent" : JUEZ_IRON,
          color: sinSaldo ? JUEZ_IRON : "#0a0a0a",
          border: `1px solid ${JUEZ_IRON}`,
        }}
        data-testid="juez-auditar"
      >
        {cargando
          ? "El Juez lee el volcado…"
          : `Auditar con el Juez Serio (${costo} Crédito)`}
      </button>
    </form>
  );
}

import React from "react";
import { JUEZ_IRON } from "./LienzoEntrada";

export function ModalSaldoInsuficiente({
  abierto,
  mensaje,
  onCerrar,
  onRecargar,
}: {
  abierto: boolean;
  mensaje: string;
  onCerrar: () => void;
  onRecargar: () => void;
}) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4"
      data-testid="juez-modal-402"
    >
      <div
        className="w-full max-w-md border bg-[#080808] p-6"
        style={{ borderColor: `${JUEZ_IRON}44` }}
      >
        <p
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: JUEZ_IRON }}
        >
          Saldo insuficiente
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">{mensaje}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 border px-3 py-2 text-[11px] uppercase tracking-wider text-white/60"
            style={{ borderColor: `${JUEZ_IRON}33` }}
            data-testid="juez-modal-cerrar"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onRecargar}
            className="flex-1 px-3 py-2 text-[11px] uppercase tracking-wider"
            style={{ backgroundColor: JUEZ_IRON, color: "#0a0a0a" }}
            data-testid="juez-modal-recargar"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}

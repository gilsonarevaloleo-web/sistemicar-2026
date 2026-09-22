import React from "react";
import { DICCIONARIO_GRADOS, mensajeMeritoDetectado, type GradoMaestria } from "@shared/deposito/engineConfig";

const GOLD = "#D4AF37";

export function BannerMeritoDetectado({
  grado,
  onCerrar,
}: {
  grado: GradoMaestria;
  onCerrar: () => void;
}) {
  const ficha = DICCIONARIO_GRADOS[grado];
  const mensaje = mensajeMeritoDetectado(grado);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposito-merito-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
      data-testid="deposito-merito-modal"
    >
      <div
        className="w-full max-w-md border px-6 py-7 text-center"
        style={{
          borderColor: `${GOLD}88`,
          backgroundColor: "#0a0a0a",
        }}
      >
        <p
          id="deposito-merito-titulo"
          className="text-[10px] tracking-[0.28em] mb-4"
          style={{ color: GOLD }}
        >
          MÉRITO DETECTADO
        </p>
        <p
          className="text-base leading-relaxed text-white/90"
          data-testid="deposito-merito-felicitacion"
        >
          {mensaje}
        </p>
        <p className="mt-3 text-[11px] tracking-[0.18em] text-white/45">
          GRADO {ficha.grado}: {ficha.nombre}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-6 text-[11px] font-bold uppercase tracking-widest px-5 py-3"
          style={{ backgroundColor: GOLD, color: "#111" }}
          data-testid="deposito-merito-cerrar"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default BannerMeritoDetectado;

import React from "react";
import { MENSAJE_SESION_CUMPLIDA } from "@shared/deposito/v3";

const GOLD = "#D4AF37";

export function MensajeSesionCumplida() {
  return (
    <aside
      className="border px-5 py-4 text-center"
      style={{ borderColor: `${GOLD}66`, backgroundColor: `${GOLD}12` }}
      data-testid="deposito-sesion-cumplida"
    >
      <p
        className="text-[10px] tracking-[0.24em]"
        style={{ color: GOLD }}
      >
        SESIÓN SISTEMICAR CUMPLIDA
      </p>
      <p className="mt-2 text-sm text-white/80">{MENSAJE_SESION_CUMPLIDA}</p>
    </aside>
  );
}

export default MensajeSesionCumplida;

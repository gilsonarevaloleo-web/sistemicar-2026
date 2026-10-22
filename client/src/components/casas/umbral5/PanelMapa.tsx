import React, { type ReactNode } from "react";
import { etiquetaTipo } from "@shared/casas/umbral5";
import type { PisoIntento, Umbral5Lectura } from "@shared/casas/umbral5";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "./LienzoLimite";

const PISO_ETIQUETA: Record<PisoIntento, string> = {
  1: "Lo sé. No hice nada.",
  2: "Lo hablé con el alrededor.",
  3: "Trabajé y no se mueve.",
};

function Card({
  etiqueta,
  children,
  testId,
}: {
  etiqueta: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <article
      className="border bg-black/50 p-4"
      style={{ borderColor: `${UMBRAL5_BRONZE}28` }}
      data-testid={testId}
    >
      <p
        className="mb-2 text-[9px] tracking-[0.24em] uppercase"
        style={{ color: UMBRAL5_ASH }}
      >
        {etiqueta}
      </p>
      <div className="text-sm leading-relaxed text-white/85">{children}</div>
    </article>
  );
}

export function PanelMapa({ lectura }: { lectura: Umbral5Lectura }) {
  return (
    <section className="space-y-3" data-testid="umbral5-panel-mapa">
      <p
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{ color: UMBRAL5_BRONZE }}
      >
        Mapa del límite
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Card etiqueta="Asiento" testId="umbral5-card-asiento">
          <p
            className="text-2xl font-light tracking-tight"
            style={{ color: UMBRAL5_BRONZE }}
          >
            C{lectura.codigoUsuario}
          </p>
          <p className="mt-2 text-[11px] text-white/40">
            C8–C10 no se habitan. C4 no es asiento.
          </p>
        </Card>
        <Card etiqueta="Intento" testId="umbral5-card-intento">
          <p
            className="text-2xl font-light tracking-tight"
            style={{ color: UMBRAL5_BRONZE }}
          >
            C{lectura.pisoIntento}
          </p>
          <p className="mt-1 text-white/70">
            {PISO_ETIQUETA[lectura.pisoIntento]}
          </p>
        </Card>
        <Card etiqueta="Tipo · mapa C4" testId="umbral5-card-tipo">
          <p className="text-lg font-light" style={{ color: UMBRAL5_BRONZE }}>
            {etiquetaTipo(lectura.tipoLimite)}
          </p>
          {lectura.tipoLimite === "impronta" && (
            <p className="mt-2 text-[11px] text-white/40">
              Se nombra. No se sienta en C10.
            </p>
          )}
        </Card>
        <Card etiqueta="Por qué no ejecuta" testId="umbral5-card-porque">
          {lectura.porQueNoEjecuta}
        </Card>
        <Card etiqueta="Lectura fría" testId="umbral5-card-fria">
          {lectura.lecturaFria}
        </Card>
      </div>
    </section>
  );
}

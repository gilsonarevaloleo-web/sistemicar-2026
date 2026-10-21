import React, { type ReactNode } from "react";
import { principioDe } from "@shared/casas/codigo4";
import type { JuezSerioFase1 } from "@shared/casas/codigo4";
import { JUEZ_IRON, JUEZ_STEEL } from "./LienzoEntrada";

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
      style={{ borderColor: `${JUEZ_IRON}28` }}
      data-testid={testId}
    >
      <p
        className="mb-2 text-[9px] tracking-[0.24em] uppercase"
        style={{ color: JUEZ_STEEL }}
      >
        {etiqueta}
      </p>
      <div className="text-sm leading-relaxed text-white/85">{children}</div>
    </article>
  );
}

export function PanelLectura({
  fase1,
  onDesbloquear,
  desbloqueando,
  costoFase2,
  yaDesbloqueada,
}: {
  fase1: JuezSerioFase1;
  onDesbloquear: () => void;
  desbloqueando: boolean;
  costoFase2: number;
  yaDesbloqueada: boolean;
}) {
  const problema = principioDe(fase1.codigoProblemaDetectado);
  const techo = principioDe(fase1.codigoConquistadoMax);

  return (
    <section className="space-y-3" data-testid="juez-panel-lectura">
      <p
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{ color: JUEZ_IRON }}
      >
        Lectura del perímetro
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Card etiqueta="Código del problema" testId="juez-card-problema">
          <p className="text-2xl font-light tracking-tight" style={{ color: JUEZ_IRON }}>
            C{problema.codigo}
          </p>
          <p className="mt-1 text-white/70">{problema.nombre}</p>
          <p className="mt-2 text-[11px] text-white/40">
            {problema.vectores.join(" · ")}
          </p>
        </Card>
        <Card etiqueta="Perímetro conquistado" testId="juez-card-perimetro">
          <p className="text-2xl font-light tracking-tight" style={{ color: JUEZ_IRON }}>
            C1 → C{techo.codigo}
          </p>
          <p className="mt-1 text-white/70">{techo.nombre}</p>
          <p className="mt-2 text-[11px] text-white/40">
            La tijera no puede subir de este techo.
          </p>
        </Card>
        <Card etiqueta="Fuga inconsciente" testId="juez-card-fuga">
          {fase1.fugaInconsciente}
        </Card>
        <Card etiqueta="Lectura fría" testId="juez-card-fria">
          {fase1.lecturaPerimetroFria}
        </Card>
      </div>
      {!yaDesbloqueada && (
        <div
          className="border px-4 py-4"
          style={{ borderColor: `${JUEZ_IRON}55`, backgroundColor: "#0a0a0a" }}
          data-testid="juez-banner-fase2"
        >
          <p className="text-[11px] leading-relaxed text-white/55">
            La directiva está sellada. El Juez no la entrega sin inversión.
          </p>
          <button
            type="button"
            onClick={onDesbloquear}
            disabled={desbloqueando}
            className="mt-3 w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
            style={{
              backgroundColor: JUEZ_IRON,
              color: "#0a0a0a",
            }}
            data-testid="juez-desbloquear"
          >
            {desbloqueando
              ? "Desbloqueando…"
              : `Desbloquear Directiva Operacional (${costoFase2} Crédito)`}
          </button>
        </div>
      )}
    </section>
  );
}

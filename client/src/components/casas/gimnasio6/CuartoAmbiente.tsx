import React from "react";
import { progresoDiez, temaDeCapitulo } from "../../../lib/casas/gimnasio6/ambiente.ts";

/** Capa decorativa del cuarto: luz que respira, grano y el "10" que se acerca. */
export function CuartoAmbiente({
  capitulo,
  puntero,
  sellado,
}: {
  capitulo: number;
  puntero: { subcodigo: number; indice: number };
  sellado: boolean;
}) {
  const tema = temaDeCapitulo(capitulo);
  const avance = progresoDiez(puntero, sellado);
  const escala = 0.55 + avance * 0.75;
  const opacidad = 0.12 + avance * 0.38;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-testid="gimnasio6-ambiente"
      data-avance={avance.toFixed(2)}
    >
      <style>{`
        @keyframes g6-respira { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
        @keyframes g6-revela { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .g6-revela-escenario { animation: g6-revela 1.1s ease-out both; }
        .g6-revela-pregunta { animation: g6-revela 1.1s ease-out 1.6s both; }
        .g6-revela-form { animation: g6-revela 0.9s ease-out 2.4s both; }
        @media (prefers-reduced-motion: reduce) {
          .g6-respira { animation: none !important; }
          .g6-revela-escenario, .g6-revela-pregunta, .g6-revela-form { animation: none; }
        }
      `}</style>
      <div
        className="absolute left-1/2 top-[18%] h-72 w-72"
        style={{
          transform: `translateX(-50%) scale(${escala})`,
          opacity: opacidad + 0.3,
          transition: "opacity 1.5s ease, transform 1.5s ease",
        }}
        data-testid="gimnasio6-diez"
      >
        <div
          className="g6-respira h-full w-full rounded-full"
          style={{
            background: `radial-gradient(circle, ${tema.luz}55 0%, ${tema.luzSecundaria}00 70%)`,
            animation: `g6-respira ${tema.respiracionSeg}s ease-in-out infinite`,
          }}
        />
      </div>
      <svg className="absolute inset-0 h-full w-full opacity-[0.07] mix-blend-overlay">
        <filter id="g6-grano">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#g6-grano)" />
      </svg>
    </div>
  );
}

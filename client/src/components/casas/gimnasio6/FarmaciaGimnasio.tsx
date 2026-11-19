import React from "react";
import {
  PILDORAS,
  bloqueoPildora,
  estadoPildora,
  type LibroGimnasio,
} from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";

const ETIQUETA_ESTADO = {
  disponible: "Disponible",
  en_curso: "En curso",
  completada: "Completada · puedes repetirla",
} as const;

export function FarmaciaGimnasio({
  libro,
  onElegir,
  cargandoCapitulo,
}: {
  libro: LibroGimnasio;
  onElegir: (capitulo: number) => void;
  cargandoCapitulo?: number | null;
}) {
  return (
    <section className="space-y-4" data-testid="gimnasio6-farmacia">
      <header className="space-y-1">
        <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: UMBRAL5_BRONZE }}>
          Farmacia del gimnasio
        </p>
        <p className="text-[13px] leading-relaxed text-white/55">
          Elige la píldora que quieres entrenar hoy. Las completadas se quedan aquí para repetirlas
          cuando quieras.
        </p>
      </header>
      <ul className="space-y-3">
        {PILDORAS.map((p, i) => {
          const estado = estadoPildora(libro, p.capitulo);
          const bloqueo = bloqueoPildora(libro, p.capitulo);
          const cargando = cargandoCapitulo === p.capitulo;
          const accion =
            estado === "en_curso" ? "Seguir" : estado === "completada" ? "Repetir" : "Entrar";
          return (
            <li key={p.capitulo}>
              <article
                className="space-y-3 border px-4 py-4"
                style={{
                  borderColor: `${UMBRAL5_BRONZE}${estado === "en_curso" ? "88" : "33"}`,
                  backgroundColor: "#0a0a0a",
                  opacity: bloqueo ? 0.55 : 1,
                }}
                data-testid={`gimnasio6-pildora-${p.capitulo}`}
                data-estado={estado}
              >
                <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: UMBRAL5_ASH }}>
                  Píldora {i + 1} · {ETIQUETA_ESTADO[estado]}
                </p>
                <h3 className="text-lg font-light leading-snug text-white/90">{p.nombre}</h3>
                <p className="text-[12px] leading-relaxed text-white/50">{p.promesa}</p>
                {bloqueo === "en_curso_otra" && (
                  <p className="text-[11px] text-white/45">Termina la píldora en curso para elegir otra.</p>
                )}
                {bloqueo === "tope_diario" && (
                  <p className="text-[11px] text-white/45">A lo mucho una píldora por día. Mañana sigue.</p>
                )}
                <button
                  type="button"
                  disabled={Boolean(bloqueo) || cargando}
                  onClick={() => onElegir(p.capitulo)}
                  className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: UMBRAL5_BRONZE, color: "#0a0a0a" }}
                  data-testid={`gimnasio6-pildora-elegir-${p.capitulo}`}
                >
                  {cargando ? "…" : accion}
                </button>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import React from "react";
import {
  PILDORAS,
  bloqueoPildora,
  estadoPildora,
  type EstadoPildora,
  type LibroGimnasio,
} from "@shared/casas/gimnasio6";

const GOLD = "#D4AF37";
const TOTAL_FRASCOS = 10;

type EstadoFrasco = EstadoPildora | "proximamente";

const ETIQUETA_ESTADO: Record<EstadoFrasco, string> = {
  disponible: "Disponible",
  en_curso: "En curso",
  completada: "Completada",
  proximamente: "Próximamente",
};

const NIVEL: Record<EstadoFrasco, number> = {
  disponible: 0.18,
  en_curso: 0.55,
  completada: 0.9,
  proximamente: 0,
};

const CONTORNO = "M18 30 Q8 34 8 46 V78 Q8 86 16 86 H48 Q56 86 56 78 V46 Q56 34 46 30 Z";

function Frasco({ id, nivel, activo }: { id: string; nivel: number; activo: boolean }) {
  const alto = 52 * nivel;
  const color = activo ? GOLD : "#6b6b6b";
  return (
    <svg viewBox="0 0 64 92" className="h-20 w-14" aria-hidden>
      <defs>
        <clipPath id={`frasco-${id}`}>
          <path d={CONTORNO} />
        </clipPath>
      </defs>
      <rect x="22" y="6" width="20" height="9" rx="2" fill={color} opacity={activo ? 0.9 : 0.35} />
      <rect x="24" y="15" width="16" height="15" fill="none" stroke={color} strokeWidth="1.5" opacity={activo ? 0.8 : 0.35} />
      <g clipPath={`url(#frasco-${id})`}>
        <rect x="8" y={86 - alto} width="48" height={alto} fill={color} opacity="0.85" />
      </g>
      <path d={CONTORNO} fill="none" stroke={color} strokeWidth="1.8" opacity={activo ? 1 : 0.4} />
      <path d="M15 46 V72" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.18" />
    </svg>
  );
}

export function FarmaciaGimnasio({
  libro,
  onElegir,
  cargandoCapitulo,
}: {
  libro: LibroGimnasio | null;
  onElegir: (capitulo: number) => void;
  cargandoCapitulo?: number | null;
}) {
  return (
    <section className="space-y-3" data-testid="gimnasio6-farmacia">
      <header className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: GOLD }}>
          Farmacia del gimnasio
        </p>
        <p className="text-[11px] leading-relaxed text-white/50">
          Toca un frasco para entrar al gimnasio. Las píldoras completadas se quedan aquí para
          repetirlas.
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: TOTAL_FRASCOS }, (_, i) => {
          const pildora = PILDORAS[i];
          const estado: EstadoFrasco = !pildora
            ? "proximamente"
            : libro
              ? estadoPildora(libro, pildora.capitulo)
              : "disponible";
          const bloqueo = pildora && libro ? bloqueoPildora(libro, pildora.capitulo) : null;
          const cargando = Boolean(pildora) && cargandoCapitulo === pildora?.capitulo;
          const activo = Boolean(pildora) && !bloqueo;
          const ayuda =
            bloqueo === "en_curso_otra"
              ? "Termina la píldora en curso para elegir otra."
              : bloqueo === "tope_diario"
                ? "A lo mucho una píldora por día. Mañana sigue."
                : pildora?.promesa;
          return (
            <li key={pildora?.capitulo ?? `vacio-${i}`}>
              <button
                type="button"
                disabled={!activo || cargando}
                onClick={() => pildora && onElegir(pildora.capitulo)}
                title={ayuda}
                className="flex h-full w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "rgba(255,255,255,0.02)",
                  borderColor: estado === "en_curso" ? `${GOLD}99` : "rgba(255,255,255,0.08)",
                  opacity: activo ? 1 : 0.5,
                }}
                data-testid={
                  pildora
                    ? `gimnasio6-pildora-elegir-${pildora.capitulo}`
                    : `gimnasio6-frasco-vacio-${i + 1}`
                }
                data-estado={estado}
              >
                <Frasco id={String(i + 1)} nivel={NIVEL[estado]} activo={activo} />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">
                  {i + 1} · {cargando ? "…" : ETIQUETA_ESTADO[estado]}
                </span>
                <span className="text-[11px] leading-snug text-white/85">
                  {pildora?.nombre ?? `Píldora ${i + 1}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

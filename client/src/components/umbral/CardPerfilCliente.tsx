import { Crosshair, UserRound } from "lucide-react";
import type { ModoExternoConfig } from "@shared/umbral/engineConfig";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const WARN = "#FF6B35";

export interface CardPerfilClienteProps {
  perfil: Pick<
    ModoExternoConfig,
    "arquetipoNombre" | "actitudCliente" | "fraseTipica" | "misionVendedor"
  >;
  codigoNumero: number;
}

/**
 * Ficha de Objetivo / Desafío de Ventas — solo modo La Arena (EXTERNO_VENTAS).
 * Contexto narrativo del arquetipo; no altera el payload de evaluación.
 */
export function CardPerfilCliente({
  perfil,
  codigoNumero,
}: CardPerfilClienteProps) {
  return (
    <aside
      className="relative overflow-hidden border-2 bg-black/55 p-4 sm:p-5"
      style={{
        borderColor: `${WARN}88`,
        boxShadow: `inset 0 0 0 1px ${WARN}22, 0 0 24px ${WARN}14`,
      }}
      data-testid="umbral-v2-ficha-cliente"
      aria-label={`Ficha de perfil del cliente: ${perfil.arquetipoNombre}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${WARN}, ${GOLD}, transparent)`,
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center border"
          style={{
            borderColor: `${WARN}66`,
            background: `${WARN}14`,
            color: WARN,
          }}
          aria-hidden
        >
          <UserRound size={22} strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.22em] text-white/40">
            FICHA DE OBJETIVO · CÓDIGO {codigoNumero}
          </p>
          <span
            className="mt-2 inline-block border px-2.5 py-1 text-[11px] font-bold tracking-wide"
            style={{
              borderColor: `${GOLD}77`,
              background: `${GOLD}14`,
              color: GOLD,
            }}
            data-testid="umbral-v2-arquetipo-nombre"
          >
            {perfil.arquetipoNombre}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-[10px] tracking-widest text-white/35">ACTITUD</p>
          <p
            className="mt-1 text-sm leading-relaxed text-white/70"
            data-testid="umbral-v2-actitud-cliente"
          >
            {perfil.actitudCliente}
          </p>
        </div>

        <blockquote
          className="border-l-2 pl-3"
          style={{ borderColor: WARN }}
          data-testid="umbral-v2-frase-tipica"
        >
          <p className="text-[10px] tracking-widest text-[#FF6B35]/85">
            RESISTENCIA DEL CLIENTE
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-white/90 italic">
            «{perfil.fraseTipica}»
          </p>
        </blockquote>

        <div
          className="border p-3"
          style={{
            borderColor: `${CYAN}44`,
            background: `${CYAN}0d`,
          }}
          data-testid="umbral-v2-mision-vendedor"
        >
          <p
            className="flex items-center gap-1.5 text-[10px] tracking-widest"
            style={{ color: CYAN }}
          >
            <Crosshair size={12} aria-hidden />
            OBJETIVO DE DESBLOQUEO
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/80">
            {perfil.misionVendedor}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default CardPerfilCliente;

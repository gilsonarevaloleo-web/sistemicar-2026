import React from "react";
import { Link } from "wouter";
import { ArrowRight, Swords } from "lucide-react";
import type { OficioLectura } from "@shared/umbral/oficioMotor";
import { buildOficioPracticaHref } from "@shared/umbral/entradaPractica";
import {
  OFICIO_PRODUCTO_VENTAS,
  OFICIO_PRODUCTO_VENTAS_CAPA,
} from "@shared/umbral/oficioCasa";
import { UMBRAL_SKU } from "@shared/umbralPricing";
import { OFICIO_CYAN, OFICIO_GOLD } from "./LienzoOficio";

export function PanelLecturaOficio({
  lectura,
  onRehacer,
  dueno = false,
  incluido = false,
}: {
  lectura: OficioLectura;
  onRehacer: () => void;
  dueno?: boolean;
  incluido?: boolean;
}) {
  const hrefArena = buildOficioPracticaHref("EXTERNO_VENTAS", lectura.codigo);
  const libre = dueno || incluido;

  return (
    <section className="space-y-4" data-testid="umbral-entrada-lectura">
      <div
        className="border-2 p-5"
        style={{ borderColor: `${OFICIO_GOLD}77`, background: `${OFICIO_GOLD}10` }}
      >
        <p
          className="text-[10px] tracking-[0.2em]"
          style={{ color: OFICIO_GOLD }}
          data-testid="umbral-entrada-codigo"
        >
          CÓDIGO · MATRIZ OFICIO
        </p>
        <h2
          className="mt-2 text-xl font-black text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Hablas C{lectura.codigo} Oficio · {lectura.marca}
        </h2>
        <p className="mt-1 text-sm text-white/55">{lectura.nombre}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          {lectura.lecturaFria}
        </p>
      </div>

      <div
        className="border p-4"
        style={{ borderColor: `${OFICIO_CYAN}44`, background: `${OFICIO_CYAN}0d` }}
        data-testid="umbral-entrada-hueco"
      >
        <p className="text-[10px] tracking-widest" style={{ color: OFICIO_CYAN }}>
          HUECO LÓGICO
        </p>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/80">
          {lectura.huecos.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-white/50">
          La solución se cubre aquí con cálculo — no en el 6. El límite no cobra.
        </p>
      </div>

      <article
        className="border p-4"
        style={{ borderColor: `${OFICIO_CYAN}66`, background: `${OFICIO_CYAN}10` }}
        data-testid="umbral-entrada-producto-ventas"
      >
        <p className="text-[10px] tracking-[0.18em] text-white/40">
          EL MAESTRO DE OFICIO OFRECE
        </p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h3
              className="text-lg font-semibold tracking-tight"
              style={{ color: OFICIO_CYAN }}
            >
              {OFICIO_PRODUCTO_VENTAS}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              {OFICIO_PRODUCTO_VENTAS_CAPA} Empieza en C{lectura.codigo}.
            </p>
          </div>
          <p
            className="shrink-0 text-[11px] font-bold tracking-[0.12em]"
            style={{ color: libre ? OFICIO_GOLD : OFICIO_CYAN }}
            data-testid="umbral-entrada-producto-precio"
          >
            {dueno ? "LIBRE · DUEÑO" : libre ? "INCLUIDO" : `$${UMBRAL_SKU.priceUsd}/MES`}
          </p>
        </div>

        {libre ? (
          <Link
            href={hrefArena}
            className="mt-4 flex w-full items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold tracking-[0.16em]"
            style={{
              background: `${OFICIO_CYAN}22`,
              border: `1px solid ${OFICIO_CYAN}66`,
              color: OFICIO_CYAN,
            }}
            data-testid="umbral-entrada-cta-arena"
          >
            <Swords size={14} />
            ENTRAR A LA ARENA · C{lectura.codigo}
            <ArrowRight size={14} />
          </Link>
        ) : (
          <div className="mt-4 space-y-2">
            <Link
              href={UMBRAL_SKU.checkoutHref}
              className="flex w-full items-center justify-center gap-2 border px-4 py-3 text-[11px] font-bold tracking-[0.16em]"
              style={{
                borderColor: `${OFICIO_GOLD}66`,
                color: OFICIO_GOLD,
              }}
              data-testid="umbral-entrada-cta-pago"
            >
              ACTIVAR {OFICIO_PRODUCTO_VENTAS.toUpperCase()} · ${UMBRAL_SKU.priceUsd}/MES
            </Link>
            <Link
              href={buildOficioPracticaHref("EXTERNO_VENTAS", 1)}
              className="flex w-full items-center justify-center text-[11px] tracking-widest text-white/40 hover:text-white/70"
              data-testid="umbral-entrada-cta-trial"
            >
              Código 1 es trial
            </Link>
          </div>
        )}
      </article>

      <button
        type="button"
        onClick={onRehacer}
        className="w-full text-center text-[11px] tracking-widest text-white/35 hover:text-white/60"
        data-testid="umbral-entrada-rehacer"
      >
        OTRO VOLCADO
      </button>
    </section>
  );
}

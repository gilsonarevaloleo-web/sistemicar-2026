import React from "react";
import { Link } from "wouter";
import { ArrowRight, Flame, Swords } from "lucide-react";
import type { OficioLectura } from "@shared/umbral/oficioMotor";
import { buildOficioPracticaHref } from "@shared/umbral/entradaPractica";
import { OFICIO_CYAN, OFICIO_GOLD } from "./LienzoOficio";

export function PanelLecturaOficio({
  lectura,
  onRehacer,
}: {
  lectura: OficioLectura;
  onRehacer: () => void;
}) {
  const hrefForja = buildOficioPracticaHref("INTERNO_HABILIDAD", lectura.codigo);
  const hrefArena = buildOficioPracticaHref("EXTERNO_VENTAS", lectura.codigo);

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

      <p className="text-[10px] tracking-[0.18em] text-white/35">
        PRÁCTICA INTERIOR DE ESTE CÓDIGO
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href={hrefForja}
          className="flex items-start gap-3 border px-4 py-3.5 text-left"
          style={{ borderColor: `${OFICIO_GOLD}55`, background: `${OFICIO_GOLD}10` }}
          data-testid="umbral-entrada-cta-forja"
        >
          <Flame size={16} className="mt-0.5 shrink-0" style={{ color: OFICIO_GOLD }} />
          <span>
            <span
              className="block text-[12px] font-bold tracking-[0.14em]"
              style={{ color: OFICIO_GOLD }}
            >
              LA FORJA · C{lectura.codigo}
            </span>
            <span className="mt-1 block text-[11px] text-white/55">
              Habilidad de este código
            </span>
          </span>
        </Link>
        <Link
          href={hrefArena}
          className="flex items-start gap-3 border px-4 py-3.5 text-left"
          style={{ borderColor: `${OFICIO_CYAN}66`, background: `${OFICIO_CYAN}12` }}
          data-testid="umbral-entrada-cta-arena"
        >
          <Swords size={16} className="mt-0.5 shrink-0" style={{ color: OFICIO_CYAN }} />
          <span>
            <span
              className="block text-[12px] font-bold tracking-[0.14em]"
              style={{ color: OFICIO_CYAN }}
            >
              LA ARENA · C{lectura.codigo}
            </span>
            <span className="mt-1 block text-[11px] text-white/55">
              Práctica de venta de este código
            </span>
          </span>
          <ArrowRight size={14} className="ml-auto mt-1 shrink-0" style={{ color: OFICIO_CYAN }} />
        </Link>
      </div>

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

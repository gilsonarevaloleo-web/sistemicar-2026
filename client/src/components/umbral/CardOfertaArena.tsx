import React, { useState } from "react";
import { Check, Crosshair, Plus, Tag } from "lucide-react";
import { CODIGOS_NUMERO, type CodigoNumero } from "@shared/umbral/engineConfig";
import {
  calcularProgresoOferta,
  validarFraseUtilidad,
  validarNombreOferta,
  type OfertaArena,
} from "@shared/umbral/ofertaArena";

const GOLD = "#D4AF37";
const WARN = "#FF6B35";

export interface CardOfertaArenaProps {
  oferta: OfertaArena | null;
  ofertas: OfertaArena[];
  hidratando?: boolean;
  onNombrar: (nombre: string, fraseUtilidad: string) => void;
  onNueva: () => void;
  onActivar: (ofertaId: string) => void;
}

export function CardOfertaArena({
  oferta,
  ofertas,
  hidratando = false,
  onNombrar,
  onNueva,
  onActivar,
}: CardOfertaArenaProps) {
  const [nombre, setNombre] = useState("");
  const [frase, setFrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forzarNueva, setForzarNueva] = useState(false);

  const mostrarForma = !oferta || forzarNueva;
  const progreso = oferta ? calcularProgresoOferta(oferta) : null;

  function someterNombre() {
    const nom = validarNombreOferta(nombre);
    if (!nom.ok) {
      setError(nom.error);
      return;
    }
    const fr = validarFraseUtilidad(frase);
    if (!fr.ok) {
      setError(fr.error);
      return;
    }
    setError(null);
    setForzarNueva(false);
    onNombrar(nom.value.nombre, fr.value);
    setNombre("");
    setFrase("");
  }

  if (mostrarForma) {
    return (
      <section
        className="border-2 bg-black/55 p-4 sm:p-5"
        style={{ borderColor: `${WARN}88` }}
        data-testid="umbral-v2-oferta-gate"
      >
        <p
          className="flex items-center gap-1.5 text-[10px] tracking-[0.22em]"
          style={{ color: WARN }}
        >
          <Tag size={12} />
          LA ARENA · OFERTA NOMBRADA
        </p>
        <h3
          className="mt-2 text-lg font-black text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Sin nombre no hay Arena
        </h3>
        <p className="mt-1.5 text-sm text-white/60">
          Cada producto abre su propia carrera. Los 10 códigos sellan{" "}
          <em>este</em> nombre — no el operador.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-white/40">
            NOMBRE DEL PRODUCTO
          </span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={64}
            disabled={hidratando}
            placeholder="Ej. Corte Limpio"
            className="w-full border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white/90 outline-none placeholder:text-white/25 focus:border-[#00FFC3]/50"
            data-testid="umbral-v2-oferta-nombre"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-white/40">
            PARA QUÉ SIRVE · UNA FRASE
          </span>
          <textarea
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            rows={3}
            maxLength={240}
            disabled={hidratando}
            placeholder="El extraño tiene que poder repetir para qué le sirve."
            className="w-full resize-y border border-white/15 bg-black/50 px-3 py-2.5 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/25 focus:border-[#00FFC3]/50"
            data-testid="umbral-v2-oferta-frase"
          />
        </label>

        {error && (
          <p
            className="mt-2 text-xs text-[#FF6B35]"
            data-testid="umbral-v2-oferta-error"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={someterNombre}
          disabled={hidratando}
          className="mt-4 flex w-full items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold tracking-[0.16em] disabled:opacity-40"
          style={{
            background: `${WARN}18`,
            border: `1px solid ${WARN}88`,
            color: WARN,
          }}
          data-testid="umbral-v2-oferta-nombrar"
        >
          NOMBRAR Y ENTRAR A LA ARENA
        </button>

        {oferta && (
          <button
            type="button"
            onClick={() => {
              setForzarNueva(false);
              setError(null);
            }}
            className="mt-2 w-full text-center text-[11px] tracking-widest text-white/40 hover:text-white/70"
            data-testid="umbral-v2-oferta-cancelar-nueva"
          >
            VOLVER A «{oferta.nombre}»
          </button>
        )}

        {ofertas.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-2 text-[10px] tracking-widest text-white/35">
              OFERTAS ANTERIORES
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ofertas.map((o) => {
                const p = calcularProgresoOferta(o);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setForzarNueva(false);
                      onActivar(o.id);
                    }}
                    className="border px-2 py-1 text-[11px] text-white/70 hover:border-white/40"
                    style={{ borderColor: "rgba(255,255,255,0.15)" }}
                    data-testid={`umbral-v2-oferta-previa-${o.id}`}
                  >
                    {o.nombre} · {p.sellosCount}/10
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  if (!oferta || !progreso) return null;

  return (
    <section
      className="border bg-black/50 p-4"
      style={{ borderColor: `${GOLD}55` }}
      data-testid="umbral-v2-oferta-activa"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="flex items-center gap-1.5 text-[10px] tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            <Crosshair size={12} />
            OFERTA EN JUICIO
          </p>
          <h3
            className="mt-1 truncate text-lg font-black text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            data-testid="umbral-v2-oferta-nombre-activo"
          >
            {oferta.nombre}
          </h3>
          <p
            className="mt-1 text-sm text-white/55"
            data-testid="umbral-v2-oferta-frase-activa"
          >
            {oferta.fraseUtilidad}
          </p>
        </div>
        <p
          className="shrink-0 text-sm font-bold tracking-wide"
          style={{ color: GOLD }}
          data-testid="umbral-v2-oferta-sellos"
        >
          {progreso.sellosCount}/10
          {progreso.sellosCount >= 10 ? " · CARTA" : ""}
        </p>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1"
        data-testid="umbral-v2-oferta-sellos-fila"
      >
        {CODIGOS_NUMERO.map((n) => {
          const done = progreso.superados.includes(n as CodigoNumero);
          return (
            <span
              key={n}
              className="flex h-6 w-6 items-center justify-center border text-[10px] font-bold"
              style={{
                borderColor: done ? `${GOLD}88` : "rgba(255,255,255,0.12)",
                color: done ? GOLD : "rgba(255,255,255,0.3)",
                background: done ? `${GOLD}14` : "transparent",
              }}
              aria-label={`Sello ${n}${done ? " puesto" : " pendiente"}`}
            >
              {done ? <Check size={11} /> : n}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setForzarNueva(true)}
          className="flex items-center gap-1.5 text-[10px] tracking-widest text-white/40 hover:text-[#00FFC3]"
          data-testid="umbral-v2-oferta-nueva"
        >
          <Plus size={11} />
          OTRA OFERTA
        </button>
        {ofertas.length > 1 && (
          <span className="text-[10px] text-white/25">
            {ofertas.length} nombres en archivo
          </span>
        )}
      </div>
    </section>
  );
}

export default CardOfertaArena;

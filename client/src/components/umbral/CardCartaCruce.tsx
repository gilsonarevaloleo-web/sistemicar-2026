import React, { useState } from "react";
import { Check, ChevronDown, Copy, Megaphone, ScrollText } from "lucide-react";
import {
  cartaCruceEstaLista,
  componerCartaCruce,
  type CartaCruce,
  type PiezaAnuncioArena,
} from "@shared/umbral/cartaCruce";
import type { OfertaArena } from "@shared/umbral/ofertaArena";

const GOLD = "#D4AF37";
const CYAN = "#00FFC3";
const WARN = "#FF6B35";

export interface CardCartaCruceProps {
  oferta: OfertaArena;
  /** Completa en el cierre 10/10; compacta durante el cruce. */
  variante?: "compacta" | "completa";
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    if (typeof document === "undefined") return false;
    const el = document.createElement("textarea");
    el.value = texto;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function BotonCopiar({
  texto,
  label,
  testId,
  disabled,
}: {
  texto: string;
  label: string;
  testId: string;
  disabled?: boolean;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || !texto}
      onClick={() => {
        void copiarTexto(texto).then((copied) => {
          if (!copied) return;
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        });
      }}
      className="flex items-center justify-center gap-1.5 border px-3 py-2 text-[10px] font-bold tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-35"
      style={{
        borderColor: ok ? `${CYAN}88` : `${GOLD}66`,
        color: ok ? CYAN : GOLD,
      }}
      data-testid={testId}
    >
      {ok ? <Check size={12} /> : <Copy size={12} />}
      {ok ? "COPIADO" : label}
    </button>
  );
}

function PiezaAnuncio({ pieza }: { pieza: PiezaAnuncioArena }) {
  return (
    <article
      className="border border-white/10 bg-black/35 p-3"
      data-testid={`umbral-v2-anuncio-${pieza.codigo}`}
    >
      <p className="text-[10px] tracking-widest text-white/40">
        C{pieza.codigo} · {pieza.arquetipo.toUpperCase()}
        {pieza.lista ? "" : " · FALTA SELLO"}
      </p>
      {pieza.lista ? (
        <>
          <p className="mt-2 text-sm text-white/85">{pieza.gancho}</p>
          <p className="mt-2 text-xs italic text-white/50">«{pieza.objecion}»</p>
          <p className="mt-2 text-xs leading-relaxed text-white/65">
            {pieza.corte}
          </p>
          <div className="mt-3">
            <BotonCopiar
              texto={pieza.textoAnuncio}
              label="COPIAR ANUNCIO"
              testId={`umbral-v2-anuncio-copiar-${pieza.codigo}`}
            />
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-white/40">
          Este anuncio se arma cuando el Código {pieza.codigo} selle la oferta.
        </p>
      )}
    </article>
  );
}

function CuerpoCarta({ carta }: { carta: CartaCruce }) {
  const lista = cartaCruceEstaLista(carta);
  return (
    <div className="space-y-4" data-testid="umbral-v2-carta-cuerpo">
      <div>
        <p className="text-[10px] tracking-[0.22em]" style={{ color: GOLD }}>
          {carta.kicker}
        </p>
        <h3
          className="mt-1 text-xl font-black text-white"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          data-testid="umbral-v2-carta-nombre"
        >
          {carta.nombre}
        </h3>
        <p
          className="mt-1 text-sm text-white/70"
          data-testid="umbral-v2-carta-titular"
        >
          {carta.titular}
        </p>
        <p
          className="mt-2 text-[11px] font-bold tracking-wide"
          style={{ color: lista ? GOLD : WARN }}
          data-testid="umbral-v2-carta-sello"
        >
          {carta.sello}
        </p>
      </div>

      {!lista && (
        <p
          className="border px-3 py-2 text-xs"
          style={{ borderColor: `${WARN}66`, color: WARN }}
          data-testid="umbral-v2-carta-borrador"
        >
          Borrador. Faltan C{carta.faltantes.join(", C")}. Se mira, no se
          publica.
        </p>
      )}

      <ol className="space-y-3">
        {carta.bloques.map((b) => (
          <li
            key={b.codigo}
            className="border-l-2 pl-3"
            style={{ borderColor: b.cuerpo ? `${GOLD}66` : `${WARN}66` }}
            data-testid={`umbral-v2-carta-bloque-${b.codigo}`}
          >
            <p className="text-[10px] tracking-widest text-white/40">
              {b.label}
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">{b.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              {b.cuerpo ?? `Falta C${b.codigo}`}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 sm:flex-row">
        <BotonCopiar
          texto={carta.textoPlano}
          label="COPIAR CARTA"
          testId="umbral-v2-carta-copiar"
          disabled={!lista}
        />
        <BotonCopiar
          texto={carta.textoWhatsapp}
          label="COPIAR WHATSAPP"
          testId="umbral-v2-carta-whatsapp"
          disabled={!lista}
        />
      </div>

      <div data-testid="umbral-v2-carta-anuncios">
        <p
          className="mb-2 flex items-center gap-1.5 text-[10px] tracking-[0.2em]"
          style={{ color: CYAN }}
        >
          <Megaphone size={12} />
          PIEZAS DE ANUNCIO · APÁTICO / CÍNICO / ESCÉPTICO
        </p>
        {!lista && (
          <p className="mb-2 text-[11px] text-white/40">
            Se copian cuando la oferta está 10/10. Antes solo se ven las que ya
            tienen sello.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {carta.anuncios.map((pieza) => (
            <PiezaAnuncio key={pieza.codigo} pieza={pieza} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardCartaCruce({
  oferta,
  variante = "completa",
}: CardCartaCruceProps) {
  const carta = componerCartaCruce(oferta);
  const lista = cartaCruceEstaLista(carta);
  const [abierta, setAbierta] = useState(variante === "completa" || lista);

  if (variante === "compacta" && !abierta) {
    return (
      <section
        className="border bg-black/45 p-4"
        style={{ borderColor: lista ? `${GOLD}55` : "rgba(255,255,255,0.12)" }}
        data-testid="umbral-v2-carta-cruce"
      >
        <button
          type="button"
          onClick={() => setAbierta(true)}
          className="flex w-full items-center justify-between gap-3 text-left"
          data-testid="umbral-v2-carta-abrir"
        >
          <span>
            <p
              className="flex items-center gap-1.5 text-[10px] tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              <ScrollText size={12} />
              CARTA DE CRUCE
            </p>
            <p className="mt-1 text-sm text-white/70">
              {carta.nombre} · {carta.sello}
            </p>
          </span>
          <ChevronDown size={16} className="text-white/40" />
        </button>
      </section>
    );
  }

  return (
    <section
      className="border bg-black/45 p-4 sm:p-5"
      style={{ borderColor: lista ? `${GOLD}55` : "rgba(255,255,255,0.12)" }}
      data-testid="umbral-v2-carta-cruce"
    >
      {variante === "compacta" && (
        <button
          type="button"
          onClick={() => setAbierta(false)}
          className="mb-3 flex items-center gap-1.5 text-[10px] tracking-widest text-white/40 hover:text-white/70"
          data-testid="umbral-v2-carta-cerrar"
        >
          <ChevronDown size={12} className="rotate-180" />
          OCULTAR CARTA
        </button>
      )}
      <CuerpoCarta carta={carta} />
    </section>
  );
}

export default CardCartaCruce;

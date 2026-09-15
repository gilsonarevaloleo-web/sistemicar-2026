import React, { useState } from "react";
import { Eye } from "lucide-react";
import {
  LEY_OPTICA_CODIGO_OJOS,
} from "@shared/deposito/leyOpticaCodigo";
import type { DictamenOptico } from "@shared/deposito/analizarVolcado";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function EscalaDiezOjos({
  dictamen,
}: {
  dictamen: DictamenOptico;
}) {
  const posicion = dictamen.viendoCon || dictamen.frente;
  const abiertos = new Set<number>(dictamen.abiertos ?? dictamen.mando ?? []);

  return (
    <ol
      className="grid grid-cols-10 gap-1"
      data-testid="deposito-escala-ojos"
      aria-label="Escala de diez ojos"
    >
      {LEY_OPTICA_CODIGO_OJOS.map((ojo) => {
        const n = ojo.codigo;
        const esPosicion = posicion === n;
        const esSiguiente = dictamen.siguiente === n && dictamen.calidad !== "ruido";
        const abierto = abiertos.has(n);
        return (
          <li key={n} className="text-center">
            <span
              className="mx-auto mb-1 block h-1.5 w-full rounded-full"
              style={{
                backgroundColor: esSiguiente
                  ? AZURE
                  : esPosicion
                    ? GOLD
                    : abierto
                      ? `${GOLD}88`
                      : "rgba(255,255,255,0.08)",
                boxShadow: esSiguiente ? `0 0 8px ${AZURE}80` : undefined,
              }}
              title={`C${n} ${ojo.nombre}`}
            />
            <span className="text-[8px] text-white/35">{n}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function DictamenFrente({
  dictamen,
}: {
  dictamen: DictamenOptico;
}) {
  const [verMecanica, setVerMecanica] = useState(dictamen.calidad === "tecnico");
  const siguiente = LEY_OPTICA_CODIGO_OJOS[dictamen.siguiente - 1];
  const mando = dictamen.mando?.length ? dictamen.mando : dictamen.abiertos;

  return (
    <section
      className="border px-5 py-5 space-y-4"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.45)" }}
      data-testid="deposito-dictamen"
    >
      <p
        className="text-[10px] tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        DICTAMEN · {dictamen.tema.toUpperCase()}
      </p>
      <p className="text-sm leading-relaxed text-white/80">{dictamen.dictamen}</p>
      {dictamen.calidad !== "ruido" && mando.length > 1 && (
        <p
          className="text-[10px] tracking-[0.14em] text-white/50"
          data-testid="deposito-mando"
        >
          MANDO · {mando.map((n) => `C${n}`).join(" → ")}
        </p>
      )}
      <EscalaDiezOjos dictamen={dictamen} />
      {dictamen.calidad !== "ruido" && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setVerMecanica((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 border"
            style={{
              color: AZURE,
              borderColor: `${AZURE}55`,
              backgroundColor: `${AZURE}12`,
            }}
            data-testid="deposito-entrar-siguiente"
          >
            Observar con C{dictamen.siguiente} {siguiente.nombre}
          </button>
          {verMecanica && (
            <p
              className="mt-3 text-xs leading-relaxed text-white/70"
              data-testid="deposito-mecanica"
            >
              <Eye size={12} className="inline mr-2" style={{ color: GOLD }} />
              {dictamen.mecanica}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default DictamenFrente;

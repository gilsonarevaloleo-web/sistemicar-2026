import React, { useState } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import {
  LEY_CASAS_UMBRAL_AXIOMAS,
  LEY_CASAS_UMBRAL_FIRMA,
  LEY_CASAS_UMBRAL_MARCA,
  LEY_CASAS_UMBRAL_NOMBRE,
  LEY_CASAS_UMBRAL_NO_ES,
  MUNDOS_OPERATIVOS,
  etiquetaMundo,
  type MundoOperativo,
} from "@shared/planetas/leyCasasUmbral";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function CardLeyCasasUmbral({
  planetaActivo,
}: {
  planetaActivo?: MundoOperativo["numero"];
}) {
  const [abierta, setAbierta] = useState(false);
  const sello = planetaActivo ? etiquetaMundo(planetaActivo) : null;

  return (
    <section
      className="border bg-black/40 mb-6"
      style={{ borderColor: `${GOLD}44` }}
      data-testid="ley-casas-umbral"
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={abierta}
        data-testid="ley-casas-umbral-toggle"
      >
        <Globe2
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: GOLD }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {LEY_CASAS_UMBRAL_MARCA.toUpperCase()}
            {sello ? ` · ${sello.toUpperCase()}` : ""}
          </span>
          <span
            className="mt-0.5 block text-sm font-bold text-white"
            data-testid="ley-casas-umbral-nombre"
          >
            {LEY_CASAS_UMBRAL_NOMBRE}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-white/55">
            {LEY_CASAS_UMBRAL_FIRMA}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`mt-1 shrink-0 text-white/40 transition-transform ${abierta ? "rotate-180" : ""}`}
        />
      </button>

      {abierta && (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: `${GOLD}22` }}
          data-testid="ley-casas-umbral-cuerpo"
        >
          <ol className="space-y-1.5" data-testid="ley-casas-umbral-mapa">
            {MUNDOS_OPERATIVOS.filter(
              (m) => m.tipo === "casa" || m.tipo === "umbral" || m.tipo === "en_camino"
            ).map((m) => {
              const activo = planetaActivo === m.numero;
              return (
                <li
                  key={m.numero}
                  className="text-xs leading-relaxed"
                  style={{ color: activo ? GOLD : "rgba(255,255,255,0.65)" }}
                >
                  <span className="font-bold">
                    {m.numero} {m.nombre}
                  </span>
                  {m.tipo === "casa" ? " · casa" : m.tipo === "umbral" ? " · puerta" : " · en camino"}
                  {" — "}
                  {m.acto}
                </li>
              );
            })}
          </ol>
          {LEY_CASAS_UMBRAL_AXIOMAS.map((a) => (
            <div key={a.id}>
              <p
                className="text-[10px] tracking-widest"
                style={{ color: AZURE }}
              >
                {a.titulo.toUpperCase()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {a.texto}
              </p>
            </div>
          ))}
          <p className="text-[11px] leading-relaxed text-white/40">
            {LEY_CASAS_UMBRAL_NO_ES.join(" ")}
          </p>
        </div>
      )}
    </section>
  );
}

export default CardLeyCasasUmbral;

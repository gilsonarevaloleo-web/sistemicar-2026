import React, { useState } from "react";
import { ChevronDown, Brain } from "lucide-react";
import {
  INSTRUCCION_CRITERIO_ADAPTATIVO,
  UMBRAL_AXIOMA_ESTRUCTURA,
  type UserMetacognitionStore,
} from "@shared/deposito/memoryEngine";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function CardAxiomasMetacognicion({
  store,
}: {
  store: UserMetacognitionStore;
}) {
  const [abierta, setAbierta] = useState(false);
  const n = store.axiomas.length;

  return (
    <section
      className="border bg-black/40 mb-6"
      style={{ borderColor: `${GOLD}44` }}
      data-testid="deposito-axiomas"
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={abierta}
        data-testid="deposito-axiomas-toggle"
      >
        <Brain
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
            CRITERIO ADAPTATIVO
          </span>
          <span
            className="mt-0.5 block text-sm font-bold text-white"
            data-testid="deposito-axiomas-nombre"
          >
            Axiomas del operador
          </span>
          <span
            className="mt-1 block text-xs leading-relaxed text-white/55"
            data-testid="deposito-axiomas-resumen"
          >
            {n === 0
              ? `Vacío. Solo un volcado con estructura > ${UMBRAL_AXIOMA_ESTRUCTURA} escribe principio.`
              : `${n} principio${n === 1 ? "" : "s"} descubierto${n === 1 ? "" : "s"}. El Maestro los usa contra el automatismo.`}
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
          data-testid="deposito-axiomas-cuerpo"
        >
          <p className="text-xs leading-relaxed text-white/65">
            {INSTRUCCION_CRITERIO_ADAPTATIVO}
          </p>
          {n > 0 && (
            <ol className="space-y-3" data-testid="deposito-axiomas-lista">
              {store.axiomas.map((a) => (
                <li key={a.id ?? `${a.fecha}-${a.codigoRelacionado}`}>
                  <p
                    className="text-[10px] tracking-widest"
                    style={{ color: AZURE }}
                  >
                    {a.codigoRelacionado}
                    {a.metaforaClave ? ` · ${a.metaforaClave}` : ""}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">
                    {a.principioDescubierto}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

export default CardAxiomasMetacognicion;

import React, { useState } from "react";
import { LEY_OPTICA_CODIGO_OJOS } from "@shared/deposito/leyOpticaCodigo";
import {
  LEY_CRITERIO_VIVO_RITUAL,
  puedeSellarCriterio,
} from "@shared/deposito/criterioMaestro";
import type { CodigoObservador } from "@shared/deposito/engineConfig";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function SelloCriterio({
  volcadoCrudo,
  codigoMotor,
  disabled,
  onSellar,
  onCorregir,
}: {
  volcadoCrudo: string;
  codigoMotor: CodigoObservador;
  disabled?: boolean;
  onSellar: (sabiduria?: string) => void;
  onCorregir: (codigo: CodigoObservador, sabiduria: string) => void;
}) {
  const [modo, setModo] = useState<"idle" | "sello" | "correccion">("idle");
  const [sabiduria, setSabiduria] = useState("");
  const [ojo, setOjo] = useState<CodigoObservador>(codigoMotor);
  const sellable = puedeSellarCriterio(volcadoCrudo);

  if (!sellable) {
    return (
      <section
        className="border px-5 py-4"
        style={{ borderColor: `${GOLD}33`, backgroundColor: "rgba(0,0,0,0.35)" }}
        data-testid="deposito-sello-criterio"
      >
        <p
          className="text-[10px] tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          CRITERIO DEL MAESTRO
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          El ruido no sella sabiduría. Volcá un hecho y el código podrá tener
          criterio.
        </p>
      </section>
    );
  }

  return (
    <section
      className="border px-5 py-4 space-y-3"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.35)" }}
      data-testid="deposito-sello-criterio"
    >
      <p
        className="text-[10px] tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        CRITERIO DEL MAESTRO
      </p>
      <p className="text-sm leading-relaxed text-white/70">
        El código no tiene criterio propio hasta que sellás sabiduría.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setModo((m) => (m === "sello" ? "idle" : "sello"))}
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 disabled:opacity-40"
          style={{ backgroundColor: GOLD, color: "#111" }}
          data-testid="deposito-sello-abrir"
        >
          {LEY_CRITERIO_VIVO_RITUAL}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setModo((m) => (m === "correccion" ? "idle" : "correccion"))
          }
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 border disabled:opacity-40"
          style={{
            color: AZURE,
            borderColor: `${AZURE}55`,
            backgroundColor: `${AZURE}12`,
          }}
          data-testid="deposito-corregir-abrir"
        >
          El ojo era otro
        </button>
      </div>

      {modo === "sello" && (
        <div className="space-y-2" data-testid="deposito-sello-form">
          <textarea
            value={sabiduria}
            onChange={(e) => setSabiduria(e.target.value)}
            rows={3}
            placeholder="¿Qué viste? Si lo dejás vacío, el Maestro sella el hecho seco."
            className="w-full bg-black/50 border px-3 py-2 text-sm text-white/85 placeholder:text-white/25"
            style={{ borderColor: `${GOLD}33` }}
            data-testid="deposito-sello-sabiduria"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onSellar(sabiduria.trim() || undefined);
              setSabiduria("");
              setModo("idle");
            }}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2"
            style={{ backgroundColor: GOLD, color: "#111" }}
            data-testid="deposito-sello-confirmar"
          >
            Sellar sabiduría
          </button>
        </div>
      )}

      {modo === "correccion" && (
        <div className="space-y-3" data-testid="deposito-correccion-form">
          <p className="text-[10px] tracking-widest text-white/40">
            EL MAESTRO NOMBRÓ C{codigoMotor}. ¿CUÁL ERA?
          </p>
          <ol className="grid grid-cols-5 gap-1.5">
            {LEY_OPTICA_CODIGO_OJOS.map((o) => {
              const n = o.codigo as CodigoObservador;
              const activo = ojo === n;
              return (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => setOjo(n)}
                    className="w-full px-1 py-2 text-[10px] uppercase tracking-widest border"
                    style={{
                      color: activo ? "#111" : "rgba(255,255,255,0.7)",
                      backgroundColor: activo ? GOLD : "transparent",
                      borderColor: activo ? GOLD : "rgba(255,255,255,0.12)",
                    }}
                    data-testid={`deposito-correccion-ojo-${n}`}
                  >
                    C{n}
                  </button>
                </li>
              );
            })}
          </ol>
          <textarea
            value={sabiduria}
            onChange={(e) => setSabiduria(e.target.value)}
            rows={3}
            placeholder="¿Qué viste que el Maestro no?"
            className="w-full bg-black/50 border px-3 py-2 text-sm text-white/85 placeholder:text-white/25"
            style={{ borderColor: `${AZURE}33` }}
            data-testid="deposito-correccion-sabiduria"
          />
          <button
            type="button"
            disabled={disabled || sabiduria.trim().length < 12}
            onClick={() => {
              onCorregir(ojo, sabiduria.trim());
              setSabiduria("");
              setModo("idle");
            }}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 disabled:opacity-40"
            style={{ backgroundColor: AZURE, color: "#111" }}
            data-testid="deposito-correccion-confirmar"
          >
            Sellar corrección
          </button>
        </div>
      )}
    </section>
  );
}

export default SelloCriterio;

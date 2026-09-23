import React from "react";
import type { CodigoObservador } from "@shared/deposito/engineConfig";
import {
  etiquetaGrado,
  type ExpedienteOjos,
} from "@shared/deposito/grados";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function MapaCalorOjos({
  expediente,
  compact = false,
  testId = "deposito-expediente",
  etiquetaGradoOverride,
}: {
  expediente: ExpedienteOjos;
  compact?: boolean;
  testId?: string;
  etiquetaGradoOverride?: string;
}) {
  const etiqueta =
    etiquetaGradoOverride ?? etiquetaGrado(expediente.gradoOperador);
  return (
    <div data-testid={testId}>
      <p
        className="text-[10px] tracking-[0.22em] mb-2"
        style={{ color: GOLD }}
      >
        MAPA DE CALOR · {expediente.rango}/{expediente.techo}
        {compact ? "" : ` · ${etiqueta}`}
      </p>
      <ol className="grid grid-cols-10 gap-1 mb-2" aria-label="Ojos nombrados">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const nombrado = expediente.ojosNombrados.includes(n as CodigoObservador);
          const hueco = expediente.hueco === n;
          const atasco = expediente.atasco === n;
          return (
            <li key={n} className="text-center">
              <span
                className="mx-auto mb-1 block h-1.5 w-full rounded-full"
                style={{
                  backgroundColor: atasco
                    ? "#F97316"
                    : hueco
                      ? AZURE
                      : nombrado
                        ? GOLD
                        : "rgba(255,255,255,0.08)",
                }}
              />
              <span className="text-[8px] text-white/35">{n}</span>
            </li>
          );
        })}
      </ol>
      {!compact && (
        <p className="text-xs leading-relaxed text-white/55">
          {expediente.haciaDonde}
        </p>
      )}
    </div>
  );
}

export default MapaCalorOjos;

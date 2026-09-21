import React from "react";
import { Eye } from "lucide-react";
import type { CodigoObservador, DiagnosticoVolcado } from "@shared/deposito/engineConfig";
import { DICCIONARIO_OJOS } from "@shared/deposito/engineConfig";
import {
  etiquetaGrado,
  type ExpedienteOjos,
  type LecturaGradoVolcado,
} from "@shared/deposito/grados";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

const NIVEL_LABEL: Record<DiagnosticoVolcado["nivelCargaSugerido"], string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  SUPERIOR: "Superior",
};

export function DiagnosticoUniversidad({
  diagnostico,
  lectura,
  expediente,
}: {
  diagnostico: DiagnosticoVolcado;
  lectura?: LecturaGradoVolcado;
  expediente?: ExpedienteOjos;
}) {
  const ojo = DICCIONARIO_OJOS[diagnostico.codigoDominante];

  return (
    <section
      className="border px-5 py-5 space-y-5"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.45)" }}
      data-testid="deposito-diagnostico"
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="text-[10px] tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          UNIVERSIDAD · MURO DE DOMINANCIA
        </p>
        <span
          className="text-[9px] tracking-[0.18em] uppercase text-right"
          style={{ color: AZURE }}
          data-testid="deposito-nivel-carga"
        >
          Carga {NIVEL_LABEL[diagnostico.nivelCargaSugerido]}
          {lectura && (
            <span
              className="block mt-1"
              data-testid="deposito-grado"
            >
              {etiquetaGrado(lectura.grado)}
            </span>
          )}
          {expediente && (
            <span className="block mt-1 text-white/45">
              {etiquetaGrado(expediente.gradoOperador)}
            </span>
          )}
        </span>
      </div>

      <div data-testid="deposito-ojo-dominante">
        <p
          className="text-[10px] tracking-[0.22em] mb-2"
          style={{ color: AZURE }}
        >
          1 · EL OJO DOMINANTE
        </p>
        <p className="text-lg font-light text-white">
          C{diagnostico.codigoDominante} {diagnostico.nombreOjoDominante}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-white/35">
          Observa {ojo.focoAtencion} · {ojo.voz}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          {diagnostico.justificacionDominante}
        </p>
      </div>

      <div data-testid="deposito-punto-ciego">
        <p
          className="text-[10px] tracking-[0.22em] mb-2"
          style={{ color: AZURE }}
        >
          2 · PUNTO CIEGO / LO NO DICHO
        </p>
        <p className="text-sm leading-relaxed text-white/80">
          {diagnostico.puntoCiego}
        </p>
        {lectura && (
          <p
            className="mt-2 text-[11px] leading-relaxed text-white/40"
            data-testid="deposito-capas"
          >
            Señal: {lectura.capas.senal} · {lectura.capas.ruido}
          </p>
        )}
      </div>

      <div data-testid="deposito-devolucion-maestro">
        <p
          className="text-[10px] tracking-[0.22em] mb-2"
          style={{ color: GOLD }}
        >
          DEVOLUCIÓN DEL MAESTRO
        </p>
        <p className="text-sm leading-relaxed text-white/80">
          {diagnostico.devolucionMaestro}
        </p>
      </div>

      <div data-testid="deposito-mecanica-absorcion">
        <p
          className="text-[10px] tracking-[0.22em] mb-2"
          style={{ color: AZURE }}
        >
          3 · MECÁNICA DE ABSORCIÓN
        </p>
        <p className="text-sm leading-relaxed text-white/85">
          <Eye size={12} className="inline mr-2" style={{ color: GOLD }} />
          {diagnostico.mecanicaAbsorcion}
        </p>
      </div>

      {expediente && (
        <div data-testid="deposito-expediente">
          <p
            className="text-[10px] tracking-[0.22em] mb-2"
            style={{ color: GOLD }}
          >
            MAPA DE CALOR · {expediente.rango}/{expediente.techo} ·{" "}
            {etiquetaGrado(expediente.gradoOperador)}
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
          <p className="text-xs leading-relaxed text-white/55">
            {expediente.haciaDonde}
          </p>
        </div>
      )}
    </section>
  );
}

export default DiagnosticoUniversidad;

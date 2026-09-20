import React from "react";
import { Eye } from "lucide-react";
import type { DiagnosticoVolcado } from "@shared/deposito/engineConfig";
import { DICCIONARIO_OJOS } from "@shared/deposito/engineConfig";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

const NIVEL_LABEL: Record<DiagnosticoVolcado["nivelCargaSugerido"], string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  SUPERIOR: "Superior",
};

export function DiagnosticoUniversidad({
  diagnostico,
}: {
  diagnostico: DiagnosticoVolcado;
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
          className="text-[9px] tracking-[0.18em] uppercase"
          style={{ color: AZURE }}
          data-testid="deposito-nivel-carga"
        >
          Carga {NIVEL_LABEL[diagnostico.nivelCargaSugerido]}
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
          2 · PUNTO CIEGO / CEGUERA ACTIVA
        </p>
        <p className="text-sm leading-relaxed text-white/80">
          {diagnostico.puntoCiego}
        </p>
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
    </section>
  );
}

export default DiagnosticoUniversidad;

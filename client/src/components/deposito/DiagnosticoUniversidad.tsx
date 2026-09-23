import React from "react";
import { Eye } from "lucide-react";
import type { DiagnosticoVolcado } from "@shared/deposito/engineConfig";
import {
  DICCIONARIO_OJOS,
  etiquetaGradoMaestria,
  placementOcultaGradoAnterior,
} from "@shared/deposito/engineConfig";
import {
  etiquetaGrado,
  type ExpedienteOjos,
  type LecturaGradoVolcado,
} from "@shared/deposito/grados";
import { MapaCalorOjos } from "./MapaCalorOjos";

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
  const evaluacion = diagnostico.evaluacionGrado;
  const soloGradoDetectado = placementOcultaGradoAnterior(evaluacion);
  const badgeGradoActivo = soloGradoDetectado
    ? etiquetaGradoMaestria(evaluacion.gradoDetectado)
    : null;

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
          {badgeGradoActivo ? (
            <span
              className="block mt-1"
              data-testid="deposito-grado"
            >
              {badgeGradoActivo}
            </span>
          ) : (
            <>
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
            </>
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
          2 · LECTURA DEL ESTADO
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

      {diagnostico.validacionGrado && !soloGradoDetectado && (
        <div data-testid="deposito-validacion-grado">
          <p
            className="text-[10px] tracking-[0.22em] mb-2"
            style={{ color: GOLD }}
          >
            VALIDACIÓN DE GRADO {diagnostico.validacionGrado.gradoEvaluado}
          </p>
          <p className="text-sm leading-relaxed text-white/80">
            {diagnostico.validacionGrado.comentarioMaestro}
          </p>
        </div>
      )}

      {evaluacion && (
        <div data-testid="deposito-evaluacion-grado">
          <p
            className="text-[10px] tracking-[0.22em] mb-2"
            style={{ color: evaluacion.meritoReconocido ? GOLD : AZURE }}
          >
            {soloGradoDetectado
              ? etiquetaGradoMaestria(evaluacion.gradoDetectado)
              : evaluacion.meritoReconocido
                ? `PLACEMENT · MÉRITO G${evaluacion.gradoDetectado}`
                : `PLACEMENT · G${evaluacion.gradoDetectado}`}
          </p>
          <p
            className="text-sm leading-relaxed text-white/80"
            data-testid="deposito-mensaje-encuadre"
          >
            {evaluacion.mensajeEncuadre}
          </p>
        </div>
      )}

      {diagnostico.metricasMerito && (
        <div data-testid="deposito-metricas-merito">
          <p
            className="text-[10px] tracking-[0.22em] mb-2"
            style={{ color: AZURE }}
          >
            MÉRITO · 3 EJES
          </p>
          <ul className="space-y-1 text-xs text-white/70">
            <li data-testid="deposito-densidad">
              Estructura {diagnostico.metricasMerito.densidadEstructural}/100
            </li>
            <li data-testid="deposito-rotacion">
              Rotación {diagnostico.metricasMerito.variedadRotacionCodigo}
            </li>
            <li data-testid="deposito-metacognicion">
              Metacognición{" "}
              {diagnostico.metricasMerito.metacognicionDetectada ? "sí" : "no"}
            </li>
          </ul>
        </div>
      )}

      {diagnostico.florDetectada && diagnostico.florDetectada.length > 0 && (
        <p
          className="text-[11px] leading-relaxed text-white/40"
          data-testid="deposito-flor-detectada"
        >
          Flor: {diagnostico.florDetectada.join(", ")}
        </p>
      )}

      {expediente && (
        <MapaCalorOjos
          expediente={expediente}
          etiquetaGradoOverride={badgeGradoActivo ?? undefined}
        />
      )}
    </section>
  );
}

export default DiagnosticoUniversidad;

import React, { useState, type FormEvent } from "react";
import {
  camposVisiblesPorTier,
  isAdvancedTier,
  type DepotAnalysisResult,
  type UserTier,
} from "@shared/deposito/v3";
import { auditarVolcadoV3 } from "@/lib/deposito/v3/api";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export interface FormularioAuditoriaV3Props {
  userTier: UserTier;
  onAnalysisComplete: (
    result: DepotAnalysisResult,
    source: "gemini" | "local_fallback",
  ) => void;
  disabled?: boolean;
}

export function FormularioAuditoriaV3({
  userTier,
  onAnalysisComplete,
  disabled,
}: FormularioAuditoriaV3Props) {
  const [rawFact, setRawFact] = useState("");
  const [detectedNoise, setDetectedNoise] = useState("");
  const [omittedShadow, setOmittedShadow] = useState("");
  const [studentHypothesis, setStudentHypothesis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibles = camposVisiblesPorTier(userTier);
  const avanzado = isAdvancedTier(userTier);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!rawFact.trim()) {
      setErrorMessage("El volcado del hecho crudo es obligatorio.");
      return;
    }
    if (avanzado && (!detectedNoise.trim() || !omittedShadow.trim())) {
      setErrorMessage(
        "Carrera y Título exigen flor/excusa y lo no dicho.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = await auditarVolcadoV3({
        rawFact: rawFact.trim(),
        detectedNoise: avanzado ? detectedNoise.trim() : undefined,
        omittedShadow: avanzado ? omittedShadow.trim() : undefined,
        studentHypothesis: studentHypothesis.trim() || undefined,
        userTier,
      });
      onAnalysisComplete(data.result, data.source);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error de conexión con el motor de auditoría.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fieldStyle = {
    border: `1px solid ${GOLD}33`,
    backgroundColor: "rgba(0,0,0,0.5)",
  } as const;

  return (
    <div data-testid="deposito-v3-form">
      <div className="mb-6 flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: `${GOLD}22` }}>
        <div>
          <h2
            className="text-sm font-bold uppercase tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            Laboratorio de Volcado
          </h2>
          <p className="mt-1 text-[11px] text-white/40">
            Óptica-Código: hecho frío. La moral no elige canal.
          </p>
        </div>
        <span
          className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest"
          style={{
            color: GOLD,
            border: `1px solid ${GOLD}44`,
            backgroundColor: `${GOLD}14`,
          }}
          data-testid="deposito-v3-tier"
        >
          {userTier}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="deposito-v3-rawfact"
            className="mb-2 block text-[10px] tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            1. El territorio crudo *
          </label>
          <textarea
            id="deposito-v3-rawfact"
            value={rawFact}
            onChange={(e) => setRawFact(e.target.value)}
            placeholder="Volcá el día. Crudo. Horas, minutos, acciones…"
            rows={6}
            disabled={disabled || isLoading}
            className="w-full resize-y p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/25"
            style={fieldStyle}
            data-testid="deposito-v3-rawfact"
          />
        </div>

        {visibles.includes("studentHypothesis") && (
          <div>
            <label
              htmlFor="deposito-v3-hypothesis"
              className="mb-2 block text-[10px] tracking-[0.22em] text-white/45"
            >
              2. Ley / hipótesis descubierta (opcional)
            </label>
            <input
              id="deposito-v3-hypothesis"
              type="text"
              value={studentHypothesis}
              onChange={(e) => setStudentHypothesis(e.target.value)}
              placeholder="¿Qué ley o código creés que apareció?"
              disabled={disabled || isLoading}
              className="w-full px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/25"
              style={fieldStyle}
              data-testid="deposito-v3-hypothesis"
            />
          </div>
        )}

        {avanzado && (
          <div className="space-y-5 border-t pt-5" style={{ borderColor: `${GOLD}18` }}>
            <div>
              <label
                htmlFor="deposito-v3-noise"
                className="mb-2 block text-[10px] tracking-[0.22em]"
                style={{ color: AZURE }}
              >
                3. Desinfección de flor / excusa *
              </label>
              <textarea
                id="deposito-v3-noise"
                value={detectedNoise}
                onChange={(e) => setDetectedNoise(e.target.value)}
                placeholder="¿Dónde detectás culpa, «debo» o adorno moral?"
                rows={3}
                disabled={disabled || isLoading}
                className="w-full resize-y p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/25"
                style={fieldStyle}
                data-testid="deposito-v3-noise"
              />
            </div>
            <div>
              <label
                htmlFor="deposito-v3-shadow"
                className="mb-2 block text-[10px] tracking-[0.22em]"
                style={{ color: AZURE }}
              >
                4. La sombra / lo no dicho *
              </label>
              <textarea
                id="deposito-v3-shadow"
                value={omittedShadow}
                onChange={(e) => setOmittedShadow(e.target.value)}
                placeholder="¿Qué omitiste o no querías nombrar?"
                rows={3}
                disabled={disabled || isLoading}
                className="w-full resize-y p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/25"
                style={fieldStyle}
                data-testid="deposito-v3-shadow"
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <p
            className="text-xs text-red-400/90"
            data-testid="deposito-v3-error"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || isLoading}
          className="w-full py-3 text-[11px] font-bold uppercase tracking-widest disabled:opacity-40"
          style={{ backgroundColor: GOLD, color: "#111" }}
          data-testid="deposito-v3-submit"
        >
          {isLoading ? "Auditando óptica y sintaxis…" : "Auditar volcado"}
        </button>
      </form>
    </div>
  );
}

export default FormularioAuditoriaV3;

import React from "react";
import { CANON_TEN_EYES, type DepotAnalysisResult } from "@shared/deposito/v3";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export function DictamenCardV3({ result }: { result: DepotAnalysisResult }) {
  const perception = CANON_TEN_EYES[result.perceptionEye];
  const character = CANON_TEN_EYES[result.characterSignedCode];

  return (
    <section
      className="space-y-5 border px-5 py-5"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.45)" }}
      data-testid="deposito-v3-dictamen"
    >
      <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: `${GOLD}22` }}>
        <div>
          <span className="block text-[10px] tracking-[0.22em] text-white/40">
            AUDITORÍA DE INGENIERÍA
          </span>
          <h2 className="mt-1 text-lg font-light tracking-tight text-white">
            Dictamen de Óptica-Código
          </h2>
        </div>
        <div
          className="px-4 py-2 text-right"
          style={{ border: `1px solid ${GOLD}33` }}
          data-testid="deposito-v3-delta"
        >
          <span className="block text-[10px] font-mono uppercase text-white/40">
            Brecha Δ
          </span>
          <span className="font-mono text-xl font-bold" style={{ color: GOLD }}>
            Δ {result.deltaGap}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div data-testid="deposito-v3-optica">
          <span className="block text-[10px] uppercase tracking-wider" style={{ color: AZURE }}>
            Ojo de percepción (óptica)
          </span>
          <p className="mt-1 text-sm font-bold text-white/90">
            C{result.perceptionEye} · {perception.name}
            <span className="ml-2 text-[10px] font-normal text-white/40">
              {perception.planeta}
            </span>
          </p>
        </div>
        <div data-testid="deposito-v3-caracter">
          <span className="block text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>
            Firma sintáctica (carácter)
          </span>
          <p className="mt-1 text-sm font-bold text-white/90">
            C{result.characterSignedCode} · {character.name}
            <span className="ml-2 text-[10px] font-normal text-white/40">
              {character.planeta}
            </span>
          </p>
        </div>
      </div>

      <div className="border-l-2 pl-4" style={{ borderColor: AZURE }}>
        <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: AZURE }}>
          Sintaxis de redacción
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-white/70">
          {result.syntaxDiagnostic.syntaxCharacteristics}
        </p>
      </div>

      <div className="border-l-2 pl-4" style={{ borderColor: GOLD }}>
        <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          Sustentación de chasis
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-white/70">
          {result.groundingStatus.diagnosticMessage}
        </p>
      </div>

      <div className="p-4" style={{ border: `1px solid ${GOLD}22`, backgroundColor: "rgba(0,0,0,0.35)" }}>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-400/80">
          Causa real de ingeniería
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-white/70">
          {result.systemicAnalysis.realEngineeringCause}
        </p>
      </div>

      <div className="p-4" style={{ border: `1px solid ${GOLD}44`, backgroundColor: `${GOLD}10` }}>
        <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
          Ajuste técnico inmediato
        </span>
        <p className="mt-1 text-xs font-semibold leading-relaxed" style={{ color: `${GOLD}ee` }}>
          {result.immediateAdjustment}
        </p>
      </div>
    </section>
  );
}

export default DictamenCardV3;

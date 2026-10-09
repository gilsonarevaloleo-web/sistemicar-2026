import { useState } from "react";
import { Link } from "wouter";
import { useDepositoEntitlements } from "@/hooks/useDepositoEntitlements";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { FormularioAuditoriaV3 } from "@/components/deposito/v3/FormularioAuditoriaV3";
import { MapaCalorV3 } from "@/components/deposito/v3/MapaCalorV3";
import { DictamenCardV3 } from "@/components/deposito/v3/DictamenCardV3";
import {
  DEPOSITO_V3_RITUAL,
  userTierFromEntitlements,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";

export default function DepositoV3Page() {
  useViewTransitionShield();
  useDualKernelMotorsQuiet();
  const entitlements = useDepositoEntitlements();
  const userTier = userTierFromEntitlements(entitlements);
  const [analysis, setAnalysis] = useState<DepotAnalysisResult | null>(null);
  const [source, setSource] = useState<"gemini" | "local_fallback" | null>(null);

  return (
    <main
      className="min-h-screen px-4 py-10 text-white"
      style={{ backgroundColor: "#020202" }}
      data-testid="deposito-v3-page"
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <p
            className="mb-3 text-[10px] tracking-[0.28em]"
            style={{ color: GOLD }}
            data-testid="deposito-v3-badge"
          >
            UNIVERSIDAD · DEPÓSITO V3 · LABORATORIO
          </p>
          <h1 className="text-3xl font-light tracking-tight md:text-4xl">
            {DEPOSITO_V3_RITUAL}
          </h1>
          <p className="mt-3 text-sm text-white/45">
            El dictamen es óptica + carácter + Δ. V2 sigue en su recinto.
          </p>
          <Link
            href="/esperanza"
            className="mt-4 inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
            data-testid="deposito-v3-volver-v2"
          >
            Volver a Depósito V2
          </Link>
        </header>

        <FormularioAuditoriaV3
          userTier={userTier}
          disabled={!entitlements.ready}
          onAnalysisComplete={(result, origen) => {
            setAnalysis(result);
            setSource(origen);
          }}
        />

        {analysis && (
          <div className="space-y-6" data-testid="deposito-v3-resultado">
            {source && (
              <p className="text-[10px] uppercase tracking-widest text-white/30">
                Fuente · {source === "gemini" ? "Gemini" : "Fallback local"}
              </p>
            )}
            <MapaCalorV3 result={analysis} userTier={userTier} />
            <DictamenCardV3 result={analysis} />
          </div>
        )}
      </div>
    </main>
  );
}

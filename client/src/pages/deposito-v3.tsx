import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuthContext } from "@/App";
import { useDepositoEntitlements } from "@/hooks/useDepositoEntitlements";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { FormularioAuditoriaV3 } from "@/components/deposito/v3/FormularioAuditoriaV3";
import { MapaCalorV3 } from "@/components/deposito/v3/MapaCalorV3";
import { DictamenCardV3 } from "@/components/deposito/v3/DictamenCardV3";
import { BotonCopiarV3 } from "@/components/deposito/v3/BotonCopiarV3";
import { HistorialV3 } from "@/components/deposito/v3/HistorialV3";
import { GradoConsistenciaV3 } from "@/components/deposito/v3/GradoConsistenciaV3";
import { CerebroMadreV3 } from "@/components/deposito/v3/CerebroMadreV3";
import {
  addVolcadoV3Entry,
  listVolcadosV3Local,
  subscribeToVolcadosV3,
  type VolcadoV3Entry,
} from "@/lib/deposito/v3/volcados";
import {
  enviarCandidatoAFiltro,
  loadCerebroMadre,
  promoverFiltroALey,
  rechazarCandidatoOFiltro,
  registrarAuditoriaEnCerebroMadre,
  subscribeToCerebroMadre,
} from "@/lib/deposito/v3/cerebroMadre";
import {
  DEPOSITO_V3_RITUAL,
  cerebroVacio,
  userTierFromEntitlements,
  type CerebroMadre,
  type DepotAnalysisResult,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";

export default function DepositoV3Page() {
  useViewTransitionShield();
  const motorsQuiet = useDualKernelMotorsQuiet();
  const { user } = useAuthContext();
  const entitlements = useDepositoEntitlements();
  const userTier = userTierFromEntitlements(entitlements);
  const uid = user?.uid ?? "anon";
  const [analysis, setAnalysis] = useState<DepotAnalysisResult | null>(null);
  const [source, setSource] = useState<"gemini" | "local_fallback" | null>(null);
  const [ultima, setUltima] = useState<VolcadoV3Entry | null>(null);
  const [historial, setHistorial] = useState<VolcadoV3Entry[]>([]);
  const [cerebro, setCerebro] = useState<CerebroMadre>(cerebroVacio);

  useEffect(() => {
    setHistorial(listVolcadosV3Local(uid));
    setCerebro(loadCerebroMadre());
    const unsubCasa = subscribeToCerebroMadre(setCerebro);
    if (motorsQuiet) {
      return () => {
        unsubCasa();
      };
    }
    const unsubVolcados = subscribeToVolcadosV3(uid, setHistorial, () => {
      setHistorial(listVolcadosV3Local(uid));
    });
    return () => {
      unsubCasa();
      unsubVolcados();
    };
  }, [uid, motorsQuiet]);

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
            UNIVERSIDAD · DEPÓSITO V3
          </p>
          <h1 className="text-3xl font-light tracking-tight md:text-4xl">
            {DEPOSITO_V3_RITUAL}
          </h1>
          <p className="mt-3 text-sm text-white/45">
            El dictamen es firma + cascada + vacíos. El título es C1. C10
            solo abrocha si el cierre vuelve al título. El ajuste enseña el
            escalón pendiente, no un juicio. V2 queda en su recinto.
          </p>
          <Link
            href="/deposito-v2"
            className="mt-4 inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
            data-testid="deposito-v3-volver-v2"
          >
            Volver a Depósito V2
          </Link>
        </header>

        <GradoConsistenciaV3 entries={historial} />

        <CerebroMadreV3
          cerebro={cerebro}
          onEnviarAFiltro={(id) => setCerebro(enviarCandidatoAFiltro(id))}
          onPromover={(id) => setCerebro(promoverFiltroALey(id))}
          onRechazar={(id) => setCerebro(rechazarCandidatoOFiltro(id))}
        />

        <FormularioAuditoriaV3
          userTier={userTier}
          disabled={!entitlements.ready}
          onAnalysisComplete={async (result, origen, payload) => {
            setAnalysis(result);
            setSource(origen);
            setCerebro(registrarAuditoriaEnCerebroMadre(payload, result));
            const id = await addVolcadoV3Entry({
              userId: uid,
              payload,
              result,
              source: origen,
              waitForRemote: false,
            });
            const actual: VolcadoV3Entry = {
              id,
              userId: uid,
              createdAt: new Date(),
              rawFact: payload.rawFact,
              detectedNoise: payload.detectedNoise,
              omittedShadow: payload.omittedShadow,
              studentHypothesis: payload.studentHypothesis,
              userTier: payload.userTier,
              result,
              source: origen,
            };
            setUltima(actual);
            setHistorial(listVolcadosV3Local(uid));
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
            {ultima && (
              <BotonCopiarV3 item={ultima} testId="deposito-v3-copiar-actual" />
            )}
          </div>
        )}

        <HistorialV3
          entries={historial}
          onSelect={(entry) => {
            setAnalysis(entry.result);
            setSource(entry.source);
            setUltima(entry);
          }}
        />
      </div>
    </main>
  );
}

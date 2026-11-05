import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Footprints, Landmark, PenLine } from "lucide-react";
import { useAuthContext } from "@/App";
import { useDepositoEntitlements } from "@/hooks/useDepositoEntitlements";
import { useAsistenciaDeposito } from "@/hooks/useAsistenciaDeposito";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { DEPOSITO_COLORS } from "@/lib/depositoBrand";
import { depositoV3TabMeta, type DepositoV3Tab } from "@/deposito/v3Tabs";
import { DepositoShell } from "@/components/deposito/DepositoShell";
import { DepositoMobileNav } from "@/components/deposito/DepositoMobileNav";
import { DepositoSectionLabel } from "@/components/deposito/DepositoSectionLabel";
import { FormularioAuditoriaV3 } from "@/components/deposito/v3/FormularioAuditoriaV3";
import { MapaCalorV3 } from "@/components/deposito/v3/MapaCalorV3";
import { DictamenCardV3 } from "@/components/deposito/v3/DictamenCardV3";
import { BotonCopiarV3 } from "@/components/deposito/v3/BotonCopiarV3";
import { HistorialV3 } from "@/components/deposito/v3/HistorialV3";
import { GradoConsistenciaV3 } from "@/components/deposito/v3/GradoConsistenciaV3";
import { CerebroMadreV3 } from "@/components/deposito/v3/CerebroMadreV3";
import { VentanaConcienciaAsistencia } from "@/components/deposito/v3/VentanaConcienciaAsistencia";
import { ControlAsistencia } from "@/components/deposito/v3/ControlAsistencia";
import { GraficoEvolucionOjos } from "@/components/deposito/v3/GraficoEvolucionOjos";
import { MensajeSesionCumplida } from "@/components/deposito/v3/MensajeSesionCumplida";
import { medirEvolucionOjos } from "@shared/deposito/v3";
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

const V3_NAV = [
  { id: "auditar" as const, label: "Auditar", short: "Auditar", icon: PenLine },
  { id: "casa" as const, label: "Casa", short: "Casa", icon: Landmark },
  { id: "huella" as const, label: "Huella", short: "Huella", icon: Footprints },
];

export default function DepositoV3Page() {
  useViewTransitionShield();
  const motorsQuiet = useDualKernelMotorsQuiet();
  const { user } = useAuthContext();
  const entitlements = useDepositoEntitlements();
  const userTier = userTierFromEntitlements(entitlements);
  const uid = user?.uid ?? "anon";
  const [tab, setTab] = useState<DepositoV3Tab>("auditar");
  const [analysis, setAnalysis] = useState<DepotAnalysisResult | null>(null);
  const [source, setSource] = useState<"gemini" | "local_fallback" | null>(null);
  const [ultima, setUltima] = useState<VolcadoV3Entry | null>(null);
  const [historial, setHistorial] = useState<VolcadoV3Entry[]>([]);
  const [cerebro, setCerebro] = useState<CerebroMadre>(cerebroVacio);
  const [sesionCumplidaVisible, setSesionCumplidaVisible] = useState(false);
  const timestampsVolcado = useMemo(
    () => historial.map((e) => e.createdAt.getTime()),
    [historial],
  );
  const asistencia = useAsistenciaDeposito(uid, timestampsVolcado, {
    onElegirSi: () => setTab("auditar"),
  });
  const evolucion = useMemo(() => medirEvolucionOjos(historial), [historial]);
  const zona = depositoV3TabMeta(tab);

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

  const abrirHistorial = (entry: VolcadoV3Entry) => {
    setAnalysis(entry.result);
    setSource(entry.source);
    setUltima(entry);
    setTab("auditar");
  };

  return (
    <main
      className="min-h-screen pb-24 text-white"
      style={{ backgroundColor: DEPOSITO_COLORS.PIZARRA }}
      data-testid="deposito-v3-page"
    >
      <DepositoShell
        edition="v3"
        volcados={historial.length}
        racha={asistencia.resumen.rachaActual}
        statusLine={DEPOSITO_V3_RITUAL}
      />
      <DepositoMobileNav
        value={tab}
        onChange={setTab}
        tabs={V3_NAV}
        ariaLabel="Secciones Depósito V3"
        testId="deposito-v3-mobile-nav"
      />

      <div className="mx-auto max-w-xl px-4 pt-2">
        <p className="sr-only" data-testid="deposito-v3-badge">
          UNIVERSIDAD · DEPÓSITO V3
        </p>
        <p className="mb-2 text-[11px] font-light tracking-tight text-white/80">
          {DEPOSITO_V3_RITUAL}
        </p>
        <Link
          href="/deposito-v2"
          className="mb-3 inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
          data-testid="deposito-v3-volver-v2"
        >
          Volver a Depósito V2
        </Link>

        {asistencia.mostrarVentana && (
          <div className="mb-4">
            <VentanaConcienciaAsistencia
              pregunta={asistencia.pregunta}
              onSi={() => asistencia.elegir("si")}
              onNo={() => asistencia.elegir("no")}
            />
          </div>
        )}

        <DepositoSectionLabel
          step={zona.step}
          title={zona.title}
          hint={zona.hint}
          testId={`deposito-v3-zona-${tab}`}
        />

        <div
          className={tab === "auditar" ? "space-y-6" : "hidden"}
          role="tabpanel"
          data-testid="deposito-v3-panel-auditar"
        >
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
              if (asistencia.cumplir()) setSesionCumplidaVisible(true);
              setTab("auditar");
            }}
          />

          {sesionCumplidaVisible && <MensajeSesionCumplida />}

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
        </div>

        <div
          className={tab === "casa" ? "space-y-6" : "hidden"}
          role="tabpanel"
          data-testid="deposito-v3-panel-casa"
        >
          <GradoConsistenciaV3 entries={historial} />
          <CerebroMadreV3
            cerebro={cerebro}
            onEnviarAFiltro={(id) => setCerebro(enviarCandidatoAFiltro(id))}
            onPromover={(id) => setCerebro(promoverFiltroALey(id))}
            onRechazar={(id) => setCerebro(rechazarCandidatoOFiltro(id))}
          />
        </div>

        <div
          className={tab === "huella" ? "space-y-6" : "hidden"}
          role="tabpanel"
          data-testid="deposito-v3-panel-huella"
        >
          <ControlAsistencia
            celdas={asistencia.celdas}
            resumen={asistencia.resumen}
          />
          <GraficoEvolucionOjos evo={evolucion} />
          <HistorialV3 entries={historial} onSelect={abrirHistorial} />
        </div>
      </div>
    </main>
  );
}

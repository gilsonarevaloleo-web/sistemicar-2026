/**
 * Sandbox visual de La Jornada (OPERAR / PLAN / MÉTRICAS).
 * Sin auth: sirve para revisar jerarquía móvil del rediseño.
 */
import { useState } from "react";
import { Jornada4RevelacionCard } from "@/components/jornada4/Jornada4RevelacionCard";
import { RecintoMinimoDock } from "@/components/jornada4/RecintoMinimoDock";
import { Jornada4CoberturaTimeline } from "@/components/jornada4/Jornada4CoberturaTimeline";
import { Jornada4ConcienciaTriadaCard } from "@/components/jornada4/Jornada4ConcienciaTriadaCard";
import { SelloOperadorCard } from "@/components/jornada4/SelloOperadorCard";
import { Jornada4Shell } from "@/components/jornada4/Jornada4Shell";
import { Jornada4MobileNav, type Jornada4MobileTab } from "@/components/jornada4/Jornada4MobileNav";
import { J4_UI } from "@/components/jornada4/jornada4Ui";
import PlaneacionCrisolDock from "@/components/planeacion/PlaneacionCrisolDock";
import { computePuertaPanorama } from "@/jornada4/segmentAttentionJ4";
import type { RevelacionPlanDia } from "@/jornada4/revelacionPlanDia";
import type { ConcienciaTriadaModel } from "@/lib/concienciaTriadaOperador";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { Rocket } from "lucide-react";
import { Jornada4ComoOperarCard } from "@/components/jornada4/Jornada4ComoOperarCard";
import { PlanificacionTutorial } from "@/components/planificacion/PlanificacionTutorial";

const revelacion: RevelacionPlanDia = {
  fecha: "2026-09-23",
  sealedAt: Date.now(),
  planEndMs: Date.now(),
  planEndLabel: "23:00",
  minutosPlan: 960,
  minutosInconsciente: 180,
  minutosPresencia: 240,
  minutosDireccion: 360,
  minutosPorConquistar: 480,
  minutosDia: 1440,
  headline: "Hoy dirigiste 6 h. Quedan 8 h por conquistar.",
};

const triada: ConcienciaTriadaModel = {
  hasPlanificacion: true,
  fecha: "2026-09-23",
  minutosInconsciente: 180,
  minutosPresencia: 240,
  minutosDireccion: 360,
  minutosPlan: 960,
  pctInconsciente: 13,
  pctPresencia: 17,
  pctDireccion: 25,
  etapaDominante: "direccion",
  headline: "Dirección manda. El surco ya no es anónimo.",
  minutosHueco: 180,
  minutosPlanFuturo: 180,
  minutosNoConquistado: 480,
  minutosDia: 1440,
  pctNoConquistado: 33,
  hilosAvanzando: 1,
  paraleloMeritorio: false,
  interruptCubreLinea: false,
  minutosParaleloEnJuego: 0,
  minutosParaleloGanado: 0,
};

const segmentos: SegmentoV5[] = [
  {
    id: "s1",
    nombre: "Mañana",
    horaInicio: "06:00",
    horaFin: "10:00",
    color: "#34D399",
    icono: "sun",
    estado: "cerrado_manual",
    eventos: [],
    psGanados: 4,
  },
  {
    id: "s2",
    nombre: "Foco",
    horaInicio: "10:00",
    horaFin: "14:00",
    color: "#8B5CF6",
    icono: "target",
    estado: "activo",
    eventos: [],
    psGanados: 0,
  },
  {
    id: "s3",
    nombre: "Cierre",
    horaInicio: "16:00",
    horaFin: "20:00",
    color: "#D4AF37",
    icono: "moon",
    estado: "pendiente",
    eventos: [],
    psGanados: 0,
  },
];

const vehicles: Vehicle[] = [
  {
    id: "v1",
    titulo: "Desglose del nido",
    status: "activo",
    tipoFlota: "tiempo",
    segmentoId: "s2",
  } as Vehicle,
];

const noopCrisol = () => undefined;

export default function JornadaV4UiPreview() {
  const [tab, setTab] = useState<Jornada4MobileTab>("operar");
  const puertaPanorama = computePuertaPanorama(segmentos);
  const primer =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("primer") === "1";
  const [showTutorial, setShowTutorial] = useState(primer);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: "#0a0a0a" }}
      data-testid="jornada4-ui-preview"
    >
      <Jornada4Shell dualCount={1} dailyPS={12} statusLine="Preview UI" />
      <Jornada4MobileNav value={tab} onChange={setTab} />
      <div className="max-w-lg mx-auto pt-2">
        {tab === "operar" ? (
          <div data-testid="jornada4-preview-operar">
            {primer ? (
              <Jornada4ComoOperarCard
                hasRitmo={false}
                onOpenTutorial={() => setShowTutorial(true)}
              />
            ) : null}
            {!primer ? (
              <Jornada4RevelacionCard revelacion={revelacion} planEndLabel="23:00" />
            ) : null}
            <div className="px-3 sm:px-4 pb-3 space-y-3" data-testid="jornada4-launch">
              <div className="flex items-end justify-between gap-2">
                <p className={J4_UI.label}>La Flota</p>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-100">
                  <Rocket size={12} className="inline mr-1" /> Lanzar
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(primer ? ["Conquista"] : ["Conquista", "Enfoque"]).map(label => (
                  <div key={label} className={`${J4_UI.card} text-center`}>
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-100">
                      {label}
                    </p>
                    <p className={`${J4_UI.hint} mt-1`}>
                      {label === "Conquista" ? "Unidades y cierre" : "Lanzar vehículo"}
                    </p>
                  </div>
                ))}
                {primer ? (
                  <div className={`${J4_UI.card} text-center opacity-70`}>
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Enfoque
                    </p>
                    <p className={`${J4_UI.hint} mt-1`}>Requiere Ritmo del día</p>
                  </div>
                ) : null}
              </div>
              {primer ? (
                <p className="text-center text-[9px] text-neutral-500">
                  Hoy solo Conquista. Enfoque se abre con Ritmo, después de tu primer cierre.
                </p>
              ) : null}
            </div>
            {primer ? (
              <div
                className={`mx-3 sm:mx-4 ${J4_UI.card} text-center space-y-1`}
                data-testid="jornada4-empty"
              >
                <p className={J4_UI.label}>Aún no hay un bloque en curso</p>
                <p className="text-[11px] text-neutral-400">
                  Toca <strong className="text-neutral-100">Conquista</strong>, pon
                  unidades y cierra cumplido o fallado. Eso es operar hoy.
                </p>
              </div>
            ) : (
              <RecintoMinimoDock />
            )}
          </div>
        ) : null}
        {tab === "plan" ? (
          <div data-testid="jornada4-preview-plan">
            {primer ? (
              <div
                className="mx-3 mb-3 sm:mx-4 p-4 rounded-xl border border-white/10 bg-neutral-900/60"
                data-testid="jornada4-plan-espera-cierre"
              >
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Plan espera tu primer cierre
                </p>
                <p className="text-sm text-slate-200 mt-1 leading-snug">
                  Segmentos e imprevistos son Ritmo. Primero lanza una Conquista
                  en Operar y ciérrala.
                </p>
              </div>
            ) : (
              <Jornada4CoberturaTimeline segmentos={segmentos} vehicles={vehicles} />
            )}
          </div>
        ) : null}
        {showTutorial ? (
          <PlanificacionTutorial
            uid="preview-primer"
            profile="base"
            onComplete={() => setShowTutorial(false)}
          />
        ) : null}
        {tab === "metricas" ? (
          <div data-testid="jornada4-preview-metricas" className="space-y-1">
            <Jornada4ConcienciaTriadaCard model={triada} series={[]} />
            <SelloOperadorCard
              userId="preview"
              segmentos={segmentos}
              vehicles={vehicles}
              todayPs={12}
            />
          </div>
        ) : null}
      </div>
      <PlaneacionCrisolDock
        items={[]}
        proyectos={[]}
        onQuickAdd={noopCrisol}
        onEnviarUnidad={noopCrisol}
        onEnviarSeleccion={noopCrisol}
        onDelete={noopCrisol}
        onRutaChange={noopCrisol}
        panoramaHeadline={puertaPanorama.headline}
        panoramaSubline={puertaPanorama.subline}
        panoramaMantra={puertaPanorama.mantra}
      />
    </div>
  );
}

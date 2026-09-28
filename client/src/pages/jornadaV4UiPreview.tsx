/**
 * Sandbox visual de La Jornada (OPERAR / PLAN / MÉTRICAS).
 * Sin auth: sirve para revisar jerarquía móvil del rediseño.
 */
import { useState } from "react";
import { ConquistaCard } from "@/components/jornada4/ConquistaCard";
import { Jornada4OpsToolsRail } from "@/components/jornada4/Jornada4OpsToolsRail";
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
import {
  buildConquistaPauseLabelPatch,
  buildConquistaPausePatch,
} from "@/lib/conquistaPausa";
import { resumeDesglosadorFromNestedPause } from "@/lib/nestedContextStack";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { getSegmentCalendarDayStartMs } from "@/lib/segmentTime";
import { Clock, Flag } from "lucide-react";
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

const previewDayStart = getSegmentCalendarDayStartMs();

const segmentos: SegmentoV5[] = [
  {
    id: "s1",
    nombre: "Mañana",
    horaInicio: "06:00",
    horaFin: "10:00",
    color: "#34D399",
    icono: "sun",
    estado: "entropia",
    eventos: [],
    psGanados: 0,
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
    estado: "cerrado_manual",
    activadoAt: previewDayStart + 16 * 60 * 60 * 1000,
    eventos: [],
    psGanados: 4,
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

function previewConquistaSeed(now = Date.now()): Vehicle {
  return {
    id: "preview-conquista",
    titulo: "Casaca",
    status: "activo",
    tipoReloj: "desglosador",
    tipoFlota: "tiempo",
    aperturaAt: now - 8 * 60_000,
    criterioDetalle: "18:00",
    subVehiculos: [
      {
        id: "s1",
        titulo: "Pretina",
        status: "activo",
        aperturaAt: now - 8 * 60_000,
        cantidadObjetivo: 9,
        tiempoRecordMinPerUnit: 1.5,
      },
      {
        id: "s2",
        titulo: "Costura lateral",
        status: "pendiente",
      },
    ],
  } as Vehicle;
}

function PreviewConquistaPausa() {
  const [vehicle, setVehicle] = useState<Vehicle>(() => previewConquistaSeed());
  return (
    <div className="px-3 sm:px-4 pb-48 space-y-2" data-testid="jornada4-preview-conquista-pausa">
      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
        Preview pausa · un vehículo, sin hijo
      </p>
      <p className="text-[10px] font-mono text-neutral-400" data-testid="jornada4-preview-vehicle-count">
        vehículos en escena: 1
      </p>
      <ConquistaCard
        vehicle={vehicle}
        onCumplido={() => undefined}
        onFallado={() => undefined}
        onCerrarCiclo={() => undefined}
        onPausaInterrupcion={titulo => {
          setVehicle(v => {
            const patch = buildConquistaPausePatch(v, titulo);
            return patch ? { ...v, ...patch } : v;
          });
        }}
        onLabelPausa={titulo => {
          setVehicle(v => {
            const patch = buildConquistaPauseLabelPatch(v, titulo);
            return patch ? { ...v, ...patch } : v;
          });
        }}
        onResumeDesglosador={() => {
          setVehicle(v => {
            const patch = resumeDesglosadorFromNestedPause(v);
            return patch ? { ...v, ...patch } : v;
          });
        }}
      />
    </div>
  );
}

export default function JornadaV4UiPreview() {
  const [tab, setTab] = useState<Jornada4MobileTab>("operar");
  const puertaPanorama = computePuertaPanorama(segmentos);
  const primer =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("primer") === "1";
  const pausaPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("pausa") === "1";
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
            {pausaPreview ? <PreviewConquistaPausa /> : null}
            <Jornada4OpsToolsRail
              onOpenTutorial={() => setShowTutorial(true)}
              showRecinto={!primer}
              showGuia={primer}
              showRevelacion={!primer}
              hasRitmo={!primer}
              revelacion={primer ? null : revelacion}
              planEndLabel={primer ? null : "23:00"}
            />
            <div className="px-3 sm:px-4 pb-2 space-y-1.5" data-testid="jornada4-launch">
              <div className="grid grid-cols-2 gap-1.5">
                {(primer ? ["Conquista"] : ["Conquista", "Enfoque"]).map(label => (
                  <div
                    key={label}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border"
                    style={{
                      borderColor: label === "Conquista" ? "rgba(249,115,22,0.4)" : "rgba(148,163,184,0.4)",
                      backgroundColor: label === "Conquista" ? "rgba(249,115,22,0.12)" : "rgba(148,163,184,0.12)",
                    }}
                  >
                    {label === "Conquista" ? (
                      <Clock size={15} className="text-orange-400" />
                    ) : (
                      <Flag size={15} className="text-slate-400" />
                    )}
                    <p className="text-[10px] font-black uppercase tracking-wider text-neutral-100">
                      {label}
                    </p>
                  </div>
                ))}
                {primer ? (
                  <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border opacity-70 border-white/10">
                    <Flag size={15} className="text-neutral-500" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Enfoque
                    </p>
                  </div>
                ) : null}
              </div>
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
            ) : !pausaPreview ? (
              <div className="px-3 sm:px-4 space-y-2" data-testid="jornada4-list">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-800">
                  Vehículos · 1
                </p>
                <div className={J4_UI.card}>
                  <p className="text-sm font-bold text-neutral-100">{vehicles[0]?.titulo}</p>
                  <p className={`${J4_UI.hint} mt-0.5`}>Conquista · activo</p>
                </div>
              </div>
            ) : null}
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
              triada={triada}
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

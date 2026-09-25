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
import { Jornada4MobileNav, type Jornada4MobileTab } from "@/components/jornada4/Jornada4MobileNav";
import { J4_UI } from "@/components/jornada4/jornada4Ui";
import type { RevelacionPlanDia } from "@/jornada4/revelacionPlanDia";
import type { ConcienciaTriadaModel } from "@/lib/concienciaTriadaOperador";
import type { SegmentoV5, Vehicle } from "@/lib/persistence";
import { Rocket } from "lucide-react";

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

export default function JornadaV4UiPreview() {
  const [tab, setTab] = useState<Jornada4MobileTab>("operar");

  return (
    <div
      className="min-h-screen pb-16"
      style={{ backgroundColor: "#0a0a0a" }}
      data-testid="jornada4-ui-preview"
    >
      <header className="sticky top-0 z-20 px-4 py-3 border-b border-white/10 bg-neutral-950/90 backdrop-blur-md">
        <p className={J4_UI.label}>La Jornada · preview UI</p>
        <p className="text-sm font-semibold text-neutral-100 mt-0.5">
          OPERAR / PLAN / MÉTRICAS
        </p>
      </header>
      <Jornada4MobileNav value={tab} onChange={setTab} />
      <div className="max-w-lg mx-auto pt-2">
        {tab === "operar" ? (
          <div data-testid="jornada4-preview-operar">
            <Jornada4RevelacionCard revelacion={revelacion} planEndLabel="23:00" />
            <div className="px-3 sm:px-4 pb-3 space-y-3" data-testid="jornada4-launch">
              <div className="flex items-end justify-between gap-2">
                <p className={J4_UI.label}>La Flota</p>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-100">
                  <Rocket size={12} className="inline mr-1" /> Lanzar
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Conquista", "Enfoque"].map(label => (
                  <div key={label} className={`${J4_UI.card} text-center`}>
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-100">
                      {label}
                    </p>
                    <p className={`${J4_UI.hint} mt-1`}>Lanzar vehículo</p>
                  </div>
                ))}
              </div>
            </div>
            <RecintoMinimoDock />
          </div>
        ) : null}
        {tab === "plan" ? (
          <div data-testid="jornada4-preview-plan">
            <Jornada4CoberturaTimeline segmentos={segmentos} vehicles={vehicles} />
          </div>
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
    </div>
  );
}

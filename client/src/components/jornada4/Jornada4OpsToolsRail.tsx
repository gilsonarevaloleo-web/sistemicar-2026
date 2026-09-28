import React, { useEffect, useMemo, useState } from "react";
import {
  CircleDot,
  Crosshair,
  Eye,
  GraduationCap,
  ListChecks,
  Timer,
} from "lucide-react";
import type { RevelacionPlanDia } from "@/jornada4/revelacionPlanDia";
import type { Vehicle } from "@/lib/persistence";
import {
  isPrimerDiaComplete,
  type PlanificacionPlanProfile,
} from "@/lib/planificacionOnboarding";
import { useJornadaApunte } from "@/hooks/useJornadaApunte";
import {
  conteoRecintosDelDia,
  RECINTO_MINIMO_EVENT,
} from "@/lib/recintoMinimoStore";
import { PlanificacionPrimerDia } from "@/components/planificacion/PlanificacionPrimerDia";
import { Jornada4ApunteCard } from "@/components/jornada4/Jornada4ApunteCard";
import { Jornada4ComoOperarCard } from "@/components/jornada4/Jornada4ComoOperarCard";
import { Jornada4RevelacionCard } from "@/components/jornada4/Jornada4RevelacionCard";
import { RecintoMinimoDock } from "@/components/jornada4/RecintoMinimoDock";
import { J4_COLORS } from "./Jornada4Shell";

const { GOLD, MUTED, INK } = J4_COLORS;
const BLOOD = "#FF2A2A";

export type Jornada4OpsToolId =
  | "apunte"
  | "recinto"
  | "guia"
  | "primer-dia"
  | "revelacion";

type PrimerDiaProps = {
  uid: string;
  profile: PlanificacionPlanProfile;
  dayStartMs: number;
  segmentos: Array<{ estado?: string }>;
  vehicles: Vehicle[];
};

type Props = {
  onOpenTutorial?: () => void;
  onLaunchConquista?: () => void;
  showRecinto?: boolean;
  showGuia?: boolean;
  showRevelacion?: boolean;
  hasRitmo?: boolean;
  primerDia?: PrimerDiaProps | null;
  revelacion?: RevelacionPlanDia | null;
  planEndLabel?: string | null;
};

/**
 * Herramientas de Operar en símbolos. El detalle se abre al tocar;
 * el escenario queda para los vehículos.
 */
export function Jornada4OpsToolsRail({
  onOpenTutorial,
  onLaunchConquista,
  showRecinto = false,
  showGuia = false,
  showRevelacion = false,
  hasRitmo = false,
  primerDia = null,
  revelacion = null,
  planEndLabel = null,
}: Props) {
  const [open, setOpen] = useState<Jornada4OpsToolId | null>(null);
  const [recintoTick, setRecintoTick] = useState(0);
  const apunte = useJornadaApunte();

  useEffect(() => {
    const bump = () => setRecintoTick(n => n + 1);
    bump();
    window.addEventListener(RECINTO_MINIMO_EVENT, bump);
    const id = window.setInterval(bump, 30_000);
    return () => {
      window.removeEventListener(RECINTO_MINIMO_EVENT, bump);
      window.clearInterval(id);
    };
  }, []);

  const recintoConteo = useMemo(
    () => conteoRecintosDelDia(),
    [recintoTick]
  );
  const recintoVivos = recintoConteo.abiertos + recintoConteo.heredados;

  const primerDiaDone = useMemo(() => {
    if (!primerDia) return true;
    return isPrimerDiaComplete(primerDia);
  }, [primerDia]);

  const toggle = (id: Jornada4OpsToolId) => {
    setOpen(cur => (cur === id ? null : id));
  };

  const tools: Array<{
    id: Jornada4OpsToolId;
    label: string;
    short: string;
    icon: typeof Timer;
    show: boolean;
    badge?: number;
    badgeColor?: string;
    activeDot?: boolean;
  }> = [
    {
      id: "apunte",
      label: "Apunte",
      short: "Apunte",
      icon: Crosshair,
      show: true,
      activeDot: apunte.apuntado,
    },
    {
      id: "recinto",
      label: "Recinto",
      short: "Recinto",
      icon: Timer,
      show: showRecinto,
      badge: recintoVivos > 0 ? recintoVivos : undefined,
      badgeColor: recintoConteo.heredados > 0 ? BLOOD : GOLD,
    },
    {
      id: "guia",
      label: "Cómo operar",
      short: "Guía",
      icon: CircleDot,
      show: showGuia,
    },
    {
      id: "primer-dia",
      label: "Primer día",
      short: "1° día",
      icon: ListChecks,
      show: Boolean(primerDia) && !primerDiaDone,
    },
    {
      id: "revelacion",
      label: "Revelación",
      short: "Día",
      icon: Eye,
      show: showRevelacion,
    },
  ];

  const visible = tools.filter(t => t.show);
  if (visible.length === 0 && !onOpenTutorial) return null;

  return (
    <div className="px-3 pb-2 sm:px-4" data-testid="jornada4-ops-rail">
      <div
        className="flex items-center justify-center gap-1 rounded-xl border px-1 py-1"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(23,23,23,0.7)",
        }}
        role="toolbar"
        aria-label="Herramientas de operar"
      >
        {visible.map(tool => {
          const Icon = tool.icon;
          const active = open === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={active}
              onClick={() => toggle(tool.id)}
              className="relative flex h-11 min-w-[3.15rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 touch-manipulation"
              style={{
                backgroundColor: active ? "rgba(212,175,55,0.16)" : "transparent",
                color: active ? GOLD : MUTED,
                boxShadow: active ? `inset 0 0 0 1px ${GOLD}55` : "none",
              }}
              data-testid={`jornada4-ops-tool-${tool.id}`}
            >
              <Icon size={14} strokeWidth={active ? 2.4 : 2} />
              <span
                className="text-[7px] font-black uppercase tracking-wider leading-none"
                style={{ color: active ? INK : MUTED }}
              >
                {tool.short}
              </span>
              {tool.activeDot ? (
                <span
                  className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: GOLD }}
                  data-testid={`jornada4-ops-dot-${tool.id}`}
                />
              ) : null}
              {tool.badge != null ? (
                <span
                  className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[8px] font-black leading-[14px] text-center"
                  style={{
                    backgroundColor: tool.badgeColor ?? GOLD,
                    color: "#0a0a0a",
                  }}
                  data-testid={`jornada4-ops-badge-${tool.id}`}
                >
                  {tool.badge}
                </span>
              ) : null}
            </button>
          );
        })}
        {onOpenTutorial ? (
          <button
            type="button"
            title="Tutorial"
            aria-label="Ver tutorial"
            onClick={onOpenTutorial}
            className="flex h-11 min-w-[3.15rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 touch-manipulation"
            style={{ color: MUTED }}
            data-testid="jornada4-ops-tool-tutorial"
          >
            <GraduationCap size={14} />
            <span className="text-[7px] font-black uppercase tracking-wider leading-none">
              Manual
            </span>
          </button>
        ) : null}
      </div>

      {open === "apunte" ? (
        <div className="mt-2" data-testid="jornada4-ops-panel-apunte">
          <Jornada4ApunteCard embedded />
        </div>
      ) : null}
      {open === "recinto" && showRecinto ? (
        <div className="mt-2" data-testid="jornada4-ops-panel-recinto">
          <RecintoMinimoDock embedded />
        </div>
      ) : null}
      {open === "guia" && showGuia ? (
        <div className="mt-2" data-testid="jornada4-ops-panel-guia">
          <Jornada4ComoOperarCard
            embedded
            hasRitmo={hasRitmo}
            onLaunchConquista={onLaunchConquista}
            onOpenTutorial={onOpenTutorial}
          />
        </div>
      ) : null}
      {open === "primer-dia" && primerDia && !primerDiaDone ? (
        <div className="mt-2" data-testid="jornada4-ops-panel-primer-dia">
          <PlanificacionPrimerDia
            embedded
            uid={primerDia.uid}
            profile={primerDia.profile}
            dayStartMs={primerDia.dayStartMs}
            segmentos={primerDia.segmentos}
            vehicles={primerDia.vehicles}
            onOpenTutorial={onOpenTutorial ?? (() => undefined)}
          />
        </div>
      ) : null}
      {open === "revelacion" && showRevelacion ? (
        <div className="mt-2" data-testid="jornada4-ops-panel-revelacion">
          <Jornada4RevelacionCard
            embedded
            defaultOpen
            revelacion={revelacion ?? null}
            planEndLabel={planEndLabel ?? null}
          />
        </div>
      ) : null}
    </div>
  );
}

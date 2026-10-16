import { useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useAuthContext } from "@/App";
import { NavTransitionLink } from "@/components/NavTransitionLink";
import { useDireccionGates } from "@/hooks/useDireccionGates";
import {
  noPuedesLlegarADireccion,
  rumboChipLabel,
  type DireccionGate,
} from "@/lib/direccionElegibilidad";
import {
  proyectoColorAlpha,
  resolveProyectoColor,
  rumboLaunchListedCount,
  rumboPickerListVisible,
  rumboPickerToggleEnabled,
} from "@/lib/proyectoColor";
import type { Proyecto } from "@/lib/proyectos";

const CYAN = "#00FFC3";
const MUTED = "#64748b";
const INK = "#f1f5f9";

type Props = {
  value: string;
  onChange: (proyectoId: string) => void;
  proyectos: Proyecto[];
  compact?: boolean;
  label?: string;
  emptyLabel?: string;
  testId?: string;
  locked?: boolean;
  lockedHint?: string;
  lockedHref?: string;
  lockedCta?: string;
  hubHref?: string | null;
  onBeforeHubNavigate?: () => void;
};

/**
 * Rumbo al lanzar (Conquista y Enfoque). Con varios proyectos la lista
 * no sale sola: un resumen, y se abre solo para cambiar — igual que el
 * picker de ejecución.
 */
export function DireccionDestinoPicker({
  value,
  onChange,
  proyectos,
  compact = false,
  label = "Rumbo del vehículo",
  emptyLabel = "Presencia — no toca el proyecto",
  testId = "direccion-destino-picker",
  locked = false,
  lockedHint = "Dirección de proyecto requiere Norte (Hub Proyectos).",
  lockedHref = "/pagos?plan=soberania_dia",
  lockedCta = "Activar Norte →",
  hubHref = "/proyectos",
  onBeforeHubNavigate,
}: Props) {
  const { user } = useAuthContext();
  const { gates } = useDireccionGates(user?.uid);
  const [expanded, setExpanded] = useState(false);
  const labelCls = compact
    ? "text-[8px] text-gray-500 uppercase tracking-wider mb-1 block"
    : "text-[9px] text-gray-500 uppercase tracking-wider mb-1 block";

  if (locked) {
    return (
      <div className="" data-testid={`${testId}-locked`}>
        <label className={labelCls}>{label}</label>
        <div
          className={
            compact
              ? "w-full p-2 rounded-lg border border-sky-500/25 bg-sky-500/8"
              : "w-full p-2.5 rounded-xl border border-sky-500/25 bg-sky-500/8"
          }
        >
          <p className="text-[10px] text-slate-300 leading-snug">{lockedHint}</p>
          <a
            href={lockedHref}
            className="inline-flex mt-1.5 text-[9px] font-black uppercase tracking-wider text-sky-400 underline"
            data-testid={`${testId}-locked-cta`}
          >
            {lockedCta}
          </a>
        </div>
      </div>
    );
  }

  const byId = new Map(gates.map(g => [g.proyectoId, g]));
  const abiertas = gates.filter(g => g.ok);
  const cerradas = gates.filter(g => !g.ok);
  const selected = byId.get(value);
  const presenciaOn = !value || !selected?.ok;
  const direccionOn = Boolean(selected?.ok && value);
  const listed = rumboLaunchListedCount(abiertas.length, cerradas.length);
  const canToggle = rumboPickerToggleEnabled(listed);
  const showList = rumboPickerListVisible(listed, expanded) || !canToggle;
  const selectedTint = selected
    ? resolveProyectoColor(selected.proyectoId, selected.color)
    : CYAN;

  const hubLink = hubHref ? (
    <NavTransitionLink
      href={hubHref}
      className="text-cyan-500/90 underline underline-offset-2"
      onClick={() => onBeforeHubNavigate?.()}
    >
      {proyectos.length === 0 ? "Abrir Hub" : "Definir rumbo en el Hub"}
    </NavTransitionLink>
  ) : null;

  const pick = (id: string) => {
    onChange(id);
    setExpanded(false);
  };

  const summaryStyle: CSSProperties = presenciaOn
    ? {
        backgroundColor: "rgba(0,255,195,0.14)",
        border: `1.5px solid ${CYAN}`,
      }
    : {
        backgroundColor: proyectoColorAlpha(selectedTint, "18"),
        border: `1px solid ${selectedTint}`,
      };

  return (
    <div data-testid={testId}>
      <label className={labelCls}>{label}</label>
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left touch-manipulation"
          style={summaryStyle}
          aria-expanded={showList}
          aria-controls={`${testId}-lista`}
          data-testid={`${testId}-resumen`}
        >
          {presenciaOn ? (
            <>
              <Eye size={11} style={{ color: CYAN }} />
              <span
                className="min-w-0 flex-1 truncate text-[9px] font-black uppercase tracking-wider"
                style={{ color: CYAN }}
              >
                {emptyLabel}
              </span>
            </>
          ) : selected ? (
            <ResumenChip gate={selected} />
          ) : null}
          <span
            className="flex items-center gap-1 shrink-0"
            style={{ color: presenciaOn ? CYAN : selectedTint }}
          >
            <span className="text-[8px] font-black uppercase tracking-wider">
              {showList ? "Ocultar" : `${listed} rumbos`}
            </span>
            {showList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </button>
      ) : null}

      {showList ? (
        <div
          id={`${testId}-lista`}
          className={canToggle ? "mt-1.5 space-y-1" : "space-y-1"}
          data-testid={`${testId}-lista`}
        >
          <div
            className="flex flex-wrap gap-1.5 overflow-y-auto pr-0.5"
            style={canToggle ? { maxHeight: 148 } : undefined}
          >
            <button
              type="button"
              onClick={() => pick("")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-left touch-manipulation active:scale-[0.98]"
              style={{
                backgroundColor: presenciaOn ? "rgba(0,255,195,0.14)" : "rgba(0,255,195,0.04)",
                border: presenciaOn ? `1.5px solid ${CYAN}` : "1px solid rgba(0,255,195,0.28)",
              }}
              data-testid={`${testId}-presencia`}
              aria-pressed={presenciaOn}
            >
              <Eye size={11} style={{ color: CYAN }} />
              <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: CYAN }}>
                {emptyLabel}
              </span>
            </button>
            {abiertas.map(g => {
              const on = value === g.proyectoId;
              const tint = resolveProyectoColor(g.proyectoId, g.color);
              return (
                <button
                  key={g.proyectoId}
                  type="button"
                  onClick={() => pick(g.proyectoId)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left touch-manipulation active:scale-[0.98] max-w-full"
                  style={{
                    backgroundColor: on ? proyectoColorAlpha(tint, "28") : proyectoColorAlpha(tint, "10"),
                    border: on ? `1.5px solid ${tint}` : `1px solid ${proyectoColorAlpha(tint, "55")}`,
                  }}
                  data-testid={`${testId}-abierta-${g.proyectoId}`}
                  aria-pressed={on}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tint }}
                    aria-hidden
                  />
                  <span
                    className="text-[9px] font-black uppercase tracking-wider truncate"
                    style={{ color: tint }}
                  >
                    {rumboChipLabel(g)}
                  </span>
                </button>
              );
            })}
          </div>

          {abiertas.length === 0 ? (
            <p className="text-[8px] leading-snug" style={{ color: MUTED }} data-testid={`${testId}-hueco`}>
              {noPuedesLlegarADireccion(
                cerradas[0] ?? {
                  ok: false,
                  porqueTodavia: "todavía no hay oleada con punto de producción",
                }
              )}{" "}
              {hubLink}
            </p>
          ) : (
            <p className="text-[8px] leading-snug" style={{ color: MUTED }}>
              Presencia es el envío rápido. Dirección solo en chips con rumbo. {hubLink}
            </p>
          )}

          {cerradas.length > 0 ? (
            <ul className="space-y-0.5 overflow-y-auto pr-0.5" style={{ maxHeight: 72 }} data-testid={`${testId}-cerradas`}>
              {cerradas.map(g => (
                <li
                  key={g.proyectoId}
                  className="text-[8px] leading-snug"
                  style={{ color: MUTED }}
                  data-testid={`${testId}-cerrada-${g.proyectoId}`}
                >
                  <span style={{ color: INK }}>{g.titulo}</span>
                  {" — "}
                  {g.porqueTodavia}
                </li>
              ))}
            </ul>
          ) : proyectos.length === 0 && hubLink ? (
            <p className="text-[8px] text-gray-600" data-testid={`${testId}-abrir-hub`}>
              Sin proyectos. {hubLink} para crear rumbo.
            </p>
          ) : null}
        </div>
      ) : null}

      {direccionOn && selected ? (
        <p
          className="text-[8px] leading-snug mt-1.5"
          style={{ color: "rgba(212,175,55,0.85)" }}
          data-testid={`${testId}-riesgo`}
        >
          {selected.riesgoEnsuciar}
        </p>
      ) : null}
    </div>
  );
}

function ResumenChip({ gate }: { gate: DireccionGate }) {
  const tint = resolveProyectoColor(gate.proyectoId, gate.color);
  return (
    <>
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: tint }}
        aria-hidden
      />
      <span
        className="min-w-0 flex-1 truncate text-[9px] font-black uppercase tracking-wider"
        style={{ color: tint }}
      >
        {rumboChipLabel(gate)}
      </span>
    </>
  );
}

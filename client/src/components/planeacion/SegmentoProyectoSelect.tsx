import type { Proyecto } from "@/lib/proyectos";
import { NavTransitionLink } from "@/components/NavTransitionLink";

type Props = {
  value: string;
  onChange: (proyectoId: string) => void;
  proyectos: Proyecto[];
  className?: string;
  testId?: string;
  compact?: boolean;
  /** Etiqueta del campo (segmento / vehículo / sub). */
  label?: string;
  /** Texto de la opción vacía. */
  emptyLabel?: string;
  /** Hint opcional bajo el select. */
  hint?: string;
  /** Ruta al Hub (default /proyectos). Null oculta el enlace. */
  hubHref?: string | null;
  /**
   * Cerrar sheet/modales ANTES de navegar al Hub.
   * Evita body overflow:hidden + salida Dual Kernel a la vez (bloqueo en móvil).
   */
  onBeforeHubNavigate?: () => void;
  /**
   * Liberar scroll del body al abrir el picker nativo (iOS/Android).
   * El sheet de lanzamiento pone overflow:hidden; sin esto el select se clava.
   */
  onNativePickerOpen?: () => void;
  onNativePickerClose?: () => void;
  /**
   * Sin Norte: no mostrar select vacío (parece “bloqueo”).
   * Muestra copy + enlace de upgrade.
   */
  locked?: boolean;
  lockedHint?: string;
  lockedHref?: string;
  lockedCta?: string;
};

/** Selector tech-noir: vincular segmento / vehículo / sub a Proyecto o Centro del Hub. */
export function SegmentoProyectoSelect({
  value,
  onChange,
  proyectos,
  className = "",
  testId = "select-segmento-proyecto",
  compact = false,
  label = "Proyecto o Centro de Atención",
  emptyLabel = "Sin vincular",
  hint,
  hubHref = "/proyectos",
  onBeforeHubNavigate,
  onNativePickerOpen,
  onNativePickerClose,
  locked = false,
  lockedHint = "Dirección de proyecto requiere Norte (Hub Proyectos).",
  lockedHref = "/pagos?plan=soberania_dia",
  lockedCta = "Activar Norte →",
}: Props) {
  const labelCls = compact
    ? "text-[8px] text-gray-500 uppercase tracking-wider mb-1 block"
    : "text-[9px] text-gray-500 uppercase tracking-wider mb-1 block";

  if (locked) {
    return (
      <div className={className} data-testid={`${testId}-locked`}>
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

  const hubLink = hubHref ? (
    <NavTransitionLink
      href={hubHref}
      className="text-cyan-500/90 underline underline-offset-2"
      onClick={() => {
        onBeforeHubNavigate?.();
      }}
    >
      {proyectos.length === 0 ? "Abrir Hub" : "Abrir Hub de Proyectos"}
    </NavTransitionLink>
  ) : null;

  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onNativePickerOpen?.()}
        onBlur={() => onNativePickerClose?.()}
        className={
          compact
            ? "w-full p-2 rounded-lg bg-gray-900/60 border border-gray-800 text-gray-300 text-xs focus:outline-none focus:border-cyan-500/40"
            : "w-full p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-gray-200 text-sm focus:outline-none focus:border-cyan-500/50"
        }
        data-testid={testId}
      >
        <option value="">{emptyLabel}</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.etiqueta === "centro" ? "Centro" : "Proyecto"} · {p.titulo}
          </option>
        ))}
      </select>
      {hint ? (
        <p className="text-[8px] text-gray-600 mt-1">{hint}</p>
      ) : proyectos.length === 0 && hubLink ? (
        <p className="text-[8px] text-gray-600 mt-1" data-testid={`${testId}-abrir-hub`}>
          Sin proyectos. {hubLink} para crear y vincular.
        </p>
      ) : proyectos.length === 0 ? (
        <p className="text-[8px] text-gray-600 mt-1">
          Crea proyectos en el Hub para vincular este bloque.
        </p>
      ) : hubLink ? (
        <p className="text-[8px] text-gray-600 mt-1" data-testid={`${testId}-abrir-hub`}>
          {hubLink}
        </p>
      ) : null}
    </div>
  );
}

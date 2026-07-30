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
}: Props) {
  const hubLink = hubHref ? (
    <NavTransitionLink
      href={hubHref}
      className="text-cyan-500/90 underline underline-offset-2"
    >
      {proyectos.length === 0 ? "Abrir Hub" : "Abrir Hub de Proyectos"}
    </NavTransitionLink>
  ) : null;

  return (
    <div className={className}>
      <label
        className={
          compact
            ? "text-[8px] text-gray-500 uppercase tracking-wider mb-1 block"
            : "text-[9px] text-gray-500 uppercase tracking-wider mb-1 block"
        }
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

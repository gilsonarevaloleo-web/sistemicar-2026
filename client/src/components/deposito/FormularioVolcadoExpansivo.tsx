import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  CODIGOS_OBSERVADOR,
  DICCIONARIO_GRADOS,
  DICCIONARIO_OJOS,
  GRADOS_MAESTRIA,
  type CampoCapturaVolcado,
  type CapturaVolcadoExpansiva,
  type CodigoObservador,
  type GradoMaestria,
} from "@shared/deposito/engineConfig";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export interface FormularioVolcadoExpansivoProps {
  gradoMaestria: GradoMaestria;
  captura: CapturaVolcadoExpansiva;
  /** Opcional: el padre no debe suscribirse a cada tecla (congela el recinto). */
  onChange?: (captura: CapturaVolcadoExpansiva) => void;
  disabled?: boolean;
}

export interface FormularioVolcadoHandle {
  getCaptura: () => CapturaVolcadoExpansiva;
}

function visible(
  campo: CampoCapturaVolcado,
  grado: GradoMaestria,
): boolean {
  return DICCIONARIO_GRADOS[grado].camposVisibles.includes(campo);
}

export function EscalaGradosMaestria({
  gradoActivo,
}: {
  gradoActivo: GradoMaestria;
}) {
  return (
    <ol
      className="mb-6 grid grid-cols-4 gap-2"
      data-testid="deposito-escala-grados"
      aria-label="Escala de Grados de Maestría"
    >
      {GRADOS_MAESTRIA.map((n) => {
        const ficha = DICCIONARIO_GRADOS[n];
        const activo = n === gradoActivo;
        const alcanzado = n <= gradoActivo;
        return (
          <li
            key={n}
            className="px-2 py-2 text-center"
            style={{
              border: `1px solid ${activo ? GOLD : alcanzado ? `${GOLD}55` : "rgba(255,255,255,0.08)"}`,
              backgroundColor: activo ? `${GOLD}14` : "transparent",
            }}
            data-testid={`deposito-grado-${n}`}
            aria-current={activo ? "step" : undefined}
          >
            <p
              className="text-[9px] tracking-[0.18em]"
              style={{ color: activo ? GOLD : alcanzado ? `${GOLD}aa` : "rgba(255,255,255,0.28)" }}
            >
              G{n}
            </p>
            <p
              className="mt-1 text-[10px] leading-tight text-white/70"
              data-testid={activo ? "deposito-grado-nombre" : undefined}
            >
              {ficha.nombre}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export const FormularioVolcadoExpansivo = forwardRef<
  FormularioVolcadoHandle,
  FormularioVolcadoExpansivoProps
>(function FormularioVolcadoExpansivo(
  { gradoMaestria, captura, disabled },
  ref,
) {
  const [draft, setDraft] = useState<CapturaVolcadoExpansiva>(captura);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    setDraft((prev) => {
      if (prev.gradoMaestria !== gradoMaestria) {
        return { ...prev, gradoMaestria };
      }
      return prev;
    });
  }, [gradoMaestria]);

  useImperativeHandle(ref, () => ({
    getCaptura: () => ({ ...draftRef.current, gradoMaestria }),
  }));

  const patch = (partial: Partial<CapturaVolcadoExpansiva>) => {
    setDraft((prev) => {
      const next = { ...prev, gradoMaestria, ...partial };
      draftRef.current = next;
      return next;
    });
  };

  const ficha = DICCIONARIO_GRADOS[gradoMaestria];

  const fieldStyle = {
    border: `1px solid ${GOLD}33`,
    minHeight: "120px",
  } as const;

  return (
    <div data-testid="deposito-formulario-expansivo">
      <EscalaGradosMaestria gradoActivo={gradoMaestria} />
      <p
        className="mb-4 text-[11px] leading-relaxed text-white/40"
        data-testid="deposito-grado-descripcion"
      >
        {ficha.descripcion}
      </p>

      <label
        htmlFor="volcado-dia"
        className="mb-2 block text-[10px] tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        {ficha.preguntaVolcado}
      </label>
      <textarea
        id="volcado-dia"
        value={draft.volcadoCrudo}
        onChange={(e) => patch({ volcadoCrudo: e.target.value })}
        placeholder="Hoy aprendí…"
        rows={8}
        disabled={disabled}
        className="w-full resize-y bg-black/50 p-5 text-base leading-relaxed text-white/90 outline-none placeholder:text-white/25"
        style={{ ...fieldStyle, minHeight: "180px" }}
        data-testid="deposito-volcado-input"
      />

      {visible("friccionDetectada", gradoMaestria) && (
        <div className="mt-5" data-testid="deposito-campo-friccion">
          <label
            htmlFor="volcado-friccion"
            className="mb-2 block text-[10px] tracking-[0.22em]"
            style={{ color: AZURE }}
          >
            {ficha.preguntaFriccion}
          </label>
          <textarea
            id="volcado-friccion"
            value={draft.friccionDetectada ?? ""}
            onChange={(e) => patch({ friccionDetectada: e.target.value })}
            placeholder="La flor / excusa de hoy fue…"
            rows={4}
            disabled={disabled}
            className="w-full resize-y bg-black/50 p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/25"
            style={fieldStyle}
            data-testid="deposito-friccion-input"
          />
        </div>
      )}

      {visible("sombraOmision", gradoMaestria) && (
        <div className="mt-5" data-testid="deposito-campo-sombra">
          <label
            htmlFor="volcado-sombra"
            className="mb-2 block text-[10px] tracking-[0.22em]"
            style={{ color: AZURE }}
          >
            {ficha.preguntaSombra}
          </label>
          <textarea
            id="volcado-sombra"
            value={draft.sombraOmision ?? ""}
            onChange={(e) => patch({ sombraOmision: e.target.value })}
            placeholder="Lo que no dije…"
            rows={4}
            disabled={disabled}
            className="w-full resize-y bg-black/50 p-4 text-sm leading-relaxed text-white/90 outline-none placeholder:text-white/25"
            style={fieldStyle}
            data-testid="deposito-sombra-input"
          />
        </div>
      )}

      {visible("codigoHipotesis", gradoMaestria) && (
        <div className="mt-5" data-testid="deposito-campo-hipotesis">
          <label
            htmlFor="volcado-hipotesis"
            className="mb-2 block text-[10px] tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            {ficha.preguntaHipotesis}
          </label>
          <select
            id="volcado-hipotesis"
            value={draft.codigoHipotesis ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              patch({
                codigoHipotesis: CODIGOS_OBSERVADOR.includes(n as CodigoObservador)
                  ? (n as CodigoObservador)
                  : undefined,
              });
            }}
            disabled={disabled}
            className="w-full bg-black/50 px-4 py-3 text-sm text-white/90 outline-none"
            style={{ border: `1px solid ${GOLD}33` }}
            data-testid="deposito-hipotesis-select"
          >
            <option value="">Elegí un ojo antes de enviar</option>
            {CODIGOS_OBSERVADOR.map((n) => (
              <option key={n} value={n}>
                C{n} {DICCIONARIO_OJOS[n].nombreOjo}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
});

export default FormularioVolcadoExpansivo;

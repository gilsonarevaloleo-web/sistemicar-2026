import { useEffect, useState } from "react";
import { useAuthContext } from "@/App";
import { LienzoOficio, OFICIO_GOLD } from "@/components/umbral/LienzoOficio";
import { PanelLecturaOficio } from "@/components/umbral/PanelLecturaOficio";
import { leerVolcadoOficio } from "@/lib/umbral/oficioApi";
import {
  guestIdOficio,
  guardarBorradorOficio,
  leerBorradorOficio,
} from "@/lib/umbral/oficioLocal";
import type { OficioLectura } from "@shared/umbral/oficioMotor";
import {
  CASA_OFICIO_FIRMA,
  CASA_OFICIO_MARCA,
  CASA_OFICIO_NOMBRE,
  CASA_OFICIO_PERIMETRO,
  CASA_OFICIO_RITUAL_CORTO,
  CASA_OFICIO_PROHIBIDO,
  CASA_OFICIO_RECURSO,
  MATRIZ_OFICIO,
} from "@shared/umbral/oficioCasa";

/**
 * Planeta 5 Oficio — entrada cortante.
 * Una pregunta, un volcado, un código de la matriz del 5.
 * Forja/Arena quedan como CTA interior del código, no como portada.
 */
export default function UmbralEntrada() {
  const { user } = useAuthContext();
  const userId = user?.uid || guestIdOficio();

  const [texto, setTexto] = useState("");
  const [lectura, setLectura] = useState<OficioLectura | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = leerBorradorOficio();
    if (draft) setTexto(draft);
  }, [userId]);

  const onTexto = (value: string) => {
    setTexto(value);
    guardarBorradorOficio(value);
  };

  const leer = async () => {
    setError(null);
    setLeyendo(true);
    try {
      const out = await leerVolcadoOficio({ textoVolcado: texto, userId });
      setLectura(out.lectura);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el oficio.");
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <div
      className="min-h-screen text-[#E8E8E8]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #141820 0%, #0A0A0A 42%, #050505 100%)",
      }}
      data-testid="umbral-entrada-page"
    >
      <div className="relative mx-auto max-w-xl px-4 py-8 pb-28 sm:py-12">
        <p className="text-[12px] tracking-[0.22em]" style={{ color: OFICIO_GOLD }}>
          PLANETA C5 · {CASA_OFICIO_NOMBRE.toUpperCase()}
        </p>
        <p className="mt-2 text-[10px] tracking-[0.2em] text-white/40">
          {CASA_OFICIO_MARCA.toUpperCase()} · {CASA_OFICIO_RITUAL_CORTO}
        </p>
        <p className="mt-3 text-sm text-white/55">{CASA_OFICIO_FIRMA}</p>

        <article
          className="mt-6 border p-4"
          style={{ borderColor: `${OFICIO_GOLD}33`, background: `${OFICIO_GOLD}0a` }}
          data-testid="umbral-entrada-perimetro"
        >
          <p className="text-[10px] tracking-[0.2em]" style={{ color: OFICIO_GOLD }}>
            PERÍMETRO
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {CASA_OFICIO_PERIMETRO}
          </p>
          <p className="mt-2 text-[11px] text-white/45">
            Recurso: {CASA_OFICIO_RECURSO} Prohibido: {CASA_OFICIO_PROHIBIDO}
          </p>
        </article>

        <article
          className="mt-3 border p-4"
          style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.35)" }}
          data-testid="umbral-entrada-matriz"
        >
          <p className="text-[10px] tracking-[0.2em] text-white/40">
            MATRIZ OFICIO · C1–C10
          </p>
          <p className="mt-1 text-[11px] text-white/40">
            El número no es pasaporte. C5 aquí es Cálculo, no Decisión.
          </p>
          <ol className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {MATRIZ_OFICIO.map((f) => (
              <li
                key={f.numero}
                className="flex items-baseline gap-2 text-[12px] text-white/70"
              >
                <span style={{ color: OFICIO_GOLD }}>C{f.numero}</span>
                <span className="font-medium text-white/85">{f.marca}</span>
                <span className="text-white/40">{f.acto}</span>
              </li>
            ))}
          </ol>
        </article>

        <div className="mt-8">
          {!lectura ? (
            <LienzoOficio
              texto={texto}
              onTexto={onTexto}
              onLeer={() => void leer()}
              cargando={leyendo}
            />
          ) : (
            <PanelLecturaOficio
              lectura={lectura}
              onRehacer={() => {
                setLectura(null);
                setError(null);
              }}
            />
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" data-testid="umbral-entrada-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

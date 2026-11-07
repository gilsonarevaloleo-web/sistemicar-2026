import React, { type FormEvent, useEffect, useRef, useState } from "react";
import type { LibroGimnasio, PreguntaViva } from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";

export function ConsolaGimnasio({
  libro,
  pregunta,
  topeDiario,
  onResponder,
  onContinuar,
  onCopiar,
  enviando,
  aviso,
}: {
  libro: LibroGimnasio;
  pregunta: PreguntaViva | null;
  topeDiario: boolean;
  onResponder: (texto: string) => void;
  onContinuar?: () => void;
  onCopiar: () => void;
  enviando: boolean;
  aviso?: string | null;
}) {
  const [texto, setTexto] = useState("");
  const enviandoRef = useRef(false);
  const turnoCount = libro.turnos.length;
  const punteroClave = `${libro.id}:${libro.puntero.capitulo}.${libro.puntero.subcodigo}.${libro.puntero.indice}.${libro.puntero.variante}:${turnoCount}`;

  useEffect(() => {
    enviandoRef.current = enviando;
  }, [enviando]);

  // Solo se vacía cuando el libro realmente avanzó o guardó el turno.
  // Si el maestro no responde, el texto se queda.
  useEffect(() => {
    setTexto("");
  }, [punteroClave]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (enviando || enviandoRef.current || texto.trim().length < 1) return;
    enviandoRef.current = true;
    onResponder(texto);
  };

  return (
    <section className="space-y-4" data-testid="gimnasio6-consola">
      <header className="flex items-center justify-between">
        <p
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: UMBRAL5_BRONZE }}
        >
          {pregunta?.etiquetaCapitulo ?? "Gimnasio"}
        </p>
        <button
          type="button"
          onClick={onCopiar}
          className="text-[10px] uppercase tracking-[0.18em] text-white/40 hover:text-white/70"
          data-testid="gimnasio6-copiar"
        >
          Copiar libro
        </button>
      </header>

      {libro.turnos.slice(-8).map((t) => (
        <article
          key={t.id}
          className="border px-4 py-3"
          style={{ borderColor: `${UMBRAL5_BRONZE}22` }}
          data-testid={`gimnasio6-turno-${t.id}`}
        >
          <p className="text-[11px] text-white/45">{t.pregunta}</p>
          {t.respuesta && (
            <p className="mt-2 text-sm text-white/80">{t.respuesta}</p>
          )}
        </article>
      ))}

      {topeDiario && (
        <p className="text-[12px] leading-relaxed text-white/55" data-testid="gimnasio6-tope">
          Capítulo sellado. A lo mucho uno por día. Mañana sigue el libro.
        </p>
      )}

      {topeDiario && onContinuar && (
        <button
          type="button"
          onClick={onContinuar}
          className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{
            backgroundColor: "transparent",
            color: UMBRAL5_BRONZE,
            border: `1px solid ${UMBRAL5_BRONZE}55`,
          }}
          data-testid="gimnasio6-continuar"
        >
          Continuar el siguiente capítulo
        </button>
      )}

      {pregunta && !topeDiario && libro.estado === "ABIERTO" && (
        <form onSubmit={handleSubmit} className="space-y-3" data-testid="gimnasio6-form">
          <p
            className={`text-sm leading-relaxed ${pregunta.variante > 0 ? "" : "text-white/55"}`}
            style={pregunta.variante > 0 ? { color: UMBRAL5_BRONZE } : undefined}
            data-testid="gimnasio6-escenario"
          >
            {pregunta.escenario}
          </p>
          <p
            className="text-lg font-light leading-snug"
            style={{ color: UMBRAL5_BRONZE }}
            data-testid="gimnasio6-pregunta"
          >
            {pregunta.pregunta}
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            disabled={enviando}
            className="w-full resize-y bg-black/60 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 disabled:opacity-70"
            style={{ border: `1px solid ${UMBRAL5_BRONZE}33` }}
            placeholder="Respondé desde el cuarto. No desde la teoría."
            data-testid="gimnasio6-respuesta"
          />
          {aviso && (
            <p className="text-sm text-red-400/80" data-testid="gimnasio6-aviso">
              {aviso}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando || texto.trim().length < 1}
            className="w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
            style={{ backgroundColor: UMBRAL5_BRONZE, color: "#0a0a0a" }}
            data-testid="gimnasio6-enviar"
          >
            {enviando ? "…" : "Entrar"}
          </button>
        </form>
      )}

      {libro.estado === "LIBRO_CERRADO" && (
        <p className="text-[12px] text-white/50">El libro está cerrado.</p>
      )}

      <p className="text-[10px] tracking-[0.16em] uppercase" style={{ color: UMBRAL5_ASH }}>
        El poder no está en el ambiente. Está en este cuarto.
      </p>
    </section>
  );
}

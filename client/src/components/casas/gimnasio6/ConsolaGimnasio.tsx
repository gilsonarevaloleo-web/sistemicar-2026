import React, { type FormEvent, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  ETIQUETA_CAPITULO,
  capituloVisibleDe,
  pasosDelCapitulo,
  type LibroGimnasio,
  type PreguntaViva,
} from "@shared/casas/gimnasio6";
import { UMBRAL5_ASH, UMBRAL5_BRONZE } from "../umbral5/LienzoLimite";
import { PasosCapitulo } from "./PasosCapitulo";
import {
  playPasoCuarto,
  setCuartoMute,
  startCamaCuarto,
  stopCamaCuarto,
  unlockCuartoAudio,
} from "../../../lib/casas/gimnasio6/cuartoAudio.ts";

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
  const [mute, setMute] = useState(false);
  const enviandoRef = useRef(false);
  const pasoPrevio = useRef<string | null>(null);
  const turnoCount = libro.turnos.length;
  const punteroClave = `${libro.id}:${libro.modulo}:${libro.puntero.capitulo}.${libro.puntero.indice}.${libro.puntero.variante}:${turnoCount}`;
  const capituloVista = capituloVisibleDe(libro);
  const sellado =
    topeDiario ||
    libro.estado === "TOPE_DIARIO" ||
    libro.estado === "CAPITULO_SELLADO";
  const pasos = pasosDelCapitulo(capituloVista, libro.puntero, {
    sellado,
    puerta: libro.modulo === "vendedor" ? "vendedor" : "limite",
    origen: libro.limiteOrigen,
  });
  const pasoClave = `${capituloVista}.${libro.puntero.indice}`;
  const etiqueta =
    pregunta?.etiquetaCapitulo ?? ETIQUETA_CAPITULO[capituloVista] ?? `C${capituloVista}`;
  const punteroLabel = sellado
    ? "sellado"
    : pregunta?.etiquetaTiempo ?? `${libro.puntero.indice}`;
  const enCuarto = libro.estado === "ABIERTO" && !topeDiario;

  useEffect(() => {
    enviandoRef.current = enviando;
  }, [enviando]);

  // Solo se vacía cuando el libro realmente avanzó o guardó el turno.
  // Si el maestro no responde, el texto se queda.
  useEffect(() => {
    setTexto("");
  }, [punteroClave]);

  useEffect(() => {
    if (!enCuarto || mute) {
      stopCamaCuarto();
      return;
    }
    startCamaCuarto(capituloVista);
    return () => {
      stopCamaCuarto();
    };
  }, [enCuarto, mute, capituloVista, libro.id]);

  useEffect(() => {
    if (!enCuarto) {
      pasoPrevio.current = pasoClave;
      return;
    }
    if (pasoPrevio.current && pasoPrevio.current !== pasoClave) {
      playPasoCuarto();
    }
    pasoPrevio.current = pasoClave;
  }, [pasoClave, enCuarto]);

  useEffect(() => {
    return () => {
      stopCamaCuarto();
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (enviando || enviandoRef.current || texto.trim().length < 1) return;
    enviandoRef.current = true;
    void unlockCuartoAudio();
    onResponder(texto);
  };

  const toggleMute = () => {
    const next = !mute;
    setMute(next);
    setCuartoMute(next);
    if (!next) {
      void unlockCuartoAudio().then(() => {
        if (enCuarto) startCamaCuarto(capituloVista);
      });
    } else {
      stopCamaCuarto();
    }
  };

  return (
    <section
      className="relative space-y-5 overflow-hidden border px-5 py-6"
      style={{
        borderColor: `${UMBRAL5_BRONZE}55`,
        background:
          "radial-gradient(ellipse at 50% 28%, #1c1610 0%, #0a0908 48%, #050505 100%)",
        boxShadow: `inset 0 0 90px #000, 0 0 0 1px ${UMBRAL5_BRONZE}14`,
      }}
      data-testid="gimnasio6-consola"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <header className="relative flex items-center justify-between gap-3">
        <p
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: UMBRAL5_BRONZE }}
          data-testid="gimnasio6-puntero"
        >
          {etiqueta} · {punteroLabel}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            className="text-white/40 hover:text-white/70"
            aria-label={mute ? "Activar sonido del cuarto" : "Silenciar el cuarto"}
            data-testid="gimnasio6-mute"
          >
            {mute ? (
              <VolumeX size={14} />
            ) : (
              <Volume2 size={14} style={{ color: UMBRAL5_BRONZE }} />
            )}
          </button>
          <button
            type="button"
            onClick={onCopiar}
            className="text-[10px] uppercase tracking-[0.18em] text-white/40 hover:text-white/70"
            data-testid="gimnasio6-copiar"
          >
            Copiar libro
          </button>
        </div>
      </header>

      <div className="relative">
        <PasosCapitulo pasos={pasos} />
      </div>

      {topeDiario && (
        <p className="relative text-[12px] leading-relaxed text-white/55" data-testid="gimnasio6-tope">
          Código sellado. A lo mucho uno por día. Mañana sigue el libro.
        </p>
      )}

      {topeDiario && onContinuar && (
        <button
          type="button"
          onClick={onContinuar}
          className="relative w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{
            backgroundColor: "transparent",
            color: UMBRAL5_BRONZE,
            border: `1px solid ${UMBRAL5_BRONZE}55`,
          }}
          data-testid="gimnasio6-continuar"
        >
          Continuar el siguiente código
        </button>
      )}

      {pregunta && !topeDiario && libro.estado === "ABIERTO" && (
        <form
          onSubmit={handleSubmit}
          className="relative space-y-4"
          data-testid="gimnasio6-form"
        >
          <p
            className="text-base font-light leading-relaxed md:text-lg"
            style={{
              color: pregunta.variante > 0 ? UMBRAL5_BRONZE : "rgba(255,255,255,0.72)",
            }}
            data-testid="gimnasio6-escenario"
          >
            {pregunta.escenario}
          </p>
          <p
            className="text-xl font-light leading-snug"
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
            className="w-full resize-y bg-black/50 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 disabled:opacity-70"
            style={{ border: `1px solid ${UMBRAL5_BRONZE}40` }}
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

      {libro.turnos.slice(-3).map((t) => (
        <article
          key={t.id}
          className="relative border px-4 py-3"
          style={{ borderColor: `${UMBRAL5_BRONZE}22` }}
          data-testid={`gimnasio6-turno-${t.id}`}
        >
          <p className="text-[11px] text-white/45">{t.pregunta}</p>
          {t.respuesta && (
            <p className="mt-2 text-sm text-white/80">{t.respuesta}</p>
          )}
        </article>
      ))}

      {libro.estado === "LIBRO_CERRADO" && (
        <p className="relative text-[12px] text-white/50">El libro está cerrado.</p>
      )}

      <p
        className="relative text-[10px] tracking-[0.16em] uppercase"
        style={{ color: UMBRAL5_ASH }}
      >
        El poder no está en el ambiente. Está en este cuarto.
      </p>
    </section>
  );
}

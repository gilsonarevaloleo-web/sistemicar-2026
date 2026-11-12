import React, { useState } from "react";
import { Filter, Landmark, Scale, Inbox } from "lucide-react";
import {
  CEREBRO_MADRE_FIRMA,
  CEREBRO_MADRE_MARCA,
  CEREBRO_MADRE_NOMBRE,
  CEREBRO_MADRE_NO_ES,
  ORACULO_CASA_TONO,
  categoriaDe,
  formatFechaPrincipio,
  leyesDeCasa,
  principiosPorEstado,
  responderConsulta,
  resumenCerebroMadre,
  type CerebroMadre,
  type EstadoPrincipio,
  type PrincipioAprendizaje,
  type RespuestaOraculo,
} from "@shared/deposito/v3";

const GOLD = "#D4AF37";

const BANDEJAS: {
  estado: Exclude<EstadoPrincipio, "rechazado">;
  titulo: string;
  testid: string;
  icon: typeof Inbox;
}[] = [
  { estado: "candidato", titulo: "Candidatos", testid: "deposito-v3-cm-candidatos", icon: Inbox },
  { estado: "filtro", titulo: "Filtro", testid: "deposito-v3-cm-filtro", icon: Filter },
  { estado: "ley", titulo: "Leyes de casa", testid: "deposito-v3-cm-leyes", icon: Scale },
];

export function CerebroMadreV3({
  cerebro,
  onEnviarAFiltro,
  onPromover,
  onRechazar,
  onEscribirAplicacion,
}: {
  cerebro: CerebroMadre;
  onEnviarAFiltro: (id: string) => void;
  onPromover: (id: string) => void;
  onRechazar: (id: string) => void;
  onEscribirAplicacion: (id: string, aplicacion: string) => void;
}) {
  const [abierta, setAbierta] = useState(true);
  const [pregunta, setPregunta] = useState("");
  const [dictamen, setDictamen] = useState<RespuestaOraculo | null>(null);

  return (
    <section
      className="border"
      style={{ borderColor: `${GOLD}44`, backgroundColor: "rgba(0,0,0,0.45)" }}
      data-testid="deposito-v3-cerebro-madre"
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
        aria-expanded={abierta}
        data-testid="deposito-v3-cm-toggle"
      >
        <Landmark
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: GOLD }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            {CEREBRO_MADRE_MARCA.toUpperCase()}
          </span>
          <span className="mt-0.5 block text-sm font-light tracking-tight text-white">
            {CEREBRO_MADRE_NOMBRE}
          </span>
          <span
            className="mt-1 block text-xs leading-relaxed text-white/55"
            data-testid="deposito-v3-cm-resumen"
          >
            {resumenCerebroMadre(cerebro)}
          </span>
        </span>
      </button>

      {abierta && (
        <div
          className="space-y-4 border-t px-5 py-4"
          style={{ borderColor: `${GOLD}22` }}
        >
          <p
            className="text-[11px] leading-relaxed text-white/45"
            data-testid="deposito-v3-cm-firma"
          >
            {CEREBRO_MADRE_FIRMA}
          </p>
          <form
            className="space-y-3"
            data-testid="deposito-v3-cm-oraculo"
            onSubmit={(e) => {
              e.preventDefault();
              setDictamen(responderConsulta(pregunta, leyesDeCasa(cerebro)));
            }}
          >
            <p
              className="text-[10px] tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              ORÁCULO
            </p>
            <p className="text-[11px] leading-relaxed text-white/40">
              {ORACULO_CASA_TONO}
            </p>
            <label className="block">
              <span className="sr-only">Consulta a Sistemicar</span>
              <input
                type="text"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                placeholder="¿Qué dice Sistemicar sobre…?"
                className="w-full bg-black px-3 py-2 font-mono text-xs text-white outline-none"
                style={{ border: `1px solid ${GOLD}55` }}
                data-testid="deposito-v3-cm-oraculo-input"
              />
            </label>
            <button
              type="submit"
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest"
              style={{ border: `1px solid ${GOLD}66`, color: GOLD }}
              data-testid="deposito-v3-cm-oraculo-submit"
            >
              Consultar
            </button>
            {dictamen?.vacio === true && (
              <p
                className="text-xs leading-relaxed text-white/70"
                data-testid="deposito-v3-cm-oraculo-vacio"
              >
                {dictamen.texto}
              </p>
            )}
            {dictamen?.vacio === false && (
              <div className="space-y-2" data-testid="deposito-v3-cm-oraculo-hit">
                <p className="text-[10px] font-mono uppercase tracking-wider text-white/45">
                  C{dictamen.codigo} · {dictamen.categoria}
                </p>
                <p
                  className="text-xs leading-relaxed text-white/80"
                  data-testid="deposito-v3-cm-oraculo-axioma"
                >
                  <span className="mr-2 tracking-[0.14em] text-white/40">
                    AXIOMA
                  </span>
                  {dictamen.axioma}
                </p>
                {dictamen.aplicacion ? (
                  <p
                    className="text-xs leading-relaxed text-white/65"
                    data-testid="deposito-v3-cm-oraculo-aplicacion"
                  >
                    <span className="mr-2 tracking-[0.14em] text-white/40">
                      APLICACIÓN
                    </span>
                    {dictamen.aplicacion}
                  </p>
                ) : null}
              </div>
            )}
          </form>
          <div className="grid gap-4 md:grid-cols-3">
            {BANDEJAS.map((b) => {
              const items = principiosPorEstado(cerebro, b.estado);
              const Icon = b.icon;
              return (
                <div
                  key={b.estado}
                  className="border px-3 py-3"
                  style={{ borderColor: `${GOLD}28` }}
                  data-testid={b.testid}
                >
                  <p
                    className="mb-3 flex items-center gap-2 text-[10px] tracking-[0.18em]"
                    style={{ color: GOLD }}
                  >
                    <Icon size={12} aria-hidden />
                    {b.titulo.toUpperCase()}
                    <span className="ml-auto font-mono text-white/40">
                      {items.length}
                    </span>
                  </p>
                  {items.length === 0 ? (
                    <p className="text-[11px] text-white/35">Bandeja vacía.</p>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((p) => (
                        <PrincipioCard
                          key={p.id}
                          principio={p}
                          onEnviarAFiltro={onEnviarAFiltro}
                          onPromover={onPromover}
                          onRechazar={onRechazar}
                          onEscribirAplicacion={onEscribirAplicacion}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-white/35">
            {CEREBRO_MADRE_NO_ES.join(" ")}
          </p>
        </div>
      )}
    </section>
  );
}

function PrincipioCard({
  principio,
  onEnviarAFiltro,
  onPromover,
  onRechazar,
  onEscribirAplicacion,
}: {
  principio: PrincipioAprendizaje;
  onEnviarAFiltro: (id: string) => void;
  onPromover: (id: string) => void;
  onRechazar: (id: string) => void;
  onEscribirAplicacion: (id: string, aplicacion: string) => void;
}) {
  return (
    <li
      className="space-y-2"
      data-testid={`deposito-v3-cm-item-${principio.id}`}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">
        C{principio.foco} {principio.percepcion}
        <span className="ml-2 text-white/35">
          · {categoriaDe(principio.foco)}
        </span>
        {principio.firma !== principio.foco && (
          <span className="ml-2" style={{ color: GOLD }}>
            FIRMA C{principio.firma}
          </span>
        )}
        {principio.usos > 1 && (
          <span className="ml-2 text-white/35">· {principio.usos} usos</span>
        )}
      </p>
      <p className="text-xs leading-relaxed text-white/75">{principio.enunciado}</p>
      {principio.acomodo && (
        <p
          className="text-[11px] leading-relaxed text-white/50"
          data-testid={`deposito-v3-cm-acomodo-${principio.id}`}
        >
          {principio.acomodo}
        </p>
      )}
      {principio.estado === "ley" && principio.aplicacion ? (
        <p
          className="text-[11px] leading-relaxed text-white/60"
          data-testid={`deposito-v3-cm-aplicacion-ley-${principio.id}`}
        >
          {principio.aplicacion}
        </p>
      ) : null}
      {(principio.pedidos ?? 0) > 0 && (
        <p
          className="text-[10px] font-mono text-white/40"
          data-testid={`deposito-v3-cm-medida-${principio.id}`}
        >
          Próximo · {principio.confirmados ?? 0}/{principio.pedidos} construyeron C
          {principio.foco}
          {principio.ultimaMedida
            ? principio.ultimaMedida.construyo
              ? " · último: sí"
              : " · último: no"
            : ""}
        </p>
      )}
      <p
        className="text-[10px] font-mono tracking-wide"
        style={{ color: GOLD }}
        data-testid={`deposito-v3-cm-created-${principio.id}`}
      >
        Creado · {formatFechaPrincipio(principio.createdAt)}
      </p>
      {principio.evaluatedAt && principio.estado !== "candidato" && (
        <p className="text-[10px] font-mono text-white/35">
          Filtrado · {formatFechaPrincipio(principio.evaluatedAt)}
        </p>
      )}
      {principio.promotedAt && principio.estado === "ley" && (
        <p className="text-[10px] font-mono text-white/35">
          Ley · {formatFechaPrincipio(principio.promotedAt)}
        </p>
      )}
      {principio.estado === "candidato" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEnviarAFiltro(principio.id)}
            className="px-2 py-1 text-[10px] uppercase tracking-widest"
            style={{ border: `1px solid ${GOLD}66`, color: GOLD }}
            data-testid={`deposito-v3-cm-filtrar-${principio.id}`}
          >
            Enviar a filtro
          </button>
          <button
            type="button"
            onClick={() => onRechazar(principio.id)}
            className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/40"
            data-testid={`deposito-v3-cm-rechazar-${principio.id}`}
          >
            Rechazar
          </button>
        </div>
      )}
      {principio.estado === "filtro" && (
        <div className="flex flex-wrap gap-2">
          <label className="block w-full">
            <span className="mb-1 block text-[10px] tracking-[0.14em] text-white/40">
              APLICACIÓN OPERATIVA
            </span>
            <textarea
              value={principio.aplicacion ?? ""}
              onChange={(e) =>
                onEscribirAplicacion(principio.id, e.target.value)
              }
              rows={3}
              className="w-full bg-black px-2 py-1.5 font-mono text-[11px] text-white/80 outline-none"
              style={{ border: `1px solid ${GOLD}44` }}
              placeholder="Cómo se traduce este axioma en una acción del hacedor."
              data-testid={`deposito-v3-cm-aplicacion-${principio.id}`}
            />
          </label>
          <button
            type="button"
            onClick={() => onPromover(principio.id)}
            className="px-2 py-1 text-[10px] uppercase tracking-widest"
            style={{ backgroundColor: GOLD, color: "#111" }}
            data-testid={`deposito-v3-cm-promover-${principio.id}`}
          >
            Promover a ley
          </button>
          <button
            type="button"
            onClick={() => onRechazar(principio.id)}
            className="px-2 py-1 text-[10px] uppercase tracking-widest text-white/40"
            data-testid={`deposito-v3-cm-rechazar-${principio.id}`}
          >
            Rechazar
          </button>
        </div>
      )}
    </li>
  );
}

export default CerebroMadreV3;

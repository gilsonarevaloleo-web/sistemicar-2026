import React, { useState } from "react";
import { Filter, Landmark, Scale, Inbox } from "lucide-react";
import {
  CEREBRO_MADRE_FIRMA,
  CEREBRO_MADRE_MARCA,
  CEREBRO_MADRE_NOMBRE,
  CEREBRO_MADRE_NO_ES,
  formatFechaPrincipio,
  principiosPorEstado,
  resumenCerebroMadre,
  type CerebroMadre,
  type EstadoPrincipio,
  type PrincipioAprendizaje,
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
}: {
  cerebro: CerebroMadre;
  onEnviarAFiltro: (id: string) => void;
  onPromover: (id: string) => void;
  onRechazar: (id: string) => void;
}) {
  const [abierta, setAbierta] = useState(true);

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
}: {
  principio: PrincipioAprendizaje;
  onEnviarAFiltro: (id: string) => void;
  onPromover: (id: string) => void;
  onRechazar: (id: string) => void;
}) {
  return (
    <li
      className="space-y-2"
      data-testid={`deposito-v3-cm-item-${principio.id}`}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">
        C{principio.foco} {principio.percepcion}
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

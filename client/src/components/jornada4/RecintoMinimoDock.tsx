import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import type { RecintoAjeno } from "@shared/recintoMinimo";
import {
  addRecintoMinimo,
  defaultSaleHm,
  listRecintosDelDia,
  sacarRecintoOperador,
} from "@/lib/recintoMinimoStore";
import { formatLimaTimeHM } from "@/lib/segmentTime";
import { J4_NEON, J4_UI } from "./jornada4Ui";

const BLOOD = "#FF2A2A";

export function RecintoMinimoDock() {
  const [texto, setTexto] = useState("");
  const [saleHm, setSaleHm] = useState(() => defaultSaleHm());
  const [items, setItems] = useState<RecintoAjeno[]>(() => listRecintosDelDia());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setItems(listRecintosDelDia());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const capturar = () => {
    setError(null);
    try {
      addRecintoMinimo({ texto, saleHm });
      setTexto("");
      setSaleHm(defaultSaleHm());
      setItems(listRecintosDelDia());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar al recinto.");
    }
  };

  return (
    <section
      className={`mx-3 mb-3 sm:mx-4 ${J4_UI.card} space-y-2`}
      data-testid="recinto-minimo-dock"
    >
      <p className={`${J4_UI.label} flex items-center gap-1.5`}>
        <Timer size={11} style={{ color: J4_NEON.emerald }} />
        Recinto
      </p>
      <div className="flex flex-row items-center gap-2">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Qué entró"
          className="flex-1 min-w-0 rounded-lg px-2.5 py-2 text-xs bg-black/40 border border-white/10 text-slate-100"
          data-testid="recinto-texto"
          onKeyDown={e => {
            if (e.key === "Enter") capturar();
          }}
        />
        <input
          type="time"
          value={saleHm}
          onChange={e => setSaleHm(e.target.value)}
          className="w-[5.75rem] shrink-0 rounded-lg px-2 py-2 text-xs bg-black/40 border border-white/10 text-slate-100"
          data-testid="recinto-hora-salida"
        />
        <button
          type="button"
          onClick={capturar}
          className="shrink-0 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider"
          style={{ backgroundColor: J4_NEON.ink, color: "#0a0a0a" }}
          data-testid="recinto-entrar"
        >
          Entrar
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-400" data-testid="recinto-error">
          {error}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map(r => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 bg-white/[0.03]"
              data-testid={`recinto-item-${r.estado}`}
            >
              <div className="min-w-0">
                <p className="text-xs truncate text-neutral-100">{r.texto}</p>
                <p
                  className={J4_UI.hint}
                  style={{ color: r.estado === "heredado" ? BLOOD : undefined }}
                >
                  {r.estado === "dentro"
                    ? `Sale ${formatLimaTimeHM(r.saleAt)}`
                    : r.estado === "salio"
                      ? "Salió · tú lo sacaste"
                      : "Heredado · no salió a su hora"}
                </p>
              </div>
              {r.estado === "dentro" ? (
                <button
                  type="button"
                  onClick={() => {
                    sacarRecintoOperador(r.id);
                    setItems(listRecintosDelDia());
                  }}
                  className="shrink-0 text-[10px] font-black uppercase tracking-wider text-neutral-400"
                  data-testid="recinto-sacar"
                >
                  Sale
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

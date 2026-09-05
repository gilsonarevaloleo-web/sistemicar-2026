import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { J4_COLORS } from "./Jornada4Shell";
import type { RecintoAjeno } from "@shared/recintoMinimo";
import {
  addRecintoMinimo,
  defaultSaleHm,
  listRecintosDelDia,
  sacarRecintoOperador,
} from "@/lib/recintoMinimoStore";
import { formatLimaTimeHM } from "@/lib/segmentTime";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;
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
      className="mx-3 mb-3 sm:mx-4 rounded-xl border p-3 space-y-2"
      style={{ backgroundColor: PIZARRA, borderColor: "rgba(212,175,55,0.22)" }}
      data-testid="recinto-minimo-dock"
    >
      <p
        className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
        style={{ color: MUTED }}
      >
        <Timer size={10} style={{ color: GOLD }} />
        Recinto · lo ajeno sale a una hora
      </p>
      <p className="text-[10px] leading-snug" style={{ color: MUTED }}>
        Un pensamiento o emoción entra aquí con hora de salida. Si no lo sacas tú, se hereda.
      </p>
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Qué entró"
          className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[12px] bg-black/40 border border-white/10 text-slate-100"
          data-testid="recinto-texto"
          onKeyDown={(e) => {
            if (e.key === "Enter") capturar();
          }}
        />
        <input
          type="time"
          value={saleHm}
          onChange={(e) => setSaleHm(e.target.value)}
          className="w-[6.5rem] rounded-lg px-2 py-1.5 text-[12px] bg-black/40 border border-white/10 text-slate-100"
          data-testid="recinto-hora-salida"
        />
        <button
          type="button"
          onClick={capturar}
          className="px-2.5 rounded-lg text-[10px] font-black uppercase"
          style={{ backgroundColor: `${GOLD}22`, color: GOLD }}
          data-testid="recinto-entrar"
        >
          Entra
        </button>
      </div>
      {error ? (
        <p className="text-[10px] text-red-400" data-testid="recinto-error">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            data-testid={`recinto-item-${r.estado}`}
          >
            <div className="min-w-0">
              <p className="text-[12px] truncate" style={{ color: INK }}>
                {r.texto}
              </p>
              <p className="text-[9px]" style={{ color: r.estado === "heredado" ? BLOOD : MUTED }}>
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
                className="shrink-0 text-[9px] font-black uppercase"
                style={{ color: GOLD }}
                data-testid="recinto-sacar"
              >
                Sale
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

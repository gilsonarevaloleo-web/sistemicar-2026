import { useState } from "react";
import { Crosshair } from "lucide-react";
import { APUNTE_MAX_LEN } from "@shared/jornadaApunte";
import { useJornadaApunte } from "@/hooks/useJornadaApunte";
import { J4_COLORS } from "./Jornada4Shell";

const { PIZARRA, INK, MUTED, GOLD } = J4_COLORS;

export function Jornada4ApunteCard() {
  const { record, apuntado, cerrado, error, apuntar } = useJornadaApunte();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const showForm = !apuntado || editing;

  const commit = () => {
    apuntar(draft);
    setDraft("");
    setEditing(false);
  };

  return (
    <section
      className="mx-3 mb-3 sm:mx-4 rounded-xl border p-3 space-y-2"
      style={{
        backgroundColor: PIZARRA,
        borderColor: cerrado ? "rgba(212,175,55,0.45)" : "rgba(212,175,55,0.28)",
      }}
      data-testid="jornada4-apunte-card"
    >
      <p
        className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
        style={{ color: MUTED }}
      >
        <Crosshair size={10} style={{ color: GOLD }} />
        Hoy apunto a esto
      </p>

      {showForm ? (
        <>
          <p className="text-[11px] leading-snug" style={{ color: INK }}>
            Una frase. El día deja de ser anónimo.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, APUNTE_MAX_LEN))}
            placeholder="Hoy apunto a esto"
            rows={2}
            className="w-full rounded-lg px-2.5 py-2 text-[13px] bg-black/40 border border-white/10 text-slate-100 resize-none"
            data-testid="jornada4-apunte-input"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
            }}
          />
          <button
            type="button"
            onClick={commit}
            className="w-full py-2 rounded-lg text-[11px] font-black uppercase tracking-wider"
            style={{ backgroundColor: `${GOLD}22`, color: GOLD }}
            data-testid="jornada4-apunte-guardar"
          >
            Apuntar
          </button>
        </>
      ) : (
        <>
          <p
            className="text-[13px] leading-snug font-semibold"
            style={{ color: INK }}
            data-testid="jornada4-apunte-blanco"
          >
            {record?.blanco}
          </p>
          {cerrado ? (
            <div className="space-y-1" data-testid="jornada4-apunte-cierre">
              <p className="text-[11px] leading-snug" style={{ color: INK }}>
                <span style={{ color: GOLD }}>Esto ocurrió. </span>
                {record?.ocurrio}
              </p>
              <p className="text-[11px] leading-snug" style={{ color: INK }}>
                <span style={{ color: MUTED }}>Esto no. </span>
                {record?.noOcurrio}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(record?.blanco ?? "");
                setEditing(true);
              }}
              className="text-[10px] underline underline-offset-2"
              style={{ color: MUTED }}
              data-testid="jornada4-apunte-cambiar"
            >
              Cambiar el blanco
            </button>
          )}
        </>
      )}
      {error ? (
        <p className="text-[10px] text-red-400" data-testid="jornada4-apunte-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}

import { SECUENCIA_LETRAS, type SecuenciaAnclada, type SecuenciaLetra } from "@/lib/secuenciaAnclada";

const GOLD = "#D4AF37";
const MUTED = "#64748b";
const INK = "#f1f5f9";
const ORANGE = "#f97316";

type Props = {
  slots: SecuenciaAnclada[];
  dueLetter: SecuenciaLetra | null;
  activeLetter: SecuenciaLetra | null;
  canAnchor: boolean;
  hora: string;
  overwriteLetter: SecuenciaLetra | null;
  onHoraChange: (hora: string) => void;
  onRecall: (letra: SecuenciaLetra) => void;
  onAnchorLetter: (letra: SecuenciaLetra) => void;
  onConfirmOverwrite: () => void;
  onCancelOverwrite: () => void;
  onClearHora: () => void;
};

export function SecuenciaAncladaBar({
  slots,
  dueLetter,
  activeLetter,
  canAnchor,
  hora,
  overwriteLetter,
  onHoraChange,
  onRecall,
  onAnchorLetter,
  onConfirmOverwrite,
  onCancelOverwrite,
  onClearHora,
}: Props) {
  const byLetra = new Map(slots.map(s => [s.letra, s]));

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        borderColor: `${GOLD}35`,
        backgroundColor: "rgba(212,175,55,0.06)",
      }}
      data-testid="jornada4-secuencia-anclada"
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: GOLD }}
        >
          Hábito A–F · secuencia + horario
        </p>
        <p className="text-[8px]" style={{ color: MUTED }}>
          Letra recuerda. No lanza.
        </p>
      </div>

      <div className="grid grid-cols-6 gap-1.5" data-testid="jornada4-secuencia-letras">
        {SECUENCIA_LETRAS.map(letra => {
          const slot = byLetra.get(letra);
          const due = dueLetter === letra;
          const active = activeLetter === letra;
          return (
            <button
              key={letra}
              type="button"
              onClick={() => {
                if (slot) onRecall(letra);
                else onAnchorLetter(letra);
              }}
              title={
                slot
                  ? `${letra} · ${slot.titulo}${slot.hora ? ` · ${slot.hora}` : ""}`
                  : canAnchor
                    ? `Anclar secuencia en ${letra}`
                    : `Vacío · llena unidades para anclar ${letra}`
              }
              className="rounded-lg border py-2 text-center touch-manipulation"
              style={{
                borderColor: due
                  ? GOLD
                  : active
                    ? `${ORANGE}70`
                    : slot
                      ? `${GOLD}45`
                      : "rgba(255,255,255,0.12)",
                backgroundColor: due
                  ? "rgba(212,175,55,0.22)"
                  : active
                    ? "rgba(249,115,22,0.16)"
                    : slot
                      ? "rgba(212,175,55,0.1)"
                      : "rgba(255,255,255,0.02)",
              }}
              data-testid={`jornada4-secuencia-letra-${letra}`}
            >
              <span
                className="block text-[12px] font-black"
                style={{ color: slot || due ? GOLD : MUTED }}
              >
                {letra}
              </span>
              <span
                className="block text-[7px] uppercase truncate px-0.5"
                style={{ color: MUTED }}
              >
                {due ? "ahora" : slot?.hora ?? (slot ? "hábito" : "vacío")}
              </span>
            </button>
          );
        })}
      </div>

      {activeLetter && byLetra.get(activeLetter) ? (
        <p className="text-[10px] truncate" style={{ color: INK }} data-testid="jornada4-secuencia-activa">
          {activeLetter} · {byLetra.get(activeLetter)!.titulo}
          {" · "}
          {byLetra.get(activeLetter)!.filas.length} filas
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <label className="text-[8px] font-black uppercase tracking-wider shrink-0" style={{ color: MUTED }}>
          Horario
        </label>
        <input
          type="time"
          value={hora}
          onChange={e => onHoraChange(e.target.value)}
          className="flex-1 min-w-0 p-1.5 rounded-lg bg-black/50 border text-[11px] font-mono"
          style={{ color: INK, borderColor: "rgba(255,255,255,0.14)" }}
          aria-label="Horario del hábito"
          data-testid="jornada4-secuencia-hora"
        />
        {hora ? (
          <button
            type="button"
            onClick={onClearHora}
            className="text-[8px] uppercase"
            style={{ color: MUTED }}
          >
            Quitar
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canAnchor}
          onClick={() => onAnchorLetter((activeLetter ?? nextVisibleFree(slots)) as SecuenciaLetra)}
          className="shrink-0 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider disabled:opacity-40"
          style={{
            backgroundColor: `${GOLD}22`,
            color: GOLD,
            border: `1px solid ${GOLD}45`,
          }}
          data-testid="jornada4-secuencia-anclar"
        >
          Anclar
        </button>
      </div>

      {overwriteLetter ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border px-2 py-2"
          style={{ borderColor: `${ORANGE}55`, backgroundColor: "rgba(249,115,22,0.1)" }}
          data-testid="jornada4-secuencia-overwrite"
        >
          <p className="text-[9px]" style={{ color: INK }}>
            ¿Reemplazar hábito {overwriteLetter}?
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCancelOverwrite}
              className="text-[8px] uppercase px-2 py-1"
              style={{ color: MUTED }}
            >
              No
            </button>
            <button
              type="button"
              onClick={onConfirmOverwrite}
              className="text-[8px] font-black uppercase px-2 py-1 rounded-md"
              style={{ color: ORANGE, border: `1px solid ${ORANGE}55` }}
              data-testid="jornada4-secuencia-overwrite-si"
            >
              Sí
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[8px] leading-snug" style={{ color: MUTED }}>
          En parálisis: una letra carga las filas. El horario sugiere “ahora”
          ±30 min. Confirma el lanzamiento tú.
        </p>
      )}
    </div>
  );
}

function nextVisibleFree(slots: SecuenciaAnclada[]): SecuenciaLetra {
  const used = new Set(slots.map(s => s.letra));
  return SECUENCIA_LETRAS.find(l => !used.has(l)) ?? "A";
}

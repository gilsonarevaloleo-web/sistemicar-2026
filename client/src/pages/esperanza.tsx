import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { CardLeyOpticaCodigo } from "@/components/deposito/CardLeyOpticaCodigo";
import { DictamenFrente } from "@/components/deposito/DictamenFrente";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import {
  addVolcadoEntry,
  listVolcadosLocal,
  subscribeToVolcados,
  type VolcadoEntry,
} from "@/lib/depositoVolcados";
import {
  analizarVolcado,
  type DictamenOptico,
} from "@shared/deposito/analizarVolcado";
import { LEY_OPTICA_CODIGO_RITUAL } from "@shared/deposito/leyOpticaCodigo";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

export default function Esperanza() {
  const { user } = useAuthContext();
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [dictamen, setDictamen] = useState<DictamenOptico | null>(null);
  const [historial, setHistorial] = useState<VolcadoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const dictamenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setHistorial([]);
      setLoading(false);
      return;
    }
    const unsub = subscribeToVolcados(
      user.uid,
      (data) => {
        setHistorial(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const onLocal = () => {
      setHistorial(listVolcadosLocal(user.uid));
    };
    window.addEventListener("volcados-updated", onLocal);
    return () => {
      unsub();
      window.removeEventListener("volcados-updated", onLocal);
    };
  }, [user]);

  const guardar = async () => {
    const crudo = texto.trim();
    if (!crudo) {
      toast.error("El volcado está vacío.");
      return;
    }
    const d = analizarVolcado(crudo);
    setDictamen(d);
    if (d.calidad === "ruido") {
      toast.message("Todavía es ruido. Reescribí el volcado.");
      return;
    }
    if (!user) {
      toast.error("Entrá para guardar el volcado.");
      requestAnimationFrame(() =>
        dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
      return;
    }
    setSaving(true);
    try {
      await addVolcadoEntry(user.uid, crudo, d);
      setTexto("");
      toast.success("Volcado guardado.");
      requestAnimationFrame(() =>
        dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch {
      toast.error("No se pudo guardar el volcado.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: GOLD, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-8 pb-32" style={{ backgroundColor: "#020202" }}>
      <div className="max-w-xl mx-auto">
        <div className="flex justify-end mb-8">
          <ManualTriggerButton manualType="deposito" />
        </div>

        <header className="mb-10 text-center">
          <p
            className="text-[10px] tracking-[0.28em] mb-3"
            style={{ color: GOLD }}
          >
            UNIVERSIDAD · DEPÓSITO
          </p>
          <h1
            className="text-3xl md:text-4xl font-light tracking-tight text-white"
            data-testid="deposito-ritual"
          >
            {LEY_OPTICA_CODIGO_RITUAL}
          </h1>
          <p className="mt-3 text-sm text-white/45">
            Volcá el día. Crudo. El sistema nombra el ojo.
          </p>
        </header>

        <section
          className="mb-8"
          data-testid="deposito-volcado"
        >
          <label htmlFor="volcado-dia" className="sr-only">
            Volcado de aprendizaje
          </label>
          <textarea
            id="volcado-dia"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Hoy aprendí…"
            rows={8}
            className="w-full resize-y bg-black/50 text-white/90 text-base leading-relaxed p-5 outline-none placeholder:text-white/25"
            style={{ border: `1px solid ${GOLD}33`, minHeight: "180px" }}
            data-testid="deposito-volcado-input"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">
              No elijas eje. No elijas código. Volcá.
            </p>
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="text-[11px] font-bold uppercase tracking-widest px-5 py-3 disabled:opacity-40"
              style={{
                backgroundColor: GOLD,
                color: "#111",
              }}
              data-testid="deposito-guardar"
            >
              {saving ? "Guardando…" : "Guardar volcado"}
            </button>
          </div>
        </section>

        {dictamen && (
          <div ref={dictamenRef} className="mb-10">
            <DictamenFrente dictamen={dictamen} />
          </div>
        )}

        {historial.length > 0 && (
          <section className="mb-12" data-testid="deposito-historial-volcados">
            <p
              className="text-[10px] tracking-[0.22em] mb-4"
              style={{ color: AZURE }}
            >
              VOLCADOS
            </p>
            <ul className="space-y-3">
              {historial.slice(0, 12).map((v) => (
                <li
                  key={v.id}
                  className="border px-4 py-3"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <p className="text-[10px] text-white/40 mb-1">
                    {v.dictamen.calidad === "tecnico"
                      ? `C${v.dictamen.frente} → C${v.dictamen.siguiente} · ${v.dictamen.tema}`
                      : v.dictamen.calidad.toUpperCase()}
                  </p>
                  <p className="text-sm text-white/70 line-clamp-3">{v.texto}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <CardLeyOpticaCodigo />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { CardLeyOpticaCodigo } from "@/components/deposito/CardLeyOpticaCodigo";
import { DictamenFrente } from "@/components/deposito/DictamenFrente";
import { CardLeyCasasUmbral } from "@/components/planetas/CardLeyCasasUmbral";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import {
  addVolcadoEntry,
  listVolcadosLocal,
  subscribeToVolcados,
  type VolcadoEntry,
} from "@/lib/depositoVolcados";
import {
  analizarVolcado,
  ojosConLugarDe,
  type DictamenOptico,
} from "@shared/deposito/analizarVolcado";
import { LEY_OPTICA_CODIGO_RITUAL } from "@shared/deposito/leyOpticaCodigo";
import { PLANETA_DEPOSITO, etiquetaMundo } from "@shared/planetas/leyCasasUmbral";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

function etiquetaVolcado(v: VolcadoEntry): string {
  const d = v.dictamen;
  if (d.calidad === "ruido") return `RUIDO · ${d.tema}`;
  const ojo = d.viendoCon || d.frente;
  if (!ojo) return d.calidad.toUpperCase();
  const p = d.planeta ? ` · P${d.planeta}` : "";
  return `C${ojo} · ${d.tema}${p}`;
}

export default function Esperanza() {
  const { user } = useAuthContext();
  useViewTransitionShield();
  // Soft-start al venir de Dual Kernel: no clavar el hilo con Firestore.
  const motorsQuiet = useDualKernelMotorsQuiet();
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [dictamen, setDictamen] = useState<DictamenOptico | null>(null);
  const [historial, setHistorial] = useState<VolcadoEntry[]>([]);
  const dictamenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setHistorial([]);
      return;
    }
    // Local ya: el recinto no espera a Firebase (spinner = congelado).
    setHistorial(listVolcadosLocal(user.uid));
    if (motorsQuiet) return;
    const unsub = subscribeToVolcados(
      user.uid,
      (data) => {
        setHistorial(data);
      },
      () => {
        setHistorial(listVolcadosLocal(user.uid));
      }
    );
    const onLocal = () => {
      setHistorial(listVolcadosLocal(user.uid));
    };
    window.addEventListener("volcados-updated", onLocal);
    return () => {
      unsub();
      window.removeEventListener("volcados-updated", onLocal);
    };
  }, [user, motorsQuiet]);

  const guardar = async () => {
    const crudo = texto.trim();
    if (!crudo) {
      toast.error("El volcado está vacío.");
      return;
    }
    const d = analizarVolcado(crudo, {
      ojosConLugar: ojosConLugarDe(historial),
    });
    setDictamen(d);
    if (d.calidad === "ruido" && (!user || d.palabras < 18)) {
      toast.message("Todavía es ruido. Reescribí el volcado.");
      requestAnimationFrame(() =>
        dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
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

  return (
    <div
      className="min-h-screen px-4 pt-8 pb-32"
      style={{ backgroundColor: "#020202" }}
      data-testid="deposito-v2-page"
    >
      <div className="max-w-xl mx-auto">
        <div className="flex justify-end mb-8">
          <ManualTriggerButton manualType="deposito" />
        </div>

        <header className="mb-10 text-center">
          <p
            className="text-[10px] tracking-[0.28em] mb-3"
            style={{ color: GOLD }}
            data-testid="deposito-v2-badge"
          >
            UNIVERSIDAD · DEPÓSITO V2
          </p>
          <p
            className="text-[10px] tracking-[0.22em] mb-3 text-white/40"
            data-testid="deposito-planeta"
          >
            {etiquetaMundo(PLANETA_DEPOSITO).toUpperCase()}
          </p>
          <h1
            className="text-3xl md:text-4xl font-light tracking-tight text-white"
            data-testid="deposito-ritual"
          >
            {LEY_OPTICA_CODIGO_RITUAL}
          </h1>
          <p className="mt-3 text-sm text-white/45">
            El más alto es la posición. Lo que no se menciona puede ser orden de planeta.
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
                    {etiquetaVolcado(v)}
                  </p>
                  <p className="text-sm text-white/70 line-clamp-3">{v.texto}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <CardLeyCasasUmbral planetaActivo={PLANETA_DEPOSITO} />
        <CardLeyOpticaCodigo />
      </div>
    </div>
  );
}

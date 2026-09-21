import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/App";
import { CardLeyOpticaCodigo } from "@/components/deposito/CardLeyOpticaCodigo";
import { DiagnosticoUniversidad } from "@/components/deposito/DiagnosticoUniversidad";
import { DictamenFrente } from "@/components/deposito/DictamenFrente";
import {
  FormularioVolcadoExpansivo,
  type FormularioVolcadoHandle,
} from "@/components/deposito/FormularioVolcadoExpansivo";
import { CardLeyCasasUmbral } from "@/components/planetas/CardLeyCasasUmbral";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { procesarVolcadoRemoto } from "@/lib/deposito/api";
import { leerGradoMaestria } from "@/lib/depositoPerfil";
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
import {
  DICCIONARIO_GRADOS,
  GRADO_MAESTRIA_INICIAL,
  diagnosticarVolcadoLocal,
  evaluarRitualPasoGrado,
  isGradoMaestria,
  normalizarCapturaVolcado,
  validarCapturaParaGrado,
  type CapturaVolcadoExpansiva,
  type DiagnosticoVolcado,
  type GradoMaestria,
} from "@shared/deposito/engineConfig";
import {
  calcularExpedienteOjos,
  calcularGradoVolcado,
  type CodigoObservador,
} from "@shared/deposito/grados";
import { LEY_OPTICA_CODIGO_RITUAL } from "@shared/deposito/leyOpticaCodigo";
import { PLANETA_DEPOSITO, etiquetaMundo } from "@shared/planetas/leyCasasUmbral";

const GOLD = "#D4AF37";
const AZURE = "#1E90FF";

function capturaVacia(grado: GradoMaestria): CapturaVolcadoExpansiva {
  return normalizarCapturaVolcado({ gradoMaestria: grado, volcadoCrudo: "" });
}

export default function Esperanza() {
  const { user } = useAuthContext();
  useViewTransitionShield();
  // Soft-start al venir de Dual Kernel: no clavar el hilo con Firestore.
  const motorsQuiet = useDualKernelMotorsQuiet();
  const [grado, setGrado] = useState<GradoMaestria>(GRADO_MAESTRIA_INICIAL);
  const [formKey, setFormKey] = useState(0);
  const [anexoReady, setAnexoReady] = useState(false);
  const formRef = useRef<FormularioVolcadoHandle>(null);
  const [saving, setSaving] = useState(false);
  const [dictamen, setDictamen] = useState<DictamenOptico | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoVolcado | null>(null);
  const [ultimoVolcado, setUltimoVolcado] = useState("");
  const [historial, setHistorial] = useState<VolcadoEntry[]>([]);
  const dictamenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const desdeQuery = Number(params.get("grado"));
    // ?grado=2|3|4 inspecciona la captura expansiva sin persistir (el ritual aún no asciende).
    const activo = isGradoMaestria(desdeQuery)
      ? desdeQuery
      : leerGradoMaestria(user?.uid);
    setGrado(activo);
  }, [user]);

  useEffect(() => {
    const arm = () => setAnexoReady(true);
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(arm, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(arm, 400);
    return () => window.clearTimeout(t);
  }, []);

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

  const ritualPaso = useMemo(
    () =>
      evaluarRitualPasoGrado(
        historial.map((v) => ({
          texto: v.texto,
          captura: v.captura,
          diagnostico: v.diagnostico,
          createdAt: v.createdAt,
        })),
        { gradoActual: grado },
      ),
    [historial, grado],
  );

  const guardar = async () => {
    const lista =
      formRef.current?.getCaptura() ?? capturaVacia(grado);
    const error = validarCapturaParaGrado(lista, grado);
    if (error) {
      if (error.startsWith("volcadoCrudo")) {
        toast.error("El volcado está vacío.");
      } else if (error.includes("friccionDetectada")) {
        toast.error("En Grado 2+ el filtro de flor/excusa es obligatorio.");
      } else if (error.includes("sombraOmision")) {
        toast.error("En Grado 3+ tenés que nombrar lo que NO dijiste.");
      } else if (error.includes("codigoHipotesis")) {
        toast.error("En Grado 4 diagnosticá tu ojo antes de enviar.");
      } else {
        toast.error(error);
      }
      return;
    }
    const crudo = lista.volcadoCrudo;
    const d = analizarVolcado(crudo);
    setDictamen(d);
    setUltimoVolcado(crudo);
    const localDiag = diagnosticarVolcadoLocal(crudo, lista);
    setDiagnostico(localDiag);
    requestAnimationFrame(() =>
      dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );

    setSaving(true);
    let diag: DiagnosticoVolcado = localDiag;
    try {
      const remoto = await procesarVolcadoRemoto(crudo, lista);
      diag = remoto.diagnostico;
      setDiagnostico(diag);
    } catch {
      diag = localDiag;
    }

    if (!user) {
      toast.error("Entrá para guardar el volcado.");
      setSaving(false);
      requestAnimationFrame(() =>
        dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
      return;
    }
    try {
      await addVolcadoEntry(user.uid, crudo, d, diag, lista);
      setFormKey((k) => k + 1);
      toast.success(
        d.calidad === "ruido"
          ? "Ruido guardado. El no-dicho ya es el ojo."
          : "Volcado guardado.",
      );
      requestAnimationFrame(() =>
        dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch {
      toast.error("No se pudo guardar el volcado.");
    } finally {
      setSaving(false);
    }
  };

  const ficha = DICCIONARIO_GRADOS[grado];
  const lectura = useMemo(
    () =>
      diagnostico && ultimoVolcado
        ? calcularGradoVolcado(ultimoVolcado, diagnostico)
        : undefined,
    [diagnostico, ultimoVolcado],
  );
  const expediente = useMemo(() => {
    const dominantes: CodigoObservador[] = historial
      .map((v) => v.diagnostico?.codigoDominante)
      .filter((n): n is CodigoObservador => typeof n === "number");
    if (diagnostico) dominantes.unshift(diagnostico.codigoDominante);
    const lecturas = historial
      .filter((v) => v.texto)
      .slice(0, 20)
      .map((v) => calcularGradoVolcado(v.texto, v.diagnostico));
    if (diagnostico && ultimoVolcado) {
      lecturas.unshift(calcularGradoVolcado(ultimoVolcado, diagnostico));
    }
    return calcularExpedienteOjos(dominantes, lecturas);
  }, [historial, diagnostico, ultimoVolcado]);

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
            Volcá el día. Crudo. El ruido también es ojo. El Muro nombra uno.
          </p>
          <p
            className="mt-2 text-[10px] tracking-[0.22em]"
            style={{ color: GOLD }}
            data-testid="deposito-grado-activo"
          >
            {ficha.titulo}
          </p>
        </header>

        <section
          className="mb-8"
          data-testid="deposito-volcado"
        >
          <FormularioVolcadoExpansivo
            key={formKey}
            ref={formRef}
            gradoMaestria={grado}
            captura={capturaVacia(grado)}
            disabled={saving}
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">
              {grado === 1
                ? "No elijas eje. No elijas código. Volcá."
                : "Filtro activo. La captura se expande; la ruta no."}
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
              {saving ? "Leyendo el volcado…" : "Guardar volcado"}
            </button>
          </div>
          {ritualPaso.volcadosEvaluados >= 3 && (
            <p
              className="mt-3 text-[10px] leading-relaxed text-white/35"
              data-testid="deposito-ritual-paso"
            >
              Ritual de Paso · G{ritualPaso.gradoActual}
              {ritualPaso.gradoSiguiente ? ` → G${ritualPaso.gradoSiguiente}` : ""}
              : {ritualPaso.motivo}
            </p>
          )}
        </section>

        {(diagnostico || dictamen) && (
          <div ref={dictamenRef} className="mb-10 space-y-4">
            {diagnostico && (
              <DiagnosticoUniversidad
                diagnostico={diagnostico}
                lectura={lectura}
                expediente={expediente}
              />
            )}
            {dictamen && <DictamenFrente dictamen={dictamen} />}
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
                    {v.diagnostico
                      ? `C${v.diagnostico.codigoDominante} ${v.diagnostico.nombreOjoDominante}`
                      : v.dictamen.calidad === "tecnico"
                        ? `C${v.dictamen.frente} → C${v.dictamen.siguiente} · ${v.dictamen.tema}`
                        : v.dictamen.calidad.toUpperCase()}
                    {v.gradoMaestria ? ` · G${v.gradoMaestria}` : ""}
                  </p>
                  <p className="text-sm text-white/70 line-clamp-3">{v.texto}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {anexoReady && (
          <>
            <CardLeyCasasUmbral planetaActivo={PLANETA_DEPOSITO} />
            <CardLeyOpticaCodigo />
          </>
        )}
      </div>
    </div>
  );
}

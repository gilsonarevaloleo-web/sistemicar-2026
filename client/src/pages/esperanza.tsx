import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Archive, Eye, PenLine } from "lucide-react";
import { useAuthContext } from "@/App";
import { PaywallUniversidad } from "@/components/deposito/PaywallUniversidad";
import { BannerMeritoDetectado } from "@/components/deposito/BannerMeritoDetectado";
import { useDepositoEntitlements } from "@/hooks/useDepositoEntitlements";
import { CardAxiomasMetacognicion } from "@/components/deposito/CardAxiomasMetacognicion";
import { CardCriterioVivo } from "@/components/deposito/CardCriterioVivo";
import { CardLeyOpticaCodigo } from "@/components/deposito/CardLeyOpticaCodigo";
import { DiagnosticoUniversidad } from "@/components/deposito/DiagnosticoUniversidad";
import { DictamenFrente } from "@/components/deposito/DictamenFrente";
import { SelloCriterio } from "@/components/deposito/SelloCriterio";
import {
  FormularioVolcadoExpansivo,
  type FormularioVolcadoHandle,
} from "@/components/deposito/FormularioVolcadoExpansivo";
import { MapaCalorOjos } from "@/components/deposito/MapaCalorOjos";
import { DepositoShell } from "@/components/deposito/DepositoShell";
import { DepositoMobileNav } from "@/components/deposito/DepositoMobileNav";
import { DepositoSectionLabel } from "@/components/deposito/DepositoSectionLabel";
import { DEPOSITO_COLORS } from "@/lib/depositoBrand";
import { depositoV2TabMeta, type DepositoV2Tab } from "@/deposito/v2Tabs";
import {
  diagnosticoPromueve,
  errorGuardadoVolcado,
  planGuardadoVolcado,
} from "@/lib/deposito/flujoVolcado";
import { CardLeyCasasUmbral } from "@/components/planetas/CardLeyCasasUmbral";
import { ManualTriggerButton } from "@/components/master-manual-drawer";
import { useViewTransitionShield } from "@/hooks/useViewTransitionShield";
import { useDualKernelMotorsQuiet } from "@/lib/dualKernelQuiet";
import { procesarVolcadoRemoto } from "@/lib/deposito/api";
import { leerMetricasJornadaLocal } from "@/lib/jornadaMetricasDeposito";
import {
  leerCriteriosVivos,
  sellarCriterioLocal,
  guardarCriteriosVivos,
} from "@/lib/depositoCriterios";
import {
  absorberHallazgoLocal,
  guardarMetacognicion,
  leerMetacognicion,
} from "@/lib/depositoMetacognicion";
import { guardarGradoMaestria, leerGradoMaestria } from "@/lib/depositoPerfil";
import {
  addVolcadoEntry,
  listVolcadosLocal,
  subscribeToVolcados,
  type VolcadoEntry,
} from "@/lib/depositoVolcados";
import {
  analizarVolcado,
  coherenciaDictamenConPlacement,
  type DictamenOptico,
} from "@shared/deposito/analizarVolcado";
import {
  SKU_CARRERA,
  SKU_MATRICULA,
  SKU_TITULO,
  requierePagoMatricula,
} from "@shared/depositoPricing";
import {
  DICCIONARIO_GRADOS,
  GRADO_MAESTRIA_INICIAL,
  diagnosticarVolcadoLocal,
  evaluarRitualPasoGrado,
  motivoRitualPasoVisible,
  progresoRitualPaso,
  isGradoMaestria,
  marcarUsoCriterios,
  normalizarCapturaVolcado,
  type CapturaVolcadoExpansiva,
  type CriterioVivo,
  type DiagnosticoVolcado,
  type GradoMaestria,
  type UserMetacognitionStore,
} from "@shared/deposito/engineConfig";
import {
  calcularExpedienteOjos,
  calcularGradoVolcado,
  type CodigoObservador,
} from "@shared/deposito/grados";
import { LEY_OPTICA_CODIGO_RITUAL } from "@shared/deposito/leyOpticaCodigo";
import { PLANETA_DEPOSITO, etiquetaMundo } from "@shared/planetas/leyCasasUmbral";

const GOLD = DEPOSITO_COLORS.GOLD;
const AZURE = DEPOSITO_COLORS.AZURE;

const V2_NAV = [
  { id: "volcar" as const, label: "Volcar", short: "Volcar", icon: PenLine },
  { id: "lectura" as const, label: "Lectura", short: "Lectura", icon: Eye },
  { id: "casa" as const, label: "Casa", short: "Casa", icon: Archive },
];

function capturaVacia(grado: GradoMaestria): CapturaVolcadoExpansiva {
  return normalizarCapturaVolcado({ gradoMaestria: grado, volcadoCrudo: "" });
}

export default function Esperanza() {
  const { user } = useAuthContext();
  const entitlements = useDepositoEntitlements();
  useViewTransitionShield();
  // Soft-start al venir de Dual Kernel: no clavar el hilo con Firestore.
  const motorsQuiet = useDualKernelMotorsQuiet();
  const [grado, setGrado] = useState<GradoMaestria>(GRADO_MAESTRIA_INICIAL);
  const [formKey, setFormKey] = useState(0);
  const [anexoReady, setAnexoReady] = useState(false);
  const formRef = useRef<FormularioVolcadoHandle>(null);
  const gradoDesdeQueryRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [dictamen, setDictamen] = useState<DictamenOptico | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoVolcado | null>(null);
  const [ultimoVolcado, setUltimoVolcado] = useState("");
  const [historial, setHistorial] = useState<VolcadoEntry[]>([]);
  const [meritoOverlay, setMeritoOverlay] = useState<GradoMaestria | null>(null);
  const [paywallSku, setPaywallSku] = useState<
    typeof SKU_MATRICULA | typeof SKU_CARRERA | typeof SKU_TITULO | null
  >(null);
  const [acervo, setAcervo] = useState<CriterioVivo[]>([]);
  const [metacognicion, setMetacognicion] = useState<UserMetacognitionStore>({
    axiomas: [],
  });
  const [tab, setTab] = useState<DepositoV2Tab>("volcar");
  const dictamenRef = useRef<HTMLDivElement>(null);
  const gradoRef = useRef<GradoMaestria>(grado);
  const acervoRef = useRef<CriterioVivo[]>([]);
  const metacognicionRef = useRef<UserMetacognitionStore>({ axiomas: [] });
  const usosMarcadosRef = useRef("");
  gradoRef.current = grado;
  acervoRef.current = acervo;
  metacognicionRef.current = metacognicion;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const desdeQuery = Number(params.get("grado"));
    // ?grado=2|3|4 inspecciona la captura expansiva sin persistir (el ritual aún no asciende).
    const activo = isGradoMaestria(desdeQuery)
      ? desdeQuery
      : leerGradoMaestria(user?.uid);
    gradoDesdeQueryRef.current = isGradoMaestria(desdeQuery);
    setGrado(activo);
    setAcervo(leerCriteriosVivos(user?.uid ?? "anon"));
    setMetacognicion(leerMetacognicion(user?.uid ?? "anon"));
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

  const aplicarDiagnostico = (diag: DiagnosticoVolcado, volcado = "") => {
    const uid = user?.uid ?? "anon";
    const hallazgo = absorberHallazgoLocal(
      uid,
      diag,
      volcado || ultimoVolcado,
    );
    metacognicionRef.current = hallazgo.store;
    setMetacognicion(hallazgo.store);
    setDiagnostico(hallazgo.diagnostico);
    const aplicados = hallazgo.diagnostico.criterioAplicado ?? [];
    const firmaUsos = aplicados
      .map((c) => c.id)
      .sort()
      .join(",");
    if (aplicados.length > 0 && usosMarcadosRef.current !== firmaUsos) {
      usosMarcadosRef.current = firmaUsos;
      const usado = marcarUsoCriterios(
        acervoRef.current,
        aplicados.map((c) => c.id),
      );
      acervoRef.current = usado;
      setAcervo(usado);
      guardarCriteriosVivos(uid, usado);
    }
    const promovido = diagnosticoPromueve(
      hallazgo.diagnostico,
      gradoRef.current,
      gradoDesdeQueryRef.current,
    );
    if (!promovido) return;
    if (promovido > entitlements.gradoMaximo) {
      setPaywallSku(promovido >= 4 ? SKU_TITULO : SKU_CARRERA);
      return;
    }
    gradoRef.current = promovido;
    setGrado(promovido);
    guardarGradoMaestria(user?.uid ?? "anon", promovido);
    setMeritoOverlay(promovido);
  };

  const guardar = async () => {
    if (
      entitlements.ready &&
      requierePagoMatricula(historial.length, entitlements.hasMatricula)
    ) {
      setPaywallSku(SKU_MATRICULA);
      toast.error("La prueba ya se usó. Activa Matrícula para seguir volcando.");
      return;
    }
    const gradoActivo = Math.min(
      gradoRef.current,
      entitlements.ready ? entitlements.gradoMaximo : gradoRef.current,
    ) as GradoMaestria;
    const plan = planGuardadoVolcado(gradoActivo);
    const lista =
      formRef.current?.getCaptura() ?? capturaVacia(gradoActivo);
    const error = errorGuardadoVolcado(lista, gradoActivo);
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
    const ojosHistoricos = historial
      .map((v) => v.diagnostico?.codigoDominante)
      .filter((n): n is CodigoObservador => typeof n === "number");
    const metricasJornada = leerMetricasJornadaLocal();
    const localDiag = diagnosticarVolcadoLocal(
      crudo,
      lista,
      ojosHistoricos,
      metricasJornada,
      acervoRef.current,
      metacognicionRef.current,
    );
    const dictamenCoherente = coherenciaDictamenConPlacement(d, {
      gradoDetectado: localDiag.evaluacionGrado?.gradoDetectado,
      densidadEstructural: localDiag.metricasMerito?.densidadEstructural,
      mensajeEncuadre: localDiag.evaluacionGrado?.mensajeEncuadre,
    });

    setDictamen(dictamenCoherente);
    setUltimoVolcado(crudo);
    usosMarcadosRef.current = "";
    aplicarDiagnostico(localDiag, crudo);
    requestAnimationFrame(() =>
      dictamenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

    const uid = user?.uid ?? "anon";
    if (plan.exigirSesion && !user) {
      toast.error("Entrá para guardar el volcado.");
      return;
    }

    const persistir = addVolcadoEntry(uid, crudo, dictamenCoherente, localDiag, lista, {
      waitForRemote: plan.esperarFirebase,
    });
    setFormKey((k) => k + 1);
    setTab("lectura");
    toast.success(
      localDiag.evaluacionGrado?.meritoReconocido
        ? "Volcado guardado."
        : dictamenCoherente.calidad === "ruido"
          ? "Ruido guardado. El no-dicho ya es el ojo."
          : "Volcado guardado.",
    );

    const hidratarRemoto = async () => {
      try {
        const remoto = await procesarVolcadoRemoto(crudo, lista, {
          ojosHistoricos,
          metricasJornada,
          criteriosVivos: acervoRef.current,
          metacognicion: metacognicionRef.current,
        });
        if (remoto.metacognicion) {
          metacognicionRef.current = remoto.metacognicion;
          setMetacognicion(remoto.metacognicion);
          guardarMetacognicion(uid, remoto.metacognicion);
        }
        aplicarDiagnostico(remoto.diagnostico, crudo);
        setDictamen((prev) =>
          prev
            ? coherenciaDictamenConPlacement(prev, {
                gradoDetectado: remoto.diagnostico.evaluacionGrado?.gradoDetectado,
                densidadEstructural:
                  remoto.diagnostico.metricasMerito?.densidadEstructural,
                mensajeEncuadre:
                  remoto.diagnostico.evaluacionGrado?.mensajeEncuadre,
              })
            : prev,
        );
      } catch {
        /* G1 ya tiene feedback local. G2+ también conserva el diagnóstico local. */
      }
    };

    if (!plan.bloquearUi) {
      void persistir.catch(() => {
        /* El volcado ya está en localStorage. */
      });
      void hidratarRemoto();
      return;
    }

    setSaving(true);
    try {
      await persistir;
      await hidratarRemoto();
    } catch {
      toast.error("No se pudo guardar el volcado.");
    } finally {
      setSaving(false);
    }
  };

  const gradoEfectivo = (
    entitlements.ready
      ? Math.min(grado, entitlements.gradoMaximo)
      : grado
  ) as GradoMaestria;
  const ficha = DICCIONARIO_GRADOS[gradoEfectivo];
  const trialDisponible =
    entitlements.ready &&
    !entitlements.hasMatricula &&
    historial.length === 0;
  const formBloqueado =
    entitlements.ready &&
    requierePagoMatricula(
      historial.length,
      entitlements.hasMatricula,
    );
  const mostrarTitulo = entitlements.hasTitulo;
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
  const mostrarMapa =
    (entitlements.hasCarrera || entitlements.hasTitulo) &&
    expediente.rango > 0;
  const zona = depositoV2TabMeta(tab);

  return (
    <div
      className="min-h-screen pb-32"
      style={{ backgroundColor: DEPOSITO_COLORS.PIZARRA }}
      data-testid="deposito-v2-page"
    >
      <DepositoShell
        edition="v2"
        volcados={historial.length}
        statusLine={`${ficha.titulo} · ${LEY_OPTICA_CODIGO_RITUAL}`}
        endSlot={<ManualTriggerButton manualType="deposito" />}
      />
      <DepositoMobileNav
        value={tab}
        onChange={setTab}
        tabs={V2_NAV}
        ariaLabel="Secciones Depósito V2"
        testId="deposito-v2-mobile-nav"
      />

      <div className="mx-auto max-w-xl px-4 pt-2">
        <p className="sr-only" data-testid="deposito-v2-badge">
          UNIVERSIDAD · DEPÓSITO V2
        </p>
        <p className="sr-only" data-testid="deposito-planeta">
          {etiquetaMundo(PLANETA_DEPOSITO).toUpperCase()}
        </p>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p
            className="text-[11px] font-light tracking-tight text-white/80"
            data-testid="deposito-ritual"
          >
            {LEY_OPTICA_CODIGO_RITUAL}
          </p>
          <p
            className="text-[10px] tracking-[0.18em]"
            style={{ color: GOLD }}
            data-testid="deposito-grado-activo"
          >
            {ficha.titulo}
          </p>
        </div>
        <Link
          href="/esperanza"
          className="mb-3 inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
          data-testid="deposito-v2-ir-v3"
        >
          Ir a Depósito V3
        </Link>

        <DepositoSectionLabel
          step={zona.step}
          title={zona.title}
          hint={zona.hint}
          testId={`deposito-v2-zona-${tab}`}
        />

        <div
          className={tab === "volcar" ? "" : "hidden"}
          role="tabpanel"
          data-testid="deposito-v2-panel-volcar"
        >
          {trialDisponible && (
            <p
              className="mb-6 border border-[#F97316]/25 bg-[#F97316]/08 px-3 py-2 text-[11px] text-[#F97316]/90"
              data-testid="deposito-trial-banner"
            >
              PRUEBA · 1 volcado G1 gratis · Matrícula ${SKU_MATRICULA.priceUsd}/mes
              para seguir
            </p>
          )}

          {formBloqueado ? (
            <div className="mb-8">
              <PaywallUniversidad
                sku={SKU_MATRICULA}
                motivo="La clase de prueba ya se usó. Matrícula para seguir volcando."
              />
            </div>
          ) : (
          <>
          {paywallSku && paywallSku.id !== "deposito_matricula" ? (
            <div className="mb-6">
              <PaywallUniversidad
                sku={paywallSku}
                motivo={
                  paywallSku.id === "deposito_carrera"
                    ? "El mérito pide Carrera: filtro de flor y lo no dicho."
                    : "El título sella tu criterio y rota los 10 lentes."
                }
                onVolverTrial={() => setPaywallSku(null)}
              />
            </div>
          ) : null}
          <section
            className="mb-8"
            data-testid="deposito-volcado"
          >
            <FormularioVolcadoExpansivo
              key={formKey}
              ref={formRef}
              gradoMaestria={gradoEfectivo}
              captura={capturaVacia(gradoEfectivo)}
              disabled={saving && gradoEfectivo !== 1}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                {gradoEfectivo === 1
                  ? "No elijas eje. No elijas código. Volcá."
                  : "Filtro activo. La captura se expande; la ruta no."}
              </p>
              <button
                type="button"
                onClick={guardar}
                disabled={saving && gradoEfectivo !== 1}
                className="text-[11px] font-bold uppercase tracking-widest px-5 py-3 disabled:opacity-40"
                style={{
                  backgroundColor: GOLD,
                  color: "#111",
                }}
                data-testid="deposito-guardar"
              >
                {saving && gradoEfectivo !== 1 ? "Leyendo el volcado…" : "Guardar volcado"}
              </button>
            </div>
            {(entitlements.hasCarrera || entitlements.hasTitulo) &&
              gradoEfectivo < 4 &&
              ritualPaso.volcadosEvaluados > 0 && (
              <div className="mt-3" data-testid="deposito-ritual-paso">
                {motivoRitualPasoVisible(ritualPaso) ? (
                  <p className="text-[10px] leading-relaxed text-white/35">
                    Ritual de Paso · G{ritualPaso.gradoActual}
                    {ritualPaso.gradoSiguiente
                      ? ` → G${ritualPaso.gradoSiguiente}`
                      : ""}
                  </p>
                ) : null}
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-white/10"
                  data-testid="deposito-ritual-progreso"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progresoRitualPaso(ritualPaso) * 100)}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(progresoRitualPaso(ritualPaso) * 100)}%`,
                      backgroundColor: GOLD,
                    }}
                  />
                </div>
              </div>
            )}
          </section>
          </>
          )}
        </div>

        <div
          className={tab === "lectura" ? "" : "hidden"}
          role="tabpanel"
          data-testid="deposito-v2-panel-lectura"
        >
          {(diagnostico || dictamen) ? (
            <div ref={dictamenRef} className="mb-10 space-y-4">
              {diagnostico && (
                <DiagnosticoUniversidad
                  diagnostico={diagnostico}
                  lectura={lectura}
                  expediente={expediente}
                />
              )}
              {dictamen && <DictamenFrente dictamen={dictamen} />}
              {diagnostico && ultimoVolcado && mostrarTitulo && (
                <SelloCriterio
                  volcadoCrudo={ultimoVolcado}
                  codigoMotor={diagnostico.codigoDominante}
                  onSellar={(sabiduria) => {
                    const uid = user?.uid ?? "anon";
                    const siguiente = sellarCriterioLocal(uid, {
                      codigo: diagnostico.codigoDominante,
                      origen: "sello",
                      sabiduria,
                      volcadoCrudo: ultimoVolcado,
                      codigoMotor: diagnostico.codigoDominante,
                    });
                    acervoRef.current = siguiente;
                    setAcervo(siguiente);
                    toast.success("El Maestro guardó tu criterio.");
                  }}
                  onCorregir={(codigo, sabiduria) => {
                    const uid = user?.uid ?? "anon";
                    const siguiente = sellarCriterioLocal(uid, {
                      codigo,
                      origen: "correccion",
                      sabiduria,
                      volcadoCrudo: ultimoVolcado,
                      codigoMotor: diagnostico.codigoDominante,
                    });
                    acervoRef.current = siguiente;
                    setAcervo(siguiente);
                    toast.success("El Maestro corrigió el ojo con tu sabiduría.");
                  }}
                />
              )}
              {diagnostico && ultimoVolcado && !mostrarTitulo && entitlements.hasMatricula && (
                <PaywallUniversidad
                  sku={SKU_TITULO}
                  motivo="El Título sella tu criterio. El Maestro deja de inventar: cita lo que vos sellaste."
                />
              )}
            </div>
          ) : (
            <p className="mb-10 text-sm text-white/40" data-testid="deposito-v2-lectura-vacia">
              Volcá primero. El muro aparece después del guardado.
            </p>
          )}
        </div>

        <div
          className={tab === "casa" ? "space-y-6" : "hidden"}
          role="tabpanel"
          data-testid="deposito-v2-panel-casa"
        >
          {mostrarMapa && (
            <MapaCalorOjos
              expediente={expediente}
              compact
              testId="deposito-header-mapa-calor"
            />
          )}
          {historial.length > 0 && (
            <section className="mb-6" data-testid="deposito-historial-volcados">
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
              {mostrarTitulo ? (
                <>
                  <CardAxiomasMetacognicion store={metacognicion} />
                  <CardCriterioVivo acervo={acervo} />
                </>
              ) : null}
              <CardLeyOpticaCodigo />
            </>
          )}
        </div>
      </div>
      {meritoOverlay && (
        <BannerMeritoDetectado
          grado={meritoOverlay}
          onCerrar={() => setMeritoOverlay(null)}
        />
      )}
    </div>
  );
}

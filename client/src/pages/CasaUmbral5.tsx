import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DoorOpen } from "lucide-react";
import { useAuthContext } from "@/App";
import { isOwner } from "@/lib/owner";
import { etiquetaSaldoCreditos, SALDO_ILIMITADO } from "@shared/ownerCredits";
import {
  LienzoLimite,
  UMBRAL5_ASH,
  UMBRAL5_BRONZE,
} from "@/components/casas/umbral5/LienzoLimite";
import { PanelMapa } from "@/components/casas/umbral5/PanelMapa";
import { HistorialLimite } from "@/components/casas/umbral5/HistorialLimite";
import { BannerMapaOpcional } from "@/components/casas/umbral5/BannerMapaOpcional";
import { BannerGimnasio } from "@/components/casas/umbral5/BannerGimnasio";
import { BifurcacionPractica } from "@/components/casas/umbral5/BifurcacionPractica";
import { ConsolaGimnasio } from "@/components/casas/gimnasio6/ConsolaGimnasio";
import { HistorialLibros } from "@/components/casas/gimnasio6/HistorialLibros";
import { FarmaciaGimnasio } from "@/components/casas/gimnasio6/FarmaciaGimnasio";
import { copiarTexto } from "@/lib/casas/codigo4/copiar";
import { ModalSaldoInsuficiente } from "@/components/casas/umbral5/ModalSaldoInsuficiente";
import {
  Umbral5SaldoError,
  leerMapa,
  leerSaldoUmbral5,
  listarSesionesUmbral5,
  sellarVolcado,
} from "@/lib/casas/umbral5/api";
import {
  abrirGimnasio,
  continuarGimnasio,
  leerLibroGimnasio,
  listarLibrosGimnasio,
  responderGimnasio,
} from "@/lib/casas/gimnasio6/api";
import { unlockCuartoAudio } from "@/lib/casas/gimnasio6/cuartoAudio";
import {
  esLibroContinuable,
  ordenarLibrosPorCreacion,
  pildoraDe,
  pildoraEnCurso,
  preguntaVivaDe,
  textoCopiaLibro,
  type LibroGimnasio,
  type PreguntaViva,
} from "@shared/casas/gimnasio6";
import {
  fusionarSesionesUmbral5Local,
  guardarBorradorUmbral5,
  guardarSesionUmbral5Local,
  leerBorradorUmbral5,
  limpiarBorradorUmbral5,
  listarSesionesUmbral5Local,
} from "@/lib/casas/umbral5/sesionesLocal";
import {
  fusionarLibrosGimnasioLocal,
  guardarLibroGimnasioLocal,
  libroAbiertoLocal,
  listarLibrosGimnasioLocal,
} from "@/lib/casas/gimnasio6/librosLocal";
import {
  guardarSaldoUmbral5Local,
  leerSaldoUmbral5Local,
} from "@/lib/casas/umbral5/saldoLocal";
import {
  CASA_UMBRAL5_FIRMA,
  CASA_UMBRAL5_NOMBRE,
  CASA_UMBRAL5_RITUAL,
  CREDITO_LECTURA_MAPA,
  diagnosticarUmbral5Local,
  hayPesoParaGimnasio,
  ordenarVolcadosPorCreacion,
} from "@shared/casas/umbral5";
import type { SesionUmbral5, Umbral5Lectura } from "@shared/casas/umbral5";

export default function CasaUmbral5() {
  const { user } = useAuthContext();
  const [, navigate] = useLocation();
  const userId = user?.uid ?? "";
  const email = user?.email ?? "";
  const dueno = isOwner(email);

  const [texto, setTexto] = useState("");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [lectura, setLectura] = useState<Umbral5Lectura | null>(null);
  const [sesiones, setSesiones] = useState<SesionUmbral5[]>([]);
  const tocadoRef = useRef(false);
  const [sellando, setSellando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal402, setModal402] = useState<string | null>(null);
  const [libro, setLibro] = useState<LibroGimnasio | null>(null);
  const [libroContinuable, setLibroContinuable] = useState<LibroGimnasio | null>(
    null,
  );
  const [modo, setModo] = useState<"puerta" | "gimnasio">("puerta");
  const [nuevoDiagnostico, setNuevoDiagnostico] = useState(false);
  const [preguntaGym, setPreguntaGym] = useState<PreguntaViva | null>(null);
  const [copiaGym, setCopiaGym] = useState("");
  const [topeDiario, setTopeDiario] = useState(false);
  const [libros, setLibros] = useState<LibroGimnasio[]>([]);
  const [abriendoGym, setAbriendoGym] = useState(false);
  const [enviandoGym, setEnviandoGym] = useState(false);
  const [verFarmacia, setVerFarmacia] = useState(false);
  const [eligiendoPildora, setEligiendoPildora] = useState<number | null>(null);

  const aplicarSesion = (sesion: SesionUmbral5) => {
    setSesionId(sesion.id);
    setLectura(sesion.lectura);
  };

  useEffect(() => {
    if (!userId) return;
    const saldoCache = dueno ? null : leerSaldoUmbral5Local(userId);
    if (dueno) {
      setSaldo(SALDO_ILIMITADO);
    } else if (saldoCache != null) {
      setSaldo(saldoCache);
    }
    void leerSaldoUmbral5(userId, email)
      .then((r) => {
        if (r.ilimitado || dueno) {
          setSaldo(SALDO_ILIMITADO);
          return;
        }
        if (r.saldo === 0 && saldoCache != null && saldoCache > 0) {
          /* cold start vacío: no pisar el último saldo conocido */
          return;
        }
        setSaldo(r.saldo);
        guardarSaldoUmbral5Local(userId, r.saldo);
      })
      .catch(() => {
        /* se queda el último saldo conocido; no volver a 0 */
      });
  }, [userId, email, dueno]);

  useEffect(() => {
    if (!userId) return;
    const locales = listarSesionesUmbral5Local(userId);
    setSesiones(locales);
    const draft = leerBorradorUmbral5();
    if (draft) setTexto(draft);

    void listarSesionesUmbral5(userId)
      .then((r) => {
        const merged = fusionarSesionesUmbral5Local(userId, r.sesiones);
        setSesiones(merged);
      })
      .catch(() => {
        /* el caché local ya está */
      });

    const librosLocales = listarLibrosGimnasioLocal(userId);
    if (librosLocales.length) setLibros(librosLocales);
    const abierto = libroAbiertoLocal(userId);
    if (abierto) {
      setLibroContinuable(abierto);
    }

    void listarLibrosGimnasio(userId)
      .then((r) => {
        const merged = fusionarLibrosGimnasioLocal(userId, r.libros);
        setLibros(merged);
        const vivo = merged.find(esLibroContinuable) ?? null;
        if (vivo) setLibroContinuable(vivo);
      })
      .catch(() => {
        /* el caché local ya está */
      });
  }, [userId]);

  const onTexto = (value: string) => {
    setTexto(value);
    tocadoRef.current = true;
    guardarBorradorUmbral5(value);
  };

  const abrir402 = (err: unknown) => {
    if (err instanceof Umbral5SaldoError) {
      setModal402(err.message);
      if (err.saldo != null && !dueno) {
        setSaldo(err.saldo);
        guardarSaldoUmbral5Local(userId, err.saldo);
      }
      return true;
    }
    return false;
  };

  const sellar = async () => {
    if (!userId) return;
    setError(null);
    setSellando(true);
    try {
      const out = await sellarVolcado({
        userId,
        email,
        limiteConocido: texto,
      });
      const ahora = new Date().toISOString();
      const lecturaLocal =
        out.lectura ??
        diagnosticarUmbral5Local({ limiteConocido: out.textoVolcado });
      const sesion: SesionUmbral5 = {
        id: out.sesionUmbral5Id,
        userId,
        textoVolcado: out.textoVolcado,
        lectura: lecturaLocal,
        source: out.source ?? "local_gratis",
        estado: "VOLCADO_GRATIS",
        createdAt: ahora,
        updatedAt: ahora,
      };
      guardarSesionUmbral5Local(sesion);
      setSesiones((prev) =>
        ordenarVolcadosPorCreacion([sesion, ...prev.filter((s) => s.id !== sesion.id)]),
      );
      setSesionId(out.sesionUmbral5Id);
      setLectura(lecturaLocal);
      setTexto("");
      limpiarBorradorUmbral5();
      tocadoRef.current = false;
      if (dueno) {
        setSaldo(SALDO_ILIMITADO);
      } else {
        setSaldo(out.saldo);
        guardarSaldoUmbral5Local(userId, out.saldo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sellar el volcado.");
    } finally {
      setSellando(false);
    }
  };

  const mapear = async () => {
    if (!userId || !sesionId) return;
    setError(null);
    if (!dueno && (saldo ?? 0) < CREDITO_LECTURA_MAPA) {
      setModal402(
        `Saldo insuficiente para la lectura del mapa. Se requieren ${CREDITO_LECTURA_MAPA} crédito(s). Saldo: ${saldo ?? 0}.`,
      );
      return;
    }
    setLeyendo(true);
    try {
      const out = await leerMapa({
        userId,
        email,
        sesionUmbral5Id: sesionId,
      });
      setLectura(out.lectura);
      if (dueno) {
        setSaldo(SALDO_ILIMITADO);
      } else {
        setSaldo(out.saldo);
        guardarSaldoUmbral5Local(userId, out.saldo);
      }
      setSesiones((prev) => {
        const next = prev.map((s) =>
          s.id === out.sesionUmbral5Id
            ? {
                ...s,
                lectura: out.lectura,
                source: out.source,
                estado: "MAPA_PAGO" as const,
                updatedAt: new Date().toISOString(),
              }
            : s,
        );
        const actual = next.find((s) => s.id === out.sesionUmbral5Id);
        if (actual) guardarSesionUmbral5Local(actual);
        return ordenarVolcadosPorCreacion(next);
      });
    } catch (err) {
      if (!abrir402(err)) {
        setError(err instanceof Error ? err.message : "Umbral no pudo leer el mapa.");
      }
    } finally {
      setLeyendo(false);
    }
  };

  const aplicarGym = (payload: {
    libro: LibroGimnasio;
    pregunta: PreguntaViva | null;
    copia: string;
    topeDiario: boolean;
  }, opts: { farmacia?: boolean } = {}) => {
    setVerFarmacia(Boolean(opts.farmacia));
    setLibro(payload.libro);
    setPreguntaGym(payload.pregunta);
    setCopiaGym(payload.copia);
    setTopeDiario(payload.topeDiario);
    setModo("gimnasio");
    setLibroContinuable(
      esLibroContinuable(payload.libro) ? payload.libro : null,
    );
    guardarLibroGimnasioLocal(payload.libro);
    setLibros((prev) =>
      ordenarLibrosPorCreacion([
        payload.libro,
        ...prev.filter((l) => l.id !== payload.libro.id),
      ]),
    );
  };

  const entrarGym = async () => {
    if (!userId || !sesionId) return;
    setError(null);
    setAbriendoGym(true);
    try {
      await unlockCuartoAudio();
      const out = await abrirGimnasio({ userId, sesionUmbral5Id: sesionId });
      aplicarGym(out, { farmacia: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el gimnasio.");
    } finally {
      setAbriendoGym(false);
    }
  };

  const responderGym = async (textoRespuesta: string) => {
    if (!userId || !libro) return;
    setError(null);
    setEnviandoGym(true);
    try {
      const out = await responderGimnasio({
        userId,
        libroId: libro.id,
        respuesta: textoRespuesta,
        libro,
      });
      aplicarGym(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "El maestro no pudo tomar el turno.");
    } finally {
      setEnviandoGym(false);
    }
  };

  const continuarGym = async () => {
    if (!userId || !libro) return;
    setError(null);
    try {
      await unlockCuartoAudio();
      const out = await continuarGimnasio({ userId, libroId: libro.id, libro });
      aplicarGym(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Todavía no es el siguiente capítulo.");
    }
  };

  const elegirPildoraGym = async (capitulo: number) => {
    if (!userId) return;
    const base = libro ?? libroContinuable ?? libros[0] ?? null;
    if (!base) {
      if (sesionId) await entrarGym();
      else setError("Sella un volcado para abrir tu primera píldora.");
      return;
    }
    setError(null);
    setEligiendoPildora(capitulo);
    try {
      await unlockCuartoAudio();
      const out = await continuarGimnasio({ userId, libroId: base.id, libro: base, capitulo });
      aplicarGym(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la píldora.");
    } finally {
      setEligiendoPildora(null);
    }
  };

  const copiarGym = async () => {
    if (!copiaGym) return;
    await copiarTexto(copiaGym);
  };

  const elegirPuerta = () => {
    setNuevoDiagnostico(true);
    setModo("puerta");
    setLibro(null);
    setPreguntaGym(null);
    setTopeDiario(false);
  };

  const elegirGimnasio = () => {
    setNuevoDiagnostico(false);
    const target = libroContinuable ?? libros[0] ?? null;
    if (!userId || !target) return;
    void unlockCuartoAudio();
    aplicarGym({
      libro: target,
      pregunta: target.estado === "ABIERTO" ? preguntaVivaDe(target) : null,
      copia: textoCopiaLibro(target),
      topeDiario: target.estado === "TOPE_DIARIO",
    }, { farmacia: true });
    void leerLibroGimnasio({ userId, libroId: target.id })
      .then((out) => aplicarGym(out, { farmacia: true }))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo abrir el libro.");
      });
  };

  const capituloActivo = libroContinuable
    ? (pildoraEnCurso(libroContinuable) ?? libroContinuable.puntero.capitulo)
    : null;
  const pildoraActiva = capituloActivo ? pildoraDe(capituloActivo) : undefined;
  const mostrarTarjeta =
    modo === "puerta" && Boolean(libroContinuable) && !nuevoDiagnostico;
  const mostrarFormulario = modo === "puerta" && !mostrarTarjeta;
  const errorVisible =
    error && !(error === "Libro no encontrado." && !libro) ? error : null;

  return (
    <main
      className="min-h-screen px-4 py-10 text-white"
      style={{ backgroundColor: "#050505" }}
      data-testid="casa-umbral5-page"
    >
      <div className="mx-auto max-w-lg space-y-5">
        <header className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <DoorOpen size={14} style={{ color: UMBRAL5_BRONZE }} aria-hidden />
            <p
              className="text-[10px] tracking-[0.28em]"
              style={{ color: UMBRAL5_BRONZE }}
              data-testid="umbral5-badge"
            >
              PLANETA C6 · {CASA_UMBRAL5_NOMBRE}
            </p>
          </div>
          <h1
            className="text-4xl font-light tracking-tight md:text-5xl"
            data-testid="umbral5-pregunta-entrada"
          >
            {CASA_UMBRAL5_RITUAL}
          </h1>
          <p className="mt-3 text-sm text-white/45">{CASA_UMBRAL5_FIRMA}</p>
        </header>

        <div
          className="sticky top-0 z-20 flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ borderColor: `${UMBRAL5_BRONZE}28`, backgroundColor: "#000000" }}
          data-testid="umbral5-saldo"
        >
          <span
            className="text-[10px] tracking-[0.2em] uppercase"
            style={{ color: UMBRAL5_ASH }}
          >
            Saldo
          </span>
          <span className="text-sm" style={{ color: UMBRAL5_BRONZE }}>
            {etiquetaSaldoCreditos(saldo, { email, ilimitado: dueno })}
          </span>
        </div>

        <BifurcacionPractica
          visible={mostrarTarjeta}
          titulo={pildoraActiva?.nombre ?? "Tu práctica de gimnasia"}
          subtitulo={pildoraActiva?.promesa ?? ""}
          onContinuar={elegirGimnasio}
          onNuevo={elegirPuerta}
        />

        {mostrarTarjeta && errorVisible && (
          <p className="text-sm text-red-400/80" data-testid="umbral5-error">
            {errorVisible}
          </p>
        )}

        {modo === "gimnasio" && (
          <button
            type="button"
            onClick={elegirPuerta}
            className="block text-[10px] tracking-[0.18em] uppercase text-white/40 underline underline-offset-4 hover:text-white/70"
            data-testid="umbral5-elegir-puerta"
          >
            Nuevo diagnóstico (10 volcados)
          </button>
        )}

        {modo === "puerta" && (
          <FarmaciaGimnasio
            libro={libroContinuable ?? libros[0] ?? null}
            onElegir={(c) => void elegirPildoraGym(c)}
            cargandoCapitulo={eligiendoPildora}
          />
        )}

        {mostrarFormulario && (
          <>
            <LienzoLimite
              numeroVolcado={sesiones.length + 1}
              texto={texto}
              onTexto={onTexto}
              onSellar={() => void sellar()}
              cargando={sellando}
              deshabilitado={!userId || sellando}
            />

            <HistorialLimite
              sesiones={sesiones}
              sesionActivaId={sesionId}
              onSelect={(s) => {
                aplicarSesion(s);
              }}
            />

            <BannerMapaOpcional
              visible={Boolean(
                sesionId &&
                  sesiones.find((s) => s.id === sesionId)?.estado !== "MAPA_PAGO",
              )}
              onLeer={() => void mapear()}
              cargando={leyendo}
            />

            {errorVisible && (
              <p className="text-sm text-red-400/80" data-testid="umbral5-error">
                {errorVisible}
              </p>
            )}

            {lectura && <PanelMapa lectura={lectura} />}

            {lectura && modo === "puerta" && hayPesoParaGimnasio(sesiones) && (
              <BannerGimnasio
                modulo={lectura.moduloGimnasio ?? null}
                onEntrar={() => void entrarGym()}
                cargando={abriendoGym}
              />
            )}

          </>
        )}

        {modo === "gimnasio" && libro && verFarmacia && (
          <FarmaciaGimnasio
            libro={libro}
            onElegir={(c) => void elegirPildoraGym(c)}
            cargandoCapitulo={eligiendoPildora}
          />
        )}

        {modo === "gimnasio" && verFarmacia && errorVisible && (
          <p className="text-sm text-red-400/80" data-testid="umbral5-error">
            {errorVisible}
          </p>
        )}

        {modo === "gimnasio" && libro && !verFarmacia && (
          <ConsolaGimnasio
            libro={libro}
            pregunta={preguntaGym}
            topeDiario={topeDiario}
            onResponder={(t) => void responderGym(t)}
            onContinuar={() => void continuarGym()}
            onCopiar={() => void copiarGym()}
            onFarmacia={() => setVerFarmacia(true)}
            enviando={enviandoGym}
            aviso={error}
          />
        )}

        <HistorialLibros
          inicialAbierto={false}
          libros={libros}
          libroActivoId={libro?.id ?? null}
          onSelect={(l) => {
            if (!userId) return;
            void unlockCuartoAudio();
            aplicarGym({
              libro: l,
              pregunta: l.estado === "ABIERTO" ? preguntaVivaDe(l) : null,
              copia: textoCopiaLibro(l),
              topeDiario: l.estado === "TOPE_DIARIO",
            }, { farmacia: true });
            void leerLibroGimnasio({ userId, libroId: l.id })
              .then((out) => aplicarGym(out, { farmacia: true }))
              .catch((err) => {
                setError(err instanceof Error ? err.message : "No se pudo abrir el libro.");
              });
          }}
        />

        <Link
          href="/menu"
          className="inline-block text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white/70"
        >
          Volver al menú
        </Link>
      </div>

      <ModalSaldoInsuficiente
        abierto={Boolean(modal402)}
        mensaje={modal402 ?? ""}
        onCerrar={() => setModal402(null)}
        onRecargar={() => {
          setModal402(null);
          navigate("/pagos");
        }}
      />
    </main>
  );
}

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
import { BannerGimnasio } from "@/components/casas/umbral5/BannerGimnasio";
import { ConsolaGimnasio } from "@/components/casas/gimnasio6/ConsolaGimnasio";
import { HistorialLibros } from "@/components/casas/gimnasio6/HistorialLibros";
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
import type { LibroGimnasio, PreguntaViva } from "@shared/casas/gimnasio6";
import { preguntaVivaDe, textoCopiaLibro } from "@shared/casas/gimnasio6";
import {
  fusionarSesionesUmbral5Local,
  guardarBorradorUmbral5,
  guardarSesionUmbral5Local,
  leerBorradorUmbral5,
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
  const [preguntaGym, setPreguntaGym] = useState<PreguntaViva | null>(null);
  const [copiaGym, setCopiaGym] = useState("");
  const [topeDiario, setTopeDiario] = useState(false);
  const [libros, setLibros] = useState<LibroGimnasio[]>([]);
  const [abriendoGym, setAbriendoGym] = useState(false);
  const [enviandoGym, setEnviandoGym] = useState(false);

  const aplicarSesion = (sesion: SesionUmbral5) => {
    setSesionId(sesion.id);
    setTexto(sesion.textoVolcado);
    setLectura(sesion.lectura);
    guardarBorradorUmbral5(sesion.textoVolcado);
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
    if (locales[0]) {
      aplicarSesion(locales[0]);
    } else {
      const draft = leerBorradorUmbral5();
      if (draft) setTexto(draft);
    }

    void listarSesionesUmbral5(userId)
      .then((r) => {
        const merged = fusionarSesionesUmbral5Local(userId, r.sesiones);
        setSesiones(merged);
        if (!tocadoRef.current && merged[0]) aplicarSesion(merged[0]);
      })
      .catch(() => {
        /* el caché local ya está */
      });

    const librosLocales = listarLibrosGimnasioLocal(userId);
    if (librosLocales.length) setLibros(librosLocales);
    const abierto = libroAbiertoLocal(userId);
    if (abierto) {
      setLibro(abierto);
      setPreguntaGym(abierto.estado === "ABIERTO" ? preguntaVivaDe(abierto) : null);
      setCopiaGym(textoCopiaLibro(abierto));
      setTopeDiario(abierto.estado === "TOPE_DIARIO");
    }

    void listarLibrosGimnasio(userId)
      .then((r) => {
        const merged = fusionarLibrosGimnasioLocal(userId, r.libros);
        setLibros(merged);
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
      const sesion: SesionUmbral5 = {
        id: out.sesionUmbral5Id,
        userId,
        textoVolcado: out.textoVolcado,
        lectura: null,
        source: null,
        estado: "VOLCADO_GRATIS",
        createdAt: ahora,
        updatedAt: ahora,
      };
      guardarSesionUmbral5Local(sesion);
      setSesiones((prev) => [sesion, ...prev.filter((s) => s.id !== sesion.id)]);
      setSesionId(out.sesionUmbral5Id);
      setLectura(null);
      setLibro(null);
      setPreguntaGym(null);
      setCopiaGym("");
      setTopeDiario(false);
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
        return next;
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
  }) => {
    setLibro(payload.libro);
    setPreguntaGym(payload.pregunta);
    setCopiaGym(payload.copia);
    setTopeDiario(payload.topeDiario);
    guardarLibroGimnasioLocal(payload.libro);
    setLibros((prev) => [payload.libro, ...prev.filter((l) => l.id !== payload.libro.id)]);
  };

  const entrarGym = async () => {
    if (!userId || !sesionId) return;
    setError(null);
    setAbriendoGym(true);
    try {
      const out = await abrirGimnasio({ userId, sesionUmbral5Id: sesionId });
      aplicarGym(out);
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
      const out = await continuarGimnasio({ userId, libroId: libro.id, libro });
      aplicarGym(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Todavía no es el siguiente capítulo.");
    }
  };

  const copiarGym = async () => {
    if (!copiaGym) return;
    try {
      await navigator.clipboard.writeText(copiaGym);
    } catch {
      /* sin clipboard */
    }
  };

  return (
    <main
      className="min-h-screen px-4 py-10 text-white"
      style={{ backgroundColor: "#050505" }}
      data-testid="casa-umbral5-page"
    >
      <div className="mx-auto max-w-3xl space-y-8">
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
          className="sticky top-0 z-20 flex items-center justify-between border px-4 py-3"
          style={{ borderColor: `${UMBRAL5_BRONZE}28`, backgroundColor: "#050505f2" }}
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

        <LienzoLimite
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
            tocadoRef.current = true;
            aplicarSesion(s);
          }}
        />

        {sesionId && !lectura && (
          <div
            className="border px-4 py-4"
            style={{ borderColor: `${UMBRAL5_BRONZE}55`, backgroundColor: "#0a0a0a" }}
            data-testid="umbral5-banner-mapa"
          >
            <p className="text-[11px] leading-relaxed text-white/55">
              Volcado sellado. El mapa se cobra. C4 nombra el tipo; no se habita.
            </p>
            <button
              type="button"
              onClick={() => void mapear()}
              disabled={leyendo}
              className="mt-3 w-full px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
              style={{
                backgroundColor: UMBRAL5_BRONZE,
                color: "#0a0a0a",
              }}
              data-testid="umbral5-leer-mapa"
            >
              {leyendo
                ? "Leyendo el mapa…"
                : `Leer el mapa (${CREDITO_LECTURA_MAPA} Crédito)`}
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400/80" data-testid="umbral5-error">
            {error}
          </p>
        )}

        {lectura && <PanelMapa lectura={lectura} />}

        {lectura && !libro && (
          <BannerGimnasio
            modulo={lectura.moduloGimnasio ?? null}
            onEntrar={() => void entrarGym()}
            cargando={abriendoGym}
          />
        )}

        {libro && (
          <ConsolaGimnasio
            libro={libro}
            pregunta={preguntaGym}
            topeDiario={topeDiario}
            onResponder={(t) => void responderGym(t)}
            onContinuar={() => void continuarGym()}
            onCopiar={() => void copiarGym()}
            enviando={enviandoGym}
            aviso={error}
          />
        )}

        <HistorialLibros
          libros={libros}
          libroActivoId={libro?.id ?? null}
          onSelect={(l) => {
            if (!userId) return;
            void leerLibroGimnasio({ userId, libroId: l.id })
              .then(aplicarGym)
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

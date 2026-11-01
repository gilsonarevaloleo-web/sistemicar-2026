import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calendarioAsistencia,
  debeMostrarVentana,
  marcaConciencia,
  preguntaConciencia,
  resumenAsistencia,
  type IntencionAsistencia,
  type LibroAsistencia,
} from "@shared/deposito/v3";
import {
  cumplirSesionHoy,
  elegirIntencionHoy,
  hidratarAsistenciaDesdeVolcados,
  leerLibroAsistencia,
} from "@/lib/deposito/v3/asistenciaStore";

export function useAsistenciaDeposito(
  userId: string,
  timestampsVolcado: readonly number[],
) {
  const marca = useMemo(() => marcaConciencia(), []);
  const pregunta = useMemo(() => preguntaConciencia(), []);
  const diasClave = useMemo(
    () => timestampsVolcado.slice().sort((a, b) => a - b).join(","),
    [timestampsVolcado],
  );
  const [libro, setLibro] = useState<LibroAsistencia>(() =>
    leerLibroAsistencia(userId),
  );

  useEffect(() => {
    setLibro(leerLibroAsistencia(userId));
  }, [userId]);

  useEffect(() => {
    const stamps = diasClave
      ? diasClave.split(",").map((n) => Number(n)).filter(Number.isFinite)
      : [];
    setLibro(hidratarAsistenciaDesdeVolcados(userId, stamps));
  }, [userId, diasClave]);

  const registroHoy = libro.registros[marca.fecha];
  const mostrarVentana = debeMostrarVentana(registroHoy);
  const celdas = useMemo(
    () => calendarioAsistencia(libro, marca.fecha),
    [libro, marca.fecha],
  );
  const resumen = useMemo(() => resumenAsistencia(celdas), [celdas]);

  const elegir = useCallback(
    (intencion: IntencionAsistencia) => {
      setLibro(elegirIntencionHoy(userId, marca.fecha, intencion, marca.hora));
      if (intencion === "si" && typeof document !== "undefined") {
        document.getElementById("deposito-v3-sesion")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        window.setTimeout(() => {
          document.getElementById("deposito-v3-rawfact")?.focus();
        }, 280);
      }
    },
    [userId, marca.fecha, marca.hora],
  );

  const cumplir = useCallback(() => {
    const ya = Boolean(leerLibroAsistencia(userId).registros[marca.fecha]?.sesionCumplida);
    setLibro(cumplirSesionHoy(userId, marca.fecha, marca.hora));
    return !ya;
  }, [userId, marca.fecha, marca.hora]);

  return {
    libro,
    marca,
    pregunta,
    registroHoy,
    mostrarVentana,
    celdas,
    resumen,
    elegir,
    cumplir,
  };
}

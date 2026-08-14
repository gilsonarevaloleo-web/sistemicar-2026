/** Contenido del kit vendedores — fuente compartida con `/vendedores-planificacion`. */
import { SISTEMICAR_CATEGORY, CATEGORY_FOOTER } from "@/lib/sistemicarCategory";
import {
  PLANIFICACION_FULL_MONTHLY_USD,
  PLANIFICACION_STACKS,
  PLANIFICACION_SKU_BY_ID,
  SKU_BASE,
  SKU_NORTE,
  SKU_RITMO,
  EMBUDO_PREGUNTAS_V2,
} from "@shared/planificacionPricing";
import {
  ESPEJO_SKU_INICIO,
  ESPEJO_SKU_RECARGA,
} from "@shared/espejoPricing";

export const KIT_VERSION = "2.1";

export const KIT_ELEVATOR_PITCH = SISTEMICAR_CATEGORY.elevator;

export const KIT_RESUMEN_30S = [
  SISTEMICAR_CATEGORY.name + " — no calendario ni lista de tareas.",
  `Peldaño 1 ${SKU_BASE.name} ($${SKU_BASE.priceUsd}) — vehículos Conquista + PS (urgente).`,
  `Peldaño 2 ${SKU_RITMO.name} (+$${SKU_RITMO.priceUsd}) — segmentos + Situacional.`,
  `Peldaño 3 ${SKU_NORTE.name} (+$${SKU_NORTE.priceUsd}) — Crisol + Hub Proyectos (último, alto valor).`,
  `Espejo: packs de créditos — Inicio $${ESPEJO_SKU_INICIO.priceUsd} (${ESPEJO_SKU_INICIO.credits} créd.) / Recarga $${ESPEJO_SKU_RECARGA.priceUsd} (${ESPEJO_SKU_RECARGA.credits} créd.), pago único.`,
  `Comprometido paga ~$${PLANIFICACION_FULL_MONTHLY_USD}/mes (tres capas apiladas). Comisión 30%.`,
];

export const ESCALERA_CAPAS = [
  {
    capa: 1,
    id: "presencia",
    titulo: "Presencia",
    pregunta: "¿En qué se me va el tiempo?",
    metrica: "Cierre medible (Conquista + PS)",
    color: "#8B5CF6",
    copyVenta:
      "Primera capa: dejar de inventar el día. Conquista muestra unidades cerradas — veredicto, no culpa.",
    demo: "Lanzar Conquista → cerrar 2 subs → ver PS.",
  },
  {
    capa: 2,
    id: "entrada",
    titulo: "Entrada",
    pregunta: "¿Aparezco en la ventana del día?",
    metrica: "Segmentos + Situacional (Ritmo)",
    color: "#D4AF37",
    copyVenta:
      "Segunda capa: estructura e imprevistos. Ritmo del día para quien ya mide unidades.",
    demo: "Crear segmento → lanzar Situacional → cerrar bloque.",
  },
  {
    capa: 3,
    id: "produccion",
    titulo: "Norte",
    pregunta: "¿Mis ideas van a un proyecto?",
    metrica: "Crisol + Hub Proyectos",
    color: "#A855F7",
    copyVenta:
      "Tercera capa (última): horizonte. Solo el comprometido apunta ideas a largo plazo.",
    demo: "Crisol → nido → paso #N en Hub.",
  },
] as const;

export const ESCALERA_INTEGRACION = CATEGORY_FOOTER;

export const PRODUCTOS = [
  {
    id: SKU_BASE.id,
    name: SKU_BASE.name,
    price: SKU_BASE.priceUsd,
    stack: "Peldaño 1 · obligatorio",
    comision: SKU_BASE.commissionUsd,
    color: "#D4AF37",
  },
  {
    id: SKU_RITMO.id,
    name: SKU_RITMO.name,
    price: SKU_RITMO.priceUsd,
    stack: "Peldaño 2 · Ritmo del día",
    comision: SKU_RITMO.commissionUsd,
    color: "#00C851",
  },
  {
    id: SKU_NORTE.id,
    name: SKU_NORTE.name,
    price: SKU_NORTE.priceUsd,
    stack: "Peldaño 3 · Norte (alto valor)",
    comision: SKU_NORTE.commissionUsd,
    color: "#38BDF8",
  },
  {
    id: ESPEJO_SKU_INICIO.id,
    name: ESPEJO_SKU_INICIO.name,
    price: ESPEJO_SKU_INICIO.priceUsd,
    stack: `Espejo · ${ESPEJO_SKU_INICIO.credits} créditos (único)`,
    comision: ESPEJO_SKU_INICIO.commissionUsd,
    color: "#38BDF8",
  },
  {
    id: ESPEJO_SKU_RECARGA.id,
    name: ESPEJO_SKU_RECARGA.name,
    price: ESPEJO_SKU_RECARGA.priceUsd,
    stack: `Espejo · ${ESPEJO_SKU_RECARGA.credits} créditos (único)`,
    comision: ESPEJO_SKU_RECARGA.commissionUsd,
    color: "#60A5FA",
  },
] as const;

export const STACKS = PLANIFICACION_STACKS.map((s) => ({
  title: s.title,
  peldao: s.subtitle,
  modules: s.modulesLabel,
  total: s.totalUsd,
  comisionEjemplo: s.commissionUsd,
  desc: s.desc,
}));

export const EMBUDO_PREGUNTAS = EMBUDO_PREGUNTAS_V2.map((q) => ({
  peldao: q.peldaño,
  pregunta: q.pregunta,
  respuesta: q.si,
}));

export const CATALOGO_PELDAO = [
  {
    peldao: 1,
    titulo: SKU_BASE.name,
    frase: SKU_BASE.identity,
    incluye: [...SKU_BASE.unlocks],
    noIncluye: "Segmentos, Situacional, Crisol, Hub — van en Ritmo/Norte.",
  },
  {
    peldao: 2,
    titulo: SKU_RITMO.name,
    frase: SKU_RITMO.identity,
    incluye: [...SKU_RITMO.unlocks],
    noIncluye: `Requiere ${SKU_BASE.name}.`,
    demo: "Segmento → Situacional → cerrar bloque.",
  },
  {
    peldao: 3,
    titulo: SKU_NORTE.name,
    frase: SKU_NORTE.identity,
    incluye: [...SKU_NORTE.unlocks],
    noIncluye: `Requiere ${SKU_BASE.name}. Ideal tras Ritmo.`,
    demo: "Crisol → ring → paso #N en proyecto.",
  },
] as const;

export const MATRIZ_BENEFICIOS = [
  {
    persona: "Producción urgente",
    dolor: "No sé cuánto hice",
    peldao: `1 ${SKU_BASE.shortName}`,
    demo: "Conquista → PS",
  },
  {
    persona: "Día sin estructura",
    dolor: "Se me va el día / imprevistos",
    peldao: `2 ${SKU_RITMO.shortName}`,
    demo: "Segmentos + Situacional",
  },
  {
    persona: "Mente acelerada",
    dolor: "Ideas que se pierden",
    peldao: `3 ${SKU_NORTE.shortName}`,
    demo: "Crisol → nido",
  },
  {
    persona: "Proyectos largos",
    dolor: "Poco avance visible",
    peldao: `3 ${SKU_NORTE.shortName}`,
    demo: "Hub → paso #N",
  },
] as const;

export const OBJECIONES = [
  {
    q: "¿Por qué no uso Notion / Google Calendar?",
    a: "Porque aquí pagas por cierre medido (unidades y bloques), no por almacenar notas.",
  },
  {
    q: "¿Es muy complicado?",
    a: "Empieza con Base: solo Conquista. Ritmo y Norte se activan cuando el usuario ya cierra.",
  },
  {
    q: "¿Por qué el Hub es el más caro?",
    a: "Porque el poco comprometido no valora proyectos a largo plazo. Primero mide unidades; el Norte es para quien ya confía en el método.",
  },
  {
    q: "¿Y si no renuevo?",
    a: "El cliente pierde acceso; tú dejas de ganar comisión ese mes.",
  },
  {
    q: "¿Incluye todo SISTEMICAR?",
    a: "No. Solo lo que aparece en /pagos: Jornada, Umbral y packs Espejo.",
  },
  {
    q: "¿Espejo es suscripción?",
    a: `No. Packs de créditos: Inicio $${ESPEJO_SKU_INICIO.priceUsd} (${ESPEJO_SKU_INICIO.credits} créd.) o Recarga $${ESPEJO_SKU_RECARGA.priceUsd} (${ESPEJO_SKU_RECARGA.credits} créd.). Pagan solo cuando limpian.`,
  },
] as const;

export const LISTA_ROJA = [
  "Módulos en desarrollo (Alquimia, Radar, Mentor, etc.)",
  '"Todo incluido" o precios que no aparecen en /pagos',
  "Que la app planifica sola sin que el usuario cierre vehículos/subs",
  "Resultados garantizados — vende medición y método",
  "Comisión infinita si el cliente cancela",
  "Vender Hub/Proyectos a quien aún no cierra unidades",
  "Vender Corazón Sabio / Espejo $17 — retirado; usa packs de créditos",
] as const;

export const GUION_VENTA = [
  `¿Necesitas medir unidades hoy? → ${SKU_BASE.name} ($${SKU_BASE.priceUsd}).`,
  `¿Quieres estructura e imprevistos? → + ${SKU_RITMO.name} ($${SKU_RITMO.priceUsd}).`,
  `¿Ideas a proyectos con pasos? → + ${SKU_NORTE.name} ($${SKU_NORTE.priceUsd}) — último peldaño.`,
  `¿Carga emocional / culpa que no deja pensar? → Espejo Inicio ($${ESPEJO_SKU_INICIO.priceUsd}, ${ESPEJO_SKU_INICIO.credits} créditos).`,
  "¿Comparas con Notion? → Ritmo, cierre y decisiones medidas — no listas.",
  `Cierre: "Base mide; Ritmo ordena el día; Norte apunta al proyecto. Comprometido ≈ $${PLANIFICACION_FULL_MONTHLY_USD}/mes. Espejo es pack de créditos, no suscripción."`,
] as const;

export const IMAN_FLUJO = [
  "Mente → Crisol (captura + nido/proyecto)",
  "Desglosador Situacional (ring ~60% con cronómetro)",
  "[no alcanza el bloque] → Crisol otra vez (ruta S)",
  "Cumplido → paso ejecutado en Hub Proyectos",
] as const;

export const IMAN_OBJECIONES = [
  {
    q: "¿Por qué escribo dos veces: aquí y donde resuelvo?",
    a: "Con Crisol + proyecto, la primera escritura es aterrizaje con destino; la segunda es ejecución medida en tiempo.",
  },
  {
    q: "Prefiero anotar directo donde trabajo",
    a: "Directo = foco bajo si no acotas tiempo. Situacional + cronómetro sube el foco ~60%.",
  },
  {
    q: "Es otra bandeja de notas",
    a: "Es imán de ordenamiento: nido (proyecto o inbox), ruta S/E/M, y vuelve al desglosador sin perderse.",
  },
] as const;

export const IMAN_FRASES = [
  "No es escribir dos veces al vacío: es capturar con nido y cerrar con paso en tu proyecto.",
  "El Crisol ordena; el Situacional enfoca; el Hub te da fe para soñar más grande.",
  "Prácticamente el primer sistema que ordena pensamientos hacia acción medida.",
] as const;

export const INVENTARIO_PRODUCTO = [
  {
    area: "Conquista + PS (Jornada V4)",
    estado: "Producción",
    nota: `Peldaño 1 — ${PLANIFICACION_SKU_BY_ID.planificacion_base.name}`,
  },
  {
    area: "Segmentos + Situacional",
    estado: "Producción",
    nota: `Peldaño 2 — ${PLANIFICACION_SKU_BY_ID.operativo.name}`,
  },
  {
    area: "Crisol + Hub Proyectos",
    estado: "Producción",
    nota: `Peldaño 3 — ${PLANIFICACION_SKU_BY_ID.soberania_dia.name}`,
  },
  {
    area: "Espejo créditos",
    estado: "Producción",
    nota: `Inicio $${ESPEJO_SKU_INICIO.priceUsd}/${ESPEJO_SKU_INICIO.credits} · Recarga $${ESPEJO_SKU_RECARGA.priceUsd}/${ESPEJO_SKU_RECARGA.credits}`,
  },
  { area: "Pagos MP + ref vendedor", estado: "Producción", nota: "Verificar dominio producción" },
] as const;

export const KIT_MD_PATH = "/docs/KIT_Vendedores_Planificacion.md";

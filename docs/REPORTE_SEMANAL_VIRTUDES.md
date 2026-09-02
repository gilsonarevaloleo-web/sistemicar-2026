# Reporte semanal de virtudes — Paso 1: spec

**Estado:** contrato de producto. Sin UI. Sin motor todavía.  
**Fecha:** 2026-09-02  
**Módulo dueño:** Jornada (evidencia de cierre). Umbral y Espejo entran solo como capa opcional.  
**Zona horaria:** día-jornada Lima (`getJournalDayStartMs`, corte 05:00). No usar medianoche del navegador.

Este documento cierra el **Paso 1**. El Paso 2 (motor determinista + tests) no empieza hasta que este contrato se acepte.

---

## 0. Contrato

El reporte semanal traduce **conducta ya medida** en **virtudes de la semana**.  
No diagnostica personalidad. No consuela. No es un dashboard más.

| Es | No es |
|---|---|
| Cosecha semanal de evidencia | Perfil fijo tipo MBTI / Big Five / VIA |
| Virtudes como práctica de *esta* semana | “Tú eres una persona X” |
| Escaso: se sella una vez y no se reabre | Analytics `/analytics` (siempre disponible) |
| Fórmulas sobre campos que ya existen | Métricas nuevas ni tests psicológicos |
| Veredicto con números ya calculados | Ensayo clínico de Gemini |

Axiomas que no se negocian (tronco de Jornada):

1. Consciencia = darse cuenta.
2. El coraje (RETO) tiene valor intrínseco.
3. El caos no es personalidad: es código de arranque.
4. Medimos cierres y decisiones, no intención.

---

## 1. Secuencia de pasos

| Paso | Entrega | Este PR |
|---|---|---|
| **1** | Este spec: virtudes, fórmulas, umbral, tono | sí |
| **2** | Motor puro (`calcularReporteSemanal`) + tests. Sin pantalla | no |
| **3** | Persistencia + sello semanal (una escritura por semana/usuario) | no |
| **4** | Ritual de UI: espera → revelación → acción de la semana que entra | no |
| **5** | Redacción del veredicto (plantillas; Gemini opcional y posterior) | no |

Si el spec cambia en un paso posterior, se actualiza **este** archivo. No se inventa un segundo contrato.

---

## 2. Cadencia, ventana y escasez

### 2.1 Ventana

- Semana operativa: **lunes 05:00 Lima → lunes 05:00 Lima** (7 días-jornada).
- Identificador: `semanaId = YYYY-Www` ISO, anclado al **lunes de esa ventana** en Lima.
- Fuentes filtradas por `getJournalDateString` / `fecha` de snapshot, no por `Date.getDay()` del browser.

Coincide con el calendario de pasos (`pasosDadosCalendar`: semana empieza lunes), pero **corrige** esa helper: aquella usa medianoche local; el reporte usa día-jornada Lima.

### 2.2 Cuándo existe el reporte

| Momento | Estado |
|---|---|
| Durante la semana en curso | `EN_CURSO`. No hay relato. Puede existir un pulso de 1 cifra (días con evidencia / 7). |
| Lunes 05:00 Lima, si hay umbral | `SELLADO`. El motor corre **una vez**. El resultado no se recalcula. |
| Lunes 05:00 Lima, sin umbral | `INSUFICIENTE`. No hay espejo. Texto corto: faltó evidencia, no faltó “esfuerzo”. |
| Semanas anteriores selladas | Archivo. Solo lectura. |

**Escasez:** el relato (virtudes + veredicto + código de fricción) es invisible hasta el sello. Si el usuario puede abrirlo el miércoles “para ver cómo voy”, el ritual muere.

Analytics, anillo, PS del día y Coach IA **no se tocan**. Siguen siendo el laboratorio en vivo. El reporte es la cosecha.

### 2.3 Recálculo

Prohibido recalcular un sello porque llegaron datos tarde (vehículo que cierra el lunes a las 04:50 pertenece a la semana *anterior* y entra en ese sello si aún no se escribió; si el sello ya existe, esos datos **no** reabren la semana).

Regla de carrera: el sello se escribe en el primer acceso post-corte **o** en un job al corte. Idempotente por `(userId, semanaId)`.

---

## 3. Umbral mínimo de evidencia

Sin evidencia no hay virtudes. Inventar un perfil con 1 vehículo es fraude.

Una semana es **elegible** si cumple **al menos una** de estas barras:

| Barra | Criterio | Por qué |
|---|---|---|
| A. Días operados | ≥ **3** días-jornada con al menos 1 cierre consciente | Consistencia mínima para hablar de patrón |
| B. Cierres | ≥ **5** vehículos no-centinela en `cumplido` / `archivado` con `cierreAt` | Volumen de agencia |
| C. Sello diario | ≥ **2** `CierreJornadaLog` con `selloEmitido === true` | El usuario ya selló el día; la semana puede cosechar |

Cierre consciente = vehículo con `cierreAt` y `isDecisionCountableVehicle` (excluye centinelas invisibles). Segmento cerrado solo no cuenta para B; sí puede marcar el día para A si hay snapshot con `segmentosCerradosManual ≥ 1` o `decisionesDelDia ≥ 1`.

Si no llega al umbral: estado `INSUFICIENTE`. No se rellenan virtudes con 50 “neutrales”. No se llama a Gemini.

---

## 4. Fuentes (solo datos existentes)

Nada de esto se crea en el Paso 1–2. Se **leen**.

| Fuente | Campos que importan | Dónde |
|---|---|---|
| `PlanillaDailySnapshot` | `fecha`, `segmentosCerradosManual`, `segmentosTotales`, `segmentosEntropia`, `espectroBloques`, `resistencia`, `decisionesDelDia`, `disciplina.indiceDisciplina`, `psDesglose`, `ratioConquista` | `termodinamicaAtencional.ts` · ya hay agregados de 7 días en Analytics |
| `Vehicle` | `cierreAt`, `cierreManual`, `bonoTemple`, `energiaOscura`, `justificacion`, `rendimientoConsciente`, `parentesisRecarga`, `ejes.*.trifecta`, `status`, `duracionFinal` | `persistence.ts` |
| `CierreJornadaLog` | `selloEmitido`, `energiaOscuraTotal`, `segmentosCerradosManual`, `porcentajeSoberania` | `persistence.ts` |
| `SesionUmbral` | `historialCodigos`, `intentosTotales`, `modo` | `shared/umbral/` — **opcional** |
| Energy logs / CP | no entran al núcleo de virtudes | ya viven en `/analytics` |

Umbral v2 es capa extra: si esa semana no hubo sesión, las 6 virtudes siguen saliendo de Jornada. El “código de fricción” entonces se toma de la virtud más baja, no de Gemini.

---

## 5. Las 6 virtudes

Seis, no diez. Cada una cabe en una barra. Los 10 códigos no se convierten en 10 scores: saturan y copian Umbral.

Virtud = **hábito de esta semana**, 0–100, con evidencia citada debajo.  
`null` = no medible (denominador 0). `null` no es 50.

### 5.1 Integridad — palabra consigo mismo

**Pregunta:** ¿cerró lo que abrió, o dejó que el tiempo lo cerrara?

```
manuales = vehículos con cierreAt y cierreManual !== false
automaticos = vehículos con cierreAt y cierreManual === false
ratioVehiculos = manuales / (manuales + automaticos)          // 0..1

ratioSegmentos = Σ segmentosCerradosManual / Σ segmentosTotales   // snapshots de la semana

Integridad = round(100 * (0.6 * ratioVehiculos + 0.4 * ratioSegmentos))
```

Si un denominador es 0, esa rama se omite y la otra pesa 100%. Si ambas son 0 → `null`.

**Evidencia a mostrar:** “11 de 14 vehículos cerrados a mano · 18/24 segmentos”.

### 5.2 Temple — voluntad contra inercia

**Pregunta:** ¿actuó cuando no había estructura empujándolo, y sin dejar deuda sin nombrar?

```
templeLanzado = vehículos con bonoTemple === true / vehículos con cierreAt
reto = vehículos cumplidos con ≥1 eje trifecta "reto" / vehículos cumplidos
oscura = vehículos con energiaOscura === true / vehículos con cierreAt
Temple = round(100 * (0.4 * templeLanzado + 0.4 * reto + 0.2 * (1 - oscura)))
```

Ramas con denominador 0 se omiten y se renormalizan. Si no hay cierres → `null`.

**Evidencia:** “3 lanzamientos con bono temple · 2 misiones reto · 1 energía oscura”.

### 5.3 Consistencia — días que existió

**Pregunta:** ¿apareció, o tuvo baches?

```
diasConEvidencia = días-jornada con (cierre consciente ≥ 1) OR (snapshot con decisionesDelDia ≥ 1)
Consistencia = round(100 * diasConEvidencia / 7)
```

Siempre medible si la semana es elegible (el umbral ya exige 3 días o equivalente). Semana incompleta en curso usa el mismo /7: no se infla “voy 3/3”.

**Evidencia:** “5 de 7 días con cierre”.

### 5.4 Agencia — decisiones ejecutadas

**Pregunta:** ¿el tanque se llenó al cerrar, o el día pasó en vacío?

```
decisiones = Σ decisionesDelDia de los snapshots (fallback: conteo de cierres conscientes si el campo no existe en snapshots viejos)
mediaDia = decisiones / max(diasConEvidencia, 1)

# Ancla: 8 decisiones/día con evidencia = 100. No es un ideal moral; es techo de barra.
Agencia = clamp(0, 100, round(100 * mediaDia / 8))
```

El coraje cuenta: un cierre en RETO fallido sigue siendo decisión si el tronco lo trata como cierre válido. No restar por “no cumplido perfecto”.

**Evidencia:** “27 decisiones en 5 días (5.4/día)”.

### 5.5 Autoconciencia — nombrar lo que pasó

**Pregunta:** ¿declaró estado y justificación, o dejó la deuda muda?

```
oscuros = vehículos energiaOscura === true
oscurosNombrados = oscuros con justificacion trim.length ≥ 8
ratioOscura = oscurosNombrados / oscuros          // si oscuros = 0, omitir rama

declarados = vehículos con rendimientoConsciente in {igual, mejor, peor}
ratioDeclarado = declarados / vehículos con cierreAt

Autoconciencia = round(100 * media de ramas presentes)
```

Justificación vacía en energía oscura **baja** el score. No tener energía oscura no premia ni castiga esa rama.

**Evidencia:** “2/2 deudas nombradas · 8 cierres con rendimiento declarado”.

### 5.6 Enfoque — dominio fluido vs. fricción

**Pregunta:** ¿la semana fue piloto automático, o se pasó en el límite?

Usar termodinámica v2 cuando `schemaVersion === 2` y hay `resistencia`:

```
fluido = Σ espectroBloques.fluido
concentrado = Σ espectroBloques.concentrado
limite = Σ espectroBloques.limite
totalBandas = fluido + concentrado + limite

ratioFluido = fluido / totalBandas
ratioLimite = limite / totalBandas
indiceResistenciaMedio = promedio de resistencia.indiceResistencia (0..1)

Enfoque = round(100 * (0.5 * ratioFluido + 0.3 * (1 - ratioLimite) + 0.2 * indiceResistenciaMedio))
```

Si no hay bandas ni resistencia → `null` (semana sin desglosador/ruta). No inventar enfoque con vehículos Express.

**Evidencia:** “12 bloques fluido · 3 límite · fase dominio_fluido 4/7 días”.

---

## 6. Cosecha de la semana (salida del motor)

Además de las 6 barras:

1. **Virtud alta** — mayor score no-nulo. Empate: orden Integridad > Temple > Consistencia > Agencia > Autoconciencia > Enfoque.
2. **Virtud baja (fricción)** — menor score no-nulo. Mismo desempate invertido.
3. **Delta vs. semana sellada anterior** — por virtud: `+n / -n / =`. Primera semana: `null` en todos los deltas. El valor interno es **delta de conducta**, no medalla de identidad.
4. **Código de fricción** — mapa fijo virtud → código Umbral (nombre canónico de `engineConfig.ts`):

| Virtud baja | Código | Acción mínima de la semana que entra (una sola) |
|---|---|---|
| Integridad | C7 Justicia | Cerrar a mano el próximo vehículo antes de que el segmento lo archive. |
| Temple | C8 Persistencia | Lanzar 1 vehículo fuera de segmento o 1 misión con eje RETO. |
| Consistencia | C3 Labor | Operar 1 cierre consciente en los próximos 3 días-jornada, sin excepciones. |
| Agencia | C5 Cálculo | Declarar criterio de fin **antes** de abrir el siguiente vehículo. |
| Autoconciencia | C1 Claridad | Si hay exceso: escribir justificación de ≥8 caracteres antes de salir. |
| Enfoque | C1 Atención | Un bloque de ruta sin cruzar a límite; si cruza, declararlo al cierre. |

Si hubo sesión Umbral esa semana, se **anota** el cuello de botella de `calcularMetricasUmbral` como dato al pie. **No sustituye** la virtud baja: Jornada es la evidencia diaria; Umbral es entrenamiento puntual.

5. **PS de la semana** — Σ `psDesglose.total` de snapshots. Contexto, no virtud. No entra al promedio.

**No hay score total de “valor interno”.** Un número único invita a cazar la nota. El veredicto nombra la tensión entre virtud alta y virtud baja.

---

## 7. Veredicto — forma, no prosa libre

Tres bloques. En ese orden. Nada más.

```
1. Tensión (1 frase)
   Esta semana tu {virtudAlta} estuvo por encima de tu {virtudBaja}.

2. Evidencia (2–4 hechos con números de §5)
   Cerraste 11 de 14 vehículos a mano. Operaste 5 de 7 días. 1 energía oscura sin nombrar.

3. Mandato (1 acción de la tabla §6, literal)
   Semana que entra — {acción mínima}.
```

Plantillas según patrón (deterministas, Paso 5 las deja en código):

| Patrón | Condición | Tensión |
|---|---|---|
| Desequilibrio | alta ≥ 70 y baja ≤ 40 | `Esta semana tu {alta} cargó el peso; tu {baja} no apareció.` |
| Piso | todas las no-nulas < 40 | `Esta semana no faltó intención: faltó cierre.` |
| Techo | todas las no-nulas ≥ 70 | `Esta semana tu palabra contigo mismo pesó. El mandato es no bajar el estándar.` |
| Delta | hay semana previa y |delta de la baja| ≥ 15 | `Tu {baja} {subió\|bajó} {n} puntos respecto de la semana anterior.` |
| Default | resto | `Esta semana tu {alta} estuvo por encima de tu {baja}.` |

### Gemini (Paso 5, opcional, posterior)

Si se usa, **solo** reescribe el bloque 1 con:

- las 6 scores ya calculados
- los hechos de evidencia
- las reglas de tono de §8

Prohibido: cambiar números, inventar virtudes, diagnosticar clínica, alargar a más de 2 frases. Si Gemini falla, se muestra la plantilla. El sello no espera a la red.

---

## 8. Tono

Voz SISTEMICAR: radiografía, no terapeuta.

**Obligatorio**

- Segunda persona, presente o pretérito de la semana (“cerraste”, no “se observa que el sujeto”).
- Cada adjetivo arrastra un número o no se usa.
- Valor interno = evidencia de agencia. Ejemplo canónico: *“Cerraste 11 de 14 vehículos a mano. Tu palabra contigo mismo esta semana pesó.”*

**Prohibido**

- Etiquetas de identidad: “eres disciplinado”, “tu personalidad es…”, “tipo X”.
- Clínica: burnout, ansiedad, cortisol, alexitimia, TDAH, “tu cerebro”.
- Autoayuda: “eres valioso”, “confía en el proceso”, “ánimo”, “orgullo de ti”.
- Psicologismos vetados en los códigos (motivación, bienestar, esfuerzo-como-virtud, prudencia-como-virtud).
- Comparar al usuario con otros usuarios.
- Prometer resultados de la semana que entra.

**INSUFICIENTE** (texto fijo):

> Esta semana no hubo evidencia suficiente para un espejo. El reporte no se inventa. Operar 3 días con cierre, o sellar 2 jornadas.

---

## 9. Contrato de datos (Paso 2 implementa esto)

```ts
export type SemanaId = string; // "2026-W36"
export type EstadoReporte = "EN_CURSO" | "SELLADO" | "INSUFICIENTE";
export type VirtudId =
  | "integridad"
  | "temple"
  | "consistencia"
  | "agencia"
  | "autoconciencia"
  | "enfoque";

export interface EvidenciaVirtud {
  hechos: string[];           // ya formateados para UI
  numerador?: number;
  denominador?: number;
}

export interface ScoreVirtud {
  id: VirtudId;
  score: number | null;       // 0–100 o no medible
  delta: number | null;       // vs semana sellada previa
  evidencia: EvidenciaVirtud;
}

export interface ReporteSemanal {
  semanaId: SemanaId;
  estado: EstadoReporte;
  ventana: { inicioJournal: string; finJournal: string }; // YYYY-MM-DD Lima
  virtudes: ScoreVirtud[];    // siempre 6, en el orden de §5
  virtudAlta: VirtudId | null;
  virtudBaja: VirtudId | null;
  codigoFriccion: {
    codigo: 1 | 3 | 5 | 7 | 8;
    virtud: VirtudId;
    accionMinima: string;
  } | null;
  umbralCuello: { codigo: number; intentos: number } | null;
  psSemana: number;
  veredicto: {
    patron: "desequilibrio" | "piso" | "techo" | "delta" | "default" | "insuficiente";
    tension: string;
    evidencia: string[];
    mandato: string;
  };
  selladoAt: number | null;
}
```

Entrada del motor: snapshots de la ventana, vehículos de la ventana, sellos diarios, sesiones Umbral (opcional), reporte sellado previo (opcional).  
Salida: un `ReporteSemanal`. Función pura. Sin Firebase, sin Gemini, sin React.

---

## 10. Fuera de alcance (hasta que el paso lo nombre)

- Pantalla, ruta, menú, notificaciones push.
- Recalcular Analytics o el índice de soberanía actual.
- Nuevos campos en `Vehicle` / snapshots.
- Persistencia Firestore (Paso 3).
- Traducir virtudes a los 10 códigos como radar.
- Comparativa social, rachas de “semanas perfectas”, score único.

---

## 11. Criterio de aceptación del Paso 2

Cuando este spec esté aceptado, el Paso 2 entrega:

1. `shared/` o `client/src/lib/` — `calcularReporteSemanal(input) → ReporteSemanal`.
2. Tests de: umbral A/B/C, cada fórmula con denominador 0, patrones de veredicto, semana `INSUFICIENTE`, delta vs. previa, exclusión de centinelas, ventana lunes 05:00.
3. Cero UI. Cero llamadas de red.

Hasta entonces, este archivo es la única fuente de verdad.

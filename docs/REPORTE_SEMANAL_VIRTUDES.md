# Reporte semanal de virtudes — Paso 1: spec

**Estado:** contrato de producto. Sin UI. Sin motor todavía.  
**Fecha:** 2026-09-02  
**Revisión:** 2 — puertas, Término, disposición del anillo, tono de los Códigos.  
**Módulo dueño:** Jornada (evidencia de cierre). Umbral y Espejo entran solo como capa opcional.  
**Zona horaria:** día-jornada Lima (`getJournalDayStartMs`, corte 05:00). No usar medianoche del navegador.

Este documento es el **Paso 1**. El Paso 2 no empieza hasta que este contrato se acepte.

**Fuera de tono (no usar):** el documento `/metricas` (`metricas-documento.tsx`). Esa psicología es tradicional (cortisol, burnout, alexitimia, 66 días). No es fuente de este reporte.

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
| Psicología de los 10 Códigos | Psicología tradicional / autoayuda / `/metricas` |

Axiomas (tronco de Jornada + esta revisión):

1. Consciencia = darse cuenta.
2. El coraje (RETO) tiene valor intrínseco.
3. El caos no es personalidad: es código de arranque.
4. Medimos cierres y decisiones, no intención.
5. **La disciplina entra por las puertas, no por la ejecución.** Abrir y cerrar la puerta ancla la conciencia al tiempo *antes* de actuar.
6. **Un ciclo que no se cierra se hereda.** La Puerta del Término corta la carga para que la noche no reciba lastre.

---

## 1. Secuencia de pasos

| Paso | Entrega | Este PR |
|---|---|---|
| **1** | Este spec: virtudes, fórmulas, umbral, tono | sí |
| **2** | Motor puro (`calcularReporteSemanal`) + tests. Sin pantalla | no |
| **3** | Persistencia + sello semanal (una escritura por semana/usuario) | no |
| **4** | Ritual de UI: espera → revelación → acción de la semana que entra | no |
| **5** | Redacción del veredicto (plantillas; Gemini opcional y posterior) | no |

Si el spec cambia, se actualiza **este** archivo. No se inventa un segundo contrato.

Limpieza de `/metricas` (tono tradicional → Códigos) **no** es este paso.

---

## 2. Cadencia, ventana y escasez

### 2.1 Ventana

- Semana operativa: **lunes 05:00 Lima → lunes 05:00 Lima** (7 días-jornada).
- Identificador: `semanaId = YYYY-Www` ISO, anclado al **lunes de esa ventana** en Lima.
- Fuentes filtradas por `getJournalDateString` / `fecha` de snapshot o planilla, no por `Date.getDay()` del browser.

Coincide con el calendario de pasos (`pasosDadosCalendar`: semana empieza lunes), pero **corrige** esa helper: aquella usa medianoche local; el reporte usa día-jornada Lima.

### 2.2 Cuándo existe el reporte

| Momento | Estado |
|---|---|
| Durante la semana en curso | `EN_CURSO`. No hay relato. Pulso permitido: 1 cifra (días con puerta o plan / 7). |
| Lunes 05:00 Lima, si hay umbral | `SELLADO`. El motor corre **una vez**. El resultado no se recalcula. |
| Lunes 05:00 Lima, sin umbral | `INSUFICIENTE`. No hay espejo. Faltó evidencia, no “esfuerzo”. |
| Semanas anteriores selladas | Archivo. Solo lectura. |

**Escasez:** el relato es invisible hasta el sello. Si se abre el miércoles “para ver cómo voy”, el ritual muere.

Analytics, anillo, PS del día y Coach IA **no se tocan**. El reporte es la cosecha.

### 2.3 Recálculo

Prohibido recalcular un sello porque llegaron datos tarde (vehículo que cierra el lunes a las 04:50 pertenece a la semana *anterior* y entra en ese sello si aún no se escribió; si el sello ya existe, esos datos **no** reabren la semana).

Regla de carrera: primer acceso post-corte **o** job al corte. Idempotente por `(userId, semanaId)`.

---

## 3. Umbral mínimo de evidencia

Sin evidencia no hay virtudes. Inventar un perfil con 1 vehículo es fraude.

Una semana es **elegible** si cumple **al menos una** barra:

| Barra | Criterio | Por qué |
|---|---|---|
| A. Días con ancla | ≥ **3** días-jornada con ≥1 puerta abierta o ≥1 cierre de puerta (`cerrado_manual`) | La disciplina ya operó, aunque no se haya ejecutado |
| B. Cierres | ≥ **5** vehículos no-centinela con `cierreAt` | Volumen de agencia |
| C. Sello diario | ≥ **2** `CierreJornadaLog` con `selloEmitido === true` | El día ya se cosechó |
| D. Anillo plantado | ≥ **3** días con planilla de ≥3 segmentos | Hubo disposición, aunque las puertas se hayan perdido |

Cierre consciente de vehículo = `cierreAt` + `isDecisionCountableVehicle` (sin centinelas).  
Puerta cuenta para A aunque no haya habido vehículo: eso es el punto.

Si no llega al umbral: `INSUFICIENTE`. No rellenar virtudes con 50. No llamar a Gemini.

---

## 4. Fuentes (solo datos existentes)

Nada de esto se crea en el Paso 1–2. Se **leen**.

| Fuente | Campos | Dónde |
|---|---|---|
| `Planilla` / `SegmentoV5` | `fecha`, `segmentos[]`, `estado`, `activadoAt`, `cerradoAt`, `puertaTiming`, `puertaSistema`, `atencionSnapshot` | `persistence.ts` · planilla por fecha |
| `PlanillaDailySnapshot` | `segmentosCerradosManual`, `segmentosTotales`, `segmentosEntropia`, `segmentos[].estado`, `disciplina`, `decisionesDelDia`, `psDesglose`, `espectroBloques` | `termodinamicaAtencional.ts` |
| `AtencionPanoramicaDia` | `puertasAbiertas`, `puertasPerdidas`, `cierresConscientes`, `indiceAtencion` | `atencionPanoramicaEngine.ts` |
| `CierreConscientePlanLedger` | `n` de cierres del operador en la última franja | `jornada4/cierrePlanSweep.ts` |
| `RevelacionPlanDia` | `minutosPlan`, `minutosPorConquistar` | `jornada4/revelacionPlanDia.ts` |
| `Vehicle` | `cierreAt`, `cierreManual`, `bonoTemple`, `energiaOscura`, `justificacion`, `ejes.*.trifecta`, `status` | `persistence.ts` |
| `CierreJornadaLog` | `selloEmitido`, `jornadaPlanMin`, `segmentosCerradosManual` | `persistence.ts` |
| `SesionUmbral` | historial / intentos | `shared/umbral/` — **opcional** |

Prioridad de lectura para puertas y plan: **planilla del día** → ledger de término → snapshot → sello diario.  
Si un día no tiene planilla ni snapshot: ese día no entra al denominador de Disposición / Disciplina / Término.

---

## 5. Léxico — cómo se llama lo que medimos

La psicología de este reporte es la de los Códigos, no la de un manual de hábitos.

### 5.0 Orden de instalación (el día, no el score)

Así entra la disciplina. El reporte presenta las virtudes **en este orden**, no por puntuación.

```
1. DISPOSICIÓN     planificar el anillo     → la energía se hace presente
2. DISCIPLINA      abrir y cerrar puertas   → la conciencia se ancla al tiempo
3. (ejecución)     integridad / temple / agencia
4. TÉRMINO         última puerta del anillo → el ciclo no hereda lastre a la noche
```

Nadie es disciplinado en la tarea si antes no fue disciplinado **en la puerta**.  
La puerta es estructura mental **sin ejecución**. El vehículo viene después.

### 5.0.1 Puerta

Gesto de abrir (`activadoAt`, no `puertaSistema`) y de cerrar (`estado === cerrado_manual`) cada segmento.  
Código: **C1 Atención** + **C4 Estructura**.  
Instala el sistema operativo del día. Sin puerta, el tiempo no tiene dueño.

### 5.0.2 Puerta del Término

La última franja del plan: el segmento de `horaFin` más tarde.  
Ya está en código:

```ts
/** Última franja del plan (la de horaFin más tarde). Ahí se prueba el carácter. */
resolveLastSegmentWindowMs(...)

/** El cierre consciente del operador en la última franja suma disciplina. El cierre del sistema no. */
isCierreConscienteAlTermino(...)
```

**Nombre del objeto:** Puerta del Término.  
**Nombre de la virtud:** **Término**.  
**Ley (ya escrita):** *ahí se prueba el carácter.*  
**Nombre del efecto:** **corte de carga**.

No es higiene del sueño. Es Código **C8 Ciclos**:

- Polo evolucionado (8.8): *el momento del cierre es tan importante como el de la apertura. Un ciclo bien cerrado es plataforma del siguiente.*
- Polo averiado (8.2, El Acumulador): *no puede cerrar ciclos; acumula etapas no resueltas como lastre.*

Al final del día la energía está baja. La conciencia no quiere cerrar ni la puerta ni el ciclo.  
Cerrar esa puerta **cuando no se quiere** es la prueba.  
Si se cierra: el ciclo no viaja a la cama. El sistema entra en vacío operable. La noche no hereda lastre.  
Si no se cierra: el Acumulador se lleva el día. Eso es carga, no “insomnio”.

El cierre del **sistema** al `horaFin` no cuenta. Solo el del operador.

### 5.0.3 Disposición

Planear los rings (segmentos) **antes** de ejecutar.  
Código: **C4 Estructura** — *el sistema operativo se instala, no se hereda.*

Con anillo plantado, la conciencia llega al día con energía disponible.  
Sin anillo, la energía no se presenta: no hay ley que la convoque.  
Eso no es “motivación”. Es voltaje que aparece cuando hay estructura.

---

## 6. Las 6 virtudes

Seis barras. Orden de instalación, no de importancia numérica.  
`null` = no medible (denominador 0). `null` no es 50.

Término **no se promedia** con Disciplina. El Arquitecto lo midió aparte: vale más que el resto de las puertas.

### 6.1 Disposición — el anillo plantado

**Pregunta:** ¿la conciencia tuvo ley antes de operar?

```
diaConAnillo = planilla.segmentos.length >= 3
             OR revelacion.minutosPlan >= 180
             OR cierreLog.jornadaPlanMin >= 180

coberturaDia = clamp(1, minutosPlan / MINUTOS_DIA_JORNADA)   // 1440
             // fallback: clamp(1, segmentos.length / 6)

Disposición = round(100 * (
  0.6 * (días con anillo / 7) +
  0.4 * media(coberturaDia de los días con dato)
))
```

Sin planillas, revelaciones ni `jornadaPlanMin` en toda la semana → `null`.

**Evidencia:** “Anillo plantado 5 de 7 días · cobertura media 9 h 20 min”.  
**Código:** C4.

### 6.2 Disciplina — puertas (abrir y cerrar)

**Pregunta:** ¿ancló la conciencia al tiempo, o el sistema abrió por él?

```
evaluables = segmentos cuya ventana ya terminó (en días con planilla o snapshot)

abiertas = evaluables con activadoAt
           AND puertaSistema !== true
           AND (puertaTiming != null OR disciplina.puertaManual === true)

cerradas = evaluables con estado === "cerrado_manual"

perdidas = evaluables con puertaPerdida / puertaSistema / estado === "entropia" sin cierre manual

Disciplina = round(100 * (0.5 * abiertas/evaluables + 0.5 * cerradas/evaluables))
```

Si no hay evaluables → `null`.  
Abrir sin cerrar baja la segunda rama. El sistema abriendo la puerta (`puertaSistema`) **no** suma.

Fallback si solo hay snapshot:  
`cerradas = Σ segmentosCerradosManual / Σ segmentosTotales`  
`abiertas = Σ atencionSnapshot.puertasAbiertas / Σ segmentosTotales` (si existe).  
`indiceDisciplina` del motor actual (cobertura + puntualidad de *entrada*) **no** sustituye esta virtud: mide otra cosa.

**Evidencia:** “14 puertas abiertas a tiempo · 11 cierres conscientes · 4 perdidas”.  
**Código:** C1 + C4.

### 6.3 Término — la última puerta

**Pregunta:** ¿cerró el ciclo cuando la energía ya no quería?

```
diasConTérminoPosible = días con anillo (última franja resoluble)

terminoConsciente = 
    último segmento.estado === "cerrado_manual"
 OR isCierreConscienteAlTermino(...) === true
 OR CierreConscientePlanLedger.n > 0 ese día

Término = round(100 * terminoConsciente / diasConTérminoPosible)
```

Sello diario (`selloEmitido`) **no** equivale a Término: el sello puede ser del sistema.  
Sin días con anillo → `null`.

**Evidencia:** “Puerta del Término cerrada 4 de 6 noches”.  
**Código:** C8.  
**Mandato si está baja:** una sola, la de §7.

### 6.4 Integridad — palabra en la ejecución

**Pregunta:** ¿cerró lo que abrió, o dejó que el tiempo lo archivara?

```
manuales = vehículos con cierreAt y cierreManual !== false
automaticos = vehículos con cierreAt y cierreManual === false
Integridad = round(100 * manuales / (manuales + automaticos))
```

Sin cierres de vehículo → `null`.  
Los segmentos ya no entran aquí: eso es Disciplina. Integridad es el vehículo.

**Evidencia:** “11 de 14 vehículos cerrados a mano”.  
**Código:** C7.

### 6.5 Temple — voluntad contra inercia

**Pregunta:** ¿actuó cuando no había estructura empujándolo?

```
templeLanzado = vehículos con bonoTemple === true / vehículos con cierreAt
reto = vehículos cumplidos con ≥1 eje trifecta "reto" / vehículos cumplidos
oscura = vehículos con energiaOscura === true / vehículos con cierreAt
Temple = round(100 * (0.4 * templeLanzado + 0.4 * reto + 0.2 * (1 - oscura)))
```

Ramas con denominador 0 se omiten y se renormalizan. Sin cierres → `null`.

**Evidencia:** “3 lanzamientos con bono temple · 2 misiones reto · 1 energía oscura”.  
**Código:** C8 (polo persistencia) + RETO del tronco.

### 6.6 Agencia — el tanque se llena al cerrar

**Pregunta:** ¿hubo decisiones, o el día pasó en vacío?

```
decisiones = Σ decisionesDelDia
           // fallback: conteo de cierres conscientes de vehículo
mediaDia = decisiones / max(días con evidencia de cierre o puerta, 1)
Agencia = clamp(0, 100, round(100 * mediaDia / 8))
```

RETO fallido sigue contando si el tronco lo trata como cierre válido.

**Evidencia:** “27 decisiones en 5 días (5.4/día)”.  
**Código:** C5.

---

## 7. Cosecha de la semana

Además de las 6 barras:

1. **Virtud alta** — mayor score no-nulo. Empate: Término > Disciplina > Disposición > Integridad > Temple > Agencia.
2. **Virtud baja (fricción)** — menor score no-nulo. Empate invertido (Agencia pierde primero; Término se declara baja si empata).
3. **Delta vs. semana sellada anterior** — por virtud. Primera semana: `null`. El valor interno es delta de conducta.
4. **Código de fricción** — mapa fijo:

| Virtud baja | Código | Acción mínima de la semana que entra |
|---|---|---|
| Disposición | C4 Estructura | Plantar el anillo de mañana **antes** de abrir el primer vehículo. Mínimo 3 segmentos. |
| Disciplina | C1 Atención | Abrir y cerrar a mano la próxima puerta. Si el sistema la abre, no cuenta. |
| Término | C8 Ciclos | Cerrar la Puerta del Término **antes** de que el sistema archive la última franja. Una noche basta para empezar el corte de carga. |
| Integridad | C7 Justicia | Cerrar a mano el próximo vehículo antes de que el segmento lo archive. |
| Temple | C8 Persistencia | Lanzar 1 vehículo fuera de segmento o 1 misión con eje RETO. |
| Agencia | C5 Cálculo | Declarar criterio de fin **antes** de abrir el siguiente vehículo. |

Si hubo sesión Umbral esa semana, se anota el cuello de `calcularMetricasUmbral` al pie. **No sustituye** la virtud baja.

5. **PS de la semana** — Σ `psDesglose.total`. Contexto, no virtud.

**No hay score total de “valor interno”.** El veredicto nombra la tensión.  
Término tiene prioridad de relato: si está baja, el mandato de Término **gana** aunque otra barra sea un punto más baja.

---

## 8. Veredicto — forma, no prosa libre

Tres bloques. En ese orden. Nada más.

```
1. Tensión (1 frase)
2. Evidencia (2–4 hechos con números de §6)
3. Mandato (1 acción de la tabla §7, literal)
```

Plantillas:

| Patrón | Condición | Tensión |
|---|---|---|
| **Carga** | Término ≤ 30 y (Disciplina o Agencia o Integridad) ≥ 60 | `Ejecutaste. El ciclo no se cerró. La noche heredó lastre.` |
| **Sin ley** | Disposición ≤ 30 y Disciplina o Agencia ≥ 50 | `Hubo ejecución sin anillo. La energía no fue convocada: apareció a ratos.` |
| **Puerta hueca** | Disciplina ≤ 30 y Agencia ≥ 60 | `Actuaste sin ancla. La tarea existió; el tiempo no tuvo dueño.` |
| Desequilibrio | alta ≥ 70 y baja ≤ 40 (si no aplica lo anterior) | `Esta semana tu {alta} cargó el peso; tu {baja} no apareció.` |
| Piso | todas las no-nulas < 40 | `Esta semana no faltó intención: faltó cierre.` |
| Techo | todas las no-nulas ≥ 70 | `Esta semana el ciclo se cerró. El mandato es no bajar el estándar.` |
| Delta | hay previa y \|delta de la baja\| ≥ 15 | `Tu {baja} {subió\|bajó} {n} puntos respecto de la semana anterior.` |
| Default | resto | `Esta semana tu {alta} estuvo por encima de tu {baja}.` |

Prioridad de patrón: Carga > Sin ley > Puerta hueca > Desequilibrio > Piso > Techo > Delta > Default.

### Gemini (Paso 5, opcional, posterior)

Solo reescribe el bloque 1 con scores, hechos y §9.  
Prohibido: cambiar números, inventar virtudes, clínica, más de 2 frases, lenguaje de `/metricas`.  
Si falla, plantilla. El sello no espera a la red.

---

## 9. Tono — psicología de los Códigos

La voz es la del Cerebro Escritor / Códigos. No la de un paper de rendimiento.

**Fuente permitida:** `server/knowledge/codigo-*.ts`, tronco de Jornada, léxico de §5.0.  
**Fuente prohibida:** `metricas-documento.tsx`, Big Five, higiene del sueño, neurociencia de divulgación.

**Obligatorio**

- Segunda persona. Pretérito de la semana (“cerraste la Puerta del Término”, no “se observa regulación emocional”).
- Cada adjetivo arrastra un número o no se usa.
- Valor interno = evidencia de ciclo. Canónico de Término: *“Cerraste la Puerta del Término 4 noches. El ciclo no viajó a la cama.”*
- Canónico de puertas: *“Abriste 14 puertas a tiempo. La conciencia tuvo dueño antes de ejecutar.”*
- Canónico de disposición: *“Plantaste el anillo 5 días. La energía tuvo ley.”*

**Léxico que sí**

territorio, ancla, puerta, anillo, ciclo, lastre, carga, corte, voltaje, ley, estructura, término, sello, fricción, RETO, soberanía, código.

**Léxico que no**

| Prohibido | Por qué |
|---|---|
| burnout, ansiedad, cortisol, alexitimia, TDAH, “tu cerebro”, mielinización | Clínica / `/metricas` |
| higiene del sueño, “duermes mejor”, melatonina | Traduce Término a wellness |
| motivación, bienestar, disciplina como rasgo, “eres constante” | Vetado en los Códigos |
| personalidad, tipo, perfil cognitivo | Congela al usuario |
| eres valioso, ánimo, orgullo de ti, confía en el proceso | Autoayuda |
| esfuerzo como virtud, prudencia como virtud | C3 / C5 |

Dormir “sin carga” se dice así: **el ciclo no heredó lastre**. No se promete calidad de sueño.

**INSUFICIENTE** (texto fijo):

> Esta semana no hubo evidencia suficiente para un espejo. El reporte no se inventa. Planta el anillo 3 días, o abre 3 puertas, o sella 2 jornadas.

---

## 10. Contrato de datos (Paso 2 implementa esto)

```ts
export type SemanaId = string; // "2026-W36"
export type EstadoReporte = "EN_CURSO" | "SELLADO" | "INSUFICIENTE";
export type VirtudId =
  | "disposicion"
  | "disciplina"
  | "termino"
  | "integridad"
  | "temple"
  | "agencia";

export interface EvidenciaVirtud {
  hechos: string[];
  numerador?: number;
  denominador?: number;
}

export interface ScoreVirtud {
  id: VirtudId;
  score: number | null;
  delta: number | null;
  evidencia: EvidenciaVirtud;
}

export interface ReporteSemanal {
  semanaId: SemanaId;
  estado: EstadoReporte;
  ventana: { inicioJournal: string; finJournal: string };
  virtudes: ScoreVirtud[]; // siempre 6, orden de instalación §5.0
  virtudAlta: VirtudId | null;
  virtudBaja: VirtudId | null;
  codigoFriccion: {
    codigo: 1 | 4 | 5 | 7 | 8;
    virtud: VirtudId;
    accionMinima: string;
  } | null;
  umbralCuello: { codigo: number; intentos: number } | null;
  psSemana: number;
  veredicto: {
    patron:
      | "carga"
      | "sin_ley"
      | "puerta_hueca"
      | "desequilibrio"
      | "piso"
      | "techo"
      | "delta"
      | "default"
      | "insuficiente";
    tension: string;
    evidencia: string[];
    mandato: string;
  };
  selladoAt: number | null;
}
```

Entrada del motor: planillas de la ventana, snapshots, vehículos, sellos diarios, ledgers de término, revelaciones, sesiones Umbral (opcional), reporte sellado previo (opcional).  
Salida: un `ReporteSemanal`. Función pura. Sin Firebase, sin Gemini, sin React.

---

## 11. Fuera de alcance (hasta que el paso lo nombre)

- Pantalla, ruta, menú, notificaciones push.
- Recalcular Analytics o el índice de soberanía actual.
- Nuevos campos en `Vehicle` / snapshots (las fuentes de §4 alcanzan).
- Persistencia Firestore (Paso 3).
- Reescribir `/metricas` al tono de los Códigos (paso aparte, si se pide).
- Radar de 10 códigos. Comparativa social. Score único.

---

## 12. Criterio de aceptación del Paso 2

Cuando este spec esté aceptado, el Paso 2 entrega:

1. `calcularReporteSemanal(input) → ReporteSemanal`.
2. Tests de: umbral A/B/C/D; cada fórmula con denominador 0; `puertaSistema` no suma Disciplina; cierre del sistema al `horaFin` no suma Término; patrones Carga / Sin ley / Puerta hueca; `INSUFICIENTE`; delta vs. previa; exclusión de centinelas; ventana lunes 05:00.
3. Cero UI. Cero llamadas de red.

Hasta entonces, este archivo es la única fuente de verdad.

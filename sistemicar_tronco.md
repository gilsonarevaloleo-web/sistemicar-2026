# 🔱 SISTEMICAR — ANCLA DE CONCIENCIA SISTÉMICA (V1.0)
> Este archivo representa el TRONCO ARQUITECTÓNICO INNEGOCIABLE de Sistemicar. Todo crecimiento de la plataforma debe ramificarse desde este núcleo estéril. Prohibido implantar parches defensivos, timers paranoicos, debounces de pánico o mutaciones síncronas que obstruyan la experiencia táctil.

## 🧠 I. EL PULSO DE RENDIMIENTO (REGLAS DE ORO)
1. **Fase ms0 (Prioridad Operador):** Todo tap o acción del usuario altera el estado local e indexado en el milisegundo cero (0ms). La interfaz responde de forma líquida e inmediata.
2. **Aislamiento en la Sombra (`runShadowTask` / `runShadowTaskAsync`):** Las escrituras pesadas en Firebase, inyección de Puntos de Soberanía (PS), diarios transaccionales y recálculos de historial corren en segundo plano mediante `requestIdleCallback` o macrotareas asíncronas.
3. **Audio Estéril Pasivo (`enqueueDesglosadorVoicePassive`):** La Web Speech API y los sonidos de la app jamás se ejecutan dentro del ciclo de vida o renders de React. Se despachan a una cola de audio externa en la sombra. Si el motor de Android o Chrome experimenta latencia, la UI permanece intacta.
4. **Zero-Cascading Renders:** La interfaz gráfica no computa ni calcula lógica de negocio en caliente. Solo mapea y renderiza colecciones estables pre-calculadas y aisladas a través de `useMemo` dentro del hook controlador.

## 🗺️ II. MAPA DE LA ARQUITECTURA (useDesglosadorManager.ts)

```mermaid
flowchart TB
  subgraph init [Inicialización]
    A[useFlotaVehiclesShallow + useFlotaMutator]
    B[registerFlotaMergeContext + refreshFlotaSession]
    C[Rehidratación optimista Fase 1]
    D[registerDesglosadorDepthReconciler]
    E[syncDesglosadorDepthActiveIds]
  end

  subgraph state [Estado centralizado]
    F[vehiclesRef + desglosadorSyncTimersRef]
    G[modales: expandedId, cierreEnergia*, celebrations]
    H[planilla + segmentoActivo internos]
  end

  subgraph compute [useMemo — cola estéril]
    I[flotaActivos via buildFlotaActivosRenderList]
    J[historialHoy / historialAnteriores / historialGrupos]
    K[situacionRetoAtascado + showEmergencyArchiveBanner]
  end

  subgraph core [Núcleo desglosador]
    L[handleDesglosadorUpdate]
    M[scheduleDesglosadorDepthOnTap periférico]
    N[reconcileDesglosadorDepthPS]
  end

  init --> state
  state --> compute
  L --> M
  D --> N
  compute --> O["return { vehicles, modales, handlers }"]
  core --> O
 III. FLUJO DE TOMA DE DECISIONES DE DATOSTap del Operador: Modificación en memoria → setFlotaVehicles() → notify() INMEDIATO (0ms).Firebase Snapshot (Red): Captura pasiva → setVehiclesBufferOnly() → Almacenamiento síncrono en disco duro (writeLocalFlota) → Notificación diferida a React mediante requestAnimationFrame ($rAF$). El hilo visual no se interrumpe por tráfico de red.SegmentAttention (Reloj): Se reduce estrictamente a emitir el pulso puro del cronómetro (dispatchConcienciaClockTick()). El bucle paranoico de inspección de CPU a 1s ha sido destruido.Evolución del Código: Cualquier nueva funcionalidad de control de disciplina, medición en tiempo real, entrenamientos inconscientes o reportes debe integrarse como una función pura dentro de la sombra o un nodo pasivo de datos en el hook, manteniendo VehicleCard.tsx y planeacion.tsx como espejos visuales estériles de alta velocidad. 
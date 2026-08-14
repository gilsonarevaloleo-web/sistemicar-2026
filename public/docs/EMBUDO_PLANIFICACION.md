# Embudo Jornada — Base → Ritmo → Norte

**Versión:** 2.0 · **Agosto 2026**  
**Alcance:** Jornada V4 / Planificación (no Espejo ni otros mundos).  
**Fuente de precios:** `shared/planificacionPricing.ts`

---

## 1. Tesis

El precio sigue la **madurez psicológica**, de lo fácil/urgente a lo valioso/largo plazo:

1. **Base** — medir unidades hoy (poco compromiso, urgencia).
2. **Ritmo** — estructurar el día e imprevistos (más compromiso).
3. **Norte** — Crisol + Hub Proyectos (alto valor; último peldaño).

> Una persona poco comprometida no valora apuntar ideas a largo plazo. Primero mide unidades.

Las capas son **apiladas**: el comprometido paga Base + Ritmo + Norte ≈ **$89.97/mes**.

---

## 2. Mapa de peldaños

```
PELDAÑO 1              PELDAÑO 2                    PELDAÑO 3
Urgente / fácil        Compromiso del día           Alto valor / horizonte
────────────────       ─────────────────────        ──────────────────────────
Jornada Base           + Ritmo del día              + Norte
$24.99/mes             + $29.99/mes                 + $34.99/mes

Necesidad:             Necesidad:                   Necesidad:
"¿Cuánto produje?"     "Ordeno el día y los         "Mis ideas van a un
                        imprevistos"                 proyecto con pasos"

Incluye:               Incluye:                     Incluye:
Conquista + PS         Segmentos + Situacional      Crisol + Hub Proyectos
```

| Stack | Módulos | Total/mes |
|-------|---------|-----------|
| Día con ritmo | Base + Ritmo | $54.98 |
| Con norte (completo) | Base + Ritmo + Norte | $89.97 |

IDs estables (webhooks): `planificacion_base` · `operativo` (Ritmo) · `soberania_dia` (Norte).

---

## 3. Inventario por peldaño

### 3.1 Jornada Base — $24.99

- Lanzar vehículos Conquista
- Desglosador Conquista (unidades y ritmo)
- PS al cerrar
- Métricas de cierre

### 3.2 Ritmo del día — +$29.99

- Segmentos del día
- Desglosador Situacional / Enfoque (ring y cupos)
- Pulso de cobertura y puertas

### 3.3 Norte — +$34.99 (último)

- El Crisol de Pensamientos (MOS)
- Hub Proyectos y pasos de fe
- Vínculo segmento → proyecto

---

## 4. Preguntas de autodiagnóstico (`/pagos`)

1. ¿Necesitas medir unidades y cerrar hoy? → Base  
2. ¿Quieres estructurar el día y sostener imprevistos? → + Ritmo  
3. ¿Tus ideas deben ir a un proyecto con pasos? → + Norte  

---

## 5. Reglas comerciales

- **No** vender Hub/Proyectos como gancho de entrada.
- Operativo/Ritmo **después** de habituar cierre de unidades.
- Norte es el peldaño más caro y el último en el embudo.
- Espejo es otro producto: packs de créditos (`espejo_inicio` / `espejo_recarga`). Corazón Sabio retirado.

---

## 6. Elevator pitch

> **Jornada SISTEMICAR** te hace cerrar el día con evidencia: unidades (Base), estructura e imprevistos (Ritmo), y proyectos con pasos (Norte). No es una lista — es un embudo de maduración: primero mides lo urgente, al final apuntas el horizonte.

---

*Documento maestro embudo Jornada · SISTEMICAR · v2.0*

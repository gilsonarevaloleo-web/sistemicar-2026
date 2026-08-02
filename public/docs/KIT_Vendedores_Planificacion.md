# Kit vendedores — Jornada SISTEMICAR

**Versión:** 2.0 · **Actualizado:** agosto 2026  
**Audiencia:** vendedores afiliados, closers, partners de distribución  
**Contacto operativo:** Gilson · WhatsApp +51 918 260 514  
**Documento maestro embudo:** `EMBUDO_PLANIFICACION.md`  
**Fuente de precios en código:** `shared/planificacionPricing.ts`  
**UI kit:** `/vendedores-planificacion` (lee `kitVendedoresPlanificacion.ts`)

**Categoría pública:** Motor de cierre consciente — no calendario ni lista de tareas.

---

## 1. Resumen en 30 segundos

Jornada V4 es un **embudo de maduración** (fácil → valioso):

1. **Jornada Base** ($24.99) — Conquista + PS (urgente: medir unidades)  
2. **Ritmo del día** (+$29.99) — segmentos + Situacional  
3. **Norte** (+$34.99) — Crisol + Hub Proyectos (**último**, alto valor)

**Apilado:** el comprometido paga ≈ **$89.97/mes** (Base + Ritmo + Norte).

**Espejo es otro producto.** Comisión **30% recurrente** mientras el cliente pague.

---

## 2. Comisión del vendedor

| Regla | Detalle |
|-------|---------|
| **Porcentaje** | **30%** del monto pagado |
| **Cuándo aplica** | Cada pago mensual de Base, Ritmo u Norte |
| **Cuándo se corta** | Si cancela / deja de pagar |
| **Espejo** | $17 único → ~$5.10 una vez |
| **Atribución** | Link con `ref=TU-CODIGO` en `/pagos` |

### Tabla por producto

| Producto | Precio | Comisión / mes |
|----------|--------|----------------|
| Jornada Base | $24.99 | ~$7.50 |
| Ritmo del día | $29.99 | ~$9.00 |
| Norte | $34.99 | ~$10.50 |
| Completo (3 capas) | $89.97 | ~$27.00 |
| Día con ritmo (Base+Ritmo) | $54.98 | ~$16.50 |

---

## 3. Embudo (peldaños × necesidad)

| Peldaño | Módulo | Precio | Necesidad | Identidad |
|---------|--------|--------|-----------|-----------|
| 1 | Jornada Base | $24.99 | ¿Cuánto produje? | Mido lo que cierro hoy |
| 2 | Ritmo del día | +$29.99 | Ordenar día e imprevistos | Ordeno el día |
| 3 | Norte | +$34.99 | Ideas → proyecto largo plazo | Mis ideas van a un proyecto |

**Regla:** no vendas Hub/Proyectos a quien aún no cierra unidades. Norte es el último peldaño.

### Preguntas `/pagos`

1. ¿Necesitas medir unidades y cerrar hoy? → Base  
2. ¿Quieres estructurar el día y sostener imprevistos? → + Ritmo  
3. ¿Ideas a un proyecto con pasos? → + Norte  

### Stacks

| Stack | Módulos | Total/mes | Comisión ~ |
|-------|---------|-----------|------------|
| Día con ritmo | Base + Ritmo | $54.98 | $16.50 |
| Con norte | Base + Ritmo + Norte | $89.97 | $27.00 |

---

## 4. IDs técnicos (no cambiar)

| Comercial | ID checkout / módulo |
|-----------|----------------------|
| Jornada Base | `planificacion_base` |
| Ritmo del día | `operativo` |
| Norte | `soberania_dia` |

---

## 5. Lista roja

- Precios que no están en `/pagos`
- "Todo SISTEMICAR incluido"
- Vender Hub como gancho de entrada
- Comisión si el cliente cancela

---

## 6. Guion corto

1. Base mide unidades.  
2. Ritmo ordena el día.  
3. Norte apunta al proyecto.  
4. Comprometido ≈ $89.97/mes.

---

*Kit vendedores Jornada · SISTEMICAR · v2.0*

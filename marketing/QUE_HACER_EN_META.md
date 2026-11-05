# Qué debes hacer tú: publicar Jornada Base en Facebook

La web ya une Facebook, el video, la landing corta y el checkout.  
Tú publicas **una campaña, un conjunto, un anuncio**.

No crees 2 campañas. No impulsés desde el perfil. No mandes el clic a WhatsApp.  
No pegues esta URL a `/ventas-jornada` (esa es la carta larga, para quien ya mide).

---

## Cómo se sincronizan (no hay un plugin extra)

```
VIDEO  (Ads Manager)
        │
        │  clic → Facebook agrega fbclid solo
        ▼
/jornada-base?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base
        │
        ├─ Pixel ViewContent  →  “Jornada Base”
        ├─ se guarda utm + fbclid en el celular
        │
        └─ ACTIVAR MI JORNADA AHORA  →  /pagos?plan=planificacion_base  →  Purchase
```

**Facebook** sabe quién convirtió porque:

1. El anuncio tiene esta URL (`utm_campaign=jornada_base`).
2. Facebook agrega `fbclid` al clic. El Pixel (ID `1066497298319685`) vive en `sistemicar.app`.
3. Al registrarse, Advanced Matching manda el email. Al pagar, `Purchase` con $24.99.

**La página** copia `utm_*` y `fbclid` al checkout.

No pegues el video en la landing. El video se ve en Facebook; el clic abre la carta corta.

---

## 0. Espera a que la landing esté en producción

Abre esta URL en el celular **antes** de pagar el anuncio:

```
https://sistemicar.app/jornada-base?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base
```

Debes ver:

1. El titular: no disciplina — fuga invisible en tu tiempo. **Sin** la palabra telemetría.
2. Arriba, la captura del cronómetro en «Pegado de etiqueta», 09:06, 18 unidades, Termina a las 21:59.
3. Un solo precio: **$24.99/mes**. Sin Ritmo, Dirección ni Universidad.
4. El botón dorado **ACTIVAR MI JORNADA AHORA — $24.99/mes**.

Si da 404, el deploy todavía no salió. No gastes plata.

Copia lista: `marketing/copys-meta-jornada.md`.  
Guion de video: `marketing/guion-video-jornada-base.md`.

---

## 1. Cuenta de anuncios y Pixel

1. Entra a [https://adsmanager.facebook.com](https://adsmanager.facebook.com).
2. Si te pide Administrador comercial, créalo. Sin tarjeta no se publica.
3. Conecta la página de Facebook y el Instagram de Sistemicar.

El Píxel **ya está en la web** (ID `1066497298319685`). En Events Manager debe verse:

**Las dos conversiones que Meta usa para ubicar públicos:**

- `CompleteRegistration` — el usuario se registra con Google (`/acceso`, `/bienvenida`). Lleva el email (Advanced Matching) para que Meta sepa quién es.
- `Purchase` — el usuario paga y Mercado Pago lo devuelve a `/pagos?status=success&plan=…`. Valor real del plan (Jornada Base $24.99).

**El resto del embudo:**

- `PageView` en todas las páginas
- `ViewContent` en `/jornada-base`
- `InitiateCheckout` en `/pagos?plan=planificacion_base`

### Evento de optimización (presupuesto bajo)

Al inicio **no** optimices por `Purchase`. Con $10–15/día el algoritmo no tiene datos suficientes.

Usa **Ver contenido** (`ViewContent`) o **Clic al enlace**.  
Recién después de 2 semanas, si hay pagos, evalúa cambiar a `Purchase`.

Si Events Manager no muestra el pixel o dice “no recibe eventos”, el plugin **no está vigente** del lado de Meta (cuenta, dominio o pixel pausado). El código de la web sí dispara.

---

## 2. UNA campaña, UN conjunto, UN anuncio

**Crear** → objetivo **Ventas / Conversiones** (no Mensajes). Evento: `ViewContent`.

| Nivel | Nombre | Qué es |
|---|---|---|
| Campaña | `jornada_base_dia_sin_numero` | Una sola |
| Conjunto | `amplia_25_55` | Audiencia amplia |
| Anuncio | `jornada_base_video` | Un video + la URL de `/jornada-base` |

Un solo mensaje: Jornada Base, $24.99. Sin Ritmo, Dirección ni Universidad.

Si más adelante quieres comparar dos videos, usa las URLs `utm_content=video_a` y `video_b` en el **mismo** conjunto. No al primer dólar.

---

## 3. Conjunto (a quién le llega)

| Campo | Qué pones |
|---|---|
| Nombre | `amplia_25_55` |
| Ubicaciones | Perú |
| Edad | 25–55 |
| Género | Todos |
| Idioma | Español |
| Intereses | Advantage+ / automático. No satures de intereses. |
| Presupuesto | **$10–15 por día**. Diario, no vitalicio. |
| Duración | 10–14 días antes de evaluar. |

Con presupuesto bajo, segmentar mucho frena el aprendizaje del algoritmo.  
No excluyas ciudades. No armes 15 intereses.

---

## 4. El anuncio (el video)

1. Formato: **video** vertical (9:16). Sube el archivo desde tu celular o computadora.
2. Destino del clic: pega la URL **completa** del paso 0.
3. Texto: el de `marketing/copys-meta-jornada.md`.
4. Título: `No tienes un problema de disciplina.`
5. Descripción: `Mide dónde se va tu día. Menos de $1 al día.`
6. Botón: **Más información** (no Comprar, no WhatsApp).
7. Vista previa: el toque abre `sistemicar.app/jornada-base`, no el chat.

No pongas el video en la landing.

---

## 5. Publica y no toques nada 48 horas

Meta aprueba en minutos o en unas horas.  
Si rechazan: el texto no promete ingresos. Recorta a las 4 primeras líneas y reenvía.

No edites cada hora. Cada edición reinicia el aprendizaje.

---

## 6. Cómo saber si funciona

En Ads Manager, mira el anuncio (no solo la campaña):

| Señal | Bien | Mal |
|---|---|---|
| Clics a la landing | Hay clics | 0 clics en 3 días → el gancho no para el scroll |
| ViewContent | Events Manager muestra el evento | Llegan sin `utm_campaign` → pegaste mal la URL |
| Costo por clic / por ViewContent | A los 7 días lo anotas | No evalúes a los 2 días |
| Registro / pago | CompleteRegistration o Purchase | Clics sin pago → el close de la carta no cerró |

A los **7 días**: revisa costo por clic y costo por «ver contenido».  
A los **10–14 días**: recién ahí decides si subes presupuesto o cambias el evento a `Purchase`.  
No subas presupuesto a los 2 días. No publiques Ritmo ni Norte todavía.

---

## 7. Lo que no hagas

- No 2 campañas.
- No impulsos desde Instagram.
- No tu WhatsApp en el anuncio.
- No cambies la URL a `/pagos`, `/vendedor` ni `/ventas-jornada`. La puerta es `/jornada-base`.
- No menciones Ritmo, Dirección ni Universidad en el anuncio.

Cuando tengas la primera llamada o el primer pago, avisas y armamos el siguiente paso.

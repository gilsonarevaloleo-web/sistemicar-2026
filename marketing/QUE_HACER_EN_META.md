# Qué debes hacer tú: publicar los 2 videos de Jornada Base

La web ya une Facebook, el video, la landing y el vendedor.  
Tú solo publicas **una campaña con dos anuncios** (un video cada uno).

No crees 2 campañas. No impulsés desde el perfil. No mandes el clic a WhatsApp.

---

## Cómo se sincronizan (no hay un plugin extra)

```
VIDEO A o VIDEO B  (Ads Manager)
        │
        │  clic → Facebook agrega fbclid solo
        ▼
/ventas-jornada?utm_content=video_a  (o video_b)
        │
        ├─ Pixel ViewContent  →  “Jornada Base · VIDEO A”
        ├─ se guarda el video en el celular (utm + fbclid)
        │
        ├─ ACTIVAR JORNADA BASE   →  /pagos?plan=planificacion_base  →  Purchase
        └─ QUE ME LLAME           →  /vendedor (JORNADA, código 3)  →  Lead + llamada
```

**Facebook** sabe qué video convirtió porque:

1. Cada anuncio tiene su propia URL (`utm_content=video_a` vs `video_b`).
2. Facebook agrega `fbclid` al clic. El Pixel (ID `1066497298319685`) vive en `sistemicar.app`.
3. Al registrarse, Advanced Matching manda el email. Al pagar, `Purchase` con $24.99.

**La página** copia `utm_*` y `fbclid` a vendedor y checkout.  
**El vendedor** llega con Jornada Base ya fijada (código 3) y el admin ve `VIDEO A` o `VIDEO B` junto a la llamada.

No pegues el video en la landing. El video se ve en Facebook; el clic abre la página.

---

## 0. Espera a que la landing esté en producción

Abre **las dos** URLs en el celular **antes** de pagar el anuncio:

**VIDEO A**

```
https://sistemicar.app/ventas-jornada?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base&utm_content=video_a
```

**VIDEO B**

```
https://sistemicar.app/ventas-jornada?utm_source=facebook&utm_medium=paid&utm_campaign=jornada_base&utm_content=video_b
```

En cada una debes ver:

1. El titular de telemetría (no disciplina: fuga de tiempo).
2. Arriba, en letra chica: `ANUNCIO · VIDEO A` o `VIDEO B`.
3. El botón dorado **ACTIVAR JORNADA BASE · $24.99/mes**.
4. **QUE ME LLAME** → vendedor con La Jornada ya fijada y el mismo `ANUNCIO · VIDEO A/B`. Sin trial.

Si da 404, el deploy todavía no salió. No gastes plata.

Copia lista: `marketing/copys-meta-jornada.md`.

---

## 1. Cuenta de anuncios y Pixel

1. Entra a [https://adsmanager.facebook.com](https://adsmanager.facebook.com).
2. Si te pide Administrador comercial, créalo. Sin tarjeta no se publica.
3. Conecta la página de Facebook y el Instagram de Sistemicar.

El Píxel **ya está en la web** (ID `1066497298319685`). En Events Manager debe verse:

**Las dos conversiones que Meta usa para ubicar públicos:**

- `CompleteRegistration` — el usuario se registra con Google (`/acceso`, `/bienvenida`). Lleva el email (Advanced Matching) para que Meta sepa quién es.
- `Purchase` — el usuario paga y Mercado Pago lo devuelve a `/pagos?status=success&plan=…`. Valor real del plan (Jornada Base $24.99). No depende de `/gracias-compra`.

**El resto del embudo (lleva VIDEO A o VIDEO B):**

- `PageView` en todas las páginas
- `ViewContent` en `/ventas-jornada`
- `Lead` cuando el prospecto deja teléfono (vendedor) o se anota
- `InitiateCheckout` en `/pagos?plan=planificacion_base`

En el anuncio, objetivo **Conversiones** (no solo Tráfico) y evento de optimización: `Purchase`. Si aún no hay pagos, usa `CompleteRegistration`.

Si Events Manager no muestra el pixel o dice “no recibe eventos”, el plugin **no está vigente** del lado de Meta (cuenta, dominio o pixel pausado). El código de la web sí dispara.

---

## 2. UNA campaña, UN conjunto, DOS anuncios

**Crear** → objetivo **Ventas / Conversiones** (no Tráfico, no Mensajes).

| Nivel | Nombre | Qué es |
|---|---|---|
| Campaña | `jornada_base_dia_sin_numero` | Una sola |
| Conjunto | `peru_duenos_25_55` | A quién le llega |
| Anuncio 1 | `jornada_base_video_a` | Tu primer video + URL A |
| Anuncio 2 | `jornada_base_video_b` | Tu segundo video + URL B |

Desactiva el A/B test oficial de Meta. Los dos anuncios viven **en el mismo conjunto**: Meta gasta más en el video que convierta.

---

## 3. Conjunto (a quién le llega)

| Campo | Qué pones |
|---|---|
| Nombre | `peru_duenos_25_55` |
| Ubicaciones | Perú |
| Edad | 25–55 |
| Género | Todos |
| Idioma | Español |
| Intereses | Advantage+ / automático. Si te obliga: “pequeña empresa”. |
| Presupuesto | **S/ 20–30 por día**. Diario, no vitalicio. |
| Duración | Continua. A los 7 días miramos. |

No agregues 15 intereses. No excluyas ciudades.

---

## 4. Los dos anuncios (los videos)

Para **cada** video:

1. Formato: **video** vertical (9:16). Sube el archivo desde tu celular o computadora.
2. Destino del clic: pega la URL **completa** de ese video (arriba, paso 0).  
   El anuncio A **no** puede usar la URL B.
3. Texto: el de `copys-meta-jornada.md` (puedes usar el mismo en los dos).
4. Título: `No tienes un problema de disciplina.`
5. Descripción: `Telemetría de unidades. El día termina con evidencia.`
6. Botón: **Más información** (no Comprar, no WhatsApp).
7. Vista previa: el toque abre `sistemicar.app/ventas-jornada`, no el chat.

No pongas los dos videos en un solo anuncio (carrusel). Un archivo = un anuncio.

---

## 5. Publica y no toques nada 48 horas

Meta aprueba en minutos o en unas horas.  
Si rechazan: el texto no promete ingresos. Recorta a las 4 primeras líneas y reenvía.

No edites cada hora. Cada edición reinicia el aprendizaje.

---

## 6. Cómo saber cuál video funciona

En Ads Manager, desglosa por **Anuncio** (no por campaña):

| Señal | Bien | Mal |
|---|---|---|
| Clics a la landing | Hay clics en A o B | 0 clics en 3 días → el gancho no para el scroll |
| ViewContent VIDEO A/B | Events Manager muestra el video | Llegan sin `utm_content` → pegaste mal la URL |
| Lead / llamada | Admin muestra `VIDEO A` o `VIDEO B` | Llegan y se van → el teléfono da miedo |
| Registro / pago | CompleteRegistration o Purchase | Clics sin pago → el close de la carta no cerró |

A los **7 días**: deja prendido el que trajo llamadas o pagos. Pausa el otro.  
No subas presupuesto a los 2 días. No publiques Ritmo ni Norte todavía.

---

## 7. Lo que no hagas

- No 2 campañas (una por video). Meta no compara bien y gastas doble.
- No impulsos desde Instagram.
- No tu WhatsApp en el anuncio: el vendedor algoritmo recibe al cliente.
- No cambies la URL a `/pagos` ni `/vendedor`. La puerta es `/ventas-jornada`.

Cuando tengas la primera llamada o el primer pago, avisas y armamos el siguiente paso.

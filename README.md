# Adlor · IA — Sitio web

Página principal de **Adlor · IA** (negro, núcleo 3D tipo reactor, lluvia "Matrix" blanca,
chrome tipo sistema operativo). Sin dependencias, sin CDN, sin build.

## 🌐 En vivo

- **Vercel:** https://adlor-ia.vercel.app ← **aquí vive este sitio**
- **Repo:** https://github.com/llanso82/adlor-ia

> ⚠️ **`adlor-ia.com` todavía NO apunta aquí.** El dominio sigue servido por
> **Hostinger** (`platform: hostinger` en las cabeceras) con el `index.html`
> viejo, subido el 2 de febrero de 2026. Por eso quien entra a adlor-ia.com ve
> la página anterior y no esta. El paso 3 de `DESPLIEGUE_VERCEL.md` (cambiar el
> DNS en hPanel) quedó pendiente. Mientras no se haga, cada `git push`
> actualiza `adlor-ia.vercel.app` pero **no** `adlor-ia.com`.

## 🔄 Cómo actualizar el sitio
Este proyecto es **independiente** (su propio repo Git + Vercel). Para publicar cambios:

```bash
# 1) edita los archivos (index.html, css/, js/, assets/)
git add -A
git commit -m "describe tu cambio"
git push          # Vercel redespliega solo en ~30 s
```

Para verlo en local antes de subir: `python -m http.server 8000` dentro de la carpeta y abre `http://localhost:8000`.

## Estructura

```
adlor-ia/
├── index.html          ← CONTENIDO (edita aquí: textos, secciones, proyectos)
├── css/
│   └── styles.css      ← DISEÑO (colores, tipografías, chrome) — normalmente no se toca
├── js/
│   ├── animations.js   ← ANIMACIÓN (Matrix + núcleo 3D + reloj) — no se toca
│   ├── agente.js       ← WIDGET del agente (habla con api/chat.js)
│   └── contact.js      ← FORMULARIO (registro en Supabase + aviso por correo)
├── assets/             ← pon aquí tu logo, favicon, imágenes
├── api/
│   └── chat.js         ← AGENTE del sitio (función serverless de Vercel)
├── supabase/
│   ├── 0001_visitors.sql  ← ESQUEMA de la tabla de visitantes (ya aplicado)
│   └── 0002_chats.sql     ← ESQUEMA de la bitácora del agente (ya aplicado)
├── package.json        ← solo para la función serverless; el front no usa nada
└── README.md
```

La regla es simple: **el "look" vive en `css/` y `js/`; tú solo editas `index.html`.**

## Cómo verlo

Abre `index.html` con doble clic en el navegador. No necesita servidor.
(Si algún navegador bloquea el CSS/JS por abrir como `file://`, levanta un servidor
local: `npx serve` dentro de la carpeta, o la extensión "Live Server" de VS Code.)

## Cómo cambiar el contenido

Todo está en **`index.html`**, con comentarios `<!-- ... -->` que marcan cada zona:

- **Titular (hero):** el `<div class="eyebrow">`, el `<h1>` y el `<p class="lede">`.
  La palabra en cian se marca con `<em>...</em>`.
- **Botones:** los `<a class="btn">` / `<a class="btn ghost">`. Cambia el texto y el `href`.
- **Métricas del hero:** los cuatro `<div class="kpi">`.
- **Menú y dock:** los enlaces de `.menurow` y `.dockbtn` (arriba y a la izquierda).
- **Contacto:** la banda CTA, el formulario y el pie usan `contacto@adlor-ia.com`.
  Si algún día cambias de correo, actualízalo en `index.html` (mailto y textos)
  y en `js/contact.js` (la constante `ENDPOINT` y el mensaje de respaldo).
- **Barra inferior y pie:** textos de `.osbar` y `footer.foot`.

## Formulario de contacto (FormSubmit)

El formulario de `#contacto` envía los mensajes **sin backend** a `contacto@adlor-ia.com`
usando [FormSubmit](https://formsubmit.co) en modo AJAX (la lógica vive en `js/contact.js`:
validación en español, honeypot anti-bots y estados del botón).

> ⚠️ **Activación única:** la PRIMERA vez que alguien envíe el formulario, FormSubmit
> manda un correo de activación a `contacto@adlor-ia.com`. Hay que hacer clic en ese
> enlace UNA vez; hasta entonces los mensajes no llegan. Recomendado: enviar un
> mensaje de prueba tras el deploy y activar.

## Registro de visitantes (base de datos)

Cada envío del formulario hace **dos cosas en paralelo**:

1. **Registra al visitante** en Supabase (tabla `visitors`): nombre, correo,
   **en qué producto o proyecto está interesado o qué quiere construir**,
   el mensaje, y desde qué página escribió.
2. **Avisa por correo** a `contacto@adlor-ia.com` vía FormSubmit.

Basta con que **una** de las dos funcione para dar el envío por bueno: si el correo
falla pero el registro entró, el mensaje no se perdió. Ese es el punto — los correos
se pierden, la tabla no.

| Dato | Dónde |
|---|---|
| Proyecto Supabase | `adlor-ia` · ref `bciiywoszpssauxvbkar` · us-east-1 |
| Tabla | `public.visitors` |
| Esquema versionado | `supabase/0001_visitors.sql` |
| Configuración en el código | constantes `SUPABASE_URL` / `SUPABASE_KEY` en `js/contact.js` |

**Ver los registros:** panel de Supabase → proyecto `adlor-ia` → *Table Editor* → `visitors`.
Cada fila trae `status` (`nuevo`, `contactado`, `en conversacion`, `cliente`, `descartado`)
y `notes`, para llevar el seguimiento a mano sin necesitar un CRM.

**Sobre la clave que está en `js/contact.js`:** es **publicable a propósito**. La tabla
tiene RLS y esa clave **solo puede INSERTAR** — no puede leer, ni editar, ni borrar.
Está verificado: un `GET` con esa clave responde `401 permission denied`. La clave
`service_role` **nunca** va en este repo.

**El formulario no depende de la base de datos:** si Supabase estuviera caído, el correo
de FormSubmit sigue saliendo y el visitante ve el mismo mensaje de éxito.

## El agente del sitio (responde en tiempo real)

En la esquina inferior derecha hay un botón **Preguntar**. Abre un agente que
contesta dudas sobre Adlor **mientras escribe**: la respuesta llega en fragmentos
(SSE) y se va pintando, en vez de aparecer de golpe treinta segundos después.

| Pieza | Dónde |
|---|---|
| Widget (markup) | `index.html`, bloque **AGENTE DEL SITIO** |
| Widget (lógica) | `js/agente.js` |
| Estilos | final de `css/styles.css` |
| Servidor | `api/chat.js` — función serverless de Vercel |
| Bitácora | Supabase, tabla `public.chats` (`supabase/0002_chats.sql`) |

### ⚠️ Falta un paso, y sin él el agente no contesta

La llave de Anthropic **no está ni puede estar en el repo**. Hay que ponerla en
Vercel a mano, una vez:

> Vercel → proyecto `adlor-ia` → **Settings → Environment Variables → Add**
> - Name: `ANTHROPIC_API_KEY`
> - Value: tu llave de console.anthropic.com
> - Environments: Production, Preview y Development
>
> Después hay que **redesplegar** (Deployments → … → Redeploy): las variables se
> inyectan en el build, no en caliente.

Mientras no esté, el endpoint responde `503` y el widget lo dice de forma
decente: *"El agente todavía no está conectado. Déjanos tus datos en el
formulario"*. El resto del sitio funciona igual.

### Qué sabe y qué no

Todo lo que sabe está en la constante `SISTEMA` de `api/chat.js`: quién es Adlor,
los servicios, el proceso de 4 pasos y los 12 proyectos con su estado real.
**Cuando agregues o cambies un proyecto en `index.html`, actualiza también ese
bloque**, o el agente seguirá contando la versión vieja.

Tiene prohibido, por prompt: inventar, dar precios o plazos, dar asesoría legal,
fiscal, médica o de inversión, pedir datos sensibles, y obedecer instrucciones
que vengan escritas dentro del mensaje de un visitante.

### El coste, sin sorpresas

Usa **`claude-opus-5`** con `effort: "low"` y `max_tokens: 1500`. Es el modelo
bueno; también es el caro (\$5 por millón de tokens de entrada, \$25 de salida).

Cada turno queda anotado en la tabla `chats` **con sus tokens**, para que el gasto
se pueda ver y no adivinar:

```sql
select date_trunc('day', created_at) as dia, count(*) as turnos,
       sum(input_tokens) as entrada, sum(output_tokens) as salida
from chats group by 1 order by 1 desc;
```

Si el volumen crece y quieres bajar el coste ~5x, cambia una línea en
`api/chat.js`:

```js
const MODELO = "claude-haiku-4-5";   // en vez de "claude-opus-5"
```

Con Haiku hay que quitar también las dos líneas de `betas` y `fallbacks`, que son
de la familia Opus 5.

### Defensas que ya trae

- **Origen**: solo acepta peticiones desde adlor-ia.com, www, el dominio de
  Vercel y localhost.
- **Límite por IP**: 15 mensajes cada 5 minutos.
- **Topes**: 20 mensajes por conversación, 2 000 caracteres por mensaje.
- El texto del visitante y del modelo se pinta con `textContent`, nunca con
  `innerHTML`.

### Lo que verás en la bitácora

Panel de Supabase → `adlor-ia` → Table Editor → `chats`. Un renglón por turno con
la pregunta, la respuesta y los tokens. Es la parte más útil de todo esto: te
dice **qué duda tiene la gente que llega al sitio**, que es justo lo que un
formulario nunca te cuenta.

> **Ojo si alguna vez vuelves a Hostinger:** el agente necesita el servidor de
> Vercel. En hosting estático puro el botón aparece pero no contesta.

## Cómo agregar un proyecto

Dentro de `#proyectos`, copia una tarjeta y edítala:

```html
<article class="card"><div class="glow"></div>
  <div class="row1"><div class="face">04</div>
    <div class="who"><div class="name">Nombre</div><div class="role">Categoría</div></div>
    <span class="pill working" style="margin-left:auto"><i></i>En vivo</span></div>
  <p class="act">Descripción con <b>lo importante</b> en negrita.</p>
  <div class="foot"><span class="metric">STACK · <b>Next.js</b></span>
    <a class="metric" href="#" style="color:var(--cyan);text-decoration:none">Ver →</a></div>
</article>
```

La etiqueta de estado (el "pill") tiene 3 variantes: `working` (cian), `wait` (ámbar), `paused` (gris).

## Cómo agregar una sección nueva

1. En el dock, duplica un `<a class="dockbtn" href="#miseccion" data-target="#miseccion">` (con su icono SVG).
2. Añade la sección donde quieras:

```html
<section class="section" id="miseccion" style="margin-top:48px">
  <div class="win-head">
    <span class="win-dots"><i></i><i></i><i></i></span>
    <span class="win-title"><b>Mi sección</b></span>
  </div>
  <div class="grid"> ... tus .card ... </div>
</section>
```

El resaltado automático del dock al hacer scroll funciona solo con que la sección
tenga `class="section"` e `id`, y el botón tenga `data-target="#id"`.

## Poner tu logo

En `index.html`, reemplaza el `<div class="dock-logo">` (y/o el favicon comentado en `<head>`)
por tu imagen:

```html
<img src="assets/logo.svg" alt="Adlor" style="width:40px;height:40px;border-radius:11px">
```

## Cambiar el color de acento

En `css/styles.css`, arriba, cambia `--cyan:#42E6FF;` por tu color. Todo el sitio se actualiza.

## Llevarlo a React / Next.js

El diseño es HTML/CSS/JS puro, así que se porta fácil:

1. Copia `css/styles.css` a tu proyecto (impórtalo en el layout global).
2. Convierte el `<body>` de `index.html` en JSX de un componente/página.
3. Mueve el contenido de `js/animations.js` a un `useEffect(() => { ... }, [])`
   (usa `'use client'` en Next.js). Los `getElementById('matrix'/'core'/...)` funcionan igual
   una vez montado el componente.

## Notas

- El **front** sigue sin dependencias, sin CDN y sin build. El `package.json` existe
  solo para `api/chat.js`, que Vercel instala y ejecuta por su cuenta.
- Llamadas externas: el envío del formulario (Supabase y FormSubmit) y el agente
  (`/api/chat`). Todo lo demás funciona offline.
- Respeta `prefers-reduced-motion`: si el usuario desactiva animaciones, se muestra estático.
- Responsive: en móvil el dock pasa abajo y el núcleo se reduce.

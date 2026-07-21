# Desplegar adlor-ia.com en Vercel

Sitio **estático** (HTML/CSS/JS, sin build). El dominio se queda en **Hostinger**;
solo apuntamos el DNS a Vercel. Tiempo total: ~10 min.

---

## Paso 1 — Subir el código a GitHub

Ya está inicializado como repositorio git con un primer commit. Falta crear el
repo remoto y hacer push.

1. En GitHub, crea un repositorio nuevo llamado **`adlor-ia`** (vacío, sin README).
2. En una terminal, dentro de esta carpeta, conecta y sube:

```powershell
git remote add origin https://github.com/TU_USUARIO/adlor-ia.git
git branch -M main
git push -u origin main
```

(Reemplaza `TU_USUARIO` por tu usuario de GitHub.)

---

## Paso 2 — Importar en Vercel

1. Entra a https://vercel.com → **Add New… → Project**.
2. Importa el repositorio **`adlor-ia`**.
3. Vercel detecta **"Other / No Framework"** (correcto — es estático).
   - Framework Preset: **Other**
   - Build Command: *(vacío)*
   - Output Directory: *(vacío / raíz)*
4. **Deploy.** En segundos tendrás una URL tipo `adlor-ia.vercel.app`.

> Para futuras actualizaciones: editas los archivos, haces `git push`, y Vercel
> vuelve a desplegar solo.

---

## Paso 3 — Conectar tu dominio adlor-ia.com

### En Vercel
1. Proyecto → **Settings → Domains → Add**.
2. Escribe `adlor-ia.com` (y también `www.adlor-ia.com` si lo quieres).
3. Vercel te mostrará los registros DNS exactos que debes poner. Normalmente:
   - **A** `@` → `76.76.21.21`
   - **CNAME** `www` → `cname.vercel-dns.com`

   ⚠️ Usa **siempre los valores que muestre TU panel de Vercel**, por si cambian.

### En Hostinger
1. hPanel → **Dominios → Zona DNS** (DNS Zone) de `adlor-ia.com`.
2. Edita/crea el registro **A** de `@` con la IP que te dio Vercel
   (borra otros registros `A` de `@` que apunten a otro lado).
3. Crea el **CNAME** de `www` apuntando a `cname.vercel-dns.com`.
4. Guarda.

La propagación tarda de minutos a un par de horas. Cuando Vercel detecte el DNS,
activa el **HTTPS/SSL automático**. ✅

---

## Notas
- No necesitas ningún plan de hosting de Hostinger: el dominio basta.
- El SSL (candado) lo pone Vercel gratis, no hay que configurarlo.
- Si algún día conviertes el sitio a Next.js, este mismo proyecto de Vercel lo soporta.

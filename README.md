# Kraken — complemento Stremio

Agregador en español: **Peerflix**, **Torrentio**, **TorrentClaw**, indexadores ES, **Palantir** (catálogo moria) y debrid (Real-Debrid / AllDebrid).

## Instalar en Stremio

**Ajustes → Complementos → URL del complemento:**

| Entorno | URL |
|---------|-----|
| **Fly.io** | `https://TU-APP.fly.dev/manifest.json` |
| **Local** | `http://127.0.0.1:7000/manifest.json` |

Configuración: misma URL con `/configure` en lugar de `manifest.json`.

## Uso local

```bash
npm install
npm start
```

Copia `.env.example` a `.env` (no lo subas a Git).

```bash
npm test
npm run test:palantir
npm run test:palantir:catalog
```

## Palantir (moria)

Kraken lee la SQLite **moria** del addon Kodi Palantir 3 (películas, series, enlaces cifrados). En el servidor define `PALANTIR_MORIA_DB` o sube la BD a Fly.

**Extraer desde Kodi:**

```bash
node scripts/moria-extract.js "C:\ruta\moria.cm3" "C:\ruta\moria.db"
```

En `.env`: `PALANTIR_MORIA_DB=C:\ruta\moria.db`. Ruta típica en Windows: `%APPDATA%\Kodi\userdata\addon_data\script.module\settings.xml` o `moria.cm3` del addon.

**Fly.io:**

```powershell
fly volumes create moria_data --region mad --size 2
fly deploy
.\scripts\upload-moria-fly.ps1 -Source "C:\ruta\moria.cm3"
```

Sin subida manual, al arrancar puede descargarse el `.zm3` público (`PALANTIR_MORIA_ZM3_URL`); suele ir detrás del `moria.cm3` de tu Kodi.

En Stremio: activa **Incluir Palantir** y **AllDebrid** (enlaces 1fichier).

## Fly.io

```bash
fly auth login
fly launch
fly deploy
```

Secret `FLY_API_TOKEN` para GitHub Actions. Comprueba: `curl https://TU-APP.fly.dev/health.json`

## Estructura

```
addon.js  config.js  fly.toml  Dockerfile
lib/      public/    scripts/
```

## Requisitos

- Node.js **18+**
- Stremio **escritorio**

## Seguridad

Las API keys de debrid solo en `/configure`, nunca en el repositorio.

## Licencia

[GNU GPL v3](LICENSE)

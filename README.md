# Kraken — complemento Stremio

Agregador en español: **Peerflix** (prioridad), **Torrentio**, **TorrentClaw**, indexadores ES y debrid (Real-Debrid / AllDebrid).

## Instalar en Stremio

**Ajustes → Complementos → URL del complemento:**

| Entorno | URL |
|---------|-----|
| **Fly.io** | `https://TU-APP.fly.dev/manifest.json` |
| **Local** | `http://127.0.0.1:7000/manifest.json` |

Configuración (debrid, filtros): cambia `manifest.json` por `configure` en la misma URL.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Kraken Stremio addon"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/kraken-stremio.git
git push -u origin main
```

**No subas:** `node_modules/`, `.env`, `.fly/` (ya están en `.gitignore`). Tras clonar: `npm install`.

## Fly.io

1. Edita `fly.toml` → `app = 'nombre-unico-global'`.
2. [flyctl](https://fly.io/docs/hands-on/install-flyctl/) + cuenta Fly.

```bash
fly auth login
fly launch
fly deploy
```

**GitHub Actions:** secret `FLY_API_TOKEN` (`fly tokens create deploy`) → despliegue automático en push a `main`.

```bash
curl -s https://TU-APP.fly.dev/health.json
fly logs
```

## Uso local

```bash
npm install
npm start
```

Opcional: copia `.env.example` a `.env` (no lo subas a Git).

## Desarrollo

```bash
npm test
```

## Estructura del repo

```
addon.js
config.js
lib/
public/
package.json
package-lock.json
fly.toml
Dockerfile
.github/workflows/fly-deploy.yml
```

## Requisitos

- Node.js **18+**
- Stremio **escritorio**

## Indexadores web

En `/configure` activa **Indexadores web ES**. Para reproducir enlaces de esas webs hace falta **Real-Debrid o AllDebrid** (los streams salen como `Debrid · DivxTotal · …` o `P2P · …`).

En **Fly.io** los sitios a veces bloquean la IP del servidor; si ves `0 resultados` en logs, usa un **proxy** en `/configure` o ejecuta Kraken en local.

## Seguridad

- API de debrid solo en `/configure`, nunca en el repositorio.

## Licencia

[GNU GPL v3](LICENSE) (o posterior).

## Aviso legal

Herramienta de agregación; uso bajo tu responsabilidad.

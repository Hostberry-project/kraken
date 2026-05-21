# Kraken — complemento Stremio

Agregador en español: **Peerflix** (prioridad), **Torrentio**, **TorrentClaw**, indexadores ES y debrid (Real-Debrid / AllDebrid).

## Instalar en Stremio

Pega la URL del manifest en **Ajustes → Complementos → URL del complemento**:

| Entorno | URL |
|---------|-----|
| **Fly.io** | `https://TU-APP.fly.dev/manifest.json` |
| **Linux local** | `http://127.0.0.1:7000/manifest.json` |

Configuración (debrid, filtros): sustituye `manifest.json` por `configure` en la misma URL.

## Despliegue en Fly.io (recomendado en la nube)

Guía completa: **[docs/FLY.md](docs/FLY.md)**

```bash
# Edita app = 'tu-nombre-unico' en fly.toml
fly auth login
fly launch
fly deploy
```

Despliegue automático al hacer push a `main` en GitHub: configura el secret `FLY_API_TOKEN` (ver [docs/FLY.md](docs/FLY.md)).

## Linux local

```bash
chmod +x scripts/*.sh
./scripts/install.sh
./scripts/start.sh
```

Más detalles: **[docs/LINUX.md](docs/LINUX.md)**

## Desarrollo

```bash
cp .env.example .env   # opcional
npm install
npm start
npm test               # prueba streams sin Stremio
```

## Estructura

```
addon.js          # entrada
config.js         # fuentes y filtros
lib/              # upstream, scrapers, debrid, pipeline
public/           # landing
scripts/          # start/stop (Linux)
fly.toml          # Fly.io
Dockerfile
```

## Requisitos

- Node.js **18+**
- Stremio **escritorio** (más fiable que solo la web)

## Seguridad

- No subas `.env` ni API keys al repositorio.
- Las claves de debrid se configuran en `/configure`, no en Git.

## Licencia

[GNU GPL v3](LICENSE) (o posterior). Código derivado debe publicarse bajo la misma licencia.

## Aviso legal

Herramienta de agregación; uso bajo tu responsabilidad.

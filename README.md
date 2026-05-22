# Kraken — complemento Stremio (100 % online)

Agregador en español en la nube: **Peerflix**, **Torrentio**, **TorrentClaw**, indexadores ES, **base de datos** (catálogo moria) y debrid. **No hace falta instalar nada en tu PC** salvo Stremio.

## Instalar en Stremio

**Ajustes → Complementos → Pegar URL:**

```
https://kraken-anqfxw.fly.dev/manifest.json
```

**Configurar** (`/configure`): activa **Incluir base de datos**, upstreams si quieres, y **AllDebrid** o **Real-Debrid** (enlaces 1fichier).

## Base de datos (moria)

| Paso | Dónde |
|------|--------|
| Catálogo y enlaces | SQLite en Fly (`/data/moria.db`) |
| Copia `.zm3` | Imagen Docker + [GitHub](https://github.com/Hostberry-project/kraken/raw/refs/heads/main/moria_3_3_9.zm3) |

```bash
curl -s https://kraken-anqfxw.fly.dev/health.json
```

## Actualizar la BD en la nube

1. Sube `moria_3_3_9.zm3` nuevo a [Hostberry-project/kraken](https://github.com/Hostberry-project/kraken).
2. `git push` → despliegue automático en Fly.

## Repo

https://github.com/Hostberry-project/kraken

## Licencia

[GNU GPL v3](LICENSE)

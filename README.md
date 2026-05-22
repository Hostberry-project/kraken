# Kraken — complemento Stremio (100 % online)

Agregador en español en la nube: **Peerflix**, **Torrentio**, **TorrentClaw**, indexadores ES, **base de datos** (catálogo moria) y debrid. **No hace falta instalar nada en tu PC** salvo Stremio.

## Instalar en Stremio

**Ajustes → Complementos → Pegar URL (la que esté desplegada):**

| App Fly | URL manifest |
|---------|----------------|
| **kraken-9tyojw** (activa) | `https://kraken-9tyojw.fly.dev/manifest.json` |
| kraken-project | `https://kraken-project.fly.dev/manifest.json` (solo si responde) |

Usa **kraken-9tyojw** salvo que hayas desplegado y probado `kraken-project`.

**Configurar** (`/configure`): activa **Incluir base de datos**, upstreams si quieres, y **AllDebrid** o **Real-Debrid** (enlaces 1fichier).

## Base de datos (moria)

| Paso | Dónde |
|------|--------|
| Catálogo y enlaces | SQLite en Fly (`/data/moria.db`) |
| Copia `.zm3` | Imagen Docker + [GitHub](https://github.com/Hostberry-project/kraken/raw/refs/heads/main/moria_3_3_9.zm3) |

```bash
curl -s https://kraken-9tyojw.fly.dev/health.json
```

## Fly.io — volumen moria (una vez)

Si el deploy falla con *needs volumes moria_data*, crea el volumen en **ams** (misma región que `primary_region` en `fly.toml`):

```bash
fly volume create moria_data -a kraken-9tyojw -r ams -n 2 --size 2
```

Luego: `fly deploy --config fly.toml -a kraken-9tyojw` o push a `main`.

### Error `read ./: is a directory`

Ocurre si en el panel de Fly usas **Launch** con `--config ./`. **No uses Launch** para esta app: ya existe `kraken-9tyojw`. Despliega con GitHub Actions o:

```bash
cd ruta/al/repo
fly deploy --config fly.toml -a kraken-9tyojw
```

No uses `--config ./` ni cambies la región a `fra` si los volúmenes están en `ams`.

## Actualizar la BD en la nube

1. Sube `moria_3_3_9.zm3` nuevo a [Hostberry-project/kraken](https://github.com/Hostberry-project/kraken).
2. `git push` → despliegue automático en Fly.

## Repo

https://github.com/Hostberry-project/kraken

## Licencia

[GNU GPL v3](LICENSE)

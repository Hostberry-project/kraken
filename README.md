# Kraken — complemento Stremio (100 % online)

Agregador en español en la nube: **Peerflix**, **Torrentio**, **TorrentClaw**, indexadores ES, **Palantir** (catálogo moria) y debrid. **No hace falta instalar nada en tu PC** salvo Stremio.

## Instalar en Stremio

**Ajustes → Complementos → Pegar URL:**

```
https://kraken-anqfxw.fly.dev/manifest.json
```

**Configurar** (misma URL, cambia `manifest.json` por `configure`):

```
https://kraken-anqfxw.fly.dev/configure
```

Activa **Incluir Palantir**, **Peerflix/Torrentio** si quieres, y tu **AllDebrid** o **Real-Debrid** (necesario para enlaces 1fichier de Palantir).

## Cómo funciona moria (todo en el servidor)

| Paso | Dónde |
|------|--------|
| Catálogo y enlaces | SQLite **moria** en Fly (`/data/moria.db`) |
| Copia del `.zm3` | Incluido en la imagen Docker + [GitHub](https://github.com/Hostberry-project/kraken/raw/refs/heads/main/moria_3_3_9.zm3) |
| Tu búsqueda en Stremio | Kraken en Fly consulta la BD local del servidor, **no tu PC** |

Al arrancar Fly: usa `moria.db` del volumen, o extrae desde `/app/moria_3_3_9.zm3`, o descarga desde GitHub.

Comprueba estado:

```bash
curl -s https://kraken-anqfxw.fly.dev/health.json
```

(`moria.ready: true` y `sizeMb` ~160 cuando está listo.)

## Actualizar moria en la nube

1. Sube un `moria_3_3_9.zm3` nuevo al repo [Hostberry-project/kraken](https://github.com/Hostberry-project/kraken).
2. `git push` → GitHub Actions despliega en Fly.
3. Opcional: borra el volumen viejo en Fly para forzar re-extracción (`fly ssh console -a kraken-anqfxw` → `rm /data/moria.db`).

## Desarrollo / despliegue (mantenedores)

Repo: https://github.com/Hostberry-project/kraken

Secret en GitHub: `FLY_API_TOKEN` → despliegue automático en cada push a `main`.

```bash
fly deploy -a kraken-anqfxw
```

## Seguridad

Las API keys de debrid solo en `/configure` de Stremio, nunca en el repositorio.

## Licencia

[GNU GPL v3](LICENSE)

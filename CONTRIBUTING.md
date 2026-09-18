# Cómo contribuir al Tridente de Memoria

Gracias por querer mejorar el Tridente. Este documento es corto a propósito.

## La regla que importa

**No edites a mano ningún archivo generado.**

Este repositorio tiene una **fuente única de verdad**:

```
protocol/tridente.spec.json
```

De ahí salen `AGENTS.md`, `SKILL.md`, las plantillas de `templates/`, los punteros
de cada herramienta (`CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, …)
y varios bloques dentro de los README.

Todo archivo generado empieza con:

```html
<!-- tridente:header-start -->
<!-- GENERADO POR scripts/sync.mjs — NO EDITAR A MANO. … -->
<!-- tridente:header-end -->
```

Si ves esa cabecera, tu cambio va en el spec, no en el archivo.

### Flujo

```bash
# 1. Edita la fuente
$EDITOR protocol/tridente.spec.json

# 2. Regenera
node scripts/sync.mjs

# 3. Verifica
node scripts/validate.mjs
node --test
```

CI rechaza cualquier PR en el que `node scripts/sync.mjs --check` falle.

## Qué se edita a mano y qué no

**Se edita a mano:**

- `protocol/tridente.spec.json` — la fuente de todo lo demás
- `scripts/sync.mjs`, `scripts/validate.mjs` — el tooling
- `init-tridente.sh`, `init-tridente.ps1` — la lógica, nunca los datos del protocolo
- `README.md`, `README_EN.md` — **fuera** de los bloques `<!-- tridente:begin:… -->`
- `tests/*.mjs`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`

**Se genera (no lo toques):**

- `AGENTS.md`, `docs/AGENTS.en.md`, `dist/AGENTS.md`
- `SKILL.md`
- `templates/*.md`
- `protocol/manifest.sh`, `protocol/manifest.ps1`
- Los punteros de cada herramienta (`CLAUDE.md`, `.cursor/rules/`, …)
- Los bloques marcados dentro de los README

La lista autoritativa está en `generated[]` dentro del spec, y `sync --check`
falla tanto si generas algo que no está declarado como al revés.

### Los scripts de inicialización no contienen datos del protocolo

Los nombres de archivo, los roles, los tokens y el mapa de adaptadores salen de
`protocol/manifest.sh` y `protocol/manifest.ps1`, que genera `sync.mjs`. Hay
pruebas que fallan si un script vuelve a escribir a mano un nombre de archivo o
un rol: tras un renombrado en el spec, ese texto mentiría.

## Añadir una herramienta de IA nueva

Basta una entrada en `protocol/tridente.spec.json` → `adapters[]`:

```json
{
  "tool": "Nombre de la herramienta",
  "path": ".miherramienta/rules.md",
  "key": "miherramienta",
  "kind": "markdown",
  "note": "Enlace a la documentación oficial que confirma esa ruta."
}
```

Luego `node scripts/sync.mjs`: el puntero, los dos manifiestos y las tablas de
compatibilidad de ambos README se actualizan solos. **No hay que tocar los
scripts de inicialización.**

Si la herramienta necesita un formato propio (frontmatter, JSON, import), añade
el `kind` en `buildAdapters()` de `scripts/sync.mjs`.

Dos restricciones que el generador verifica:

- Una ruta de adaptador no puede ser directorio padre de otra (`.clinerules`
  como archivo y `.clinerules/` como carpeta no pueden coexistir).
- Dos rutas no pueden diferir sólo en mayúsculas: en Windows y macOS serían el
  mismo archivo. Por eso no existe `GEMINI.md` en la raíz.

## Umbral de calidad

```bash
node scripts/validate.mjs        # debe dar >= 95 / 100
```

El validador es la definición operativa de "esto está bien". Si crees que una
comprobación está mal planteada, discútela en un issue: cambiar el validador es
una decisión de diseño, no un atajo para aprobar un PR.

## Pruebas

```bash
node --test
```

Cualquier cambio en los scripts de inicialización necesita una prueba que
demuestre que **Bash y PowerShell producen el mismo resultado**. La paridad
entre plataformas es un requisito, no un detalle.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) en español:

```
feat: añadir adaptador para Zed
fix: corregir el escape de & en init-tridente.sh
docs: aclarar la Fase Cero sin terminal
chore: actualizar el workflow de CI
```

## Código de conducta

Al participar aceptas el [Código de Conducta](CODE_OF_CONDUCT.md).

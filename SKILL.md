---
name: tridente-de-memoria
description: Sistema de memoria persistente basado en 3 archivos interconectados (gemini.md, plan_maestro.md, lecciones_aprendidas.md). Inicializa proyectos con entrevista interactiva (Fase Cero) y se usa SIEMPRE antes de escribir o modificar código para mantener el contexto. Compatible con Claude Code, Codex, Cursor, Gemini, Copilot y agentes autónomos.
license: MIT
metadata:
  version: 2.5.1
  repository: https://github.com/Cyberdark-Security/tridente-de-memoria-skill
---

<!-- tridente:header-start -->
<!-- GENERADO POR scripts/sync.mjs — NO EDITAR A MANO.
     Fuente de verdad: protocol/tridente.spec.json
     Regenerar con: node scripts/sync.mjs -->
<!-- tridente:header-end -->

# 🔱 Tridente de Memoria (Memory Trident)

Protocolo de **memoria persistente compartida** que mantiene sincronizado el contexto de los agentes de IA a lo largo del tiempo.

> **NINGÚN CÓDIGO SE ESCRIBE SIN ANTES LEER EL TRIDENTE.**

## Cuándo usar este skill

- El usuario pide **iniciar un proyecto** con memoria persistente.
- El usuario dice **"instala el Tridente"**, **"Memory Trident"** o equivalente.
- Vas a **modificar código** y existen (o deberían existir) los tres archivos maestros.
- El usuario pregunta **cómo mantener contexto** entre sesiones de IA.
- Detectas que el proyecto **no tiene reglas documentadas** y el agente está adivinando.

## Los tres archivos maestros

| Archivo | Rol | Contenido |
| :--- | :--- | :--- |
| `gemini.md` | 🧬 El ADN | Identidad, stack tecnológico, reglas innegociables y arquitectura del proyecto. |
| `plan_maestro.md` | 🗺️ La Brújula | Roadmap, hito actual, sprint activo, backlog y bitácora de decisiones. |
| `lecciones_aprendidas.md` | 🛡️ El Escudo | Minas activas, bugs históricos y trampas técnicas ya pagadas. |

**Alias:** `gemini.md` (≈ `GEMINI.md`, `PROJECT_DNA.md`, `CLAUDE.md`, `AGENT_DNA.md`) · `plan_maestro.md` (≈ `PLAN_MAESTRO.md`, `MASTER_PLAN.md`) · `lecciones_aprendidas.md` (≈ `LECCIONES_APRENDIDAS.md`, `LESSONS_LEARNED.md`). Identifica por función, no por nombre.

## Protocolo de lectura

1. `gemini.md` — Stack, reglas innegociables, arquitectura
2. `plan_maestro.md` — Hito actual, tareas activas, bitácora de decisiones
3. `lecciones_aprendidas.md` — Minas activas, bugs conocidos, lecciones pasadas

## Protocolo de escritura (orden sagrado)

1. `lecciones_aprendidas.md` — Minas activas, bugs históricos y trampas técnicas ya pagadas.
2. `gemini.md` — Identidad, stack tecnológico, reglas innegociables y arquitectura del proyecto.
3. `plan_maestro.md` — Roadmap, hito actual, sprint activo, backlog y bitácora de decisiones.

> Primero la lección (el dolor se documenta caliente), luego la regla global si cambió, y al final el plan (que referencia a ambos). Al revés, el plan apuntaría a entradas que todavía no existen.

### Formatos de entrada

```markdown
### YYYY-MM-DD — [Título]
- **Problema:** [Qué falló]
- **Solución:** [Cómo se resolvió]
- **Prevención:** [Cómo evitar que vuelva a pasar]
- **Impacto en reglas:** [¿Requiere cambio en gemini.md? Sí/No]
```

```markdown
### YYYY-MM-DD — [Título]
- **Decisión:** [Qué se decidió]
- **Razón:** [Por qué]
- **Impacto:** [Qué partes del sistema se ven afectadas]
- **Relacionado:** [Enlace a la lección o al cambio en gemini.md, si aplica] *(opcional)*
```

Fechas en **YYYY-MM-DD** (ISO 8601), p. ej. `2026-09-17`.

## Fase Cero

Si los tres archivos **no existen**, está **prohibido** crearlos vacíos o inventar el proyecto.

```bash
bash init-tridente.sh                 # Unix / WSL / Git Bash
bash init-tridente.sh --help          # modo no interactivo y banderas
```

```powershell
powershell -ExecutionPolicy Bypass -File init-tridente.ps1
```

Sin terminal, haz la entrevista y puebla las plantillas de `templates/`:

1. ¿Cuál es el objetivo principal del proyecto?
2. ¿Qué stack tecnológico vamos a utilizar?
3. ¿Qué regla es innegociable en este proyecto?
4. ¿Cuál es el primer hito o sprint?

## Verificación

```bash
node scripts/validate.mjs     # puntaje 0–100 de salud del Tridente
node scripts/sync.mjs --check # comprueba que la documentación no se desincronizó
```

## Instalación

| Plataforma | Ruta de instalación |
| :--- | :--- |
| **Claude Code** | `~/.claude/skills/tridente-de-memoria` |
| **Cursor** | `~/.cursor/skills/tridente-de-memoria` |
| **Gemini CLI** | `~/.gemini/skills/tridente-de-memoria` |
| **Genérico (AGENTS skills)** | `~/.agents/skills/tridente-de-memoria` |

```bash
git clone https://github.com/Cyberdark-Security/tridente-de-memoria-skill ~/.claude/skills/tridente-de-memoria
```

> El directorio de destino **debe** llamarse `tridente-de-memoria` para que coincida con el campo `name` del frontmatter.

Repositorio: https://github.com/Cyberdark-Security/tridente-de-memoria-skill

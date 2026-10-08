---
name: tridente-de-memoria
description: Memoria persistente para agentes de IA basada en tres archivos markdown interconectados (gemini.md, plan_maestro.md, lecciones_aprendidas.md). Úsala antes de escribir o modificar código para recuperar el contexto del proyecto, y al terminar para dejarlo documentado. Incluye la Fase Cero, una entrevista de cuatro preguntas que crea los tres archivos en un proyecto nuevo.
license: MIT
metadata:
  version: 3.0.0
  repository: https://github.com/Cyberdark-Security/tridente-de-memoria-skill
---

# 🔱 Tridente de Memoria

> **Ningún código se escribe sin antes leer el Tridente.**

## Cuándo usar esta skill

- Vas a modificar código en un proyecto que tiene (o debería tener) los tres archivos maestros.
- El usuario pide iniciar un proyecto con memoria persistente, o dice *"instala el Tridente"*.
- Detectas que el proyecto no tiene reglas documentadas y el agente está adivinando.

## Qué hacer

Lee **[`AGENTS.md`](AGENTS.md)** y sigue el protocolo. Está en esta misma
carpeta y es la única fuente: el ciclo de lectura y escritura, los formatos de
lección, mina y decisión, y la Fase Cero.

No resumo aquí su contenido a propósito. Un resumen es una segunda copia, y la
segunda copia es la que se queda atrás.

## Instalación

```bash
git clone https://github.com/Cyberdark-Security/tridente-de-memoria-skill \
  ~/.claude/skills/tridente-de-memoria
```

| Plataforma | Ruta |
| :--- | :--- |
| Claude Code | `~/.claude/skills/tridente-de-memoria` |
| Cursor | `~/.cursor/skills/tridente-de-memoria` |
| Gemini CLI | `~/.gemini/skills/tridente-de-memoria` |
| Genérico (AGENTS skills) | `~/.agents/skills/tridente-de-memoria` |

El directorio de destino **debe** llamarse `tridente-de-memoria`, igual que el
campo `name` del frontmatter.

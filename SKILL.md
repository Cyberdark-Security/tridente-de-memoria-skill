---
name: tridente-de-memoria
description: >
  Sistema de memoria persistente basado en 3 archivos interconectados
  (gemini.md, plan_maestro.md, lecciones_aprendidas.md). Inicializa proyectos
  con entrevista interactiva (Fase Cero) y se usa SIEMPRE antes de escribir
  código para mantener el contexto. Compatible con Cursor, Gemini, Claude,
  ChatGPT y agentes autónomos.
---

# 🔱 Tridente de Memoria (Memory Trident)

Protocolo de **Memoria Persistente Compartida** para mantener el contexto de agentes de IA sincronizado a largo plazo.

## Cuándo usar este skill

- El usuario pide **iniciar un proyecto nuevo** con memoria persistente
- El usuario dice **"instala el Tridente"**, **"Memory Trident"** o similar
- Vas a **modificar código** y existen (o deberían existir) los 3 archivos maestros
- El usuario pregunta **cómo mantener contexto** entre sesiones de IA
- Detectas que el proyecto **no tiene reglas documentadas** y el agente está "adivinando"

## Regla de oro

> **NINGÚN CÓDIGO SE ESCRIBE SIN ANTES LEER EL TRIDENTE.**

---

## Los 3 archivos maestros

| Archivo | Rol | Contenido |
| :--- | :--- | :--- |
| `gemini.md` | 🧬 El ADN | Identidad, stack, reglas innegociables, arquitectura |
| `plan_maestro.md` | 🗺️ La Brújula | Roadmap, sprint activo, backlog, bitácora de decisiones |
| `lecciones_aprendidas.md` | 🛡️ El Escudo | Minas activas, bugs históricos, conocimiento adquirido |

**Nota sobre nombres:** `gemini.md` es el nombre canónico, pero el archivo de ADN puede llamarse de otra forma en proyectos existentes (ej. `PROJECT_DNA.md`, `CLAUDE.md`). Identifícalo por su función, no solo por el nombre.

---

## Fase Cero: Inicialización

Si los 3 archivos **NO existen**, está **estrictamente prohibido** crearlos vacíos o inventar el proyecto.

### Opción 1 — Script (si tienes terminal)

```bash
# Unix
./init-tridente.sh

# Windows
.\init-tridente.ps1
```

### Opción 2 — Entrevista interactiva

Haz estas preguntas al usuario (una por una o en bloque claro):

1. **¿Cuál es el objetivo principal del proyecto?**
2. **¿Qué stack tecnológico vamos a utilizar?** (Frontend, Backend, BD, infra)
3. **¿Tienes reglas innegociables, límites de diseño o preferencias de infraestructura?**
4. **¿Cuál sería el primer hito o sprint para empezar?**

Con las respuestas, **crea y puebla** los 3 archivos usando las plantillas de `templates/` como base. Copia también `AGENTS.md` a la raíz del proyecto.

---

## Protocolo de lectura

Antes de cada tarea o modificación de código:

1. **Lee los 3 archivos** — Entiende dónde estás, qué límites hay y qué errores evitar
2. **Pregunta si hay ambigüedad** — No asumas; consulta al usuario
3. **Sincroniza** — Si hay decisiones pendientes, actualiza el tridente *antes* de programar

---

## Protocolo de escritura (orden sagrado)

Cuando hay un cambio arquitectónico, bug resuelto o decisión clave:

### 1. PRIMERO → `lecciones_aprendidas.md`

Documenta el fallo o lección técnica. El agente del futuro no debe caer en la misma trampa.

```markdown
### [Fecha] - [Título]
- **Problema:** ¿Qué falló?
- **Solución:** ¿Cómo se resolvió?
- **Prevención:** ¿Cómo evitar que vuelva a pasar?
```

### 2. SEGUNDO → `gemini.md`

Modifica **SOLO** si la lección altera reglas globales, stack, comandos o directrices de diseño.

### 3. TERCERO → `plan_maestro.md`

- Marca la tarea como completada `[x]`
- Registra la decisión en la **Bitácora de Decisiones**
- Vincula lógicamente a los otros archivos

---

## Regla de interconexión

Los 3 archivos son **un solo organismo**. No los trates como entidades aisladas:

- Decisión de diseño en `plan_maestro.md` → reflejarla en `gemini.md`
- Trampa técnica en implementación → cruzarla con `lecciones_aprendidas.md`
- Cambio de stack → actualizar ADN + bitácora + lección si aplica

---

## Instalación del skill

| Plataforma | Ruta |
| :--- | :--- |
| Cursor | `~/.cursor/skills/tridente-de-memoria/` o `~/.agents/skills/` |
| Gemini CLI | `~/.gemini/config/skills/tridente-de-memoria/` |
| Claude Code | `~/.claude/skills/tridente-de-memoria/` |

Repositorio: https://github.com/Cyberdark-Security/tridente-de-memoria-skill

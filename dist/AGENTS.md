<!-- tridente:header-start -->
<!-- GENERADO POR scripts/sync.mjs — NO EDITAR A MANO.
     Fuente de verdad: protocol/tridente.spec.json
     Regenerar con: node scripts/sync.mjs -->
<!-- tridente:header-end -->

# Instrucciones para agentes de IA

Este proyecto opera bajo el protocolo **Tridente de Memoria** (v2.5.1).
Tu misión: mantener el contexto completo del proyecto y no reintroducir errores ya resueltos.

> **Regla de oro: NINGÚN CÓDIGO SE ESCRIBE SIN ANTES LEER EL TRIDENTE.**

---

## 1. Los tres archivos maestros

| Archivo | Rol | Contenido |
| :--- | :--- | :--- |
| `gemini.md` | 🧬 El ADN | Identidad, stack tecnológico, reglas innegociables y arquitectura del proyecto. |
| `plan_maestro.md` | 🗺️ La Brújula | Roadmap, hito actual, sprint activo, backlog y bitácora de decisiones. |
| `lecciones_aprendidas.md` | 🛡️ El Escudo | Minas activas, bugs históricos y trampas técnicas ya pagadas. |

Los nombres son canónicos. Si este proyecto usa alias (`GEMINI.md`, `PROJECT_DNA.md`, `CLAUDE.md`, `AGENT_DNA.md`…), identifícalos **por su función**, no sólo por el nombre.

---

## 2. Antes de escribir código — LEER

Lee los tres archivos en este orden y no empieces hasta terminarlos:

| # | Archivo | Qué extraer |
| :---: | :--- | :--- |
| 1 | `gemini.md` | Stack, reglas innegociables, arquitectura |
| 2 | `plan_maestro.md` | Hito actual, tareas activas, bitácora de decisiones |
| 3 | `lecciones_aprendidas.md` | Minas activas, bugs conocidos, lecciones pasadas |

- Si **falta alguno** → detente y ejecuta la **Fase Cero** (sección 5). No inventes el contenido.
- Si el contenido **contradice** lo que te pide el usuario → dilo antes de programar, no después.
- Si un requisito es **ambiguo** → pregunta. No asumas.

---

## 3. Durante la tarea

- **Bug o trampa descubierta** → anótala; irá a `lecciones_aprendidas.md` al cerrar.
- **Decisión de arquitectura** → anótala; irá a la Bitácora de `plan_maestro.md`.
- **No** edites los archivos maestros a mitad de tarea salvo que la tarea sea precisamente esa.

---

## 4. Al terminar — ESCRIBIR en el orden sagrado

1. **`lecciones_aprendidas.md`** — Minas activas, bugs históricos y trampas técnicas ya pagadas.
2. **`gemini.md`** — Identidad, stack tecnológico, reglas innegociables y arquitectura del proyecto.
3. **`plan_maestro.md`** — Roadmap, hito actual, sprint activo, backlog y bitácora de decisiones.

> Primero la lección (el dolor se documenta caliente), luego la regla global si cambió, y al final el plan (que referencia a ambos). Al revés, el plan apuntaría a entradas que todavía no existen.

### Formato de lección (`lecciones_aprendidas.md` → Conocimiento Adquirido)

```markdown
### YYYY-MM-DD — [Título]
- **Problema:** [Qué falló]
- **Solución:** [Cómo se resolvió]
- **Prevención:** [Cómo evitar que vuelva a pasar]
- **Impacto en reglas:** [¿Requiere cambio en gemini.md? Sí/No]
```

### Formato de decisión (`plan_maestro.md` → Bitácora de Decisiones)

```markdown
### YYYY-MM-DD — [Título]
- **Decisión:** [Qué se decidió]
- **Razón:** [Por qué]
- **Impacto:** [Qué partes del sistema se ven afectadas]
- **Relacionado:** [Enlace a la lección o al cambio en gemini.md, si aplica] *(opcional)*
```

### Formato de mina activa (`lecciones_aprendidas.md` → Minas Activas)

| Componente | Descripción | Estado |
| :--- | :--- | :--- |
| [Componente] | [Qué rompe y cuándo] | 🔴 Activa / 🟡 Vigilar / 🟢 Limpio |

- 🔴 **Activa** — Rompe cosas hoy
- 🟡 **Vigilar** — Frágil, no tocar sin leer
- 🟢 **Limpio** — Resuelta, se deja como historia

### Formato de fecha — obligatorio

Todas las fechas usan **YYYY-MM-DD** (ISO 8601). Ejemplo: `2026-09-17`.
ISO 8601 es ordenable lexicográficamente y no ambiguo entre locales. DD/MM/AAAA rompe el orden de la bitácora y se confunde con MM/DD/AAAA.

---

## 5. Fase Cero (si falta algún archivo maestro)

Haz estas preguntas, una por una, y espera la respuesta:

1. ¿Cuál es el objetivo principal del proyecto?
2. ¿Qué stack tecnológico vamos a utilizar?
3. ¿Qué regla es innegociable en este proyecto?
4. ¿Cuál es el primer hito o sprint?

Con las respuestas, crea los archivos que falten con las secciones de la sección 1.
**Nunca** los crees vacíos ni inventes datos del proyecto.

---

## 6. Regla de interconexión

Los tres archivos son **un solo organismo**, no tres documentos sueltos:

- Decisión de diseño en `plan_maestro.md` → refléjala en `gemini.md`.
- Trampa técnica al implementar → crúzala en `lecciones_aprendidas.md`.
- Cambio de stack → ADN + bitácora + lección (si aplica).

Una entrada que no enlaza con las otras dos es una entrada huérfana: **el tridente se desincroniza justo ahí**.

---

## 7. Verificación

Antes de dar por cerrada una tarea que tocó los archivos maestros, comprueba a mano:

- [ ] Los 3 archivos existen y conservan todas sus secciones.
- [ ] Toda entrada nueva lleva fecha en `YYYY-MM-DD` y **todos** sus campos.
- [ ] Cada entrada enlaza con los otros dos archivos cuando corresponde.
- [ ] Ninguna decisión del plan contradice una regla del ADN.

---

## 8. Compatibilidad entre herramientas

Este archivo es la **única fuente** de estas instrucciones. El resto de archivos de
configuración de agentes de este proyecto son punteros que reenvían aquí; si los
editas, edita este archivo en su lugar.

| Herramienta | Archivo que lee | Mecanismo |
| :--- | :--- | :--- |
| OpenAI Codex | `AGENTS.md` | Nativo |
| Cursor | `.cursor/rules/tridente.mdc` | Adaptador generado |
| Claude Code | `CLAUDE.md` | Adaptador generado |
| Gemini CLI / Antigravity | `.gemini/settings.json` | Adaptador generado |
| GitHub Copilot | `.github/copilot-instructions.md` | Adaptador generado |
| Windsurf | `.windsurfrules` | Adaptador generado |
| Roo Code | `.roo/rules/tridente.md` | Adaptador generado |
| JetBrains Junie | `.junie/guidelines.md` | Adaptador generado |
| Amazon Q Developer | `.amazonq/rules/tridente.md` | Adaptador generado |
| Firebase Studio / Project IDX | `.idx/airules.md` | Adaptador generado |
| Aider | `CONVENTIONS.md` | Adaptador generado — requiere `aider --read CONVENTIONS.md` o `read:` en `.aider.conf.yml` |
| Jules / Devin / OpenHands y otros | `AGENTS.md` | Nativo |
| Devin Desktop (ex-Windsurf) | `.devin/rules/tridente.md` | Adaptador generado |
| Cline | `.clinerules/tridente.md` | Adaptador generado |

---

*Tridente de Memoria v2.5.1 — https://github.com/Cyberdark-Security/tridente-de-memoria-skill*

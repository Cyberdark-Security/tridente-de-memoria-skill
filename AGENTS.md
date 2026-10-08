# Tridente de Memoria

Protocolo de memoria persistente para agentes de IA (v3.0.0).
Son **tres archivos markdown** en la raíz del proyecto. Nada más.

> **Regla de oro: ningún código se escribe sin antes leer el Tridente.**

> **¿Te acaban de pasar el enlace de este archivo para instalarlo?** Entonces tu
> tarea es: copiar este archivo tal cual como `AGENTS.md` en la raíz del
> proyecto, y seguir la **Fase Cero** (sección 5). Nada más que instalar.

🇬🇧 English: [AGENTS.en.md](https://github.com/Cyberdark-Security/tridente-de-memoria-skill/blob/main/docs/AGENTS.en.md)

---

## 1. Los tres archivos

| Archivo | Rol | Contenido |
| :--- | :--- | :--- |
| `gemini.md` | 🧬 El ADN | Identidad, stack tecnológico, reglas innegociables y arquitectura. |
| `plan_maestro.md` | 🗺️ La Brújula | Roadmap, hito actual, sprint activo, backlog y bitácora de decisiones. |
| `lecciones_aprendidas.md` | 🛡️ El Escudo | Minas activas, bugs históricos y trampas técnicas ya pagadas. |

Si el proyecto ya usa otros nombres (`PROJECT_DNA.md`, `MASTER_PLAN.md`,
`LESSONS_LEARNED.md`…), identifícalos **por su función**, no por el nombre.

> `CLAUDE.md` no es uno de ellos: es el puntero que lleva a este archivo.

---

## 2. Antes de escribir código — LEER

En este orden, y no empieces hasta terminarlos:

1. `gemini.md` → stack, reglas innegociables, arquitectura.
2. `plan_maestro.md` → hito actual, tareas activas, bitácora de decisiones.
3. `lecciones_aprendidas.md` → minas activas, bugs conocidos, lecciones pasadas.

- ¿Falta alguno? → **Fase Cero** (sección 5). No inventes el contenido.
- ¿El contenido contradice lo que te piden? → dilo **antes** de programar.
- ¿Un requisito es ambiguo? → pregunta. No asumas.

---

## 3. Durante la tarea

- Bug o trampa descubierta → anótala; irá a `lecciones_aprendidas.md` al cerrar.
- Decisión de arquitectura → anótala; irá a la bitácora de `plan_maestro.md`.
- No edites los tres archivos a mitad de tarea, salvo que la tarea sea esa.

---

## 4. Al terminar — ESCRIBIR en el orden sagrado

1. `lecciones_aprendidas.md`
2. `gemini.md` (sólo si cambió una regla global)
3. `plan_maestro.md`

Primero la lección, porque el dolor se documenta en caliente. Después la regla.
El plan al final, porque referencia a los otros dos: al revés apuntaría a
entradas que todavía no existen.

### Lección → `lecciones_aprendidas.md`, sección *Conocimiento Adquirido*

```markdown
### YYYY-MM-DD — [Título]
- **Problema:** [Qué falló]
- **Solución:** [Cómo se resolvió]
- **Prevención:** [Cómo evitar que vuelva a pasar]
- **Impacto en reglas:** [¿Requiere cambio en gemini.md? Sí/No]
```

### Mina activa → `lecciones_aprendidas.md`, sección *Minas Activas*

| Componente | Descripción | Estado |
| :--- | :--- | :--- |
| [Componente] | [Qué rompe y cuándo] | 🔴 Activa / 🟡 Vigilar / 🟢 Limpio |

🔴 rompe cosas hoy · 🟡 frágil, no tocar sin leer · 🟢 resuelta, se deja como historia.

### Decisión → `plan_maestro.md`, sección *Bitácora de Decisiones*

```markdown
### YYYY-MM-DD — [Título]
- **Decisión:** [Qué se decidió]
- **Razón:** [Por qué]
- **Impacto:** [Qué partes del sistema se ven afectadas]
- **Relacionado:** [Enlace a la lección o al cambio en gemini.md] *(opcional)*
```

### Fechas

Siempre **YYYY-MM-DD** (ISO 8601). Ejemplo: `2026-10-08`.
Es ordenable alfabéticamente y no se confunde entre locales; `08/10/2026` sí.

---

## 5. Fase Cero — cuando los archivos no existen

Haz estas cuatro preguntas, **una por una**, y espera cada respuesta:

1. ¿Cuál es el objetivo principal del proyecto?
2. ¿Qué stack tecnológico vamos a utilizar?
3. ¿Qué regla es innegociable en este proyecto?
4. ¿Cuál es el primer hito o sprint?

Con las respuestas, crea los tres archivos en la raíz del proyecto. Basta con
estas secciones ([las plantillas completas están en el repositorio](https://github.com/Cyberdark-Security/tridente-de-memoria-skill/tree/main/templates)):

| Archivo | Secciones obligatorias |
| :--- | :--- |
| `gemini.md` | Identidad y Propósito · Stack Tecnológico · Reglas Innegociables · Arquitectura y Estándares |
| `plan_maestro.md` | Próximo Hito · Sprint Activo · Backlog · Bitácora de Decisiones |
| `lecciones_aprendidas.md` | Minas Activas · Conocimiento Adquirido |

Cada archivo abre con un enlace a los otros dos. Las secciones que todavía no
tengan contenido real se dejan marcadas como pendientes.

**Nunca** crees los archivos vacíos ni rellenes huecos inventando el proyecto.
Un Tridente con datos falsos es peor que no tenerlo: el agente los creerá.

---

## 6. Son un solo organismo

- Decisión de diseño en `plan_maestro.md` → refléjala en `gemini.md`.
- Trampa técnica al implementar → crúzala en `lecciones_aprendidas.md`.
- Cambio de stack → ADN + bitácora + lección, si aplica.

Una entrada que no enlaza con las otras dos es una entrada huérfana, y el
Tridente se desincroniza justo ahí.

---

## 7. Compatibilidad

`AGENTS.md` es el estándar que leen hoy la mayoría de agentes —Codex, Cursor,
Copilot, Jules, Devin, OpenHands, Antigravity— sin configuración.

Para las herramientas que leen otro archivo, el puntero es de una línea y
reenvía aquí; nunca copies el protocolo, porque la copia se desincroniza:

| Herramienta | Archivo | Contenido del puntero |
| :--- | :--- | :--- |
| Claude Code | `CLAUDE.md` | `@AGENTS.md` |
| Gemini CLI | `.gemini/settings.json` | `{ "context": { "fileName": ["AGENTS.md", "gemini.md"] } }` |
| Cualquier otra | donde la espere | una línea que remita a `AGENTS.md` |

> No crees `GEMINI.md` en la raíz. En Windows y macOS el sistema de archivos no
> distingue mayúsculas, así que `GEMINI.md` y `gemini.md` (el ADN) serían **el
> mismo archivo** y el puntero se comería el ADN.

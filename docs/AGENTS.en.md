# Memory Trident

Persistent-memory protocol for AI agents (v3.0.0).
It is **three markdown files** at the project root. Nothing else.

> **Golden rule: no code is written before reading the Trident.**

> **Were you just handed the link to this file to install it?** Then your task
> is: copy this file as-is to the project root as `AGENTS.md`, and follow
> **Phase Zero** (section 5). Installing is all there is to it.

🇪🇸 Spanish (authoritative): [AGENTS.md](https://github.com/Cyberdark-Security/tridente-de-memoria-skill/blob/main/AGENTS.md)

---

## 1. The three files

| File | Role | Contents |
| :--- | :--- | :--- |
| `gemini.md` | 🧬 The DNA | Identity, tech stack, non-negotiable rules and architecture. |
| `plan_maestro.md` | 🗺️ The Compass | Roadmap, current milestone, active sprint, backlog and decision log. |
| `lecciones_aprendidas.md` | 🛡️ The Shield | Active landmines, historical bugs and technical traps already paid for. |

If the project already uses other names (`PROJECT_DNA.md`, `MASTER_PLAN.md`,
`LESSONS_LEARNED.md`…), identify them **by role**, not by name.

> `CLAUDE.md` is not one of them: it is the pointer that leads to this protocol.

---

## 2. Before writing code — READ

In this order, and don't start until you have finished:

1. `gemini.md` → stack, non-negotiable rules, architecture.
2. `plan_maestro.md` → current milestone, active tasks, decision log.
3. `lecciones_aprendidas.md` → active landmines, known bugs, past lessons.

- Any of them missing? → **Phase Zero** (section 5). Do not invent the contents.
- Contents contradict the request? → say so **before** writing code.
- A requirement is ambiguous? → ask. Do not assume.

---

## 3. During the task

- Bug or trap found → note it; it goes to `lecciones_aprendidas.md` at close.
- Architectural decision → note it; it goes to the log in `plan_maestro.md`.
- Don't edit the three files mid-task, unless that is the task.

---

## 4. When done — WRITE in the sacred order

1. `lecciones_aprendidas.md`
2. `gemini.md` (only if a global rule changed)
3. `plan_maestro.md`

The lesson first, because pain is documented while it is hot. Then the rule.
The plan last, because it references the other two: the other way around it
would point at entries that do not exist yet.

### Lesson → `lecciones_aprendidas.md`, *Conocimiento Adquirido* section

```markdown
### YYYY-MM-DD — [Title]
- **Problema:** [What broke]
- **Solución:** [How it was fixed]
- **Prevención:** [How to stop it happening again]
- **Impacto en reglas:** [Does gemini.md need a change? Yes/No]
```

### Active landmine → `lecciones_aprendidas.md`, *Minas Activas* section

| Componente | Descripción | Estado |
| :--- | :--- | :--- |
| [Component] | [What breaks and when] | 🔴 Activa / 🟡 Vigilar / 🟢 Limpio |

🔴 breaks things today · 🟡 fragile, don't touch without reading · 🟢 solved, kept as history.

### Decision → `plan_maestro.md`, *Bitácora de Decisiones* section

```markdown
### YYYY-MM-DD — [Title]
- **Decisión:** [What was decided]
- **Razón:** [Why]
- **Impacto:** [Which parts of the system are affected]
- **Relacionado:** [Link to the lesson or the change in gemini.md] *(optional)*
```

Section headings stay in Spanish: they are the canonical names the protocol
looks for, whatever language the entries are written in.

### Dates

Always **YYYY-MM-DD** (ISO 8601). Example: `2026-10-08`.
It sorts alphabetically and is unambiguous across locales; `08/10/2026` is not.

---

## 5. Phase Zero — when the files do not exist

Ask these four questions, **one at a time**, and wait for each answer:

1. What is the main goal of the project?
2. What tech stack are we going to use?
3. What rule is non-negotiable in this project?
4. What is the first milestone or sprint?

With the answers, create the three files at the project root. These sections are
enough ([full templates live in the repository](https://github.com/Cyberdark-Security/tridente-de-memoria-skill/tree/main/templates)):

| File | Required sections |
| :--- | :--- |
| `gemini.md` | Identidad y Propósito · Stack Tecnológico · Reglas Innegociables · Arquitectura y Estándares |
| `plan_maestro.md` | Próximo Hito · Sprint Activo · Backlog · Bitácora de Decisiones |
| `lecciones_aprendidas.md` | Minas Activas · Conocimiento Adquirido |

Each file opens with a link to the other two. Sections without real content yet
are left marked as pending.

**Never** create the files empty, and never fill gaps by inventing the project.
A Trident with false data is worse than no Trident: the agent will believe it.

---

## 6. They are one organism

- Design decision in `plan_maestro.md` → reflect it in `gemini.md`.
- Technical trap while implementing → cross-reference it in `lecciones_aprendidas.md`.
- Stack change → DNA + decision log + lesson, if applicable.

An entry that links to neither of the other two is an orphan, and that is
exactly where the Trident falls out of sync.

---

## 7. Compatibility

`AGENTS.md` is the standard most agents read today — Codex, Cursor, Copilot,
Jules, Devin, OpenHands, Antigravity — with no configuration.

For tools that read a different file, the pointer is one line and forwards
here. Never copy the protocol: the copy drifts.

| Tool | File | Pointer contents |
| :--- | :--- | :--- |
| Claude Code | `CLAUDE.md` | `@AGENTS.md` |
| Gemini CLI | `.gemini/settings.json` | `{ "context": { "fileName": ["AGENTS.md", "gemini.md"] } }` |
| Any other | wherever it looks | one line pointing at `AGENTS.md` |

> Do not create `GEMINI.md` at the root. On Windows and macOS the filesystem is
> case-insensitive, so `GEMINI.md` and `gemini.md` (the DNA) would be **the same
> file** and the pointer would eat the DNA.

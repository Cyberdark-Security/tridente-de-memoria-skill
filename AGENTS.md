# Instructions for AI Agents

You are working on a project that follows the **Memory Trident** (`Tridente de Memoria`) methodology. Your mission: maintain absolute context and prevent regressions.

> **Golden Rule: No code is written blindly. Ever.**

---

## Before writing any code

Read all three master files in this order:

| # | File | What to extract |
| :---: | :--- | :--- |
| 1 | `gemini.md` (or project DNA file) | Tech stack, non-negotiable rules, architecture |
| 2 | `plan_maestro.md` | Current sprint, active tasks, decision log |
| 3 | `lecciones_aprendidas.md` | Active mines, known bugs, past lessons |

If any file is missing, **stop** and run the Phase Zero initialization (see below).

---

## During the task

- **Ambiguous requirements** → Ask the user before proceeding
- **Bug discovered or lesson learned** → Document in `lecciones_aprendidas.md` immediately
- **Architectural decision made** → Note it for the decision log before implementing

---

## After finishing a task

Update files in the **sacred order**:

1. **`lecciones_aprendidas.md`** — Document any bug, trap, or technical lesson
2. **`gemini.md`** — Only if global rules, stack, or architecture changed
3. **`plan_maestro.md`** — Mark tasks `[x]`, add entry to the Decision Log

### Decision log entry format

```markdown
### [Date]
- **Decision:** [What was decided]
- **Reason:** [Why]
- **Impact:** [What parts of the system are affected]
- **Related:** [Links to lessons or rule changes, if any]
```

---

## Self-initialization (Phase Zero)

If the user asks to "Install the Memory Trident" or "Start a project with the Trident" and the files are missing:

1. **With terminal access** → Run `./init-tridente.sh` (Unix) or `.\init-tridente.ps1` (Windows)
2. **Without terminal** → Follow the interactive interview in `SKILL.md`:
   - Project goal
   - Tech stack
   - Non-negotiable rules
   - First milestone/sprint
3. **Never** create empty placeholder files or invent project details

After initialization, ensure `AGENTS.md` exists in the project root (copy from this repo if needed).

---

## Interconnection rule

The three files are a single organism:

- A design decision in `plan_maestro.md` must be reflected in `gemini.md`
- A code trap during implementation must be cross-referenced in `lecciones_aprendidas.md`
- A stack change updates the DNA file, decision log, and lessons (if applicable)

---

## Compatibility note

This protocol works across **Cursor**, **Gemini**, **Claude**, **ChatGPT**, **Copilot**, **Jules**, **Devin**, and any agent that reads project markdown files. The file names are canonical but the DNA file may have project-specific aliases.

# Instructions for AI Agents

You are an AI agent working with a project that implements the **Memory Trident** methodology. Your goal is to maintain absolute context and avoid regressions.

## 🤖 Your Operating Protocol

### 1. Before writing any code:
- Read `gemini.md` (or the project's DNA file) to understand the tech stack and rules.
- Read `plan_maestro.md` to see the current sprint and roadmap.
- Read `lecciones_aprendidas.md` to avoid known bugs and "active mines".

### 2. During the task:
- If a requirement is ambiguous, **ask the user** before proceeding.
- If you find a bug or learn something new, document it in `lecciones_aprendidas.md` immediately.

### 3. After finishing a task:
- Update the **Decision Log** in `plan_maestro.md`.
- Mark completed tasks in `plan_maestro.md`.
- If your work changed the project's architecture or global rules, update `gemini.md`.

## 🛠️ Self-Initialization
If the user asks you to "Install the Memory Trident" or "Start a project with the Trident" and the files are missing:
1. Run `./init-tridente.sh` if you have terminal access.
2. If you don't have terminal access, follow the **Phase Zero** interview protocol described in `SKILL.md`.

**Remember: No code is written blindly. Ever.**

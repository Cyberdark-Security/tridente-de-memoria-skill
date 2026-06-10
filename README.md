# 🔱 Tridente de Memoria (Memory Trident Skill)

Una skill para agentes autónomos (Gemini, Claude, GPT) que implementa un sistema de **Memoria Persistente Compartida**. Convierte la IA de un simple asistente de código a un verdadero Arquitecto de Software que mantiene el contexto global del proyecto a largo plazo.

## 🚀 ¿Qué hace esta Skill?
Resuelve el mayor problema de las IAs al programar: **la pérdida de contexto**.
Esta skill obliga al agente a:
1. **No escribir código a ciegas:** El agente tiene prohibido modificar código sin leer antes el "Tridente" (3 archivos base).
2. **Setup de Proyectos (Fase Cero):** Al inicializar un proyecto, la IA realiza una entrevista interactiva al desarrollador y crea la estructura base del proyecto automáticamente.
3. **Aprendizaje Continuo:** Cada error se documenta y se cruza con las reglas globales para que el agente del futuro no vuelva a caer en la misma trampa.

## 📖 El Tridente (Los 3 Archivos)
1. `gemini.md` (o `rules.md`): Identidad, stack tecnológico y reglas innegociables.
2. `plan_maestro.md`: Hoja de ruta, sprints activos y bitácora de decisiones.
3. `lecciones_aprendidas.md`: Minas activas, problemas históricos y bugs.

## 🛠️ Instalación en tu Ecosistema
1. Clona este repositorio o descarga la carpeta `tridente-de-memoria`.
2. Colócala en el directorio global de skills de tu agente IA (por ejemplo: `~/.gemini/config/skills/`).
3. En tu próximo chat, simplemente dile a tu IA: *"Inicia este proyecto usando el Tridente de Memoria"*.

---
*Creado por la comunidad de Whoami-Labs para potenciar el desarrollo con Inteligencia Artificial.*

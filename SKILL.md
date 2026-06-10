---
name: tridente-de-memoria
description: Sistema de memoria persistente basado en 3 archivos (plan_maestro, gemini/reglas, lecciones_aprendidas). Inicializa proyectos con una entrevista interactiva y se usa SIEMPRE antes de escribir código para mantener el contexto. Optimizado para Gemini y otros agentes autónomos.
---

# 🔱 Tridente de Memoria (Memory Trident)

Este skill define el protocolo de "Memoria Persistente Compartida", una metodología diseñada para inicializar proyectos y mantener el contexto de agentes de IA perfectamente sincronizado.

## 📖 El Concepto
El Tridente está compuesto por 3 archivos interconectados que actúan como el cerebro del proyecto.
**Regla de Oro: NINGÚN CÓDIGO SE ESCRIBE SIN ANTES LEER EL TRIDENTE.**

1. **El Archivo de Reglas (`gemini.md` u homólogo):** Identidad, stack tecnológico y reglas innegociables.
2. **El Plan Maestro (`plan_maestro.md`):** Hoja de ruta, sprints activos y bitácora de decisiones.
3. **Las Lecciones Aprendidas (`lecciones_aprendidas.md`):** Minas activas, problemas históricos y bugs.

---

## 🚀 Fase Cero: Inicialización (Setup del Proyecto)

Si estás en un proyecto nuevo o el usuario te pide implementar/instalar el "Tridente de Memoria" y los archivos NO existen, **está estrictamente prohibido crearlos vacíos o inventar el proyecto.**

Debes iniciar una **Entrevista Interactiva** con el usuario haciéndole estas preguntas clave (una por una o en un bloque claro):
1. **¿Cuál es el objetivo principal del proyecto?**
2. **¿Qué Stack Tecnológico vamos a utilizar?** (Frontend, Backend, Base de Datos, etc.)
3. **¿Tienes alguna regla innegociable, límite de diseño o preferencia de infraestructura?**
4. **¿Cuál sería el primer hito o sprint para empezar a trabajar?**

**Generación Automática:** Una vez que el usuario te responda, utilizarás esa información para **crear y poblar automáticamente** los tres archivos (`gemini.md`, `plan_maestro.md`, `lecciones_aprendidas.md` con su estructura inicial). ¡El proyecto nacerá con cerebro!

---

## 🔒 Protocolo de Lectura (Durante el Desarrollo)

Siempre que inicies un task o vayas a modificar código, ejecuta este protocolo:

1. **Analiza el estado:** Lee los 3 archivos para saber dónde estás, qué límites tienes y qué errores no debes cometer.
2. **Haz Preguntas:** Si el requerimiento es ambiguo, formula tus dudas al usuario ANTES de escribir una sola línea de código.
3. **Sincroniza:** Usa las decisiones acordadas con el usuario para actualizar el tridente *antes* de proceder a programar.

---

## ✍️ Protocolo de Escritura y Actualización (El Orden Sagrado)

Los archivos deben mantenerse **interconectados**. Si hay un cambio arquitectónico, un bug resuelto o una decisión clave, el orden de actualización es ESTRICTO para no perder la coherencia:

1. **PRIMERO - `lecciones_aprendidas.md`:** 
   - Documenta el fallo o la lección técnica. *¿Por qué?* Para que el agente del futuro no vuelva a caer en la trampa.

2. **SEGUNDO - Archivo de Reglas (`gemini.md`):**
   - Modifica este archivo **SOLO** si la lección aprendida altera las reglas globales, el stack, los comandos o las directrices de diseño.

3. **TERCERO - `plan_maestro.md`:**
   - Marca la tarea relacionada como completada `[x]`.
   - Registra la decisión tomada en la sección de **Bitácora de Decisiones** vinculando lógicamente a los otros archivos.

---

## 🔗 Regla de Interconexión
No trates a los archivos como entidades aisladas. Si en el `plan_maestro.md` se toma una decisión de diseño, asegúrate de que `gemini.md` refleje ese cambio en su identidad; y si la implementación tiene trampas de código, crúzalas con `lecciones_aprendidas.md`. Todo es un solo organismo.

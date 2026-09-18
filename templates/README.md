<!-- tridente:header-start -->
<!-- GENERADO POR scripts/sync.mjs — NO EDITAR A MANO.
     Fuente de verdad: protocol/tridente.spec.json
     Regenerar con: node scripts/sync.mjs -->
<!-- tridente:header-end -->

# Plantillas del Tridente de Memoria

Los 3 archivos maestros en blanco. Contienen **tokens** `{{...}}` que rellenan
`init-tridente.sh` / `init-tridente.ps1`. Si copias una plantilla a mano, sustituye cada token
por tu texto.

Los scripts de inicialización **no contienen** el texto de las plantillas: lo leen de esta carpeta.
Por eso script y plantilla no pueden desincronizarse.

| Token | Pregunta de la Fase Cero | Aparece en |
| :--- | :--- | :--- |
| `{{PROJECT_NAME}}` | *(automático)* | `gemini.md`, `plan_maestro.md`, `lecciones_aprendidas.md` |
| `{{DATE}}` | *(fecha actual, automática)* | `plan_maestro.md`, `lecciones_aprendidas.md` |
| `{{GOAL}}` | ¿Cuál es el objetivo principal del proyecto? | `gemini.md` |
| `{{STACK}}` | ¿Qué stack tecnológico vamos a utilizar? | `gemini.md` |
| `{{RULES}}` | ¿Qué regla es innegociable en este proyecto? | `gemini.md` |
| `{{MILESTONE}}` | ¿Cuál es el primer hito o sprint? | `plan_maestro.md` |

`@dirname` = nombre de la carpeta de destino · `@today` = fecha actual en YYYY-MM-DD.

---

*Generado desde `protocol/tridente.spec.json`. No editar a mano.*

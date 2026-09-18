#!/usr/bin/env bash
# tridente:header-start
# GENERADO POR scripts/sync.mjs — NO EDITAR A MANO.
# Fuente de verdad: protocol/tridente.spec.json
# tridente:header-end
#
# Datos del protocolo para init-tridente.sh. Se carga con 'source'.

TRIDENTE_VERSION="2.5.1"
TRIDENTE_DATE_FORMAT="+%Y-%m-%d"

# Archivos maestros, en orden de lectura.
TRIDENTE_MASTERS=("gemini.md" "plan_maestro.md" "lecciones_aprendidas.md")

# Rol de cada archivo maestro, para el resumen final (mismo orden).
TRIDENTE_ROLES=("🧬 El ADN" "🗺️ La Brújula" "🛡️ El Escudo")

# Tokens sustituibles en las plantillas.
TRIDENTE_TOKENS=("{{PROJECT_NAME}}" "{{DATE}}" "{{GOAL}}" "{{STACK}}" "{{RULES}}" "{{MILESTONE}}")

# Entrevista de la Fase Cero: sólo los tokens que se preguntan (arrays paralelos).
TRIDENTE_ASK_TOKENS=("{{GOAL}}" "{{STACK}}" "{{RULES}}" "{{MILESTONE}}")
TRIDENTE_ASK_QUESTIONS=("¿Cuál es el objetivo principal del proyecto?" "¿Qué stack tecnológico vamos a utilizar?" "¿Qué regla es innegociable en este proyecto?" "¿Cuál es el primer hito o sprint?")
TRIDENTE_ASK_HINTS=("Ej: API de pagos con conciliación automática" "Ej: React + Node.js + PostgreSQL + Vercel" "Ej: TypeScript estricto, sin dependencias nuevas sin aprobación" "Ej: MVP con login y CRUD de usuarios")

# Adaptadores: clave corta -> ruta (arrays paralelos, mismo índice).
TRIDENTE_ADAPTER_KEYS=("agents" "cursor" "claude" "gemini" "copilot" "windsurf" "roo" "junie" "amazonq" "idx" "aider" "devin" "cline")
TRIDENTE_ADAPTER_PATHS=("AGENTS.md" ".cursor/rules/tridente.mdc" "CLAUDE.md" ".gemini/settings.json" ".github/copilot-instructions.md" ".windsurfrules" ".roo/rules/tridente.md" ".junie/guidelines.md" ".amazonq/rules/tridente.md" ".idx/airules.md" "CONVENTIONS.md" ".devin/rules/tridente.md" ".clinerules/tridente.md")

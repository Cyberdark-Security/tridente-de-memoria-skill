# tridente:header-start
# GENERADO POR scripts/sync.mjs — NO EDITAR A MANO.
# Fuente de verdad: protocol/tridente.spec.json
# tridente:header-end
#
# Datos del protocolo para init-tridente.ps1. Se carga con dot-sourcing.

$TridenteVersion = '2.5.1'
$TridenteDateFormat = 'yyyy-MM-dd'

# Archivos maestros, en orden de lectura.
$TridenteMasters = @('gemini.md', 'plan_maestro.md', 'lecciones_aprendidas.md')

# Rol de cada archivo maestro, para el resumen final (mismo orden).
$TridenteRoles = @('🧬 El ADN', '🗺️ La Brújula', '🛡️ El Escudo')

# Tokens sustituibles en las plantillas.
$TridenteTokens = @('{{PROJECT_NAME}}', '{{DATE}}', '{{GOAL}}', '{{STACK}}', '{{RULES}}', '{{MILESTONE}}')

# Entrevista de la Fase Cero: sólo los tokens que se preguntan.
$TridenteAsk = @(
    @{ Token = '{{GOAL}}'; Question = '¿Cuál es el objetivo principal del proyecto?'; Hint = 'Ej: API de pagos con conciliación automática' }
    @{ Token = '{{STACK}}'; Question = '¿Qué stack tecnológico vamos a utilizar?'; Hint = 'Ej: React + Node.js + PostgreSQL + Vercel' }
    @{ Token = '{{RULES}}'; Question = '¿Qué regla es innegociable en este proyecto?'; Hint = 'Ej: TypeScript estricto, sin dependencias nuevas sin aprobación' }
    @{ Token = '{{MILESTONE}}'; Question = '¿Cuál es el primer hito o sprint?'; Hint = 'Ej: MVP con login y CRUD de usuarios' }
)

# Adaptadores: clave corta -> ruta.
$TridenteAdapters = [ordered]@{
    'agents' = 'AGENTS.md'
    'cursor' = '.cursor/rules/tridente.mdc'
    'claude' = 'CLAUDE.md'
    'gemini' = '.gemini/settings.json'
    'copilot' = '.github/copilot-instructions.md'
    'windsurf' = '.windsurfrules'
    'roo' = '.roo/rules/tridente.md'
    'junie' = '.junie/guidelines.md'
    'amazonq' = '.amazonq/rules/tridente.md'
    'idx' = '.idx/airules.md'
    'aider' = 'CONVENTIONS.md'
    'devin' = '.devin/rules/tridente.md'
    'cline' = '.clinerules/tridente.md'
}

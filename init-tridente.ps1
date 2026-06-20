# 🔱 Tridente de Memoria — Script de Inicialización (Windows)
# Powered by Cyberdark & Whoami Labs
# https://github.com/Cyberdark-Security/tridente-de-memoria-skill

$ErrorActionPreference = "Stop"

function Write-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║  🔱 Tridente de Memoria                       ║" -ForegroundColor Magenta
    Write-Host "║  Memoria persistente para agentes de IA     ║" -ForegroundColor Magenta
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
}

Write-Header

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if files already exist
$existingFiles = @()
if (Test-Path "gemini.md") { $existingFiles += "gemini.md" }
if (Test-Path "plan_maestro.md") { $existingFiles += "plan_maestro.md" }
if (Test-Path "lecciones_aprendidas.md") { $existingFiles += "lecciones_aprendidas.md" }

if ($existingFiles.Count -gt 0) {
    Write-Host "⚠️  Los siguientes archivos ya existen: $($existingFiles -join ', ')" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas sobrescribirlos? (s/n)"
    if ($response -notmatch "^[Ss]$") {
        Write-Host "Abortando inicialización." -ForegroundColor Red
        exit
    }
}

Write-Host "Responde las siguientes preguntas para generar tu Tridente:" -ForegroundColor Cyan
Write-Host ""

# 1. Goal
Write-Host "1. ¿Cuál es el objetivo principal del proyecto?" -ForegroundColor Green
$PROJECT_GOAL = Read-Host ">"

# 2. Stack
Write-Host "2. ¿Qué Stack Tecnológico vamos a utilizar?" -ForegroundColor Green
Write-Host "   (Ej: React + Node.js + PostgreSQL + Vercel)" -ForegroundColor DarkGray
$PROJECT_STACK = Read-Host ">"

# 3. Rules
Write-Host "3. ¿Tienes alguna regla innegociable o preferencia?" -ForegroundColor Green
Write-Host "   (Ej: TypeScript estricto, sin librerías sin aprobación)" -ForegroundColor DarkGray
$PROJECT_RULES = Read-Host ">"

# 4. First Milestone
Write-Host "4. ¿Cuál sería el primer hito o sprint?" -ForegroundColor Green
$PROJECT_MILESTONE = Read-Host ">"

$PROJECT_NAME = (Get-Item .).Name
$DATE = Get-Date -Format "dd/MM/yyyy"

Write-Host ""
Write-Host "⚙️  Generando archivos del Tridente..." -ForegroundColor Cyan
Write-Host ""

# Create gemini.md (ADN)
@"
# 🧬 ADN del Proyecto: $PROJECT_NAME

> Archivo maestro 1/3 del Tridente de Memoria.

## 📋 Identidad y Propósito

- **Misión:** $PROJECT_GOAL

## 🛠️ Stack Tecnológico

$PROJECT_STACK

## 📜 Reglas Innegociables

1. $PROJECT_RULES
2. Seguir estrictamente el protocolo del Tridente de Memoria.
3. Leer los 3 archivos maestros antes de escribir código.

## 🏗️ Arquitectura y Estándares

- [Pendiente de definir durante el primer sprint]

## 🔗 Referencias cruzadas

- Sprint activo → ``plan_maestro.md``
- Bugs y trampas → ``lecciones_aprendidas.md``
"@ | Out-File -FilePath "gemini.md" -Encoding utf8NoBOM

# Create plan_maestro.md
@"
# 🗺️ Plan Maestro: $PROJECT_NAME

> Archivo maestro 2/3 del Tridente de Memoria.

## 🎯 Próximo Hito (Milestone)

- **Objetivo:** $PROJECT_MILESTONE

## 🏃 Sprint Activo

- [ ] Configuración inicial del proyecto
- [ ] Implementación de estructura base
- [ ] Definir arquitectura y estándares en ``gemini.md``

## 📝 Backlog (Pendientes)

- [ ] [Tarea futura 1]

## 📓 Bitácora de Decisiones

### $DATE

- **Decisión:** Inicialización del proyecto con Tridente de Memoria.
- **Razón:** Establecer una base de memoria persistente y contexto claro.
- **Impacto:** Se crean los 3 archivos maestros del proyecto.
"@ | Out-File -FilePath "plan_maestro.md" -Encoding utf8NoBOM

# Create lecciones_aprendidas.md
@"
# 🛡️ Lecciones Aprendidas

> Archivo maestro 3/3 del Tridente de Memoria.

## ⚠️ Minas Activas (Bugs conocidos / Trampas)

| Componente | Descripción | Estado |
| :--- | :--- | :---: |
| — | Aún no se han detectado minas en este proyecto | 🟢 Limpio |

## 🧠 Conocimiento Adquirido

### $DATE — Inicio del proyecto

- **Problema:** Proyecto sin memoria persistente para agentes de IA.
- **Solución:** Implementación del Tridente de Memoria (3 archivos interconectados).
- **Prevención:** Leer siempre los 3 archivos antes de escribir código.
- **Impacto en reglas:** No
"@ | Out-File -FilePath "lecciones_aprendidas.md" -Encoding utf8NoBOM

# Copy AGENTS.md if available and not already present
$agentsSource = Join-Path $ScriptDir "AGENTS.md"
if ((Test-Path $agentsSource) -and -not (Test-Path "AGENTS.md")) {
    Copy-Item $agentsSource "AGENTS.md"
    Write-Host "✓ AGENTS.md copiado a la raíz del proyecto" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ ¡Tridente de Memoria inicializado con éxito!" -ForegroundColor Green
Write-Host ""
Write-Host "  🧬 gemini.md               — El ADN" -ForegroundColor Cyan
Write-Host "  🗺️  plan_maestro.md         — La Brújula" -ForegroundColor Cyan
Write-Host "  🛡️  lecciones_aprendidas.md — El Escudo" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximo paso: Abre tu agente de IA y dile:" -ForegroundColor Blue
Write-Host '  "Lee el Tridente de Memoria y empecemos a trabajar"' -ForegroundColor White
Write-Host ""

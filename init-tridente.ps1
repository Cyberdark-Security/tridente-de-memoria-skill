# Tridente de Memoria - Initialization Script (Windows)
# Powered by Cyberdark & Whoami Labs

$ErrorActionPreference = "Stop"

Write-Host "🔱 Iniciando Tridente de Memoria..." -ForegroundColor Cyan
Write-Host "Este script configurará la estructura de memoria persistente para tu proyecto.`n"

# Check if files already exist
$existingFiles = @()
if (Test-Path "gemini.md") { $existingFiles += "gemini.md" }
if (Test-Path "plan_maestro.md") { $existingFiles += "plan_maestro.md" }
if (Test-Path "lecciones_aprendidas.md") { $existingFiles += "lecciones_aprendidas.md" }

if ($existingFiles.Count -gt 0) {
    Write-Host "⚠️ Advertencia: Los siguientes archivos ya existen: $($existingFiles -join ', ')" -ForegroundColor Red
    $response = Read-Host "¿Deseas sobrescribirlos? (s/n)"
    if ($response -notmatch "^[Ss]$") {
        Write-Host "Abortando inicialización." -ForegroundColor Yellow
        exit
    }
}

# 1. Goal
Write-Host "1. ¿Cuál es el objetivo principal del proyecto?" -ForegroundColor Green
$PROJECT_GOAL = Read-Host ">"

# 2. Stack
Write-Host "2. ¿Qué Stack Tecnológico vamos a utilizar?" -ForegroundColor Green
$PROJECT_STACK = Read-Host ">"

# 3. Rules
Write-Host "3. ¿Tienes alguna regla innegociable o preferencia?" -ForegroundColor Green
$PROJECT_RULES = Read-Host ">"

# 4. First Milestone
Write-Host "4. ¿Cuál sería el primer hito o sprint?" -ForegroundColor Green
$PROJECT_MILESTONE = Read-Host ">"

$PROJECT_NAME = (Get-Item .).Name
$DATE = Get-Date -Format "dd/MM/yyyy"

Write-Host "`n⚙️ Generando archivos..." -ForegroundColor Cyan

# Create gemini.md (ADN)
@"
# 🧬 ADN del Proyecto: $PROJECT_NAME

## 📋 Identidad y Propósito
- **Misión:** $PROJECT_GOAL

## 🛠️ Stack Tecnológico
$PROJECT_STACK

## 📜 Reglas Innegociables
1. $PROJECT_RULES
2. Seguir estrictamente el protocolo del Tridente de Memoria.

## 🏗️ Arquitectura y Estándares
- [Pendiente de definir]
"@ | Out-File -FilePath "gemini.md" -Encoding utf8

# Create plan_maestro.md
@"
# 🗺️ Plan Maestro: $PROJECT_NAME

## 🎯 Próximo Hito (Milestone)
- **Objetivo:** $PROJECT_MILESTONE

## 🏃 Sprint Activo
- [ ] Configuración inicial del proyecto
- [ ] Implementación de estructura base

## 📝 Backlog (Pendientes)
- [ ] [Tarea futura 1]

## 📓 Bitácora de Decisiones
### $DATE
- **Decisión:** Inicialización del proyecto con Tridente de Memoria.
- **Razón:** Establecer una base de memoria persistente y contexto claro.
"@ | Out-File -FilePath "plan_maestro.md" -Encoding utf8

# Create lecciones_aprendidas.md
@"
# 🛡️ Lecciones Aprendidas

## ⚠️ Minas Activas (Bugs conocidos / Trampas)
- [Aún no se han detectado minas en este proyecto]

## 🧠 Conocimiento Adquirido
### $DATE - Inicio del proyecto
- **Lección:** La importancia de definir el contexto antes de programar.
"@ | Out-File -FilePath "lecciones_aprendidas.md" -Encoding utf8

Write-Host "`n✅ ¡Tridente de Memoria inicializado con éxito!" -ForegroundColor Green
Write-Host "Archivos creados: gemini.md, plan_maestro.md, lecciones_aprendidas.md" -ForegroundColor Cyan

#!/bin/bash

# 🔱 Tridente de Memoria — Script de Inicialización
# Powered by Cyberdark & Whoami Labs
# https://github.com/Cyberdark-Security/tridente-de-memoria-skill

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC}  ${BOLD}🔱 Tridente de Memoria${NC}                       ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}║${NC}  Memoria persistente para agentes de IA     ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

print_header

# Check if files already exist
EXISTING_FILES=()
[ -f gemini.md ] && EXISTING_FILES+=("gemini.md")
[ -f plan_maestro.md ] && EXISTING_FILES+=("plan_maestro.md")
[ -f lecciones_aprendidas.md ] && EXISTING_FILES+=("lecciones_aprendidas.md")

if [ ${#EXISTING_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Los siguientes archivos ya existen: ${EXISTING_FILES[*]}${NC}"
    read -p "¿Deseas sobrescribirlos? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${RED}Abortando inicialización.${NC}"
        exit 1
    fi
fi

echo -e "${CYAN}Responde las siguientes preguntas para generar tu Tridente:${NC}\n"

# 1. Goal
echo -e "${GREEN}${BOLD}1.${NC} ${GREEN}¿Cuál es el objetivo principal del proyecto?${NC}"
read -r -p "> " PROJECT_GOAL

# 2. Stack
echo -e "${GREEN}${BOLD}2.${NC} ${GREEN}¿Qué Stack Tecnológico vamos a utilizar?${NC}"
echo -e "${BLUE}   (Ej: React + Node.js + PostgreSQL + Vercel)${NC}"
read -r -p "> " PROJECT_STACK

# 3. Rules
echo -e "${GREEN}${BOLD}3.${NC} ${GREEN}¿Tienes alguna regla innegociable o preferencia?${NC}"
echo -e "${BLUE}   (Ej: TypeScript estricto, sin librerías sin aprobación)${NC}"
read -r -p "> " PROJECT_RULES

# 4. First Milestone
echo -e "${GREEN}${BOLD}4.${NC} ${GREEN}¿Cuál sería el primer hito o sprint?${NC}"
read -r -p "> " PROJECT_MILESTONE

PROJECT_NAME=$(basename "$PWD")
DATE=$(date +%d/%m/%Y)

echo -e "\n${BLUE}⚙️  Generando archivos del Tridente...${NC}\n"

# Create gemini.md (ADN)
cat <<EOF > gemini.md
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

- Sprint activo → \`plan_maestro.md\`
- Bugs y trampas → \`lecciones_aprendidas.md\`
EOF

# Create plan_maestro.md
cat <<EOF > plan_maestro.md
# 🗺️ Plan Maestro: $PROJECT_NAME

> Archivo maestro 2/3 del Tridente de Memoria.

## 🎯 Próximo Hito (Milestone)

- **Objetivo:** $PROJECT_MILESTONE

## 🏃 Sprint Activo

- [ ] Configuración inicial del proyecto
- [ ] Implementación de estructura base
- [ ] Definir arquitectura y estándares en \`gemini.md\`

## 📝 Backlog (Pendientes)

- [ ] [Tarea futura 1]

## 📓 Bitácora de Decisiones

### $DATE

- **Decisión:** Inicialización del proyecto con Tridente de Memoria.
- **Razón:** Establecer una base de memoria persistente y contexto claro.
- **Impacto:** Se crean los 3 archivos maestros del proyecto.
EOF

# Create lecciones_aprendidas.md
cat <<EOF > lecciones_aprendidas.md
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
EOF

# Copy AGENTS.md if available and not already present
if [ -f "$SCRIPT_DIR/AGENTS.md" ] && [ ! -f AGENTS.md ]; then
    cp "$SCRIPT_DIR/AGENTS.md" AGENTS.md
    echo -e "${GREEN}✓${NC} AGENTS.md copiado a la raíz del proyecto"
fi

echo ""
echo -e "${GREEN}${BOLD}✅ ¡Tridente de Memoria inicializado con éxito!${NC}"
echo ""
echo -e "  ${CYAN}🧬${NC} gemini.md              — El ADN"
echo -e "  ${CYAN}🗺️${NC}  plan_maestro.md        — La Brújula"
echo -e "  ${CYAN}🛡️${NC}  lecciones_aprendidas.md — El Escudo"
echo ""
echo -e "${BLUE}Próximo paso:${NC} Abre tu agente de IA y dile:"
echo -e "  ${BOLD}\"Lee el Tridente de Memoria y empecemos a trabajar\"${NC}"
echo ""

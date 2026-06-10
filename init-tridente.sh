#!/bin/bash

# Tridente de Memoria - Initialization Script
# Powered by Cyberdark & Whoami Labs

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔱 Iniciando Tridente de Memoria...${NC}"
echo -e "Este script configurará la estructura de memoria persistente para tu proyecto.\n"

# Check if files already exist
EXISTING_FILES=()
[ -f gemini.md ] && EXISTING_FILES+=("gemini.md")
[ -f plan_maestro.md ] && EXISTING_FILES+=("plan_maestro.md")
[ -f lecciones_aprendidas.md ] && EXISTING_FILES+=("lecciones_aprendidas.md")

if [ ${#EXISTING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}⚠️ Advertencia: Los siguientes archivos ya existen: ${EXISTING_FILES[*]}${NC}"
    read -p "¿Deseas sobrescribirlos? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}Abortando inicialización.${NC}"
        exit 1
    fi
fi

# 1. Goal
echo -e "${GREEN}1. ¿Cuál es el objetivo principal del proyecto?${NC}"
read -r -p "> " PROJECT_GOAL

# 2. Stack
echo -e "${GREEN}2. ¿Qué Stack Tecnológico vamos a utilizar?${NC}"
read -r -p "> " PROJECT_STACK

# 3. Rules
echo -e "${GREEN}3. ¿Tienes alguna regla innegociable o preferencia?${NC}"
read -r -p "> " PROJECT_RULES

# 4. First Milestone
echo -e "${GREEN}4. ¿Cuál sería el primer hito o sprint?${NC}"
read -r -p "> " PROJECT_MILESTONE

PROJECT_NAME=$(basename "$PWD")

echo -e "\n${BLUE}⚙️ Generando archivos...${NC}"

# Create gemini.md (ADN)
cat <<EOF > gemini.md
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
EOF

# Create plan_maestro.md
cat <<EOF > plan_maestro.md
# 🗺️ Plan Maestro: $PROJECT_NAME

## 🎯 Próximo Hito (Milestone)
- **Objetivo:** $PROJECT_MILESTONE

## 🏃 Sprint Activo
- [ ] Configuración inicial del proyecto
- [ ] Implementación de estructura base

## 📝 Backlog (Pendientes)
- [ ] [Tarea futura 1]

## 📓 Bitácora de Decisiones
### $(date +%d/%m/%Y)
- **Decisión:** Inicialización del proyecto con Tridente de Memoria.
- **Razón:** Establecer una base de memoria persistente y contexto claro.
EOF

# Create lecciones_aprendidas.md
cat <<EOF > lecciones_aprendidas.md
# 🛡️ Lecciones Aprendidas

## ⚠️ Minas Activas (Bugs conocidos / Trampas)
- [Aún no se han detectado minas en este proyecto]

## 🧠 Conocimiento Adquirido
### $(date +%d/%m/%Y) - Inicio del proyecto
- **Lección:** La importancia de definir el contexto antes de programar.
EOF

echo -e "\n${GREEN}✅ ¡Tridente de Memoria inicializado con éxito!${NC}"
echo -e "Archivos creados: ${BLUE}gemini.md, plan_maestro.md, lecciones_aprendidas.md${NC}"

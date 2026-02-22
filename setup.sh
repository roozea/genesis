#!/bin/bash
# GENESIS — Script de instalación automática
# Instala Ollama y descarga el modelo qwen2.5:7b

set -e

echo "🏗️  GENESIS — Setup"
echo "===================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detectar OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "📦 Sistema detectado: $OS ($ARCH)"
echo ""

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Instalar Ollama si no existe
if command_exists ollama; then
    echo -e "${GREEN}✓ Ollama ya está instalado${NC}"
    ollama --version
else
    echo -e "${YELLOW}⬇️  Instalando Ollama...${NC}"

    if [[ "$OS" == "Darwin" ]]; then
        # macOS
        if command_exists brew; then
            brew install ollama
        else
            curl -fsSL https://ollama.com/install.sh | sh
        fi
    elif [[ "$OS" == "Linux" ]]; then
        # Linux
        curl -fsSL https://ollama.com/install.sh | sh
    else
        echo -e "${RED}❌ Sistema operativo no soportado: $OS${NC}"
        echo "Por favor instala Ollama manualmente: https://ollama.com/download"
        exit 1
    fi

    echo -e "${GREEN}✓ Ollama instalado${NC}"
fi

echo ""

# 2. Iniciar Ollama si no está corriendo
echo "🔄 Verificando servicio Ollama..."

# Intentar conectar a Ollama
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama está corriendo${NC}"
else
    echo -e "${YELLOW}⚡ Iniciando Ollama...${NC}"

    # Iniciar Ollama en background
    if [[ "$OS" == "Darwin" ]]; then
        # En macOS, usar open para la app o ollama serve
        if [ -d "/Applications/Ollama.app" ]; then
            open -a Ollama
            sleep 3
        else
            ollama serve &
            sleep 2
        fi
    else
        ollama serve &
        sleep 2
    fi

    # Esperar a que esté listo
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Ollama iniciado${NC}"
            break
        fi
        echo "   Esperando... ($i/10)"
        sleep 1
    done
fi

echo ""

# 3. Descargar modelo qwen2.5:7b si no existe
echo "🤖 Verificando modelo qwen2.5:7b..."

if ollama list | grep -q "qwen2.5:7b"; then
    echo -e "${GREEN}✓ Modelo qwen2.5:7b ya descargado${NC}"
else
    echo -e "${YELLOW}⬇️  Descargando qwen2.5:7b (~4.7GB)...${NC}"
    echo "   Esto puede tomar varios minutos..."
    ollama pull qwen2.5:7b
    echo -e "${GREEN}✓ Modelo descargado${NC}"
fi

echo ""

# 4. Instalar dependencias de Node si es necesario
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependencias de Node..."
        npm install
        echo -e "${GREEN}✓ Dependencias instaladas${NC}"
    else
        echo -e "${GREEN}✓ Dependencias de Node ya instaladas${NC}"
    fi
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Setup completado!${NC}"
echo ""
echo "Para iniciar Genesis:"
echo -e "  ${YELLOW}./start.sh${NC}"
echo ""
echo "O manualmente:"
echo "  npm run dev"
echo ""

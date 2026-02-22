#!/bin/bash
# GENESIS — Script de inicio
# Arranca Ollama (si está disponible) + Vite en un solo comando

set -e

echo "🏗️  GENESIS — Starting..."
echo "========================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Detectar OS
OS="$(uname -s)"

# Función para verificar si Ollama está corriendo
ollama_running() {
    curl -s http://localhost:11434/api/tags >/dev/null 2>&1
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función de limpieza al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo Genesis...${NC}"

    # Matar procesos hijos
    if [ ! -z "$VITE_PID" ]; then
        kill $VITE_PID 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ Genesis detenido${NC}"
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT SIGTERM

# 1. Verificar/Iniciar Ollama
if command_exists ollama; then
    if ollama_running; then
        echo -e "${GREEN}✓ Ollama detectado y corriendo${NC}"

        # Verificar modelo
        if ollama list 2>/dev/null | grep -q "qwen2.5:7b"; then
            echo -e "${GREEN}✓ Modelo qwen2.5:7b disponible${NC}"
            echo -e "${CYAN}🖥️  Modo: LOCAL (Ollama + qwen2.5:7b)${NC}"
        else
            echo -e "${YELLOW}⚠️  Modelo qwen2.5:7b no encontrado${NC}"
            echo -e "${CYAN}☁️  Modo: API (con fallback a local si se instala)${NC}"
        fi
    else
        echo -e "${YELLOW}⚡ Iniciando Ollama...${NC}"

        # Iniciar Ollama en background
        if [[ "$OS" == "Darwin" ]] && [ -d "/Applications/Ollama.app" ]; then
            open -a Ollama
        else
            ollama serve >/dev/null 2>&1 &
        fi

        # Esperar a que esté listo
        for i in {1..5}; do
            sleep 1
            if ollama_running; then
                echo -e "${GREEN}✓ Ollama iniciado${NC}"
                break
            fi
        done

        if ollama_running && ollama list 2>/dev/null | grep -q "qwen2.5:7b"; then
            echo -e "${CYAN}🖥️  Modo: LOCAL${NC}"
        else
            echo -e "${CYAN}☁️  Modo: API${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Ollama no instalado${NC}"
    echo -e "${CYAN}☁️  Modo: API (Anthropic)${NC}"
    echo ""
    echo "Para usar modo local, ejecuta primero:"
    echo -e "  ${YELLOW}./setup.sh${NC}"
fi

echo ""

# 2. Verificar dependencias de Node
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

echo ""
echo "========================================"
echo -e "${GREEN}🚀 Iniciando servidor de desarrollo...${NC}"
echo ""
echo "Genesis estará disponible en:"
echo -e "  ${CYAN}http://localhost:5173${NC}"
echo ""
echo "Presiona Ctrl+C para detener"
echo "========================================"
echo ""

# 3. Iniciar Vite
npm run dev &
VITE_PID=$!

# Esperar al proceso de Vite
wait $VITE_PID

// GENESIS — Sistema híbrido de LLM con auto-detección
// Fallback chain: Local (Ollama) → Haiku → Sonnet → Random

// Estado global del sistema de IA
let llmState = {
  ollamaAvailable: false,
  ollamaModel: null,
  apiKeyAvailable: false,
  initialized: false,
  currentSource: 'checking', // 'local' | 'api' | 'fallback' | 'checking'
};

// Listeners para cambios de estado
const stateListeners = new Set();

// URL del proxy de Vite para Ollama (evita CORS)
const OLLAMA_PROXY_URL = '/ollama';

/**
 * Registra un listener para cambios de estado
 */
export function onStateChange(callback) {
  stateListeners.add(callback);
  // Llamar inmediatamente con el estado actual
  callback(llmState);
  return () => stateListeners.delete(callback);
}

/**
 * Notifica a todos los listeners
 */
function notifyListeners() {
  stateListeners.forEach(cb => cb(llmState));
}

/**
 * Obtiene el estado actual del LLM
 */
export function getLlmState() {
  return { ...llmState };
}

/**
 * Inicializa el sistema de LLM detectando qué está disponible
 */
export async function initLlm() {
  if (llmState.initialized) {
    return llmState;
  }

  console.log('[llm] Iniciando auto-detección...');

  // 1. Detectar Ollama
  llmState.ollamaAvailable = await checkOllama();
  if (llmState.ollamaAvailable) {
    llmState.ollamaModel = await getOllamaModel();
    console.log(`[llm] ✓ Ollama disponible con modelo: ${llmState.ollamaModel}`);
  } else {
    console.log('[llm] ✗ Ollama no disponible');
  }

  // 2. Detectar API Key
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  llmState.apiKeyAvailable = !!(apiKey && apiKey.length > 10 && apiKey !== 'tu-api-key-aqui');
  if (llmState.apiKeyAvailable) {
    console.log('[llm] ✓ API Key configurada');
  } else {
    console.log('[llm] ✗ API Key no configurada');
  }

  // 3. Determinar fuente principal
  if (llmState.ollamaAvailable && llmState.ollamaModel) {
    llmState.currentSource = 'local';
  } else if (llmState.apiKeyAvailable) {
    llmState.currentSource = 'api';
  } else {
    llmState.currentSource = 'fallback';
  }

  llmState.initialized = true;
  notifyListeners();

  console.log(`[llm] Modo activo: ${llmState.currentSource.toUpperCase()}`);
  return llmState;
}

/**
 * Verifica si Ollama está disponible
 */
async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_PROXY_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Obtiene el modelo de Ollama disponible (preferencia: qwen2.5:7b)
 */
async function getOllamaModel() {
  try {
    const response = await fetch(`${OLLAMA_PROXY_URL}/api/tags`);
    if (!response.ok) return null;

    const data = await response.json();
    const models = data.models || [];

    // Buscar qwen2.5:7b primero
    const qwen = models.find(m => m.name.includes('qwen2.5:7b'));
    if (qwen) return qwen.name;

    // Luego cualquier qwen
    const anyQwen = models.find(m => m.name.includes('qwen'));
    if (anyQwen) return anyQwen.name;

    // Cualquier modelo disponible
    if (models.length > 0) return models[0].name;

    return null;
  } catch {
    return null;
  }
}

/**
 * Llama a Ollama (local)
 */
async function callOllama(systemPrompt, userMessage) {
  const response = await fetch(`${OLLAMA_PROXY_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: llmState.ollamaModel || 'qwen2.5:7b',
      prompt: `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 200,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || '';
}

/**
 * Llama a la API de Anthropic
 */
async function callAnthropic(systemPrompt, userMessage, model = 'haiku') {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'tu-api-key-aqui') {
    throw new Error('API Key no configurada');
  }

  const modelId = model === 'haiku'
    ? 'claude-3-haiku-20240307'
    : 'claude-3-5-sonnet-20241022';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: model === 'haiku' ? 150 : 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${error.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

/**
 * Función principal de pensamiento con fallback chain
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - Mensaje del usuario
 * @param {'fast' | 'chat'} tier - Tier de modelo (fast=movimiento, chat=conversación)
 * @returns {Promise<{response: string, source: string}>}
 */
export async function think(systemPrompt, userMessage, tier = 'fast') {
  // Asegurar inicialización
  if (!llmState.initialized) {
    await initLlm();
  }

  // Fallback chain según tier
  const chain = tier === 'fast'
    ? ['local', 'haiku', 'sonnet', 'fallback']
    : ['sonnet', 'haiku', 'local', 'fallback'];

  for (const source of chain) {
    try {
      let response;

      switch (source) {
        case 'local':
          if (!llmState.ollamaAvailable || !llmState.ollamaModel) continue;
          response = await callOllama(systemPrompt, userMessage);
          if (response && response.trim()) {
            return { response, source: 'local' };
          }
          break;

        case 'haiku':
          if (!llmState.apiKeyAvailable) continue;
          response = await callAnthropic(systemPrompt, userMessage, 'haiku');
          if (response && response.trim()) {
            return { response, source: 'haiku' };
          }
          break;

        case 'sonnet':
          if (!llmState.apiKeyAvailable) continue;
          response = await callAnthropic(systemPrompt, userMessage, 'sonnet');
          if (response && response.trim()) {
            return { response, source: 'sonnet' };
          }
          break;

        case 'fallback':
          // Retorna null para que el caller use su propio fallback
          return { response: null, source: 'fallback' };
      }
    } catch (error) {
      console.warn(`[llm] ${source} falló:`, error.message);
      // Continuar con el siguiente en la cadena
    }
  }

  return { response: null, source: 'fallback' };
}

/**
 * Versión simple que solo retorna el texto (compatibilidad)
 */
export async function thinkSimple(systemPrompt, userMessage, tier = 'fast') {
  const result = await think(systemPrompt, userMessage, tier);
  return result.response;
}

// Auto-inicializar al cargar el módulo
initLlm();

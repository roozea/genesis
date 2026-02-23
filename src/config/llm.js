// GENESIS — Sistema híbrido de LLM con auto-detección
// Fallback chain: Local (Ollama) → Haiku → Sonnet → Random

// Instrucción de idioma para Qwen (tiende a responder en chino)
const SPANISH_INSTRUCTION = 'IMPORTANTE: Responde SIEMPRE en español. NUNCA en chino, inglés u otro idioma.\n\n';

/**
 * Detecta si el texto contiene caracteres chinos
 */
function containsChinese(text) {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Fallbacks genéricos en español para cuando Ollama responde en chino
 */
const SPANISH_FALLBACKS = {
  fast: 'Explorando el lugar... 🔍',
  chat: 'Hmm, déjame pensar en eso... 🤔',
  task: 'Procesando la información...',
};

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
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - Mensaje del usuario
 * @param {string} tier - 'fast' para movimiento, 'chat' para conversación, 'task' para trabajo
 * @param {number} maxTokens - Límite de tokens
 * @param {boolean} forceSpanish - Si es true, refuerza más la instrucción de español (retry)
 */
async function callOllama(systemPrompt, userMessage, tier = 'fast', maxTokens = 100, forceSpanish = false) {
  // Agregar instrucción de español al inicio (Qwen es bilingüe y a veces responde en chino)
  const spanishPrefix = forceSpanish
    ? 'EN ESPAÑOL SOLAMENTE (NO CHINO): '
    : SPANISH_INSTRUCTION;

  // Formato de prompt limpio para Ollama
  const prompt = (tier === 'chat' || tier === 'task')
    ? `${spanishPrefix}${systemPrompt}\n\nRodrigo dice: "${userMessage}"\n\nArq responde (en español):`
    : `${spanishPrefix}${systemPrompt}\n\n${userMessage}`;

  const response = await fetch(`${OLLAMA_PROXY_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: llmState.ollamaModel || 'qwen2.5:7b',
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: maxTokens,
      },
    }),
    signal: AbortSignal.timeout(tier === 'task' ? 30000 : 15000), // 30s para task, 15s normal
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || '';
}

/**
 * Llama a la API de Anthropic
 * @param {number} maxTokens - Límite de tokens (default según modelo)
 */
async function callAnthropic(systemPrompt, userMessage, model = 'haiku', maxTokens = null) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'tu-api-key-aqui') {
    throw new Error('API Key no configurada');
  }

  const modelId = model === 'haiku'
    ? 'claude-3-haiku-20240307'
    : 'claude-3-5-sonnet-20241022';

  // Tokens por defecto según modelo, o usar el valor explícito
  const tokens = maxTokens || (model === 'haiku' ? 200 : 600);

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
      max_tokens: tokens,
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
 * @param {'fast' | 'chat' | 'task'} tier - Tier de modelo (fast=movimiento, chat=conversación, task=trabajo largo)
 * @returns {Promise<{response: string, source: string}>}
 */
export async function think(systemPrompt, userMessage, tier = 'fast') {
  // Asegurar inicialización
  if (!llmState.initialized) {
    await initLlm();
  }

  // Tokens según tier
  const maxTokens = tier === 'task' ? 800 : tier === 'chat' ? 400 : 150;
  const ollamaTokens = tier === 'task' ? 500 : tier === 'chat' ? 250 : 100;

  // Fallback chain: LOCAL SIEMPRE PRIMERO para todos los tiers
  // fast = movimiento (respuestas cortas)
  // chat = conversación (respuestas más elaboradas)
  // task = trabajo/deliverables (respuestas largas)
  const chain = ['local', 'haiku', 'sonnet', 'fallback'];

  console.log(`[LLM] think() tier=${tier}, tokens=${tier === 'fast' ? ollamaTokens : maxTokens}`);

  for (const source of chain) {
    try {
      let response;

      switch (source) {
        case 'local':
          if (!llmState.ollamaAvailable || !llmState.ollamaModel) {
            console.log('[LLM] local: saltando (no disponible)');
            continue;
          }
          console.log(`[LLM] local: intentando con ${llmState.ollamaModel}...`);
          response = await callOllama(systemPrompt, userMessage, tier, ollamaTokens);
          console.log('[LLM] local: respuesta:', response?.slice(0, 80) || '(vacía)');

          // Validar si respondió en chino (Qwen es bilingüe)
          if (response && containsChinese(response)) {
            console.warn('[LLM] ⚠️ Respuesta en chino detectada, reintentando con español forzado...');
            try {
              response = await callOllama(systemPrompt, userMessage, tier, ollamaTokens, true);
              console.log('[LLM] local retry:', response?.slice(0, 80) || '(vacía)');

              // Si sigue en chino, usar fallback español
              if (containsChinese(response)) {
                console.warn('[LLM] ⚠️ Sigue en chino, usando fallback español');
                response = SPANISH_FALLBACKS[tier] || SPANISH_FALLBACKS.fast;
              }
            } catch (retryError) {
              console.error('[LLM] Retry falló:', retryError.message);
              response = SPANISH_FALLBACKS[tier] || SPANISH_FALLBACKS.fast;
            }
          }

          if (response && response.trim()) {
            return { response, source: 'local' };
          }
          console.log('[LLM] local: respuesta vacía, continuando...');
          break;

        case 'haiku':
          if (!llmState.apiKeyAvailable) {
            console.log('[LLM] haiku: saltando (no API key)');
            continue;
          }
          console.log('[LLM] haiku: intentando...');
          response = await callAnthropic(systemPrompt, userMessage, 'haiku', maxTokens);
          console.log('[LLM] haiku: respuesta:', response?.slice(0, 80) || '(vacía)');
          if (response && response.trim()) {
            return { response, source: 'haiku' };
          }
          break;

        case 'sonnet':
          if (!llmState.apiKeyAvailable) {
            console.log('[LLM] sonnet: saltando (no API key)');
            continue;
          }
          console.log('[LLM] sonnet: intentando...');
          response = await callAnthropic(systemPrompt, userMessage, 'sonnet', maxTokens);
          console.log('[LLM] sonnet: respuesta:', response?.slice(0, 80) || '(vacía)');
          if (response && response.trim()) {
            return { response, source: 'sonnet' };
          }
          break;

        case 'fallback':
          console.log('[LLM] ❌ Llegando a fallback (nada funcionó)');
          return { response: null, source: 'fallback' };
      }
    } catch (error) {
      console.error(`[LLM] ❌ ${source} falló:`, error.message);
      // Continuar con el siguiente en la cadena
    }
  }

  console.log('[LLM] ❌ Chain completo sin éxito');
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

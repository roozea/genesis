// GENESIS — Sistema de decisiones IA para Arq
// Con fallback chain completo: Local → Haiku → Sonnet → Random
// Con Memory Stream integrado
// Con WorldState para sincronización chat <-> mundo

import { think } from '../config/llm';
import { getMovementPrompt, getPlaceDescription, MOODS } from './prompts';
import {
  addMemory,
  MEMORY_TYPES,
  retrieveMemories,
  formatMemoriesForPrompt,
  getVisitCount,
} from './memory';
import { findPath, getDirection } from '../world/pathfinding';
import { LOCATIONS, getLocationKeys, getLocation, getNearestLocation } from '../world/locations';
import {
  getWorldState,
  clearForcedDestination,
  forceDestination,
  enableExploreMode,
  recordAction,
  stopAndPause,
  areDecisionsPaused,
  shouldCancelPath,
  clearCancelFlag,
} from './worldState';

// ============================================
// PARSE INTENT - Detectar intenciones del chat
// ============================================

/**
 * Mapeo de palabras a claves de ubicación
 */
const PLACE_KEYWORDS = {
  'lago': 'lakeshore',
  'orilla': 'lakeshore',
  'agua': 'lakeshore',
  'jardin': 'garden',
  'jardín': 'garden',
  'flores': 'garden',
  'taller': 'workshop',
  'casa': 'workshop',
  'bosque': 'forest',
  'arboles': 'forest',
  'árboles': 'forest',
  'cruce': 'crossroad',
  'centro': 'crossroad',
  'pradera': 'meadow',
  'pasto': 'meadow',
  'campo': 'meadow',
  'este': 'eastpath',
  'camino': 'eastpath',
  'edificio': 'locked',
  'cerrado': 'locked',
  'misterioso': 'locked',
  'puerta': 'locked',
};

/**
 * Detecta si el mensaje implica una acción
 * @param {string} userMsg - Mensaje del usuario
 * @returns {{type: string, destination?: string, place?: string}}
 */
export function parseIntent(userMsg) {
  const msg = userMsg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  console.log('[INTENT] Parseando mensaje:', msg);

  // PRIORIDAD 1: Detectar comando de parar
  const stopWords = ['detente', 'para', 'stop', 'espera', 'quedate', 'no te muevas', 'alto', 'pausa'];
  if (stopWords.some(w => msg.includes(w))) {
    console.log('[INTENT] Detectado: STOP');
    return { type: 'stop' };
  }

  // PRIORIDAD 2: Detectar petición de ir a un lugar
  const goVerbs = ['ve ', 've al', 'ir ', 'anda ', 'camina ', 'visita ', 'pasa por', 'dirigete', 'vamos al'];
  const hasGoVerb = goVerbs.some(v => msg.includes(v));

  if (hasGoVerb) {
    for (const [word, key] of Object.entries(PLACE_KEYWORDS)) {
      const normalWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msg.includes(normalWord)) {
        console.log('[INTENT] Detectado: GO_TO', key);
        return { type: 'go_to', destination: key };
      }
    }
  }

  // Detectar pregunta sobre un lugar
  const askPatterns = ['que hay', 'como es', 'que viste', 'que encontraste', 'que paso'];
  const isAsking = askPatterns.some(p => msg.includes(p));

  if (isAsking) {
    for (const [word, key] of Object.entries(PLACE_KEYWORDS)) {
      const normalWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msg.includes(normalWord)) {
        console.log('[INTENT] Detectado: DESCRIBE', key);
        return { type: 'describe', place: key };
      }
    }
  }

  // Detectar petición de explorar en general
  if (msg.includes('explora') || msg.includes('investiga') || msg.includes('descubre') || msg.includes('busca')) {
    console.log('[INTENT] Detectado: EXPLORE');
    return { type: 'explore' };
  }

  // Solo conversación
  console.log('[INTENT] Detectado: CHAT (conversación normal)');
  return { type: 'chat' };
}

/**
 * Procesa la intención detectada y actualiza el worldState
 * @param {object} intent - Intención parseada
 * @param {string} currentLocation - Ubicación actual
 * @returns {string|false} - Tipo de acción procesada o false si no hubo acción
 */
export function processIntent(intent, currentLocation) {
  console.log('[PROCESS] Procesando intent:', intent.type);

  // STOP: Parar y pausar decisiones
  if (intent.type === 'stop') {
    stopAndPause(30); // Pausar 30 segundos
    addMemory(
      MEMORY_TYPES.CONVERSATION,
      'Rodrigo me pidió que me detuviera. Esperaré aquí.',
      currentLocation,
      5
    );
    recordAction('stop', 'Rodrigo pidió detenerse');
    return 'stop';
  }

  // GO_TO: Ir a un lugar específico
  if (intent.type === 'go_to' && intent.destination) {
    const destName = LOCATIONS[intent.destination]?.name || intent.destination;
    forceDestination(intent.destination, `Ir a ${destName}`);
    addMemory(
      MEMORY_TYPES.CONVERSATION,
      `Rodrigo me pidió ir a ${destName}. Le dije que iría.`,
      currentLocation,
      7
    );
    recordAction('chat_request', `Rodrigo pidió ir a ${destName}`);
    return 'go_to';
  }

  // EXPLORE: Explorar lugares nuevos
  if (intent.type === 'explore') {
    enableExploreMode();
    addMemory(
      MEMORY_TYPES.CONVERSATION,
      'Rodrigo quiere que explore. Voy a buscar lugares que no conozco bien.',
      currentLocation,
      6
    );
    recordAction('chat_request', 'Rodrigo pidió explorar');
    return 'explore';
  }

  return false;
}

/**
 * Decide el próximo destino del agente usando IA con fallback chain
 * Ahora incluye memorias en el prompt
 * PRIORIDAD: forcedDestination > exploreMode > IA decision
 * @returns {Promise<{destination: string, thought: string, mood: string, source: string} | null>}
 */
export async function decideNextMove(currentLocation, lastLocations, mood, lastChatMessage) {
  const worldState = getWorldState();

  console.log('[BRAIN] decideNextMove llamado');
  console.log('[BRAIN] forcedDestination:', worldState.forcedDestination);
  console.log('[BRAIN] exploreMode:', worldState.exploreMode);

  // Verificar si las decisiones están pausadas (por comando "detente")
  if (areDecisionsPaused()) {
    console.log('[BRAIN] Decisiones pausadas, retornando null');
    return null;
  }

  // PRIORIDAD 1: Si hay destino forzado por chat, ir ahí
  if (worldState.forcedDestination) {
    const dest = worldState.forcedDestination;
    const destName = LOCATIONS[dest]?.name || dest;
    clearForcedDestination();

    console.log('[BRAIN] ✓ Usando destino forzado:', dest);

    return {
      destination: dest,
      thought: `Rodrigo me pidió ir... ¡vamos! 🎯`,
      mood: 'focused',
      source: 'chat-request',
    };
  }

  // PRIORIDAD 2: Si está en modo exploración, ir a lugares menos visitados
  if (worldState.exploreMode) {
    const leastVisited = getLeastVisitedLocation(currentLocation, lastLocations);
    if (leastVisited) {
      clearForcedDestination(); // También limpia exploreMode

      console.log('[brain] Modo exploración, yendo a:', leastVisited);

      return {
        destination: leastVisited,
        thought: `Explorando nuevos lugares... 🔍`,
        mood: 'curious',
        source: 'explore-mode',
      };
    }
  }

  // PRIORIDAD 3: Decisión normal con IA
  // Recuperar memorias relevantes para la decisión (top 3)
  const context = `En ${currentLocation}, mood ${mood}, ${lastChatMessage || 'sin chat'}`;
  const relevantMemories = retrieveMemories(context, 3);
  const memoriesText = formatMemoriesForPrompt(relevantMemories);

  // Generar prompt con memorias
  const prompt = getMovementPrompt(currentLocation, lastLocations, mood, lastChatMessage, memoriesText);

  try {
    // Usar el sistema de fallback chain
    const result = await think(prompt, 'Decide a dónde ir.', 'fast');

    // Si llegamos a fallback, usar decisión random
    if (result.source === 'fallback' || !result.response) {
      console.log('[brain] Usando fallback random');
      return randomDecision(currentLocation, lastLocations);
    }

    // Intentar parsear la respuesta JSON
    const jsonMatch = result.response.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      console.warn('[brain] No se pudo parsear JSON de', result.source);
      return randomDecision(currentLocation, lastLocations);
    }

    let decision;
    try {
      decision = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn('[brain] JSON inválido:', parseError.message);
      return randomDecision(currentLocation, lastLocations);
    }

    // Validar destino
    const validKeys = getLocationKeys();
    if (!decision.d || !validKeys.includes(decision.d)) {
      console.warn('[brain] Destino inválido:', decision.d);
      return randomDecision(currentLocation, lastLocations);
    }

    // Validar que no sea el mismo lugar ni los últimos 2
    if (decision.d === currentLocation || lastLocations.slice(-2).includes(decision.d)) {
      console.warn('[brain] Destino repetido, eligiendo otro');
      return randomDecision(currentLocation, lastLocations);
    }

    // Validar mood
    if (!decision.m || !MOODS.includes(decision.m)) {
      decision.m = mood; // Mantener mood actual
    }

    return {
      destination: decision.d,
      thought: decision.t || '...',
      mood: decision.m,
      source: result.source, // 'local', 'haiku', o 'sonnet'
    };
  } catch (error) {
    console.error('[brain] Error en decisión IA:', error);
    return randomDecision(currentLocation, lastLocations);
  }
}

/**
 * Crea una memoria cuando Arq llega a un lugar
 * @param {string} locationKey - Clave del lugar
 * @returns {object} La memoria creada
 */
export function recordArrival(locationKey) {
  const location = LOCATIONS[locationKey];
  if (!location) return null;

  // Memoria simple: "Caminé al {nombre del lugar}"
  const content = `Caminé al ${location.name}`;

  // Importancia base 3, primera visita 5
  const visitCount = getVisitCount(locationKey);
  const importance = visitCount === 0 ? 5 : 3;

  return addMemory(MEMORY_TYPES.ACTION, content, locationKey, importance);
}

/**
 * Guarda un pensamiento (thought bubble) como memoria
 * @param {string} thought - El pensamiento a guardar
 * @param {string} locationKey - Ubicación donde ocurrió
 * @returns {object} La memoria creada
 */
export function recordThought(thought, locationKey) {
  if (!thought || thought.length < 3) return null;

  // Limpiar el pensamiento (quitar comillas, etc)
  const cleanThought = thought.replace(/^["']|["']$/g, '').trim();

  return addMemory(MEMORY_TYPES.THOUGHT, cleanThought, locationKey, 4);
}

/**
 * Crea una memoria de observación
 */
export function recordObservation(content, locationKey, importance = 4) {
  addMemory(MEMORY_TYPES.OBSERVATION, content, locationKey, importance);
}

/**
 * Crea una memoria de conversación
 * @param {string} userMessage - Lo que dijo Rodrigo
 * @param {string} arqResponse - Lo que respondió Arq
 * @param {string} locationKey - Ubicación donde ocurrió
 * @returns {object} La memoria creada
 */
export function recordConversation(userMessage, arqResponse, locationKey) {
  // Extraer tema: primeras 5 palabras de la respuesta de Arq
  const tema = extractTopic(arqResponse);

  // Formato: Rodrigo dijo: "..." — Le respondí sobre {tema}
  const content = `Rodrigo dijo: "${userMessage.slice(0, 40)}" — Le respondí sobre ${tema}`;

  return addMemory(MEMORY_TYPES.CONVERSATION, content, locationKey, 6);
}

/**
 * Extrae el tema de una respuesta (primeras 5 palabras)
 */
function extractTopic(text) {
  if (!text) return 'algo';

  // Limpiar y tomar primeras 5 palabras
  const words = text
    .replace(/[*_~`]/g, '') // Quitar formato markdown
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 5)
    .join(' ');

  return words || 'algo';
}

/**
 * Obtiene el lugar menos visitado (para modo exploración)
 */
function getLeastVisitedLocation(currentLocation, lastLocations) {
  const validKeys = getLocationKeys().filter(
    key => key !== currentLocation && !lastLocations.slice(-2).includes(key)
  );

  if (validKeys.length === 0) return null;

  // Ordenar por visitas (menos visitas primero)
  const sorted = validKeys
    .map(key => ({ key, visits: getVisitCount(key) }))
    .sort((a, b) => a.visits - b.visits);

  return sorted[0].key;
}

/**
 * Decisión random cuando no hay IA disponible
 */
function randomDecision(currentLocation, lastLocations) {
  const validKeys = getLocationKeys().filter(
    key => key !== currentLocation && !lastLocations.slice(-2).includes(key)
  );

  if (validKeys.length === 0) {
    const anyKey = getLocationKeys().filter(key => key !== currentLocation);
    if (anyKey.length === 0) return null;
    validKeys.push(...anyKey);
  }

  const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];

  const randomThoughts = [
    'A explorar... 🚶',
    'Veamos qué hay por allá 👀',
    'Caminando sin rumbo 🌿',
    'Algo me llama... 🔮',
    'Nuevo destino 📍',
  ];

  return {
    destination: randomKey,
    thought: randomThoughts[Math.floor(Math.random() * randomThoughts.length)],
    mood: 'calm',
    source: 'fallback',
  };
}

/**
 * Calcula el camino hacia un destino
 */
export function calculatePath(fromRow, fromCol, destinationKey) {
  const location = getLocation(destinationKey);
  if (!location) {
    return [];
  }

  return findPath(fromRow, fromCol, location.r, location.c);
}

/**
 * Obtiene la ubicación actual basada en posición
 */
export function getCurrentLocationKey(row, col) {
  const nearest = getNearestLocation(row, col);
  return nearest?.key || 'meadow';
}

/**
 * Obtiene la dirección de movimiento para el sprite
 */
export function getMovementDirection(fromRow, fromCol, toRow, toCol) {
  return getDirection(fromRow, fromCol, toRow, toCol);
}

// GENESIS — Sistema de decisiones IA para Arq
// Con fallback chain completo: Local → Haiku → Sonnet → Random
// Con Memory Stream integrado

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

/**
 * Decide el próximo destino del agente usando IA con fallback chain
 * Ahora incluye memorias en el prompt
 * @returns {Promise<{destination: string, thought: string, mood: string, source: string} | null>}
 */
export async function decideNextMove(currentLocation, lastLocations, mood, lastChatMessage) {
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

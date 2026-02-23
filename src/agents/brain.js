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
  // Recuperar memorias relevantes para la decisión
  const context = `decidiendo moverse desde ${currentLocation} mood ${mood} ${lastChatMessage || ''}`;
  const relevantMemories = retrieveMemories(context, 5);
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
 */
export function recordArrival(locationKey) {
  const location = LOCATIONS[locationKey];
  if (!location) return;

  const visitCount = getVisitCount(locationKey);
  const description = getPlaceDescription(locationKey);

  // Primera visita es más importante
  const importance = visitCount === 0 ? 7 : visitCount < 3 ? 5 : 3;

  // Crear memoria de acción
  const content = visitCount === 0
    ? `Llegué a ${description} por primera vez`
    : `Llegué a ${description}`;

  addMemory(MEMORY_TYPES.ACTION, content, locationKey, importance);

  // Cada 2-3 visitas, generar un pensamiento sobre el lugar
  if (visitCount > 0 && visitCount % 2 === 0) {
    generateThoughtAboutPlace(locationKey, visitCount);
  }
}

/**
 * Genera un pensamiento sobre un lugar (no bloqueante)
 */
async function generateThoughtAboutPlace(locationKey, visitCount) {
  const location = LOCATIONS[locationKey];
  if (!location) return;

  try {
    const prompt = `Eres Arq. Has visitado "${location.name}" ${visitCount} veces.
Genera UN pensamiento corto (máximo 10 palabras) sobre este lugar.
Puede ser una observación, opinión, o pregunta.
Responde SOLO el pensamiento, sin comillas.`;

    const result = await think(prompt, 'Piensa.', 'fast');

    if (result.response && result.source !== 'fallback') {
      const thought = result.response.trim().slice(0, 80);
      addMemory(MEMORY_TYPES.THOUGHT, thought, locationKey, 4);
    }
  } catch (error) {
    console.warn('[brain] Error generando pensamiento:', error);
  }
}

/**
 * Crea una memoria de observación
 */
export function recordObservation(content, locationKey, importance = 4) {
  addMemory(MEMORY_TYPES.OBSERVATION, content, locationKey, importance);
}

/**
 * Crea una memoria de conversación
 */
export function recordConversation(userMessage, arqResponse, locationKey) {
  // Resumir la conversación
  const summary = `Hablé con Rodrigo: "${userMessage.slice(0, 40)}..." → Respondí sobre ${extractTopic(arqResponse)}`;
  addMemory(MEMORY_TYPES.CONVERSATION, summary, locationKey, 6);
}

/**
 * Extrae el tema principal de una respuesta (simple)
 */
function extractTopic(text) {
  // Buscar sustantivos/temas comunes
  const topics = [
    'el edificio', 'el taller', 'el jardín', 'el lago', 'los agentes',
    'construir', 'explorar', 'el mapa', 'el futuro', 'las flores',
    'el camino', 'el bosque', 'el misterio', 'la puerta',
  ];

  const lower = text.toLowerCase();
  for (const topic of topics) {
    if (lower.includes(topic)) return topic;
  }
  return 'varios temas';
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

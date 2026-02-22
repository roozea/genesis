// GENESIS — Sistema de decisiones IA para Arq
// Con fallback chain completo: Local → Haiku → Sonnet → Random

import { think } from '../config/llm';
import { getMovementPrompt, MOODS } from './prompts';
import { findPath, getDirection } from '../world/pathfinding';
import { LOCATIONS, getLocationKeys, getLocation, getNearestLocation } from '../world/locations';

/**
 * Decide el próximo destino del agente usando IA con fallback chain
 * @returns {Promise<{destination: string, thought: string, mood: string, source: string} | null>}
 */
export async function decideNextMove(currentLocation, lastLocations, mood, lastChatMessage) {
  const prompt = getMovementPrompt(currentLocation, lastLocations, mood, lastChatMessage);

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
 * Decisión random cuando no hay IA disponible
 */
function randomDecision(currentLocation, lastLocations) {
  const validKeys = getLocationKeys().filter(
    key => key !== currentLocation && !lastLocations.slice(-2).includes(key)
  );

  if (validKeys.length === 0) {
    // Si no hay opciones válidas, permitir cualquier lugar excepto el actual
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

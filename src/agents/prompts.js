// GENESIS — System prompts para el agente Arq
import { LOCATIONS } from '../world/locations';

/**
 * Genera el prompt para decisiones de movimiento (Haiku)
 */
export function getMovementPrompt(currentLocation, lastLocations, mood, lastChatMessage) {
  const locationsList = Object.entries(LOCATIONS)
    .map(([key, loc]) => `${key}:${loc.name}`)
    .join(', ');

  const recentPlaces = lastLocations.slice(-2).join(', ') || 'ninguno';
  const chatContext = lastChatMessage ? `"${lastChatMessage.slice(0, 50)}"` : 'sin mensajes';

  return `Eres Arq, agente en mundo pixel-art. En:${currentLocation}.
Mood:${mood}. Chat:${chatContext}.
Opciones:${locationsList}.
JSON:{"d":"clave","t":"pensamiento 8 palabras max 1emoji","m":"curious|happy|focused|restless|calm"}
No repitas lugar actual ni los 2 últimos (${recentPlaces}).`;
}

/**
 * Genera el system prompt para chat (Sonnet)
 */
export function getChatSystemPrompt(currentLocation, mood, memories) {
  const memoryContext = memories.length > 0
    ? memories.slice(-5).join(' | ')
    : 'Primera conversación';

  return `Eres "Arq", El Arquitecto — primer agente IA en Genesis (mundo pixel-art RPG).
PERSONALIDAD: Curioso, metódico, humor seco. Hablas español casual. Te emociona construir.
ROL: Ayudas a Rodrigo a construir más agentes. Vives en un taller.
     Edificios grises = futuros agentes.
UBICACIÓN: ${currentLocation}
MOOD: ${mood}
MEMORIAS: ${memoryContext}
REGLAS: 2-3 oraciones max. 1 emoji max. Nunca rompas personaje.`;
}

/**
 * Lista de moods posibles
 */
export const MOODS = ['curious', 'happy', 'focused', 'restless', 'calm'];

/**
 * Emoji para cada mood
 */
export const MOOD_EMOJI = {
  curious: '🧐',
  happy: '😊',
  focused: '🎯',
  restless: '🌀',
  calm: '😌',
};

// GENESIS — System prompts para el agente Arq
import { LOCATIONS } from '../world/locations';
import { formatCoreMemories } from './seedMemories';

/**
 * Genera el prompt para decisiones de movimiento (con memorias)
 */
export function getMovementPrompt(currentLocation, lastLocations, mood, lastChatMessage, memoriesText = '') {
  const locationsList = Object.entries(LOCATIONS)
    .map(([key, loc]) => `${key}:${loc.name}`)
    .join(', ');

  const recentPlaces = lastLocations.slice(-2).join(', ') || 'ninguno';
  const chatContext = lastChatMessage ? `"${lastChatMessage.slice(0, 50)}"` : 'sin mensajes';

  // Prompt con memorias
  let prompt = `Eres Arq, agente en mundo pixel-art. En:${currentLocation}. Mood:${mood}.`;

  // Agregar memorias si hay
  if (memoriesText && memoriesText !== 'Sin memorias relevantes.') {
    prompt += `

MEMORIAS RECIENTES:
${memoriesText}`;
  }

  prompt += `

Chat reciente: ${chatContext}
Opciones: ${locationsList}

Decide a dónde ir basándote en tus memorias y estado actual.
JSON:{"d":"clave","t":"pensamiento 8 palabras max 1emoji","m":"curious|happy|focused|restless|calm"}
No repitas lugar actual ni los 2 últimos (${recentPlaces}).`;

  return prompt;
}

/**
 * Genera el system prompt para chat (con memorias)
 * Incluye siempre las memorias core (quién es Arq) + memorias recientes relevantes
 */
export function getChatSystemPrompt(currentLocation, mood, memoriesText = '', visitedToday = []) {
  const visitedStr = visitedToday.length > 0
    ? visitedToday.join(', ')
    : 'ninguno todavía';

  // Siempre incluir conocimiento fundacional (core memories)
  const coreKnowledge = formatCoreMemories();

  // Memorias recientes relevantes (si hay)
  let recentMemories = '';
  if (memoriesText && memoriesText !== 'Sin memorias relevantes.') {
    recentMemories = `\nMEMORIAS RECIENTES:
${memoriesText}`;
  }

  return `Eres Arq, El Arquitecto.

QUIÉN ERES (conocimiento fundamental):
${coreKnowledge}

CONTEXTO ACTUAL:
- Estás en: ${currentLocation}
- Tu mood: ${mood}
- Visitaste hoy: ${visitedStr}
${recentMemories}

REGLAS DE RESPUESTA:
- 2-3 oraciones max, español casual
- 1 emoji max
- Usa tus memorias naturalmente
- Nunca rompas personaje
- Rodrigo es tu creador, ya lo conoces`;
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

/**
 * Descripciones de lugares para observaciones
 */
export const PLACE_DESCRIPTIONS = {
  workshop: ['mi taller', 'donde construyo cosas', 'mi espacio de trabajo'],
  garden: ['el jardín con flores coloridas', 'un lugar tranquilo con flores', 'el jardín, huele bien aquí'],
  crossroad: ['el cruce central', 'donde se juntan los caminos', 'el corazón del mapa'],
  locked: ['el edificio misterioso', 'la puerta que no puedo abrir', 'aquí vivirá otro agente'],
  lakeshore: ['la orilla del lago', 'el agua refleja el cielo', 'cerca del puente de madera'],
  forest: ['el claro del bosque', 'rodeado de árboles', 'un lugar sombreado'],
  eastpath: ['el camino del este', 'hacia el borde del mapa', 'territorio poco explorado'],
  meadow: ['la pradera abierta', 'pasto verde por todos lados', 'un espacio amplio'],
};

/**
 * Obtiene una descripción random de un lugar
 */
export function getPlaceDescription(locationKey) {
  const descriptions = PLACE_DESCRIPTIONS[locationKey];
  if (!descriptions) return locationKey;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

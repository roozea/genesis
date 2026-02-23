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

  // Prompt compacto con memorias
  let prompt = `Eres Arq. En:${currentLocation}. Mood:${mood}.`;

  // Agregar memorias si hay
  if (memoriesText && memoriesText !== 'Sin memorias relevantes.') {
    prompt += `
RECUERDAS:
${memoriesText}`;
  }

  prompt += `
Opciones:${locationsList}
JSON:{"d":"clave","t":"pensamiento 8 palabras max 1emoji","m":"curious|happy|focused|restless|calm"}
No repitas: ${recentPlaces}.`;

  return prompt;
}

/**
 * Genera el system prompt para chat (con memorias)
 * Incluye siempre las memorias core (quién es Arq) + memorias relevantes al contexto
 */
export function getChatSystemPrompt(currentLocation, mood, memoriesText = '', visitedToday = []) {
  // Siempre incluir conocimiento fundacional (core memories)
  const coreKnowledge = formatCoreMemories();

  // Memorias relevantes ahora (basadas en lo que preguntó el usuario)
  let relevantSection = '';
  if (memoriesText && memoriesText !== 'Sin memorias relevantes.') {
    relevantSection = `
MEMORIAS RELEVANTES AHORA:
${memoriesText}
`;
  }

  return `Eres Arq, El Arquitecto.

${coreKnowledge}
${relevantSection}
CONTEXTO: Estás en ${currentLocation}. Mood: ${mood}.
Rodrigo es tu creador, ya lo conoces.
2-3 oraciones. Español casual. 1 emoji max.`;
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

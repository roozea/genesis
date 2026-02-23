// GENESIS — Sistema de Reflexiones
// Micro (3-5min), Media (15-20min), Profunda (45-60min)
// Todo corre en Ollama local (tier 'fast') = $0

import { think } from '../config/llm';
import { addMemory, MEMORY_TYPES, loadMemories, getVisitCount } from './memory';
import { getWorldState, updateWorldState } from './worldState';
import { LOCATIONS } from '../world/locations';

// Constantes de tiempo (en ms)
const MICRO_INTERVAL_MIN = 3 * 60 * 1000;  // 3 min
const MICRO_INTERVAL_MAX = 5 * 60 * 1000;  // 5 min
const MEDIUM_IMPORTANCE_THRESHOLD = 15;
const MEDIUM_COOLDOWN = 15 * 60 * 1000;    // 15 min mínimo entre medias
const DEEP_COOLDOWN = 45 * 60 * 1000;      // 45 min mínimo entre profundas
const DEEP_REFLECTION_THRESHOLD = 3;       // 3 reflexiones medias
const DEEP_CHAT_THRESHOLD = 5;             // 5 mensajes de chat

// Estado del manager
let managerState = {
  lastMicro: Date.now(),
  lastMedium: Date.now(),
  lastDeep: Date.now(),
  nextMicroIn: getRandomInterval(MICRO_INTERVAL_MIN, MICRO_INTERVAL_MAX),
  unreflectedImportance: 0,
  mediumCount: 0,
  chatMessageCount: 0,
  lastObservations: [],  // Para no repetir
  isProcessing: false,
  currentPlan: null,
};

// Listeners para UI
const listeners = new Set();

function notifyListeners() {
  const state = getManagerState();
  listeners.forEach(cb => cb(state));
}

export function onReflectionStateChange(callback) {
  listeners.add(callback);
  callback(getManagerState());
  return () => listeners.delete(callback);
}

function getRandomInterval(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Obtiene el estado actual del manager para UI
 */
export function getManagerState() {
  const now = Date.now();
  return {
    ...managerState,
    timeToNextMicro: Math.max(0, (managerState.lastMicro + managerState.nextMicroIn) - now),
    timeSinceLastMedium: now - managerState.lastMedium,
    timeSinceLastDeep: now - managerState.lastDeep,
    canDoMedium: managerState.unreflectedImportance >= MEDIUM_IMPORTANCE_THRESHOLD,
    canDoDeep: managerState.mediumCount >= DEEP_REFLECTION_THRESHOLD ||
               managerState.chatMessageCount >= DEEP_CHAT_THRESHOLD,
  };
}

/**
 * Tick principal - llamar cada segundo
 */
export async function tick() {
  if (managerState.isProcessing) return;

  const worldState = getWorldState();
  const now = Date.now();

  // No hacer micro-reflexiones si está en conversación
  if (worldState.isInConversation) return;

  // Micro-reflexiones: cada 3-5 minutos, cuando no camina
  if (!worldState.isWalking) {
    const timeSinceMicro = now - managerState.lastMicro;
    if (timeSinceMicro >= managerState.nextMicroIn) {
      await doMicroReflection(worldState);
    }
  }

  // Reflexiones medias: cuando importancia acumulada > 15
  const timeSinceMedium = now - managerState.lastMedium;
  if (managerState.unreflectedImportance >= MEDIUM_IMPORTANCE_THRESHOLD &&
      timeSinceMedium >= MEDIUM_COOLDOWN) {
    await doMediumReflection(worldState);
  }

  // Reflexiones profundas: 3+ medias o 5+ chats
  const timeSinceDeep = now - managerState.lastDeep;
  if (timeSinceDeep >= DEEP_COOLDOWN) {
    const canDoDeep = managerState.mediumCount >= DEEP_REFLECTION_THRESHOLD ||
                      managerState.chatMessageCount >= DEEP_CHAT_THRESHOLD;
    if (canDoDeep) {
      await doDeepReflection(worldState);
    }
  }
}

/**
 * Llamar cuando se agrega una memoria nueva
 */
export function onNewMemory(memory) {
  // Acumular importancia para trigger de reflexión media
  if (memory.type !== 'reflection' && memory.type !== 'deep_reflection' && memory.type !== 'core') {
    managerState.unreflectedImportance += memory.importance;
    notifyListeners();
  }
}

/**
 * Llamar cuando hay un mensaje de chat
 */
export function onChatMessage() {
  managerState.chatMessageCount++;
  notifyListeners();
}

// ============================================
// MICRO-REFLEXIÓN (3-5 minutos)
// ============================================

async function doMicroReflection(worldState) {
  managerState.isProcessing = true;

  try {
    const location = LOCATIONS[worldState.currentLocation];
    const locationName = location?.name || worldState.currentLocation;
    const recentPlaces = worldState.previousLocations.slice(-3).join(', ') || 'ninguno';
    const hora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const lastObs = managerState.lastObservations.slice(-3).join('; ') || 'ninguna';

    const prompt = `Eres Arq. Estás en ${locationName}. Visitaste: ${recentPlaces}.
Mood: ${worldState.mood}. Hora: ${hora}.

REGLAS para observation:
- Max 10 palabras + 1 emoji
- NO sentidos falsos (NO oler, NO escuchar, NO tocar, NO sentir viento)
- SÍ puedes: ver el mapa/tiles, recordar, pensar, opinar
BUENOS: "El lago se ve azul hoy 🌊" "Este cruce conecta todo el mapa 📍"
MALOS: "Huele a flores 🌸" "Escucho pájaros 🐦" "Siento la brisa 💨"

NO repitas: ${lastObs}
JSON:{"observation":"texto","mood":"nuevo mood"}`;

    console.log('[REFLECTION] Generando micro-reflexión...');
    const result = await think(prompt, 'Observa tu entorno.', 'fast');

    if (result.source !== 'fallback' && result.response) {
      const jsonMatch = result.response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        if (data.observation) {
          // Guardar como memoria
          const importance = 2 + Math.floor(Math.random() * 3); // 2-4
          addMemory(MEMORY_TYPES.OBSERVATION, data.observation, worldState.currentLocation, importance);

          // Guardar para no repetir
          managerState.lastObservations.push(data.observation);
          if (managerState.lastObservations.length > 5) {
            managerState.lastObservations.shift();
          }

          // Actualizar mood si cambió
          if (data.mood && data.mood !== worldState.mood) {
            updateWorldState({ mood: data.mood });
          }

          // Notificar para thought bubble
          notifyThoughtBubble(data.observation, 'micro');

          console.log('[REFLECTION] Micro:', data.observation);
        }
      }
    }
  } catch (error) {
    console.warn('[REFLECTION] Error en micro-reflexión:', error);
  }

  // Reset timer
  managerState.lastMicro = Date.now();
  managerState.nextMicroIn = getRandomInterval(MICRO_INTERVAL_MIN, MICRO_INTERVAL_MAX);
  managerState.isProcessing = false;
  notifyListeners();
}

// ============================================
// REFLEXIÓN MEDIA (15-20 minutos)
// ============================================

async function doMediumReflection(worldState) {
  managerState.isProcessing = true;

  try {
    // Obtener últimas memorias
    const memories = loadMemories();
    const recentMemories = memories
      .filter(m => m.type !== 'core' && m.type !== 'reflection' && m.type !== 'deep_reflection')
      .slice(-10)
      .map(m => {
        const mins = Math.floor((Date.now() - m.timestamp) / 60000);
        const timeStr = mins < 60 ? `hace ${mins}min` : `hace ${Math.floor(mins/60)}h`;
        return `- ${timeStr}: ${m.content}`;
      })
      .join('\n');

    const prompt = `Eres Arq. Revisa tus experiencias recientes:
${recentMemories}

Genera UN insight — algo que APRENDISTE o CONECTASTE.
Bueno: 'Cada vez que vuelvo al jardín me siento más tranquilo'
Bueno: 'Rodrigo me pide ir a lugares que no conozco bien, quiere que explore'
Malo: 'Fui al jardín y luego al lago' (resumen, no insight)
JSON:{"insight":"texto","importance":7}`;

    console.log('[REFLECTION] Generando reflexión media...');
    const result = await think(prompt, 'Reflexiona sobre lo que aprendiste.', 'fast');

    if (result.source !== 'fallback' && result.response) {
      const jsonMatch = result.response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        if (data.insight) {
          const importance = Math.min(8, Math.max(6, data.importance || 7));
          addMemory(MEMORY_TYPES.REFLECTION, data.insight, worldState.currentLocation, importance);

          managerState.mediumCount++;
          managerState.unreflectedImportance = 0; // Reset

          notifyThoughtBubble(data.insight, 'medium');

          console.log('[REFLECTION] Media:', data.insight);
        }
      }
    }
  } catch (error) {
    console.warn('[REFLECTION] Error en reflexión media:', error);
  }

  managerState.lastMedium = Date.now();
  managerState.isProcessing = false;
  notifyListeners();
}

// ============================================
// REFLEXIÓN PROFUNDA (45-60 minutos)
// ============================================

async function doDeepReflection(worldState) {
  managerState.isProcessing = true;

  try {
    const memories = loadMemories();

    // Obtener reflexiones medias
    const reflections = memories
      .filter(m => m.type === MEMORY_TYPES.REFLECTION)
      .slice(-5)
      .map(m => `- ${m.content}`)
      .join('\n') || '- Sin reflexiones previas';

    // Obtener resúmenes de conversaciones
    const conversations = memories
      .filter(m => m.type === MEMORY_TYPES.CONVERSATION)
      .slice(-5)
      .map(m => `- ${m.content}`)
      .join('\n') || '- Sin conversaciones recientes';

    // Top 3 lugares por visitas
    const locationVisits = Object.keys(LOCATIONS)
      .map(key => ({ key, visits: getVisitCount(key), name: LOCATIONS[key].name }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 3)
      .map(l => l.name)
      .join(', ');

    const prompt = `Eres Arq, El Arquitecto de Genesis. Momento de pensar en profundidad.

Reflexiones recientes:
${reflections}

Conversaciones con Rodrigo:
${conversations}

Lugares favoritos: ${locationVisits}

Genera:
1. Reflexión profunda sobre ti, el mundo, o Rodrigo
2. Intención: qué quieres hacer y por qué
JSON:{
  "reflection":"texto profundo",
  "intention":{"action":"qué hacer","destination":"clave lugar o null","reason":"por qué"},
  "mood":"nuevo mood"
}`;

    console.log('[REFLECTION] Generando reflexión profunda...');
    let result = await think(prompt, 'Piensa profundamente.', 'fast');

    // Reintentar si falla
    if (result.source === 'fallback' || !result.response) {
      console.log('[REFLECTION] Reintentando reflexión profunda...');
      result = await think(prompt, 'Piensa profundamente.', 'fast');
    }

    if (result.source !== 'fallback' && result.response) {
      // Intentar parsear JSON más flexible
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);

          if (data.reflection) {
            // Guardar reflexión profunda (NUNCA se borra)
            addMemory('deep_reflection', data.reflection, worldState.currentLocation, 9);

            // Guardar intención como plan
            if (data.intention) {
              const planText = `${data.intention.action}: ${data.intention.reason}`;
              addMemory(MEMORY_TYPES.PLAN, planText, worldState.currentLocation, 7);

              managerState.currentPlan = data.intention;

              // Si hay destino sugerido, guardarlo (no forzado)
              if (data.intention.destination && LOCATIONS[data.intention.destination]) {
                updateWorldState({ suggestedDestination: data.intention.destination });
              }
            }

            // Actualizar mood
            if (data.mood) {
              updateWorldState({ mood: data.mood });
            }

            // Reset counters
            managerState.mediumCount = 0;
            managerState.chatMessageCount = 0;

            // Notificar para efectos visuales especiales
            notifyThoughtBubble(data.reflection, 'deep');

            console.log('[REFLECTION] Profunda:', data.reflection);
            if (data.intention) {
              console.log('[REFLECTION] Plan:', data.intention);
            }
          }
        } catch (parseError) {
          console.warn('[REFLECTION] Error parseando JSON profundo:', parseError);
        }
      }
    }
  } catch (error) {
    console.warn('[REFLECTION] Error en reflexión profunda:', error);
  }

  managerState.lastDeep = Date.now();
  managerState.isProcessing = false;
  notifyListeners();
}

// ============================================
// CALLBACKS para efectos visuales
// ============================================

let thoughtBubbleCallback = null;

export function setThoughtBubbleCallback(callback) {
  thoughtBubbleCallback = callback;
}

function notifyThoughtBubble(text, type) {
  if (thoughtBubbleCallback) {
    thoughtBubbleCallback(text, type);
  }
}

/**
 * Obtiene las últimas reflexiones para el panel
 */
export function getRecentReflections(count = 5) {
  const memories = loadMemories();
  return memories
    .filter(m => m.type === MEMORY_TYPES.REFLECTION || m.type === 'deep_reflection')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, count);
}

/**
 * Obtiene estadísticas de lugares
 */
export function getLocationStats() {
  return Object.entries(LOCATIONS).map(([key, loc]) => ({
    key,
    name: loc.name,
    visits: getVisitCount(key),
    emoji: loc.emoji,
  })).sort((a, b) => b.visits - a.visits);
}

/**
 * Obtiene el plan actual
 */
export function getCurrentPlan() {
  return managerState.currentPlan;
}

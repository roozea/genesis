// GENESIS — Estado del mundo centralizado
// Singleton que TODOS los componentes leen y escriben
// El chat y el movimiento comparten la misma fuente de verdad

import { getMemoryCount } from './memory';

// Estado inicial
const initialState = {
  // Posición y movimiento
  currentLocation: 'workshop',
  previousLocations: [],         // últimos 5 lugares
  isWalking: false,
  walkingTo: null,

  // Estado emocional
  mood: 'curious',
  moodHistory: [],               // últimos 5 moods con timestamp

  // Actividad
  lastAction: null,              // { type, description, timestamp }
  actionsToday: [],              // todo lo que hizo hoy
  idleSince: Date.now(),         // cuánto lleva sin hacer nada

  // Chat
  isInConversation: false,       // true cuando Rodrigo está chateando
  lastChatTopic: null,           // de qué hablaron
  chatHistory: [],               // últimos 5 intercambios resumidos
  pendingRequest: null,          // si Rodrigo le pidió algo

  // Control de movimiento (chat -> mundo)
  forcedDestination: null,       // destino forzado por chat
  exploreMode: false,            // priorizar lugares no visitados

  // Memorias (resumen rápido)
  recentMemories: [],            // últimas 5 memorias
  totalMemories: 0,
  lastReflection: null,
};

// El estado actual (singleton)
let worldState = { ...initialState };

// Listeners para cambios
const listeners = new Set();

/**
 * Obtiene el estado actual (copia para evitar mutaciones accidentales)
 */
export function getWorldState() {
  return { ...worldState };
}

/**
 * Actualiza el estado del mundo
 * @param {object} updates - Campos a actualizar
 */
export function updateWorldState(updates) {
  worldState = { ...worldState, ...updates };
  notifyListeners();
}

/**
 * Registra un listener para cambios de estado
 * @param {function} callback - Función a llamar cuando cambia el estado
 * @returns {function} Función para desuscribirse
 */
export function onWorldStateChange(callback) {
  listeners.add(callback);
  // Llamar inmediatamente con estado actual
  callback(worldState);
  return () => listeners.delete(callback);
}

/**
 * Notifica a todos los listeners
 */
function notifyListeners() {
  const state = { ...worldState };
  listeners.forEach(cb => cb(state));
}

// ============================================
// HELPERS para actualizar el estado
// ============================================

/**
 * Actualiza la ubicación actual
 */
export function setLocation(locationKey) {
  const prev = worldState.previousLocations.slice(-4);
  prev.push(worldState.currentLocation);

  updateWorldState({
    currentLocation: locationKey,
    previousLocations: prev,
    isWalking: false,
    walkingTo: null,
    idleSince: Date.now(),
  });
}

/**
 * Indica que Arq empezó a caminar
 */
export function startWalking(destinationKey) {
  updateWorldState({
    isWalking: true,
    walkingTo: destinationKey,
  });
}

/**
 * Indica que Arq llegó a su destino
 */
export function stopWalking() {
  updateWorldState({
    isWalking: false,
    walkingTo: null,
    idleSince: Date.now(),
  });
}

/**
 * Actualiza el mood
 */
export function setMood(newMood) {
  const history = worldState.moodHistory.slice(-4);
  history.push({ mood: worldState.mood, timestamp: Date.now() });

  updateWorldState({
    mood: newMood,
    moodHistory: history,
  });
}

/**
 * Registra una acción que Arq hizo
 */
export function recordAction(type, description) {
  const action = { type, description, timestamp: Date.now() };
  const today = worldState.actionsToday.slice(-19); // máx 20
  today.push(action);

  updateWorldState({
    lastAction: action,
    actionsToday: today,
    idleSince: Date.now(),
  });
}

/**
 * Registra un intercambio de chat
 */
export function recordChatExchange(userMsg, arqReply, topic) {
  const exchange = {
    user: userMsg.slice(0, 50),
    arq: arqReply.slice(0, 50),
    topic,
    timestamp: Date.now(),
  };

  const history = worldState.chatHistory.slice(-4);
  history.push(exchange);

  updateWorldState({
    isInConversation: true,
    lastChatTopic: topic,
    chatHistory: history,
  });

  // Marcar como no en conversación después de 30s de inactividad
  setTimeout(() => {
    if (worldState.chatHistory[worldState.chatHistory.length - 1] === exchange) {
      updateWorldState({ isInConversation: false });
    }
  }, 30000);
}

/**
 * Establece un destino forzado (desde chat)
 */
export function forceDestination(destinationKey, reason) {
  updateWorldState({
    forcedDestination: destinationKey,
    pendingRequest: reason,
  });
}

/**
 * Limpia el destino forzado
 */
export function clearForcedDestination() {
  updateWorldState({
    forcedDestination: null,
    pendingRequest: null,
    exploreMode: false,
  });
}

/**
 * Activa modo exploración
 */
export function enableExploreMode() {
  updateWorldState({
    exploreMode: true,
    pendingRequest: 'Explorar lugares nuevos',
  });
}

/**
 * Actualiza las memorias recientes
 */
export function updateRecentMemories(memories) {
  updateWorldState({
    recentMemories: memories.slice(0, 5),
    totalMemories: getMemoryCount(),
  });
}

/**
 * Obtiene tiempo relativo legible
 */
export function getRelativeTime(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'hace momentos';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

/**
 * Resetea el estado (para testing)
 */
export function resetWorldState() {
  worldState = { ...initialState, idleSince: Date.now() };
  notifyListeners();
}

// GENESIS — Sistema de Memoria (Memory Stream)
// Fase 1: Registro cronológico de todas las experiencias de Arq

import { think } from '../config/llm';
import { getCoreMemoriesForInit } from './seedMemories';

// Tipos de memoria
export const MEMORY_TYPES = {
  OBSERVATION: 'observation',   // "Vi flores en el jardín"
  ACTION: 'action',             // "Caminé al lago"
  CONVERSATION: 'conversation', // "Rodrigo me pidió que explore"
  THOUGHT: 'thought',           // "Me pregunto qué hay en el edificio cerrado"
  REFLECTION: 'reflection',     // Fase 2: "He notado que me gusta el jardín"
  PLAN: 'plan',                 // Fase 3: "Mañana quiero explorar el este"
};

// Keys de localStorage
const STORAGE_KEYS = {
  memories: 'genesis_memories',
  stats: 'genesis_stats',
  logs: 'genesis_logs',
};

const MAX_MEMORIES = 200;
const TRIM_TO = 150;

// ============================================
// MEMORY STREAM - Funciones principales
// ============================================

/**
 * Carga todas las memorias de localStorage
 * Si no hay memorias, inicializa con las seed memories (conocimiento fundacional)
 */
export function loadMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.memories);
    if (raw) {
      const memories = JSON.parse(raw);
      // Si hay memorias pero no hay core memories, agregar las seed
      const hasCoreMemories = memories.some(m => m.type === 'core');
      if (!hasCoreMemories) {
        const coreMemories = getCoreMemoriesForInit();
        const combined = [...coreMemories, ...memories];
        saveMemories(combined);
        console.log('[memory] Seed memories agregadas a memorias existentes');
        return combined;
      }
      return memories;
    }
    // Primera vez: inicializar con seed memories
    const coreMemories = getCoreMemoriesForInit();
    saveMemories(coreMemories);
    console.log('[memory] Inicializado con seed memories (conocimiento fundacional)');
    return coreMemories;
  } catch {
    // En caso de error, intentar cargar seed memories
    const coreMemories = getCoreMemoriesForInit();
    return coreMemories;
  }
}

/**
 * Guarda las memorias en localStorage
 */
export function saveMemories(memories) {
  localStorage.setItem(STORAGE_KEYS.memories, JSON.stringify(memories));
}

/**
 * Agrega una nueva memoria al stream
 * @param {string} type - Tipo de memoria (MEMORY_TYPES)
 * @param {string} content - Contenido de la memoria
 * @param {string} location - Ubicación donde ocurrió
 * @param {number} importance - Importancia 1-10 (default 5)
 * @returns {object} La memoria creada
 */
export function addMemory(type, content, location, importance = 5) {
  const memories = loadMemories();

  const memory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
    type,
    content,
    location,
    importance: Math.min(10, Math.max(1, importance)),
    accessCount: 0,
    lastAccessed: null,
  };

  memories.push(memory);

  // Limpiar si hay más de MAX_MEMORIES
  // IMPORTANTE: Las memorias 'core' NUNCA se eliminan
  if (memories.length > MAX_MEMORIES) {
    // Separar memorias core de las demás
    const coreMemories = memories.filter(m => m.type === 'core');
    const otherMemories = memories.filter(m => m.type !== 'core');

    // Ordenar otras memorias por score (importancia + accesos - antigüedad)
    otherMemories.sort((a, b) => {
      const now = Date.now();
      const hoursAgoA = (now - a.timestamp) / 3600000;
      const hoursAgoB = (now - b.timestamp) / 3600000;
      const scoreA = a.importance * 2 + a.accessCount - hoursAgoA * 0.1;
      const scoreB = b.importance * 2 + b.accessCount - hoursAgoB * 0.1;
      return scoreB - scoreA;
    });

    // Recortar otras memorias, manteniendo espacio para las core
    const maxOther = TRIM_TO - coreMemories.length;
    otherMemories.length = Math.min(otherMemories.length, maxOther);

    // Recombinar: core + mejores otras
    memories.length = 0;
    memories.push(...coreMemories, ...otherMemories);
  }

  saveMemories(memories);
  console.log(`[memory] Nueva memoria: [${type}] ${content.slice(0, 50)}...`);
  return memory;
}

/**
 * Recupera memorias relevantes para el contexto actual
 * Usa: recencia, importancia, y relevancia (palabras clave)
 * @param {string} currentContext - Contexto actual (lugar, situación)
 * @param {number} count - Número de memorias a recuperar
 * @returns {array} Memorias más relevantes
 */
export function retrieveMemories(currentContext, count = 5) {
  const memories = loadMemories();
  const now = Date.now();

  if (memories.length === 0) return [];

  // Palabras clave del contexto (filtrar cortas)
  const contextWords = currentContext
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  const scored = memories.map(m => {
    const hoursAgo = (now - m.timestamp) / 3600000;

    // Recencia: decae exponencialmente en ~24 horas
    const recency = Math.exp(-hoursAgo / 24);

    // Importancia normalizada
    const importance = m.importance / 10;

    // Relevancia: coincidencia de palabras clave
    const memWords = m.content.toLowerCase();
    const matches = contextWords.filter(w => memWords.includes(w)).length;
    const relevance = contextWords.length > 0
      ? matches / contextWords.length
      : 0;

    // Score combinado
    const score = (recency * 0.3) + (importance * 0.4) + (relevance * 0.3);

    return { ...m, score };
  });

  // Ordenar por score
  scored.sort((a, b) => b.score - a.score);

  // Tomar las top y marcar como accedidas
  const top = scored.slice(0, count);

  // Actualizar accessCount en las memorias originales
  const memoryIds = new Set(top.map(m => m.id));
  const updatedMemories = memories.map(m => {
    if (memoryIds.has(m.id)) {
      return {
        ...m,
        accessCount: m.accessCount + 1,
        lastAccessed: now,
      };
    }
    return m;
  });
  saveMemories(updatedMemories);

  return top;
}

/**
 * Formatea memorias para incluir en un prompt
 * @param {array} memories - Array de memorias
 * @returns {string} Texto formateado
 */
export function formatMemoriesForPrompt(memories) {
  if (!memories || memories.length === 0) {
    return 'Sin memorias relevantes.';
  }

  const now = Date.now();

  return memories.map(m => {
    const hoursAgo = (now - m.timestamp) / 3600000;
    let timeStr;

    if (hoursAgo < 0.0833) { // < 5 min
      timeStr = 'Hace momentos';
    } else if (hoursAgo < 1) {
      timeStr = `Hace ${Math.round(hoursAgo * 60)} min`;
    } else if (hoursAgo < 24) {
      timeStr = `Hace ${Math.round(hoursAgo)} horas`;
    } else {
      timeStr = `Hace ${Math.round(hoursAgo / 24)} días`;
    }

    const typeEmoji = {
      observation: '👁️',
      action: '🚶',
      conversation: '💬',
      thought: '💭',
      reflection: '💡',
      plan: '📋',
    }[m.type] || '📝';

    return `- ${timeStr}: ${typeEmoji} "${m.content}" (imp: ${m.importance})`;
  }).join('\n');
}

/**
 * Obtiene memorias recientes de un tipo específico
 */
export function getRecentMemoriesByType(type, count = 5) {
  const memories = loadMemories();
  return memories
    .filter(m => m.type === type)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, count);
}

/**
 * Obtiene lugares visitados hoy
 */
export function getVisitedLocationsToday() {
  const memories = loadMemories();
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const visits = memories
    .filter(m =>
      m.type === MEMORY_TYPES.ACTION &&
      m.timestamp > todayStart &&
      m.content.toLowerCase().includes('llegué')
    );

  // Extraer lugares únicos
  const locations = [...new Set(visits.map(m => m.location))];
  return locations;
}

/**
 * Cuenta visitas a un lugar
 */
export function getVisitCount(location) {
  const memories = loadMemories();
  return memories.filter(m =>
    m.type === MEMORY_TYPES.ACTION &&
    m.location === location
  ).length;
}

/**
 * Califica la importancia de un evento usando LLM (tier fast)
 */
export async function rateImportance(content) {
  try {
    const prompt = `Califica la importancia de esta memoria de 1 a 10.
1 = rutinario (caminar, estar idle)
5 = notable (descubrir algo, conversación normal)
10 = transformador (nueva misión, revelación, primer contacto)
Memoria: "${content}"
Responde SOLO el número.`;

    const result = await think(prompt, 'Califica.', 'fast');

    if (result.response) {
      const num = parseInt(result.response.match(/\d+/)?.[0] || '5');
      return Math.min(10, Math.max(1, num));
    }
    return 5;
  } catch {
    return 5; // Default si falla
  }
}

// ============================================
// FUNCIONES LEGACY (compatibilidad)
// ============================================

/**
 * Guarda una memoria simple (legacy)
 * @deprecated Usar addMemory en su lugar
 */
export function saveMemory(text) {
  addMemory(MEMORY_TYPES.CONVERSATION, text, 'chat', 5);
}

/**
 * Obtiene textos de memorias (legacy)
 * @deprecated Usar retrieveMemories + formatMemoriesForPrompt
 */
export function getMemoryTexts() {
  return loadMemories()
    .slice(-10)
    .map(m => m.content);
}

/**
 * Obtiene todas las memorias como array simple (legacy)
 */
export function getMemories() {
  return loadMemories();
}

// ============================================
// STATS (sin cambios)
// ============================================

export function saveStats(stats) {
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify({
    ...stats,
    lastUpdated: Date.now(),
  }));
}

export function getStats() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.stats);
    return data ? JSON.parse(data) : getDefaultStats();
  } catch {
    return getDefaultStats();
  }
}

function getDefaultStats() {
  return {
    xp: 0,
    level: 1,
    tasks: 0,
    iaCalls: 0,
    lastUpdated: Date.now(),
  };
}

export function incrementIaCalls() {
  const stats = getStats();
  stats.iaCalls++;
  saveStats(stats);
  return stats.iaCalls;
}

export function addXp(amount) {
  const stats = getStats();
  stats.xp += amount;
  const newLevel = Math.floor(stats.xp / 100) + 1;
  if (newLevel > stats.level) {
    stats.level = newLevel;
  }
  saveStats(stats);
  return stats;
}

// ============================================
// LOGS (sin cambios)
// ============================================

export function saveLog(entry) {
  const logs = getLogs();
  logs.push({
    ...entry,
    timestamp: Date.now(),
  });
  const trimmed = logs.slice(-50);
  localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(trimmed));
}

export function getLogs() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.logs);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.memories);
  localStorage.removeItem(STORAGE_KEYS.stats);
  localStorage.removeItem(STORAGE_KEYS.logs);
}

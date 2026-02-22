// GENESIS — Sistema de memoria persistente (localStorage)

const KEYS = {
  memories: 'genesis_memories',
  stats: 'genesis_stats',
  logs: 'genesis_logs',
};

/**
 * Guarda una memoria (resumen de conversación)
 */
export function saveMemory(memory) {
  const memories = getMemories();
  memories.push({
    text: memory,
    timestamp: Date.now(),
  });

  // Mantener solo las últimas 20 memorias
  const trimmed = memories.slice(-20);
  localStorage.setItem(KEYS.memories, JSON.stringify(trimmed));
}

/**
 * Obtiene todas las memorias
 */
export function getMemories() {
  try {
    const data = localStorage.getItem(KEYS.memories);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Obtiene solo los textos de las memorias (para prompts)
 */
export function getMemoryTexts() {
  return getMemories().map(m => m.text);
}

/**
 * Guarda las stats del agente
 */
export function saveStats(stats) {
  localStorage.setItem(KEYS.stats, JSON.stringify({
    ...stats,
    lastUpdated: Date.now(),
  }));
}

/**
 * Obtiene las stats del agente
 */
export function getStats() {
  try {
    const data = localStorage.getItem(KEYS.stats);
    return data ? JSON.parse(data) : getDefaultStats();
  } catch {
    return getDefaultStats();
  }
}

/**
 * Stats por defecto
 */
function getDefaultStats() {
  return {
    xp: 0,
    level: 1,
    tasks: 0,
    iaCalls: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Incrementa el contador de llamadas IA
 */
export function incrementIaCalls() {
  const stats = getStats();
  stats.iaCalls++;
  saveStats(stats);
  return stats.iaCalls;
}

/**
 * Agrega XP y sube de nivel si corresponde
 */
export function addXp(amount) {
  const stats = getStats();
  stats.xp += amount;

  // Subir de nivel cada 100 XP
  const newLevel = Math.floor(stats.xp / 100) + 1;
  if (newLevel > stats.level) {
    stats.level = newLevel;
  }

  saveStats(stats);
  return stats;
}

/**
 * Guarda un log de actividad
 */
export function saveLog(entry) {
  const logs = getLogs();
  logs.push({
    ...entry,
    timestamp: Date.now(),
  });

  // Mantener solo los últimos 50 logs
  const trimmed = logs.slice(-50);
  localStorage.setItem(KEYS.logs, JSON.stringify(trimmed));
}

/**
 * Obtiene los logs de actividad
 */
export function getLogs() {
  try {
    const data = localStorage.getItem(KEYS.logs);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Limpia todos los datos (para reset)
 */
export function clearAllData() {
  localStorage.removeItem(KEYS.memories);
  localStorage.removeItem(KEYS.stats);
  localStorage.removeItem(KEYS.logs);
}

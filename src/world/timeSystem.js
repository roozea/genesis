// GENESIS — Sistema de Tiempo
// 1 día Genesis = 20 minutos reales
// Ciclo: Amanecer (0-4) → Día (4-10) → Tarde (10-16) → Noche (16-20)

const GENESIS_DAY_MINUTES = 20; // 20 minutos reales = 1 día Genesis

// Multiplicador de velocidad del usuario (1 = normal, 2 = doble velocidad, etc.)
let userSpeedMultiplier = 1;

// Estado del tiempo (con acumulador para cambios de velocidad)
let timeState = {
  startTime: Date.now(),
  accumulatedMinutes: 0, // Minutos acumulados antes del último cambio de velocidad
  lastSpeedChangeTime: Date.now(),
  currentMinute: 0,  // 0-20 minutos Genesis
  phase: 'morning',  // morning, day, afternoon, night
  day: 1,
};

// Listeners para cambios
const listeners = new Set();

/**
 * Establece la velocidad del tiempo
 * @param {number} speed - Multiplicador (0.5, 1, 2, 5, etc.)
 */
export function setTimeSpeed(speed) {
  // Acumular el tiempo transcurrido con la velocidad anterior
  const now = Date.now();
  const elapsedSinceLastChange = (now - timeState.lastSpeedChangeTime) / 60000;
  timeState.accumulatedMinutes += elapsedSinceLastChange * userSpeedMultiplier;
  timeState.lastSpeedChangeTime = now;
  userSpeedMultiplier = speed;
  console.log(`[timeSystem] Velocidad: ${speed}x`);
}

/**
 * Obtiene la velocidad actual del tiempo
 */
export function getTimeSpeed() {
  return userSpeedMultiplier;
}

/**
 * Obtiene el minuto actual de Genesis (0-20)
 */
export function getGenesisMinute() {
  const now = Date.now();
  const elapsedSinceLastChange = (now - timeState.lastSpeedChangeTime) / 60000;
  const totalMinutes = timeState.accumulatedMinutes + (elapsedSinceLastChange * userSpeedMultiplier);
  return totalMinutes % GENESIS_DAY_MINUTES;
}

/**
 * Obtiene el día actual de Genesis
 */
export function getGenesisDay() {
  const now = Date.now();
  const elapsedSinceLastChange = (now - timeState.lastSpeedChangeTime) / 60000;
  const totalMinutes = timeState.accumulatedMinutes + (elapsedSinceLastChange * userSpeedMultiplier);
  return Math.floor(totalMinutes / GENESIS_DAY_MINUTES) + 1;
}

/**
 * Obtiene la fase del día basada en el minuto
 * @param {number} minute - Minuto Genesis (0-20)
 * @returns {'dawn' | 'morning' | 'afternoon' | 'night'}
 */
export function getPhase(minute) {
  if (minute < 2) return 'dawn';       // 0-2: Amanecer
  if (minute < 8) return 'morning';    // 2-8: Mañana
  if (minute < 14) return 'afternoon'; // 8-14: Tarde
  if (minute < 16) return 'dusk';      // 14-16: Atardecer
  return 'night';                      // 16-20: Noche
}

/**
 * Obtiene la hora en formato Genesis (0:00 - 23:59)
 * 20 min reales = 24 horas Genesis
 * 1 min real = 1.2 horas Genesis = 72 min Genesis
 */
export function getGenesisTime() {
  const minute = getGenesisMinute();
  // Mapear 0-20 minutos a 0-24 horas
  const genesisHour = (minute / GENESIS_DAY_MINUTES) * 24;
  const hours = Math.floor(genesisHour);
  const mins = Math.floor((genesisHour - hours) * 60);

  return {
    hours,
    mins,
    formatted: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
  };
}

/**
 * Obtiene el filtro CSS para el mapa según la hora
 * @returns {object} Estilos CSS para aplicar al mapa
 */
export function getTimeFilter() {
  const minute = getGenesisMinute();
  const phase = getPhase(minute);

  switch (phase) {
    case 'dawn':
      // Amanecer: tonos cálidos rosados/naranjas
      return {
        filter: 'brightness(0.85) saturate(1.1) sepia(0.15)',
        backgroundColor: 'rgba(255, 180, 120, 0.08)',
        overlay: 'linear-gradient(to bottom, rgba(255, 150, 100, 0.1), transparent)',
      };

    case 'morning':
      // Mañana: brillante y claro
      return {
        filter: 'brightness(1.05) saturate(1.05)',
        backgroundColor: 'transparent',
        overlay: 'none',
      };

    case 'afternoon':
      // Tarde: tonos dorados cálidos
      return {
        filter: 'brightness(0.95) saturate(1.15) sepia(0.1)',
        backgroundColor: 'rgba(255, 200, 100, 0.06)',
        overlay: 'linear-gradient(to bottom, rgba(255, 180, 80, 0.08), transparent)',
      };

    case 'dusk':
      // Atardecer: naranja/púrpura
      return {
        filter: 'brightness(0.8) saturate(1.2) sepia(0.2)',
        backgroundColor: 'rgba(255, 120, 80, 0.1)',
        overlay: 'linear-gradient(to bottom, rgba(200, 100, 150, 0.12), transparent)',
      };

    case 'night':
      // Noche: oscuro azulado
      return {
        filter: 'brightness(0.55) saturate(0.7) hue-rotate(15deg)',
        backgroundColor: 'rgba(30, 40, 80, 0.15)',
        overlay: 'linear-gradient(to bottom, rgba(20, 30, 60, 0.2), rgba(10, 15, 40, 0.25))',
      };

    default:
      return {
        filter: 'none',
        backgroundColor: 'transparent',
        overlay: 'none',
      };
  }
}

/**
 * Obtiene el comportamiento de Arq según la hora
 * @returns {object} Configuración de comportamiento
 */
export function getTimeBehavior() {
  const minute = getGenesisMinute();
  const phase = getPhase(minute);

  switch (phase) {
    case 'dawn':
      return {
        speedMultiplier: 0.9,  // Un poco lento al despertar
        shouldGoHome: false,
        canExplore: true,
        moodTendency: 'peaceful',
      };

    case 'morning':
      return {
        speedMultiplier: 1.2,  // Más rápido en la mañana
        shouldGoHome: false,
        canExplore: true,
        moodTendency: 'energetic',
      };

    case 'afternoon':
      return {
        speedMultiplier: 0.85, // Más lento en la tarde
        shouldGoHome: false,
        canExplore: true,
        moodTendency: 'calm',
      };

    case 'dusk':
      return {
        speedMultiplier: 0.8,
        shouldGoHome: false,
        canExplore: false,  // Empieza a pensar en volver
        moodTendency: 'tired',
      };

    case 'night':
      return {
        speedMultiplier: 0.6,  // Muy lento de noche
        shouldGoHome: true,    // Debe volver al taller
        canExplore: false,
        moodTendency: 'sleepy',
      };

    default:
      return {
        speedMultiplier: 1,
        shouldGoHome: false,
        canExplore: true,
        moodTendency: 'neutral',
      };
  }
}

/**
 * Obtiene el icono para mostrar en el header
 */
export function getTimeIcon() {
  const phase = getPhase(getGenesisMinute());

  switch (phase) {
    case 'dawn': return '🌅';
    case 'morning': return '☀️';
    case 'afternoon': return '🌤️';
    case 'dusk': return '🌇';
    case 'night': return '🌙';
    default: return '☀️';
  }
}

/**
 * Verifica si es de noche
 */
export function isNight() {
  return getPhase(getGenesisMinute()) === 'night';
}

/**
 * Verifica si es hora de dormir (últimos 4 minutos de noche)
 */
export function isSleepTime() {
  const minute = getGenesisMinute();
  return minute >= 16; // Noche completa
}

/**
 * Obtiene el estado completo del tiempo
 */
export function getTimeState() {
  const minute = getGenesisMinute();
  const phase = getPhase(minute);
  const time = getGenesisTime();
  const day = getGenesisDay();

  return {
    minute,
    phase,
    time,
    day,
    icon: getTimeIcon(),
    filter: getTimeFilter(),
    behavior: getTimeBehavior(),
    isNight: phase === 'night',
    isSleepTime: minute >= 16,
  };
}

/**
 * Suscribirse a cambios de tiempo (cada segundo)
 */
export function onTimeChange(callback) {
  listeners.add(callback);
  // Llamar inmediatamente
  callback(getTimeState());
  return () => listeners.delete(callback);
}

/**
 * Notificar a listeners
 */
function notifyListeners() {
  const state = getTimeState();
  listeners.forEach(cb => cb(state));
}

// Actualizar cada segundo
setInterval(notifyListeners, 1000);

/**
 * Reset del tiempo (para testing)
 */
export function resetTime() {
  timeState.startTime = Date.now();
  notifyListeners();
}

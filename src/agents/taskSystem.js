// GENESIS — Sistema de Tareas
// Arq trabaja en tareas reales y gana recursos

import { think } from '../config/llm';
import { addMemory, MEMORY_TYPES, retrieveMemories } from './memory';
import { forceDestination, getWorldState, updateWorldState } from './worldState';

// Reglas anti-invención compartidas por todos los tipos de tarea
const REGLAS_NO_INVENTAR = `
═══ REGLAS (MUY IMPORTANTE) ═══
- Si no sabes algo con certeza, di "No tengo certeza sobre X"
- NO inventes datos, URLs, estadísticas, ni fechas
- NO uses placeholders como [fecha], [nombre], [url] — si no sabes el dato real, omítelo
- Responde SOLO lo que sabes. Menos contenido pero correcto es mejor que mucho contenido inventado
- Si necesitas internet o datos en tiempo real, di que no tienes acceso`;

// Tipos de tarea y configuración
// NOTA: {fecha_hora} se inyecta automáticamente en processTask
export const TASK_TYPES = {
  research: {
    icon: '🔍',
    name: 'Investigación',
    prompt: `Eres Arq, asistente de investigación.
{fecha_hora}

Rodrigo necesita: {descripción}

Investiga el tema usando tu conocimiento. Organiza así:
1. RESUMEN (2-3 oraciones, lo esencial)
2. PUNTOS CLAVE (3-5 puntos importantes)
3. EJEMPLO PRÁCTICO (si aplica, código o caso real)
4. LO QUE NO SÉ (honesto: qué parte no puedo responder y por qué)
${REGLAS_NO_INVENTAR}

Responde en español, directo, sin relleno.`,
    reward: { knowledge: 5, materials: 2, inspiration: 3 },
    workSteps: ['Investigando...', 'Organizando info...', 'Escribiendo resumen...'],
  },

  code: {
    icon: '💻',
    name: 'Código',
    prompt: `Eres Arq, asistente de programación.
{fecha_hora}

Rodrigo necesita: {descripción}

Responde con:
1. SOLUCIÓN (código limpio y comentado)
2. EXPLICACIÓN (qué hace cada parte, breve)
3. DEPENDENCIAS (qué librerías o versiones necesita)
4. CUIDADO (posibles bugs o edge cases)
${REGLAS_NO_INVENTAR}

Código en bloques con lenguaje indicado. Español para explicaciones.`,
    reward: { knowledge: 3, materials: 5, inspiration: 2 },
    workSteps: ['Analizando el problema...', 'Escribiendo código...', 'Revisando...'],
  },

  plan: {
    icon: '📋',
    name: 'Planificación',
    prompt: `Eres Arq, asistente de planificación.
{fecha_hora}

Rodrigo quiere pensar sobre: {descripción}

Ayúdale a estructurar:
1. ENTENDIMIENTO (reformula lo que Rodrigo quiere)
2. OPCIONES (2-3 caminos posibles, pros y contras)
3. RECOMENDACIÓN (cuál elegirías y por qué)
4. PASOS SIGUIENTES (3-5 acciones concretas)
${REGLAS_NO_INVENTAR}

Sé directo. Si algo no está claro, pregunta.`,
    reward: { knowledge: 4, materials: 2, inspiration: 5 },
    workSteps: ['Entendiendo el problema...', 'Evaluando opciones...', 'Armando el plan...'],
  },

  review: {
    icon: '🔎',
    name: 'Revisión',
    prompt: `Eres Arq, revisor técnico.
{fecha_hora}

Rodrigo quiere que revises: {descripción}

Evalúa con:
1. LO BUENO (qué está bien, sé específico)
2. MEJORAR (qué cambiarías, con razón concreta)
3. BUGS/RIESGOS (qué puede fallar)
4. SUGERENCIA FINAL (1 cambio que haría la mayor diferencia)
${REGLAS_NO_INVENTAR}

Sé honesto pero constructivo.`,
    reward: { knowledge: 3, materials: 3, inspiration: 3 },
    workSteps: ['Leyendo el material...', 'Analizando...', 'Preparando feedback...'],
  },
};

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE CLASIFICACIÓN Y ESCALAMIENTO A API
// ═══════════════════════════════════════════════════════════════

/**
 * Regex para detectar tareas que NECESITAN API (info actual/internet)
 */
const NEEDS_API_REGEX = /qué pasó|noticias|ayer|hoy día|actualidad|precio|clima|últim[oa]s?|reciente|resultado|partido|2024|2025|2026|tendencias|mercado|bolsa|empresa actual|cotización|dólar|bitcoin|cripto|acciones|busca en internet|busca en google|link actual|url actual/i;

/**
 * Regex para detectar tareas que SÍ puede hacer bien en local
 */
const CAN_DO_LOCAL_REGEX = /qué es|cómo funciona|explica|diferencia entre|compara conceptos|ventajas|desventajas|tutorial|ejemplo|código|escribe|función|componente|script|arquitectura|diseño|patrón|principios|algoritmo|estructura de datos|concepto|definición|fundamentos|básico|introducción/i;

/**
 * Clasifica una tarea según si es posible hacerla con modelo local
 * @param {string} description - Descripción de la tarea
 * @returns {'local_ok' | 'partial' | 'needs_api'}
 */
export function classifyTask(description) {
  const needsApi = NEEDS_API_REGEX.test(description);
  const canDoLocal = CAN_DO_LOCAL_REGEX.test(description);

  if (needsApi && !canDoLocal) {
    console.log('[TASK] Clasificación: NEEDS_API (requiere info actualizada)');
    return 'needs_api';
  }

  if (needsApi && canDoLocal) {
    console.log('[TASK] Clasificación: PARTIAL (puede hacer algo pero limitado)');
    return 'partial';
  }

  console.log('[TASK] Clasificación: LOCAL_OK (puede hacerlo bien)');
  return 'local_ok';
}

/**
 * Detecta "red flags" en respuestas locales que indican invención o falta de info
 * @param {string} text - Respuesta del modelo
 * @returns {boolean}
 */
export function hasRedFlags(text) {
  if (!text) return true;

  const redFlagPatterns = [
    /no se registraron/i,
    /no hubo cambios significativos/i,
    /la situación (se )?mantuvo/i,
    /no tengo acceso a información/i,
    /no puedo acceder/i,
    /\[fecha\]/i,
    /\[nombre\]/i,
    /\[año\]/i,
    /\[url\]/i,
    /\[insertar/i,
    /según mis datos hasta/i,
    /mi conocimiento tiene como fecha/i,
    /no tengo información actualizada/i,
    /podría haber cambiado/i,
    /te recomiendo verificar/i,
    /consulta fuentes actualizadas/i,
  ];

  for (const pattern of redFlagPatterns) {
    if (pattern.test(text)) {
      console.log('[TASK] ⚠️ Red flag detectada:', pattern);
      return true;
    }
  }

  return false;
}

/**
 * Tarea pendiente de aprobación para usar API
 */
let pendingApiTask = null;

/**
 * Guarda una tarea pendiente de aprobación API
 */
export function setPendingApiTask(task) {
  pendingApiTask = task;
  console.log('[TASK] Tarea pendiente de aprobación API:', task?.title);
}

/**
 * Obtiene la tarea pendiente de API
 */
export function getPendingApiTask() {
  return pendingApiTask;
}

/**
 * Limpia la tarea pendiente de API
 */
export function clearPendingApiTask() {
  pendingApiTask = null;
}

/**
 * Genera string de fecha y hora actual para inyectar en prompts
 */
function getCurrentDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  return `Fecha y hora actual: ${now.toLocaleDateString('es-MX', options)}`;
}

// Estado de tareas
let taskState = {
  activeTask: null,
  taskHistory: [],
  resources: { knowledge: 0, materials: 0, inspiration: 0 },
};

// Cargar desde localStorage
const STORAGE_KEY = 'genesis_tasks';
const RESOURCES_KEY = 'genesis_resources';

function loadTaskState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const resources = localStorage.getItem(RESOURCES_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      taskState.taskHistory = data.taskHistory || [];
    }
    if (resources) {
      taskState.resources = JSON.parse(resources);
    }
  } catch (e) {
    console.warn('[TASK] Error loading state:', e);
  }
}

function saveTaskState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      taskHistory: taskState.taskHistory.slice(-50), // últimas 50
    }));
    localStorage.setItem(RESOURCES_KEY, JSON.stringify(taskState.resources));
  } catch (e) {
    console.warn('[TASK] Error saving state:', e);
  }
}

// Inicializar
loadTaskState();

// Listeners para UI
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(cb => cb(getTaskState()));
}

export function onTaskStateChange(callback) {
  listeners.add(callback);
  callback(getTaskState());
  return () => listeners.delete(callback);
}

/**
 * Obtiene el estado actual de tareas
 */
export function getTaskState() {
  return {
    activeTask: taskState.activeTask,
    resources: { ...taskState.resources },
    taskHistory: taskState.taskHistory,
  };
}

/**
 * Obtiene los recursos actuales
 */
export function getResources() {
  return { ...taskState.resources };
}

/**
 * Gasta recursos (para proyectos de construcción)
 * @param {object} cost - { knowledge, materials, inspiration }
 */
export function spendResources(cost) {
  taskState.resources.knowledge = Math.max(0, taskState.resources.knowledge - (cost.knowledge || 0));
  taskState.resources.materials = Math.max(0, taskState.resources.materials - (cost.materials || 0));
  taskState.resources.inspiration = Math.max(0, taskState.resources.inspiration - (cost.inspiration || 0));
  saveState();
  notifyStateChange();
  console.log('[TASK] Recursos gastados:', cost, 'Nuevo total:', taskState.resources);
}

/**
 * Extrae el tema del mensaje después del verbo trigger
 * NOTA: Ahora usamos el mensaje completo, truncado solo para display
 */
function extractTopic(userMsg) {
  // Limpiar inicio con verbos comunes pero mantener el tema completo
  let topic = userMsg
    .replace(/^(investiga|busca|explica|codea|programa|implementa|arregla|planea|piensa|diseña|organiza|estructura|revisa|evalúa|checa)\s*/i, '')
    .replace(/^(sobre|de|el|la|los|las|un|una)\s+/i, '')
    .trim();

  return topic || userMsg;
}

/**
 * Genera un título corto para display (max 40 chars)
 */
function generateTitle(prefix, userMsg) {
  const topic = extractTopic(userMsg);
  const truncated = topic.length > 35 ? topic.slice(0, 35) + '...' : topic;
  return `${prefix}: ${truncated}`;
}

/**
 * Detecta intención de tarea en el mensaje
 */
export function parseTaskIntent(userMsg) {
  const msg = userMsg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ═══ INVESTIGACIÓN ═══
  if (msg.match(/investiga|busca|que es|como funciona|explica|averigua|dime sobre|que sabes de/)) {
    return {
      type: 'new_task',
      taskType: 'research',
      title: generateTitle('Investigar', userMsg),
      description: userMsg, // Mensaje COMPLETO para el prompt
    };
  }

  // ═══ CÓDIGO ═══
  if (msg.match(/codigo|codea|programa|funcion|componente|script|debug|fix|arregla|implementa/)) {
    return {
      type: 'new_task',
      taskType: 'code',
      title: generateTitle('Código', userMsg),
      description: userMsg,
    };
  }

  // ═══ PLANIFICACIÓN ═══
  if (msg.match(/planea|piensa|ayudame a pensar|estructura|organiza|como deberia|que opinas de|disena|arquitectura/)) {
    return {
      type: 'new_task',
      taskType: 'plan',
      title: generateTitle('Plan', userMsg),
      description: userMsg,
    };
  }

  // ═══ REVISIÓN ═══
  if (msg.match(/revisa|review|evalua|que piensas de|feedback|esta bien|checa/)) {
    return {
      type: 'new_task',
      taskType: 'review',
      title: generateTitle('Review', userMsg),
      description: userMsg,
    };
  }

  // ═══ APROBACIÓN de trabajo ═══
  if (msg.match(/perfecto|me sirve|gracias|bien hecho|excelente|justo lo que|util|genial|aprobado|ok|esta bien/)) {
    if (taskState.activeTask && taskState.activeTask.status === 'review') {
      return { type: 'approve_task' };
    }
  }

  // ═══ RECHAZO / CAMBIOS ═══
  if (msg.match(/no me sirve|cambialo|mejora|otra vez|mas detalle|falta|incompleto|no es lo que|mejoralo/)) {
    if (taskState.activeTask && taskState.activeTask.status === 'review') {
      return { type: 'reject_task', feedback: userMsg };
    }
  }

  // No es tarea, es chat normal
  return { type: 'chat' };
}

/**
 * Crea una nueva tarea
 */
export function createTask(intent) {
  const taskType = TASK_TYPES[intent.taskType];

  const task = {
    id: `task_${Date.now()}`,
    type: intent.taskType,
    title: intent.title,
    description: intent.description,
    status: 'in_progress',
    createdAt: Date.now(),
    workSteps: [...taskType.workSteps],
    currentStep: 0,
    deliverable: null,
    reward: { ...taskType.reward },
  };

  taskState.activeTask = task;
  notifyListeners();

  console.log('[TASK] Nueva tarea creada:', task.title);
  return task;
}

/**
 * Obtiene la tarea activa
 */
export function getActiveTask() {
  return taskState.activeTask;
}

/**
 * Procesa la tarea activa
 * @param {function} onStepUpdate - Callback para actualizar UI
 * @param {string} forceTier - 'task' (local), 'chat' (API), o null para auto
 */
export async function processTask(onStepUpdate, forceTier = null) {
  const task = taskState.activeTask;
  if (!task) return null;

  const taskType = TASK_TYPES[task.type];

  // Determinar tier: si se fuerza API, usar 'chat' (que prefiere Claude)
  const tier = forceTier || 'task';
  const usingApi = forceTier === 'chat';

  if (usingApi) {
    console.log('[TASK] 🔌 Procesando vía API (Claude)...');
  }

  // Obtener memorias relevantes
  const memories = retrieveMemories(task.description, 3);
  const memoriesText = memories.length > 0
    ? memories.map(m => `- ${m.content}`).join('\n')
    : 'Sin memorias específicas relevantes';

  // Obtener tareas anteriores similares
  const previousTasks = taskState.taskHistory
    .filter(t => t.type === task.type && t.deliverable?.approved)
    .slice(-2)
    .map(t => `- ${t.title}: ${t.deliverable?.content?.slice(0, 80)}...`)
    .join('\n') || 'Este es un tema nuevo.';

  // Simular pasos con delay
  for (let i = 0; i < task.workSteps.length; i++) {
    task.currentStep = i;
    notifyListeners();

    if (onStepUpdate) {
      const stepText = usingApi
        ? `${task.workSteps[i]} (vía API)`
        : task.workSteps[i];
      onStepUpdate(stepText, i, task.workSteps.length);
    }

    // Delay entre pasos (1-2 segundos)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  }

  // Construir prompt completo con fecha/hora inyectada
  let fullPrompt = taskType.prompt
    .replace('{fecha_hora}', getCurrentDateTime())
    .replace('{descripción}', task.description)
    + '\n\nCONTEXTO DE TRABAJOS ANTERIORES:\n' + previousTasks
    + '\n\nMEMORIAS RELEVANTES:\n' + memoriesText;

  // Si usa API, el prompt puede ser más ambicioso
  if (usingApi) {
    fullPrompt += '\n\n═══ MODO API ═══\n'
      + 'Tienes acceso a conocimiento amplio y actualizado (Claude). '
      + 'Da una respuesta completa, detallada y precisa. '
      + 'Puedes incluir información más reciente que un modelo local no tendría.';
  } else {
    fullPrompt += '\n\n═══ MODO LOCAL ═══\n'
      + 'Solo incluye información que sepas con certeza. '
      + 'Si no sabes algo actualizado, dilo honestamente. No inventes.';
  }

  // Procesar con LLM
  console.log(`[TASK] Procesando con tier=${tier}...`);
  const result = await think(fullPrompt, task.description, tier);

  if (result.source === 'fallback' || !result.response) {
    // Fallback
    task.deliverable = {
      content: `*se rasca el casco* No logré completar esta tarea... mi mente está nublada. ¿Podemos intentar de nuevo? 🔧`,
      approved: null,
      source: 'fallback',
      tier: tier,
    };
    task.status = 'failed';
  } else {
    task.deliverable = {
      content: result.response,
      approved: null,
      source: result.source,
      tier: tier,
    };
    task.status = 'review'; // Esperando aprobación

    // Si usó API (no local), dar recursos DOBLES
    const usedApi = result.source !== 'local';
    if (usedApi) {
      task.reward = {
        knowledge: taskType.reward.knowledge * 2,
        materials: taskType.reward.materials * 2,
        inspiration: taskType.reward.inspiration * 2,
      };
      task.usedApi = true;
      console.log('[TASK] 🔌 Recursos dobles por usar API:', task.reward);
    }
  }

  task.completedAt = Date.now();
  notifyListeners();

  console.log('[TASK] Tarea procesada:', task.status, 'source:', result.source);
  return task;
}

/**
 * Aprueba la tarea activa
 */
export function approveTask() {
  const task = taskState.activeTask;
  if (!task || task.status !== 'review') return null;

  task.deliverable.approved = true;
  task.status = 'completed';

  // Sumar recursos
  taskState.resources.knowledge += task.reward.knowledge;
  taskState.resources.materials += task.reward.materials;
  taskState.resources.inspiration += task.reward.inspiration;

  // Guardar memoria de éxito
  addMemory(
    MEMORY_TYPES.THOUGHT,
    `Completé tarea "${task.title}" para Rodrigo. Fue aprobada. 📚+${task.reward.knowledge} 🪨+${task.reward.materials} ✨+${task.reward.inspiration}`,
    'workshop',
    8
  );

  // Mover a historial
  taskState.taskHistory.push({ ...task });
  taskState.activeTask = null;

  saveTaskState();
  notifyListeners();

  console.log('[TASK] Tarea aprobada. Recursos:', taskState.resources);
  return task;
}

/**
 * Máximo de reintentos permitidos
 */
const MAX_RETRIES = 2;

/**
 * Rechaza la tarea y permite retrabajarla (max 2 reintentos)
 */
export function rejectTask(feedback) {
  const task = taskState.activeTask;
  if (!task || task.status !== 'review') return null;

  const currentRetries = task.retryCount || 0;

  // Verificar si ya se agotaron los reintentos
  if (currentRetries >= MAX_RETRIES) {
    console.log('[TASK] Máximo de reintentos alcanzado, cerrando tarea sin aprobar');
    task.deliverable.approved = false;
    task.status = 'abandoned';

    // Guardar memoria de fracaso
    addMemory(
      MEMORY_TYPES.THOUGHT,
      `No logré completar "${task.title}" satisfactoriamente después de ${MAX_RETRIES} intentos. Debo aprender de esto.`,
      'workshop',
      10
    );

    // Mover a historial sin recursos
    taskState.taskHistory.push({ ...task });
    taskState.activeTask = null;

    saveTaskState();
    notifyListeners();

    return { ...task, maxRetriesReached: true };
  }

  // Guardar respuesta anterior completa para contexto
  task.previousResponse = task.deliverable?.content || '';
  task.deliverable.approved = false;
  task.status = 'in_progress';
  task.feedback = feedback;
  task.retryCount = currentRetries + 1;

  // Guardar memoria de aprendizaje
  addMemory(
    MEMORY_TYPES.THOUGHT,
    `Mi trabajo sobre "${task.title}" necesitó mejoras (intento ${task.retryCount}/${MAX_RETRIES}). Rodrigo dijo: "${feedback?.slice(0, 50)}". Debo hacerlo diferente.`,
    'workshop',
    9
  );

  notifyListeners();

  console.log(`[TASK] Tarea rechazada, retrabajando... (intento ${task.retryCount}/${MAX_RETRIES})`);
  return task;
}

/**
 * Retrabaja la tarea con feedback (incluye respuesta anterior completa)
 */
export async function reworkTask(onStepUpdate) {
  const task = taskState.activeTask;
  if (!task) return null;

  const taskType = TASK_TYPES[task.type];

  // Paso de mejora
  if (onStepUpdate) {
    onStepUpdate(`Mejorando basado en feedback... (intento ${task.retryCount}/${MAX_RETRIES})`, 0, 1);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Usar respuesta anterior completa guardada en rejectTask
  const previousResponse = task.previousResponse || task.deliverable?.content || '';

  // Prompt con feedback Y respuesta anterior COMPLETA (con fecha/hora inyectada)
  const feedbackPrompt = `${taskType.prompt.replace('{fecha_hora}', getCurrentDateTime()).replace('{descripción}', task.description)}

═══ IMPORTANTE: FEEDBACK DE RODRIGO ═══
${task.feedback || 'El usuario pidió mejorar el resultado, pero no especificó qué cambiar.'}

═══ TU RESPUESTA ANTERIOR (QUE DEBES MEJORAR) ═══
${previousResponse}

═══ INSTRUCCIONES ═══
1. LEE el feedback cuidadosamente
2. IDENTIFICA qué específicamente no gustó de tu respuesta anterior
3. GENERA una respuesta DIFERENTE que incorpore el feedback
4. NO repitas la misma respuesta - debe ser notablemente diferente
5. Este es tu intento ${task.retryCount} de ${MAX_RETRIES} - hazlo bien`;

  const result = await think(feedbackPrompt, task.description, 'task');

  if (result.source !== 'fallback' && result.response) {
    task.deliverable = {
      content: result.response,
      approved: null,
      source: result.source,
    };
    task.status = 'review';
  }

  task.completedAt = Date.now();
  notifyListeners();

  return task;
}

/**
 * Formatea el deliverable para mostrar en el chat
 */
export function formatDeliverable(task) {
  if (!task || !task.deliverable) return '';

  const taskType = TASK_TYPES[task.type];
  const reward = task.reward;

  // Badge de fuente (LOCAL vs API)
  const sourceIcon = task.usedApi ? '☁️ API' : '🖥️ LOCAL';

  // Cabecera con tipo de tarea y fuente
  let formatted = `\n━━━ ${taskType.icon} ${taskType.name.toUpperCase()}: ${task.title.slice(0, 30)} [${sourceIcon}] ━━━\n\n`;

  // Contenido
  formatted += task.deliverable.content;

  // Footer con recompensa
  formatted += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  formatted += `⏱️ ${Math.round((task.completedAt - task.createdAt) / 1000)}s`;

  // Bonus text si usó API
  const bonusText = task.usedApi ? ' (API bonus x2)' : '';

  // Mostrar recompensa según estado de aprobación
  if (task.deliverable.approved === true) {
    // APROBADA: Recursos ganados
    formatted += `  ✅ GANADO: 📚+${reward.knowledge} 🪨+${reward.materials} ✨+${reward.inspiration}${bonusText}`;
  } else if (task.deliverable.approved === false) {
    // RECHAZADA: Retrabajando
    formatted += `  🔄 Mejorando... (recompensa pendiente)`;
  } else {
    // PENDIENTE: Esperando aprobación - NO muestra como ganados
    formatted += `  ⏳ Si apruebas: 📚+${reward.knowledge} 🪨+${reward.materials} ✨+${reward.inspiration}${bonusText}`;
  }

  return formatted;
}

/**
 * Genera mensaje de confirmación
 */
export function getConfirmationMessage(intent) {
  const taskType = TASK_TYPES[intent.taskType];
  const messages = [
    `Entendido, voy a ${taskType.name.toLowerCase()} sobre eso. Dame unos momentos... ${taskType.icon}`,
    `Perfecto, empiezo a trabajar en "${intent.title.slice(0, 30)}". ${taskType.icon}`,
    `Ok, me pongo con eso. Voy al taller a trabajar... ${taskType.icon}`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Genera mensaje de recompensa
 */
export function getRewardMessage(task) {
  const r = task.reward;
  const total = taskState.resources;
  return `¡Genial! Eso me dio 📚${r.knowledge} 🪨${r.materials} ✨${r.inspiration}. Total: 📚${total.knowledge} 🪨${total.materials} ✨${total.inspiration}`;
}

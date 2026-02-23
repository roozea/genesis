// GENESIS — Sistema de Tareas
// Arq trabaja en tareas reales y gana recursos

import { think } from '../config/llm';
import { addMemory, MEMORY_TYPES, retrieveMemories } from './memory';
import { forceDestination, getWorldState, updateWorldState } from './worldState';

// Tipos de tarea y configuración
export const TASK_TYPES = {
  research: {
    icon: '🔍',
    name: 'Investigación',
    prompt: `Eres Arq, asistente de investigación.
Rodrigo necesita: {descripción}

Investiga el tema usando tu conocimiento. Organiza así:
1. RESUMEN (2-3 oraciones, lo esencial)
2. PUNTOS CLAVE (3-5 puntos importantes)
3. EJEMPLO PRÁCTICO (si aplica, código o caso real)
4. LO QUE NO SÉ (honesto sobre limitaciones)

Responde en español, directo, sin relleno.`,
    reward: { knowledge: 5, materials: 2, inspiration: 3 },
    workSteps: ['Investigando...', 'Organizando info...', 'Escribiendo resumen...'],
  },

  code: {
    icon: '💻',
    name: 'Código',
    prompt: `Eres Arq, asistente de programación.
Rodrigo necesita: {descripción}

Responde con:
1. SOLUCIÓN (código limpio y comentado)
2. EXPLICACIÓN (qué hace cada parte importante, breve)
3. ALTERNATIVAS (si hay otra forma mejor, menciónala)
4. CUIDADO (posibles bugs o edge cases)

Código en bloques con lenguaje indicado. Español para explicaciones.`,
    reward: { knowledge: 3, materials: 5, inspiration: 2 },
    workSteps: ['Analizando el problema...', 'Escribiendo código...', 'Revisando...'],
  },

  plan: {
    icon: '📋',
    name: 'Planificación',
    prompt: `Eres Arq, asistente de planificación.
Rodrigo quiere pensar sobre: {descripción}

Ayúdale a estructurar:
1. ENTENDIMIENTO (reformula lo que Rodrigo quiere en tus palabras)
2. OPCIONES (2-3 caminos posibles, pros y contras de cada uno)
3. RECOMENDACIÓN (cuál elegirías y por qué)
4. PASOS SIGUIENTES (3-5 acciones concretas)

Sé directo. Si algo no está claro, pregunta.`,
    reward: { knowledge: 4, materials: 2, inspiration: 5 },
    workSteps: ['Entendiendo el problema...', 'Evaluando opciones...', 'Armando el plan...'],
  },

  review: {
    icon: '🔎',
    name: 'Revisión',
    prompt: `Eres Arq, revisor técnico.
Rodrigo quiere que revises: {descripción}

Evalúa con:
1. LO BUENO (qué está bien hecho, sé específico)
2. MEJORAR (qué cambiarías, con razón concreta)
3. BUGS/RIESGOS (si hay algo que puede fallar)
4. SUGERENCIA FINAL (1 cambio que haría la mayor diferencia)

Sé honesto pero constructivo. No rellenes.`,
    reward: { knowledge: 3, materials: 3, inspiration: 3 },
    workSteps: ['Leyendo el material...', 'Analizando...', 'Preparando feedback...'],
  },
};

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
 * Extrae el tema del mensaje después del verbo trigger
 */
function extractTopic(msg, triggerWords) {
  for (const word of triggerWords) {
    const idx = msg.indexOf(word);
    if (idx !== -1) {
      const after = msg.slice(idx + word.length).trim();
      return after.replace(/^(sobre|de|el|la|los|las|un|una|cómo|qué)\s+/i, '').trim() || msg;
    }
  }
  return msg;
}

/**
 * Detecta intención de tarea en el mensaje
 */
export function parseTaskIntent(userMsg) {
  const msg = userMsg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ═══ INVESTIGACIÓN ═══
  if (msg.match(/investiga|busca|que es|como funciona|explica|averigua|dime sobre|que sabes de/)) {
    const topic = extractTopic(msg, ['investiga', 'busca', 'explica', 'averigua', 'dime sobre']);
    return {
      type: 'new_task',
      taskType: 'research',
      title: `Investigar: ${topic.slice(0, 40)}`,
      description: userMsg,
    };
  }

  // ═══ CÓDIGO ═══
  if (msg.match(/codigo|codea|programa|funcion|componente|script|debug|fix|arregla|implementa/)) {
    const topic = extractTopic(msg, ['codigo', 'codea', 'programa', 'implementa', 'arregla']);
    return {
      type: 'new_task',
      taskType: 'code',
      title: `Código: ${topic.slice(0, 40)}`,
      description: userMsg,
    };
  }

  // ═══ PLANIFICACIÓN ═══
  if (msg.match(/planea|piensa|ayudame a pensar|estructura|organiza|como deberia|que opinas de|disena|arquitectura/)) {
    const topic = extractTopic(msg, ['planea', 'piensa', 'disena', 'organiza', 'estructura']);
    return {
      type: 'new_task',
      taskType: 'plan',
      title: `Plan: ${topic.slice(0, 40)}`,
      description: userMsg,
    };
  }

  // ═══ REVISIÓN ═══
  if (msg.match(/revisa|review|evalua|que piensas de|feedback|esta bien|checa/)) {
    const topic = extractTopic(msg, ['revisa', 'evalua', 'checa', 'review']);
    return {
      type: 'new_task',
      taskType: 'review',
      title: `Review: ${topic.slice(0, 40)}`,
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
 * Procesa la tarea activa con Ollama
 */
export async function processTask(onStepUpdate) {
  const task = taskState.activeTask;
  if (!task) return null;

  const taskType = TASK_TYPES[task.type];

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
      onStepUpdate(task.workSteps[i], i, task.workSteps.length);
    }

    // Delay entre pasos (1-2 segundos)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  }

  // Construir prompt completo
  const fullPrompt = taskType.prompt
    .replace('{descripción}', task.description)
    + '\n\nCONTEXTO DE TRABAJOS ANTERIORES:\n' + previousTasks
    + '\n\nMEMORIAS RELEVANTES:\n' + memoriesText;

  // Procesar con LLM (tier chat para mejor calidad)
  console.log('[TASK] Procesando con LLM...');
  const result = await think(fullPrompt, task.description, 'chat');

  if (result.source === 'fallback' || !result.response) {
    // Fallback
    task.deliverable = {
      content: `*se rasca el casco* No logré completar esta tarea... mi mente está nublada. ¿Podemos intentar de nuevo? 🔧`,
      approved: null,
      source: 'fallback',
    };
    task.status = 'failed';
  } else {
    task.deliverable = {
      content: result.response,
      approved: null,
      source: result.source,
    };
    task.status = 'review'; // Esperando aprobación
  }

  task.completedAt = Date.now();
  notifyListeners();

  console.log('[TASK] Tarea procesada:', task.status);
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
 * Rechaza la tarea y permite retrabajarla
 */
export function rejectTask(feedback) {
  const task = taskState.activeTask;
  if (!task || task.status !== 'review') return null;

  task.deliverable.approved = false;
  task.status = 'in_progress';
  task.feedback = feedback;
  task.retryCount = (task.retryCount || 0) + 1;

  // Guardar memoria de aprendizaje
  addMemory(
    MEMORY_TYPES.THOUGHT,
    `Mi trabajo sobre "${task.title}" necesitó mejoras. Rodrigo dijo: "${feedback?.slice(0, 50)}". Debo hacerlo diferente.`,
    'workshop',
    9
  );

  notifyListeners();

  console.log('[TASK] Tarea rechazada, retrabajando...');
  return task;
}

/**
 * Retrabaja la tarea con feedback
 */
export async function reworkTask(onStepUpdate) {
  const task = taskState.activeTask;
  if (!task) return null;

  const taskType = TASK_TYPES[task.type];

  // Paso de mejora
  if (onStepUpdate) {
    onStepUpdate('Mejorando basado en feedback...', 0, 1);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Prompt con feedback
  const feedbackPrompt = taskType.prompt
    .replace('{descripción}', task.description)
    + '\n\nFEEDBACK DE RODRIGO (IMPORTANTE - incorpora esto):\n' + (task.feedback || 'Mejorar el resultado')
    + '\n\nTu respuesta anterior fue:\n' + (task.deliverable?.content?.slice(0, 200) || '')
    + '\n\nMejora tu respuesta basándote en el feedback.';

  const result = await think(feedbackPrompt, task.description, 'chat');

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

  // Cabecera con tipo de tarea
  let formatted = `\n━━━ ${taskType.icon} ${taskType.name.toUpperCase()}: ${task.title.slice(0, 30)} ━━━\n\n`;

  // Contenido
  formatted += task.deliverable.content;

  // Footer con recompensa pendiente
  formatted += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  formatted += `⏱️ ${Math.round((task.completedAt - task.createdAt) / 1000)}s`;
  formatted += `  📚+${reward.knowledge} 🪨+${reward.materials} ✨+${reward.inspiration}`;
  formatted += task.deliverable.approved === null ? ' (pendiente)' : task.deliverable.approved ? ' ✅' : ' 🔄';

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

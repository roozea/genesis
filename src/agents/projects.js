// GENESIS — Sistema de Proyectos de Construcción
// Arq puede construir mejoras permanentes en el mundo

// ============================================
// CATÁLOGO DE PROYECTOS
// ============================================

export const PROJECT_CATALOG = [
  {
    id: 'workshop_bench',
    name: 'Mesa de trabajo',
    icon: '🔨',
    location: 'workshop',
    description: 'Una mesa para planear mejor los proyectos',
    cost: { knowledge: 10, materials: 15, inspiration: 5 },
    workTurns: 3,
    reward: {
      tile: { r: 3, c: 3, type: 'workbench' },
      bonus: 'Las tareas de investigación dan +1 📚',
    },
    unlocked: true,
  },
  {
    id: 'garden_flowers',
    name: 'Expandir jardín',
    icon: '🌺',
    location: 'garden',
    description: 'Más flores para el jardín',
    cost: { knowledge: 8, materials: 20, inspiration: 3 },
    workTurns: 4,
    reward: {
      tiles: [
        { r: 9, c: 3, type: 'flowers' },
        { r: 9, c: 5, type: 'flowers' },
      ],
      bonus: 'Reflexiones en el jardín dan +1 ✨',
    },
    unlocked: true,
  },
  {
    id: 'lake_dock',
    name: 'Muelle del lago',
    icon: '🌊',
    location: 'lakeshore',
    description: 'Un lugar para pensar junto al agua',
    cost: { knowledge: 12, materials: 25, inspiration: 8 },
    workTurns: 5,
    reward: {
      tile: { r: 12, c: 16, type: 'dock' },
      bonus: 'Reflexiones profundas más frecuentes en el muelle',
    },
    unlocked: false,
    unlockCondition: { projectsCompleted: 1 },
  },
  {
    id: 'path_signs',
    name: 'Señales de camino',
    icon: '🪧',
    location: 'crossroad',
    description: 'Señales para no perderse',
    cost: { knowledge: 6, materials: 12, inspiration: 2 },
    workTurns: 2,
    reward: {
      tile: { r: 6, c: 10, type: 'signpost' },
    },
    unlocked: true,
  },
  {
    id: 'locked_investigate',
    name: 'Investigar edificio cerrado',
    icon: '🔒',
    location: 'locked',
    description: 'Descubrir qué hay detrás de esa puerta',
    cost: { knowledge: 20, materials: 10, inspiration: 15 },
    workTurns: 6,
    reward: {
      tile: { r: 4, c: 15, type: 'door_cracked' },
      bonus: 'Pista sobre el siguiente agente',
    },
    unlocked: false,
    unlockCondition: { projectsCompleted: 3 },
  },
];

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  activeProject: 'genesis_active_project',
  completedProjects: 'genesis_completed_projects',
  worldChanges: 'genesis_world_changes',
};

// ============================================
// LISTENERS
// ============================================

const projectListeners = new Set();

export function onProjectChange(callback) {
  projectListeners.add(callback);
  return () => projectListeners.delete(callback);
}

function notifyProjectChange() {
  const state = getProjectState();
  projectListeners.forEach(cb => cb(state));
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene el estado completo de proyectos
 */
export function getProjectState() {
  return {
    activeProject: getActiveProject(),
    completedProjects: getCompletedProjects(),
    worldChanges: getWorldChanges(),
  };
}

/**
 * Obtiene proyectos disponibles para construir
 * @param {object} resources - Recursos actuales { knowledge, materials, inspiration }
 * @returns {array} Proyectos con info de si puede pagarlo
 */
export function getAvailableProjects(resources) {
  const completed = getCompletedProjects();
  const active = getActiveProject();

  return PROJECT_CATALOG.filter(p => {
    // Ya completado
    if (completed.includes(p.id)) return false;

    // Actualmente en construcción
    if (active && active.id === p.id) return false;

    // Verificar condición de desbloqueo
    if (!p.unlocked && p.unlockCondition) {
      if (p.unlockCondition.projectsCompleted > completed.length) {
        return false;
      }
    }

    return true;
  }).map(p => ({
    ...p,
    canAfford: canAffordProject(p, resources),
    missingResources: getMissingResources(p, resources),
  }));
}

/**
 * Obtiene proyectos bloqueados (para mostrar en UI)
 */
export function getLockedProjects() {
  const completed = getCompletedProjects();

  return PROJECT_CATALOG.filter(p => {
    if (completed.includes(p.id)) return false;
    if (!p.unlockCondition) return false;

    return p.unlockCondition.projectsCompleted > completed.length;
  }).map(p => ({
    ...p,
    unlockRequirement: `Completa ${p.unlockCondition.projectsCompleted} proyecto${p.unlockCondition.projectsCompleted > 1 ? 's' : ''}`,
  }));
}

/**
 * Verifica si puede pagar un proyecto
 */
function canAffordProject(project, resources) {
  return (
    (resources.knowledge || 0) >= project.cost.knowledge &&
    (resources.materials || 0) >= project.cost.materials &&
    (resources.inspiration || 0) >= project.cost.inspiration
  );
}

/**
 * Calcula recursos faltantes
 */
function getMissingResources(project, resources) {
  const missing = {};
  const k = project.cost.knowledge - (resources.knowledge || 0);
  const m = project.cost.materials - (resources.materials || 0);
  const i = project.cost.inspiration - (resources.inspiration || 0);

  if (k > 0) missing.knowledge = k;
  if (m > 0) missing.materials = m;
  if (i > 0) missing.inspiration = i;

  return Object.keys(missing).length > 0 ? missing : null;
}

/**
 * Inicia un proyecto
 * @param {string} projectId - ID del proyecto
 * @param {object} resources - Recursos actuales (se modifican in-place)
 * @returns {object|null} Proyecto iniciado o null si no puede
 */
export function startProject(projectId, resources) {
  const project = PROJECT_CATALOG.find(p => p.id === projectId);
  if (!project) {
    console.log('[PROJECTS] Proyecto no encontrado:', projectId);
    return null;
  }

  // Verificar que puede pagarlo
  if (!canAffordProject(project, resources)) {
    console.log('[PROJECTS] No puede pagar:', projectId);
    return null;
  }

  // Verificar que no hay proyecto activo
  if (getActiveProject()) {
    console.log('[PROJECTS] Ya hay un proyecto activo');
    return null;
  }

  // Restar recursos
  resources.knowledge -= project.cost.knowledge;
  resources.materials -= project.cost.materials;
  resources.inspiration -= project.cost.inspiration;

  // Crear proyecto activo
  const activeProject = {
    ...project,
    turnsCompleted: 0,
    startedAt: Date.now(),
    status: 'active',
  };

  localStorage.setItem(STORAGE_KEYS.activeProject, JSON.stringify(activeProject));
  console.log('[PROJECTS] Proyecto iniciado:', project.name);

  notifyProjectChange();
  return activeProject;
}

/**
 * Trabaja en el proyecto activo (un turno)
 * @returns {object|null} Estado del proyecto actualizado
 */
export function workOnProject() {
  const project = getActiveProject();
  if (!project) {
    console.log('[PROJECTS] No hay proyecto activo');
    return null;
  }

  project.turnsCompleted++;
  console.log(`[PROJECTS] Trabajando: ${project.turnsCompleted}/${project.workTurns}`);

  if (project.turnsCompleted >= project.workTurns) {
    // Proyecto completado
    project.status = 'completed';
    project.completedAt = Date.now();

    // Aplicar recompensas al mundo
    applyProjectReward(project);

    // Mover a completados
    const completed = getCompletedProjects();
    completed.push(project.id);
    localStorage.setItem(STORAGE_KEYS.completedProjects, JSON.stringify(completed));

    // Limpiar proyecto activo
    localStorage.removeItem(STORAGE_KEYS.activeProject);

    console.log('[PROJECTS] ¡Proyecto completado!', project.name);
    notifyProjectChange();
    return { ...project, justCompleted: true };
  }

  // Guardar progreso
  localStorage.setItem(STORAGE_KEYS.activeProject, JSON.stringify(project));
  notifyProjectChange();
  return project;
}

/**
 * Aplica las recompensas de un proyecto al mundo
 */
function applyProjectReward(project) {
  const worldChanges = getWorldChanges();

  if (project.reward.tile) {
    worldChanges.push({
      ...project.reward.tile,
      projectId: project.id,
      addedAt: Date.now(),
    });
  }

  if (project.reward.tiles) {
    project.reward.tiles.forEach(tile => {
      worldChanges.push({
        ...tile,
        projectId: project.id,
        addedAt: Date.now(),
      });
    });
  }

  localStorage.setItem(STORAGE_KEYS.worldChanges, JSON.stringify(worldChanges));
  console.log('[PROJECTS] Tiles agregados:', worldChanges.length);
}

/**
 * Cancela el proyecto activo (no devuelve recursos)
 */
export function cancelProject() {
  const project = getActiveProject();
  if (!project) return null;

  localStorage.removeItem(STORAGE_KEYS.activeProject);
  console.log('[PROJECTS] Proyecto cancelado:', project.name);
  notifyProjectChange();
  return project;
}

// ============================================
// GETTERS
// ============================================

export function getActiveProject() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.activeProject);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function getCompletedProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.completedProjects);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getWorldChanges() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.worldChanges);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Obtiene un proyecto por ID (del catálogo)
 */
export function getProjectById(id) {
  return PROJECT_CATALOG.find(p => p.id === id) || null;
}

/**
 * Formatea la lista de proyectos para mostrar en chat
 */
export function formatProjectsForChat(resources) {
  const available = getAvailableProjects(resources);
  const locked = getLockedProjects();
  const active = getActiveProject();

  let text = '';

  // Proyecto activo
  if (active) {
    const progress = Math.round((active.turnsCompleted / active.workTurns) * 100);
    text += `🏗️ EN CONSTRUCCIÓN:\n`;
    text += `${active.icon} ${active.name} — ${active.turnsCompleted}/${active.workTurns} turnos (${progress}%)\n\n`;
  }

  // Disponibles
  if (available.length > 0) {
    text += `📋 DISPONIBLES:\n`;
    available.forEach(p => {
      const costStr = `📚${p.cost.knowledge} 🪨${p.cost.materials} ✨${p.cost.inspiration}`;
      if (p.canAfford) {
        text += `${p.icon} ${p.name} — ${costStr}\n   ✅ Puedo hacerlo\n`;
      } else {
        const missing = [];
        if (p.missingResources.knowledge) missing.push(`📚${p.missingResources.knowledge}`);
        if (p.missingResources.materials) missing.push(`🪨${p.missingResources.materials}`);
        if (p.missingResources.inspiration) missing.push(`✨${p.missingResources.inspiration}`);
        text += `${p.icon} ${p.name} — ${costStr}\n   ⚠️ Me faltan ${missing.join(' ')}\n`;
      }
    });
  }

  // Bloqueados
  if (locked.length > 0) {
    text += `\n🔒 BLOQUEADOS:\n`;
    locked.forEach(p => {
      text += `${p.icon} ${p.name} — ${p.unlockRequirement}\n`;
    });
  }

  // Si no hay nada
  if (!active && available.length === 0 && locked.length === 0) {
    text = '¡Ya construí todo lo disponible! 🎉';
  }

  return text.trim();
}

/**
 * Busca un proyecto por nombre o keyword
 */
export function findProjectByKeyword(text) {
  const lower = text.toLowerCase();

  const keywords = {
    'mesa': 'workshop_bench',
    'banco': 'workshop_bench',
    'trabajo': 'workshop_bench',
    'jardin': 'garden_flowers',
    'jardín': 'garden_flowers',
    'flores': 'garden_flowers',
    'expandir': 'garden_flowers',
    'muelle': 'lake_dock',
    'dock': 'lake_dock',
    'lago': 'lake_dock',
    'señales': 'path_signs',
    'señal': 'path_signs',
    'camino': 'path_signs',
    'edificio': 'locked_investigate',
    'investigar': 'locked_investigate',
    'cerrado': 'locked_investigate',
    'puerta': 'locked_investigate',
  };

  for (const [keyword, projectId] of Object.entries(keywords)) {
    if (lower.includes(keyword)) {
      return PROJECT_CATALOG.find(p => p.id === projectId) || null;
    }
  }

  return null;
}

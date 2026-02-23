// GENESIS — Modal de Tareas y Proyectos
import { useState, useEffect } from 'react';
import Modal, { ModalSection, ModalItem } from './Modal';
import { PALETTE } from '../config/palette';
import { getTaskState, TASK_TYPES, getResources } from '../agents/taskSystem';
import {
  getAvailableProjects,
  getLockedProjects,
  getActiveProject,
  getCompletedProjects,
  PROJECT_CATALOG,
} from '../agents/projects';
import { LOCATIONS } from '../world/locations';

export default function TasksModal({ isOpen, onClose }) {
  const [taskState, setTaskState] = useState({ activeTask: null, resources: {}, taskHistory: [] });
  const [projectState, setProjectState] = useState({
    active: null,
    available: [],
    locked: [],
    completed: [],
  });

  useEffect(() => {
    if (isOpen) {
      setTaskState(getTaskState());
      const resources = getResources();
      setProjectState({
        active: getActiveProject(),
        available: getAvailableProjects(resources),
        locked: getLockedProjects(),
        completed: getCompletedProjects(),
      });
    }
  }, [isOpen]);

  const { activeTask, resources, taskHistory } = taskState;
  const { active: activeProject, available: availableProjects, locked: lockedProjects, completed: completedProjects } = projectState;
  const completedToday = taskHistory.filter(t => {
    const today = new Date().toDateString();
    return new Date(t.completedAt).toDateString() === today;
  });

  // Calcular recursos ganados hoy
  const todayResources = completedToday.reduce((acc, t) => {
    if (t.reward) {
      acc.knowledge += t.reward.knowledge || 0;
      acc.materials += t.reward.materials || 0;
      acc.inspiration += t.reward.inspiration || 0;
    }
    return acc;
  }, { knowledge: 0, materials: 0, inspiration: 0 });

  // Formato de tiempo relativo
  const relativeTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    return `hace ${hours}h`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PANEL DE TRABAJO" icon="📋">
      {/* Recursos totales */}
      <ModalSection title="RECURSOS ACUMULADOS">
        <div style={{ display: 'flex', gap: 20, padding: '8px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14 }}>📚</div>
            <div style={{ color: '#80c0ff', fontSize: 10 }}>{resources.knowledge || 0}</div>
            <div style={{ fontSize: 6, color: PALETTE.textDim }}>Conocimiento</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14 }}>🪨</div>
            <div style={{ color: '#c0a080', fontSize: 10 }}>{resources.materials || 0}</div>
            <div style={{ fontSize: 6, color: PALETTE.textDim }}>Materiales</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14 }}>✨</div>
            <div style={{ color: '#ffc040', fontSize: 10 }}>{resources.inspiration || 0}</div>
            <div style={{ fontSize: 6, color: PALETTE.textDim }}>Inspiración</div>
          </div>
        </div>
      </ModalSection>

      {/* Tarea activa */}
      <ModalSection title="TAREA ACTUAL">
        {activeTask ? (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(240, 192, 64, 0.1)',
              border: '1px solid #f0c040',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12 }}>{TASK_TYPES[activeTask.type]?.icon || '📋'}</span>
              <span style={{ fontSize: 8, color: PALETTE.accent }}>
                {TASK_TYPES[activeTask.type]?.name || activeTask.type}
              </span>
              <span
                style={{
                  fontSize: 6,
                  padding: '2px 6px',
                  backgroundColor: activeTask.status === 'review' ? '#50c878' : '#f0c040',
                  color: '#000',
                  borderRadius: 3,
                }}
              >
                {activeTask.status === 'review' ? 'ESPERANDO REVIEW' : 'EN PROGRESO'}
              </span>
            </div>
            <div style={{ fontSize: 7, marginBottom: 6 }}>{activeTask.title}</div>
            {activeTask.workSteps && (
              <div style={{ fontSize: 6, color: PALETTE.textDim }}>
                Paso {activeTask.currentStep + 1}/{activeTask.workSteps.length}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: PALETTE.textDim, fontStyle: 'italic', padding: '8px 0' }}>
            Sin tarea activa. Pide a Arq que investigue, codee, o planee algo.
          </div>
        )}
      </ModalSection>

      {/* Ganado hoy */}
      <ModalSection title="GANADO HOY">
        <div style={{ display: 'flex', gap: 16, padding: '4px 0' }}>
          <span style={{ color: '#80c0ff' }}>📚 +{todayResources.knowledge}</span>
          <span style={{ color: '#c0a080' }}>🪨 +{todayResources.materials}</span>
          <span style={{ color: '#ffc040' }}>✨ +{todayResources.inspiration}</span>
          <span style={{ color: PALETTE.textDim }}>({completedToday.length} tareas)</span>
        </div>
      </ModalSection>

      {/* ═══ PROYECTOS ═══ */}

      {/* Proyecto activo */}
      {activeProject && (
        <ModalSection title="🏗️ CONSTRUYENDO">
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(240, 192, 64, 0.1)',
              border: '1px solid #f0c040',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12 }}>{activeProject.icon}</span>
              <span style={{ fontSize: 8, color: PALETTE.accent }}>{activeProject.name}</span>
            </div>
            {/* Barra de progreso */}
            <div
              style={{
                height: 8,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: `${(activeProject.turnsCompleted / activeProject.workTurns) * 100}%`,
                  height: '100%',
                  backgroundColor: '#f0c040',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: 6, color: PALETTE.textDim, display: 'flex', justifyContent: 'space-between' }}>
              <span>{activeProject.turnsCompleted}/{activeProject.workTurns} turnos</span>
              <span>📍 {LOCATIONS[activeProject.location]?.name || activeProject.location}</span>
            </div>
          </div>
        </ModalSection>
      )}

      {/* Proyectos disponibles */}
      {availableProjects.length > 0 && (
        <ModalSection title="PROYECTOS DISPONIBLES">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {availableProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: `2px solid ${project.canAfford ? '#50c878' : '#f0a040'}`,
                  borderRadius: '0 4px 4px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10 }}>{project.icon}</span>
                  <span style={{ fontSize: 7 }}>{project.name}</span>
                  {project.canAfford && (
                    <span style={{ fontSize: 6, color: '#50c878' }}>✅</span>
                  )}
                </div>
                <div style={{ fontSize: 6, color: PALETTE.textDim }}>
                  📚{project.cost.knowledge} 🪨{project.cost.materials} ✨{project.cost.inspiration}
                  {project.missingResources && (
                    <span style={{ marginLeft: 8, color: '#f0a040' }}>
                      (faltan: {project.missingResources.knowledge ? `📚${project.missingResources.knowledge} ` : ''}
                      {project.missingResources.materials ? `🪨${project.missingResources.materials} ` : ''}
                      {project.missingResources.inspiration ? `✨${project.missingResources.inspiration}` : ''})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ModalSection>
      )}

      {/* Proyectos bloqueados */}
      {lockedProjects.length > 0 && (
        <ModalSection title="🔒 BLOQUEADOS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lockedProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: '4px 8px',
                  fontSize: 6,
                  color: PALETTE.textDim,
                  opacity: 0.7,
                }}
              >
                {project.icon} {project.name} — {project.unlockRequirement}
              </div>
            ))}
          </div>
        </ModalSection>
      )}

      {/* Proyectos completados */}
      {completedProjects.length > 0 && (
        <ModalSection title="✅ COMPLETADOS">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {completedProjects.map((projectId) => {
              const project = PROJECT_CATALOG.find(p => p.id === projectId);
              return project ? (
                <span
                  key={projectId}
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    backgroundColor: 'rgba(80, 200, 120, 0.2)',
                    borderRadius: 4,
                  }}
                  title={project.name}
                >
                  {project.icon}
                </span>
              ) : null;
            })}
          </div>
        </ModalSection>
      )}

      {/* Historial de tareas */}
      <ModalSection title="ÚLTIMAS TAREAS">
        {taskHistory.length === 0 ? (
          <div style={{ color: PALETTE.textDim, fontStyle: 'italic' }}>
            Sin tareas completadas aún...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {taskHistory.slice(-3).reverse().map((task, i) => (
              <div
                key={task.id || i}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: `2px solid ${task.deliverable?.approved ? '#50c878' : '#f0a040'}`,
                  borderRadius: '0 4px 4px 0',
                  fontSize: 6,
                }}
              >
                <span style={{ color: PALETTE.textDim }}>
                  {TASK_TYPES[task.type]?.icon}
                </span>{' '}
                {task.title.slice(0, 30)}...
              </div>
            ))}
          </div>
        )}
      </ModalSection>
    </Modal>
  );
}

// GENESIS — Modal de Tareas
import { useState, useEffect } from 'react';
import Modal, { ModalSection, ModalItem } from './Modal';
import { PALETTE } from '../config/palette';
import { getTaskState, TASK_TYPES } from '../agents/taskSystem';

export default function TasksModal({ isOpen, onClose }) {
  const [taskState, setTaskState] = useState({ activeTask: null, resources: {}, taskHistory: [] });

  useEffect(() => {
    if (isOpen) {
      setTaskState(getTaskState());
    }
  }, [isOpen]);

  const { activeTask, resources, taskHistory } = taskState;
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

      {/* Historial */}
      <ModalSection title="ÚLTIMAS TAREAS COMPLETADAS">
        {taskHistory.length === 0 ? (
          <div style={{ color: PALETTE.textDim, fontStyle: 'italic' }}>
            Sin tareas completadas aún...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {taskHistory.slice(-5).reverse().map((task, i) => (
              <div
                key={task.id || i}
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: `2px solid ${task.deliverable?.approved ? '#50c878' : '#f0a040'}`,
                  borderRadius: '0 4px 4px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                    fontSize: 6,
                    color: PALETTE.textDim,
                  }}
                >
                  <span>
                    {TASK_TYPES[task.type]?.icon} {TASK_TYPES[task.type]?.name}
                  </span>
                  <span>{relativeTime(task.completedAt)}</span>
                </div>
                <div style={{ fontSize: 7 }}>{task.title}</div>
                {task.reward && (
                  <div style={{ fontSize: 6, marginTop: 4, color: PALETTE.textDim }}>
                    +📚{task.reward.knowledge} +🪨{task.reward.materials} +✨{task.reward.inspiration}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ModalSection>
    </Modal>
  );
}

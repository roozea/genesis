// GENESIS — Modal del Cerebro de Arq
import { useState, useEffect } from 'react';
import Modal, { ModalSection, ModalItem } from './Modal';
import { PALETTE } from '../config/palette';
import { getMemories, getMemoryCount, getCoreMemories } from '../agents/memory';
import { MOOD_EMOJI } from '../agents/prompts';

export default function BrainModal({ isOpen, onClose, currentMood }) {
  const [memories, setMemories] = useState([]);
  const [coreMemories, setCoreMemories] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Cargar datos
      setCount(getMemoryCount());
      setMemories(getMemories().slice(-10).reverse()); // Últimas 10
      setCoreMemories(getCoreMemories ? getCoreMemories() : []);
    }
  }, [isOpen]);

  // Formato de tiempo relativo
  const relativeTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  };

  // Color por tipo de memoria
  const typeColor = {
    action: '#50c878',
    observation: '#60a0ff',
    conversation: '#ff80a0',
    thought: '#a080ff',
    core: '#ffd700',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CEREBRO DE ARQ" icon="🧠">
      {/* Stats generales */}
      <ModalSection title="ESTADÍSTICAS">
        <ModalItem emoji="🧠" label="Memorias totales" value={count} color={PALETTE.accent} />
        <ModalItem
          emoji={MOOD_EMOJI[currentMood] || '🧐'}
          label="Mood actual"
          value={currentMood || 'desconocido'}
          color="#80c0ff"
        />
      </ModalSection>

      {/* Core memories */}
      {coreMemories.length > 0 && (
        <ModalSection title="MEMORIAS CORE (permanentes)">
          {coreMemories.map((mem, i) => (
            <div
              key={i}
              style={{
                padding: '6px 8px',
                marginBottom: 4,
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderLeft: '2px solid #ffd700',
                borderRadius: '0 4px 4px 0',
                fontSize: 7,
              }}
            >
              ⭐ {mem.content || mem}
            </div>
          ))}
        </ModalSection>
      )}

      {/* Últimas memorias */}
      <ModalSection title="ÚLTIMAS MEMORIAS">
        {memories.length === 0 ? (
          <div style={{ color: PALETTE.textDim, fontStyle: 'italic' }}>
            Sin memorias aún...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {memories.map((mem, i) => (
              <div
                key={mem.timestamp + i}
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: `2px solid ${typeColor[mem.type] || PALETTE.textDim}`,
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
                  <span style={{ color: typeColor[mem.type] || PALETTE.textDim }}>
                    [{mem.type?.toUpperCase() || 'MEM'}]
                  </span>
                  <span>{relativeTime(mem.timestamp)}</span>
                </div>
                <div style={{ fontSize: 7 }}>{mem.content}</div>
              </div>
            ))}
          </div>
        )}
      </ModalSection>
    </Modal>
  );
}

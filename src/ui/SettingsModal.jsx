// GENESIS — Modal de Configuración
import { useState } from 'react';
import Modal, { ModalSection, ModalItem } from './Modal';
import { PALETTE } from '../config/palette';
import { getLlmState } from '../config/llm';
import { clearAllMemories } from '../agents/memory';
import { setTimeSpeed } from '../world/timeSystem';

export default function SettingsModal({ isOpen, onClose, timeSpeed, onTimeSpeedChange }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const llmState = getLlmState();

  const handleClearMemories = () => {
    if (showConfirm) {
      clearAllMemories();
      setShowConfirm(false);
      onClose();
    } else {
      setShowConfirm(true);
    }
  };

  const speedOptions = [
    { value: 0.5, label: '0.5x Lento' },
    { value: 1, label: '1x Normal' },
    { value: 2, label: '2x Rápido' },
    { value: 5, label: '5x Turbo' },
  ];

  // Determinar el modo LLM actual
  const getLlmModeText = () => {
    if (llmState.ollamaAvailable && llmState.ollamaModel) {
      return `LOCAL (${llmState.ollamaModel})`;
    }
    if (llmState.apiKeyAvailable) {
      return 'API (Claude)';
    }
    return 'FALLBACK (Random)';
  };

  const getLlmModeColor = () => {
    if (llmState.ollamaAvailable && llmState.ollamaModel) return '#50c878';
    if (llmState.apiKeyAvailable) return '#60a0ff';
    return '#ff8040';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CONFIGURACIÓN" icon="⚙️">
      {/* Velocidad del tiempo */}
      <ModalSection title="VELOCIDAD DEL TIEMPO">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {speedOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTimeSpeed(opt.value);
                onTimeSpeedChange(opt.value);
              }}
              style={{
                padding: '6px 12px',
                fontSize: 7,
                fontFamily: '"Press Start 2P", monospace',
                backgroundColor: timeSpeed === opt.value ? PALETTE.accent : 'transparent',
                color: timeSpeed === opt.value ? '#000' : PALETTE.text,
                border: `1px solid ${timeSpeed === opt.value ? PALETTE.accent : '#404060'}`,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </ModalSection>

      {/* Modo LLM */}
      <ModalSection title="MODO DE IA">
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${getLlmModeColor()}`,
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12 }}>🤖</span>
            <span style={{ fontSize: 8, color: getLlmModeColor() }}>{getLlmModeText()}</span>
          </div>
          <div style={{ fontSize: 6, color: PALETTE.textDim }}>
            {llmState.ollamaAvailable
              ? 'Ollama detectado. Usando IA local para movimiento y chat.'
              : llmState.apiKeyAvailable
                ? 'Usando API de Anthropic. Configura Ollama para IA local.'
                : 'Sin IA disponible. Usando respuestas aleatorias.'}
          </div>
        </div>
        <div style={{ fontSize: 6, color: PALETTE.textDim, marginTop: 8, lineHeight: 1.6 }}>
          Prioridad: Ollama local → Haiku → Sonnet → Fallback
        </div>
      </ModalSection>

      {/* Limpiar memorias */}
      <ModalSection title="DATOS">
        {showConfirm ? (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(255, 64, 64, 0.1)',
              border: '1px solid #ff4040',
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 7, marginBottom: 10, color: '#ff8080' }}>
              ¿Borrar TODAS las memorias de Arq? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleClearMemories}
                style={{
                  padding: '6px 12px',
                  fontSize: 7,
                  fontFamily: '"Press Start 2P", monospace',
                  backgroundColor: '#ff4040',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Sí, borrar
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: 7,
                  fontFamily: '"Press Start 2P", monospace',
                  backgroundColor: 'transparent',
                  color: PALETTE.textDim,
                  border: '1px solid #404060',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleClearMemories}
            style={{
              padding: '8px 16px',
              fontSize: 7,
              fontFamily: '"Press Start 2P", monospace',
              backgroundColor: 'transparent',
              color: '#ff8080',
              border: '1px solid #ff404080',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🗑️ Limpiar memorias de Arq
          </button>
        )}
      </ModalSection>

      {/* Versión */}
      <ModalSection title="INFORMACIÓN">
        <ModalItem emoji="🎮" label="Versión" value="Genesis Phase 0" color={PALETTE.accent} />
        <ModalItem emoji="🏗️" label="Estado" value="En desarrollo" color="#ffc040" />
        <div style={{ fontSize: 6, color: PALETTE.textDim, marginTop: 8 }}>
          Un mundo pixel-art con IA autónoma.
        </div>
      </ModalSection>
    </Modal>
  );
}

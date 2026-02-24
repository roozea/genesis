// GENESIS — Modal de Configuración
import { useState, useEffect } from 'react';
import Modal, { ModalSection, ModalItem } from './Modal';
import { PALETTE } from '../config/palette';
import { getLlmState, getApiKey, saveApiKey, clearApiKey, testApiConnection } from '../config/llm';
import { clearAllMemories } from '../agents/memory';
import { setTimeSpeed } from '../world/timeSystem';

export default function SettingsModal({ isOpen, onClose, timeSpeed, onTimeSpeedChange }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [llmState, setLlmState] = useState(getLlmState());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySource, setApiKeySource] = useState(null);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');

  // Cargar estado inicial de API key
  useEffect(() => {
    if (isOpen) {
      const { key, source } = getApiKey();
      setApiKeySource(source);
      setApiKeyInput(key ? '••••••••••••' + key.slice(-4) : '');
      setLlmState(getLlmState());
      setTestStatus(null);
      setTestMessage('');
    }
  }, [isOpen]);

  // Guardar API key
  const handleSaveApiKey = () => {
    if (apiKeyInput && !apiKeyInput.startsWith('••••')) {
      saveApiKey(apiKeyInput);
      setApiKeySource('localStorage');
      setApiKeyInput('••••••••••••' + apiKeyInput.slice(-4));
      setLlmState(getLlmState());
      setTestStatus(null);
    }
  };

  // Limpiar API key de localStorage
  const handleClearApiKey = () => {
    clearApiKey();
    const { key, source } = getApiKey();
    setApiKeySource(source);
    setApiKeyInput(key ? '••••••••••••' + key.slice(-4) : '');
    setLlmState(getLlmState());
    setTestStatus(null);
  };

  // Probar conexión
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Conectando...');

    const result = await testApiConnection();

    if (result.success) {
      setTestStatus('success');
      setTestMessage(`✓ ${result.message}`);
      setLlmState(getLlmState());
    } else {
      setTestStatus('error');
      setTestMessage(`✗ ${result.message}`);
    }
  };

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

      {/* Configuración de API Key */}
      <ModalSection title="API DE CLAUDE">
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 6, color: PALETTE.textDim, marginBottom: 6 }}>
            API Key de Anthropic {apiKeySource && (
              <span style={{ color: apiKeySource === 'localStorage' ? '#50c878' : '#60a0ff' }}>
                ({apiKeySource === 'localStorage' ? 'guardada localmente' : 'desde .env'})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setTestStatus(null);
              }}
              placeholder="sk-ant-api03-..."
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 7,
                fontFamily: '"Press Start 2P", monospace',
                backgroundColor: PALETTE.bg,
                color: PALETTE.text,
                border: `1px solid ${PALETTE.panelBorder}`,
                borderRadius: 4,
                outline: 'none',
              }}
              onFocus={(e) => {
                if (e.target.value.startsWith('••••')) {
                  setApiKeyInput('');
                }
              }}
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput || apiKeyInput.startsWith('••••')}
              style={{
                padding: '8px 12px',
                fontSize: 7,
                fontFamily: '"Press Start 2P", monospace',
                backgroundColor: (!apiKeyInput || apiKeyInput.startsWith('••••')) ? '#333' : PALETTE.accentGreen,
                color: (!apiKeyInput || apiKeyInput.startsWith('••••')) ? '#666' : '#000',
                border: 'none',
                borderRadius: 4,
                cursor: (!apiKeyInput || apiKeyInput.startsWith('••••')) ? 'not-allowed' : 'pointer',
              }}
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleTestConnection}
            disabled={!llmState.apiKeyAvailable || testStatus === 'testing'}
            style={{
              padding: '6px 12px',
              fontSize: 7,
              fontFamily: '"Press Start 2P", monospace',
              backgroundColor: testStatus === 'testing' ? '#444' : '#2060a0',
              color: llmState.apiKeyAvailable ? '#fff' : '#666',
              border: 'none',
              borderRadius: 4,
              cursor: (!llmState.apiKeyAvailable || testStatus === 'testing') ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {testStatus === 'testing' ? '⏳' : '🔌'} Probar conexión
          </button>

          {apiKeySource === 'localStorage' && (
            <button
              onClick={handleClearApiKey}
              style={{
                padding: '6px 12px',
                fontSize: 7,
                fontFamily: '"Press Start 2P", monospace',
                backgroundColor: 'transparent',
                color: '#ff8080',
                border: '1px solid #ff404080',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              🗑️ Eliminar
            </button>
          )}
        </div>

        {/* Estado del test */}
        {testStatus && (
          <div
            style={{
              marginTop: 10,
              padding: '8px 12px',
              fontSize: 7,
              borderRadius: 4,
              backgroundColor:
                testStatus === 'success' ? 'rgba(80, 200, 120, 0.15)' :
                testStatus === 'error' ? 'rgba(255, 64, 64, 0.15)' :
                'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${
                testStatus === 'success' ? '#50c878' :
                testStatus === 'error' ? '#ff4040' :
                '#404060'
              }`,
              color:
                testStatus === 'success' ? '#50c878' :
                testStatus === 'error' ? '#ff8080' :
                PALETTE.textDim,
            }}
          >
            {testMessage}
          </div>
        )}

        {/* Indicador online */}
        {llmState.apiOnline && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 6,
              color: '#50c878',
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#50c878',
              boxShadow: '0 0 6px #50c878',
              animation: 'pulse 2s infinite',
            }} />
            API Online
          </div>
        )}
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

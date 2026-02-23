// GENESIS — Panel de conversación con Arq (UX mejorada)
import { useState, useRef, useEffect, useCallback } from 'react';
import { PALETTE } from '../config/palette';
import WelcomeScreen from './WelcomeScreen';

// Constantes de estilo
const STYLES = {
  userBg: '#2a2a4a',
  userBorder: '#f0c040',
  arqBg: '#1a1a3a',
  arqBorder: '#50c878',
  deliverableBg: '#12122c',
  deliverableBorder: '#252555',
  deliverableHeaderBg: '#1a1a4a',
};

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  agentStatus,
  workStep,        // { text: "Investigando...", current: 2, total: 3 } o null
  onApproveTask,   // Callback para aprobar
  onRejectTask,    // Callback para rechazar
}) {
  const [input, setInput] = useState('');
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Detectar si el usuario scrolleó manualmente hacia arriba
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldAutoScroll(isAtBottom);
  }, []);

  // Auto-scroll inteligente
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      setShouldAutoScroll(true); // Volver a auto-scroll al enviar
    }
  };

  // Indicador de estado
  const getStatusInfo = () => {
    if (agentStatus === 'working') {
      return { text: 'trabajando', color: PALETTE.accent, icon: '⚙️' };
    }
    if (agentStatus === 'thinking') {
      return { text: 'pensando', color: PALETTE.accentRed, icon: '🧠' };
    }
    return { text: 'en línea', color: PALETTE.accentGreen, icon: '🟢' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: PALETTE.chatBg,
        border: `1px solid ${PALETTE.panelBorder}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Header del chat */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>🏗️</span>
          <span style={{ color: PALETTE.text }}>Arq</span>
          <span style={{ color: PALETTE.textDim }}>—</span>
          <span
            style={{
              color: statusInfo.color,
              animation: agentStatus !== 'online' ? 'pulse 1s infinite' : 'none',
            }}
          >
            {statusInfo.text}
          </span>
        </div>
        <span style={{ fontSize: 12 }}>{statusInfo.icon}</span>
      </div>

      {/* Área de mensajes */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          padding: 16,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          messages.map((msg, index) => (
            <Message
              key={index}
              message={msg}
              onApprove={onApproveTask}
              onReject={onRejectTask}
            />
          ))
        )}

        {/* Indicador de typing/working */}
        {(isLoading || agentStatus === 'working') && (
          <TypingIndicator
            isWorking={agentStatus === 'working'}
            workStep={workStep}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          padding: 12,
          gap: 8,
          borderTop: `1px solid ${PALETTE.panelBorder}`,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: PALETTE.panel,
            border: `1px solid ${PALETTE.panelBorder}`,
            borderRadius: 4,
            color: PALETTE.text,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 9,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: '10px 16px',
            backgroundColor: isLoading ? PALETTE.panelBorder : PALETTE.accent,
            border: 'none',
            borderRadius: 4,
            color: PALETTE.bg,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 10,
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: !input.trim() ? 0.5 : 1,
            transition: 'opacity 0.2s, background-color 0.2s',
          }}
        >
          {isLoading ? '...' : '▶'}
        </button>
      </form>
    </div>
  );
}

// Componente de mensaje
function Message({ message, onApprove, onReject }) {
  const isUser = message.role === 'user';
  const isDeliverable = message.type === 'deliverable';

  // Timestamp
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('es', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  if (isDeliverable) {
    return (
      <DeliverableCard
        deliverable={message.deliverable}
        timestamp={timestamp}
        onApprove={onApprove}
        onReject={onReject}
      />
    );
  }

  if (isUser) {
    return <UserMessage content={message.content} timestamp={timestamp} />;
  }

  return <ArqMessage content={message.content} timestamp={timestamp} />;
}

// Mensaje del usuario (Rodrigo)
function UserMessage({ content, timestamp }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'messageIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '80%',
          padding: '8px 10px',
          paddingTop: timestamp ? 16 : 8,
          backgroundColor: STYLES.userBg,
          borderLeft: `2px solid ${STYLES.userBorder}`,
          borderRadius: '8px 8px 2px 8px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 9,
          lineHeight: 1.6,
          color: PALETTE.text,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {timestamp && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              fontSize: 6,
              color: '#555',
            }}
          >
            {timestamp}
          </span>
        )}
        {content}
      </div>
    </div>
  );
}

// Mensaje de Arq
function ArqMessage({ content, timestamp }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        animation: 'messageIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '80%',
          padding: '8px 10px',
          paddingTop: 18,
          backgroundColor: STYLES.arqBg,
          borderLeft: `2px solid ${STYLES.arqBorder}`,
          borderRadius: '2px 8px 8px 8px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 9,
          lineHeight: 1.6,
          color: PALETTE.text,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {/* Header con nombre y timestamp */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 8,
            right: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 7, color: STYLES.arqBorder }}>
            🏗️ Arq
          </span>
          {timestamp && (
            <span style={{ fontSize: 6, color: '#555' }}>{timestamp}</span>
          )}
        </div>
        {content}
      </div>
    </div>
  );
}

// Card de deliverable (resultado de trabajo)
function DeliverableCard({ deliverable, timestamp, onApprove, onReject }) {
  const { type, title, content, stats, reward, status } = deliverable;

  const typeConfig = {
    research: { icon: '🔍', name: 'INVESTIGACIÓN' },
    code: { icon: '💻', name: 'CÓDIGO' },
    plan: { icon: '📋', name: 'PLANIFICACIÓN' },
    review: { icon: '🔎', name: 'REVISIÓN' },
  };

  const config = typeConfig[type] || typeConfig.research;
  const isPending = status === 'pending' || status === 'review';

  return (
    <div
      style={{
        animation: 'messageIn 0.3s ease-out',
        margin: '8px 0',
      }}
    >
      <div
        style={{
          backgroundColor: STYLES.deliverableBg,
          border: `1px solid ${STYLES.deliverableBorder}`,
          borderRadius: 8,
          overflow: 'hidden',
          fontFamily: '"Press Start 2P", monospace',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: STYLES.deliverableHeaderBg,
            borderBottom: `1px solid ${STYLES.deliverableBorder}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>{config.icon}</span>
            <span style={{ fontSize: 8, color: PALETTE.accent }}>
              {config.name}
            </span>
          </div>
          {timestamp && (
            <span style={{ fontSize: 6, color: '#555' }}>{timestamp}</span>
          )}
        </div>

        {/* Título */}
        <div
          style={{
            padding: '8px 12px',
            fontSize: 9,
            color: PALETTE.text,
            borderBottom: `1px solid ${STYLES.deliverableBorder}`,
          }}
        >
          {title}
        </div>

        {/* Contenido */}
        <div
          style={{
            padding: 12,
            fontSize: 8,
            lineHeight: 1.8,
            color: PALETTE.text,
            maxHeight: 300,
            overflowY: 'auto',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </div>

        {/* Footer con stats */}
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: STYLES.deliverableHeaderBg,
            borderTop: `1px solid ${STYLES.deliverableBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {/* Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 7,
              color: PALETTE.textDim,
            }}
          >
            {stats?.time && <span>⏱️ {stats.time}s</span>}
            {reward && (
              <>
                <span style={{ color: '#80c0ff' }}>📚+{reward.knowledge}</span>
                <span style={{ color: '#c0a080' }}>🪨+{reward.materials}</span>
                <span style={{ color: '#ffc040' }}>✨+{reward.inspiration}</span>
              </>
            )}
          </div>

          {/* Botones de acción (solo si pendiente) */}
          {isPending && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onApprove}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#2a4a2a',
                  border: '1px solid #50c878',
                  borderRadius: 4,
                  color: '#50c878',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 7,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#50c878';
                  e.target.style.color = '#1a1a3a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2a4a2a';
                  e.target.style.color = '#50c878';
                }}
              >
                👍 Aprobar
              </button>
              <button
                onClick={onReject}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#3a2a2a',
                  border: '1px solid #c87850',
                  borderRadius: 4,
                  color: '#c87850',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 7,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#c87850';
                  e.target.style.color = '#1a1a3a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3a2a2a';
                  e.target.style.color = '#c87850';
                }}
              >
                🔄 Mejorar
              </button>
            </div>
          )}

          {/* Estado aprobado/rechazado */}
          {!isPending && (
            <span
              style={{
                fontSize: 7,
                color: status === 'approved' ? '#50c878' : '#c87850',
              }}
            >
              {status === 'approved' ? '✅ Aprobado' : '🔄 Mejorando...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Indicador de typing/working
function TypingIndicator({ isWorking, workStep }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 8,
        color: PALETTE.textDim,
        animation: 'messageIn 0.3s ease-out',
      }}
    >
      <span style={{ color: STYLES.arqBorder }}>🏗️</span>
      {isWorking ? (
        <span>
          Arq está trabajando{dots}
          {workStep && (
            <span style={{ marginLeft: 8, color: PALETTE.accent }}>
              ⚙️ {workStep.text} ({workStep.current}/{workStep.total})
            </span>
          )}
        </span>
      ) : (
        <span>Arq está escribiendo{dots}</span>
      )}
    </div>
  );
}

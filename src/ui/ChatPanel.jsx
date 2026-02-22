// GENESIS — Panel de conversación con Arq
import { useState, useRef, useEffect } from 'react';
import { PALETTE } from '../config/palette';
import WelcomeScreen from './WelcomeScreen';

export default function ChatPanel({ messages, onSendMessage, isLoading, agentStatus }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

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
          gap: 10,
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 10,
        }}
      >
        <span style={{ fontSize: 14 }}>🏗️</span>
        <span style={{ color: PALETTE.text }}>Arq</span>
        <span style={{ color: PALETTE.textDim }}>-</span>
        <span
          style={{
            color: agentStatus === 'thinking' ? PALETTE.accentRed : PALETTE.accentGreen,
            animation: agentStatus === 'thinking' ? 'pulse 1s infinite' : 'none',
          }}
        >
          {agentStatus === 'thinking' ? 'pensando...' : 'en línea'}
        </span>
      </div>

      {/* Área de mensajes */}
      <div
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
            <Message key={index} message={msg} />
          ))
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

function Message({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'messageIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          backgroundColor: isUser ? PALETTE.accent : PALETTE.panel,
          color: isUser ? PALETTE.bg : PALETTE.text,
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 9,
          lineHeight: 1.6,
          boxShadow: `0 2px 8px rgba(0,0,0,0.2)`,
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// GENESIS — Log de actividad bajo el mapa (llena todo el espacio disponible)
import { useRef, useEffect } from 'react';
import { PALETTE } from '../config/palette';

// Colores por tipo de evento
const TYPE_COLORS = {
  local: '#50c878',      // Verde para local
  haiku: '#60a0ff',      // Azul para Haiku
  sonnet: '#a080ff',     // Púrpura para Sonnet
  fallback: '#f0a040',   // Naranja para fallback
  bfs: '#50886a',        // Verde dim para BFS
  chat: '#60d0ff',       // Cyan para chat
  explore: '#80ff80',    // Verde claro para exploración
  system: '#5070a0',     // Azul dim para sistema
  memory: '#9070c0',     // Púrpura para memorias
  task: '#f0c040',       // Dorado para tareas
  work: '#50b0b0',       // Cyan para trabajo
  night: '#6080c0',      // Azul noche
  deep: '#a080ff',       // Púrpura profundo
  medium: '#ffd700',     // Dorado medio
  micro: '#808080',      // Gris micro
};

// Etiquetas por tipo
const TYPE_LABELS = {
  local: 'LOCAL',
  haiku: 'HAIKU',
  sonnet: 'SONNET',
  fallback: 'FALLBACK',
  bfs: 'BFS',
  chat: 'CHAT',
  explore: 'EXPLORE',
  system: 'SYS',
  memory: 'MEM',
  task: 'TASK',
  work: 'WORK',
  night: 'NIGHT',
  deep: 'DEEP',
  medium: 'MED',
  micro: 'MICRO',
};

export default function ActivityLog({ logs }) {
  const containerRef = useRef(null);

  // Auto-scroll al fondo cuando hay nuevos logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: PALETTE.panel,
        border: `1px solid ${PALETTE.panelBorder}`,
        borderRadius: 4,
        overflow: 'hidden',
        minHeight: 0, // Importante para que flex funcione bien
      }}
    >
      {/* Header del log */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 7,
          color: PALETTE.textDim,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span>📋</span>
        <span>ACTIVITY LOG</span>
      </div>

      {/* Área de logs con scroll */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '8px 10px',
          overflowY: 'auto',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 7,
          minHeight: 0,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: PALETTE.textDim, fontStyle: 'italic', padding: '8px 0' }}>
            Sin actividad reciente...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.slice(-50).map((log, index) => (
              <LogEntry key={log.timestamp + index} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogEntry({ log }) {
  const time = new Date(log.timestamp).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const color = TYPE_COLORS[log.type] || PALETTE.text;
  const label = TYPE_LABELS[log.type] || log.type?.toUpperCase() || 'LOG';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '3px 0',
        lineHeight: 1.6,
        animation: 'messageIn 0.2s ease-out',
      }}
    >
      {/* Timestamp */}
      <span
        style={{
          color: '#555',
          flexShrink: 0,
          fontSize: 6,
        }}
      >
        {time}
      </span>

      {/* Tag de tipo */}
      <span
        style={{
          color,
          flexShrink: 0,
          minWidth: 52,
          textAlign: 'center',
          fontSize: 6,
        }}
      >
        [{label}]
      </span>

      {/* Emoji */}
      {log.emoji && (
        <span style={{ flexShrink: 0, fontSize: 8 }}>{log.emoji}</span>
      )}

      {/* Texto del evento */}
      <span
        style={{
          color: '#d0c090',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {log.text}
      </span>
    </div>
  );
}

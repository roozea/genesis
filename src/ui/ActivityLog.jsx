// GENESIS — Log de actividad bajo el mapa
import { PALETTE } from '../config/palette';

export default function ActivityLog({ logs }) {
  return (
    <div
      style={{
        backgroundColor: PALETTE.panel,
        border: `1px solid ${PALETTE.panelBorder}`,
        borderRadius: 4,
        padding: '8px 12px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 8,
        maxHeight: 100,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          color: PALETTE.textDim,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        📋 LOG DE ACTIVIDAD
      </div>

      {logs.length === 0 ? (
        <div style={{ color: PALETTE.textDim, fontStyle: 'italic' }}>
          Sin actividad reciente...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {logs.slice(-8).map((log, index) => (
            <LogEntry key={index} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogEntry({ log }) {
  const time = new Date(log.timestamp).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Colores según fuente de IA
  const sourceColors = {
    local: PALETTE.accentGreen,     // Verde para local
    haiku: '#60a0ff',               // Azul para Haiku
    sonnet: '#a080ff',              // Púrpura para Sonnet
    fallback: PALETTE.accent,       // Dorado para fallback
    bfs: PALETTE.textDim,           // Gris para BFS
    chat: PALETTE.accent,           // Dorado para chat
    move: PALETTE.text,             // Normal para movimiento
    system: PALETTE.textDim,        // Gris para sistema
  };

  // Etiquetas según tipo
  const typeLabels = {
    local: 'LOCAL',
    haiku: 'HAIKU',
    sonnet: 'SONNET',
    fallback: 'FALLBACK',
    bfs: 'BFS',
    chat: 'CHAT',
    move: 'MOVE',
    system: 'SYS',
  };

  const color = sourceColors[log.type] || PALETTE.text;
  const label = typeLabels[log.type] || log.type?.toUpperCase() || 'LOG';

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        color: PALETTE.text,
        animation: 'messageIn 0.2s ease-out',
      }}
    >
      <span style={{ color: PALETTE.textDim }}>[{time}]</span>
      <span
        style={{
          color,
          minWidth: 60,
          textAlign: 'center',
        }}
      >
        [{label}]
      </span>
      <span>{log.emoji || ''}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {log.text}
      </span>
    </div>
  );
}

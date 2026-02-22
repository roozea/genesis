// GENESIS — Sprite visual del agente Arq (CSS puro, NO emojis)
import { PALETTE } from '../config/palette';

export default function AgentSprite({ row, col, direction = 'right', state = 'idle', thought, tileSize = 24 }) {
  // Posición del sprite (centrado en el tile)
  const left = col * tileSize + (tileSize - 16) / 2;
  const top = row * tileSize - 8; // Offset para que los pies estén en el tile

  const isWalking = state === 'walking';
  const isTalking = state === 'talking';
  const eyeOffset = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 16,
        height: 28,
        transition: 'left 0.45s ease-in-out, top 0.45s ease-in-out',
        zIndex: 100 + row, // Para que los agentes más abajo estén encima
        pointerEvents: 'none',
      }}
    >
      {/* Thought bubble */}
      {thought && <ThoughtBubble text={thought} />}

      {/* Casco amarillo */}
      <div
        style={{
          position: 'absolute',
          width: 14,
          height: 5,
          backgroundColor: '#f0c040',
          borderRadius: '4px 4px 0 0',
          left: 1,
          top: 0,
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.2)',
        }}
      >
        {/* Banda naranja del casco */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: 2,
            backgroundColor: '#e08020',
            bottom: 0,
            borderRadius: '0 0 2px 2px',
          }}
        />
      </div>

      {/* Cabeza */}
      <div
        style={{
          position: 'absolute',
          width: 12,
          height: 9,
          backgroundColor: '#e8c090',
          borderRadius: 3,
          left: 2,
          top: 5,
          boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.15)',
        }}
      >
        {/* Ojo izquierdo */}
        <div
          style={{
            position: 'absolute',
            width: 2,
            height: 2,
            backgroundColor: '#202020',
            borderRadius: '50%',
            left: 2 + eyeOffset,
            top: 3,
          }}
        />
        {/* Ojo derecho */}
        <div
          style={{
            position: 'absolute',
            width: 2,
            height: 2,
            backgroundColor: '#202020',
            borderRadius: '50%',
            right: 2 - eyeOffset,
            top: 3,
          }}
        />
        {/* Boca */}
        <div
          style={{
            position: 'absolute',
            width: isTalking ? 3 : 4,
            height: isTalking ? 3 : 2,
            backgroundColor: '#a06050',
            borderRadius: isTalking ? '50%' : 0,
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 1,
            animation: isTalking ? 'talking 0.3s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Cuerpo / Camisa */}
      <div
        style={{
          position: 'absolute',
          width: 14,
          height: 8,
          backgroundColor: '#4080c0',
          borderRadius: 2,
          left: 1,
          top: 14,
          boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.1)',
        }}
      />

      {/* Piernas */}
      <div style={{ position: 'absolute', top: 22, left: 2, display: 'flex', gap: 2 }}>
        {/* Pierna izquierda */}
        <div
          style={{
            width: 5,
            height: 5,
            backgroundColor: '#404050',
            borderRadius: '1px 1px 2px 2px',
            animation: isWalking ? 'walkLeft 0.3s ease-in-out infinite' : 'none',
          }}
        />
        {/* Pierna derecha */}
        <div
          style={{
            width: 5,
            height: 5,
            backgroundColor: '#404050',
            borderRadius: '1px 1px 2px 2px',
            animation: isWalking ? 'walkRight 0.3s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Sombra */}
      <div
        style={{
          position: 'absolute',
          width: 14,
          height: 3,
          backgroundColor: 'rgba(0,0,0,0.18)',
          borderRadius: '50%',
          left: 1,
          bottom: -1,
        }}
      />
    </div>
  );
}

// Componente del thought bubble
function ThoughtBubble({ text }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '105%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(16, 16, 42, 0.95)',
        border: `1px solid ${PALETTE.panelBorder}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 8,
        color: PALETTE.text,
        whiteSpace: 'nowrap',
        maxWidth: 180,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        animation: 'bubbleIn 0.3s ease-out',
        zIndex: 1000,
        boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
      }}
    >
      {text}
      {/* Flecha triangular apuntando abajo */}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${PALETTE.panelBorder}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid rgba(16, 16, 42, 0.95)',
        }}
      />
    </div>
  );
}

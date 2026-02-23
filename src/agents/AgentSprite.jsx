// GENESIS — Sprite visual del agente Arq (CSS puro, NO emojis)
// Estados: idle, walking, talking, working, building, delivering, sleeping, celebrating, scratching
import { useState, useEffect } from 'react';
import { PALETTE } from '../config/palette';

export default function AgentSprite({
  row,
  col,
  direction = 'right',
  state = 'idle',
  thought,
  thoughtType,
  tileSize = 24,
  workProgress = 0,        // 0-100 para barra de progreso
  floatingRewards = null,  // { knowledge, materials, inspiration } para mostrar al aprobar
}) {
  // Posición del sprite (centrado en el tile)
  const left = col * tileSize + (tileSize - 16) / 2;
  const top = row * tileSize - 8;

  const isWalking = state === 'walking';
  const isTalking = state === 'talking';
  const isWorking = state === 'working';
  const isBuilding = state === 'building';
  const isDelivering = state === 'delivering';
  const isSleeping = state === 'sleeping';
  const isCelebrating = state === 'celebrating';
  const isScratching = state === 'scratching';
  const eyeOffset = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

  // Estado para partículas
  const [particles, setParticles] = useState([]);
  const [sparkleTimer, setSparkleTimer] = useState(0);

  // Generar partículas según estado
  useEffect(() => {
    if (isWorking) {
      // Sparkles cada 3 segundos
      const interval = setInterval(() => {
        const newParticle = {
          id: Date.now(),
          type: 'sparkle',
          x: Math.random() * 10 + 3,
          delay: 0,
        };
        setParticles(prev => [...prev.slice(-5), newParticle]);
      }, 3000);
      return () => clearInterval(interval);
    }

    if (isBuilding) {
      // Dust cada 2 segundos
      const interval = setInterval(() => {
        const newParticles = [0, 1, 2].map((i) => ({
          id: Date.now() + i,
          type: 'dust',
          x: Math.random() * 14,
          delay: i * 100,
        }));
        setParticles(prev => [...prev.slice(-8), ...newParticles]);
      }, 2000);
      return () => clearInterval(interval);
    }

    if (isDelivering) {
      // Confetti burst
      const confettiColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        type: 'confetti',
        x: 8,
        color: confettiColors[i % confettiColors.length],
        angle: (i / 8) * 360,
        delay: i * 50,
      }));
      setParticles(newParticles);
      // Limpiar después de animación
      setTimeout(() => setParticles([]), 1500);
    }

    if (isCelebrating) {
      // Big confetti celebration!
      const confettiColors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#ff69b4'];
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        type: 'confetti',
        x: 8,
        color: confettiColors[i % confettiColors.length],
        angle: (i / 12) * 360,
        delay: i * 40,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 2000);
    }

    // Limpiar partículas cuando cambia el estado
    return () => setParticles([]);
  }, [isWorking, isBuilding, isDelivering, isCelebrating]);

  // Limpiar partículas viejas
  useEffect(() => {
    const cleanup = setInterval(() => {
      setParticles(prev => prev.filter(p => Date.now() - p.id < 2000));
    }, 500);
    return () => clearInterval(cleanup);
  }, []);

  // Animación del cuerpo según estado
  const getBodyAnimation = () => {
    if (isWorking) return 'workingBounce 1s ease-in-out infinite';
    if (isBuilding) return 'hammerSwing 0.8s ease-in-out infinite';
    if (isDelivering) return 'deliverPing 0.3s ease-out';
    if (isSleeping) return 'sleepingBreath 3s ease-in-out infinite';
    if (isCelebrating) return 'celebrateJump 0.5s ease-out 3';
    if (isScratching) return 'scratchHead 0.4s ease-in-out 2';
    return 'none';
  };

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 16,
        height: 28,
        transition: 'left 0.45s ease-in-out, top 0.45s ease-in-out',
        zIndex: 100 + row,
        pointerEvents: 'none',
      }}
    >
      {/* Barra de progreso (working/building) */}
      {(isWorking || isBuilding) && workProgress > 0 && (
        <ProgressBar progress={workProgress} />
      )}

      {/* Thought bubble */}
      {thought && <ThoughtBubble text={thought} type={thoughtType} />}

      {/* Partículas */}
      {particles.map(p => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Recursos flotantes al aprobar */}
      {floatingRewards && <FloatingRewards rewards={floatingRewards} />}

      {/* ZZZ para sleeping */}
      {isSleeping && <SleepingZzz />}

      {/* Contenedor del sprite con animación */}
      <div
        style={{
          position: 'relative',
          animation: getBodyAnimation(),
        }}
      >
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
          {/* Ojos - cerrados si duerme */}
          {isSleeping ? (
            <>
              <div style={{
                position: 'absolute', width: 3, height: 1,
                backgroundColor: '#202020', left: 2, top: 4,
              }} />
              <div style={{
                position: 'absolute', width: 3, height: 1,
                backgroundColor: '#202020', right: 2, top: 4,
              }} />
            </>
          ) : (
            <>
              <div style={{
                position: 'absolute', width: 2, height: 2,
                backgroundColor: '#202020', borderRadius: '50%',
                left: 2 + eyeOffset, top: 3,
              }} />
              <div style={{
                position: 'absolute', width: 2, height: 2,
                backgroundColor: '#202020', borderRadius: '50%',
                right: 2 - eyeOffset, top: 3,
              }} />
            </>
          )}
          {/* Boca */}
          <div
            style={{
              position: 'absolute',
              width: isTalking ? 3 : isSleeping ? 2 : 4,
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
        >
          {/* Brazo con martillo (building) */}
          {isBuilding && (
            <div
              style={{
                position: 'absolute',
                width: 3,
                height: 6,
                backgroundColor: '#e8c090',
                right: -2,
                top: 0,
                borderRadius: 1,
                transformOrigin: 'top center',
                animation: 'hammerArm 0.8s ease-in-out infinite',
              }}
            >
              {/* Martillo */}
              <div style={{
                position: 'absolute',
                width: 4,
                height: 3,
                backgroundColor: '#808080',
                bottom: -2,
                left: -1,
                borderRadius: 1,
              }} />
            </div>
          )}
        </div>

        {/* Piernas */}
        <div style={{ position: 'absolute', top: 22, left: 2, display: 'flex', gap: 2 }}>
          <div
            style={{
              width: 5,
              height: 5,
              backgroundColor: '#404050',
              borderRadius: '1px 1px 2px 2px',
              animation: isWalking ? 'walkLeft 0.3s ease-in-out infinite' : 'none',
            }}
          />
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
    </div>
  );
}

// Barra de progreso sobre el sprite
function ProgressBar({ progress }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '115%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 20,
        height: 3,
        backgroundColor: '#252530',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #404050',
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#f0c040',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 4px rgba(240, 192, 64, 0.5)',
        }}
      />
    </div>
  );
}

// Partículas (sparkle, dust, confetti)
function Particle({ type, x, color, angle, delay }) {
  if (type === 'sparkle') {
    return (
      <div
        style={{
          position: 'absolute',
          width: 2,
          height: 2,
          backgroundColor: '#ffe066',
          borderRadius: '50%',
          left: x,
          top: -5,
          animation: 'sparkleFloat 1.5s ease-out forwards',
          animationDelay: `${delay}ms`,
          boxShadow: '0 0 3px #ffe066',
        }}
      />
    );
  }

  if (type === 'dust') {
    return (
      <div
        style={{
          position: 'absolute',
          width: 2,
          height: 2,
          backgroundColor: '#a08060',
          borderRadius: '50%',
          left: x,
          bottom: 2,
          animation: 'dustFloat 1s ease-out forwards',
          animationDelay: `${delay}ms`,
          opacity: 0.7,
        }}
      />
    );
  }

  if (type === 'confetti') {
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * 20;
    const ty = Math.sin(rad) * -15 - 10;

    return (
      <div
        style={{
          position: 'absolute',
          width: 3,
          height: 3,
          backgroundColor: color,
          left: 8,
          top: 0,
          animation: 'confettiBurst 1s ease-out forwards',
          animationDelay: `${delay}ms`,
          '--x': `${tx}px`,
          '--y': `${ty}px`,
          borderRadius: Math.random() > 0.5 ? '50%' : 0,
        }}
      />
    );
  }

  return null;
}

// Recursos flotantes al aprobar
function FloatingRewards({ rewards }) {
  const items = [
    { emoji: '📚', value: rewards.knowledge, color: '#80c0ff', delay: 0 },
    { emoji: '🪨', value: rewards.materials, color: '#c0a080', delay: 200 },
    { emoji: '✨', value: rewards.inspiration, color: '#ffc040', delay: 400 },
  ].filter(r => r.value > 0);

  return (
    <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)' }}>
      {items.map((item, i) => (
        <div
          key={item.emoji}
          style={{
            position: 'absolute',
            left: (i - 1) * 25,
            animation: 'rewardFloat 2s ease-out forwards',
            animationDelay: `${item.delay}ms`,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            color: item.color,
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px rgba(0,0,0,0.5)',
          }}
        >
          +{item.emoji}{item.value}
        </div>
      ))}
    </div>
  );
}

// ZZZ flotando para sleeping
function SleepingZzz() {
  return (
    <div
      style={{
        position: 'absolute',
        top: -15,
        right: -5,
        fontSize: 10,
        animation: 'zzzFloat 2s ease-in-out infinite',
      }}
    >
      💤
    </div>
  );
}

// Componente del thought bubble
function ThoughtBubble({ text, type }) {
  const isDeep = type === 'deep';
  const isMedium = type === 'medium';
  const isNight = type === 'night';
  const isWork = type === 'work';
  const isSpecial = isDeep || isMedium || isNight || isWork;

  const borderColor = isDeep ? '#a080ff'
    : isMedium ? '#ffd700'
    : isNight ? '#4060a0'
    : isWork ? '#f0c040'
    : PALETTE.panelBorder;

  const glowAnimation = isDeep ? 'purpleGlow 2s ease-in-out infinite'
    : isMedium ? 'goldenGlow 2s ease-in-out infinite'
    : isNight ? 'nightGlow 3s ease-in-out infinite'
    : isWork ? 'workGlow 1.5s ease-in-out infinite'
    : 'none';

  const entryAnimation = isDeep ? 'deepBubbleIn 0.5s ease-out'
    : isSpecial ? 'bubbleIn 0.4s ease-out'
    : 'bubbleIn 0.3s ease-out';

  const textColor = isDeep ? '#e0d0ff'
    : isMedium ? '#fff8e0'
    : isNight ? '#a0b0d0'
    : isWork ? '#fff8e0'
    : PALETTE.text;

  const bgColor = isNight ? 'rgba(20, 25, 50, 0.95)'
    : isWork ? 'rgba(30, 25, 15, 0.95)'
    : 'rgba(16, 16, 42, 0.95)';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '125%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: isSpecial ? '8px 12px' : '6px 10px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: isSpecial ? 9 : 8,
        color: textColor,
        whiteSpace: 'nowrap',
        maxWidth: isSpecial ? 220 : 180,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        animation: `${entryAnimation}, ${glowAnimation}`,
        zIndex: 1000,
        boxShadow: isDeep
          ? '0 4px 20px rgba(160, 128, 255, 0.4)'
          : isMedium
          ? '0 4px 16px rgba(255, 215, 0, 0.3)'
          : isNight
          ? '0 4px 16px rgba(40, 60, 120, 0.5)'
          : isWork
          ? '0 4px 16px rgba(240, 192, 64, 0.3)'
          : '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {isDeep && <span style={{ marginRight: 6 }}>🌟</span>}
      {isMedium && <span style={{ marginRight: 6 }}>💡</span>}
      {text}
      <div
        style={{
          position: 'absolute',
          bottom: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: `7px solid ${borderColor}`,
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
          borderTop: `5px solid ${bgColor}`,
        }}
      />
    </div>
  );
}

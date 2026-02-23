// GENESIS — Barra superior con stats del agente (2 filas compactas)
import { useState, useEffect } from 'react';
import { PALETTE } from '../config/palette';
import { MOOD_EMOJI } from '../agents/prompts';
import { LOCATIONS } from '../world/locations';
import { onStateChange } from '../config/llm';

export default function Header({
  level,
  xp,
  mood,
  location,
  iaCalls,
  elapsedTime,
  onBrainClick,
  onTasksClick,
  onSettingsClick,
  genesisTime,
  resources,
}) {
  const [llmState, setLlmState] = useState({ currentSource: 'checking' });

  // Suscribirse a cambios del estado LLM
  useEffect(() => {
    const unsubscribe = onStateChange(setLlmState);
    return unsubscribe;
  }, []);

  const xpPercent = xp % 100;
  const moodEmoji = MOOD_EMOJI[mood] || '🧐';
  const locationData = LOCATIONS[location];
  const locationName = locationData?.name || 'Explorando';
  const locationEmoji = locationData?.emoji || '🗺️';

  // Formato de tiempo real: MM:SS
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Indicador de fuente de IA
  const sourceConfig = {
    local: { emoji: '🖥️', label: 'LOCAL', color: PALETTE.accentGreen },
    api: { emoji: '☁️', label: 'API', color: PALETTE.accent },
    fallback: { emoji: '🎲', label: 'RANDOM', color: PALETTE.textDim },
    checking: { emoji: '⏳', label: '...', color: PALETTE.textDim },
  };

  const source = sourceConfig[llmState.currentSource] || sourceConfig.checking;

  return (
    <header
      style={{
        backgroundColor: PALETTE.panel,
        borderBottom: `2px solid ${PALETTE.panelBorder}`,
        fontFamily: '"Press Start 2P", monospace',
        flexShrink: 0,
      }}
    >
      {/* FILA 1: Principal */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          fontSize: 9,
          color: PALETTE.text,
        }}
      >
        {/* Logo / Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🏗️</span>
          <span style={{ color: PALETTE.accent, fontWeight: 'bold' }}>GENESIS</span>
          <span style={{ color: PALETTE.textDim, fontSize: 7 }}>Phase 0</span>
        </div>

        {/* Centro: Indicador IA + Recursos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Indicador de fuente IA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              backgroundColor: PALETTE.bg,
              borderRadius: 4,
              border: `1px solid ${source.color}`,
            }}
          >
            <span style={{ fontSize: 10 }}>{source.emoji}</span>
            <span style={{ color: source.color, fontSize: 7 }}>{source.label}</span>
          </div>

          {/* Recursos */}
          {resources && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '3px 10px',
                backgroundColor: PALETTE.bg,
                borderRadius: 4,
                border: `1px solid ${PALETTE.panelBorder}`,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 10 }}>📚</span>
                <span style={{ color: '#80c0ff', fontSize: 8 }}>{resources.knowledge}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 10 }}>🪨</span>
                <span style={{ color: '#c0a080', fontSize: 8 }}>{resources.materials}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 10 }}>✨</span>
                <span style={{ color: '#ffc040', fontSize: 8 }}>{resources.inspiration}</span>
              </span>
            </div>
          )}
        </div>

        {/* Derecha: Botones de paneles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeaderButton emoji="🧠" title="Cerebro de Arq" onClick={onBrainClick} />
          <HeaderButton emoji="📋" title="Tareas" onClick={onTasksClick} />
          <HeaderButton emoji="⚙️" title="Configuración" onClick={onSettingsClick} />
        </div>
      </div>

      {/* FILA 2: Stats secundarios */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '4px 16px 6px',
          fontSize: 7,
          color: PALETTE.textDim,
          borderTop: `1px solid ${PALETTE.panelBorder}`,
          backgroundColor: 'rgba(0,0,0,0.15)',
        }}
      >
        {/* Nivel con barra de XP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>LVL</span>
          <span style={{ color: PALETTE.accent }}>{level}</span>
          <div
            style={{
              width: 40,
              height: 4,
              backgroundColor: PALETTE.bg,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${xpPercent}%`,
                height: '100%',
                backgroundColor: PALETTE.accentGreen,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <span style={{ color: '#333' }}>│</span>

        {/* Mood */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>MOOD</span>
          <span style={{ fontSize: 10 }}>{moodEmoji}</span>
        </div>

        <span style={{ color: '#333' }}>│</span>

        {/* Ubicación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10 }}>{locationEmoji}</span>
          <span style={{ color: PALETTE.text }}>{locationName}</span>
        </div>

        <span style={{ color: '#333' }}>│</span>

        {/* Contador IA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>IA</span>
          <span style={{ color: PALETTE.accentRed }}>{iaCalls}</span>
        </div>

        <span style={{ color: '#333' }}>│</span>

        {/* Hora Genesis */}
        {genesisTime && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              backgroundColor: genesisTime.isNight ? 'rgba(30, 40, 80, 0.5)' : 'transparent',
              borderRadius: 3,
            }}
          >
            <span style={{ fontSize: 10 }}>{genesisTime.icon}</span>
            <span style={{ color: genesisTime.isNight ? '#8090c0' : PALETTE.text }}>
              {genesisTime.time.formatted}
            </span>
            <span style={{ fontSize: 6 }}>D{genesisTime.day}</span>
          </div>
        )}

        <span style={{ color: '#333' }}>│</span>

        {/* Timer real */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⏱️</span>
          <span style={{ color: PALETTE.text, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
        </div>
      </div>
    </header>
  );
}

// Botón del header
function HeaderButton({ emoji, title, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        backgroundColor: PALETTE.bg,
        border: `1px solid ${PALETTE.panelBorder}`,
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = PALETTE.accent;
        e.currentTarget.style.borderColor = PALETTE.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = PALETTE.bg;
        e.currentTarget.style.borderColor = PALETTE.panelBorder;
      }}
      title={title}
    >
      {emoji}
    </button>
  );
}

// GENESIS — Barra superior con stats del agente
import { useState, useEffect } from 'react';
import { PALETTE } from '../config/palette';
import { MOOD_EMOJI } from '../agents/prompts';
import { LOCATIONS } from '../world/locations';
import { onStateChange } from '../config/llm';

export default function Header({ level, xp, mood, location, iaCalls, elapsedTime, memoryCount = 0, onBrainClick }) {
  const [llmState, setLlmState] = useState({ currentSource: 'checking' });

  // Suscribirse a cambios del estado LLM
  useEffect(() => {
    const unsubscribe = onStateChange(setLlmState);
    return unsubscribe;
  }, []);

  const xpPercent = (xp % 100);
  const moodEmoji = MOOD_EMOJI[mood] || '🧐';
  const locationData = LOCATIONS[location];
  const locationName = locationData?.name || 'Explorando';
  const locationEmoji = locationData?.emoji || '🗺️';

  // Formato de tiempo: MM:SS
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: PALETTE.panel,
        borderBottom: `2px solid ${PALETTE.panelBorder}`,
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 10,
        color: PALETTE.text,
      }}
    >
      {/* Logo / Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>🏗️</span>
        <span style={{ color: PALETTE.accent, fontWeight: 'bold' }}>GENESIS</span>
        <span style={{ color: PALETTE.textDim, fontSize: 8 }}>Phase 0</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Indicador de fuente IA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            backgroundColor: PALETTE.bg,
            borderRadius: 4,
            border: `1px solid ${source.color}`,
          }}
        >
          <span>{source.emoji}</span>
          <span style={{ color: source.color, fontSize: 8 }}>{source.label}</span>
        </div>

        {/* Contador de memorias + Botón Cerebro */}
        <button
          onClick={onBrainClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            backgroundColor: PALETTE.bg,
            border: `1px solid ${PALETTE.accent}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: PALETTE.text,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PALETTE.accent;
            e.currentTarget.style.color = PALETTE.bg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PALETTE.bg;
            e.currentTarget.style.color = PALETTE.text;
          }}
          title="Ver cerebro de Arq"
        >
          <span>🧠</span>
          <span style={{ color: 'inherit' }}>{memoryCount}</span>
        </button>

        {/* Nivel con barra de XP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: PALETTE.textDim }}>LVL</span>
          <span style={{ color: PALETTE.accent }}>{level}</span>
          <div
            style={{
              width: 50,
              height: 6,
              backgroundColor: PALETTE.bg,
              borderRadius: 3,
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

        {/* Mood */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: PALETTE.textDim }}>MOOD</span>
          <span>{moodEmoji}</span>
        </div>

        {/* Ubicación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{locationEmoji}</span>
          <span style={{ color: PALETTE.text, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {locationName}
          </span>
        </div>

        {/* Contador IA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: PALETTE.textDim }}>IA</span>
          <span style={{ color: PALETTE.accentRed }}>{iaCalls}</span>
        </div>

        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: PALETTE.textDim }}>⏱️</span>
          <span style={{ color: PALETTE.text, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
        </div>
      </div>
    </header>
  );
}

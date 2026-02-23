// GENESIS — Panel de Cerebro 🧠
// Muestra el estado interno de Arq: reflexiones, memorias, planes

import { useState, useEffect } from 'react';
import { PALETTE } from '../config/palette';
import { getWorldState, onWorldStateChange } from '../agents/worldState';
import { loadMemories, getMemoryCount } from '../agents/memory';
import { getLlmState } from '../config/llm';
import {
  getManagerState,
  onReflectionStateChange,
  getRecentReflections,
  getLocationStats,
  getCurrentPlan,
} from '../agents/reflectionManager';
import { LOCATIONS } from '../world/locations';
import { MOOD_EMOJI } from '../agents/prompts';

export default function BrainPanel({ isOpen, onClose }) {
  const [worldState, setWorldState] = useState(getWorldState());
  const [reflectionState, setReflectionState] = useState(getManagerState());
  const [reflections, setReflections] = useState([]);
  const [recentMemories, setRecentMemories] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [llmState, setLlmState] = useState({ currentSource: 'checking' });

  // Suscribirse a cambios
  useEffect(() => {
    const unsubWorld = onWorldStateChange(setWorldState);
    const unsubReflection = onReflectionStateChange(setReflectionState);

    // Actualizar cada segundo
    const interval = setInterval(() => {
      setReflectionState(getManagerState());
      setReflections(getRecentReflections(5));
      setLocationStats(getLocationStats());

      // Memorias recientes (últimas 6)
      const mems = loadMemories()
        .filter(m => m.type !== 'core')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);
      setRecentMemories(mems);
    }, 1000);

    // Inicial
    setReflections(getRecentReflections(5));
    setLocationStats(getLocationStats());

    return () => {
      unsubWorld();
      unsubReflection();
      clearInterval(interval);
    };
  }, []);

  if (!isOpen) return null;

  const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs}s`;
  };

  const formatRelativeTime = (timestamp) => {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}min`;
    return `hace ${Math.floor(mins / 60)}h`;
  };

  const memoryIcon = (type) => {
    const icons = {
      action: '🔵',
      observation: '🔍',
      conversation: '💬',
      thought: '💭',
      reflection: '💡',
      deep_reflection: '🌟',
      plan: '📋',
    };
    return icons[type] || '📝';
  };

  const locationEmoji = (visits) => {
    if (visits >= 10) return '❤️';
    if (visits >= 5) return '😊';
    if (visits >= 2) return '🤔';
    return '😶';
  };

  const plan = getCurrentPlan();
  const locationName = LOCATIONS[worldState.currentLocation]?.name || worldState.currentLocation;
  const moodEmoji = MOOD_EMOJI[worldState.mood] || '🧐';

  // Progress para reflexión media (importancia acumulada)
  const mediumProgress = Math.min(100, (reflectionState.unreflectedImportance / 15) * 100);

  // Progress para reflexión profunda
  const deepProgressMedium = Math.min(100, (reflectionState.mediumCount / 3) * 100);
  const deepProgressChat = Math.min(100, (reflectionState.chatMessageCount / 5) * 100);
  const deepProgress = Math.max(deepProgressMedium, deepProgressChat);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        backgroundColor: '#10102a',
        borderLeft: `2px solid ${PALETTE.panelBorder}`,
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 7,
        color: PALETTE.text,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
          backgroundColor: '#151530',
        }}
      >
        <span style={{ color: PALETTE.accent }}>🧠 Cerebro de Arq</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: PALETTE.textDim,
            cursor: 'pointer',
            fontSize: 10,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content - scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Estado */}
        <Section title="ESTADO">
          <Row label="Mood" value={`${worldState.mood} ${moodEmoji}`} />
          <Row label="En" value={locationName} />
          <Row label="LLM" value={llmState.currentSource === 'local' ? '🖥️ LOCAL' : '☁️ API'} />
          <Row label="Memorias" value={`${getMemoryCount()} 🧠`} />
        </Section>

        {/* Próxima reflexión */}
        <Section title="PRÓXIMA REFLEXIÓN">
          <Row
            label="Micro"
            value={`en ~${formatTime(reflectionState.timeToNextMicro)}`}
          />
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: PALETTE.textDim }}>Media</span>
              <span>imp {reflectionState.unreflectedImportance}/15</span>
            </div>
            <ProgressBar value={mediumProgress} color={PALETTE.accent} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: PALETTE.textDim }}>Profunda</span>
              <span>{reflectionState.mediumCount}/3 refl · {reflectionState.chatMessageCount}/5 chat</span>
            </div>
            <ProgressBar value={deepProgress} color="#a080ff" />
          </div>
        </Section>

        {/* Plan actual */}
        {plan && (
          <Section title="PLAN ACTUAL">
            <div style={{ color: PALETTE.text, lineHeight: 1.6 }}>
              📋 "{plan.action}"
              {plan.reason && (
                <div style={{ color: PALETTE.textDim, marginTop: 4 }}>
                  {plan.reason}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Últimas reflexiones */}
        <Section title="ÚLTIMAS REFLEXIONES">
          {reflections.length === 0 ? (
            <div style={{ color: PALETTE.textDim, fontStyle: 'italic' }}>
              Sin reflexiones aún...
            </div>
          ) : (
            reflections.map((r, i) => (
              <div
                key={r.id || i}
                style={{
                  marginBottom: 8,
                  paddingLeft: 8,
                  borderLeft: `2px solid ${r.type === 'deep_reflection' ? '#a080ff' : PALETTE.accent}`,
                }}
              >
                <span>{r.type === 'deep_reflection' ? '🌟' : '💡'}</span>
                <span style={{ marginLeft: 4 }}>"{r.content}"</span>
              </div>
            ))
          )}
        </Section>

        {/* Memorias recientes */}
        <Section title="MEMORIAS RECIENTES">
          {recentMemories.map((m, i) => (
            <div
              key={m.id || i}
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 4,
                color: PALETTE.textDim,
              }}
            >
              <span>{memoryIcon(m.type)}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.content.slice(0, 30)}...
              </span>
              <span style={{ fontSize: 6 }}>{formatRelativeTime(m.timestamp)}</span>
            </div>
          ))}
        </Section>

        {/* Opiniones de lugares */}
        <Section title="OPINIONES DE LUGARES">
          {locationStats.slice(0, 6).map((loc) => (
            <div
              key={loc.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span>
                {loc.emoji} {loc.name}
              </span>
              <span>
                {locationEmoji(loc.visits)} {loc.visits} visitas
              </span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          color: PALETTE.textDim,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: `1px solid ${PALETTE.panelBorder}`,
          fontSize: 6,
        }}
      >
        ─── {title} ───
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}
    >
      <span style={{ color: PALETTE.textDim }}>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div
      style={{
        width: '100%',
        height: 4,
        backgroundColor: '#252555',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

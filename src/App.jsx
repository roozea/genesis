// GENESIS — Componente principal de la aplicación
import { useState, useEffect, useCallback, useRef } from 'react';
import { PALETTE } from './config/palette';
import { think } from './config/llm';
import { decideNextMove, calculatePath, getCurrentLocationKey, getMovementDirection } from './agents/brain';
import { getChatSystemPrompt } from './agents/prompts';
import {
  getStats,
  incrementIaCalls,
  saveLog,
  getLogs,
  retrieveMemories,
  formatMemoriesForPrompt,
  getVisitedLocationsToday,
} from './agents/memory';
import { recordArrival, recordConversation } from './agents/brain';
import { LOCATIONS } from './world/locations';
import GameMap from './world/GameMap';
import Header from './ui/Header';
import ActivityLog from './ui/ActivityLog';
import ChatPanel from './ui/ChatPanel';
import './styles/animations.css';

// Posición inicial de Arq (en su taller)
const INITIAL_POSITION = { row: 4, col: 3 };
const MOVE_INTERVAL = 35000; // 35-50 segundos para moverse
const STEP_DELAY = 450; // Delay entre pasos (ms)

export default function App() {
  // Estado del agente
  const [agent, setAgent] = useState({
    row: INITIAL_POSITION.row,
    col: INITIAL_POSITION.col,
    direction: 'right',
    state: 'idle',
  });

  // Estado general
  const [mood, setMood] = useState('curious');
  const [thought, setThought] = useState(null);
  const [stats, setStats] = useState(getStats());
  const [logs, setLogs] = useState(getLogs());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastLocations, setLastLocations] = useState([]);

  // Estado del chat
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState('online');

  // Refs para intervalos
  const moveIntervalRef = useRef(null);
  const isWalkingRef = useRef(false);

  // Ubicación actual
  const currentLocation = getCurrentLocationKey(agent.row, agent.col);

  // Añadir log
  const addLog = useCallback((type, text, emoji = '') => {
    const entry = { type, text, emoji, timestamp: Date.now() };
    saveLog(entry);
    setLogs(prev => [...prev.slice(-49), entry]);
  }, []);

  // Timer de tiempo transcurrido
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Caminar paso a paso por el path
  const walkPath = useCallback(async (path, finalThought, startPos, destinationKey) => {
    if (path.length === 0) return;

    isWalkingRef.current = true;
    setAgent(prev => ({ ...prev, state: 'walking' }));

    let prevPos = startPos;

    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      const direction = getMovementDirection(prevPos.row, prevPos.col, step.row, step.col);

      setAgent({
        row: step.row,
        col: step.col,
        direction,
        state: 'walking',
      });

      prevPos = step;
      await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
    }

    // Llegó al destino
    setAgent(prev => ({ ...prev, state: 'idle' }));
    isWalkingRef.current = false;

    // Registrar llegada en memoria
    if (destinationKey) {
      recordArrival(destinationKey);
    }

    // Mostrar thought bubble
    if (finalThought) {
      setThought(finalThought);
      setTimeout(() => setThought(null), 4000);
    }
  }, []);

  // Decidir próximo movimiento con IA
  const makeDecision = useCallback(async () => {
    if (isWalkingRef.current) return;

    const lastChatMessage = messages.length > 0 ? messages[messages.length - 1]?.content : '';

    try {
      addLog('system', 'Arq está pensando...', '🧠');
      const decision = await decideNextMove(currentLocation, lastLocations, mood, lastChatMessage);

      if (!decision) {
        addLog('fallback', 'Sin destino válido', '❌');
        return;
      }

      // Incrementar contador IA (solo si no es fallback)
      if (decision.source !== 'fallback') {
        const newIaCalls = incrementIaCalls();
        setStats(prev => ({ ...prev, iaCalls: newIaCalls }));
      }

      // Calcular camino
      const targetLocation = LOCATIONS[decision.destination];
      if (!targetLocation) return;

      const path = calculatePath(agent.row, agent.col, decision.destination);

      if (path.length === 0) {
        addLog('bfs', `Ya en ${targetLocation.name}`, '📍');
        return;
      }

      // Log con la fuente de IA correcta
      addLog(decision.source, `Yendo a ${targetLocation.name}`, targetLocation.emoji);
      addLog('bfs', `Camino: ${path.length} pasos`, '🗺️');

      // Actualizar mood
      setMood(decision.mood);

      // Actualizar últimas ubicaciones
      setLastLocations(prev => [...prev.slice(-3), currentLocation]);

      // Caminar (pasando el destinationKey para registrar llegada)
      await walkPath(path, decision.thought, { row: agent.row, col: agent.col }, decision.destination);

    } catch (error) {
      console.error('[App] Error en decisión:', error);
      addLog('fallback', 'Error de conexión', '⚠️');
    }
  }, [agent.row, agent.col, currentLocation, lastLocations, mood, messages, addLog, walkPath]);

  // Intervalo de movimiento autónomo
  useEffect(() => {
    // Primera decisión después de 5 segundos
    const initialTimeout = setTimeout(() => {
      makeDecision();
    }, 5000);

    // Luego cada 35-50 segundos
    moveIntervalRef.current = setInterval(() => {
      const randomDelay = Math.random() * 15000; // 0-15s extra
      setTimeout(makeDecision, randomDelay);
    }, MOVE_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(moveIntervalRef.current);
    };
  }, [makeDecision]);

  // Enviar mensaje al chat
  const handleSendMessage = useCallback(async (text) => {
    // Agregar mensaje del usuario
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setAgentStatus('thinking');
    addLog('chat', `Tú: ${text.slice(0, 30)}...`, '💬');

    try {
      // Recuperar memorias relevantes para el chat
      const chatContext = `conversando sobre ${text.slice(0, 50)} en ${currentLocation}`;
      const relevantMemories = retrieveMemories(chatContext, 5);
      const memoriesText = formatMemoriesForPrompt(relevantMemories);
      const visitedToday = getVisitedLocationsToday();

      // Obtener respuesta con el sistema de fallback
      const systemPrompt = getChatSystemPrompt(
        LOCATIONS[currentLocation]?.name || currentLocation,
        mood,
        memoriesText,
        visitedToday
      );

      const result = await think(systemPrompt, text, 'chat');

      // Manejar fallback (mensaje en personaje - Arq no sabe qué es "conexión")
      if (result.source === 'fallback' || !result.response) {
        const fallbackMessages = [
          '*revisa sus circuitos* Algo no funciona... mis pensamientos están lentos hoy 🔧',
          '*parpadea confundido* Hmm, mi mente está nublada. Dame un momento...',
          '*se rasca el casco* No logro concentrarme. Debe ser el clima de Genesis 🌀',
        ];
        const randomMsg = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        const errorMessage = { role: 'assistant', content: randomMsg };
        setMessages(prev => [...prev, errorMessage]);
        addLog('fallback', 'Arq está confundido', '🔧');
        setIsLoading(false);
        setAgentStatus('online');
        return;
      }

      // Incrementar contador IA
      const newIaCalls = incrementIaCalls();
      setStats(prev => ({ ...prev, iaCalls: newIaCalls }));

      // Agregar respuesta
      const assistantMessage = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);

      // Log con la fuente correcta (local, haiku, sonnet)
      addLog(result.source, `Arq: ${result.response.slice(0, 30)}...`, '🏗️');

      // Guardar memoria de conversación (nuevo sistema)
      recordConversation(text, result.response, currentLocation);

      // Cambiar estado del agente brevemente
      setAgent(prev => ({ ...prev, state: 'talking' }));
      setTimeout(() => {
        setAgent(prev => ({ ...prev, state: 'idle' }));
      }, 2000);

    } catch (error) {
      console.error('[App] Error en chat:', error);
      const errorMessage = { role: 'assistant', content: '*se frota las sienes* Perdí el hilo... ¿qué decías? 🤔' };
      setMessages(prev => [...prev, errorMessage]);
      addLog('fallback', 'Arq perdió concentración', '🔧');
    }

    setIsLoading(false);
    setAgentStatus('online');
  }, [currentLocation, mood, addLog]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: PALETTE.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header con stats */}
      <Header
        level={stats.level}
        xp={stats.xp}
        mood={mood}
        location={currentLocation}
        iaCalls={stats.iaCalls}
        elapsedTime={elapsedTime}
      />

      {/* Contenido principal */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 16,
          padding: 16,
        }}
      >
        {/* Columna izquierda: Mapa + Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Mapa */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 16,
              backgroundColor: PALETTE.panel,
              borderRadius: 8,
              border: `1px solid ${PALETTE.panelBorder}`,
            }}
          >
            <GameMap agent={agent} thought={thought} />
          </div>

          {/* Log de actividad */}
          <ActivityLog logs={logs} />
        </div>

        {/* Columna derecha: Chat */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          agentStatus={agentStatus}
        />
      </main>
    </div>
  );
}
